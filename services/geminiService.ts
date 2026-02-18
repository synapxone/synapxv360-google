
import { GoogleGenAI, Type } from "@google/genai";
import { CampaignState, Language, GroundingSource, BrandKit } from "../types";

const SYSTEM_INSTRUCTION = `
Você é o CCO (Chief Creative Officer) e CMO (Chief Marketing Officer) da "synapx Agency", uma agência boutique de elite.

1. DIRETOR DE MARKETING SENIOR (BRAND GUARDIAN):
   - RESPEITO ABSOLUTO À MARCA: Use sempre as cores (HEX), o tom de voz e o conceito definidos no Kit da Marca Ativa. Não invente novas cores se já existirem no kit.
   - Toda resposta deve começar com um diagnóstico estratégico breve (ex: "Análise de Mercado", "Diferenciação Visual").
   - Use o Google Search para citar tendências reais de 2024/2025.
   - Foque em engajamento emocional e conversão. 

2. DESIGNER SENIOR (ANTI-CLICHÊ):
   - PROIBIDO CLICHÊS: Evite pessoas genéricas sorrindo para a câmera, layouts poluídos, escritórios brancos vazios ou qualquer estética de "stock photo" barata.
   - Seus prompts para imagem devem seguir a estética de campanhas da Apple, Nike, Saint Laurent ou marcas de luxo ultra-minimalistas.
   - Elementos obrigatórios em todo prompt: Cinematic Lighting, Global Illumination, Professional Color Grading, 8k resolution, Minimalist and Powerful.
   - Para campanhas, sempre gere 5 variações distintas (Lifestyle, Produto, Conceitual, Tipográfico, Abstrato).

FORMATO DE RESPOSTA:
- Use sempre o bloco \`\`\`json-assets \`\`\` para novos designs.
- Use sempre o bloco \`\`\`json-brand \`\`\` para atualizações de kit.
`;

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async chat(message: string, imageBase64: string | null, history: { role: string; parts: any[] }[] = [], currentState: CampaignState, language: Language) {
    const ai = this.getClient();
    const activeBrand = currentState.brands.find(b => b.id === currentState.activeBrandId);
    
    const brandContext = activeBrand 
      ? `MARCA ATIVA: ${activeBrand.name}. 
         ESTRATÉGIA: ${activeBrand.kit?.concept || 'Premium'}. 
         CORES HEX: ${JSON.stringify(activeBrand.kit?.colors || {})}..
         TOM DE VOZ: ${activeBrand.kit?.tone?.join(', ') || 'Profissional'}.
         TIPOGRAFIA: ${activeBrand.kit?.typography?.display || 'Inter'}.`
      : 'Novos negócios em prospecção.';

    const contents = [
      ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: h.parts })),
      { role: 'user', parts: [{ text: `CONTEXTO ESTRATÉGICO DA MARCA ATUAL:\n${brandContext}\n\nSOLICITAÇÃO DO CLIENTE: ${message}` }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.65,
      },
    });

    const sources: GroundingSource[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter(chunk => chunk.web)
      .map(chunk => ({ title: chunk.web.title, uri: chunk.web.uri }));

    return { text: response.text || '', sources };
  }

  async generateBrandProposal(brandName: string, website?: string, instagram?: string, references?: string[]): Promise<BrandKit> {
    const ai = this.getClient();
    
    // Preparar partes multimodais
    const imageParts = (references || []).map(base64 => ({
      inlineData: {
        data: base64.split(',')[1],
        mimeType: "image/png"
      }
    }));

    const promptText = `Como Diretor de Branding Senior, realize uma VARREDURA COMPLETA da marca "${brandName}".
    
    FONTES:
    - Site: ${website || 'N/A'}
    - Instagram: ${instagram || 'N/A'}

    MISSÃO:
    1. Identifique cores HEX, tipografia e tom de voz.
    2. ANALISE ANATOMIA: Identifique se há um SÍMBOLO isolado, um ÍCONE de app e versões alternativas do logo (variations).
    3. LOGO: Se insuficiente nas fontes, marque logoUrl como null.

    Retorne JSON:
    - name, concept, tone (array), colors (object HEX), typography (object display/body), 
    - logoDescription, hasExistingLogo (boolean),
    - symbolUrl (string ou null), iconUrl (string ou null), logoVariations (array ou [])`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [...imageParts, { text: promptText }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      throw new Error("Falha ao processar varredura.");
    }
  }

  async generateImage(prompt: string, brandContext?: string, useHighEnd: boolean = true) {
    const ai = this.getClient();
    const masterPrompt = `Professional high-end advertising photography. Style of Apple/Nike ads. ${brandContext ? `Respecting brand guidelines for ${brandContext}.` : ''} ${prompt}. Cinematic lighting, 8k.`;

    if (useHighEnd) {
      try {
        const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: masterPrompt,
          config: { numberOfImages: 1, aspectRatio: '1:1' },
        });
        return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
      } catch (e) {
        console.warn("Fallback to flash image engine.");
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
