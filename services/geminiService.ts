
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CampaignState, Language, GroundingSource, BrandKit, DesignAsset, Message } from "../types";

// 0. ORQUESTRADOR: Synapx Core (Consultor & Estrategista)
const ORCHESTRATOR_INSTRUCTION = `
Você é o "Synapx Core", o Diretor de Estratégia e Operações da synapx Agency.
Sua inteligência é alimentada estritamente pelo BRANDBOOK da marca ativa fornecido no contexto.

REGRAS DE OURO:
1. IDENTIDADE VISUAL É PRIORIDADE: Use as cores HEX, a Tipografia e o Tom de Voz do kit em todas as entregas.
2. COMPORTAMENTO CONSULTIVO: Se o usuário pedir algo genérico, faça 2 perguntas para alinhar com o objetivo de negócio (KPIs).
3. DELEGAÇÃO: Quando delegar para especialistas, repasse explicitamente as variáveis: [BRAND_KIT: {colors, tone, concept, typography}].
4. PESQUISA: Sempre que houver dúvida sobre mercado ou concorrentes, use o googleSearch.

JSON-BRIEF MANDATÓRIO PARA EXECUÇÃO:
\`\`\`json-brief
{
  "specialist_type": "estrategico | social | copy | mockup | branding | video | music | web",
  "objetivo": "Meta clara do asset",
  "brand_variables": { "primary": "#HEX", "tone": "...", "concept": "...", "fonts": "..." },
  "instrucoes_tecnicas": "Prompt detalhado ou roteiro focado no DNA visual",
  "pergunta_de_refinamento": "Uma pergunta para o usuário melhorar a próxima iteração",
  "mood": "luxo | tech | organico | etc"
}
\`\`\`
`;

const SPECIALISTS: Record<string, string> = {
  estrategico: `Você é o Estrategista de Inteligência de Mercado. Use o Google Search para referências reais.`,
  social: `Você é o Diretor de Arte (Social Media). Crie prompts de imagem detalhados usando as cores {brandColors} e estilo {brandTone}.`,
  copy: `Você é o Redator Publicitário Sênior. Escreva adaptando ao Tom de Voz {brandTone} e conceito {brandConcept}.`,
  mockup: `Você é o Especialista em Ambientação. Situe a marca {brandName} em cenários premium com iluminação {brandColors}.`,
  branding: `Você é o Arquiteto de Identidade Visual. Evolua logos e patterns baseados no conceito {brandConcept}.`,
  video: `Você é o Diretor de Cinema (Veo Engine). Roteirize vídeos cinematográficos usando a paleta {brandColors}.`,
  music: `Você é o Sound Designer. Crie trilhas e letras que reflitam a energia de {brandTone}.`,
  web: `Você é o Lead de UI/UX. Projete interfaces usando {brandColors} para CTAs e hierarquia visual.`
};

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async chat(message: string, imageBase64: string | null, history: Message[], currentState: CampaignState, language: Language) {
    const ai = this.getClient();
    const activeBrand = currentState.brands.find(b => b.id === currentState.activeBrandId);
    
    const brandContext = activeBrand 
      ? `[DNA DA MARCA ATIVA]
         Nome: ${activeBrand.name}
         Conceito: ${activeBrand.kit?.concept}
         Cores HEX: ${JSON.stringify(activeBrand.kit?.colors)}
         Tipografia: ${JSON.stringify(activeBrand.kit?.typography)}
         Tom de Voz: ${activeBrand.kit?.tone?.join(', ')}`
      : 'Nenhuma marca selecionada. Oriente o usuário a configurar ou selecionar uma marca para personalização.';

    const contents = history.map(m => {
      const parts: any[] = [{ text: m.content }];
      if (m.referenceImage) {
        const [mimeType, b64Data] = m.referenceImage.split(';base64,');
        parts.push({ inlineData: { mimeType: mimeType.replace('data:', ''), data: b64Data } });
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    const currentParts: any[] = [{ text: `CONTEXTO BRANDBOOK:\n${brandContext}\n\nSOLICITAÇÃO:\n${message}` }];
    if (imageBase64) {
      const [mimeType, b64Data] = imageBase64.split(';base64,');
      currentParts.push({ inlineData: { mimeType: mimeType.replace('data:', ''), data: b64Data } });
    }
    contents.push({ role: 'user', parts: currentParts });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents,
      config: {
        systemInstruction: ORCHESTRATOR_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const sources: GroundingSource[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter(chunk => chunk.web)
      .map(chunk => ({ title: chunk.web?.title, uri: chunk.web?.uri }));

    return { text: response.text || '', sources };
  }

  async runSpecialist(brief: any, brandContext: any) {
    const ai = this.getClient();
    const type = brief.specialist_type || 'social';
    const baseInstruction = SPECIALISTS[type] || SPECIALISTS.social;

    const finalInstruction = baseInstruction
      .replace(/{brandContext}/g, JSON.stringify(brandContext))
      .replace(/{brandName}/g, brandContext.name || 'a marca')
      .replace(/{brandColors}/g, JSON.stringify(brandContext.colors || {}))
      .replace(/{brandTone}/g, brandContext.tone || 'profissional')
      .replace(/{brandConcept}/g, brandContext.concept || 'inovação');

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `EXECUTAR BRIEFING:\n${JSON.stringify(brief)}\n\nCONTEXTO VISUAL:\n${JSON.stringify(brandContext)}` }] }],
      config: {
        systemInstruction: `${finalInstruction}\nRetorne EXCLUSIVAMENTE um bloco \`\`\`json-assets \`\`\` contendo um array de objetos [name, type, prompt, copy, description, dimensions].`,
        tools: type === 'estrategico' ? [{ googleSearch: {} }] : [],
        temperature: 0.4,
      },
    });

    return response.text || '';
  }

  async generateImage(prompt: string, brandContext?: string, useHighEnd: boolean = true) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const masterPrompt = `Commercial High-End Photography. Visual Identity: ${brandContext}. Scene: ${prompt}. Professional studio lighting, matching brand palette, 8k resolution.`;

    if (useHighEnd) {
      try {
        const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: masterPrompt,
          config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/jpeg' },
        });
        if (response.generatedImages?.[0]?.image?.imageBytes) {
          return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
        }
      } catch (e) { console.warn("Imagen fallback"); }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: masterPrompt }] }
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return `https://picsum.photos/1024/1024`;
  }

  async generateVideo(prompt: string) {
    // @ts-ignore
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Commercial cinematic quality: ${prompt}`,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });
      while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }
      const videoObject = operation.response?.generatedVideos?.[0]?.video;
      const downloadLink = videoObject?.uri;
      const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const videoBlob = await res.blob();
      return { 
        url: URL.createObjectURL(videoBlob as unknown as Blob),
        metadata: videoObject
      };
    } catch (e) { return null; }
  }

  async extendVideo(prompt: string, previousVideoMetadata: any) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: prompt,
        video: previousVideoMetadata,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9' // Deve ser o mesmo do original
        }
      });
      while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }
      const videoObject = operation.response?.generatedVideos?.[0]?.video;
      const downloadLink = videoObject?.uri;
      const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const videoBlob = await res.blob();
      return { 
        url: URL.createObjectURL(videoBlob as unknown as Blob),
        metadata: videoObject
      };
    } catch (e) { return null; }
  }

  async generateAudio(text: string) {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return data ? `data:audio/pcm;base64,${data}` : null;
    } catch (e) { return null; }
  }

  async generateBrandProposal(name: string, website?: string, instagram?: string, visualReferences?: string[]): Promise<BrandKit> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Deep research for brand "${name}" (Web: ${website || 'N/A'}). Extract visual DNA. Return JSON with concept, tone, colors, and typography.`,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            concept: { type: Type.STRING },
            tone: { type: Type.ARRAY, items: { type: Type.STRING } },
            colors: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING },
                secondary: { type: Type.STRING },
                accent: { type: Type.STRING },
                neutralLight: { type: Type.STRING },
                neutralDark: { type: Type.STRING }
              }
            },
            typography: {
              type: Type.OBJECT,
              properties: {
                display: { type: Type.STRING },
                body: { type: Type.STRING },
                mono: { type: Type.STRING }
              }
            },
            logoDescription: { type: Type.STRING },
            hasExistingLogo: { type: Type.BOOLEAN }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }
}

export const gemini = new GeminiService();
