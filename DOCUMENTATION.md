
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
- **Interrupção de Processos (v372)**: Implementado `requestCounter` para invalidar retornos de IA obsoletos se o usuário enviar uma nova mensagem durante o carregamento.
- **Persistência de Grupo (v372)**: O `activeGroupId` agora é preservado ao retomar conversas do Workspace, garantindo que novos ativos gerados caiam na mesma "pasta" original.
- **Fluxo de Produção em 2 Etapas**: Triagem de ideias primeiro, execução somente após aprovação.

## HISTÓRICO DE IMPLEMENTAÇÕES
### 2024-05-22 — Persistência e Interrupção (v372)
**O que foi feito:**
- Atualizada lógica de `App.tsx` para gerenciar o ID da pasta ativa (`activeGroupId`).
- Implementada detecção de novas solicitações durante o carregamento para cancelar renderização de assets antigos.
- Botão "Retomar Conversa" no Workspace agora mantém o contexto da pasta no Chat.
- Workspace renomeado para "Biblioteca de Ativos" com foco em gestão organizacional.

### 2024-05-22 — Workspace Inteligente (v371)
**O que foi feito:**
- Busca de pastas e filtragem por data.
- Funcionalidade de renomear pastas.

## ESTADO ATUAL DO PROJETO
- Sistema de interrupção de processos funcional.
- Persistência de pastas em retomada de conversa ok.
- Gerenciamento de marcas e ativos completo.

## PROBLEMAS CONHECIDOS
- Latência na geração de vídeos com Veo 3.1 (~30s a 1min).
