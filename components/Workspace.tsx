
import React, { useState, useMemo } from 'react';
import { CampaignState, DesignAsset, Brand, Language } from '../types';

interface WorkspaceProps {
  state: CampaignState;
  onUpdateBrand: (brand: Brand) => Promise<void>;
  onDeleteBrand: (id: string) => void;
  onUpdateAssets: (assets: DesignAsset[]) => void;
  onSendMessage: (content: string) => void;
  onRenameFolder: (groupId: string, newTitle: string) => Promise<void>;
  onAssetAction: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  onExtendVideo: (asset: DesignAsset, prompt: string) => void;
  language: Language;
}

const Workspace: React.FC<WorkspaceProps> = ({ state, onSendMessage, onRenameFolder, onAssetAction, language }) => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

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

    // Filter by Search
    if (searchQuery) {
      result = result.filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Filter by Date
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

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentFolder = folders.find(f => f.id === selectedFolder);

  if (!selectedFolder) {
    return (
      <div className="h-full flex flex-col bg-black">
        <header className="p-8 border-b border-neutral-900 space-y-6">
          <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em]">Gestão de Projetos</h2>
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
              <button 
                key={f.id} onClick={() => { setSelectedFolder(f.id); setNewFolderName(f.title); }}
                className="p-8 bg-neutral-900/40 border border-white/5 rounded-[40px] text-left hover:border-indigo-500/50 hover:bg-neutral-900 transition-all group relative"
              >
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-xl group-hover:scale-110 transition-transform">📂</div>
                <h3 className="text-sm font-black text-white uppercase italic truncate mb-2">{f.title}</h3>
                <div className="flex justify-between items-center text-[10px] font-black text-neutral-600 uppercase tracking-widest">
                  <span>{f.count} Ativos</span>
                  <span className="text-indigo-500 group-hover:translate-x-1 transition-transform">Abrir →</span>
                </div>
              </button>
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
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Projetos: {currentFolder?.title}</h3>
                <button onClick={() => setIsRenaming(true)} className="text-neutral-600 hover:text-indigo-500 transition-colors">✏️</button>
              </div>
            )}
            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mt-1">Gerencie e aprove suas criações nesta pasta.</p>
          </div>
        </div>
        <button 
          onClick={() => onSendMessage(`Vamos retomar o projeto "${currentFolder?.title}". O que podemos melhorar?`)}
          className="px-6 py-3 bg-white text-black text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl"
        >
          Retomar Conversa no Chat
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 no-scrollbar">
        {activeAssets.map(asset => (
          <div key={asset.id} className="bg-neutral-900/40 rounded-[32px] border border-white/5 overflow-hidden flex flex-col group shadow-2xl transition-all hover:bg-neutral-900">
            <div className="aspect-square relative overflow-hidden bg-black">
               {asset.imageUrl && <img src={asset.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
               {asset.videoUrl && <video src={asset.videoUrl} className="w-full h-full object-cover" controls />}
               {asset.audioUrl && <div className="h-full flex items-center justify-center bg-indigo-900/10 text-4xl">🎵</div>}
               
               {/* Action Overlay */}
               <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 p-6 backdrop-blur-sm">
                  <button 
                    onClick={() => onAssetAction(asset.id, 'approved')}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all"
                  >
                    Aprovar
                  </button>
                  <button 
                    onClick={() => handleDownload(asset.imageUrl || asset.videoUrl || '', asset.name)}
                    className="w-full py-3 bg-white text-black hover:bg-indigo-600 hover:text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all"
                  >
                    Baixar
                  </button>
                  <button 
                    onClick={() => onSendMessage(`Quero editar o ativo "${asset.name}" da pasta "${currentFolder?.title}". [PROMPT]: `)}
                    className="w-full py-3 bg-neutral-800 hover:bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => onAssetAction(asset.id, 'rejected')}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all"
                  >
                    Deletar
                  </button>
               </div>

               <div className="absolute top-4 right-4 z-10">
                 <span className={`px-3 py-1 text-[8px] font-black uppercase rounded-full ${asset.status === 'approved' ? 'bg-green-500 text-white' : 'bg-neutral-800/80 backdrop-blur-md text-neutral-400'}`}>
                   {asset.status}
                 </span>
               </div>
            </div>
            <div className="p-6">
              <p className="text-[11px] font-black text-white uppercase truncate">{asset.name}</p>
              <p className="text-[9px] text-neutral-500 font-mono mt-1 uppercase tracking-widest">{asset.type} • {asset.dimensions}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Workspace;
