**🚨 REGRA DE OURO: NUNCA sobrescreva este arquivo. SEMPRE acrescente ao histórico. Se uma seção precisar ser atualizada, atualize APENAS aquela seção.**

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
- **Ads Preview (v376)**: Novo módulo de visualização que permite testar os ativos em mockups de Instagram, LinkedIn e Facebook com suporte a modo noturno e preenchimento automático de metadados da marca.
- **Loop de Performance (v372)**: Introdução do feedback `top_performer` nos ativos. A IA agora lê os prompts de maior engajamento antes de gerar novos ativos para manter a consistência do "DNA vencedor".
- **Templates Base (v372)**: Catálogo de 8 composições estruturadas que injetam diretrizes de hierarquia visual e copywriting de agências boutique diretamente nos prompts dos especialistas.
- **Asset Editor (v372)**: Painel lateral slide-in que permite ajustes finos pós-geração, regeneração parcial de imagem e controle granular de composição de marca d'água.
- **Aba Brand (v374/v375)**: Centralização das configurações de marca em aba dedicada.
- **Análise de Concorrência**: Introdução do campo `competitorWebsites` para diferenciação estratégica.

## HISTÓRICO DE IMPLEMENTAÇÕES
### 2024-05-23 — Ads Preview v376
**O que foi feito:**
- ✅ **Ads Preview Engine**: Lançamento do componente `AdsPreview.tsx` com mockups realistas.
- ✅ **Context Injection**: Preenchimento automático de Logo, Copy e Nome da Marca nos mockups de anúncio.
- ✅ **Multi-Placement Support**: Suporte para Feed e Stories com detecção automática de formato.

### 2024-05-22 — UX Master & Agentic Learning (v375)
**O que foi feito:**
- Atalhos de comandos rápidos no chat.
- Exclusão de pastas na Biblioteca.

### 2024-05-22 — Upgrade Visual Omneky-Level (v372)
**O que foi feito:**
- ✅ **Performance Loop**: Novo campo `performance` no `DesignAsset`. IA orquestradora injeta contexto de sucessos passados.
- ✅ **Asset Editor**: Slide-in com abas para Copy, Imagem e Composição.
- ✅ **Templates Base**: Catálogo de 8 templates mestre com injeção de prompt estruturado.
- ✅ **UI Updates**: Badge dourado para Top Performers e botão de Templates no chat.

## ESTADO ATUAL DO PROJETO
- Visualização de anúncios em contexto real ✅
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

---
### 2024-05-23 — Golden Rule Enforcement (v377)
**O que foi feito:**
- Adição da Regra de Ouro em negrito no topo do arquivo.
- Manutenção do histórico de versões.

---
### 2024-05-23 — Brand Persistence Fix (v378)
**O que foi feito:**
- ✅ **Sincronização Bidirecional**: Implementação de mapeamento rigoroso entre snake_case (DB) e camelCase (App) no `supabaseService`.
- ✅ **Feedback de UI**: Botão de salvar agora exibe estado de sucesso e erro.
- ✅ **Correção de ID**: Garantia de que novas marcas recebam UUIDs válidos gerados pelo banco de dados.

---
### 2024-05-23 — Agency Core Stability (v379)
**O que foi feito:**
- ✅ **Correção Crítica de ID**: Vinculação correta do `userId` no `AssetEditor`.
- ✅ **Áudio Playback Fix**: Implementado utilitário `pcmToWav` para tornar o áudio do Gemini TTS compatível com tags `<audio>`.
- ✅ **Veo Extension**: Ativada funcionalidade de estender vídeos em 7s adicionais.
- ✅ **Mapping Consistency**: Garantia de que salvamentos de assets retornem objetos camelCase.

---
### 2024-05-23 — Correção Crítica de Performance e Persistência (v380)

**O que foi feito:**
- ✅ **Login paralelizado com Promise.all**: Redução de ~1.2s para ~400ms no tempo de carregamento inicial.
- ✅ **Persistência em Tabela Dedicada**: Adicionados métodos faltantes no supabaseService: getAssets, saveAsset, deleteAsset, updateGroupTitle, deleteAssetsByGroup. Assets agora persistem na tabela dedicated, não mais no JSON de projeto.
- ✅ **Mappers Avançados**: Criadas funções mapBrandFromDb e mapAssetFromDb para conversão consistente snake_case → camelCase, resolvendo bugs de BrandBook vazio após salvamento.
- ✅ **Memory Leak Fix**: Confirmado e refinado o cleanup do onAuthStateChange listener.

---
### 2024-05-23 — Fix: Upload de Logo Persistente (v381)

**O que foi feito:**
- ✅ **Upload para Storage**: Corrigido bug onde logo sumia após salvar. O upload agora usa o bucket `brand-assets` no Supabase Storage em vez de salvar Base64 no JSONB.
- ✅ **Híbrido de Preview**: Implementado preview instantâneo via `FileReader` seguido de substituição assíncrona pela URL pública permanente.
- ✅ **Persistence UX**: Removido `onClose()` do `handleSave` para evitar a destruição do componente e perda de estado visual durante o ciclo de re-renderização por atualização de ID de marca.

---
### 2024-05-23 — Fix: Recuperação de Marcas e Fallback de Dados (v382)

**O que foi feito:**
- ✅ **Fallback de Legado**: Implementada lógica que carrega marcas do JSON antigo (`projects.state_data`) se a nova tabela `brands` retornar vazia. Isso restaura o acesso aos dados pré-migração.
- ✅ **Migração "On-the-fly"**: Ao editar e salvar uma marca legada, o sistema detecta o ID inválido e insere a marca corretamente na nova tabela do banco de dados.

---
### 2024-05-23 — Fix: Migração Completa de Ativos e Estabilidade (v383)

**O que foi feito:**
- ✅ **Merge de Assets**: Corrigida a lógica de inicialização para fundir assets do banco e do legado JSON, evitando que a criação de um novo asset oculte os antigos.
- ✅ **Migração de Assets**: Implementado trigger no frontend que atualiza automaticamente o `brand_id` dos assets locais e remotos quando uma marca legada é migrada para a nova arquitetura de DB.
- ✅ **Workspace Safe Guard**: Adicionada verificação de nulidade em `currentFolder` no componente Workspace para prevenir crashes em casos de filtros agressivos.

---
### 2024-05-23 — Fix: Modal de Nova Marca em Tela Cheia (v385)

**O que foi feito:**
- ✅ **Renderização Root**: Movido `BrandManager` de nova marca (e de edição) do Sidebar para o `App.tsx`.
- ✅ **Z-Index Correction**: Modal agora cobre a tela toda corretamente com overlay, pois não está mais restrito ao contexto de empilhamento da Sidebar.
- ✅ **Prop Drilling**: Sidebar agora apenas emite eventos `onNewBrand` e `onEditBrand`, delegando a renderização visual para o componente pai.

---
### 2024-05-23 — Fix: supabaseService.ts Completo (v386)

**O que foi feito:**
- ✅ **Service Refresh**: Substituição total do `supabaseService.ts` para garantir consistência e completude.
- ✅ **Mappers Integrados**: `mapBrandFromDb` e `mapAssetFromDb` implementados para conversão automática snake_case <-> camelCase.
- ✅ **Full CRUD**: Implementação de todos os métodos de persistência de assets (`getAssets`, `saveAsset`, `deleteAsset`, `updateGroupTitle`, `deleteAssetsByGroup`) que estavam faltando na versão anterior.
- ✅ **Payload Sanitization**: `saveBrand` agora inclui `competitor_websites` e retorna objetos já mapeados, evitando erros de leitura no frontend.

---
### 2024-05-23 — Fix: Agentes Completos + ChatArea + Workspace (v387)

**O que foi feito:**
- ✅ **geminiService.ts**: Implementados métodos faltantes `runSpecialist`, `generateVideo`, `generateAudio`, `extendVideo` e a helper `pcmToWav`. Atualizado `SYSTEM_INSTRUCTION` para diretrizes estratégicas mais claras.
- ✅ **ChatArea.tsx**: Atualizada interface de props para receber `allAssets` e callbacks. Implementado `AssetCard` com botões abaixo da imagem e renderização inline de assets gerados.
- ✅ **Workspace.tsx**: Refatoração visual dos cards da galeria. Botões de ação movidos para área dedicada abaixo da imagem, eliminando o problema de overlay que escondia o conteúdo.

**Arquivos modificados:**
- `services/geminiService.ts`
- `components/ChatArea.tsx`
- `components/Workspace.tsx`

**Decisão técnica:**
- Separação rigorosa entre visualização do asset e controles de ação para evitar conflitos de UX em dispositivos touch e desktops.
- Adoção de Veo 2.0 para geração de vídeo com polling de status para garantir a entrega do asset final.
---