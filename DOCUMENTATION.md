
# PROJECT DOCUMENTATION

## VISÃO GERAL
synapx Agency é uma plataforma de marketing full-service alimentada por IA (Gemini 3 e Veo), projetada para criar marcas, estratégias e assets (imagem, vídeo, áudio) de forma autônoma e integrada.

## ARQUITETURA ATUAL
- **Frontend**: React (TypeScript) com Tailwind CSS.
- **Backend/DB**: Supabase (Auth, Storage, Database).
- **IA Core**: Google GenAI SDK (@google/genai).
  - Orchestrator: Gemini 3 Pro (Estratégia e Briefing).
  - Visual: Gemini 2.5 Flash Image & Veo 3.1.
  - Audio: Gemini 2.5 Flash TTS.

## DECISÕES TÉCNICAS IMPORTANTES
- **Loop de Performance (v372)**: Introdução do feedback `top_performer` nos ativos. A IA agora lê os prompts de maior engajamento antes de gerar novos ativos para manter a consistência do "DNA vencedor".
- **Templates Base (v372)**: Catálogo de 8 composições estruturadas que injetam diretrizes de hierarquia visual e copywriting de agências boutique diretamente nos prompts dos especialistas.
- **Asset Editor (v372)**: Painel lateral slide-in que permite ajustes finos pós-geração, regeneração parcial de imagem e controle granular de composição de marca d'água.
- **Aba Brand (v374/v375)**: Centralização das configurações de marca em aba dedicada.
- **Análise de Concorrência**: Introdução do campo `competitorWebsites` para diferenciação estratégica.

## HISTÓRICO DE IMPLEMENTAÇÕES
### 2024-05-22 — Upgrade Visual Omneky-Level (v372)
**O que foi feito:**
- ✅ **Performance Loop**: Novo campo `performance` no `DesignAsset`. IA orquestradora injeta contexto de sucessos passados.
- ✅ **Asset Editor**: Slide-in com abas para Copy, Imagem e Composição.
- ✅ **Templates Base**: Catálogo de 8 templates mestre com injeção de prompt estruturado.
- ✅ **UI Updates**: Badge dourado para Top Performers e botão de Templates no chat.

### 2024-05-22 — UX Master & Agentic Learning (v375)
**O que foi feito:**
- Atalhos de comandos rápidos no chat.
- Exclusão de pastas na Biblioteca.

## ESTADO ATUAL DO PROJETO
- Ativos com memória de performance ✅
- Edição inline de assets ✅
- Templates profissionais ✅
- Gestão centralizada de marca ✅

## SCHEMA ATUALIZADO: DesignAsset
```typescript
{
  id: string;
  brand_id: string;
  group_id: string;
  imageUrl?: string;
  prompt: string;
  copy?: string;
  status?: 'pending' | 'approved' | 'rejected';
  performance?: {
    views?: number;
    clicks?: number;
    ctr?: number;
    engagement_score?: number;
    feedback?: 'approved' | 'rejected' | 'top_performer';
  };
}
```

## PROBLEMAS CONHECIDOS
- Latência na geração de vídeos com Veo 3.1 (~30s a 1min).
