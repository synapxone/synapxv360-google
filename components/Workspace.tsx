
import React, { useState, useEffect } from 'react';
import { CampaignState, DesignAsset, MockupTemplate, Language, Brand, BrandKit } from '../types';
import { gemini } from '../services/geminiService';

interface WorkspaceProps {
  state: CampaignState;
  onGenerateMockup?: (asset: DesignAsset, template: MockupTemplate) => void;
  onGenerateLogo?: () => void;
  onUpdateBrand: (brand: Brand) => Promise<void>;
  language: Language;
}

const Workspace: React.FC<WorkspaceProps> = ({ state, onGenerateMockup, onGenerateLogo, onUpdateBrand, language }) => {
  const activeBrand = state.brands.find(b => b.id === state.activeBrandId);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Brand | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAssetForMockup, setSelectedAssetForMockup] = useState<DesignAsset | null>(null);
  const [viewingPromptAsset, setViewingPromptAsset] = useState<DesignAsset | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (activeBrand) {
      setEditData({ ...activeBrand });
    }
  }, [activeBrand]);

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
      refs: "Referências Visuais (Moodboard)",
      kit_title: "DNA da Marca",
      concept: "Conceito Estratégico",
      palette: "Cromática",
      typo: "Tipografia",
      tone: "Voz e Personalidade",
      logo: "Logo Principal",
      symbol: "Símbolo",
      icon: "Ícone",
      variations: "Variações",
      genLogo: "GERAR LOGO AGORA",
      library: "Galeria Criativa",
      mockup_btn: "Gerar Mockup",
      view_prompt: "Ver Prompt",
      copy_prompt: "Copiar Prompt",
      copied: "Copiado!",
      pending: "Análise estratégica pendente...",
      no_data: "Dados não detectados.",
      prompt_modal_title: "Inteligência do Ativo"
    },
    en: {
      empty: "Your creative workspace will come to life as synapx generates assets.",
      edit: "EDIT IDENTITY",
      save: isSaving ? "SAVING..." : "SAVE CHANGES",
      cancel: "CANCEL",
      scan: isGenerating ? "SCANNING DNA..." : "STRATEGIC AI SCAN",
      name: "Brand Name",
      web: "Official Website",
      insta: "Instagram",
      refs: "Visual References",
      kit_title: "Brand DNA",
      concept: "Strategic Concept",
      palette: "Colors",
      typo: "Typography",
      tone: "Voice & Personality",
      logo: "Main Logo",
      symbol: "Symbol",
      icon: "Icon",
      variations: "Variations",
      genLogo: "GENERATE LOGO NOW",
      library: "Creative Gallery",
      mockup_btn: "Create Mockup",
      view_prompt: "View Prompt",
      copy_prompt: "Copy Prompt",
      copied: "Copied!",
      pending: "Strategic analysis pending...",
      no_data: "No data detected.",
      prompt_modal_title: "Asset Intelligence"
    }
  }[language === 'es' ? 'en' : language];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData(prev => prev ? { ...prev, visualReferences: [...(prev.visualReferences || []), reader.result as string] } : prev);
      };
      reader.readAsDataURL(file);
    }
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
      // Preservar logos manuais se já existirem
      const finalKit = {
        ...proposal,
        logoUrl: editData.kit?.logoUrl || proposal.logoUrl,
        symbolUrl: editData.kit?.symbolUrl || proposal.symbolUrl,
        iconUrl: editData.kit?.iconUrl || proposal.iconUrl,
        logoVariations: [...(editData.kit?.logoVariations || []), ...(proposal.logoVariations || [])]
      };
      setEditData(prev => prev ? { ...prev, kit: finalKit } : prev);
    } catch (e) {
      console.error("Scan error", e);
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
        console.error("Save error", e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!activeBrand && state.assets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950 p-12 text-center">
        <p className="text-neutral-500 font-medium text-sm max-w-sm">{t.empty}</p>
      </div>
    );
  }

  const MOCKUP_TEMPLATES: MockupTemplate[] = [
    { id: 'bizcard', name: 'Stationery', icon: '🪪', description: '', prompt: 'Premium business card mockup' },
    { id: 'tshirt', name: 'Apparel', icon: '👕', description: '', prompt: 'Minimalist luxury t-shirt display' },
    { id: 'packaging', name: 'Packaging', icon: '📦', description: '', prompt: 'Luxury cosmetic packaging' },
    { id: 'billboard', name: 'Out-of-Home', icon: '🏙️', description: '', prompt: 'Cinematic street billboard at night' },
  ];

  return (
    <div className="h-full bg-black overflow-y-auto no-scrollbar relative flex flex-col">
      {/* Header Contextual */}
      <div className="shrink-0 px-8 py-4 bg-neutral-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between z-20 sticky top-0">
        <h2 className="text-xs font-black text-neutral-500 uppercase tracking-widest">{isEditing ? "Modo de Edição Imersivo" : "Workspace Criativo"}</h2>
        <div className="flex gap-4">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-[10px] font-black text-neutral-400 hover:text-white uppercase tracking-widest transition-all">
                {t.cancel}
              </button>
              <button onClick={handleSave} disabled={isSaving} className="px-8 py-2.5 bg-white text-black text-[10px] font-black rounded-full uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95">
                {t.save}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-8 py-2.5 bg-neutral-800 border border-white/5 text-white text-[10px] font-black rounded-full uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95">
              {t.edit}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-8 lg:p-16">
        <div className="max-w-7xl mx-auto space-y-24">
          {isEditing ? (
            <section className="animate-in fade-in zoom-in-95 duration-500 space-y-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">{t.name}</label>
                    <input 
                      value={editData?.name || ''} 
                      onChange={e => setEditData(prev => prev ? { ...prev, name: e.target.value } : prev)}
                      className="w-full bg-neutral-900 border border-white/5 rounded-3xl py-6 px-8 text-white focus:border-indigo-500 transition-all outline-none font-bold text-3xl placeholder:text-neutral-800"
                      placeholder="Ex: synapx Agency"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">{t.web}</label>
                      <input 
                        value={editData?.website || ''} 
                        onChange={e => setEditData(prev => prev ? { ...prev, website: e.target.value } : prev)}
                        className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-neutral-300 focus:border-indigo-500 transition-all outline-none"
                        placeholder="https://brand.com"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">{t.insta}</label>
                      <input 
                        value={editData?.instagram || ''} 
                        onChange={e => setEditData(prev => prev ? { ...prev, instagram: e.target.value } : prev)}
                        className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-4 px-6 text-sm text-neutral-300 focus:border-indigo-500 transition-all outline-none"
                        placeholder="@brandhandle"
                      />
                    </div>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">{t.refs}</label>
                      <label className="cursor-pointer text-[10px] font-black text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-widest">
                        Adicionar +
                        <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                      </label>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                      {editData?.visualReferences?.map((src, i) => (
                        <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-white/5 group bg-neutral-900">
                          <img src={src} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          <button 
                            onClick={() => setEditData(prev => prev ? { ...prev, visualReferences: prev.visualReferences?.filter((_, idx) => idx !== i) } : prev)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleAIScan}
                    disabled={isGenerating || !editData?.name}
                    className="w-full py-6 rounded-[32px] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-indigo-600/20 flex items-center justify-center gap-4 active:scale-95 disabled:opacity-20"
                  >
                    {isGenerating && <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                    {t.scan}
                  </button>
                </div>

                <div className="bg-neutral-900/40 rounded-[48px] p-10 border border-white/5 space-y-12 backdrop-blur-sm">
                  <h3 className="text-xl font-display font-black text-white italic tracking-tighter uppercase">{t.kit_title}</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                    {[
                      { label: t.logo, type: 'logo', value: editData?.kit?.logoUrl },
                      { label: t.symbol, type: 'symbol', value: editData?.kit?.symbolUrl },
                      { label: t.icon, type: 'icon', value: editData?.kit?.iconUrl }
                    ].map((slot) => (
                      <div key={slot.type} className="space-y-3">
                        <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest block text-center">{slot.label}</span>
                        <div className="relative aspect-square bg-black rounded-3xl border border-white/5 overflow-hidden group flex items-center justify-center">
                          {slot.value ? (
                            <>
                              <img src={slot.value} className="max-w-[80%] max-h-[80%] object-contain" />
                              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="p-3 bg-white text-black rounded-full cursor-pointer hover:scale-110 transition-transform">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  <input type="file" className="hidden" onChange={(e) => handleAssetUpload(slot.type as any, e)} accept="image/*" />
                                </label>
                              </div>
                            </>
                          ) : (
                            <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                              <span className="text-3xl text-neutral-800 font-light">+</span>
                              <input type="file" className="hidden" onChange={(e) => handleAssetUpload(slot.type as any, e)} accept="image/*" />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest block text-center">{t.variations}</span>
                      <label className="aspect-square bg-black rounded-3xl border border-dashed border-neutral-800 flex items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-all text-neutral-800">
                        <span className="text-3xl font-light">+</span>
                        <input type="file" className="hidden" multiple onChange={(e) => handleAssetUpload('variation', e)} accept="image/*" />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t.concept}</h4>
                      <textarea 
                        value={editData?.kit?.concept || ''} 
                        onChange={e => setEditData(prev => prev ? { ...prev, kit: { ...prev.kit!, concept: e.target.value } } : prev)}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-sm text-neutral-400 h-32 outline-none focus:border-indigo-500/30 transition-all no-scrollbar"
                      />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t.tone}</h4>
                      <div className="flex flex-wrap gap-2">
                        {editData?.kit?.tone?.map((tone, i) => (
                          <div key={i} className="px-3 py-1 bg-black rounded-lg border border-white/10 flex items-center gap-2 group">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{tone}</span>
                            <button onClick={() => setEditData(prev => prev ? { ...prev, kit: { ...prev.kit!, tone: prev.kit!.tone.filter((_, idx) => idx !== i) } } : prev)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                          </div>
                        ))}
                        <input 
                          onKeyDown={e => {
                            if (e.key === 'Enter' && e.currentTarget.value) {
                              const val = e.currentTarget.value;
                              setEditData(prev => prev ? { ...prev, kit: { ...prev.kit!, tone: [...(prev.kit!.tone || []), val] } } : prev);
                              e.currentTarget.value = '';
                            }
                          }}
                          placeholder="Adicionar +"
                          className="bg-transparent border border-dashed border-neutral-800 rounded-lg px-3 py-1 text-[10px] uppercase font-bold text-neutral-600 outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <>
              {activeBrand && (
                <section className="space-y-12 animate-in fade-in duration-700">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-12 border-b border-white/5 pb-12">
                    <div className="space-y-6 flex-1 text-center lg:text-left">
                      <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full">{t.active_brand}</span>
                      <h2 className="text-5xl lg:text-8xl font-display font-black text-white tracking-tighter leading-none">{activeBrand.name}</h2>
                    </div>
                    
                    <div className="flex gap-4">
                       <div className="w-32 h-32 lg:w-48 lg:h-48 bg-neutral-900/50 rounded-[32px] border border-white/5 flex flex-col items-center justify-center overflow-hidden relative group shadow-2xl">
                        {activeBrand.kit?.logoUrl ? (
                          <img src={activeBrand.kit.logoUrl} className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-500" alt="Logo" />
                        ) : (
                          <div className="text-center p-4 space-y-2">
                            <span className="text-2xl opacity-20 block">🎨</span>
                            <button onClick={onGenerateLogo} className="px-3 py-1.5 bg-indigo-600 text-white text-[8px] font-black rounded-full hover:bg-indigo-500 transition-all uppercase tracking-widest">
                              {t.genLogo}
                            </button>
                          </div>
                        )}
                        <span className="absolute bottom-2 left-0 right-0 text-center text-[7px] font-black text-neutral-700 uppercase tracking-widest">{t.logo}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="w-14 h-14 lg:w-20 lg:h-20 bg-neutral-900/30 border border-white/5 rounded-2xl flex items-center justify-center relative group">
                          {activeBrand.kit?.symbolUrl ? <img src={activeBrand.kit.symbolUrl} className="w-full h-full object-contain p-3" /> : <span className="opacity-10">S</span>}
                          <span className="absolute -bottom-6 left-0 right-0 text-center text-[6px] font-black text-neutral-800 uppercase tracking-widest">{t.symbol}</span>
                        </div>
                        <div className="w-14 h-14 lg:w-20 lg:h-20 bg-neutral-900/30 border border-white/5 rounded-2xl flex items-center justify-center relative group">
                          {activeBrand.kit?.iconUrl ? <img src={activeBrand.kit.iconUrl} className="w-full h-full object-contain p-4" /> : <span className="opacity-10">I</span>}
                          <span className="absolute -bottom-6 left-0 right-0 text-center text-[6px] font-black text-neutral-800 uppercase tracking-widest">{t.icon}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                    <div className="bg-neutral-900/40 rounded-[40px] p-8 border border-white/5 space-y-6 backdrop-blur-sm min-h-[220px]">
                      <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest border-b border-white/5 pb-4">{t.palette}</h3>
                      {activeBrand.kit?.colors && Object.keys(activeBrand.kit.colors).length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
                          {Object.entries(activeBrand.kit.colors).map(([key, color]) => (
                            <div key={key} onClick={() => handleCopy(color as string, key)} className="space-y-2 group cursor-pointer">
                              <div className="h-12 w-full rounded-xl border border-white/10 shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: color as string }}></div>
                              <p className="text-[8px] font-mono text-neutral-500 text-center uppercase tracking-tighter truncate">{copyStatus === key ? t.copied : (color as string)}</p>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-[10px] text-neutral-700 italic">{activeBrand.kit ? t.no_data : t.pending}</p>}
                    </div>

                    <div className="bg-neutral-900/40 rounded-[40px] p-8 border border-white/5 space-y-8 backdrop-blur-sm min-h-[220px]">
                      <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest border-b border-white/5 pb-4">{t.typo}</h3>
                      {activeBrand.kit?.typography?.display ? (
                        <div className="space-y-6 animate-in fade-in duration-500">
                          <div>
                            <p className="text-[8px] text-neutral-600 uppercase tracking-widest mb-1">Display</p>
                            <p className="text-xl font-black text-white uppercase tracking-tighter truncate">{activeBrand.kit.typography.display}</p>
                          </div>
                          <div className="pt-4 border-t border-white/5">
                            <p className="text-[8px] text-neutral-600 uppercase tracking-widest mb-2">Body System</p>
                            <p className="text-[10px] text-neutral-400 leading-relaxed italic truncate">{activeBrand.kit.typography.body}</p>
                          </div>
                        </div>
                      ) : <p className="text-[10px] text-neutral-700 italic">{activeBrand.kit ? t.no_data : t.pending}</p>}
                    </div>

                    <div className="bg-neutral-900/40 rounded-[40px] p-8 border border-white/5 space-y-6 backdrop-blur-sm min-h-[220px]">
                      <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest border-b border-white/5 pb-4">{t.tone}</h3>
                      {activeBrand.kit?.tone && activeBrand.kit.tone.length > 0 ? (
                        <div className="flex flex-wrap gap-2 animate-in fade-in duration-500">
                          {activeBrand.kit.tone.slice(0, 6).map((tone, i) => (
                            <span key={i} className="px-2 py-1 bg-black/40 text-neutral-500 rounded-md text-[8px] font-bold border border-white/5 uppercase tracking-widest">
                              {tone}
                            </span>
                          ))}
                        </div>
                      ) : <p className="text-[10px] text-neutral-700 italic">{activeBrand.kit ? t.no_data : t.pending}</p>}
                    </div>

                    <div className="bg-neutral-900/40 rounded-[40px] p-8 border border-white/5 space-y-4 backdrop-blur-sm min-h-[220px]">
                      <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest border-b border-white/5 pb-4">Conceito</h3>
                      {activeBrand.kit?.concept ? (
                        <p className="text-[10px] text-neutral-400 leading-relaxed italic font-medium animate-in fade-in duration-500">"{activeBrand.kit.concept}"</p>
                      ) : <p className="text-[10px] text-neutral-700 italic">{activeBrand.kit ? t.no_data : t.pending}</p>}
                    </div>
                  </div>

                  {activeBrand.kit?.logoVariations && activeBrand.kit.logoVariations.length > 0 && (
                     <div className="space-y-6 pt-12 animate-in fade-in duration-1000">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{t.variations}</h3>
                        <div className="h-[1px] flex-1 bg-white/5"></div>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {activeBrand.kit.logoVariations.map((ref, i) => (
                          <div key={i} className="min-w-[120px] aspect-square rounded-2xl overflow-hidden border border-white/5 bg-neutral-900/40 p-4 group relative">
                            <img src={ref} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt="Variation" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {state.assets.length > 0 && (
                <section className="space-y-12 pb-20 pt-12">
                  <div className="flex items-baseline gap-4 border-b border-white/5 pb-8">
                    <h2 className="text-4xl font-display font-black text-white tracking-tighter">{t.library}</h2>
                    <span className="text-xs text-neutral-600 font-bold uppercase tracking-[0.2em]">{state.assets.length} items</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {state.assets.map((asset) => (
                      <div key={asset.id} className="group bg-neutral-900/20 rounded-[40px] overflow-hidden border border-white/5 hover:border-indigo-500/30 transition-all duration-500 shadow-2xl">
                        <div className="aspect-square relative bg-neutral-900 overflow-hidden">
                          {asset.imageUrl ? (
                            <img src={asset.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={asset.name} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center animate-pulse bg-neutral-800">
                              <span className="text-2xl opacity-10">GENERATE</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 p-8 backdrop-blur-sm">
                            <button onClick={() => setSelectedAssetForMockup(asset)} className="w-full py-4 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                              {t.mockup_btn}
                            </button>
                            <button onClick={() => setViewingPromptAsset(asset)} className="w-full py-4 bg-neutral-800 text-white text-[10px] font-bold rounded-2xl border border-white/5 uppercase tracking-widest transform translate-y-8 group-hover:translate-y-0 transition-all duration-700">
                              {t.view_prompt}
                            </button>
                          </div>
                        </div>
                        <div className="p-8 space-y-2">
                          <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest">{asset.type || 'Campaign Asset'}</p>
                          <h4 className="font-bold text-white text-lg tracking-tight truncate">{asset.name}</h4>
                          <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed h-8 italic">{asset.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modais de Suporte */}
      {selectedAssetForMockup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-neutral-900 border border-white/10 rounded-[40px] w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="p-10 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-2xl font-black text-white">{t.mock_title}</h3>
              <button onClick={() => setSelectedAssetForMockup(null)} className="text-neutral-400 hover:text-white text-2xl">✕</button>
            </div>
            <div className="p-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {MOCKUP_TEMPLATES.map((tpl) => (
                <button key={tpl.id} onClick={() => { onGenerateMockup?.(selectedAssetForMockup, tpl); setSelectedAssetForMockup(null); }} className="flex flex-col items-center gap-4 p-6 bg-neutral-800/40 hover:bg-indigo-600/20 border border-white/5 rounded-3xl transition-all group text-center">
                  <span className="text-4xl">{tpl.icon}</span>
                  <h4 className="font-bold text-white text-[10px] uppercase tracking-widest">{tpl.name}</h4>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingPromptAsset && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md" onClick={() => setViewingPromptAsset(null)}>
          <div className="bg-neutral-900 border border-white/10 rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{t.prompt_modal_title}</h3>
              <button onClick={() => setViewingPromptAsset(null)} className="text-neutral-400 hover:text-white">✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Digital prompt</span>
                <div className="bg-black p-6 rounded-2xl border border-neutral-800 text-sm font-mono text-indigo-400 leading-relaxed italic">
                  "{viewingPromptAsset.prompt}"
                </div>
              </div>
              <button onClick={() => handleCopy(viewingPromptAsset.prompt, viewingPromptAsset.id)} className="w-full py-4 bg-white text-black text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
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
