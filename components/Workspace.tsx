
import React, { useState, useEffect, useMemo } from 'react';
import { CampaignState, DesignAsset, MockupTemplate, Language, Brand, BrandKit } from '../types';
import { gemini } from '../services/geminiService';

interface WorkspaceProps {
  state: CampaignState;
  onGenerateMockup?: (asset: DesignAsset, template: MockupTemplate) => void;
  onGenerateLogo?: () => void;
  onUpdateBrand: (brand: Brand) => Promise<void>;
  onUpdateAssets: (assets: DesignAsset[]) => void;
  onSendMessage: (content: string) => void;
  language: Language;
}

const Workspace: React.FC<WorkspaceProps> = ({ state, onGenerateMockup, onGenerateLogo, onUpdateBrand, onUpdateAssets, onSendMessage, language }) => {
  const activeBrand = state.brands.find(b => b.id === state.activeBrandId);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Brand | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingPromptAsset, setViewingPromptAsset] = useState<DesignAsset | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (activeBrand) {
      setEditData({ ...activeBrand });
    }
  }, [activeBrand]);

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
      save: isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES",
      cancel: "CANCELAR",
      scan: isGenerating ? "ESCANEANDO DNA..." : "VARREDURA AI ESTRATÉGICA",
      name: "Nome da Marca",
      web: "Website Oficial",
      insta: "Instagram",
      refs: "Moodboard",
      kit_title: "DNA da Marca",
      concept: "Conceito",
      palette: "Cromática",
      typo: "Tipografia",
      tone: "Voz",
      logo: "Logo",
      symbol: "Símbolo",
      icon: "Ícone",
      variations: "Variações",
      genLogo: "GERAR LOGO",
      library: "Galeria Criativa",
      mockup_btn: "Mockup",
      view_prompt: "Prompt",
      copy_prompt: "Copiar Copy",
      copied: "Copiado!",
      approve: "Aprovado",
      reject: "Reprovado",
      varBtn: "Variar",
      copyTitle: "Copy Estratégico",
      editCopy: "Editar",
      pending: "Pendente",
      no_data: "Sem dados.",
      prompt_modal_title: "Inteligência Digital",
      request_folder: "Solicitação"
    },
    en: {
      empty: "Your creative workspace will come to life as assets are generated.",
      edit: "EDIT IDENTITY",
      save: isSaving ? "SAVING..." : "SAVE CHANGES",
      cancel: "CANCEL",
      scan: isGenerating ? "SCANNING..." : "STRATEGIC SCAN",
      name: "Brand Name",
      web: "Website",
      insta: "Instagram",
      refs: "Moodboard",
      kit_title: "Brand DNA",
      concept: "Concept",
      palette: "Colors",
      typo: "Typography",
      tone: "Voice",
      logo: "Logo",
      symbol: "Symbol",
      icon: "Icon",
      variations: "Variations",
      genLogo: "GEN LOGO",
      library: "Gallery",
      mockup_btn: "Mockup",
      view_prompt: "Prompt",
      copy_prompt: "Copy Text",
      copied: "Copied!",
      approve: "Approve",
      reject: "Reject",
      varBtn: "Vary",
      copyTitle: "Strategic Copy",
      editCopy: "Edit",
      pending: "Pending",
      no_data: "No data.",
      prompt_modal_title: "Digital Intel",
      request_folder: "Request"
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

  const handleRequestVariations = (asset: DesignAsset) => {
    const assetName = asset.name || "esta arte";
    const assetPrompt = asset.prompt || "o conceito original";
    onSendMessage(`Como Designer Senior, gere 3 variações criativas para a arte "${assetName}". Mantenha a essência do prompt original: "${assetPrompt}", mas mude a composição e a iluminação para algo inovador.`);
  };

  const handleAssetUpload = (type: 'logo' | 'symbol' | 'icon' | 'variation', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editData) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setEditData(prev => {
          if (!prev) return prev;
          const newKit: BrandKit = prev.kit || { 
            name: prev.name, 
            concept: '', 
            tone: [], 
            colors: { primary: '', secondary: '', accent: '', neutralLight: '', neutralDark: '' },
            typography: { display: '', body: '', mono: '' }
          };
          if (type === 'logo') newKit.logoUrl = result;
          if (type === 'symbol') newKit.symbolUrl = result;
          if (type === 'icon') newKit.iconUrl = result;
          if (type === 'variation') newKit.logoVariations = [...(newKit.logoVariations || []), result];
          return { ...prev, kit: newKit };
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIScan = async () => {
    if (!editData?.name) return;
    setIsGenerating(true);
    try {
      const proposal = await gemini.generateBrandProposal(editData.name, editData.website, editData.instagram, editData.visualReferences);
      const finalKit = {
        ...proposal,
        logoUrl: editData.kit?.logoUrl || proposal.logoUrl,
        symbolUrl: editData.kit?.symbolUrl || proposal.symbolUrl,
        iconUrl: editData.kit?.iconUrl || proposal.iconUrl,
        logoVariations: [...(editData.kit?.logoVariations || []), ...(proposal.logoVariations || [])]
      };
      setEditData(prev => prev ? { ...prev, kit: finalKit } : prev);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (editData && !isSaving) {
      setIsSaving(true);
      try {
        await onUpdateBrand(editData);
        setIsEditing(false);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
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
        <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{isEditing ? "Edição Digital" : "Painel Criativo"}</h2>
        <div className="flex gap-4">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="px-5 py-2 text-[10px] font-black text-neutral-400 hover:text-white uppercase tracking-widest transition-all">{t.cancel}</button>
              <button onClick={handleSave} disabled={isSaving} className="px-8 py-2 bg-white text-black text-[10px] font-black rounded-full uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">{t.save}</button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-8 py-2 bg-neutral-800 border border-white/5 text-white text-[10px] font-black rounded-full uppercase tracking-widest hover:bg-indigo-600 transition-all">{t.edit}</button>
          )}
        </div>
      </div>

      <div className="flex-1 p-8 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-20">
          
          {isEditing ? (
            <section className="animate-in fade-in zoom-in-95 duration-500 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{t.name}</label>
                    <input value={editData?.name || ''} onChange={e => setEditData(prev => prev ? { ...prev, name: e.target.value } : prev)} className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-5 px-8 text-white focus:border-indigo-500 transition-all outline-none font-bold text-2xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input value={editData?.website || ''} onChange={e => setEditData(prev => prev ? { ...prev, website: e.target.value } : prev)} className="bg-neutral-900 border border-white/5 rounded-xl py-3 px-6 text-xs" placeholder="URL" />
                    <input value={editData?.instagram || ''} onChange={e => setEditData(prev => prev ? { ...prev, instagram: e.target.value } : prev)} className="bg-neutral-900 border border-white/5 rounded-xl py-3 px-6 text-xs" placeholder="Instagram" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-black text-neutral-500">{t.refs}</label></div>
                    <div className="grid grid-cols-5 gap-3">
                      {editData?.visualReferences?.map((src, i) => <div key={i} className="aspect-square rounded-xl bg-neutral-900 overflow-hidden border border-white/5"><img src={src} className="w-full h-full object-cover" /></div>)}
                      <label className="aspect-square rounded-xl border border-dashed border-neutral-800 flex items-center justify-center text-xl cursor-pointer hover:bg-white/5">+</label>
                    </div>
                  </div>
                  <button onClick={handleAIScan} disabled={isGenerating || !editData?.name} className="w-full py-5 bg-indigo-600 rounded-3xl font-black text-[10px] tracking-widest uppercase">{isGenerating ? 'SCANNING...' : t.scan}</button>
                </div>
                <div className="bg-neutral-900/30 p-8 rounded-[40px] border border-white/5 space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    {['logo', 'symbol', 'icon'].map(type => (
                      <div key={type} className="space-y-2">
                        <span className="text-[9px] font-black text-neutral-600 uppercase block text-center">{type}</span>
                        <div className="aspect-square bg-black rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-white/5 transition-all">
                          {editData?.kit?.[type + 'Url' as keyof BrandKit] ? <img src={editData.kit[type + 'Url' as keyof BrandKit] as string} className="max-w-[70%] max-h-[70%] object-contain" /> : <span className="text-xl">+</span>}
                          <input type="file" className="hidden" onChange={e => handleAssetUpload(type as any, e)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <>
              {activeBrand && (
                <section className="space-y-12 animate-in fade-in duration-700">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-12 border-b border-white/5 pb-12">
                    <div className="flex-1 space-y-4 text-center lg:text-left">
                       <h2 className="text-6xl lg:text-9xl font-display font-black text-white tracking-tighter italic">{activeBrand.name}</h2>
                       <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">{activeBrand.kit?.concept || t.pending}</p>
                    </div>
                    {activeBrand.kit?.logoUrl && (
                      <div className="w-40 h-40 bg-neutral-900/40 rounded-[40px] border border-white/5 flex items-center justify-center p-8 backdrop-blur-sm shadow-2xl">
                        <img src={activeBrand.kit.logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-neutral-900/30 p-8 rounded-[40px] border border-white/5 space-y-6 backdrop-blur-sm min-h-[220px]">
                      <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{t.palette}</h3>
                      {activeBrand.kit?.colors && Object.keys(activeBrand.kit.colors).length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(activeBrand.kit.colors).map(([key, color]) => (
                            <div key={key} onClick={() => handleCopy(color as string, key)} className="space-y-1 cursor-pointer group">
                              <div className="h-10 rounded-xl border border-white/5 group-hover:scale-105 transition-transform" style={{ backgroundColor: color as string }}></div>
                              <p className="text-[8px] font-mono text-neutral-500 text-center uppercase">{copyStatus === key ? t.copied : color as string}</p>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-[10px] text-neutral-800 italic">{t.no_data}</p>}
                    </div>

                    <div className="bg-neutral-900/30 p-8 rounded-[40px] border border-white/5 space-y-6 backdrop-blur-sm min-h-[220px]">
                      <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{t.typo}</h3>
                      {activeBrand.kit?.typography?.display ? (
                        <div className="space-y-4">
                          <p className="text-2xl font-black text-white uppercase tracking-tighter truncate">{activeBrand.kit.typography.display}</p>
                          <p className="text-[10px] text-neutral-500 italic leading-tight">{activeBrand.kit.typography.body}</p>
                        </div>
                      ) : <p className="text-[10px] text-neutral-800 italic">{t.no_data}</p>}
                    </div>

                    <div className="bg-neutral-900/30 p-8 rounded-[40px] border border-white/5 space-y-6 backdrop-blur-sm min-h-[220px]">
                      <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{t.tone}</h3>
                      <div className="flex flex-wrap gap-2">
                        {activeBrand.kit?.tone?.map((tone, i) => (
                          <span key={i} className="px-2 py-1 bg-white/5 text-[9px] font-bold text-neutral-400 border border-white/5 rounded-lg uppercase tracking-widest">{tone}</span>
                        )) || <p className="text-[10px] text-neutral-800 italic">{t.no_data}</p>}
                      </div>
                    </div>

                    <div className="bg-neutral-900/30 p-8 rounded-[40px] border border-white/5 space-y-4 backdrop-blur-sm min-h-[220px]">
                      <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{t.concept}</h3>
                      <p className="text-[11px] text-neutral-400 leading-relaxed italic">"{activeBrand.kit?.concept || t.no_data}"</p>
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-24 pb-40">
                {groupedAssets.length > 0 ? groupedAssets.map((group) => (
                  <div key={group.id} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="flex flex-col gap-2 border-l-4 border-indigo-500 pl-8">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t.request_folder} #{group.id.slice(-4)}</span>
                      <h2 className="text-4xl font-display font-black text-white tracking-tighter italic leading-tight">
                        "{group.title}"
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {group.items.map((asset) => (
                        <div key={asset.id} className={`group bg-neutral-900/20 rounded-[48px] overflow-hidden border transition-all duration-500 shadow-2xl ${asset.status === 'approved' ? 'border-indigo-500/40 ring-1 ring-indigo-500/10' : 'border-white/5'}`}>
                          <div className="aspect-square relative bg-neutral-900 overflow-hidden">
                            {asset.imageUrl && <img src={asset.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />}
                            
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 p-8 backdrop-blur-md">
                              <div className="grid grid-cols-2 gap-3 w-full">
                                <button onClick={() => handleAssetStatus(asset.id, 'approved')} className="py-4 bg-green-500/90 hover:bg-green-500 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all">
                                  {t.approve}
                                </button>
                                <button onClick={() => handleAssetStatus(asset.id, 'rejected')} className="py-4 bg-red-500/90 hover:bg-red-500 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all">
                                  {t.reject}
                                </button>
                              </div>
                              <button onClick={() => handleRequestVariations(asset)} className="w-full py-4 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
                                {t.varBtn}
                              </button>
                              <button onClick={() => setViewingPromptAsset(asset)} className="w-full py-4 bg-neutral-800 text-white text-[10px] font-bold rounded-2xl border border-white/5 uppercase tracking-widest">
                                {t.view_prompt}
                              </button>
                            </div>
                            {asset.status === 'approved' && (
                              <div className="absolute top-6 right-6 px-4 py-2 bg-indigo-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-xl animate-in zoom-in duration-300">
                                ✓ SAVED
                              </div>
                            )}
                          </div>

                          <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                              {activeBrand?.kit?.logoUrl ? (
                                <img src={activeBrand.kit.logoUrl} className="h-6 object-contain opacity-80" alt="Logo" />
                              ) : (
                                <span className="text-lg font-black text-white italic">{activeBrand?.name || 'Asset'}</span>
                              )}
                              <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full">{asset.type}</span>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{t.copyTitle}</h4>
                                <button onClick={() => handleCopy(asset.copy || '', asset.id)} className="text-[9px] font-black text-indigo-500 hover:text-indigo-400 uppercase tracking-widest">
                                  {copyStatus === asset.id ? t.copied : t.copy_prompt}
                                </button>
                              </div>
                              <textarea 
                                value={asset.copy || ''} 
                                onChange={(e) => handleUpdateAssetCopy(asset.id, e.target.value)}
                                placeholder="Legenda em processamento..."
                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-xs text-neutral-300 min-h-[140px] outline-none focus:border-indigo-500/30 transition-all resize-none leading-relaxed italic no-scrollbar"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center pt-32 text-center space-y-6">
                    <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex items-center justify-center text-4xl animate-pulse">📁</div>
                    <p className="text-neutral-500 text-sm max-w-xs">{t.empty}</p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {viewingPromptAsset && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md" onClick={() => setViewingPromptAsset(null)}>
          <div className="bg-neutral-900 border border-white/10 rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">{t.prompt_modal_title}</h3>
              <button onClick={() => setViewingPromptAsset(null)} className="text-neutral-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-black p-6 rounded-2xl border border-neutral-800 text-sm font-mono text-indigo-400 leading-relaxed italic">
                "{viewingPromptAsset.prompt}"
              </div>
              <button onClick={() => handleCopy(viewingPromptAsset.prompt, viewingPromptAsset.id)} className="w-full py-4 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
                {copyStatus === viewingPromptAsset.id ? t.copied : t.copy_prompt}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;
