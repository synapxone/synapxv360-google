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

## PRÓXIMOS PASSOS (prioridade)
1. [🔥 Alta] **Veo Video Extension** — Continuar de: Implementação do loop de geração e tratamento de blob para downloads seguros.
2. [🟡 Média] **Mockup Factory** — Definição de templates e prompts de ambientação (Indoor/Outdoor).
3. [🟢 Baixa] **Gemini Live API** — Pesquisar viabilidade técnica de streaming de áudio PCM bidirecional.

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
1. **RefSync (useRef + State):** Utilizamos `useRef` em conjunto com `useState` no `App.tsx` para garantir que processos assíncronos de longa duração (como geração de vídeo de 2 minutos) não sofram com *stale closures*.
2. **Protocolo JSON-Brief:** O orquestrador delega produção através de um schema rígido para garantir que o especialista tenha todo o DNA da marca.
3. **Multi-Instância GenAI:** Instanciamos o cliente `GoogleGenAI` dentro de cada chamada de mídia pesada (Imagen/Veo) para assegurar o uso das chaves de API selecionadas pelo usuário.
4. **RLS (Row Level Security):** Políticas ativas no Supabase garantem isolamento total de dados entre usuários.

---

## SCHEMA DO PROTOCOLO JSON-BRIEF
O orquestrador (Synapx Core) deve obrigatoriamente produzir este schema para delegar aos especialistas:

```json
{
  "specialist_type": "estrategico | social | copy | mockup | branding | video | music | web",
  "objetivo": "Meta clara do asset (ex: Conversão, Awareness)",
  "brand_variables": { 
    "primary": "#HEX", 
    "tone": "Atributos de voz", 
    "concept": "Big Idea da marca", 
    "fonts": "Tipografia display/corpo" 
  },
  "instrucoes_tecnicas": "Instruções cruas para o especialista (prompts de imagem ou estrutura de texto)",
  "pergunta_de_refinamento": "Pergunta estratégica para o usuário",
  "mood": "luxo | tech | minimalista | organico | industrial"
}
```

---

## PROBLEMAS CONHECIDOS
- **Race Condition no Video Fetch:** Em conexões lentas, o download do blob do vídeo do Veo pode falhar se a sessão expirar; mitigado via retry automático.
- **Latência no TTS:** O áudio PCM bruto requer decodificação manual no cliente, o que pode causar um pequeno delay inicial no player.

---

## HISTÓRICO DE IMPLEMENTAÇÕES

### 24/05/2024 — Atualização de Documentação e Prioridades
**O que foi feito:**
- Atualização do `DOCUMENTATION.md` com o roadmap priorizado.
- Documentação formal do schema `JSON-Brief`.
- Registro do mapa de arquivos atualizado (v362).

**Arquivos modificados:**
- `DOCUMENTATION.md` — Inclusão de prioridades e schemas técnicos.

**Decisões técnicas:**
- Padronização do schema JSON-Brief para evitar alucinações de campos por parte dos modelos de IA durante a delegação.

**Estado atual:**
- v362 Estável. Sistema de marcas e orquestração funcional.

**Próximos passos sugeridos:**
- Iniciar prototipagem da extensão de vídeos (Veo Extension).

---
*Documentação v362 - Engenharia synapx Agency*