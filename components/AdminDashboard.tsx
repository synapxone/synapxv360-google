
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseService';
import { UserProfile, Plan } from '../types';

const RoadmapViewer: React.FC = () => {
  const steps = [
    { v: 'V362', t: 'Master Engine', status: 'current', desc: 'Supabase Sync & Brand Anatomy', icon: '💎' },
    { v: 'V363', t: 'Cinematic & Audio', status: 'next', desc: 'Veo Video & Gemini TTS', icon: '🎬' },
    { v: 'V364', t: 'The Boardroom', status: 'future', desc: 'Real-time Live API Voice', icon: '🎙️' },
    { v: 'V365', t: 'Autonomous', status: 'future', desc: 'Auto-post & Ads ROI', icon: '🤖' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-6">
      {steps.map((s, i) => (
        <div key={i} className={`relative p-6 rounded-[32px] border transition-all ${
          s.status === 'current' ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/20' : 
          s.status === 'next' ? 'bg-neutral-900 border-indigo-500/30' : 'bg-neutral-900/50 border-neutral-800 opacity-50'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.v}</span>
            <span className="text-xl">{s.icon}</span>
          </div>
          <h4 className="font-black text-white text-sm mb-1 uppercase tracking-tighter">{s.t}</h4>
          <p className="text-[10px] text-neutral-400 font-medium leading-tight">{s.desc}</p>
          {s.status === 'current' && <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-white text-black text-[8px] font-black rounded-full animate-bounce">LIVE</div>}
        </div>
      ))}
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalCredits: 0 });
  const [activeTab, setActiveTab] = useState<'users' | 'roadmap'>('roadmap');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: userData } = await supabase.from('profiles').select('*');
    if (userData) {
      setUsers(userData);
      setStats({
        totalUsers: userData.length,
        totalCredits: userData.reduce((acc, u) => acc + u.credits_remaining, 0)
      });
    }
  };

  return (
    <div className="h-full bg-black overflow-y-auto p-8 lg:p-12 no-scrollbar">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-neutral-900 pb-8 gap-6">
          <div>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Agency Control Center</span>
            <h1 className="text-5xl font-display font-black text-white mt-2 tracking-tighter italic">Console.v362</h1>
          </div>
          <div className="flex bg-neutral-900 p-1 rounded-2xl border border-white/5">
             <button onClick={() => setActiveTab('roadmap')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'roadmap' ? 'bg-indigo-600 text-white' : 'text-neutral-500 hover:text-white'}`}>Roadmap</button>
             <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-neutral-500 hover:text-white'}`}>Users</button>
          </div>
        </header>

        {activeTab === 'roadmap' ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-sm font-black text-neutral-600 uppercase tracking-widest mb-6">Strategic Development Pipeline</h2>
            <RoadmapViewer />
            <div className="mt-12 p-10 bg-neutral-900/40 rounded-[40px] border border-white/5 backdrop-blur-xl">
               <h3 className="text-lg font-black text-white mb-4 uppercase italic">V362 Audited Success</h3>
               <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl mb-8">
                 A infraestrutura de sincronização com Supabase foi estabilizada. O sistema agora lida com fusão inteligente de dados de marca, garantindo que o escaneamento de DNA visual seja persistente e evolutivo.
               </p>
               <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                 <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Próxima Parada: Cinematic V363</h4>
                 <p className="text-xs text-neutral-500">Preparando integração com Google Veo para geração de vídeos publicitários de alta fidelidade.</p>
               </div>
            </div>
          </section>
        ) : (
          <div className="space-y-12">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Total Users', val: stats.totalUsers, icon: '👥' },
                { label: 'Total Credits', val: stats.totalCredits, icon: '🪙' },
                { label: 'Status', val: 'V362 Stable', icon: '✅' }
              ].map((s, i) => (
                <div key={i} className="bg-neutral-900 border border-neutral-800 p-8 rounded-[32px]">
                  <span className="text-2xl mb-4 block">{s.icon}</span>
                  <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.2em]">{s.label}</p>
                  <h3 className="text-3xl font-black text-white mt-1">{s.val}</h3>
                </div>
              ))}
            </div>
            <section className="bg-neutral-900 border border-neutral-800 rounded-[32px] overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-950 text-neutral-500 font-bold uppercase text-[9px] tracking-widest">
                    <tr>
                      <th className="px-8 py-5">User</th>
                      <th className="px-8 py-5">Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="px-8 py-5 text-white font-bold">{u.email}</td>
                        <td className="px-8 py-5 font-mono text-indigo-400 font-bold">{u.credits_remaining}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
