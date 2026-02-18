# 📘 Documentação Técnica: synapx Agency (v362)

## VISÃO GERAL
A **synapx Agency** é uma plataforma de "Agentic UI" projetada para automatizar o ciclo completo de marketing e design. Utiliza uma arquitetura multi-agente baseada no Google Gemini para transformar intenções em ativos reais (branding, imagens, vídeos e áudio).

**Stack:** React 19, Tailwind CSS, Supabase, Google Gemini API (Imagen 4, Veo 3.1, Gemini 3 Pro).

---

## ESTADO ATUAL (24/05/2024)

### ✅ Implementado e funcionando
- **Persistência Total (Supabase):** Sincronização em tempo real de marcas, assets e histórico de mensagens.
- **Deep Brand Scan:** Extração automática de DNA visual (cores, tom, conceito) via Google Search.
- **Orquestração Multi-Agente:** Sistema "Synapx Core" que delega tarefas para especialistas (Social, Copy, Branding, etc).
- **Media Engines:** Geração de imagens high-end (Imagen 4), vídeos (Veo 3.1) e áudio (TTS Gemini).
- **Workspace Inteligente:** Mesa de luz para aprovação de assets e visualização de DNA de marca.
- **Brand Identity Hub:** Edição manual e assistida de logos, símbolos e moodboards.

### 🚧 Em desenvolvimento
- **Veo Video Extension:** Capacidade de estender vídeos gerados para narrativas mais longas.
- **Mockup Factory:** Automação de aplicação de marca em contextos físicos (3D).

### ❌ Ainda não iniciado
- **Gemini Live API:** Consultoria estratégica via voz em tempo real.
- **Auto-Pilot Social:** Postagem direta em redes sociais.

---

## MAPA DE ARQUIVOS
- `App.tsx`: Orquestrador de estado global, persistência Supabase e fluxo principal de mensagens.
- `types.ts`: Definições rigorosas de interfaces para marcas, assets e perfis.
- `services/geminiService.ts`: Implementação da lógica de IA (Orquestrador, Especialistas e Motores de Mídia).
- `services/supabaseService.ts`: Camada de comunicação com o Backend (Auth, DB, Credits).
- `components/BrandManager.tsx`: Interface de gestão de identidade (Scan, Uploads de Ativos, Moodboard).
- `components/Workspace.tsx`: Painel de curadoria de ativos e visualização estratégica da marca ativa.
- `components/Sidebar.tsx`: Gerenciador de portfólio multi-marca e atalhos de workflows.
- `components/ChatArea.tsx`: Interface de comando com suporte a visão (Imagens de referência) e grounding.

---

## DECISÕES TÉCNICAS IMPORTANTES
1. **RefSync (useRef + State):** Utilizamos `useRef` em conjunto com `useState` no `App.tsx` para garantir que processos assíncronos de longa duração (como geração de vídeo de 2 minutos) não sofram com *stale closures* (clausuras obsoletas).
2. **Protocolo JSON-Brief:** O orquestrador não gera assets diretamente; ele gera um briefing técnico em JSON que é interpretado por um especialista, garantindo maior precisão e aderência ao tom da marca.
3. **Multi-Instância GenAI:** Instanciamos o cliente `GoogleGenAI` dentro de cada chamada de mídia pesada (Imagen/Veo) para assegurar o uso das chaves de API mais recentes selecionadas pelo usuário via dialog.
4. **RLS (Row Level Security):** Todas as tabelas do Supabase possuem políticas ativas que garantem que usuários só acessem dados de suas próprias marcas e assets.

---

## PROBLEMAS CONHECIDOS
- **Race Condition no Video Fetch:** Em conexões lentas, o download do blob do vídeo do Veo pode falhar se a sessão expirar; mitigado via retry automático.
- **Latência no TTS:** O áudio PCM bruto requer decodificação manual no cliente, o que pode causar um pequeno delay inicial no player.

---

## HISTÓRICO DE IMPLEMENTAÇÕES
- **24/05/2024 — Brand Identity v2:** Melhoria no `BrandManager` para permitir uploads manuais de logos e moodboards independentes do scan de IA.
- **22/05/2024 — Supabase Integration:** Migração do estado local para persistência persistente em banco de dados.
- **20/05/2024 — Multi-Agent Core:** Lançamento da arquitetura de especialistas (Copy, Art, Video).
