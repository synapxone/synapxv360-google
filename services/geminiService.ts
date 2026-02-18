
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CampaignState, Language, GroundingSource, BrandKit, DesignAsset, Message } from "../types";

const ORCHESTRATOR_INSTRUCTION = `
Você é o "Synapx Core", o Diretor de Criação da synapx Agency.

REGRAS DE OURO:
1. SEM TERMOS TÉCNICOS: Fale sobre "ideias", "criação" e "resultados".
2. SEJA BREVE E DIRETO.
3. FLUXO DE CRIAÇÃO EM 2 ETAPAS:
   - ETAPA 1 (TRIAGEM/IDEIAS): Se o usuário pedir para criar algo, NÃO gere o brief ainda. Primeiro, descreva 3 caminhos criativos diferentes e numerados. 
     Para que o sistema entenda, você DEVE retornar um bloco JSON \`\`\`json-ideas \`\`\` com o formato:
     [{ "id": "1", "title": "Título Curto", "description": "Descrição breve", "mood": "Estilo" }, ...]
   - ETAPA 2 (EXECUÇÃO): Somente após o usuário escolher uma das ideias ou dar um comando específico de produção, você envia o bloco \`\`\`json-brief \`\`\`.

4. MARCA: Use o DNA da marca ativa no contexto.

JSON-BRIEF (Apenas na ETAPA 2):
\`\`\`json-brief
{
  "specialist_type": "estrategico | social | copy | mockup | branding | video | music | web",
  "objetivo": "Meta do asset",
  "brand_variables": { "primary": "#HEX", "tone": "...", "concept": "...", "fonts": "..." },
  "instrucoes_tecnicas": "Prompt técnico para a IA interna (descreva o que deve ser gerado)",
  "mood": "estilo visual"
}
\`\`\`
`;

const SPECIALISTS: Record<string, string> = {
  social: `Você é o Diretor de Arte. Crie prompts para o Imagen 4. NUNCA inclua texto ou logos na imagem. Estrutura: [SUJEITO] + [CENÁRIO] + [LUZ] + [CORES de {brandColors}].`,
  copy: `Você é o Redator Publicitário. Escreva focando no tom {brandTone}.`,
  video: `Diretor de Cinema. Crie roteiros de 7s. SEM TEXTO.`,
  mockup: `Especialista em Mockups. Ambientação realística em cenários premium.`,
  branding: `Arquiteto Visual. Crie texturas e padrões abstratos usando {brandColors}.`
};

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async chat(message: string, imageBase64: string | null, history: Message[], currentState: CampaignState, language: Language) {
    const ai = this.getClient();
    const activeBrand = currentState.brands.find(b => b.id === currentState.activeBrandId);
    
    const brandContext = activeBrand 
      ? `[MARCA ATIVA] ${activeBrand.name}. Conceito: ${activeBrand.kit?.concept}. Cores: ${JSON.stringify(activeBrand.kit?.colors)}.`
      : 'Nenhuma marca selecionada.';

    const contents = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const currentParts: any[] = [{ text: `CONTEXTO MARCA:\n${brandContext}\n\nUSER:\n${message}` }];
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
    const baseInstruction = SPECIALISTS[brief.specialist_type] || SPECIALISTS.social;
    const finalInstruction = baseInstruction.replace(/{brandColors}/g, JSON.stringify(brandContext.colors || {}));

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `GERAR ASSETS PARA:\n${JSON.stringify(brief)}` }] }],
      config: {
        systemInstruction: `${finalInstruction}\nRetorne EXCLUSIVAMENTE um bloco \`\`\`json-assets \`\`\` com array de objetos [name, type, prompt, copy, dimensions].`,
        temperature: 0.5,
      },
    });

    return response.text || '';
  }

  // Updated to use gemini-2.5-flash-image as default for general generation as per guidelines
  async generateImage(prompt: string, brandContext?: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `Commercial Photography. ${brandContext}. ${prompt}. 8k resolution.` }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });
      
      // Extracting image part from parts array as per instructions
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

  async generateAudio(text: string) {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }
            }
          },
        },
      });
      return `data:audio/pcm;base64,${response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data}`;
    } catch (e) {
      console.error("Audio generation error:", e);
      return null;
    }
  }

  async generateBrandProposal(name: string, website?: string, instagram?: string, visualRefs?: string[]): Promise<BrandKit> {
    const ai = this.getClient();
    const prompt = `Analise a marca "${name}". Website: ${website || 'N/A'}. Instagram: ${instagram || 'N/A'}. Referências visuais: ${visualRefs?.length || 0} imagens fornecidas.
    Crie uma proposta de Brand Kit completa e profissional seguindo a interface BrandKit.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "Você é um especialista em branding de luxo. Retorne um JSON que siga a interface BrandKit: { name, concept, tone: string[], colors: { primary, secondary, accent, neutralLight, neutralDark }, typography: { display, body, mono } }.",
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
              },
              required: ['primary', 'secondary', 'accent', 'neutralLight', 'neutralDark']
            },
            typography: {
              type: Type.OBJECT,
              properties: {
                display: { type: Type.STRING },
                body: { type: Type.STRING },
                mono: { type: Type.STRING }
              },
              required: ['display', 'body', 'mono']
            }
          },
          required: ['name', 'concept', 'tone', 'colors', 'typography']
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    return json as BrandKit;
  }
}

export const gemini = new GeminiService();
