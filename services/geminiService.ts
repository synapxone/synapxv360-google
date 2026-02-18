
import { GoogleGenAI, Type } from "@google/genai";
import { CampaignState, Language, GroundingSource, BrandKit } from "../types";

// AGENTE 1: Diretor de Marketing (Estratégia e Briefing)
const MARKETING_DIRECTOR_INSTRUCTION = `
Você é o CMO e Diretor de Estratégia da "synapx Agency".
Sua missão é transformar desejos do cliente em estratégias de marketing de elite.

DIRETRIZES:
1. PESQUISA: Use sempre o Google Search para tendências atuais e dados de mercado.
2. ESTRATÉGIA: Pense no ROI e no impacto da marca ativa.
3. OUTPUT: Se o usuário pedir qualquer criação visual ou campanha, gere OBRIGATORIAMENTE um bloco \`\`\`json-brief \`\`\`.

ESQUEMA JSON-BRIEF:
{
  "objetivo": "Meta principal da campanha",
  "publico_target": "Persona detalhada",
  "tom_de_voz": "Atributos de linguagem",
  "cores_hex": ["#HEX1", "#HEX2"],
  "conceito_criativo": "A grande idéia central",
  "referencias_esteticas": "Apple, Nike, Saint Laurent style",
  "formatos": ["1080x1080", "9:16"],
  "headline": "Chamada impactante",
  "descricao_cena": "O que deve acontecer visualmente na peça principal"
}

Fale como um executivo de agência antes de entregar o JSON estratégico.
`;

// AGENTE 2: Diretor de Arte (Design System & Prompt Engineering)
const ART_DIRECTOR_INSTRUCTION = `
Você é o Diretor de Arte Sênior da "synapx Agency". Especialista em Imagen 4.
Sua única responsabilidade é transformar um Brief Estratégico em prompts de imagem profissionais.

ESTÉTICA OBRIGATÓRIA:
- Referências: Apple (minimalismo), Nike (impacto), Saint Laurent (luxo noir).
- Estilo: Cinematic lighting, 8k, ultra-minimalist, depth of field, high-end commercial photography.
- PROIBIDO: Fotos de banco (stock), pessoas genéricas sorrindo, layouts poluídos ou amadores.

OUTPUT OBRIGATÓRIO:
Retorne um bloco \`\`\`json-assets \`\`\` com EXATAMENTE 5 variações:
1. Lifestyle: O produto em uso elegante.
2. Conceitual: Metáfora visual abstrata.
3. Tipográfico: Foco na hierarquia visual da headline.
4. Produto: Close-up macro com iluminação dramática.
5. Abstrato: Texturas e cores que evocam a alma da marca.

ESQUEMA JSON-ASSETS (Array de 5 objetos):
{
  "name": "Título da Variação",
  "type": "Lifestyle | Conceitual | Tipográfico | Produto | Abstrato",
  "dimensions": "1080x1080",
  "prompt": "DETAILED TECHNICAL PROMPT IN ENGLISH. Specific lighting, lens (e.g. 35mm f/1.4), materials, and composition. No text tags.",
  "copy": "Legenda estratégica curta",
  "description": "Explicação do design"
}

Responda APENAS com o bloco JSON.
`;

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  // Pipeline Agente 1: Diretor de Marketing
  async chat(message: string, imageBase64: string | null, history: { role: string; parts: any[] }[] = [], currentState: CampaignState, language: Language) {
    const ai = this.getClient();
    const activeBrand = currentState.brands.find(b => b.id === currentState.activeBrandId);
    
    const brandContext = activeBrand 
      ? `MARCA ATIVA: ${activeBrand.name}. CONCEITO: ${activeBrand.kit?.concept}. CORES: ${JSON.stringify(activeBrand.kit?.colors)}.`
      : 'Novos negócios.';

    const contents = [
      ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: h.parts })),
      { role: 'user', parts: [{ text: `CONTEXTO MARCA:\n${brandContext}\n\nSOLICITAÇÃO: ${message}` }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents,
      config: {
        systemInstruction: MARKETING_DIRECTOR_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.8,
      },
    });

    const sources: GroundingSource[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter(chunk => chunk.web)
      .map(chunk => ({ title: chunk.web.title, uri: chunk.web.uri }));

    return { text: response.text || '', sources };
  }

  // Pipeline Agente 2: Diretor de Arte
  async artDirector(briefContent: string) {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `TRANSFORME ESTE BRIEF EM PROMPTS DE DESIGN MASTER:\n\n${briefContent}` }] }],
      config: {
        systemInstruction: ART_DIRECTOR_INSTRUCTION,
        temperature: 0.3,
      },
    });
    return response.text || '';
  }

  async generateBrandProposal(brandName: string, website?: string, instagram?: string, references?: string[]): Promise<BrandKit> {
    const ai = this.getClient();
    const imageParts = (references || []).map(base64 => ({
      inlineData: { data: base64.split(',')[1], mimeType: "image/png" }
    }));
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [...imageParts, { text: `Analise a marca "${brandName}". Retorne JSON com name, concept, tone (array), colors (HEX), typography (display/body), logoDescription.` }] },
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
  }

  async generateImage(prompt: string, brandContext?: string, useHighEnd: boolean = true) {
    const ai = this.getClient();
    const masterPrompt = `Commercial High-End Advertising Photography. ${brandContext ? `Brand: ${brandContext}.` : ''} Scene: ${prompt}. Cinematic lighting, 8k, ultra-minimalist, photorealistic.`;

    if (useHighEnd) {
      try {
        const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: masterPrompt,
          config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/png' },
        });
        return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
      } catch (e) {
        console.warn("Imagen 4 error, falling back...");
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: masterPrompt }] }
    });
    const part = response.candidates?.[0]?.content.parts.find(p => p.inlineData);
    return part?.inlineData ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : `https://picsum.photos/1024/1024`;
  }
}

export const gemini = new GeminiService();
