
import React, { useState, useRef, useEffect } from 'react';
import { Message, Language } from '../types';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string, image?: string) => void;
  isLoading: boolean;
  language: Language;
}

const translations = {
  pt: {
    hero: "Qual a próxima jogada?",
    sub: "A synapx Agency monitora tendências e concorrência para moldar sua presença global.",
    input: "O que deseja criar hoje?",
    loading: "Inteligência Estratégica Ativa...",
    suggestions: "Atalhos",
    sources: "Citações & Referências",
    items: [
      { icon: '💎', label: 'Estratégia de Luxo', prompt: 'Crie um plano de posicionamento premium para minha marca focando em exclusividade.' },
      { icon: '🎞️', label: 'Script de Lançamento', prompt: 'Escreva um roteiro persuasivo para um vídeo de 30 segundos no Instagram.' },
      { icon: '🌎', label: 'Análise de Mercado', prompt: 'Pesquise tendências globais do meu setor para os próximos 6 meses.' },
    ]
  },
  en: {
    hero: "Next strategic move?",
    sub: "synapx Agency monitors trends and competition to shape your global presence.",
    input: "What are we building today?",
    loading: "Strategic Intelligence Active...",
    suggestions: "Shortcuts",
    sources: "Citations & References",
    items: [
      { icon: '💎', label: 'Luxury Strategy', prompt: 'Create a premium positioning plan for my brand focusing on exclusivity.' },
      { icon: '🎞️', label: 'Launch Script', prompt: 'Write a persuasive script for a 30-second Instagram video.' },
      { icon: '🌎', label: 'Market Analysis', prompt: 'Search for global trends in my industry for the next 6 months.' },
    ]
  }
};

const ChatArea: React.FC<ChatAreaProps> = ({ messages, onSendMessage, isLoading, language }) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language === 'es' ? 'en' : language];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImage) && !isLoading) {
      onSendMessage(input, selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      <div className="flex-1 overflow-y-auto p-8 space-y-10 pb-64 no-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-10 animate-in fade-in duration-1000">
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/10 blur-[100px] rounded-full"></div>
              <div className="relative w-24 h-24 bg-neutral-900 border border-white/5 rounded-[32px] flex items-center justify-center shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-transparent"></div>
                <div className="relative w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white italic text-2xl shadow-lg">S</div>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-5xl font-display font-black text-white tracking-tighter">{t.hero}</h2>
              <p className="text-neutral-500 text-md leading-relaxed max-w-md mx-auto">{t.sub}</p>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-500`}>
            <div className={`max-w-[80%] lg:max-w-[70%] rounded-[32px] p-6 lg:p-8 ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-2xl' : 'bg-neutral-900 border border-white/5 text-neutral-200 shadow-xl backdrop-blur-md'}`}>
              {m.referenceImage && (
                <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 max-w-[300px] shadow-2xl ring-1 ring-white/20">
                  <img src={m.referenceImage} alt="Reference" className="w-full h-auto" />
                </div>
              )}
              <div className="prose prose-invert prose-sm max-w-none">
                {m.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-3 leading-relaxed text-sm font-medium">{line}</p>
                ))}
              </div>
              
              {m.groundingSources && m.groundingSources.length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-[1px] bg-neutral-700"></span>
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{t.sources}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {m.groundingSources.map((source, idx) => (
                      <a 
                        key={idx} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-2xl text-[10px] text-neutral-400 hover:text-white hover:border-indigo-500/30 hover:bg-neutral-800 transition-all group"
                      >
                        <div className="w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                           </svg>
                        </div>
                        <span className="truncate font-bold uppercase tracking-tighter">{source.title || 'Referência Estratégica'}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-900 border border-white/5 rounded-full px-8 py-5 flex items-center gap-6 shadow-2xl backdrop-blur-md">
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse delay-75"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse delay-150"></div>
              </div>
              <span className="text-[10px] text-neutral-400 font-black uppercase tracking-[0.2em]">{t.loading}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 bg-gradient-to-t from-black via-black/95 to-transparent z-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="relative flex-1 group">
              {selectedImage && (
                <div className="absolute -top-24 left-0 p-3 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 ring-1 ring-white/20">
                  <div className="relative">
                    <img src={selectedImage} alt="Selection" className="w-16 h-16 object-cover rounded-xl" />
                    <button 
                      type="button" 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder={t.input} 
                className="w-full bg-neutral-900 border border-white/5 rounded-[32px] py-6 pl-16 pr-20 text-md text-white focus:outline-none focus:border-indigo-500 shadow-2xl transition-all placeholder:text-neutral-600 font-medium" 
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl flex items-center justify-center text-neutral-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                title="Anexar Arte/Referência"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                </svg>
              </button>
              <button 
                type="submit" 
                disabled={(!input.trim() && !selectedImage) || isLoading} 
                className="absolute right-4 top-1/2 -translate-y-1/2 px-6 h-12 bg-white hover:bg-indigo-500 text-black hover:text-white rounded-[24px] flex items-center justify-center text-[11px] font-black uppercase tracking-widest disabled:opacity-20 transition-all shadow-xl active:scale-95"
              >
                GO
              </button>
            </div>
          </form>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

          <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
            <span className="text-[9px] font-black text-neutral-700 uppercase tracking-widest mr-2 shrink-0">{t.suggestions}</span>
            <div className="flex gap-3">
              {t.items.map((item, idx) => (
                <button 
                  key={idx} 
                  onClick={() => onSendMessage(item.prompt)} 
                  disabled={isLoading} 
                  className="px-6 py-2.5 bg-neutral-900 border border-white/5 rounded-full text-[11px] text-neutral-500 font-bold hover:text-white hover:border-white/20 transition-all whitespace-nowrap active:scale-95 disabled:opacity-50"
                >
                  <span className="mr-2 text-sm">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
