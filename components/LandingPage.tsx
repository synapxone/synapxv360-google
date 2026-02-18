
import React from 'react';
import { Language } from '../types';

interface LandingPageProps {
  onStart: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const translations = {
  pt: {
    hero: "Sua agência de marketing ilimitada.",
    sub: "Esqueça briefs complexos. synapx Agency é o seu Diretor de Arte e Marketing em tempo real. Crie marcas, planeje estratégias e gere campanhas completas em segundos.",
    cta: "CRIAR MEU NEGÓCIO AGORA",
    demo: "Ver Demonstração",
    start: "Começar Agora",
    nav: { agency: "Agência", cases: "Casos de Uso", companies: "Empresas" },
    badge: "Full-Service AI Marketing Agency",
    f1: { t: "CMO as a Service", d: "IA que toma decisões estratégicas baseadas no seu público-alvo." },
    f2: { t: "Design High-End", d: "Visual de agência boutique com a velocidade da inteligência artificial." },
    f3: { t: "Brand Memory", d: "Consistência absoluta. A IA aprende sua marca e nunca esquece." },
    f4: { t: "Omnichannel", d: "Geração de assets otimizados para Instagram, LinkedIn, Ads e mais." },
    social: "A ferramenta favorita de quem constrói o futuro.",
    subsocial: "Mais de 500 marcas criadas e gerenciadas pela nossa IA apenas no último mês."
  },
  en: {
    hero: "Your unlimited marketing agency.",
    sub: "Forget complex briefs. synapx Agency is your real-time Art and Marketing Director. Create brands, plan strategies, and generate complete campaigns in seconds.",
    cta: "CREATE MY BUSINESS NOW",
    demo: "Watch Demo",
    start: "Get Started",
    nav: { agency: "Agency", cases: "Use Cases", companies: "Enterprise" },
    badge: "Full-Service AI Marketing Agency",
    f1: { t: "CMO as a Service", d: "AI that makes strategic decisions based on your target audience." },
    f2: { t: "High-End Design", d: "Boutique agency visuals with the speed of artificial intelligence." },
    f3: { t: "Brand Memory", d: "Absolute consistency. The AI learns your brand and never forgets." },
    f4: { t: "Omnichannel", d: "Generation of assets optimized for Instagram, LinkedIn, Ads, and more." },
    social: "The favorite tool for those building the future.",
    subsocial: "Over 500 brands created and managed by our AI in the last month alone."
  },
  es: {
    hero: "Tu agencia de marketing ilimitada.",
    sub: "Olvídate de briefs complejos. synapx Agency es tu Director de Arte y Marketing en tiempo real. Crea marcas, planifica estrategias y genera campañas completas en segundos.",
    cta: "CREAR MI NEGOCIO AHORA",
    demo: "Ver Demostración",
    start: "Empezar Ahora",
    nav: { agency: "Agencia", cases: "Casos de Uso", companies: "Empresas" },
    badge: "Agencia de Marketing AI Full-Service",
    f1: { t: "CMO como Servicio", d: "IA que toma decisiones estratégicas basadas en tu público objetivo." },
    f2: { t: "Diseño de Alta Gama", d: "Visuales de agencia boutique con la velocidad de la inteligencia artificial." },
    f3: { t: "Memoria de Marca", d: "Consistencia absoluta. La IA aprende tu marca y nunca olvida." },
    f4: { t: "Omnicanal", d: "Generación de activos optimizados para Instagram, LinkedIn, Ads y más." },
    social: "La herramienta favorita de quienes construyen el futuro.",
    subsocial: "Más de 500 marcas creadas y gestionadas por nuestra IA solo en el último mes."
  }
};

const LandingPage: React.FC<LandingPageProps> = ({ onStart, language, setLanguage }) => {
  const t = translations[language];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">S</div>
          <span className="text-xl font-display font-bold tracking-tighter">synapx <span className="text-indigo-500">Agency</span></span>
        </div>
        
        <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
          <a href="#" className="hover:text-white transition-colors">{t.nav.agency}</a>
          <a href="#" className="hover:text-white transition-colors">{t.nav.cases}</a>
          <a href="#" className="hover:text-white transition-colors">{t.nav.companies}</a>
        </div>

        <div className="flex items-center gap-6">
          {/* Language Selector */}
          <div className="flex items-center bg-neutral-900/50 p-1 rounded-full border border-neutral-800">
            {(['pt', 'en', 'es'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${
                  language === lang ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          
          <button 
            onClick={onStart}
            className="px-6 py-2.5 bg-indigo-600 text-white text-[11px] font-bold rounded-full hover:bg-indigo-500 transition-all transform active:scale-95 shadow-lg shadow-indigo-600/20 uppercase tracking-widest"
          >
            {t.start}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none animate-pulse"></div>
        
        <div className="max-w-5xl mx-auto text-center space-y-12 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neutral-900/80 border border-neutral-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-indigo-400 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            {t.badge}
          </div>
          
          <h1 className="text-7xl md:text-9xl font-display font-extrabold tracking-tighter leading-[0.85] text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-white to-neutral-400">
              {t.hero}
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            {t.sub}
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-5 pt-6">
            <button 
              onClick={onStart}
              className="w-full md:w-auto px-10 py-5 bg-white text-black font-extrabold rounded-2xl transition-all shadow-2xl hover:bg-indigo-500 hover:text-white flex items-center justify-center gap-3 group active:scale-95"
            >
              {t.cta}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button className="w-full md:w-auto px-10 py-5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              {t.demo}
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mt-32">
          {[
            { title: t.f1.t, desc: t.f1.d, icon: "🎯" },
            { title: t.f2.t, desc: t.f2.d, icon: "💎" },
            { title: t.f3.t, desc: t.f3.d, icon: "🧠" },
            { title: t.f4.t, desc: t.f4.d, icon: "⚡" }
          ].map((f, i) => (
            <div key={i} className="p-8 bg-neutral-900/30 border border-white/5 rounded-3xl hover:border-indigo-500/20 transition-all hover:bg-neutral-900/50 group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-left">{f.icon}</div>
              <h3 className="text-lg font-bold mb-2 text-white">{f.title}</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 border-y border-white/5 bg-neutral-950/50">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-md text-center md:text-left">
            <h2 className="text-3xl font-display font-bold text-white mb-4">{t.social}</h2>
            <p className="text-neutral-500 text-sm">{t.subsocial}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 opacity-20 grayscale">
            {['LOGO 1', 'LOGO 2', 'LOGO 3', 'LOGO 4'].map(l => (
              <span key={l} className="text-xl font-bold tracking-tighter">{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-[10px] italic shadow-lg shadow-indigo-600/10">S</div>
                <span className="text-md font-bold tracking-tighter">synapx Agency</span>
              </div>
            </div>
            <div className="flex gap-8 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
              <a href="#" className="hover:text-white">Support</a>
              <a href="#" className="hover:text-white">API</a>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] text-neutral-700 font-bold uppercase tracking-[0.2em]">
            <span>© 2025 synapx Agency — Built with Gemini 3 Pro</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
