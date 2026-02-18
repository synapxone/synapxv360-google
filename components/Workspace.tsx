
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
                  onClick={async () => { await onRenameFolder(selectedFolder!, newFolderName); setIsRenaming(false); }}
                  className="p-2 bg-green-500 rounded-xl text-white"
                >✓</button>
                <button onClick={() => setIsRenaming(false)} className="p-2 bg-neutral-800 rounded-xl text-white">×</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">{currentFolder?.title || 'Pasta Indisponível'}</h3>
                {currentFolder && <button onClick={() => setIsRenaming(true)} className="text-neutral-600 hover:text-indigo-500 transition-colors">✏️</button>}
              </div>
            )}
            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mt-1">Biblioteca ativa do projeto.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => selectedFolder && onDeleteFolder(selectedFolder)}
            disabled={!selectedFolder}
            className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl disabled:opacity-50"
          >
            Excluir Pasta
          </button>
          <button 
            onClick={() => currentFolder && onSendMessage(currentFolder.id, currentFolder.title)}
            disabled={!currentFolder}
            className="px-6 py-3 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xl disabled:opacity-50"
          >
            Retomar Conversa
          </button>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 no-scrollbar pb-32">
        {activeAssets.map(asset => (
          <div key={asset.id} className="group bg-neutral-900/20 rounded-[32px] overflow-hidden border border-white/5 hover:border-indigo-500/20 transition-all duration-500">
            {/* Imagem — sem overlay que esconde */}
            <div className="aspect-square relative bg-neutral-900 overflow-hidden">
              {asset.imageUrl ? (
                <img src={asset.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={asset.name} />
              ) : asset.videoUrl ? (
                <video src={asset.videoUrl} className="w-full h-full object-cover" muted loop autoPlay />
              ) : asset.audioUrl ? (
                <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                  <span className="text-4xl">🎵</span>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center animate-pulse bg-neutral-800">
                  <span className="text-sm text-neutral-600 uppercase tracking-widest">Gerando...</span>
                </div>
              )}
              {/* Badge top performer */}
              {asset.performance?.feedback === 'top_performer' && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-yellow-500 text-black text-[8px] font-black rounded-full">
                  ⭐ TOP
                </div>
              )}
              {/* Badge status */}
              {asset.status === 'approved' && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-black">✓</div>
              )}
            </div>

            {/* Info */}
            <div className="p-6 space-y-3">
              <div>
                <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest">{asset.type || 'Asset'}</p>
                <h4 className="font-bold text-white text-base tracking-tight truncate mt-1">{asset.name}</h4>
                {asset.copy && <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1 italic">{asset.copy}</p>}
              </div>

              {/* Botões — sempre visíveis, abaixo da imagem */}
              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button 
                  onClick={() => setEditingAsset(asset)} 
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-[9px] font-black rounded-xl uppercase tracking-widest transition-all"
                >
                  Editor
                </button>
                <button 
                  onClick={() => setPreviewAsset(asset)} 
                  className="flex-1 py-2.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[9px] font-black rounded-xl uppercase tracking-widest transition-all"
                >
                  Mockup
                </button>
                <button 
                   onClick={() => handleToggleTopPerformer(asset)}
                   className={`w-9 py-2.5 rounded-xl text-xs flex items-center justify-center transition-all ${asset.performance?.feedback === 'top_performer' ? 'bg-yellow-500 text-black' : 'bg-neutral-800 text-neutral-500 hover:text-yellow-400'}`}
                >
                   ⭐
                </button>
              </div>
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
