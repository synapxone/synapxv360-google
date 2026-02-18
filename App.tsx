
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Workspace from './components/Workspace';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import { CampaignState, Message, UserProfile, Language, DesignAsset, Brand } from './types';
import { gemini } from './services/geminiService';
import { supabase, supabaseService } from './services/supabaseService';

type ViewMode = 'landing' | 'app' | 'admin' | 'auth';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>('pt');
  const [state, setState] = useState<CampaignState>({ brands: [], activeBrandId: null, assets: [], brief: null });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'workspace'>('chat');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [useHighEnd, setUseHighEnd] = useState(true);

  const stateRef = useRef(state);
  const messagesRef = useRef(messages);

  useEffect(() => {
    stateRef.current = state;
    messagesRef.current = messages;
  }, [state, messages]);

  const checkApiKey = async () => {
    // @ts-ignore
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
  };

  const persist = useCallback(async (newState: CampaignState, newMessages: Message[]) => {
    if (!userProfile?.id) return;
    setIsSaving(true);
    try {
      await supabaseService.saveProjectState(userProfile.id, newState, newMessages);
    } catch (e) {
      console.error("Critical Sync Error:", e);
    } finally {
      setTimeout(() => setIsSaving(false), 1000);
    }
  }, [userProfile]);

  useEffect(() => {
    if (viewMode !== 'app' || !userProfile) return;
    const autoSaveInterval = setInterval(() => {
      persist(stateRef.current, messagesRef.current);
    }, 30000);
    return () => clearInterval(autoSaveInterval);
  }, [viewMode, userProfile, persist]);

  useEffect(() => {
    const init = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession) {
        setSession(initialSession);
        const profile = await supabaseService.getProfile(initialSession.user.id);
        if (profile) {
          setUserProfile(profile);
          await loadUserData(initialSession.user.id);
        }
        setViewMode('app');
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const profile = await supabaseService.getProfile(newSession.user.id);
        if (profile) {
          setUserProfile(profile);
          await loadUserData(newSession.user.id);
        }
        if (viewMode === 'auth' || viewMode === 'landing') setViewMode('app');
      } else {
        setUserProfile(null);
        setViewMode('landing');
        setState({ brands: [], activeBrandId: null, assets: [], brief: null });
        setMessages([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    const brands = await supabaseService.getBrands(userId);
    const assets = await supabaseService.getAssets(userId);
    const { data: project } = await supabase.from('projects').select('*').eq('user_id', userId).maybeSingle();
    
    const savedActiveBrandId = project?.state_data?.activeBrandId;
    const finalActiveBrandId = brands.some(b => b.id === savedActiveBrandId) ? savedActiveBrandId : (brands[0]?.id || null);
    
    setState({ brands, activeBrandId: finalActiveBrandId, assets, brief: project?.state_data?.brief || null });
    
    if (project?.message_history) {
      const parsedMessages = project.message_history.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
      setMessages(parsedMessages);
    }
  };

  const handleUpdateBrand = async (brandData: Brand) => {
    if (!userProfile) return;
    setIsSaving(true);
    try {
      const existing = stateRef.current.brands.find(b => b.id === brandData.id);
      const brandToSave = { 
        ...existing, 
        ...brandData,
        website: brandData.website !== undefined ? brandData.website : existing?.website || '',
        instagram: brandData.instagram !== undefined ? brandData.instagram : existing?.instagram || '',
        visualReferences: brandData.visualReferences || existing?.visualReferences || []
      };
      
      const { data, error } = await supabaseService.saveBrand(userProfile.id, brandToSave);
      if (data) {
        const savedBrand: Brand = {
          id: data.id,
          name: data.name,
          website: data.website,
          instagram: data.instagram,
          visualReferences: data.visual_references,
          kit: data.brand_kit
        };

        setState(prev => {
          const updatedBrands = prev.brands.some(b => b.id === savedBrand.id)
            ? prev.brands.map(b => (b.id === savedBrand.id) ? savedBrand : b)
            : [savedBrand, ...prev.brands];
          
          return { ...prev, brands: updatedBrands, activeBrandId: savedBrand.id };
        });
      }
    } catch (e) {
      console.error("Error updating brand:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAssets = async (newAssets: DesignAsset[]) => {
    if (!userProfile) return;
    
    const oldAssets = stateRef.current.assets;
    const changed = newAssets.filter(na => {
      const old = oldAssets.find(oa => oa.id === na.id);
      return !old || old.status !== na.status || old.copy !== na.copy;
    });

    setState(prev => ({ ...prev, assets: newAssets }));
    
    for (const asset of changed) {
      await supabaseService.saveAsset(userProfile.id, asset);
    }
  };

  const handleSendMessage = useCallback(async (content: string, referenceImage?: string) => {
    if (!userProfile || userProfile.credits_remaining <= 0) return;
    if (useHighEnd) await checkApiKey();

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date(), referenceImage };
    const updatedMessages = [...messagesRef.current, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const history = updatedMessages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));
      
      // AGENTE 1: Diretor de Marketing (Briefing)
      const { text, sources } = await gemini.chat(content, referenceImage || null, history, stateRef.current, language);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text.replace(/```json-(brand|brief|assets)[\s\S]*?```/g, '').trim(),
        timestamp: new Date(),
        groundingSources: sources
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // 1. Processar Brand Kit se houver
      const brandKitMatch = text.match(/```json-brand\n([\s\S]*?)\n```/);
      if (brandKitMatch) {
        try {
          const rawKit = JSON.parse(brandKitMatch[1]);
          const currentBrand = stateRef.current.brands.find(b => b.id === stateRef.current.activeBrandId);
          const brandToSave: Brand = {
            id: stateRef.current.activeBrandId || Date.now().toString(),
            name: rawKit.name || currentBrand?.name || 'Nova Marca',
            website: currentBrand?.website,
            instagram: currentBrand?.instagram,
            visualReferences: currentBrand?.visualReferences,
            kit: { ...currentBrand?.kit, ...rawKit }
          };
          await handleUpdateBrand(brandToSave);
        } catch (e) { console.error("Kit Update Error", e); }
      }

      // 2. Processar Brief e Chamar AGENTE 2 (Diretor de Arte) automaticamente
      const briefMatch = text.match(/```json-brief\n([\s\S]*?)\n```/);
      let assetsToProcess = [];

      if (briefMatch) {
        const artDirectorOutput = await gemini.artDirector(briefMatch[1]);
        const assetsMatch = artDirectorOutput.match(/```json-assets\n([\s\S]*?)\n```/);
        if (assetsMatch) {
          try {
            const rawAssets = JSON.parse(assetsMatch[1]);
            assetsToProcess = Array.isArray(rawAssets) ? rawAssets : [rawAssets];
          } catch (e) { console.error("Art Director JSON Error", e); }
        }
      } else {
        // Fallback caso o Agente 1 retorne assets diretamente (compatibilidade V362)
        const directAssetsMatch = text.match(/```json-assets\n([\s\S]*?)\n```/);
        if (directAssetsMatch) {
          try {
            const rawAssets = JSON.parse(directAssetsMatch[1]);
            assetsToProcess = Array.isArray(rawAssets) ? rawAssets : [rawAssets];
          } catch (e) { console.error("Direct Assets Error", e); }
        }
      }

      // 3. Gerar Imagens a partir dos ativos do Diretor de Arte
      if (assetsToProcess.length > 0) {
        const activeBrandId = stateRef.current.activeBrandId;
        const activeBrand = stateRef.current.brands.find(b => b.id === activeBrandId);
        const brandVisualContext = activeBrand ? `Brand: ${activeBrand.name}. Concept: ${activeBrand.kit?.concept}. Colors: ${JSON.stringify(activeBrand.kit?.colors || {})}` : 'High-end minimalist design';

        const newAssets: DesignAsset[] = [];
        for (const asset of assetsToProcess) {
          const safeName = asset.name || userMessage.content.slice(0, 20) || 'Design Variation';
          const safePrompt = asset.prompt || userMessage.content;
          
          const imageUrl = await gemini.generateImage(safePrompt, brandVisualContext, useHighEnd);

          const assetObj: DesignAsset = { 
            ...asset, 
            id: Math.random().toString(36).substr(2, 9), 
            brand_id: activeBrandId || '',
            group_id: userMessage.id,
            group_title: userMessage.content,
            name: safeName,
            type: asset.type || 'Design',
            prompt: safePrompt,
            dimensions: asset.dimensions || '1080x1080',
            imageUrl,
            status: 'pending',
            copy: asset.copy || assistantMessage.content,
            description: asset.description || ''
          };

          const { data: savedAsset } = await supabaseService.saveAsset(userProfile.id, assetObj);
          if (savedAsset) {
            newAssets.push({
              ...assetObj,
              id: savedAsset.id,
              created_at: savedAsset.created_at
            });
          }
        }

        setState(prev => ({ ...prev, assets: [...newAssets, ...prev.assets] }));
        setActiveTab('workspace');
      }

      persist(stateRef.current, finalMessages);
      await supabaseService.updateCredits(userProfile.id, -1);
      const profile = await supabaseService.getProfile(userProfile.id);
      if (profile) setUserProfile(profile);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsLoading(false); 
    }
  }, [userProfile, language, persist, useHighEnd]);

  const handleDeleteBrand = async (id: string) => {
    if (!window.confirm(language === 'pt' ? 'Excluir esta marca?' : 'Delete brand?')) return;
    try {
      await supabaseService.deleteBrand(id);
      await loadUserData(userProfile!.id);
    } catch (e) { console.error("Delete Error", e); }
  };

  if (viewMode === 'landing') return <LandingPage onStart={() => setViewMode(session ? 'app' : 'auth')} language={language} setLanguage={setLanguage} />;
  if (viewMode === 'auth') return <Auth language={language} />;
  if (viewMode === 'admin' && userProfile?.role === 'superadmin') return <AdminDashboard />;

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans text-neutral-300 relative selection:bg-indigo-500/30">
      {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[45] lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} />}
      <Sidebar state={state} isMobileOpen={isMobileSidebarOpen} onClear={() => {}} onSendMessage={(c) => { handleSendMessage(c); setIsMobileSidebarOpen(false); }} onUpdateBrand={handleUpdateBrand} onDeleteBrand={handleDeleteBrand} onSwitchBrand={(id) => { setState(p => ({...p, activeBrandId: id})); setIsMobileSidebarOpen(false); }} language={language} setLanguage={setLanguage} />
      <main className="flex-1 flex flex-col min-w-0 bg-neutral-950">
        <header className="h-16 border-b border-neutral-900 bg-neutral-900/40 backdrop-blur-2xl flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-5">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 -ml-2 text-neutral-400 lg:hidden"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
              <button onClick={() => setActiveTab('chat')} className={`text-[10px] font-black px-5 py-2 rounded-xl transition-all uppercase tracking-widest ${activeTab === 'chat' ? 'text-white bg-indigo-600 shadow-xl' : 'text-neutral-500 hover:text-neutral-300'}`}>Chat</button>
              <button onClick={() => setActiveTab('workspace')} className={`text-[10px] font-black px-5 py-2 rounded-xl transition-all uppercase tracking-widest ${activeTab === 'workspace' ? 'text-white bg-indigo-600 shadow-xl' : 'text-neutral-500 hover:text-neutral-300'}`}>Workspace</button>
            </div>
          </div>
          <div className="flex items-center gap-4 lg:gap-7">
             {isSaving && <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span><span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest italic">Syncing</span></div>}
             <div className="flex flex-col items-end text-[9px] lg:text-[10px]"><span className="text-white font-black truncate max-w-[120px] uppercase tracking-tighter italic">{userProfile?.full_name || userProfile?.email?.split('@')[0]}</span><span className="text-indigo-400 font-mono font-bold tracking-widest">{userProfile?.credits_remaining} CRD</span></div>
             <button onClick={() => supabase.auth.signOut()} className="w-10 h-10 flex items-center justify-center bg-neutral-900 border border-white/5 rounded-2xl text-neutral-500 hover:text-white transition-all shadow-xl"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
          </div>
        </header>
        <div className="flex-1 relative overflow-hidden bg-black/20">
          {activeTab === 'chat' ? (
            <ChatArea messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} language={language} />
          ) : (
            <Workspace 
              state={state} 
              language={language} 
              onUpdateBrand={handleUpdateBrand}
              onUpdateAssets={handleUpdateAssets}
              onSendMessage={handleSendMessage}
              onGenerateLogo={() => handleSendMessage("Como Designer Senior, crie agora o logo oficial minimalista para minha marca ativa usando o motor Imagen 4.")} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
