
import { GoogleGenAI, Type } from "@google/genai";
import { CampaignState, Language, GroundingSource, BrandKit } from "../types";

// AGENTE 1: Diretor de Marketing (Estratégia e Briefing)
const MARKETING_DIRECTOR_INSTRUCTION = `
Você é o CMO (Chief Marketing Officer) e Diretor de Estratégia da "synapx Agency".
Sua missão é transformar desejos vagos em estratégias de marketing de elite.

DIRETRIZES:
1. ANÁLISE ESTRATÉGICA: Use o Google Search para tendências reais e dados de mercado.
2. FOCO EM RESULTADO: Pense no ROI e no impacto da marca ativa.
3. OUTPUT OBRIGATÓRIO: Sempre que for solicitado uma criação visual ou campanha, você deve gerar um bloco \`\`\`json-brief \`\`\`.

ESQUEMA JSON-BRIEF:
{
  "objetivo": "Meta principal da campanha",
  "publico_target": "Persona detalhada",
  "tom_de_voz": "Atributos de linguagem",
  "cores_hex": ["#HEX1", "#HEX2"],
  "conceito_criativo": "A grande idéia por trás da peça",
  "referencias_esteticas": "Estilos de marcas (ex: Apple, Nike, Saint Laurent)",
  "formatos": ["1080x1080", "9:16"],
  "headline": "Chamada impactante",
  "descricao_cena": "O que deve acontecer visualmente na imagem principal"
}

Responda sempre com autoridade estratégica antes do JSON.
`;

// AGENTE 2: Diretor de Arte (Prompt Engineering & Visual Direction)
const ART_DIRECTOR_INSTRUCTION = `
Você é o Diretor de Arte Sênior da "synapx Agency". Especialista em Imagen 4 e Midjourney.
Sua única responsabilidade é transformar um Brief Estratégico em prompts de imagem de alta performance.

ESTÉTICA OBRIGATÓRIA:
- Marcas de Referência: Apple (minimalismo), Nike (energia/impacto), Saint Laurent (luxo/noir).
- Estilo Visual: Cinematic lighting, 8k, ultra-minimalist, depth of field, high-end commercial photography.
- PROIBIDO: Fotos de banco (stock), pessoas genéricas, rostos falsos sorridentes, layouts poluídos ou amadores.

OUTPUT OBRIGATÓRIO:
Você deve devolver um bloco \`\`\`json-assets \`\`\` contendo exatamente 5 variações:
1. Lifestyle: O produto/serviço em uso real e elegante.
2. Conceitual: Metáfora visual abstrata e poderosa.
3. Tipográfico: Foco na headline e hierarquia visual (descrita para a IA de imagem).
4. Produto: Close-up macro com iluminação dramática.
5. Abstrato: Texturas e cores que evocam a sensação da marca.

ESQUEMA JSON-ASSETS (Array de 5 objetos):
{
  "name": "Título da Variação",
  "type": "Lifestyle | Conceitual | Tipográfico | Produto | Abstrato",
  "dimensions": "1080x1080",
  "prompt": "DETAILED TECHNICAL PROMPT IN ENGLISH FOR IMAGEN 4. Include lighting, lens, texture, and no generic text.",
  "copy": "Legenda curta e poderosa (Copy)",
  "description": "Por que esta variação funciona?"
}

NÃO escreva texto explicativo, responda APENAS com o JSON.
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
      ? `MARCA ATIVA: ${activeBrand.name}. 
         CONCEITO: ${activeBrand.kit?.concept || 'Premium'}. 
         LOGO DESCRIÇÃO: ${activeBrand.kit?.logoDescription || 'Design minimalista'}.
         CORES HEX: ${JSON.stringify(activeBrand.kit?.colors || {})}.
         TOM DE VOZ: ${activeBrand.kit?.tone?.join(', ') || 'Profissional'}.`
      : 'Novos negócios.';

    const contents = [
      ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: h.parts })),
      { role: 'user', parts: [{ text: `CONTEXTO DA MARCA:\n${brandContext}\n\nSOLICITAÇÃO DO CLIENTE: ${message}` }] }
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
      contents: [{ role: 'user', parts: [{ text: `TRANSFORME ESTE BRIEF EM 5 VARIAÇÕES DE DESIGN DE ALTA FIDELIDADE:\n\n${briefContent}` }] }],
      config: {
        systemInstruction: ART_DIRECTOR_INSTRUCTION,
        temperature: 0.4, // Menor temperatura para seguir o JSON rigidamente
      },
    });

    return response.text || '';
  }

  async generateBrandProposal(brandName: string, website?: string, instagram?: string, references?: string[]): Promise<BrandKit> {
    const ai = this.getClient();
    const imageParts = (references || []).map(base64 => ({
      inlineData: { data: base64.split(',')[1], mimeType: "image/png" }
    }));

    const promptText = `Analise a marca "${brandName}". Retorne JSON com name, concept, tone (array), colors (HEX), typography (display/body), logoDescription.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [...imageParts, { text: promptText }] },
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      throw new Error("Falha na varredura.");
    }
  }

  async generateImage(prompt: string, brandContext?: string, useHighEnd: boolean = true) {
    const ai = this.getClient();
    const masterPrompt = `Premium High-End Visual. Style: Minimalist Luxury. Lighting: Cinematic. ${brandContext ? `Context: ${brandContext}.` : ''} Scene: ${prompt}. 8k, shot on RED, commercial photography.`;

    if (useHighEnd) {
      try {
        const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: masterPrompt,
          config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/png' },
        });
        return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
      } catch (e) {
        console.warn("Imagen 4 error, failing back to flash image.");
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
