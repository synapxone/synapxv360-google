
import { Message, CampaignState, UserProfile, Language, DesignAsset, Brand } from './types';
import { gemini } from './services/geminiService';
import { supabase, supabaseService } from './services/supabaseService';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Workspace from './components/Workspace';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';

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
      console.error("Sync Error:", e);
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
      const { data } = await supabaseService.saveBrand(userProfile.id, brandData);
      if (data) {
        const saved: Brand = { 
          id: data.id, 
          name: data.name, 
          website: data.website,
          instagram: data.instagram,
          visualReferences: data.visual_references,
          kit: data.brand_kit 
        };
        setState(prev => ({ 
          ...prev, 
          brands: prev.brands.some(b => b.id === saved.id) ? prev.brands.map(b => b.id === saved.id ? saved : b) : [saved, ...prev.brands],
          activeBrandId: saved.id 
        }));
      }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleUpdateAssets = async (newAssets: DesignAsset[]) => {
    if (!userProfile) return;
    setState(prev => ({ ...prev, assets: newAssets }));
    const oldAssets = stateRef.current.assets;
    const changed = newAssets.filter(na => {
      const old = oldAssets.find(oa => oa.id === na.id);
      return !old || old.status !== na.status || old.copy !== na.copy;
    });
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
      const { text, sources } = await gemini.chat(content, referenceImage || null, messagesRef.current, stateRef.current, language);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text.replace(/```json-(brand|brief|assets)[\s\S]*?```/g, '').trim(),
        timestamp: new Date(),
        groundingSources: sources
      };

      setMessages([...updatedMessages, assistantMessage]);

      const activeBrand = stateRef.current.brands.find(b => b.id === stateRef.current.activeBrandId);
      const brandContext = activeBrand ? {
        name: activeBrand.name,
        concept: activeBrand.kit?.concept,
        colors: activeBrand.kit?.colors,
        tone: activeBrand.kit?.tone?.join(', '),
        typography: activeBrand.kit?.typography
      } : { name: 'Generic', concept: 'Global Excellence', colors: {}, tone: 'Professional' };

      const briefMatch = text.match(/```json-brief\n([\s\S]*?)\n```/);
      if (briefMatch) {
        const briefData = JSON.parse(briefMatch[1]);
        const specialistOutput = await gemini.runSpecialist(briefData, brandContext);
        const assetsMatch = specialistOutput.match(/```json-assets\n([\s\S]*?)\n```/);
        
        if (assetsMatch) {
          const rawAssets = JSON.parse(assetsMatch[1]);
          const assetsArray = Array.isArray(rawAssets) ? rawAssets : [rawAssets];
          const newDesignAssets: DesignAsset[] = [];

          for (const asset of assetsArray) {
            let mediaUrl: string | null = null;
            let videoUrl: string | undefined = undefined;
            let audioUrl: string | undefined = undefined;
            let videoMeta: any = null;

            const brandColorContext = brandContext.colors ? `Colors: ${JSON.stringify(brandContext.colors)}` : '';

            if (briefData.specialist_type === 'video') {
              const res = await gemini.generateVideo(`${asset.prompt}. Paleta de cores: ${brandColorContext}`);
              if (res) {
                videoUrl = res.url;
                videoMeta = res.metadata;
              }
            } else if (briefData.specialist_type === 'music') {
              audioUrl = await gemini.generateAudio(asset.copy || asset.prompt) || undefined;
            } else if (['social', 'mockup', 'branding', 'web'].includes(briefData.specialist_type)) {
              mediaUrl = await gemini.generateImage(asset.prompt, brandColorContext, useHighEnd);
            }

            const assetObj: DesignAsset = { 
              id: Math.random().toString(36).substr(2, 9), 
              brand_id: stateRef.current.activeBrandId || '',
              group_id: userMessage.id,
              group_title: userMessage.content,
              name: asset.name || briefData.objetivo,
              type: asset.type || briefData.specialist_type,
              dimensions: asset.dimensions || '1080x1080',
              imageUrl: mediaUrl || undefined,
              videoUrl,
              audioUrl,
              prompt: asset.prompt || '',
              copy: asset.copy || briefData.copy_proposta || assistantMessage.content,
              description: asset.description || '',
              metadata: videoMeta,
              status: 'pending'
            };

            const { data: saved } = await supabaseService.saveAsset(userProfile.id, assetObj);
            if (saved) newDesignAssets.push({ ...assetObj, id: saved.id, created_at: saved.created_at });
          }

          setState(prev => ({ ...prev, assets: [...newDesignAssets, ...prev.assets] }));
          setActiveTab('workspace');
        }
      }

      persist(stateRef.current, [...updatedMessages, assistantMessage]);
      await supabaseService.updateCredits(userProfile.id, -1);
      const profile = await supabaseService.getProfile(userProfile.id);
      if (profile) setUserProfile(profile);

    } catch (e) { 
      console.error("Multi-Agent Error:", e); 
    } finally { 
      setIsLoading(false); 
    }
  }, [userProfile, language, persist, useHighEnd]);

  const handleExtendVideo = async (asset: DesignAsset, extensionPrompt: string) => {
    if (!userProfile || !asset.metadata) return;
    setIsLoading(true);
    try {
      const res = await gemini.extendVideo(extensionPrompt, asset.metadata);
      if (res) {
        const extendedAsset: DesignAsset = {
          ...asset,
          id: Math.random().toString(36).substr(2, 9),
          name: `${asset.name} (Extended)`,
          videoUrl: res.url,
          metadata: res.metadata,
          prompt: `${asset.prompt} | Extension: ${extensionPrompt}`,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        const { data: saved } = await supabaseService.saveAsset(userProfile.id, extendedAsset);
        if (saved) {
          setState(prev => ({ ...prev, assets: [extendedAsset, ...prev.assets] }));
          setActiveTab('workspace');
        }
      }
    } catch (e) {
      console.error("Video Extension Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!window.confirm(language === 'pt' ? 'Excluir?' : 'Delete?')) return;
    await supabaseService.deleteBrand(id);
    await loadUserData(userProfile!.id);
  };

  const handleSwitchBrand = (id: string) => {
    setState(p => ({...p, activeBrandId: id}));
    setIsMobileSidebarOpen(false);
    const brand = state.brands.find(b => b.id === id);
    if (brand) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Marca ativa alterada para: ${brand.name}. Carregando DNA visual...`,
        timestamp: new Date()
      }]);
    }
  };

  if (viewMode === 'landing') return <LandingPage onStart={() => setViewMode(session ? 'app' : 'auth')} language={language} setLanguage={setLanguage} />;
  if (viewMode === 'auth') return <Auth language={language} />;
  if (viewMode === 'admin' && userProfile?.role === 'superadmin') return <AdminDashboard />;

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans text-neutral-300 relative selection:bg-indigo-500/30">
      {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[45] lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} />}
      <Sidebar state={state} isMobileOpen={isMobileSidebarOpen} onClear={() => {}} onSendMessage={(c) => { handleSendMessage(c); setIsMobileSidebarOpen(false); }} onUpdateBrand={handleUpdateBrand} onDeleteBrand={handleDeleteBrand} onSwitchBrand={handleSwitchBrand} language={language} setLanguage={setLanguage} />
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
              onDeleteBrand={handleDeleteBrand}
              onUpdateAssets={handleUpdateAssets}
              onSendMessage={handleSendMessage}
              onExtendVideo={handleExtendVideo}
              onGenerateLogo={() => handleSendMessage("Como Designer Senior, crie agora o logo oficial minimalista para minha marca ativa usando o motor Imagen 4.")} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
