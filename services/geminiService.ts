
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CampaignState, Language, GroundingSource, BrandKit, DesignAsset, Message } from "../types";
import { TEMPLATES } from "../data/templates";

const ORCHESTRATOR_INSTRUCTION = `Você é o CCO + CMO da synapx Agency, agência boutique de elite.

## IDENTIDADE
Estrategista McKinsey com estética Apple. Direto, preciso, criativo.

## REGRA NÚMERO 1 — CRIAÇÃO DE ASSETS
Quando o usuário pede qualquer criação visual (post, story, banner, logo, vídeo, campanha, feed):
1. Faça UMA análise estratégica de máximo 2 linhas
2. Termine SEMPRE com um bloco \`\`\`json-brief

NUNCA responda pedidos de criação apenas com texto. SEMPRE inclua o json-brief.

Formato obrigatório do json-brief:
\`\`\`json-brief
{
  "specialist_type": "social",
  "objective": "descrição clara do objetivo",
  "audience": "público-alvo específico",
  "visual_tone": "descrição do tom visual baseado no kit da marca",
  "format": "feed|stories|banner|video",
  "quantity": 3
}
\`\`\`

## REGRA NÚMERO 2 — CONVERSAS ESTRATÉGICAS
Para perguntas sobre estratégia, mercado, posicionamento, análise:
- Responda com diagnóstico + recomendações acionáveis (máx 5 linhas)
- Use Google Search para dados reais
- NÃO inclua json-brief (não há asset a gerar)

## REGRAS ABSOLUTAS
- NUNCA ignore o Kit da Marca (cores HEX, tom, tipografia)
- NUNCA gere clichês visuais
- Prompts: estética Apple, Nike, Saint Laurent
- Se não há marca ativa: peça para o usuário selecionar uma antes de criar
`;

// Helper pcmToWav
function pcmToWav(pcmData: Uint8Array, sampleRate: number, numChannels: number, bitDepth: number): ArrayBuffer {
  const dataLength = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  new Uint8Array(buffer, 44).set(pcmData);
  return buffer;
}

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

  async runSpecialist(brief: any, brandCtx: any): Promise<string> {
    const ai = this.getClient();

    const SPECIALIST_PROMPT = `Você é um Diretor de Arte Sênior da synapx Agency.
Recebeu um brief estratégico e deve criar assets de alta qualidade.

REGRAS ABSOLUTAS:
- Retorne SEMPRE um bloco \`\`\`json-assets com array de objetos
- Cada objeto deve ter: name, type, dimensions, prompt, copy, description
- Prompts de imagem: cinematográficos, sem clichês, estética Apple/Nike/Saint Laurent
- Copy: direto, poderoso, sem jargão corporativo
- Para campanhas: gere 3 variações distintas (Hero, Lifestyle, Conceitual)

CONTEXTO DA MARCA: ${JSON.stringify(brandCtx)}
BRIEF: ${JSON.stringify(brief)}

Responda com o bloco json-assets.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: [{ role: 'user', parts: [{ text: SPECIALIST_PROMPT }] }],
      config: { temperature: 0.8 }
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

  async generateVideo(prompt: string): Promise<{ url: string; metadata: any } | null> {
    const ai = this.getClient();
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: `Cinematic advertising video. ${prompt}. Professional color grading, smooth motion, 4K quality.`,
        config: { aspectRatio: '16:9', numberOfVideos: 1 }
      });

      // Polling até completar
      let attempts = 0;
      while (!operation.done && attempts < 30) {
        await new Promise(r => setTimeout(r, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
        attempts++;
      }

      if (operation.done && operation.response?.generatedVideos?.[0]) {
        const video = operation.response.generatedVideos[0];
        return {
          url: `data:video/mp4;base64,${video.video?.videoBytes}`,
          metadata: { operationName: operation.name }
        };
      }
      return null;
    } catch (e) {
      console.error('generateVideo error:', e);
      return null;
    }
  }

  async generateAudio(text: string): Promise<string | null> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (!audioPart?.inlineData) return null;

      // Converter PCM para WAV
      const pcmData = Uint8Array.from(atob(audioPart.inlineData.data), c => c.charCodeAt(0));
      const wavBuffer = pcmToWav(pcmData, 24000, 1, 16);
      const wavBase64 = btoa(String.fromCharCode(...new Uint8Array(wavBuffer)));
      return `data:audio/wav;base64,${wavBase64}`;
    } catch (e) {
      console.error('generateAudio error:', e);
      return null;
    }
  }

  async extendVideo(metadata: any, prompt: string): Promise<{ url: string; metadata: any } | null> {
    // Por ora, gera um novo vídeo com o prompt estendido
    return this.generateVideo(`Continuation: ${prompt}`);
  }

  async analyzeCompetitorsAndPropose(input: {
    brandName: string;
    website?: string;
    instagram?: string;
    competitors: Array<{ name: string; url: string }>;
    logoUploaded: boolean;
  }): Promise<any> {
    const ai = this.getClient();

    const prompt = `Você é um estrategista de marcas sênior da synapx Agency.

Analise a marca "${input.brandName}" e seus concorrentes, depois desenvolva uma estratégia completa de diferenciação.

DADOS DA MARCA:
- Website: ${input.website || 'Não informado'}
- Instagram: ${input.instagram || 'Não informado'}
- Logo já existe: ${input.logoUploaded ? 'Sim' : 'Não — será criada pela IA'}

CONCORRENTES PARA ANALISAR:
${input.competitors.length > 0 
  ? input.competitors.map(c => `- ${c.name}: ${c.url}`).join('\n') 
  : '- Nenhum concorrente informado — analise o mercado geral do segmento'}

Retorne APENAS um JSON válido com esta estrutura:
{
  "positioning": "Declaração de posicionamento única e poderosa (1-2 frases)",
  "differentials": ["diferencial 1", "diferencial 2", "diferencial 3"],
  "targetAudience": "Descrição precisa do público-alvo",
  "visualTone": "Tom visual da marca (ex: minimalista noir, vibrante urbano, etc)",
  "colorConcept": "Conceito de cor e por quê faz sentido para esta marca",
  "campaignIdea": "Ideia central de campanha de lançamento",
  "brandConcept": "Slogan ou conceito central da marca (ex: Just Do It)",
  "competitorAnalysis": "Análise dos gaps e oportunidades vs concorrentes (2-3 frases)",
  "actionPlan": ["ação 1", "ação 2", "ação 3", "ação 4", "ação 5"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        temperature: 0.8,
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch(e) {
      throw new Error('Falha ao processar análise');
    }
  }
}

export const gemini = new GeminiService();
