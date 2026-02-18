
import React, { useState } from 'react';
import { Brand, Language, BrandKit } from '../types';
import { gemini } from '../services/geminiService';

interface BrandManagerProps {
  brand?: Brand;
  language: Language;
  onSave: (brand: Brand) => Promise<void>;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const BrandManager: React.FC<BrandManagerProps> = ({ brand, language, onSave, onClose, onDelete }) => {
  const [name, setName] = useState(brand?.name || '');
  const [website, setWebsite] = useState(brand?.website || '');
  const [instagram, setInstagram] = useState(brand?.instagram || '');
  const [visualRefs, setVisualRefs] = useState<string[]>(brand?.visualReferences || []);
  const [kit, setKit] = useState<BrandKit | undefined>(brand?.kit);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    pt: {
      title: brand && brand.id.includes('-') ? "Editar Marca" : "Nova Marca",
      name: "Nome da Marca",
      web: "Website",
      insta: "Instagram",
      refs: "Referências Visuais",
      identity: "Ativos de Identidade",
      logo: "Logo Principal",
      symbol: "Símbolo",
      icon: "Ícone",
      variations: "Variações",
      aiBtn: isGenerating ? "ANALISANDO..." : "SCAN & BUILD",
      save: isSaving ? "SINCRONIZANDO..." : "SALVAR BRANDBOOK",
      delete: "EXCLUIR",
      concept: "Posicionamento",
      colors: "Cores Identificadas",
      typo: "Tipografia",
      tone: "Tom de Voz",
      approval: "Aprove a identidade extraída.",
      error: "Erro na varredura. Tente novamente."
    },
    en: {
      title: brand && brand.id.includes('-') ? "Edit Brand" : "New Brand",
      name: "Brand Name",
      web: "Website",
      insta: "Instagram",
      refs: "Visual References",
      identity: "Identity Assets",
      logo: "Main Logo",
      symbol: "Symbol",
      icon: "Icon",
      variations: "Variations",
      aiBtn: isGenerating ? "SCANNING..." : "SCAN & BUILD",
      save: isSaving ? "SYNCING..." : "SAVE BRANDBOOK",
      delete: "DELETE",
      concept: "Positioning",
      colors: "Identified Palette",
      typo: "Typography",
      tone: "Tone of Voice",
      approval: "Approve extracted identity.",
      error: "Scan error. Please try again."
    }
  }[language === 'es' ? 'en' : language];

  const handleGenerateIdentity = async () => {
    if (!name) return;
    setIsGenerating(true);
    setError(null);
    try {
      const proposal = await gemini.generateBrandProposal(name, website, instagram, visualRefs);
      setKit(proposal);
    } catch (err) {
      setError(t.error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAssetUpload = (type: 'logo' | 'symbol' | 'icon' | 'variation', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && kit) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setKit(prev => {
          if (!prev) return prev;
          if (type === 'logo') return { ...prev, logoUrl: result };
          if (type === 'symbol') return { ...prev, symbolUrl: result };
          if (type === 'icon') return { ...prev, iconUrl: result };
          if (type === 'variation') return { ...prev, logoVariations: [...(prev.logoVariations || []), result] };
          return prev;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVisualRefs(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        id: brand?.id || Date.now().toString(),
        name,
        website,
        instagram,
        visualReferences: visualRefs,
        kit: kit
      });
      onClose();
    } catch (err) {
      setError(t.error);
    } finally {
      setIsSaving(false);
    }
  };

  const AssetSlot = ({ label, value, type, onRemove }: { label: string, value?: string, type: 'logo' | 'symbol' | 'icon', onRemove?: () => void }) => (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest block">{label}</label>
      <div className="relative group aspect-square bg-black border border-neutral-800 rounded-xl overflow-hidden flex items-center justify-center">
        {value ? (
          <>
            <img src={value} className="w-full h-full object-contain p-2" alt={label} />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label className="p-2 bg-white text-black rounded-lg cursor-pointer hover:scale-110 transition-transform">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <input type="file" className="hidden" onChange={(e) => handleAssetUpload(type, e)} accept="image/*" />
              </label>
            </div>
          </>
        ) : (
          <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
            <span className="text-xl text-neutral-700">+</span>
            <input type="file" className="hidden" onChange={(e) => handleAssetUpload(type, e)} accept="image/*" />
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-neutral-900 border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[40px] w-full max-w-5xl h-[94vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl transition-all">
        
        {/* Header */}
        <div className="px-6 py-5 sm:px-10 border-b border-white/5 flex items-center justify-between shrink-0 bg-neutral-900/50 backdrop-blur-md">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-3xl font-display font-black text-white tracking-tighter uppercase italic truncate">{t.title}</h2>
            <p className="text-[9px] sm:text-xs text-neutral-500 font-bold tracking-widest uppercase mt-0.5">Identity Intelligence Hub</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full hover:bg-white/5 text-neutral-500 hover:text-white transition-all text-xl flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-12 no-scrollbar scroll-smooth">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-[0.2em] text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: Input & Data */}
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{t.name}</label>
                  <input 
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-black border border-neutral-800 rounded-2xl py-5 px-8 text-white focus:border-indigo-500 transition-all outline-none font-bold text-lg"
                    placeholder="Brand Name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{t.web}</label>
                    <input 
                      value={website} onChange={e => setWebsite(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded-2xl py-4 px-6 text-white focus:border-indigo-500 transition-all outline-none text-xs"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{t.insta}</label>
                    <input 
                      value={instagram} onChange={e => setInstagram(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded-2xl py-4 px-6 text-white focus:border-indigo-500 transition-all outline-none text-xs"
                      placeholder="@handle"
                    />
                  </div>
                </div>
              </div>

              {/* IDENTITY ASSETS - ONLY SHOW IF KIT EXISTS */}
              {kit && (
                <div className="space-y-6 pt-6 border-t border-white/5 animate-in slide-in-from-top-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t.identity}</h3>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    <AssetSlot label={t.logo} value={kit.logoUrl} type="logo" />
                    <AssetSlot label={t.symbol} value={kit.symbolUrl} type="symbol" />
                    <AssetSlot label={t.icon} value={kit.iconUrl} type="icon" />
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest block">{t.variations}</label>
                      <label className="aspect-square bg-neutral-900/50 border-2 border-dashed border-neutral-800 rounded-xl flex items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-neutral-600">
                        <span className="text-xl">+</span>
                        <input type="file" className="hidden" multiple onChange={(e) => handleAssetUpload('variation', e)} accept="image/*" />
                      </label>
                    </div>
                  </div>
                  {kit.logoVariations && kit.logoVariations.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 pt-2">
                      {kit.logoVariations.map((v, i) => (
                        <div key={i} className="relative aspect-square bg-black border border-neutral-800 rounded-lg overflow-hidden p-1 group">
                          <img src={v} className="w-full h-full object-contain" />
                          <button 
                            onClick={() => setKit(prev => prev ? { ...prev, logoVariations: prev.logoVariations?.filter((_, idx) => idx !== i) } : prev)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4 pt-6 border-t border-white/5">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{t.refs}</label>
                <div className="grid grid-cols-4 gap-3">
                  {visualRefs.map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group shadow-lg bg-black">
                      <img src={src} className="w-full h-full object-cover" />
                      <button onClick={() => setVisualRefs(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-indigo-500/5 group text-neutral-600">
                    <span className="text-2xl group-hover:scale-125 transition-transform">+</span>
                    <input type="file" onChange={handleFileUpload} accept="image/*" className="hidden" />
                  </label>
                </div>
              </div>

              <button 
                onClick={handleGenerateIdentity}
                disabled={!name || isGenerating}
                className={`w-full py-6 rounded-[28px] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20 ${
                  kit ? 'bg-neutral-800 text-neutral-500' : 'bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-600/20'
                }`}
              >
                {isGenerating && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                {kit ? (language === 'pt' ? 'REESCANEAR' : 'RE-SCAN') : t.aiBtn}
              </button>
            </div>

            {/* Right: Creative Intelligence Preview */}
            <div className="bg-black/50 border border-white/5 rounded-[40px] p-8 sm:p-10 flex flex-col relative overflow-hidden group min-h-[400px]">
               {!kit ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex items-center justify-center text-4xl animate-pulse">📡</div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Digital Twin Scanning</p>
                    <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest leading-relaxed max-w-[240px]">A synapx extrairá sua essência visual a partir dos links fornecidos.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">{t.concept}</h3>
                    <p className="text-sm text-white font-medium italic leading-relaxed">"{kit.concept}"</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">{t.colors}</h3>
                    <div className="grid grid-cols-3 sm:flex gap-3">
                      {Object.entries(kit.colors).map(([key, hex]) => (
                        <div key={key} className="flex-1 group/color relative min-w-0">
                          <div className="h-14 rounded-xl border border-white/10 shadow-2xl transition-transform hover:scale-105" style={{ backgroundColor: hex }}></div>
                          <p className="text-[8px] font-mono text-neutral-600 mt-2 text-center uppercase truncate">{hex}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <h3 className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">{t.typo}</h3>
                      <div className="space-y-1">
                        <p className="text-lg text-white font-black truncate">{kit.typography.display}</p>
                        <p className="text-[8px] text-neutral-600 uppercase tracking-widest">Visual DNA</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">{t.tone}</h3>
                      <div className="flex flex-wrap gap-2">
                        {kit.tone.slice(0, 4).map((t, i) => (
                          <span key={i} className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {kit.hasExistingLogo && (
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4">
                      <span className="text-xl">✅</span>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-relaxed">Identidade Visual Detectada com Sucesso. Ativos carregados no workspace.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-5 sm:p-10 bg-neutral-950/80 border-t border-white/10 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="hidden sm:block text-[9px] text-neutral-500 font-bold uppercase tracking-widest max-w-[300px] leading-relaxed italic">
            {kit ? t.approval : "Configure o nome e links para iniciar a varredura da marca."}
          </p>
          <div className="flex w-full sm:w-auto gap-4">
            {brand && onDelete && (
              <button onClick={() => onDelete(brand.id)} className="flex-1 sm:flex-none px-8 py-5 text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-widest transition-all bg-red-500/5 rounded-2xl">
                {t.delete}
              </button>
            )}
            <button 
              onClick={handleSave} 
              disabled={isSaving || !name || !kit}
              className="flex-[2] sm:flex-none px-12 py-5 bg-white hover:bg-indigo-600 text-black hover:text-white font-black rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-10 uppercase text-[10px] tracking-widest"
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandManager;
