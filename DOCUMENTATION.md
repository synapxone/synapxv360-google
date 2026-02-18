
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
- **Fluxo de Produção em 2 Etapas**: Triagem de ideias primeiro, execução somente após aprovação do usuário para economizar créditos e refinar o resultado.
- **DNA da Marca**: Persistência do Brand Kit no Supabase para garantir consistência visual em todos os assets gerados.
- **Mapeamento de Dados**: Conversão explícita entre camelCase (Frontend/Interface) e snake_case (Supabase) nos serviços de dados.
- **Workspace de Gestão**: Centralização de ativos em pastas (`group_id`) com suporte a renomeação em lote, busca textual e filtragem temporal.

## HISTÓRICO DE IMPLEMENTAÇÕES
### 2024-05-22 — Workspace Inteligente (v371)
**O que foi feito:**
- Implementada busca de pastas e filtragem por data (Hoje, Semana, Mês).
- Adicionada funcionalidade de renomear pastas (atualiza todos os ativos do grupo no Supabase).
- Restaurados e aprimorados botões de ação (Aprovar, Baixar, Editar, Deletar) dentro do Workspace.
- Novo layout de card com overlay de ações responsivo.

### 2024-05-22 — Status Dinâmicos e UX (v370)
**O que foi feito:**
- Implementada rotação de mensagens no ChatArea durante o processamento.
- Adicionadas mensagens específicas: "Pesquisando possibilidades", "Analisando concorrência", etc.

## ESTADO ATUAL DO PROJETO
- Sistema de autenticação funcional.
- Gerenciamento de marcas (CRUD) com persistência no Supabase.
- Workspace completo para gestão de ativos com interatividade total.
- Chat orquestrador com suporte a Google Search e triagem de ideias.

## PROBLEMAS CONHECIDOS
- O sistema de créditos é visual, a validação server-side via RPC `increment_credits` precisa de triggers no banco.
- Latência na geração de vídeos com Veo 3.1 (tempo de espera de ~30s a 1min).
