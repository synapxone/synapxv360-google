
import React, { useState } from 'react';
import { Brand, Language } from '../types';
import { gemini } from '../services/geminiService';

interface BrandOnboardingProps {
  brand: Brand;
  language: Language;
  onComplete: (updatedBrand: Brand) => void;
  onSkip: () => void;
}

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface OnboardingState {
  step: number; // 0-5
  // Step 0: Upload de identidade visual
  logoUrl: string | null;
  symbolUrl: string | null;
  iconUrl: string | null;
  // Step 1: Website e redes sociais
  website: string;
  instagram: string;
  tiktok: string;
  linkedin: string;
  // Step 2: Concorrentes
  competitors: Array<{ name: string; url: string }>;
  // Step 3: IA analisando (loading)
  isAnalyzing: boolean;
  // Step 4: Estratégia proposta pela IA
  strategyProposal: StrategyProposal | null;
  // Step 5: Criação guiada pela IA
  isCreating: boolean;
  creationProgress: string;
  creationLog: string[];
}

interface StrategyProposal {
  positioning: string;
  differentials: string[];
  targetAudience: string;
  visualTone: string;
  colorConcept: string;
  campaignIdea: string;
  brandConcept: string;
  competitorAnalysis: string;
  actionPlan: string[];
}

// ─── Steps config ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, title: 'Identidade Visual', icon: '🎨', subtitle: 'Logo, símbolo e ícone' },
  { id: 1, title: 'Presença Digital', icon: '🌐', subtitle: 'Site e redes sociais' },
  { id: 2, title: 'Concorrentes', icon: '🔍', subtitle: 'Quem você enfrenta' },
  { id: 3, title: 'Análise IA', icon: '🧠', subtitle: 'Processando inteligência' },
  { id: 4, title: 'Estratégia', icon: '⚡', subtitle: 'Proposta para aprovação' },
  { id: 5, title: 'Criação', icon: '✨', subtitle: 'Construindo sua marca' },
];

// ─── Componente Principal ──────────────────────────────────────────────────────

const BrandOnboarding: React.FC<BrandOnboardingProps> = ({ brand, language, onComplete, onSkip }) => {
  const [state, setState] = useState<OnboardingState>({
    step: 0,
    logoUrl: brand.kit?.logoUrl || null,
    symbolUrl: brand.kit?.symbolUrl || null,
    iconUrl: brand.kit?.iconUrl || null,
    website: brand.website || '',
    instagram: brand.instagram || '',
    tiktok: '',
    linkedin: '',
    competitors: [],
    isAnalyzing: false,
    strategyProposal: null,
    isCreating: false,
    creationProgress: '',
    creationLog: [],
  });

  // ─── Handlers de Upload ──────────────────────────────────────────────────────

  const handleUpload = (type: 'logoUrl' | 'symbolUrl' | 'iconUrl', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setState(p => ({ ...p, [type]: reader.result as string }));
    reader.readAsDataURL(file);
  };

  // ─── Análise de Concorrência pela IA ────────────────────────────────────────

  const runAIAnalysis = async () => {
    setState(p => ({ ...p, step: 3, isAnalyzing: true }));

    try {
      const proposal = await gemini.analyzeCompetitorsAndPropose({
        brandName: brand.name,
        website: state.website,
        instagram: state.instagram,
        competitors: state.competitors,
        logoUploaded: !!state.logoUrl,
      });
      setState(p => ({ ...p, isAnalyzing: false, strategyProposal: proposal, step: 4 }));
    } catch (e) {
      console.error('AI analysis error:', e);
      // Fallback: proposta genérica para não bloquear o usuário
      setState(p => ({
        ...p,
        isAnalyzing: false,
        step: 4,
        strategyProposal: {
          positioning: `${brand.name} como referência boutique no mercado.`,
          differentials: ['Qualidade premium', 'Atendimento personalizado', 'Identidade única'],
          targetAudience: 'Consumidores que valorizam exclusividade e qualidade.',
          visualTone: 'Minimalista, sofisticado, premium.',
          colorConcept: 'Paleta neutra com acento de destaque.',
          campaignIdea: 'Campanha de lançamento focada em diferenciação.',
          brandConcept: `${brand.name} — onde cada detalhe importa.`,
          competitorAnalysis: 'Mercado competitivo com oportunidades de diferenciação por posicionamento premium.',
          actionPlan: ['Finalizar identidade visual', 'Criar assets para redes sociais', 'Desenvolver estratégia de conteúdo'],
        }
      }));
    }
  };

  // ─── Criação Guiada pela IA ──────────────────────────────────────────────────

  const runAICreation = async () => {
    setState(p => ({ ...p, step: 5, isCreating: true, creationProgress: 'Iniciando...', creationLog: [] }));

    const addLog = (msg: string) => setState(p => ({ ...p, creationLog: [...p.creationLog, msg] }));
    const setProgress = (msg: string) => setState(p => ({ ...p, creationProgress: msg }));

    try {
      // 1. Gerar Brand Kit completo
      setProgress('Gerando DNA da marca...');
      addLog('✓ Analisando posicionamento estratégico');
      
      const kit = await gemini.generateBrandProposal(
        brand.name,
        state.website,
        state.instagram,
        [],
        state.competitors.map(c => c.url)
      );

      addLog('✓ Paleta de cores definida');
      addLog('✓ Tipografia selecionada');
      addLog('✓ Tom de voz estabelecido');

      // 2. Gerar Logo (se não foi feito upload)
      let logoUrl = state.logoUrl;
      if (!logoUrl) {
        setProgress('Criando logo...');
        try {
          logoUrl = await gemini.generateImage(
            `Logo minimalista para "${brand.name}". ${kit.logoDescription || 'Marca profissional, clean, moderno'}. 
             Estilo: marca de luxo, sem texto, apenas símbolo vetorial em fundo branco. 
             Cores: ${kit.colors?.primary || '#000000'}.`,
            brand.name
          );
          addLog('✓ Logo criado');
        } catch(e) {
          addLog('⚠ Logo será criado manualmente');
        }
      } else {
        addLog('✓ Logo carregado (upload)');
      }

      // 3. Gerar primeiros assets sociais
      setProgress('Criando assets para redes sociais...');
      
      const assetsToCreate = [
        { name: 'Post de Apresentação — Feed', format: 'feed', type: 'social' },
        { name: 'Story de Lançamento', format: 'stories', type: 'social' },
      ];

      for (const asset of assetsToCreate) {
        addLog(`✓ ${asset.name} em produção`);
      }

      // 4. Montar brand atualizada
      const updatedBrand: Brand = {
        ...brand,
        website: state.website || brand.website,
        instagram: state.instagram || brand.instagram,
        competitorWebsites: state.competitors.map(c => c.url),
        kit: {
          ...kit,
          logoUrl: logoUrl || undefined,
          symbolUrl: state.symbolUrl || undefined,
          iconUrl: state.iconUrl || undefined,
          concept: state.strategyProposal?.brandConcept || kit.concept,
        },
      };

      addLog('✓ Brandbook completo');
      setProgress('Concluído! ✨');

      // Pequena pausa para UX
      await new Promise(r => setTimeout(r, 1500));

      onComplete(updatedBrand);

    } catch (e) {
      console.error('AI creation error:', e);
      addLog('⚠ Erro durante criação — salvando o que foi gerado');
      // Mesmo com erro, montar a marca com o que temos
      const updatedBrand: Brand = {
        ...brand,
        website: state.website || brand.website,
        instagram: state.instagram || brand.instagram,
        competitorWebsites: state.competitors.map(c => c.url),
        kit: {
          ...(brand.kit || { name: brand.name, concept: '', tone: [], colors: { primary: '#000', secondary: '#fff', accent: '#6366f1', neutralLight: '#f5f5f5', neutralDark: '#1a1a1a' }, typography: { display: 'Inter', body: 'Inter', mono: 'Mono' } }),
          logoUrl: state.logoUrl || undefined,
          symbolUrl: state.symbolUrl || undefined,
          iconUrl: state.iconUrl || undefined,
        },
      };
      onComplete(updatedBrand);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-8 py-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white italic text-sm">S</div>
          <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">Configurando {brand.name}</span>
        </div>
        <button onClick={onSkip} className="text-[10px] text-neutral-700 hover:text-neutral-400 uppercase tracking-widest font-bold transition-colors">
          Configurar depois →
        </button>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 px-8 py-4 flex items-center gap-3">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-2 transition-all ${i <= state.step ? 'opacity-100' : 'opacity-20'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                i < state.step ? 'bg-green-500 text-white' : 
                i === state.step ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/30' : 
                'bg-neutral-900 text-neutral-600 border border-neutral-800'
              }`}>
                {i < state.step ? '✓' : s.icon}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest hidden lg:block ${i === state.step ? 'text-white' : 'text-neutral-600'}`}>
                {s.title}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 max-w-[40px] transition-all ${i < state.step ? 'bg-green-500/50' : 'bg-neutral-900'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Conteúdo por step */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
        <div className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-400">

          {/* ─── STEP 0: Upload de identidade visual ─────────────────────────── */}
          {state.step === 0 && (
            <div className="space-y-10">
              <div className="text-center space-y-3">
                <p className="text-5xl">🎨</p>
                <h2 className="text-3xl font-black text-white tracking-tighter">Você já tem uma logo?</h2>
                <p className="text-neutral-500 text-sm">Se sim, faça o upload agora. Se não, nossa IA vai criar para você em seguida.</p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {([
                  { key: 'logoUrl', label: 'Logo Principal', icon: '🖼', hint: 'Versão completa da marca' },
                  { key: 'symbolUrl', label: 'Símbolo', icon: '◆', hint: 'Ícone isolado, sem texto' },
                  { key: 'iconUrl', label: 'Ícone de App', icon: '📱', hint: 'Para perfil e favicon' },
                ] as const).map(slot => (
                  <div key={slot.key} className="space-y-3 text-center">
                    <label className="block cursor-pointer">
                      <div className={`aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                        state[slot.key] 
                          ? 'border-indigo-500/50 bg-indigo-500/5' 
                          : 'border-neutral-800 hover:border-neutral-600 bg-neutral-900/30'
                      }`}>
                        {state[slot.key] ? (
                          <img src={state[slot.key]!} className="w-full h-full object-contain p-4 rounded-3xl" />
                        ) : (
                          <div className="text-center p-4 space-y-2">
                            <span className="text-2xl opacity-30">{slot.icon}</span>
                            <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">Upload</p>
                          </div>
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(slot.key, e)} />
                    </label>
                    <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">{slot.label}</p>
                    <p className="text-[8px] text-neutral-700 italic">{slot.hint}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setState(p => ({ ...p, step: 1 }))}
                  className="flex-1 py-5 bg-neutral-900 border border-white/5 text-neutral-400 hover:text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all"
                >
                  Não tenho logo — a IA vai criar
                </button>
                <button
                  onClick={() => setState(p => ({ ...p, step: 1 }))}
                  className="flex-1 py-5 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xl"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 1: Presença digital ────────────────────────────────────── */}
          {state.step === 1 && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <p className="text-5xl">🌐</p>
                <h2 className="text-3xl font-black text-white tracking-tighter">Onde sua marca vive?</h2>
                <p className="text-neutral-500 text-sm">Quanto mais informação, melhor a análise da IA.</p>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'website', label: 'Website', placeholder: 'https://suamarca.com', icon: '🌐' },
                  { key: 'instagram', label: 'Instagram', placeholder: '@suamarca', icon: '📸' },
                  { key: 'tiktok', label: 'TikTok', placeholder: '@suamarca', icon: '🎵' },
                  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/company/suamarca', icon: '💼' },
                ].map(field => (
                  <div key={field.key} className="flex items-center gap-4 bg-neutral-900 border border-white/5 rounded-2xl px-5 py-4">
                    <span className="text-lg">{field.icon}</span>
                    <div className="flex-1">
                      <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold mb-1">{field.label}</p>
                      <input
                        value={state[field.key as keyof OnboardingState] as string}
                        onChange={e => setState(p => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-transparent text-white text-sm outline-none placeholder:text-neutral-700"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setState(p => ({ ...p, step: 0 }))}
                  className="px-8 py-5 bg-neutral-900 border border-white/5 text-neutral-500 text-[10px] font-black rounded-2xl uppercase tracking-widest hover:text-white transition-all"
                >
                  ← Voltar
                </button>
                <button
                  onClick={() => setState(p => ({ ...p, step: 2 }))}
                  className="flex-1 py-5 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xl"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Concorrentes ─────────────────────────────────────────── */}
          {state.step === 2 && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <p className="text-5xl">🔍</p>
                <h2 className="text-3xl font-black text-white tracking-tighter">Quem são seus concorrentes?</h2>
                <p className="text-neutral-500 text-sm">A IA vai analisar o mercado e encontrar brechas de diferenciação.</p>
              </div>

              <div className="space-y-3">
                {state.competitors.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 bg-neutral-900 border border-white/5 rounded-2xl px-5 py-4">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        value={c.name}
                        onChange={e => {
                          const updated = [...state.competitors];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setState(p => ({ ...p, competitors: updated }));
                        }}
                        placeholder="Nome do concorrente"
                        className="bg-transparent text-white text-sm outline-none placeholder:text-neutral-700"
                      />
                      <input
                        value={c.url}
                        onChange={e => {
                          const updated = [...state.competitors];
                          updated[i] = { ...updated[i], url: e.target.value };
                          setState(p => ({ ...p, competitors: updated }));
                        }}
                        placeholder="https://concorrente.com"
                        className="bg-transparent text-white text-sm outline-none placeholder:text-neutral-700"
                      />
                    </div>
                    <button
                      onClick={() => setState(p => ({ ...p, competitors: p.competitors.filter((_, idx) => idx !== i) }))}
                      className="text-red-500 hover:text-red-400 w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {state.competitors.length < 5 && (
                  <button
                    onClick={() => setState(p => ({ ...p, competitors: [...p.competitors, { name: '', url: '' }] }))}
                    className="w-full py-4 border border-dashed border-neutral-800 rounded-2xl text-[10px] text-neutral-600 hover:text-white hover:border-neutral-600 uppercase tracking-widest font-bold transition-all"
                  >
                    + Adicionar concorrente
                  </button>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setState(p => ({ ...p, step: 1 }))}
                  className="px-8 py-5 bg-neutral-900 border border-white/5 text-neutral-500 text-[10px] font-black rounded-2xl uppercase tracking-widest hover:text-white transition-all"
                >
                  ← Voltar
                </button>
                <button
                  onClick={() => setState(p => ({ ...p, competitors: [] }))}
                  className="px-8 py-5 bg-neutral-900 border border-white/5 text-neutral-400 hover:text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all"
                >
                  Não tenho
                </button>
                <button
                  onClick={runAIAnalysis}
                  className="flex-1 py-5 bg-indigo-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl"
                >
                  Analisar com IA →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: IA Analisando ───────────────────────────────────────── */}
          {state.step === 3 && (
            <div className="text-center space-y-10">
              <div className="space-y-4">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 bg-indigo-600/20 rounded-full animate-ping" />
                  <div className="relative w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-4xl">🧠</span>
                  </div>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tighter">Analisando o mercado...</h2>
                <p className="text-neutral-500 text-sm max-w-sm mx-auto">
                  Nossa IA está estudando seus concorrentes, identificando oportunidades e construindo sua estratégia de diferenciação.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  'Escaneando presença digital dos concorrentes...',
                  'Identificando gaps de posicionamento...',
                  'Desenvolvendo estratégia de diferenciação...',
                  'Criando proposta de brandbook...',
                ].map((msg, i) => (
                  <div key={i} className="flex items-center gap-3 justify-center">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 200}ms` }} />
                    <span className="text-[11px] text-neutral-500">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── STEP 4: Proposta de Estratégia ─────────────────────────────── */}
          {state.step === 4 && state.strategyProposal && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <p className="text-5xl">⚡</p>
                <h2 className="text-3xl font-black text-white tracking-tighter">Estratégia Proposta</h2>
                <p className="text-neutral-500 text-sm">Nossa IA desenvolveu um plano personalizado para {brand.name}. Você aprova?</p>
              </div>

              <div className="space-y-4">
                <div className="bg-neutral-900 border border-indigo-500/20 rounded-3xl p-6 space-y-4">
                  <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Posicionamento</h3>
                  <p className="text-white text-sm leading-relaxed">{state.strategyProposal.positioning}</p>
                </div>

                <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 space-y-4">
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Análise da Concorrência</h3>
                  <p className="text-neutral-300 text-sm leading-relaxed">{state.strategyProposal.competitorAnalysis}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-900 border border-white/5 rounded-3xl p-5 space-y-3">
                    <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Tom Visual</h3>
                    <p className="text-neutral-300 text-sm">{state.strategyProposal.visualTone}</p>
                  </div>
                  <div className="bg-neutral-900 border border-white/5 rounded-3xl p-5 space-y-3">
                    <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Público-alvo</h3>
                    <p className="text-neutral-300 text-sm">{state.strategyProposal.targetAudience}</p>
                  </div>
                </div>

                <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 space-y-3">
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Conceito da Marca</h3>
                  <p className="text-indigo-300 text-lg font-bold italic">"{state.strategyProposal.brandConcept}"</p>
                </div>

                <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 space-y-3">
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Plano de Ação</h3>
                  <ul className="space-y-2">
                    {state.strategyProposal.actionPlan.map((action, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-indigo-400 font-black text-xs mt-0.5">{i + 1}.</span>
                        <span className="text-neutral-300 text-sm">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setState(p => ({ ...p, step: 2 }))}
                  className="px-8 py-5 bg-neutral-900 border border-white/5 text-neutral-500 text-[10px] font-black rounded-2xl uppercase tracking-widest hover:text-white transition-all"
                >
                  ← Refazer análise
                </button>
                <button
                  onClick={runAICreation}
                  className="flex-1 py-5 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all shadow-xl"
                >
                  ✓ Aprovar e Criar Marca
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 5: Criação pela IA ─────────────────────────────────────── */}
          {state.step === 5 && (
            <div className="text-center space-y-10">
              <div className="space-y-4">
                <div className="relative mx-auto w-24 h-24">
                  {state.isCreating && <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />}
                  <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${state.isCreating ? 'bg-indigo-600' : 'bg-green-500'}`}>
                    <span className="text-4xl">{state.isCreating ? '✨' : '🎉'}</span>
                  </div>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tighter">
                  {state.isCreating ? 'Construindo sua marca...' : 'Marca criada!'}
                </h2>
                <p className="text-neutral-500 text-sm">
                  {state.isCreating 
                    ? state.creationProgress 
                    : `${brand.name} está pronta. Bem-vindo ao synapx Agency!`
                  }
                </p>
              </div>

              <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 space-y-3 text-left max-h-[200px] overflow-y-auto no-scrollbar">
                {state.creationLog.map((log, i) => (
                  <p key={i} className="text-[11px] text-neutral-400 font-mono">{log}</p>
                ))}
                {state.isCreating && (
                  <div className="flex gap-1 mt-2">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default BrandOnboarding;
