
import React, { useState } from 'react';
import { DesignAsset, Brand, Language } from '../types';

interface AdsPreviewProps {
  asset: DesignAsset;
  brand: Brand;
  language: Language;
  onClose: () => void;
}

type Platform = 'instagram' | 'linkedin' | 'facebook';
type Placement = 'feed' | 'story';

const AdsPreview: React.FC<AdsPreviewProps> = ({ asset, brand, language, onClose }) => {
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [placement, setPlacement] = useState<Placement>(asset.dimensions === '1080x1920' || asset.type.includes('9:16') ? 'story' : 'feed');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const t = {
    pt: {
      sponsored: "Patrocinado",
      learnMore: "Saiba Mais",
      like: "Curtir",
      comment: "Comentar",
      share: "Compartilhar",
      promoted: "Promovido"
    },
    en: {
      sponsored: "Sponsored",
      learnMore: "Learn More",
      like: "Like",
      comment: "Comment",
      share: "Share",
      promoted: "Promoted"
    }
  }[language === 'es' ? 'en' : language];

  const renderInstagramFeed = () => (
    <div className={`w-full max-w-[400px] rounded-xl overflow-hidden shadow-2xl ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'} border ${isDarkMode ? 'border-white/10' : 'border-neutral-200'}`}>
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800">
            {brand.kit?.logoUrl ? <img src={brand.kit.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-indigo-600">S</div>}
          </div>
          <div>
            <p className="text-[11px] font-bold leading-none">{brand.name.toLowerCase().replace(/\s+/g, '_')}</p>
            <p className="text-[9px] mt-1 opacity-60">{t.sponsored}</p>
          </div>
        </div>
        <button className="text-xl">•••</button>
      </div>
      <div className="aspect-square bg-neutral-900 overflow-hidden">
        {asset.videoUrl ? <video src={asset.videoUrl} autoPlay muted loop className="w-full h-full object-cover" /> : <img src={asset.imageUrl} className="w-full h-full object-cover" />}
      </div>
      <div className="p-3">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <span>❤️</span> <span>💬</span> <span>✈️</span>
          </div>
          <span>🔖</span>
        </div>
        <div className="bg-indigo-600/10 -mx-3 px-3 py-2 flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-indigo-400">{t.learnMore}</span>
          <span className="text-xs">›</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          <span className="font-bold mr-2">{brand.name.toLowerCase().replace(/\s+/g, '_')}</span>
          {asset.copy || "Experience the future of branding with our latest creative solutions."}
        </p>
      </div>
    </div>
  );

  const renderInstagramStory = () => (
    <div className="relative w-[300px] h-[600px] rounded-[40px] border-[8px] border-neutral-800 shadow-2xl overflow-hidden bg-black group">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-800 rounded-b-2xl z-20"></div>
      
      {/* Media */}
      <div className="absolute inset-0">
        {asset.videoUrl ? <video src={asset.videoUrl} autoPlay muted loop className="w-full h-full object-cover" /> : <img src={asset.imageUrl} className="w-full h-full object-cover" />}
      </div>

      {/* Interface Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 p-5 flex flex-col justify-between z-10">
        <div className="flex items-center gap-3 mt-4">
          <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden">
            {brand.kit?.logoUrl ? <img src={brand.kit.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-600" />}
          </div>
          <div>
            <p className="text-xs font-bold text-white shadow-sm">{brand.name}</p>
            <p className="text-[9px] text-white/80">{t.sponsored}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="flex flex-col items-center animate-bounce">
             <span className="text-white text-xs">^</span>
             <span className="text-white text-xs">^</span>
          </div>
          <button className="w-full py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white text-[10px] font-black uppercase tracking-widest">
            {t.learnMore}
          </button>
        </div>
      </div>
    </div>
  );

  const renderLinkedIn = () => (
    <div className={`w-full max-w-[500px] p-5 rounded-xl shadow-xl ${isDarkMode ? 'bg-[#1b1f23] text-white' : 'bg-white text-black'} border ${isDarkMode ? 'border-white/5' : 'border-neutral-200'}`}>
      <div className="flex justify-between mb-4">
        <div className="flex gap-3">
          <div className="w-12 h-12 bg-white rounded overflow-hidden p-1">
             {brand.kit?.logoUrl ? <img src={brand.kit.logoUrl} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-indigo-600" />}
          </div>
          <div>
            <h4 className="font-bold text-sm">{brand.name}</h4>
            <p className="text-[10px] opacity-60">12,450 followers</p>
            <p className="text-[10px] opacity-60 flex items-center gap-1">{t.promoted} • 🌐</p>
          </div>
        </div>
        <button className="text-indigo-400 font-bold text-xs">+ Follow</button>
      </div>
      <p className="text-xs leading-relaxed mb-4">{asset.copy || "Elevate your professional presence with our strategic design framework."}</p>
      <div className="rounded-lg overflow-hidden border border-white/5 bg-black mb-4">
        {asset.videoUrl ? <video src={asset.videoUrl} autoPlay muted loop className="w-full h-full" /> : <img src={asset.imageUrl} className="w-full h-full" />}
        <div className="p-3 bg-neutral-900 flex justify-between items-center border-t border-white/5">
           <div>
             <p className="text-xs font-bold text-white">{brand.name} | Future-Proof Strategy</p>
             <p className="text-[10px] text-neutral-500">synapx.agency</p>
           </div>
           <button className="px-4 py-2 border border-indigo-400 text-indigo-400 rounded-full text-[10px] font-bold uppercase">{t.learnMore}</button>
        </div>
      </div>
      <div className="flex gap-6 text-[11px] font-bold opacity-60">
        <span>👍 {t.like}</span>
        <span>💬 {t.comment}</span>
        <span>🔁 {t.share}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute top-8 right-8 flex gap-4 z-50">
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all border border-white/10"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        <button 
          onClick={onClose}
          className="p-3 bg-white/5 hover:bg-red-500 rounded-full text-white transition-all border border-white/10"
        >
          ✕
        </button>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 items-center">
        {/* Controls */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-display font-black text-white tracking-tighter uppercase italic">Ads Preview</h2>
            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] mt-2">Simulação de Performance Real</p>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Plataforma</label>
             <div className="grid grid-cols-1 gap-2">
               {(['instagram', 'linkedin', 'facebook'] as Platform[]).map(p => (
                 <button 
                   key={p} onClick={() => setPlatform(p)}
                   className={`w-full p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left border transition-all ${platform === p ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-neutral-900 border-white/5 text-neutral-500'}`}
                 >
                   {p}
                 </button>
               ))}
             </div>
          </div>

          {platform === 'instagram' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Posicionamento</label>
              <div className="flex gap-2">
                {(['feed', 'story'] as Placement[]).map(p => (
                  <button 
                    key={p} onClick={() => setPlacement(p)}
                    className={`flex-1 p-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${placement === p ? 'bg-white text-black border-white' : 'bg-neutral-900 border-white/5 text-neutral-500'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-2">💡 Dica Estratégica</p>
            <p className="text-[11px] text-neutral-500 leading-relaxed italic">
              "Para {platform}, use CTAs diretos e contraste alto no centro da imagem para aumentar o CTR em 23%."
            </p>
          </div>
        </div>

        {/* Mockup Display */}
        <div className="flex items-center justify-center min-h-[600px] animate-in zoom-in-95 duration-500">
           {platform === 'instagram' && placement === 'feed' && renderInstagramFeed()}
           {platform === 'instagram' && placement === 'story' && renderInstagramStory()}
           {platform === 'linkedin' && renderLinkedIn()}
           {platform === 'facebook' && renderInstagramFeed()} {/* Reutilizando base feed para FB */}
        </div>
      </div>
    </div>
  );
};

export default AdsPreview;
