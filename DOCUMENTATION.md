
# 📘 Documentação Técnica: synapx Agency (v364)

## VISÃO GERAL
A **synapx Agency** é uma plataforma de "Agentic UI" projetada para automatizar o ciclo completo de marketing e design. Utiliza uma arquitetura multi-agente baseada no Google Gemini para transformar intenções em ativos reais (branding, imagens, vídeos e áudio).

**Stack:** React 19, Tailwind CSS, Supabase, Google Gemini API (Imagen 4, Veo 3.1, Gemini 3 Pro).

---

## ESTADO ATUAL (25/05/2024)

### ✅ Implementado e funcionando
- **Fixes de Qualidade Visual (v364):** 
    - Adicionado campo `logoUrl` ao schema do `brand_kit`.
    - Implementado `uploadBrandLogo()` em `supabaseService.ts` para persistência de logos reais.
    - Criado `utils/imageCompose.ts` com Canvas API para composição de logos sobre as artes geradas.
    - Adicionado botão "Exportar com Logo" no Workspace para download direto de artes finalizadas.
    - Prompts dos especialistas (social, mockup, branding, video) reescritos para maior rigor técnico e proibição de logos inventadas pela IA.
- **Veo Video Extension (v363):** Capacidade de estender vídeos gerados em 7 segundos adicionais mantendo consistência visual.
- **Persistência de Metadata:** O sistema agora salva objetos técnicos de resposta da IA para reutilização em workflows de edição e extensão.
- **Persistência Total (Supabase):** Sincronização em tempo real de marcas, assets e histórico de mensagens.
- **Deep Brand Scan:** Extração automática de DNA visual (cores, tom, conceito) via Google Search.
- **Orquestração Multi-Agente:** Sistema "Synapx Core" que delega tarefas para especialistas.
- **Media Engines:** Imagen 4, Veo 3.1 Fast, Gemini 2.5 Flash TTS.

### 🚧 Em desenvolvimento
- **Mockup Factory:** Automação de aplicação de marca em contextos físicos (3D) usando máscaras de profundidade.
- **Audio Visualizer:** Representação visual das ondas sonoras para os assets de áudio.

### ❌ Ainda não iniciado
- **Gemini Live API:** Consultoria estratégica via voz em tempo real.
- **Auto-Pilot Social:** Postagem direta em redes sociais.

---

## PRÓXIMOS PASSOS (prioridade)
1. [🔥 Alta] **Mockup Factory** — Implementar lógica de masks para Imagen 4 Inpainting.
2. [🟡 Média] **Gemini Live API** — Pesquisar integração de WebRTC com Gemini Realtime.
3. [🟢 Baixa] **Multi-Scene Video** — Criar vídeos complexos unindo múltiplos segmentos de 7s.

---

## DECISÕES TÉCNICAS IMPORTANTES (v364)
1. **Composição de Logo Real:** Decidimos que a IA (Imagen 4) **NUNCA** deve tentar renderizar a logo da marca. A logo real da marca é mantida no Supabase Storage e composta sobre a imagem via Canvas API no frontend no momento da exportação. Isso garante 100% de fidelidade à marca.
2. **Prompts Técnicos Rigorosos:** Reescrita total das instruções dos especialistas para incluir terminologia de fotografia profissional (iluminação Rembrandt, bokeh, profundidade de campo) e proibição explícita de stock photos genéricos.

---

## HISTÓRICO DE IMPLEMENTAÇÕES

### 25/05/2024 — Fixes de Qualidade Visual (v364)
**O que foi feito:**
- Adicionado campo `logoUrl` ao schema do `brand_kit`.
- Criado `uploadBrandLogo()` em `supabaseService.ts`.
- Criado `utils/imageCompose.ts` com canvas overlay para composição de logo.
- Adicionado botão "Baixar com Logo" no Workspace.
- Reescritos prompts dos agentes: social, mockup, branding, video.

### 25/05/2024 — Veo Video Extension (v363)
**O que foi feito:**
- Implementada a funcionalidade "Estender Vídeo" no Workspace.
- Adicionado campo `metadata` ao `DesignAsset` para armazenar o objeto de vídeo da API.
- Criado método `extendVideo` no `geminiService` utilizando `veo-3.1-generate-preview`.

---
*Documentação v364 - Engenharia synapx Agency*
