
import React, { useState, useEffect } from 'react';
import { DesignAsset, Brand, Language } from '../types';
import { gemini } from '../services/geminiService';
import { supabaseService } from '../services/supabaseService';
import { composeImageWithLogo, LogoOverlayOptions } from '../utils/imageCompose';

interface AssetEditorProps {
  asset: DesignAsset;
  brand: Brand;
  userId: string;
  language: Language;
  onClose: () => void;
  onSave: (updatedAsset: DesignAsset) => void;
}

const AssetEditor: React.FC<AssetEditorProps> = ({ asset, brand, userId, language, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'copy' | 'image' | 'composition'>('copy');
  const [copy, setCopy] = useState(asset.copy || '');
  const [prompt, setPrompt] = useState(asset.prompt || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [intensity, setIntensity] = useState(50);
  
  const [logoOptions, setLogoOptions] = useState<LogoOverlayOptions>({
    position: 'bottom-right',
    scale: 0.18,
    opacity: 0.9,
    padding: 32
  });

  const [composedPreview, setComposedPreview] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'composition' && asset.imageUrl && brand.kit?.logoUrl) {
      handleCompositionPreview();
    }
  }, [activeTab, logoOptions]);

  const handleCompositionPreview = async () => {
    if (!asset.imageUrl || !brand.kit?.logoUrl) return;
    const result = await composeImageWithLogo(asset.imageUrl, brand.kit.logoUrl, logoOptions);
    setComposedPreview(result);
  };

  const handleRegenerateCopy = async () => {
    setIsProcessing(true);
    try {
      const result = await gemini.runSpecialist({ specialist_type: 'copy', goal: asset.description || 'Vendas' }, { tone: brand.kit?.tone?.[0] });
      const match = result.match(/```json-assets\n([\s\S]*?)\n```/);
      if (match) {
        const data = JSON.parse(match[1]);
        setCopy(data[0].copy);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateImage = async () => {
    setIsProcessing(true);
    const variationModifier = intensity < 30 ? "subtle variation, maintaining core structure" : 
                            intensity > 70 ? "bold reinterpretation, high experimental style" : "consistent visual evolution";
    const finalPrompt = `${prompt}. ${variationModifier}.`;
    
    try {
      const newUrl = await gemini.generateImage(finalPrompt, JSON.stringify(brand.kit?.colors));
      const updated = { ...asset, imageUrl: newUrl, prompt: finalPrompt };
      const { data } = await supabaseService.saveAsset(userId, updated);
      if (data) onSave(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAll = async () => {
    setIsProcessing(true);
    try {
      const updated = { ...asset, copy, prompt };
      const { data, error } = await supabaseService.saveAsset(userId, updated);
      if (error) throw error;
      if (data) onSave(data);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar alterações.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-neutral-950 border-l border-white/10 z-[110] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      <header className="p-6 border-b border-white/5 flex items-center justify-between bg-neutral-900/50">
        <div>
          <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Editor de Ativo</h2>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Nível Boutique omneky</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/5 text-neutral-500 hover:text-white transition-all text-xl">×</button>
      </header>

      <div className="flex bg-black border-b border-white/5">
        {(['copy', 'image', 'composition'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-neutral-600 hover:text-neutral-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
        {activeTab === 'copy' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Headline & Body</label>
              <textarea
                value={copy}
                onChange={e => setCopy(e.target.value)}
                className="w-full h-48 bg-neutral-900 border border-white/5 rounded-2xl p-6 text-sm text-neutral-300 focus:border-indigo-500 transition-all outline-none leading-relaxed"
              />
            </div>
            <button 
              onClick={handleRegenerateCopy}
              disabled={isProcessing}
              className="w-full py-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
            >
              {isProcessing ? 'REGENERANDO...' : 'Sugerir Novo Copy IA'}
            </button>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="aspect-square rounded-3xl overflow-hidden border border-white/5 bg-black relative group">
              <img src={asset.imageUrl} className="w-full h-full object-cover" />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Visual Prompt DNA</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full h-32 bg-neutral-900 border border-white/5 rounded-2xl p-6 text-xs text-neutral-400 focus:border-indigo-500 transition-all outline-none font-mono"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Intensidade Criativa</label>
                <span className="text-[10px] font-black text-indigo-400 uppercase">{intensity < 30 ? 'Conservador' : intensity > 70 ? 'Experimental' : 'Equilibrado'}</span>
              </div>
              <input 
                type="range" min="0" max="100" value={intensity} onChange={e => setIntensity(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <button 
              onClick={handleRegenerateImage}
              disabled={isProcessing}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all active:scale-95"
            >
              Regenerar Imagem
            </button>
          </div>
        )}

        {activeTab === 'composition' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="aspect-square rounded-3xl overflow-hidden border border-white/5 bg-black">
              <img src={composedPreview || asset.imageUrl} className="w-full h-full object-cover" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Posição Logo</label>
                <select 
                  value={logoOptions.position}
                  onChange={e => setLogoOptions({...logoOptions, position: e.target.value as any})}
                  className="w-full bg-neutral-900 border border-white/5 rounded-xl py-3 px-4 text-[10px] font-black uppercase text-white outline-none"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="center">Center</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Escala</label>
                <input 
                  type="range" min="0.1" max="0.4" step="0.01" 
                  value={logoOptions.scale} 
                  onChange={e => setLogoOptions({...logoOptions, scale: Number(e.target.value)})}
                  className="w-full h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Opacidade</label>
              <input 
                type="range" min="0.3" max="1" step="0.05" 
                value={logoOptions.opacity} 
                onChange={e => setLogoOptions({...logoOptions, opacity: Number(e.target.value)})}
                className="w-full"
              />
            </div>

            <button 
              onClick={() => {
                const link = document.createElement('a');
                link.href = composedPreview || '';
                link.download = `${asset.name}_composed.png`;
                link.click();
              }}
              className="w-full py-5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 hover:text-white transition-all"
            >
              Exportar PNG com Logo
            </button>
          </div>
        )}
      </div>

      <footer className="p-6 border-t border-white/5 bg-neutral-900/50 flex gap-4">
        <button 
          onClick={handleSaveAll}
          disabled={isProcessing}
          className="flex-1 py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
        >
          Salvar Alterações
        </button>
      </footer>
    </div>
  );
};

export default AssetEditor;
