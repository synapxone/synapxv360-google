# 📘 Documentação Técnica: synapx Agency (v363)

## VISÃO GERAL
A **synapx Agency** é uma plataforma de "Agentic UI" projetada para automatizar o ciclo completo de marketing e design. Utiliza uma arquitetura multi-agente baseada no Google Gemini para transformar intenções em ativos reais (branding, imagens, vídeos e áudio).

**Stack:** React 19, Tailwind CSS, Supabase, Google Gemini API (Imagen 4, Veo 3.1, Gemini 3 Pro).

---

## ESTADO ATUAL (25/05/2024)

### ✅ Implementado e funcionando
- **Veo Video Extension (v363):** Capacidade de estender vídeos gerados em 7 segundos adicionais mantendo consistência visual.
- **Persistência de Metadata:** O sistema agora salva objetos técnicos de resposta da IA para reutilização em workflows de edição e extensão.
- **Persistência Total (Supabase):** Sincronização em tempo real de marcas, assets e histórico de mensagens.
- **Deep Brand Scan:** Extração automática de DNA visual (cores, tom, conceito) via Google Search.
- **Orquestração Multi-Agente:** Sistema "Synapx Core" que delega tarefas para especialistas (Social, Copy, Branding, etc).
- **Media Engines:** Geração de imagens high-end (Imagen 4), vídeos (Veo 3.1) e áudio (TTS Gemini).
- **Workspace Inteligente:** Mesa de luz para aprovação de assets e visualização de DNA de marca.
- **Brand Identity Hub:** Edição manual e assistida de logos, símbolos e moodboards.

### 🚧 Em desenvolvimento
- **Mockup Factory:** Automação de aplicação de marca em contextos físicos (3D).
- **Audio Visualizer:** Representação visual das ondas sonoras para os assets de áudio.

### ❌ Ainda não iniciado
- **Gemini Live API:** Consultoria estratégica via voz em tempo real.
- **Auto-Pilot Social:** Postagem direta em redes sociais.

---

## PRÓXIMOS PASSOS (prioridade)

1. 🔥 **[Alta] Mockup Factory** — Iniciar arquitetura de geração de mockups 3D via Imagen 4 com máscaras de contexto físico.
2. 🟡 **[Média] Gemini Live API** — Pesquisar disponibilidade da API de voz em tempo real e viabilidade de integração com o ChatArea.
3. 🟢 **[Baixa] Multi-Scene Video** — Criar vídeos complexos unindo múltiplos segmentos de 7s (Video Stacking).
4. 🟢 **[Baixa] Auto-Pilot Social** — Mapear integrações com APIs do Instagram/Meta para postagem direta.

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
1. **RefSync (useRef + State):** Utilizamos `useRef` em conjunto com `useState` no `App.tsx` para garantir que processos assíncronos de longa duração (como geração de vídeo) não sofram com *stale closures*.
2. **Protocolo JSON-Brief:** O orquestrador não gera assets diretamente; ele gera um briefing técnico em JSON que é interpretado por um especialista.
3. **Multi-Instância GenAI:** Instanciamos o cliente `GoogleGenAI` dentro de cada chamada de mídia pesada (Imagen/Veo) para assegurar o uso das chaves de API recentes.
4. **RLS (Row Level Security):** Todas as tabelas do Supabase possuem políticas ativas que garantem o isolamento de dados por usuário.

### Schema do JSON-Brief
O orquestrador (Synapx Core) deve obrigatoriamente produzir este schema para delegar aos especialistas:

```json
{
  "specialist_type": "estrategico | social | copy | mockup | branding | video | music | web",
  "brand_context": {
    "colors": {
      "primary": "#HEX",
      "secondary": "#HEX",
      "accent": "#HEX",
      "neutral": "#HEX"
    },
    "typography": {
      "display": "Nome da fonte",
      "body": "Nome da fonte"
    },
    "tone": ["atributo1", "atributo2"],
    "concept": "Big Idea / posicionamento da marca"
  },
  "task": "Descrição clara do que deve ser produzido",
  "format": "9:16 | 1:1 | 16:9 | square",
  "references": ["url_ou_base64_opcional"]
}
```

> ⚠️ **Regra:** Nenhum especialista deve ser chamado sem um JSON-Brief válido. O orquestrador é o único responsável por gerá-lo.

---

## PROBLEMAS CONHECIDOS
- **Race Condition no Video Fetch:** Em conexões lentas, o download do blob do vídeo do Veo pode falhar se a sessão expirar; mitigado via retry automático.
- **Latência no TTS:** O áudio PCM bruto requer decodificação manual no cliente, o que pode causar um pequeno delay inicial no player.

---

## HISTÓRICO DE IMPLEMENTAÇÕES

### 25/05/2024 — Veo Video Extension (v363)
**O que foi feito:**
- Implementada a funcionalidade "Estender Vídeo" no Workspace.
- Adicionado campo `metadata` ao `DesignAsset` para armazenar o objeto de vídeo da API.
- Criado método `extendVideo` no `geminiService` utilizando `veo-3.1-generate-preview`.
- Documentação dos prompts dos agentes e schema JSON-Brief.

### 24/05/2024 — Brand Identity v2 (v362)
**O que foi feito:**
- Melhoria no `BrandManager` para permitir uploads manuais de logos e moodboards.
- Refatoração da persistência de marcas.

---

## PROMPTS DOS AGENTES (geminiService.ts)

### Orquestrador — Synapx Core
> "Você é o 'Synapx Core', o Diretor de Estratégia e Operações da synapx Agency. Sua inteligência é alimentada estritamente pelo BRANDBOOK da marca ativa fornecido no contexto."

### Especialistas Técnicos
Ativados via `runSpecialist` utilizando o contexto injetado pelo brief.

| specialist_type | Nome do Agente | Prompt Base |
|---|---|---|
| `estrategico` | Estrategista Market Intel | "Você é o Estrategista de Inteligência de Mercado. Use o Google Search para referências reais." |
| `social` | Diretor de Arte Social | "Você é o Diretor de Arte (Social Media). Crie prompts de imagem detalhados usando as cores {brandColors} e estilo {brandTone}." |
| `copy` | Redator Publicitário | "Você é o Redator Publicitário Sênior. Escreva adaptando ao Tom de Voz {brandTone} e conceito {brandConcept}." |
| `mockup` | Especialista em Mockups | "Você é o Especialista em Ambientação. Situe a marca {brandName} em cenários premium com iluminação {brandColors}." |
| `branding` | Arquiteto de Marca | "Você é o Arquiteto de Identidade Visual. Evolua logos e patterns baseados no conceito {brandConcept}." |
| `video` | Diretor de Cinema | "Você é o Diretor de Cinema (Veo Engine). Roteirize vídeos cinematográficos usando a paleta {brandColors}." |
| `music` | Sound Designer | "Você é o Sound Designer. Crie trilhas e letras que reflitam a energia de {brandTone}." |
| `web` | Lead UI/UX | "Você é o Lead de UI/UX. Projete interfaces usando {brandColors} para CTAs e hierarquia visual." |

---
*Documentação v363 - Engenharia synapx Agency*