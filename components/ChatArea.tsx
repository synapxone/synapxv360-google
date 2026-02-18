
import React, { useState, useRef, useEffect } from 'react';
import { Message, Language, DesignAsset, Brand } from '../types';
import { TEMPLATES } from '../data/templates';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string, image?: string, metadata?: any) => void;
  isLoading: boolean;
  loadingStage?: string;
  language: Language;
  allAssets?: DesignAsset[];
  onAssetAction?: (id: string, action: 'approved' | 'rejected' | 'top_performer') => void;
  activeBrand?: Brand;
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  messages, onSendMessage, isLoading, loadingStage, language, 
  allAssets = [], onAssetAction, activeBrand 
}) => {
  const [input, setInput] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { pt: "Criar post para Instagram", en: "Create Instagram post", icon: "📸" },
    { pt: "Criar carrossel", en: "Create carousel", icon: "📑" },
    { pt: "Vídeo do meu produto", en: "Product video", icon: "🎬" },
    { pt: "Post para blog", en: "Blog post", icon: "✍️" },
    { pt: "Analisar concorrentes", en: "Analyze competitors", icon: "🕵️" }
  ];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, allAssets]);

  const handleSelectTemplate = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    onSendMessage(`Criar campanha usando o template "${template?.name}" para ${activeBrand?.name}`, undefined, { template_id: templateId });
    setShowTemplates(false);
  };

  const AssetCard: React.FC<{ asset: DesignAsset }> = ({ asset }) => {
    const isTopPerformer = asset.performance?.feedback === 'top_performer';
    
    return (
      <div className="relative group rounded-2xl overflow-hidden border border-white/5 bg-neutral-900 w-48 shrink-0">
        {/* Imagem */}
        <div className="aspect-square overflow-hidden bg-neutral-800 relative">
          {asset.imageUrl ? (
            <img src={asset.imageUrl} className="w-full h-full object-cover" alt={asset.name} />
          ) : asset.videoUrl ? (
            <video src={asset.videoUrl} className="w-full h-full object-cover" muted loop />
          ) : asset.audioUrl ? (
             <div className="h-full flex items-center justify-center bg-indigo-600/10 text-4xl">🎵</div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-700 text-xs uppercase animate-pulse">Gerando...</div>
          )}
          
          {/* Badge Top Performer */}
          {isTopPerformer && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-black text-[8px] font-black rounded-full flex items-center gap-1">
              ⭐ TOP
            </div>
          )}
        </div>

        {/* Info + Botões — ABAIXO da imagem, nunca sobre ela */}
        <div className="p-3 space-y-2">
          <p className="text-[9px] font-black text-white uppercase tracking-widest truncate">{asset.name}</p>
          {asset.copy && (
            <p className="text-[8px] text-neutral-500 line-clamp-2 italic">{asset.copy}</p>
          )}
          <div className="flex gap-1 pt-1">
            <button
              onClick={() => onAssetAction?.(asset.id, 'top_performer')}
              title="Top Performer"
              className={`flex-none w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all ${
                isTopPerformer 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-neutral-800 text-neutral-500 hover:bg-yellow-500/20 hover:text-yellow-400'
              }`}
            >
              ⭐
            </button>
            <button
              onClick={() => onAssetAction?.(asset.id, 'approved')}
              title="Aprovar"
              className={`flex-1 h-7 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                asset.status === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'bg-neutral-800 text-neutral-500 hover:bg-green-500/20 hover:text-green-400'
              }`}
            >
              ✓
            </button>
            <button
              onClick={() => onAssetAction?.(asset.id, 'rejected')}
              title="Descartar"
              className="flex-none w-7 h-7 rounded-lg bg-neutral-800 text-neutral-500 hover:bg-red-500/20 hover:text-red-400 text-sm flex items-center justify-center transition-all"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-60 no-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[32px] p-6 ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-neutral-900 border border-white/5 text-neutral-200'}`}>
              <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.content}</div>
              
              {m.groundingSources && m.groundingSources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                  {m.groundingSources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] font-black text-indigo-400 hover:text-white bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10 transition-colors uppercase tracking-widest flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                      {source.title || 'Referência'}
                    </a>
                  ))}
                </div>
              )}

              {m.ideas && (
                <div className="mt-6 grid grid-cols-1 gap-3">
                  {m.ideas.map(idea => (
                    <button 
                      key={idea.id} 
                      onClick={() => onSendMessage(`Escolhi a ideia ${idea.id}: ${idea.title}. Por favor, produza agora.`)}
                      className="p-4 bg-black/40 border border-white/10 rounded-2xl hover:border-indigo-500 hover:bg-indigo-500/10 text-left transition-all group"
                    >
                      <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Caminho {idea.id}</div>
                      <div className="text-sm font-black text-white uppercase italic group-hover:text-indigo-400">{idea.title}</div>
                      <div className="text-xs text-neutral-500 mt-1">{idea.description}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Assets vinculados a esta mensagem */}
              {m.role === 'assistant' && m.attachedAssetIds && m.attachedAssetIds.length > 0 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {m.attachedAssetIds
                    .map(id => allAssets.find(a => a.id === id))
                    .filter((a): a is DesignAsset => !!a)
                    .map(asset => (
                      <AssetCard key={asset.id} asset={asset} />
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3 px-6 py-4 bg-neutral-900/60 rounded-2xl border border-white/5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">
                {loadingStage === 'thinking' && 'Analisando estratégia...'}
                {loadingStage === 'briefing' && 'Preparando brief criativo...'}
                {loadingStage === 'generating' && 'Gerando assets...'}
                {loadingStage === 'syncing' && 'Sincronizando...'}
                {(!loadingStage || loadingStage === 'idle') && 'Processando...'}
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Templates Modal Overlay */}
      {showTemplates && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-white uppercase italic">Creative Templates</h2>
            <button onClick={() => setShowTemplates(false)} className="text-2xl text-neutral-500 hover:text-white">×</button>
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 no-scrollbar">
            {TEMPLATES.map(t => (
              <button 
                key={t.id}
                onClick={() => handleSelectTemplate(t.id)}
                className="p-6 bg-neutral-900 border border-white/5 rounded-[32px] text-left hover:border-indigo-500 hover:bg-indigo-500/5 transition-all group"
              >
                <div className="text-2xl mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
                  {t.format === '1:1' ? '⬜' : t.format === '9:16' ? '📱' : '📺'}
                </div>
                <h3 className="text-sm font-black text-white uppercase mb-2">{t.name}</h3>
                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">{t.category} • {t.format}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col gap-4">
        {/* Quick Prompts */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-4xl mx-auto w-full pb-2">
          <button 
            onClick={() => setShowTemplates(true)}
            className="whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/20 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all"
          >
            <span>📐</span> Templates
          </button>
          {quickPrompts.map((p, i) => (
            <button 
              key={i} 
              onClick={() => onSendMessage(`${p[language === 'en' ? 'en' : 'pt']} para ${activeBrand?.name || 'minha marca'}`)}
              className="whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-neutral-900/50 hover:bg-indigo-600 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-all backdrop-blur-md"
            >
              <span>{p.icon}</span>
              {p[language === 'en' ? 'en' : 'pt']}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if(input.trim()) { onSendMessage(input); setInput(''); } }} className="max-w-4xl mx-auto w-full">
          <div className="relative group">
            <input 
              type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Descreva o que deseja criar..."
              className="w-full bg-neutral-900 border border-white/5 rounded-[32px] py-6 px-8 text-white focus:border-indigo-500 shadow-2xl transition-all"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-black px-6 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">GO</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
