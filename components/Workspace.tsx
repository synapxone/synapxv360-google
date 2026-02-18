
import React, { useState, useEffect, useMemo } from 'react';
import { CampaignState, DesignAsset, MockupTemplate, Language, Brand, BrandKit } from '../types';
import { gemini } from '../services/geminiService';
import { composeImageWithLogo } from '../utils/imageCompose';
import BrandManager from './BrandManager';

interface WorkspaceProps {
  state: CampaignState;
  onGenerateMockup?: (asset: DesignAsset, template: MockupTemplate) => void;
  onGenerateLogo?: () => void;
  onUpdateBrand: (brand: Brand) => Promise<void>;
  onDeleteBrand: (id: string) => void;
  onUpdateAssets: (assets: DesignAsset[]) => void;
  onSendMessage: (content: string) => void;
  onExtendVideo: (asset: DesignAsset, extensionPrompt: string) => void;
  language: Language;
}

const Workspace: React.FC<WorkspaceProps> = ({ state, onGenerateMockup, onGenerateLogo, onUpdateBrand, onDeleteBrand, onUpdateAssets, onSendMessage, onExtendVideo, language }) => {
  const activeBrand = state.brands.find(b => b.id === state.activeBrandId);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [viewingPromptAsset, setViewingPromptAsset] = useState<DesignAsset | null>(null);
  const [extendingVideoAsset, setExtendingVideoAsset] = useState<DesignAsset | null>(null);
  const [extensionPrompt, setExtensionPrompt] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const groupedAssets = useMemo(() => {
    const filtered = state.assets.filter(a => a.brand_id === state.activeBrandId);
    const groups: { [key: string]: { title: string, items: DesignAsset[] } } = {};
    
    filtered.forEach(asset => {
      if (!groups[asset.group_id]) {
        groups[asset.group_id] = { title: asset.group_title, items: [] };
      }
      groups[asset.group_id].items.push(asset);
    });
    
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(id => ({
      id,
      ...groups[id]
    }));
  }, [state.assets, state.activeBrandId]);

  const t = {
    pt: {
      empty: "Seu workspace criativo ganhará vida à medida que a synapx gera assets para sua marca ativa.",
      edit: "EDITAR IDENTIDADE",
      dna: "DNA da Marca",
      concept: "Posicionamento",
      colors: "Cromática",
      typo: "Tipografia",
      tone: "Voz",
      pending: "Pendente",
      approve: "Aprovar",
      reject: "Recusar",
      view_prompt: "Ver Prompt",
      extend_video: "Estender Vídeo (+7s)",
      copy_prompt: "Copiar Copy",
      copied: "Copiado!",
      request_folder: "Briefing",
      prompt_modal_title: "Inteligência Criativa",
      extend_modal_title: "Narrativa Cinematic",
      extend_modal_sub: "O que acontece a seguir neste anúncio?",
      extend_btn: "GERAR EXTENSÃO",
      export_logo: "Exportar com Logo",
      exporting: "Exportando..."
    },
    en: {
      empty: "Your creative workspace will come to life as assets are generated.",
      edit: "EDIT IDENTITY",
      dna: "Brand DNA",
      concept: "Positioning",
      colors: "Palette",
      typo: "Typography",
      tone: "Voice",
      pending: "Pending",
      approve: "Approve",
      reject: "Reject",
      view_prompt: "View Prompt",
      extend_video: "Extend Video (+7s)",
      copy_prompt: "Copy Text",
      copied: "Copied!",
      request_folder: "Briefing",
      prompt_modal_title: "Creative Intel",
      extend_modal_title: "Cinematic Narrative",
      extend_modal_sub: "What happens next in this ad?",
      extend_btn: "GENERATE EXTENSION",
      export_logo: "Export with Logo",
      exporting: "Exporting..."
    }
  }[language === 'es' ? 'en' : language];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleAssetStatus = (assetId: string, status: 'approved' | 'rejected') => {
    const updated = state.assets.map(a => a.id === assetId ? { ...a, status } : a)
      .filter(a => status === 'approved' || a.id !== assetId);
    onUpdateAssets(updated);
  };

  const handleUpdateAssetCopy = (assetId: string, newCopy: string) => {
    const updated = state.assets.map(a => a.id === assetId ? { ...a, copy: newCopy } : a);
    onUpdateAssets(updated);
  };

  const handleExportWithLogo = async (asset: DesignAsset) => {
    if (!activeBrand?.kit?.logoUrl || !asset.imageUrl) return;
    setIsExporting(asset.id);
    try {
      const composedUrl = await composeImageWithLogo(asset.imageUrl, activeBrand.kit.logoUrl, {
        position: 'bottom-right',
        scale: 0.18,
        opacity: 0.9,
        padding: 32
      });
      const a = document.createElement('a');
      a.href = composedUrl;
      a.download = `${activeBrand.name}_post_${Date.now()}.png`;
      a.click();
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setIsExporting(null);
    }
  };

  if (!activeBrand && groupedAssets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950 p-12 text-center">
        <p className="text-neutral-500 font-medium text-sm max-w-sm">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-black overflow-y-auto no-scrollbar relative flex flex-col">
      <div className="shrink-0 px-8 py-4 bg-neutral-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Workspace Ativo: {activeBrand?.name}</h2>
        </div>
        <button onClick={() => setIsEditingIdentity(true)} className="px-6 py-2 bg-neutral-800 border border-white/5 text-white text-[10px] font-black rounded-full uppercase tracking-widest hover:bg-indigo-600 transition-all">
          {t.edit}
        </button>
      </div>

      <div className="flex-1 p-8 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-20">
          
          {activeBrand && (
            <section className="space-y-12 animate-in fade-in duration-700">
               <div className="flex flex-col lg:flex-row items-center justify-between gap-12 border-b border-white/5 pb-12">
                <div className="flex-1 space-y-4 text-center lg:text-left">
                   <h2 className="text-6xl lg:text-9xl font-display font-black text-white tracking-tighter italic uppercase">{activeBrand.name}</h2>
                   <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">{activeBrand.kit?.concept || t.pending}</p>
                </div>
                {activeBrand.kit?.logoUrl && (
                  <div className="w-40 h-40 bg-neutral-900/40 rounded-[40px] border border-white/5 flex items-center justify-center p-8 backdrop-blur-sm shadow-2xl">
                    <img src={activeBrand.kit.logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" />
                  </div>
                )}
              </div>

              {activeBrand.kit && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10 bg-neutral-900/20 border border-white/5 rounded-[48px] backdrop-blur-xl">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{t.colors}</h3>
                    <div className="flex gap-3">
                      {Object.entries(activeBrand.kit.colors).map(([key, hex]) => (
                        <div key={key} className="group relative">
                          <div className="w-12 h-12 rounded-2xl border border-white/10 shadow-xl" style={{ backgroundColor: hex as string }}></div>
                          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase">{hex as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{t.typo}</h3>
                    <div className="space-y-1">
                      <p className="text-2xl text-white font-black truncate italic">{activeBrand.kit.typography.display}</p>
                      <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest">Primary Typeface</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{t.tone}</h3>
                    <div className="flex flex-wrap gap-2">
                      {activeBrand.kit.tone?.map((tone, i) => (
                        <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-neutral-400 uppercase tracking-widest">{tone}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="space-y-24 pb-40">
            {groupedAssets.map((group) => (
              <div key={group.id} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex flex-col gap-2 border-l-4 border-indigo-500 pl-8">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t.request_folder} #{group.id.slice(-4)}</span>
                  <h2 className="text-4xl font-display font-black text-white tracking-tighter italic leading-tight">"{group.title}"</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {group.items.map((asset) => (
                    <div key={asset.id} className={`group bg-neutral-900/20 rounded-[48px] overflow-hidden border transition-all duration-500 shadow-2xl ${asset.status === 'approved' ? 'border-indigo-500/40 ring-1 ring-indigo-500/10' : 'border-white/5'}`}>
                      <div className="aspect-square relative bg-neutral-900 overflow-hidden">
                        {asset.videoUrl ? (
                          <video src={asset.videoUrl} controls className="w-full h-full object-cover" />
                        ) : asset.audioUrl ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-600/10 gap-6 p-8">
                            <div className="text-6xl animate-pulse">🎵</div>
                            <audio src={asset.audioUrl} controls className="w-full" />
                          </div>
                        ) : asset.imageUrl ? (
                          <img src={asset.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                        ) : null}
                        
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 p-8 backdrop-blur-md">
                           <div className="grid grid-cols-2 gap-3 w-full">
                            <button onClick={() => handleAssetStatus(asset.id, 'approved')} className="py-4 bg-green-500 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest">{t.approve}</button>
                            <button onClick={() => handleAssetStatus(asset.id, 'rejected')} className="py-4 bg-red-500 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest">{t.reject}</button>
                          </div>
                          <button onClick={() => setViewingPromptAsset(asset)} className="w-full py-4 bg-neutral-800 text-white text-[10px] font-bold rounded-2xl border border-white/5 uppercase tracking-widest">{t.view_prompt}</button>
                          {asset.videoUrl && asset.metadata && (
                            <button onClick={() => setExtendingVideoAsset(asset)} className="w-full py-4 bg-indigo-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest shadow-xl">{t.extend_video}</button>
                          )}
                          {asset.imageUrl && activeBrand?.kit?.logoUrl && (
                             <button onClick={() => handleExportWithLogo(asset)} disabled={!!isExporting} className="w-full py-4 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50">
                               {isExporting === asset.id ? t.exporting : t.export_logo}
                             </button>
                          )}
                        </div>
                      </div>

                      <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black text-white italic truncate max-w-[200px]">{asset.name}</span>
                          <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full">{asset.type}</span>
                        </div>
                        <textarea 
                          value={asset.copy || ''} 
                          onChange={(e) => handleUpdateAssetCopy(asset.id, e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-xs text-neutral-300 min-h-[140px] outline-none focus:border-indigo-500/30 transition-all resize-none leading-relaxed italic no-scrollbar"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      {isEditingIdentity && activeBrand && (
        <BrandManager 
          brand={activeBrand}
          language={language}
          onSave={onUpdateBrand}
          onDelete={onDeleteBrand}
          onClose={() => setIsEditingIdentity(false)}
        />
      )}

      {viewingPromptAsset && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md" onClick={() => setViewingPromptAsset(null)}>
          <div className="bg-neutral-900 border border-white/10 rounded-[32px] w-full max-w-xl p-8 space-y-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">{t.prompt_modal_title}</h3>
            <div className="bg-black p-6 rounded-2xl border border-neutral-800 text-sm font-mono text-indigo-400 italic">"{viewingPromptAsset.prompt}"</div>
            <button onClick={() => handleCopy(viewingPromptAsset.prompt, viewingPromptAsset.id)} className="w-full py-4 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
              {copyStatus === viewingPromptAsset.id ? t.copied : t.copy_prompt}
            </button>
          </div>
        </div>
      )}

      {extendingVideoAsset && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md" onClick={() => setExtendingVideoAsset(null)}>
          <div className="bg-neutral-900 border border-white/10 rounded-[40px] w-full max-w-xl p-10 space-y-8" onClick={e => e.stopPropagation()}>
            <div className="space-y-2">
              <h3 className="text-3xl font-display font-black text-white uppercase italic tracking-tighter">{t.extend_modal_title}</h3>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">{t.extend_modal_sub}</p>
            </div>
            <textarea 
              value={extensionPrompt}
              onChange={e => setExtensionPrompt(e.target.value)}
              className="w-full bg-black border border-neutral-800 rounded-2xl p-6 text-sm text-white min-h-[120px] outline-none focus:border-indigo-500 transition-all placeholder:text-neutral-700 font-medium"
              placeholder="Ex: A câmera se aproxima do produto e revela os detalhes do acabamento de luxo..."
            />
            <div className="flex gap-4">
              <button onClick={() => setExtendingVideoAsset(null)} className="flex-1 py-5 bg-neutral-800 text-neutral-400 text-[10px] font-black rounded-2xl uppercase tracking-widest">CANCELAR</button>
              <button 
                onClick={() => {
                  if (!extensionPrompt.trim()) return;
                  onExtendVideo(extendingVideoAsset, extensionPrompt);
                  setExtendingVideoAsset(null);
                  setExtensionPrompt('');
                }} 
                className="flex-[2] py-5 bg-indigo-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95"
              >
                {t.extend_btn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;
