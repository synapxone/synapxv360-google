
import { Message, CampaignState, UserProfile, Language, DesignAsset, Brand, IdeaOption } from './types';
import { gemini } from './services/geminiService';
import { supabase, supabaseService } from './services/supabaseService';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Workspace from './components/Workspace';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import BrandManager from './components/BrandManager';
import BrandOnboarding from './components/BrandOnboarding';

export type LoadingStage = 'idle' | 'thinking' | 'briefing' | 'generating' | 'syncing';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'landing' | 'app' | 'auth'>('landing');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>('pt');
  const [state, setState] = useState<CampaignState>({ brands: [], activeBrandId: null, assets: [], brief: null });
  
  // Refatorado: mensagens por marca
  const [messagesByBrand, setMessagesByBrand] = useState<Record<string, Message[]>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('idle');
  const [activeTab, setActiveTab] = useState<'chat' | 'workspace' | 'brand'>('chat');
  const [assetQuantity, setAssetQuantity] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  
  const [isNewBrandModalOpen, setIsNewBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  
  const [onboardingBrand, setOnboardingBrand] = useState<Brand | null>(null);

  const requestCounter = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Helper para acessar mensagens da marca ativa
  const currentBrandMessages = state.activeBrandId 
    ? (messagesByBrand[state.activeBrandId] || []) 
    : [];

  const setCurrentMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    if (!state.activeBrandId) return;
    const brandId = state.activeBrandId;
    setMessagesByBrand(prev => ({
      ...prev,
      [brandId]: typeof updater === 'function' 
        ? updater(prev[brandId] || []) 
        : updater
    }));
  };

  // Função auxiliar para fundir assets do DB com legado sem duplicatas
  const mergeAssets = (dbAssets: DesignAsset[], legacyAssets: DesignAsset[]) => {
    return [...dbAssets, ...legacyAssets];
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession) {
        const [profile, brands, assets, project] = await Promise.all([
          supabaseService.getProfile(initialSession.user.id),
          supabaseService.getBrands(initialSession.user.id),
          supabaseService.getAssets(initialSession.user.id),
          supabase.from('projects').select('*').eq('user_id', initialSession.user.id).maybeSingle()
        ]);

        if (profile) {
          setUserProfile(profile);

          const legacyBrands = (project?.data?.state_data?.brands || []) as Brand[];
          const finalBrands = brands.length > 0 ? brands : legacyBrands;

          const savedActiveBrandId = project?.data?.state_data?.activeBrandId;
          const finalActiveBrandId = finalBrands.some(b => b.id === savedActiveBrandId)
            ? savedActiveBrandId
            : (finalBrands[0]?.id || null);

          const legacyAssets = (project?.data?.state_data?.assets || []) as DesignAsset[];
          const finalAssets = mergeAssets(assets, legacyAssets);

          setState({ 
            brands: finalBrands, 
            activeBrandId: finalActiveBrandId, 
            assets: finalAssets, 
            brief: project?.data?.state_data?.brief || null 
          });

          // Carregar histórico no mapa por marca
          const savedBrandId = finalActiveBrandId;
          if (savedBrandId && project?.data?.message_history) {
            setMessagesByBrand(prev => ({
              ...prev,
              [savedBrandId]: project.data.message_history.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp)
              }))
            }));
          }
          setViewMode('app');
        }
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession) {
        const [profile, brands, assets, project] = await Promise.all([
          supabaseService.getProfile(newSession.user.id),
          supabaseService.getBrands(newSession.user.id),
          supabaseService.getAssets(newSession.user.id),
          supabase.from('projects').select('*').eq('user_id', newSession.user.id).maybeSingle()
        ]);

        if (profile) {
          setUserProfile(profile);

          const legacyBrands = (project?.data?.state_data?.brands || []) as Brand[];
          const finalBrands = brands.length > 0 ? brands : legacyBrands;

          const savedActiveBrandId = project?.data?.state_data?.activeBrandId;
          const finalActiveBrandId = finalBrands.some(b => b.id === savedActiveBrandId)
            ? savedActiveBrandId
            : (finalBrands[0]?.id || null);

          const legacyAssets = (project?.data?.state_data?.assets || []) as DesignAsset[];
          const finalAssets = mergeAssets(assets, legacyAssets);

          setState({ 
            brands: finalBrands, 
            activeBrandId: finalActiveBrandId, 
            assets: finalAssets, 
            brief: project?.data?.state_data?.brief || null 
          });

          // Carregar histórico no mapa por marca
          const savedBrandId = finalActiveBrandId;
          if (savedBrandId && project?.data?.message_history) {
            setMessagesByBrand(prev => ({
              ...prev,
              [savedBrandId]: project.data.message_history.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp)
              }))
            }));
          }
          setViewMode('app');
        }
      } else {
        setViewMode('landing');
        setUserProfile(null);
        setState({ brands: [], activeBrandId: null, assets: [], brief: null });
        setMessagesByBrand({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdateBrand = async (brand: Brand) => {
    if (!userProfile) return;
    try {
      const { data, error } = await supabaseService.saveBrand(userProfile.id, brand);
      if (error) {
        console.error("Save brand error:", error);
        alert(`Erro ao salvar marca: ${error.message}. Verifique se a tabela 'brands' existe no Supabase.`);
        return;
      }
      if (data) {
        // Se é uma nova marca, disparar onboarding em vez de ir direto ao app
        const isNewBrand = !brand.kit || !brand.kit.concept;
        if (isNewBrand && data) {
          setOnboardingBrand(data);
          return; // Não continua o fluxo normal — onboarding vai completar
        }

        setState(prev => {
          const isMigration = brand.id !== data.id;
          const filteredBrands = prev.brands.filter(br => br.id !== data.id && br.id !== brand.id);
          
          let updatedAssets = prev.assets;
          if (isMigration) {
            updatedAssets = prev.assets.map(a => 
              a.brand_id === brand.id ? { ...a, brand_id: data.id } : a
            );
            updatedAssets.forEach(async (asset) => {
              if (asset.brand_id === data.id) {
                 await supabaseService.saveAsset(userProfile.id, asset);
              }
            });
            
            // Migrar mensagens também
            setMessagesByBrand(prevMsgs => {
              const msgs = prevMsgs[brand.id] || [];
              const newMap = { ...prevMsgs };
              delete newMap[brand.id];
              newMap[data.id] = msgs;
              return newMap;
            });
          }

          return { 
            ...prev, 
            brands: [data, ...filteredBrands], 
            activeBrandId: data.id,
            assets: updatedAssets
          };
        });
      }
    } catch (err: any) {
      console.error("Critical handleUpdateBrand error:", err);
      alert(`Erro crítico: ${err.message}`);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!window.confirm("Deseja deletar esta marca?")) return;
    await supabaseService.deleteBrand(id);
    
    setState(prev => {
      const newBrands = prev.brands.filter(b => b.id !== id);
      return { 
        ...prev, 
        brands: newBrands, 
        activeBrandId: prev.activeBrandId === id ? (newBrands[0]?.id || null) : prev.activeBrandId 
      };
    });
    
    setMessagesByBrand(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
  };

  const handleSendMessage = useCallback(async (content: string, image?: string, targetGroupId?: string) => {
    if (!userProfile) return;
    const currentRequestId = ++requestCounter.current;
    setIsMobileMenuOpen(false);
    
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
    
    setCurrentMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setLoadingStage('thinking');

    try {
      const { text, sources } = await gemini.chat(content, image || null, currentBrandMessages, state, language);
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

      setCurrentMessages(prev => [...prev, assistantMsg]);

      // Detectar json-brief com fallback robusto
      const briefMatch = text.match(/```json-brief\n([\s\S]*?)\n```/);
      let brief: any = null;
      const activeBrand = state.brands.find(b => b.id === state.activeBrandId);

      if (briefMatch) {
        try {
          brief = JSON.parse(briefMatch[1]);
        } catch(e) {
          console.warn('json-brief parse error, trying fallback');
          brief = {
            specialist_type: 'social',
            objective: content,
            audience: activeBrand?.kit?.concept || 'público geral',
            visual_tone: activeBrand?.kit?.tone?.join(', ') || 'profissional',
            format: content.toLowerCase().includes('storie') ? 'stories' : 'feed',
            quantity: 3
          };
        }
      }

      if (brief) {
        if (currentRequestId !== requestCounter.current) return;
        setLoadingStage('briefing');
        
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
          const folderTitle = state.assets.find(a => a.group_id === groupId)?.group_title || content;

          for (let i = 0; i < assetQuantity; i++) {
            for (const base of baseAssets) {
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
                status: 'pending',
                metadata: url?.metadata
              };

              const { data: saved } = await supabaseService.saveAsset(userProfile.id, asset);
              if (saved) {
                newAssets.push(saved);
                assetIds.push(saved.id);
              }
            }
          }
          setState(prev => ({ ...prev, assets: [...newAssets, ...prev.assets] }));
          setCurrentMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, attachedAssetIds: assetIds } : m));
        }
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      if (currentRequestId === requestCounter.current) {
        setIsLoading(false); 
        setLoadingStage('idle'); 
      }
    }
  }, [userProfile, state, messagesByBrand, language, assetQuantity, activeGroupId]);

  const handleAssetStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected') {
      if (!window.confirm("Deseja deletar permanentemente este ativo?")) return;
      await supabaseService.deleteAsset(id);
      setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
      setCurrentMessages(prev => prev.map(m => ({ ...m, attachedAssetIds: m.attachedAssetIds?.filter(aid => aid !== id) })));
    } else {
      const asset = state.assets.find(a => a.id === id);
      if (asset) {
        const newAsset = { ...asset, status };
        await supabaseService.saveAsset(userProfile!.id, newAsset);
        setState(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? newAsset : a) }));
      }
    }
  };

  const handleExtendVideo = async (asset: DesignAsset, prompt: string) => {
    if (!userProfile || !asset.metadata) return;
    setIsLoading(true);
    setLoadingStage('generating');
    try {
      const url: any = await gemini.extendVideo(asset.metadata, prompt);
      if (url) {
        const newAsset: DesignAsset = {
          ...asset,
          id: Math.random().toString(36).substr(2, 9),
          name: `${asset.name} (Extended)`,
          videoUrl: url.url,
          metadata: url.metadata,
          created_at: new Date().toISOString()
        };
        const { data: saved } = await supabaseService.saveAsset(userProfile.id, newAsset);
        if (saved) {
          setState(prev => ({ ...prev, assets: [saved, ...prev.assets] }));
        }
      }
    } finally {
      setIsLoading(false);
      setLoadingStage('idle');
    }
  };

  const handleDeleteFolder = async (groupId: string) => {
    if (!window.confirm("Deseja deletar permanentemente toda esta pasta e seus ativos?")) return;
    await supabaseService.deleteAssetsByGroup(groupId);
    setState(prev => ({ ...prev, assets: prev.assets.filter(a => a.group_id !== groupId) }));
    setCurrentMessages(prev => prev.map(m => ({ ...m, attachedAssetIds: m.attachedAssetIds?.filter(aid => {
      const asset = state.assets.find(a => a.id === aid);
      return asset?.group_id !== groupId;
    }) })));
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
    setActiveGroupId(groupId);
    handleSendMessage(`Vamos retomar o projeto na pasta "${title}". Qual o próximo passo?`, undefined, groupId);
  };

  if (viewMode === 'landing') return <LandingPage onStart={() => setViewMode('auth')} language={language} setLanguage={setLanguage} />;
  if (viewMode === 'auth') return <Auth language={language} />;

  const activeBrand = state.brands.find(b => b.id === state.activeBrandId);

  return (
    <div className="flex h-screen bg-black overflow-hidden text-neutral-300">
      <Sidebar 
        state={state} 
        onSendMessage={handleSendMessage} 
        onUpdateBrand={handleUpdateBrand} 
        onDeleteBrand={handleDeleteBrand}
        onNewBrand={() => setIsNewBrandModalOpen(true)}
        onEditBrand={(brand) => setEditingBrand(brand)}
        onSwitchBrand={(id) => {
          setState(p => ({ ...p, activeBrandId: id }));
          setActiveGroupId(null);
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
              <button onClick={() => setActiveTab('brand')} className={`px-4 sm:px-6 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'brand' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500'}`}>Brand</button>
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
              messages={currentBrandMessages} 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading} 
              loadingStage={loadingStage} 
              language={language}
              allAssets={state.assets}
              onAssetAction={handleAssetStatus}
              activeBrand={activeBrand}
            />
          ) : activeTab === 'workspace' ? (
            <Workspace 
              state={state} 
              language={language} 
              onUpdateBrand={handleUpdateBrand} 
              onDeleteBrand={handleDeleteBrand} 
              onUpdateAssets={(assets) => setState(p => ({ ...p, assets }))}
              onSendMessage={handleRetakeConversation}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              onAssetAction={handleAssetStatus}
              onExtendVideo={handleExtendVideo}
            />
          ) : (
            <div className="h-full bg-black overflow-hidden">
              <BrandManager 
                key={state.activeBrandId}
                brand={activeBrand} 
                language={language} 
                onSave={handleUpdateBrand} 
                onDelete={handleDeleteBrand}
                isEmbedded={true}
              />
            </div>
          )}
        </div>
      </main>
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Modal de Nova Marca ou Edição — renderizado no nível raiz para cobrir tela toda */}
      {(isNewBrandModalOpen || editingBrand) && (
        <BrandManager
          brand={editingBrand || undefined}
          language={language}
          onSave={async (b) => {
            await handleUpdateBrand(b);
            setIsNewBrandModalOpen(false);
            setEditingBrand(null);
          }}
          onClose={() => {
            setIsNewBrandModalOpen(false);
            setEditingBrand(null);
          }}
          onDelete={async (id) => {
            await handleDeleteBrand(id);
            setIsNewBrandModalOpen(false);
            setEditingBrand(null);
          }}
        />
      )}

      {/* Onboarding de nova marca */}
      {onboardingBrand && (
        <BrandOnboarding
          brand={onboardingBrand}
          language={language}
          onComplete={async (updatedBrand) => {
            setOnboardingBrand(null);
            await handleUpdateBrand(updatedBrand);
            setState(p => ({ ...p, activeBrandId: updatedBrand.id }));
          }}
          onSkip={() => {
            setOnboardingBrand(null);
            if (onboardingBrand) {
              setState(p => ({ ...p, activeBrandId: onboardingBrand.id }));
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
