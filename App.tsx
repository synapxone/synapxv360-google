
import { Message, CampaignState, UserProfile, Language, DesignAsset, Brand, IdeaOption } from './types';
import { gemini } from './services/geminiService';
import { supabase, supabaseService } from './services/supabaseService';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Workspace from './components/Workspace';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';

export type LoadingStage = 'idle' | 'thinking' | 'briefing' | 'generating' | 'syncing';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'landing' | 'app' | 'auth'>('landing');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>('pt');
  const [state, setState] = useState<CampaignState>({ brands: [], activeBrandId: null, assets: [], brief: null });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle');
  const [activeTab, setActiveTab] = useState<'chat' | 'workspace'>('chat');
  const [assetQuantity, setAssetQuantity] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Contador para interromper processos antigos se uma nova mensagem for enviada
  const requestCounter = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const profile = await supabaseService.getProfile(session.user.id);
        setUserProfile(profile);
        const brands = await supabaseService.getBrands(session.user.id);
        const assets = await supabaseService.getAssets(session.user.id);
        setState(prev => ({ ...prev, brands, assets, activeBrandId: brands[0]?.id || null }));
        setViewMode('app');
      } else {
        setViewMode('landing');
      }
    });
  }, []);

  const handleSendMessage = useCallback(async (content: string, image?: string, targetGroupId?: string) => {
    if (!userProfile) return;
    
    // Incrementa o contador para invalidar processos assíncronos em andamento
    const currentRequestId = ++requestCounter.current;
    
    setIsMobileMenuOpen(false);
    
    // Define o ID do grupo (pasta): 
    // 1. Se veio do Workspace (targetGroupId), usa ele.
    // 2. Se já estamos em uma conversa ativa (activeGroupId), mantém.
    // 3. Caso contrário, cria um novo (nova pasta).
    const groupId = targetGroupId || activeGroupId || Date.now().toString();
    setActiveGroupId(groupId);

    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content, 
      timestamp: new Date(), 
      referenceImage: image,
      metadata: { groupId } 
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setLoadingStage('thinking');

    try {
      const { text, sources } = await gemini.chat(content, image || null, messages, state, language);
      
      // Se uma nova mensagem foi enviada enquanto o Gemini pensava, interrompe aqui.
      if (currentRequestId !== requestCounter.current) return;

      let ideas: IdeaOption[] | undefined;
      const ideaMatch = text.match(/```json-ideas\n([\s\S]*?)\n```/);
      if (ideaMatch) ideas = JSON.parse(ideaMatch[1]);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text.replace(/```json-(ideas|brief)[\s\S]*?```/g, '').trim(),
        timestamp: new Date(),
        groundingSources: sources,
        ideas
      };

      setMessages(prev => [...prev, assistantMsg]);

      const briefMatch = text.match(/```json-brief\n([\s\S]*?)\n```/);
      if (briefMatch) {
        if (currentRequestId !== requestCounter.current) return;
        setLoadingStage('briefing');
        
        const brief = JSON.parse(briefMatch[1]);
        const activeBrand = state.brands.find(b => b.id === state.activeBrandId);
        const brandCtx = activeBrand ? { colors: activeBrand.kit?.colors, tone: activeBrand.kit?.tone } : {};
        
        const specialistRaw = await gemini.runSpecialist(brief, brandCtx);
        const assetsMatch = specialistRaw.match(/```json-assets\n([\s\S]*?)\n```/);
        
        if (assetsMatch) {
          if (currentRequestId !== requestCounter.current) return;
          setLoadingStage('generating');
          
          const rawAssets = JSON.parse(assetsMatch[1]);
          const baseAssets = Array.isArray(rawAssets) ? rawAssets : [rawAssets];
          const newAssets: DesignAsset[] = [];
          const assetIds: string[] = [];

          // Mantém o título original da pasta se ela já existir
          const existingAssetInGroup = state.assets.find(a => a.group_id === groupId);
          const folderTitle = existingAssetInGroup?.group_title || content;

          for (let i = 0; i < assetQuantity; i++) {
            for (const base of baseAssets) {
              // Verifica a cada iteração de geração se o processo deve continuar
              if (currentRequestId !== requestCounter.current) return;
              
              let url: any;
              if (brief.specialist_type === 'video') url = await gemini.generateVideo(base.prompt);
              else if (brief.specialist_type === 'music') url = await gemini.generateAudio(base.copy || base.prompt);
              else url = await gemini.generateImage(base.prompt, JSON.stringify(brandCtx.colors));

              const asset: DesignAsset = {
                id: Math.random().toString(36).substr(2, 9),
                brand_id: state.activeBrandId || '',
                group_id: groupId,
                group_title: folderTitle,
                name: `${base.name} ${i + 1}`,
                type: base.type || brief.specialist_type,
                dimensions: base.dimensions || '1080x1080',
                imageUrl: typeof url === 'string' ? url : url?.url,
                videoUrl: url?.metadata ? url.url : undefined,
                audioUrl: brief.specialist_type === 'music' ? url : undefined,
                prompt: base.prompt,
                copy: base.copy,
                description: base.description || '',
                status: 'pending'
              };

              const { data: saved } = await supabaseService.saveAsset(userProfile.id, asset);
              if (saved) {
                newAssets.push({ ...asset, id: saved.id });
                assetIds.push(saved.id);
              }
            }
          }
          setState(prev => ({ ...prev, assets: [...newAssets, ...prev.assets] }));
          setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, attachedAssetIds: assetIds } : m));
        }
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      // Só limpa o loading se esta for a última requisição enviada
      if (currentRequestId === requestCounter.current) {
        setIsLoading(false); 
        setLoadingStage('idle'); 
      }
    }
  }, [userProfile, state, messages, language, assetQuantity, activeGroupId]);

  const handleAssetStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected') {
      if (!window.confirm("Deseja deletar permanentemente este ativo?")) return;
      await supabaseService.deleteAsset(id);
      setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
      setMessages(prev => prev.map(m => ({ ...m, attachedAssetIds: m.attachedAssetIds?.filter(aid => aid !== id) })));
    } else {
      const asset = state.assets.find(a => a.id === id);
      if (asset) {
        const newAsset = { ...asset, status };
        await supabaseService.saveAsset(userProfile!.id, newAsset);
        setState(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? newAsset : a) }));
      }
    }
  };

  const handleRenameFolder = async (groupId: string, newTitle: string) => {
    await supabaseService.updateGroupTitle(groupId, newTitle);
    setState(prev => ({
      ...prev,
      assets: prev.assets.map(a => a.group_id === groupId ? { ...a, group_title: newTitle } : a)
    }));
  };

  const handleRetakeConversation = (groupId: string, title: string) => {
    setActiveTab('chat');
    setActiveGroupId(groupId); // Garante que novas mensagens caiam na mesma pasta
    handleSendMessage(`Vamos retomar o projeto na pasta "${title}". Qual o próximo passo?`, undefined, groupId);
  };

  if (viewMode === 'landing') return <LandingPage onStart={() => setViewMode('auth')} language={language} setLanguage={setLanguage} />;
  if (viewMode === 'auth') return <Auth language={language} />;

  return (
    <div className="flex h-screen bg-black overflow-hidden text-neutral-300">
      <Sidebar 
        state={state} 
        onSendMessage={handleSendMessage} 
        onUpdateBrand={async (b) => {
          const { data } = await supabaseService.saveBrand(userProfile!.id, b);
          if (data) setState(prev => ({ ...prev, brands: [data, ...prev.brands.filter(br => br.id !== data.id)], activeBrandId: data.id }));
        }} 
        onDeleteBrand={async (id) => {
          await supabaseService.deleteBrand(id);
          setState(prev => ({ ...prev, brands: prev.brands.filter(b => b.id !== id), activeBrandId: null }));
        }}
        onSwitchBrand={(id) => {
          setState(p => ({ ...p, activeBrandId: id }));
          setActiveGroupId(null); // Reseta a pasta ativa ao trocar de marca para evitar confusão
        }}
        language={language} 
        setLanguage={setLanguage} 
        isMobileOpen={isMobileMenuOpen} 
        onClear={() => {}}
      />
      
      <main className="flex-1 flex flex-col bg-neutral-950 min-w-0">
        <header className="h-16 border-b border-neutral-900 flex items-center justify-between px-6 bg-neutral-900/40 backdrop-blur-xl shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 bg-neutral-800 rounded-xl text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
              <button onClick={() => setActiveTab('chat')} className={`px-4 sm:px-6 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500'}`}>Chat</button>
              <button onClick={() => setActiveTab('workspace')} className={`px-4 sm:px-6 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'workspace' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500'}`}>Biblioteca</button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-white/5 rounded-xl">
               <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Lote:</span>
               <select value={assetQuantity} onChange={e => setAssetQuantity(Number(e.target.value))} className="bg-transparent text-[10px] font-black text-indigo-400 outline-none cursor-pointer">
                 {[1, 2, 3, 4].map(n => <option key={n} value={n} className="bg-neutral-900">{n}</option>)}
               </select>
            </div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-3 py-1.5 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
              {userProfile?.credits_remaining} CRD
            </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {activeTab === 'chat' ? (
            <ChatArea 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading} 
              loadingStage={loadingStage} 
              language={language}
              allAssets={state.assets}
              onAssetAction={handleAssetStatus}
            />
          ) : (
            <Workspace 
              state={state} 
              language={language} 
              onUpdateBrand={async (b) => {}} 
              onDeleteBrand={() => {}} 
              onUpdateAssets={(assets) => setState(p => ({ ...p, assets }))}
              onSendMessage={handleRetakeConversation}
              onRenameFolder={handleRenameFolder}
              onAssetAction={handleAssetStatus}
              onExtendVideo={() => {}}
            />
          )}
        </div>
      </main>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
};

export default App;
