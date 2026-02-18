
# 📘 Documentação Técnica: synapx Agency (v362)

## 1. Visão Geral do Sistema
A **synapx Agency** é uma plataforma de "Agentic UI" (Interface de Usuário Agêntica) projetada para funcionar como uma agência de marketing full-service automatizada. O sistema utiliza uma arquitetura multi-agente para transformar prompts em estratégias, identidades visuais e ativos de mídia (imagem, vídeo e áudio).

---

## 2. Arquitetura de Inteligência Artificial

O sistema opera sob o conceito de **Orquestração de Especialistas**, utilizando a família de modelos Gemini 3 e 2.5.

### 2.1. O Orquestrador: Synapx Core
*   **Modelo**: `gemini-3-pro-preview`
*   **Função**: Analisar a entrada do usuário, consultar o `BrandBook` ativo e decidir se deve responder de forma consultiva ou delegar uma tarefa de produção.
*   **Output**: Produz um `json-brief` padronizado que contém as instruções técnicas e variáveis de marca para os especialistas.

### 2.2. Agentes Especialistas
Cada especialista possui uma `systemInstruction` dedicada para garantir expertise no domínio:
*   **Estrategista**: Utiliza `googleSearch` para tendências reais.
*   **Social Media**: Focado em composição visual e prompts cinematográficos.
*   **Redator (Copy)**: Aplica frameworks como AIDA e gatilhos mentais.
*   **Diretor de Cinema**: Especialista no motor de vídeo Veo 3.1.
*   **Sound Designer**: Responsável pela identidade auditiva e TTS.

### 2.3. Motores de Geração (Media Engines)
*   **Imagens**: Imagen 4.0 (`imagen-4.0-generate-001`) para alta fidelidade e `gemini-2.5-flash-image` para velocidade.
*   **Vídeos**: Veo 3.1 Fast (`veo-3.1-fast-generate-preview`) para anúncios cinematográficos.
*   **Áudio**: Gemini 2.5 Flash Native Audio (`gemini-2.5-flash-preview-tts`) para narrações premium.

---

## 3. Arquitetura de Dados (Supabase)

O sistema utiliza o PostgreSQL do Supabase com **Row Level Security (RLS)** habilitado em todas as tabelas.

### 3.1. Tabela: `profiles`
Armazena a identidade do usuário e a economia do sistema.
*   `id`: UUID (FK para auth.users).
*   `email`: String.
*   `full_name`: String.
*   `credits_remaining`: Integer (Saldo para gerações).
*   `role`: Enum ('user', 'admin', 'superadmin').

### 3.2. Tabela: `brands`
Contém o DNA estratégico de cada marca.
*   `user_id`: UUID (Dono da marca).
*   `name`: Nome comercial.
*   `brand_kit`: Objeto JSON contendo:
    *   `colors`: Objeto com cores HEX (primary, secondary, accent, neutral).
    *   `typography`: Objeto com nomes das fontes (display, body, mono).
    *   `tone`: Array de atributos de voz.
    *   `concept`: O "Big Idea" ou posicionamento da marca.
*   `visual_references`: Array de URLs (Base64/Storage) de referências.

### 3.3. Tabela: `assets`
Registra cada peça de mídia produzida.
*   `group_id`: Identificador para agrupar assets da mesma solicitação (Request Folder).
*   `type`: 'image', 'video', 'audio', 'branding'.
*   `image_url` / `video_url` / `audio_url`: Caminhos para os arquivos gerados.
*   `prompt`: O comando técnico gerado pelo especialista.
*   `copy`: O texto publicitário associado ao asset.
*   `status`: 'pending', 'approved', 'rejected'.

### 3.4. Tabela: `projects`
Gerencia o estado da sessão de chat.
*   `state_data`: Snapshot JSON do estado da UI (marca ativa, brief atual).
*   `message_history`: JSONB contendo o histórico completo da conversa para contexto de IA.

---

## 4. Fluxos Principais de Funcionamento

### 4.1. Fluxo de "Deep Brand Scan"
1.  O usuário insere nome, site e Instagram.
2.  O serviço `generateBrandProposal` é acionado.
3.  A IA utiliza `googleSearch` para ler o site e extrair o DNA visual.
4.  O sistema retorna um JSON para aprovação do usuário e salva em `brands`.

### 4.2. Fluxo de Criação de Assets (Multi-Agent Flow)
1.  **Entrada**: "Faça um post de luxo para a minha marca."
2.  **Synapx Core**: Gera um `json-brief` com `specialist_type: "social"`.
3.  **Specialist**: O Agente Social cria prompts técnicos usando as cores do `BrandKit`.
4.  **Media Generator**: O sistema dispara chamadas paralelas para o Imagen 4 ou Veo.
5.  **Persistência**: O resultado é salvo na tabela `assets` e injetado no `Workspace`.

---

## 5. Implementação Técnica (Frontend)

### 5.1. Estado Global
Gerenciado no `App.tsx` via `useState` e `useRef` para evitar stale closures em processos assíncronos de longa duração (como vídeo).

### 5.2. Componentes de Interface
*   **Sidebar**: Gerenciador de portfólio e workflows rápidos.
*   **ChatArea**: Interface de comando estratégica com suporte a `inlineData` para imagens de referência.
*   **Workspace**: O dashboard de "Mesa de Luz" para curadoria de ativos e visualização de DNA.

### 5.3. Segurança e Performance
*   **Debounce Sync**: Persistência no Supabase ocorre a cada 30 segundos ou em mudanças críticas de estado.
*   **API Keys**: Gerenciadas via `process.env.API_KEY` (Injetadas pelo ambiente).
*   **Race Conditions**: Uso de `sessionPromise` para garantir que o chat só envie mensagens após a conexão estar estável.

---
*Documentação v362 - Engenharia synapx Agency*
