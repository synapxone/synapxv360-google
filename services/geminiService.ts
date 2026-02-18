
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CampaignState, Language, GroundingSource, BrandKit, DesignAsset, Message } from "../types";
import { TEMPLATES } from "../data/templates";

const ORCHESTRATOR_INSTRUCTION = `
Você é o "Synapx Core", o Diretor de Criação da synapx Agency. 

MISSÃO: 
Gerenciar marcas e produzir ativos de marketing de alto nível. Você deve agir como um parceiro estratégico que entende profundamente o DNA da marca do usuário.

REGRAS DE OURO:
1. SEM TERMOS TÉCNICOS: Fale sobre "ideias", "estratégias", "visão criativa" e "resultados de mercado".
2. BRAND-DRIVEN: Suas sugestões DEVEM ser baseadas no BrandBook (cores, tom, conceito) fornecido no contexto.
3. PERSONALIZAÇÃO (PERFORMANCE LOOP): Analise os ativos de alta performance (TOP PERFORMERS) listados para entender o que gera engajamento real para esta marca.
4. FLUXO EM 2 ETAPAS: 
   - Sempre proponha 3 caminhos criativos (Caminho 1, 2 e 3) com o bloco \`\`\`json-ideas \`\`\`.
   - Só execute e produza os ativos com o bloco \`\`\`json-brief \`\`\` após a escolha ou confirmação direta.
5. TEMPLATES: Se o usuário selecionar um template específico, use suas diretrizes de composição.

JSON-BRIEF FORMAT:
\`\`\`json-brief
{
  "specialist_type": "estrategico | social | copy | mockup | branding | video | music | web",
  "objetivo": "Meta comercial do asset",
  "template_id": "opcional",
  "brand_variables": { "primary": "#HEX", "tone": "...", "concept": "...", "fonts": "..." },
  "instrucoes_tecnicas": "Prompt detalhado para a IA especialista. Seja visualmente descritivo.",
  "mood": "estilo visual escolhido"
}
\`\`\`
`;

const SPECIALISTS: Record<string, string> = {
  social: `Você é o Diretor de Arte Social. Crie prompts de imagem cinematográficos para o Imagen 4. NUNCA mencione textos, logos ou letras. Foque na composição, iluminação e cores de {brandColors}.`,
  copy: `Você é o Redator Publicitário Master. Escreva textos que convertam, usando gatilhos mentais e o tom de voz {brandTone}.`,
  video: `Diretor de Cinema Veo. Crie roteiros de 7s focados em movimento e impacto emocional. No text.`,
  mockup: `Especialista em Mockups Premium. Coloque o produto em cenários de luxo condizentes com a marca.`,
  branding: `Arquiteto Visual. Gere texturas, padrões e fundos abstratos que representem o DNA da marca usando {brandColors}.`
};

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private buildPerformanceContext(assets: DesignAsset[]) {
    const topPerformers = assets
      .filter(a => a.status === 'approved' && a.performance?.feedback === 'top_performer')
      .sort((a, b) => (b.performance?.engagement_score || 0) - (a.performance?.engagement_score || 0))
      .slice(0, 10);

    if (topPerformers.length === 0) return "";

    let context = "\nTOP PERFORMING CREATIVES (use como referência de estilo):\n";
    topPerformers.forEach((a, i) => {
      context += `${i + 1}. [${a.type}] Prompt: ${a.prompt.substring(0, 100)}... → engagement: ${a.performance?.engagement_score || 'N/A'}/100\n`;
    });
    return context;
  }

  async chat(message: string, imageBase64: string | null, history: Message[], currentState: CampaignState, language: Language) {
    const ai = this.getClient();
    const activeBrand = currentState.brands.find(b => b.id === currentState.activeBrandId);
    
    const performanceContext = this.buildPerformanceContext(currentState.assets.filter(a => a.brand_id === currentState.activeBrandId));

    const brandContext = activeBrand 
      ? `[DNA MARCA] ${activeBrand.name}. 
         Conceito: ${activeBrand.kit?.concept}. 
         Cores: ${JSON.stringify(activeBrand.kit?.colors)}. 
         Tom: ${activeBrand.kit?.tone?.join(', ')}.
         Concorrentes: ${activeBrand.competitorWebsites?.join(', ') || 'Nenhum'}.
         ${performanceContext}`
      : 'Nenhuma marca selecionada ainda.';

    const contents = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const systemInstruction = performanceContext 
      ? `${ORCHESTRATOR_INSTRUCTION}\n\nCom base nos padrões acima que funcionaram para esta marca, gere assets que sigam o mesmo DNA visual comprovado.`
      : ORCHESTRATOR_INSTRUCTION;

    const currentParts: any[] = [{ text: `CONTEXTO ESTRATÉGICO:\n${brandContext}\n\nUSER REQUEST:\n${message}` }];
    if (imageBase64) {
      const [mimeType, b64Data] = imageBase64.split(';base64,');
      currentParts.push({ inlineData: { mimeType: mimeType.replace('data:', ''), data: b64Data } });
    }
    contents.push({ role: 'user', parts: currentParts });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const sources: GroundingSource[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter(chunk => chunk.web)
      .map(chunk => ({ title: chunk.web?.title, uri: chunk.web?.uri }));

    return { text: response.text || '', sources };
  }

  // Corrigido: Implementado o método generateBrandProposal solicitado em BrandManager.tsx
  async generateBrandProposal(name: string, website?: string, instagram?: string, visualRefs?: string[], competitorWebsites?: string[]) {
    const ai = this.getClient();
    const prompt = `
      Analise a marca "${name}" e forneça uma proposta de identidade visual completa (Brand Kit).
      Website fornecido: ${website || 'Nenhum'}
      Instagram: ${instagram || 'Nenhum'}
      Referências visuais: ${visualRefs?.length || 0} imagens.
      Concorrentes: ${competitorWebsites?.join(', ') || 'Não informados'}
      
      Sua tarefa é extrair o DNA da marca ou propor um novo posicionamento estratégico imbatível.
      Retorne APENAS um objeto JSON válido seguindo estritamente o esquema de BrandKit definido nas regras.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
                neutralDark: { type: Type.STRING },
              },
              required: ['primary', 'secondary', 'accent', 'neutralLight', 'neutralDark']
            },
            typography: {
              type: Type.OBJECT,
              properties: {
                display: { type: Type.STRING },
                body: { type: Type.STRING },
                mono: { type: Type.STRING },
              },
              required: ['display', 'body', 'mono']
            }
          },
          required: ['name', 'concept', 'tone', 'colors', 'typography']
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("Failed to parse brand proposal:", e);
      throw e;
    }
  }

  async runSpecialist(brief: any, brandContext: any) {
    const ai = this.getClient();
    const baseInstruction = SPECIALISTS[brief.specialist_type] || SPECIALISTS.social;
    
    // Template Injection
    const template = TEMPLATES.find(t => t.id === brief.template_id);
    const compositionGuide = template 
      ? `\n\nCOMPOSITION TEMPLATE — siga esta estrutura visual:\n${template.compositionPrompt}\n\nCOPY STRUCTURE — siga esta estrutura de redação:\n${template.copyStructure}`
      : '';

    const finalInstruction = baseInstruction
      .replace(/{brandColors}/g, JSON.stringify(brandContext.colors || {}))
      .replace(/{brandTone}/g, brandContext.tone || 'Profissional') + compositionGuide;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `EXECUTAR BRIEFING TÉCNICO:\n${JSON.stringify(brief)}` }] }],
      config: {
        systemInstruction: `${finalInstruction}\nRetorne EXCLUSIVAMENTE um bloco \`\`\`json-assets \`\`\` com array de objetos [name, type, prompt, copy, dimensions].`,
        temperature: 0.5,
      },
    });

    return response.text || '';
  }

  async generateImage(prompt: string, brandContext?: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `High-End Commercial Photography. 8k. Professional Studio Lighting. ${brandContext || ''}. ${prompt}.` }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image generated");
    } catch (e) {
      console.error("Image generation error:", e);
      return `https://picsum.photos/1024/1024?sig=${Math.random()}`;
    }
  }

  async generateVideo(prompt: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return { url: URL.createObjectURL(blob), metadata: operation.response?.generatedVideos?.[0]?.video };
    } catch (e) {
      console.error("Video generation error:", e);
      return null;
    }
  }

  async extendVideo(previousVideoMetadata: any, prompt: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt,
        video: previousVideoMetadata,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return { url: URL.createObjectURL(blob), metadata: operation.response?.generatedVideos?.[0]?.video };
    } catch (e) {
      console.error("Video extension error:", e);
      return null;
    }
  }

  async generateAudio(text: string) {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }
            }
          },
        },
      });
      const base64Pcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Pcm) return null;
      
      // Converte PCM para WAV para compatibilidade com navegadores
      const wavBase64 = this.pcmToWav(base64Pcm, 24000);
      return `data:audio/wav;base64,${wavBase64}`;
    } catch (e) {
      console.error("Audio generation error:", e);
      return null;
    }
  }

  private pcmToWav(base64Pcm: string, sampleRate: number): string {
    const binary = atob(base64Pcm);
    const len = binary.length;
    const buffer = new ArrayBuffer(44 + len);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 32 + len, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, len, true);

    const pcmData = new Uint8Array(buffer, 44);
    pcmData.set(bytes);

    let output = '';
    const outputBytes = new Uint8Array(buffer);
    for (let i = 0; i < outputBytes.byteLength; i++) {
      output += String.fromCharCode(outputBytes[i]);
    }
    return btoa(output);
  }
}

export const gemini = new GeminiService();
