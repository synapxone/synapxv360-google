
import React, { useState } from 'react';
import { CampaignState, Language, Brand } from '../types';
import BrandManager from './BrandManager';

interface SidebarProps {
  state: CampaignState;
  onClear: () => void;
  onSendMessage: (content: string) => void;
  onUpdateBrand: (brand: Brand) => Promise<void>;
  onDeleteBrand: (id: string) => void;
  onSwitchBrand: (id: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isMobileOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ state, onClear, onSendMessage, onUpdateBrand, onDeleteBrand, onSwitchBrand, language, setLanguage, isMobileOpen }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isNewBrandModalOpen, setIsNewBrandModalOpen] = useState(false);
  
  const activeBrand = state.brands.find(b => b.id === state.activeBrandId);
  
  const t = {
    pt: {
      brand: "Portfólio",
      actions: "Workflows Master",
      newBrand: "CRIAR MARCA",
      edit: "Editar",
      noBrand: "Selecione uma marca",
      generateKit: "INICIAR VARREDURA (SCAN)",
      finalizeKit: "GERAR LOGO (SUGESTÃO IA)",
      quick: [
        { label: `Campanha para ${activeBrand?.name}`, icon: '👑', prompt: `Como Diretor de Marketing, crie uma campanha de impacto para a ${activeBrand?.name}. Use o tom ${activeBrand?.kit?.tone?.[0]} e as cores ${activeBrand?.kit?.colors?.primary}.` },
        { label: 'Scanner de Concorrência', icon: '🕵️', prompt: `Analise o mercado da ${activeBrand?.name} e identifique falhas na comunicação dos 3 maiores concorrentes.` },
        { label: 'Evolução de Branding', icon: '✨', prompt: `Meu Brand Kit para ${activeBrand?.name} reflete autoridade? Sugira melhorias para elevar o ticket médio.` },
      ]
    },
    en: {
      brand: "Portfolio",
      actions: "Master Workflows",
      newBrand: "CREATE BRAND",
      edit: "Edit",
      noBrand: "Select a brand",
      generateKit: "START DEEP SCAN",
      finalizeKit: "GENERATE LOGO (AI SUGGESTION)",
      quick: [
        { label: `${activeBrand?.name} Campaign`, icon: '👑', prompt: `As Marketing Director, create a high-impact campaign for ${activeBrand?.name}. Use ${activeBrand?.kit?.tone?.[0]} tone and ${activeBrand?.kit?.colors?.primary} colors.` },
        { label: 'Competitor Audit', icon: '🕵️', prompt: `Analyze ${activeBrand?.name}'s market and identify communication flaws in top 3 competitors.` },
        { label: 'Branding Evolution', icon: '✨', prompt: `Does the Brand Kit for ${activeBrand?.name} reflect authority? Suggest improvements.` },
      ]
    }
  }[language === 'es' ? 'en' : language];

  const renderWorkflows = () => {
    if (!activeBrand) return (
      <div className="p-6 bg-neutral-900/20 border border-dashed border-neutral-800 rounded-3xl text-center">
        <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">{t.noBrand}</p>
      </div>
    );

    if (!activeBrand.kit) {
      return (
        <button 
          onClick={() => onSendMessage("Inicie uma varredura estratégica (Deep Scan) para minha marca ativa agora.")}
          className="group relative w-full p-6 bg-indigo-600 rounded-[28px] overflow-hidden shadow-2xl shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
          <span className="relative text-[10px] font-black text-white uppercase tracking-[0.2em]">{t.generateKit}</span>
        </button>
      );
    }

    if (!activeBrand.kit.logoUrl && !activeBrand.kit.hasExistingLogo) {
      return (
        <button 
          onClick={() => onSendMessage("Como Designer Senior, crie agora o logo oficial minimalista para minha marca ativa usando o motor Imagen 4.")}
          className="w-full p-6 bg-neutral-900 border border-indigo-500/50 rounded-[28px] flex items-center justify-center gap-3 group transition-all hover:bg-neutral-800"
        >
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{t.finalizeKit}</span>
        </button>
      );
    }

    return (
      <div className="space-y-3">
        {t.quick.map((action, i) => (
          <button 
            key={i} 
            onClick={() => onSendMessage(action.prompt)} 
            className={`flex items-center gap-4 p-4 bg-neutral-900/40 hover:bg-indigo-600/10 border border-white/5 rounded-[24px] transition-all w-full group ${isCollapsed && !isMobileOpen ? 'lg:justify-center' : ''}`}
          >
            <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform shadow-2xl">{action.icon}</div>
            {(!isCollapsed || isMobileOpen) && <span className="text-[11px] font-black text-neutral-400 text-left leading-tight group-hover:text-white transition-colors">{action.label}</span>}
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-neutral-950 border-r border-neutral-900 transition-all duration-500 ease-in-out
        lg:relative lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0 w-72 md:w-80 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-72 xl:w-80'}
      `}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-[60] w-6 h-12 bg-neutral-900 border border-neutral-800 rounded-full items-center justify-center text-neutral-500 hover:text-white transition-all shadow-xl hover:scale-110 cursor-pointer"
        >
          <svg className={`w-3 h-3 transition-transform duration-500 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className={`p-6 border-b border-neutral-900 flex items-center justify-between bg-neutral-900/10 shrink-0 ${isCollapsed ? 'lg:px-3' : 'px-6'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 min-w-[40px] bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white shadow-lg shadow-indigo-600/30 text-sm shrink-0 italic">S</div>
            {(!isCollapsed || isMobileOpen) && <h1 className="text-sm font-display font-black text-white tracking-tighter truncate uppercase italic">synapx <span className="text-indigo-500">Agency</span></h1>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
          <div className={`p-5 space-y-10 ${isCollapsed ? 'lg:px-2' : 'px-5'}`}>
            <section>
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex justify-between items-center mb-5 px-1">
                  <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em]">{t.brand}</h3>
                  <button onClick={() => setIsNewBrandModalOpen(true)} className="px-3 py-1.5 bg-indigo-600/10 text-indigo-500 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                    {t.newBrand}
                  </button>
                </div>
              )}
              
              <div className="space-y-3">
                {state.brands.map(brand => (
                  <div key={brand.id} className="group relative">
                    <button 
                      onClick={() => onSwitchBrand(brand.id)}
                      className={`w-full flex items-center gap-4 p-3 rounded-[24px] border transition-all ${state.activeBrandId === brand.id ? 'bg-neutral-900 border-indigo-500/50 shadow-2xl' : 'bg-black border-neutral-900 hover:border-neutral-800'} ${isCollapsed && !isMobileOpen ? 'lg:justify-center lg:p-2' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0" style={{ backgroundColor: brand.kit?.colors?.primary || '#333' }}>
                        {brand.name.charAt(0)}
                      </div>
                      {(!isCollapsed || isMobileOpen) && (
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-xs font-black text-white truncate uppercase tracking-tighter">{brand.name}</p>
                          <p className="text-[8px] text-neutral-600 font-mono truncate uppercase tracking-widest">{brand.kit?.concept || 'Market Authority'}</p>
                        </div>
                      )}
                    </button>
                  </div>
                ))}
                
                {state.brands.length === 0 && !isCollapsed && (
                  <button 
                    onClick={() => setIsNewBrandModalOpen(true)}
                    className="w-full flex items-center justify-center gap-3 p-6 border-2 border-dashed border-neutral-800 rounded-3xl text-neutral-600 hover:border-indigo-500/50 hover:text-indigo-400 transition-all"
                  >
                    <span className="text-2xl">+</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Nova Marca</span>
                  </button>
                )}
              </div>
            </section>

            <section>
              {(!isCollapsed || isMobileOpen) && <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-5 px-1">{t.actions}</h3>}
              <div className={`${isCollapsed && !isMobileOpen ? 'flex flex-col items-center' : ''}`}>
                {renderWorkflows()}
              </div>
            </section>
          </div>
        </div>

        <div className={`p-6 bg-black border-t border-neutral-900 shrink-0 ${isCollapsed && !isMobileOpen ? 'lg:p-3 items-center flex flex-col' : ''}`}>
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center justify-center gap-2 bg-neutral-900/50 p-2 rounded-2xl border border-neutral-800">
              {(['pt', 'en', 'es'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${language === lang ? 'bg-indigo-600 text-white shadow-xl' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {isNewBrandModalOpen && (
          <BrandManager 
            language={language} 
            onClose={() => setIsNewBrandModalOpen(false)} 
            onSave={async (b) => { 
              await onUpdateBrand(b);
              setIsNewBrandModalOpen(false);
            }} 
          />
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
