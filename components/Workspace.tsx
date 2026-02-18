
import React, { useState, useMemo } from 'react';
import { CampaignState, DesignAsset, Brand, Language } from '../types';
import { composeImageWithLogo, LogoOverlayOptions } from '../utils/imageCompose';
import { supabaseService } from '../services/supabaseService';
import AssetEditor from './AssetEditor';
import AdsPreview from './AdsPreview';

interface WorkspaceProps {
  state: CampaignState;
  onUpdateBrand: (brand: Brand) => Promise<void>;
  onDeleteBrand: (id: string) => void;
  onUpdateAssets: (assets: DesignAsset[]) => void;
  onSendMessage: (groupId: string, title: string) => void;
  onRenameFolder: (groupId: string, newTitle: string) => Promise<void>;
  onDeleteFolder: (groupId: string) => Promise<void>;
  onAssetAction: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  onExtendVideo: (asset: DesignAsset, prompt: string) => void;
  language: Language;
}

const Workspace: React.FC<WorkspaceProps> = ({ state, onUpdateAssets, onSendMessage, onRenameFolder, onDeleteFolder, onAssetAction, language }) => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingAsset, setEditingAsset] = useState<DesignAsset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<DesignAsset | null>(null);
  
  const [logoConfig, setLogoConfig] = useState<{assetId: string | null, position: LogoOverlayOptions['position']}>({
    assetId: null,
    position: 'bottom-right'
  });

  const folders = useMemo(() => {
    const groups: { [key: string]: { id: string, title: string, count: number, timestamp: number } } = {};
    
    state.assets
      .filter(a => a.brand_id === state.activeBrandId)
      .forEach(asset => {
        if (!groups[asset.group_id]) {
          groups[asset.group_id] = { 
            id: asset.group_id, 
            title: asset.group_title, 
            count: 0, 
            timestamp: asset.created_at ? new Date(asset.created_at).getTime() : 0 
          };
        }
        groups[asset.group_id].count++;
      });

    let result = Object.values(groups);

    if (searchQuery) {
      result = result.filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    const now = Date.now();
    if (dateFilter !== 'all') {
      result = result.filter(f => {
        const diff = now - f.timestamp;
        if (dateFilter === 'today') return diff < 86400000;
        if (dateFilter === 'week') return diff < 604800000;
        if (dateFilter === 'month') return diff < 2592000000;
        return true;
      });
    }

    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [state.assets, state.activeBrandId, searchQuery, dateFilter]);

  const activeAssets = state.assets.filter(a => a.brand_id === state.activeBrandId && a.group_id === selectedFolder);

  const activeBrand = state.brands.find(b => b.id === state.activeBrandId);

  const handleToggleTopPerformer = async (asset: DesignAsset) => {
    const isCurrentlyTop = asset.performance?.feedback === 'top_performer';
    const newPerformance = {
      ...asset.performance,
      feedback: isCurrentlyTop ? 'approved' : 'top_performer',
      engagement_score: isCurrentlyTop ? 50 : 95
    };
    
    await supabaseService.updateAssetPerformance(asset.id, newPerformance);
    const updatedAssets = state.assets.map(a => a.id === asset.id ? { ...a, performance: newPerformance } : a);
    onUpdateAssets(updatedAssets);
  };

  const handleDownload = async (asset: DesignAsset, withLogo: boolean = false) => {
    let url = asset.imageUrl || asset.videoUrl || '';
    
    if (withLogo && asset.imageUrl && activeBrand?.kit?.logoUrl) {
      try {
        url = await composeImageWithLogo(asset.imageUrl, activeBrand.kit.logoUrl, {
          position: logoConfig.position,
          scale: 0.18,
          opacity: 0.9,
          padding: 32
        });
      } catch (e) {
        console.error("Logo composition error", e);
      }
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = `${asset.name}${withLogo ? '_brand' : ''}.${asset.videoUrl ? 'mp4' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setLogoConfig({ assetId: null, position: 'bottom-right' });
  };

  const currentFolder = folders.find(f => f.id === selectedFolder);

  if (!selectedFolder) {
    return (
      <div className="h-full flex flex-col bg-black">
        <header className="p-8 border-b border-neutral-900 space-y-6">
          <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em]">Biblioteca de Ativos</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Buscar pasta..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-3 px-6 text-xs text-white focus:border-indigo-500 transition-all outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600">🔍</span>
            </div>
            <div className="flex bg-neutral-900 p-1 rounded-2xl border border-white/5">
              {(['all', 'today', 'week', 'month'] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${dateFilter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                >
                  {f === 'all' ? 'Tudo' : f === 'today' ? 'Hoje' : f === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map(f => (
              <div key={f.id} className="relative group">
                <button 
                  onClick={() => { setSelectedFolder(f.id); setNewFolderName(f.title); }}
                  className="w-full p-8 bg-neutral-900/40 border border-white/5 rounded-[40px] text-left hover:border-indigo-500/50 hover:bg-neutral-900 transition-all relative overflow-hidden"
                >
                  <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-xl group-hover:scale-110 transition-transform">📂</div>
                  <h3 className="text-sm font-black text-white uppercase italic truncate mb-2">{f.title}</h3>
                  <div className="flex justify-between items-center text-[10px] font-black text-neutral-600 uppercase tracking-widest">
                    <span>{f.count} Ativos</span>
                    <span className="text-indigo-500 group-hover:translate-x-1 transition-transform">Abrir →</span>
                  </div>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteFolder(f.id); }}
                  className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
            {folders.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <p className="text-neutral-600 text-[10px] uppercase font-black tracking-widest">Nenhuma pasta encontrada.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <header className="p-8 border-b border-neutral-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedFolder(null)} className="p-3 bg-neutral-900 rounded-2xl text-white hover:bg-indigo-600 transition-all">←</button>
          <div>
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="bg-neutral-900 border border-indigo-500 rounded-xl px-4 py-2 text-white font-black uppercase text-sm outline-none"
                  autoFocus
                />
                <button 
                  onClick={async () => { await onRenameFolder(selectedFolder, newFolderName); setIsRenaming(false); }}
                  className="p-2 bg-green-500 rounded-xl text-white"
                >✓</button>
                <button onClick={() => setIsRenaming(false)} className="p-2 bg-neutral-800 rounded-xl text-white">×</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">{currentFolder?.title}</h3>
                <button onClick={() => setIsRenaming(true)} className="text-neutral-600 hover:text-indigo-500 transition-colors">✏️</button>
              </div>
            )}
            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mt-1">Biblioteca ativa do projeto.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => onDeleteFolder(selectedFolder)}
            className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl"
          >
            Excluir Pasta
          </button>
          <button 
            onClick={() => onSendMessage(currentFolder!.id, currentFolder!.title)}
            className="px-6 py-3 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xl"
          >
            Retomar Conversa
          </button>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 no-scrollbar pb-32">
        {activeAssets.map(asset => (
          <div key={asset.id} className="bg-neutral-900/40 rounded-[32px] border border-white/5 overflow-hidden flex flex-col group shadow-2xl transition-all hover:bg-neutral-900 relative">
            <div className="aspect-square relative overflow-hidden bg-black">
               {asset.imageUrl && <img src={asset.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
               {asset.videoUrl && <video src={asset.videoUrl} className="w-full h-full object-cover" controls />}
               {asset.audioUrl && <div className="h-full flex items-center justify-center bg-indigo-900/10 text-4xl">🎵</div>}
               
               {/* Performance Loop Badge */}
               {asset.performance?.feedback === 'top_performer' && (
                 <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-yellow-500 text-black px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl">
                   <span>⭐</span> TOP PERFORMER
                 </div>
               )}

               <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 p-6 backdrop-blur-sm">
                  <div className="flex w-full gap-2">
                    <button onClick={() => onAssetAction(asset.id, 'approved')} className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all">Aprovar</button>
                    <button onClick={() => handleToggleTopPerformer(asset)} className={`flex-1 py-2.5 border text-[9px] font-black rounded-xl uppercase tracking-widest transition-all ${asset.performance?.feedback === 'top_performer' ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-white/10 text-white border-white/20'}`}>
                      {asset.performance?.feedback === 'top_performer' ? 'Remover Top' : '⭐ Top'}
                    </button>
                  </div>
                  
                  <div className="flex w-full gap-2">
                    <button onClick={() => setEditingAsset(asset)} className="flex-1 py-2.5 bg-indigo-600 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all">Editar</button>
                    {(asset.imageUrl || asset.videoUrl) && (
                      <button onClick={() => setPreviewAsset(asset)} className="flex-1 py-2.5 bg-white/20 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all border border-white/30 backdrop-blur-md">Ads Preview</button>
                    )}
                  </div>
                  
                  <button onClick={() => handleDownload(asset, false)} className="w-full py-2.5 bg-white text-black hover:bg-indigo-600 hover:text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all">Baixar</button>
                  <button onClick={() => onAssetAction(asset.id, 'rejected')} className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all">Excluir</button>
               </div>

               <div className="absolute top-4 right-4 z-10">
                 <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full ${asset.status === 'approved' ? 'bg-green-500 text-white' : 'bg-neutral-800/80 backdrop-blur-md text-neutral-400'}`}>
                   {asset.status}
                 </span>
               </div>
            </div>
            <div className="p-6">
              <p className="text-[11px] font-black text-white uppercase truncate">{asset.name}</p>
              <p className="text-[9px] text-neutral-500 font-mono mt-1 uppercase tracking-widest">{asset.type}</p>
            </div>
          </div>
        ))}
      </div>

      {editingAsset && activeBrand && (
        <AssetEditor 
          asset={editingAsset}
          brand={activeBrand}
          language={language}
          onClose={() => setEditingAsset(null)}
          onSave={(updated) => {
            const newAssets = state.assets.map(a => a.id === updated.id ? updated : a);
            onUpdateAssets(newAssets);
          }}
        />
      )}

      {previewAsset && activeBrand && (
        <AdsPreview 
          asset={previewAsset}
          brand={activeBrand}
          language={language}
          onClose={() => setPreviewAsset(null)}
        />
      )}
    </div>
  );
};

export default Workspace;
