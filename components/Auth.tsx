
import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';

interface AuthProps {
  language: 'pt' | 'en' | 'es';
}

const Auth: React.FC<AuthProps> = ({ language }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, canRetry?: boolean } | null>(null);

  const t = {
    pt: {
      title: isForgotPassword ? "Recuperar Senha" : (isSignUp ? "Crie sua conta" : "Bem-vindo de volta"),
      sub: isForgotPassword ? "Enviaremos um link de recuperação" : "Sua agência de design e marketing 24/7",
      emailLabel: "E-mail Profissional",
      passwordLabel: "Senha de Acesso",
      btn: isForgotPassword ? "ENVIAR LINK" : (isSignUp ? "CRIAR CONTA" : "ENTRAR NO CONSOLE"),
      switch: isSignUp ? "Já tem conta? Fazer Login" : "Não tem conta? Começar agora",
      forgot: "Esqueceu a senha?",
      back: "Voltar para Login",
      successSignUp: "✨ Conta criada! Se não conseguir entrar, verifique o e-mail de confirmação ou spam.",
      successLogin: "🚀 Autenticando...",
      successReset: "📧 Link de recuperação enviado para seu e-mail.",
      errorInvalid: "Credenciais inválidas. Verifique seu e-mail e senha.",
      errorGeneric: "Ocorreu um erro. Verifique sua conexão ou tente novamente.",
      tryLogin: "Tentar Login Direto",
      resendEmail: "Não recebeu? Reenviar e-mail"
    },
    en: {
      title: isForgotPassword ? "Reset Password" : (isSignUp ? "Create your account" : "Welcome back"),
      sub: isForgotPassword ? "We will send a recovery link" : "Your 24/7 design & marketing agency",
      emailLabel: "Professional Email",
      passwordLabel: "Access Password",
      btn: isForgotPassword ? "SEND LINK" : (isSignUp ? "CREATE ACCOUNT" : "ENTER CONSOLE"),
      switch: isSignUp ? "Already have an account? Login" : "No account? Start now",
      forgot: "Forgot password?",
      back: "Back to Login",
      successSignUp: "✨ Account created! If you can't enter, check your confirmation email or spam.",
      successLogin: "🚀 Authenticating...",
      successReset: "📧 Recovery link sent to your email.",
      errorInvalid: "Invalid credentials. Check your email and password.",
      errorGeneric: "An error occurred. Please try again.",
      tryLogin: "Try Direct Login",
      resendEmail: "Didn't receive it? Resend"
    }
  }[language === 'es' ? 'en' : language] || {
    title: "Welcome back",
    sub: "Your 24/7 agency",
    emailLabel: "Email",
    passwordLabel: "Password",
    btn: "ENTER",
    switch: "Sign up",
    forgot: "Forgot?",
    back: "Back",
    successSignUp: "Account created!",
    successLogin: "Authenticating...",
    successReset: "Link sent.",
    errorInvalid: "Invalid credentials.",
    errorGeneric: "Error occurred",
    tryLogin: "Login Now",
    resendEmail: "Resend"
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setStatus({ type: 'success', message: t.successReset });
      } else if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        
        // Se o Supabase retornou uma sessão imediatamente, o usuário já está logado
        if (data?.session) {
          setStatus({ type: 'success', message: t.successLogin });
        } else {
          setStatus({ type: 'success', message: t.successSignUp, canRetry: true });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error(t.errorInvalid);
          }
          throw error;
        }
        setStatus({ type: 'success', message: t.successLogin });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || t.errorGeneric });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-indigo-600/5 blur-[120px] rounded-full -top-1/2 left-1/4 pointer-events-none"></div>
      <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full -bottom-1/2 right-1/4 pointer-events-none"></div>
      
      <div className="max-w-md w-full glass-card border border-white/5 rounded-[40px] p-10 relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center font-bold text-white text-2xl mx-auto mb-6 shadow-lg shadow-indigo-600/30">S</div>
          <h2 className="text-3xl font-display font-extrabold text-white tracking-tight mb-2">{t.title}</h2>
          <p className="text-neutral-500 text-sm">{t.sub}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest ml-1">{t.emailLabel}</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /></svg>
              </span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-neutral-700"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          {!isForgotPassword && (
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{t.passwordLabel}</label>
                {!isSignUp && (
                  <button 
                    type="button" 
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[10px] text-indigo-500 hover:text-indigo-400 font-bold uppercase tracking-widest"
                  >
                    {t.forgot}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </span>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl py-4 pl-12 pr-12 text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-neutral-700"
                  required={!isForgotPassword}
                  minLength={6}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {status && (
            <div className={`p-4 rounded-2xl text-[11px] font-bold text-center animate-in fade-in slide-in-from-top-2 ${
              status.type === 'success' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {status.message}
              {status.canRetry && (
                <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
                  <button 
                    type="button"
                    onClick={() => { setIsSignUp(false); setStatus(null); }}
                    className="text-white hover:underline uppercase tracking-widest text-[9px]"
                  >
                    {t.tryLogin}
                  </button>
                  <button 
                    type="button"
                    onClick={handleAuth}
                    className="text-neutral-500 hover:text-white uppercase tracking-widest text-[9px]"
                  >
                    {t.resendEmail}
                  </button>
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-white text-black font-extrabold rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : t.btn}
          </button>
        </form>

        <button 
          onClick={() => {
            if (isForgotPassword) {
              setIsForgotPassword(false);
            } else {
              setIsSignUp(!isSignUp);
            }
            setStatus(null);
            setPassword('');
          }}
          className="w-full mt-8 text-[10px] text-neutral-500 font-bold uppercase tracking-widest hover:text-white transition-colors"
        >
          {isForgotPassword ? t.back : t.switch}
        </button>
        
        <div className="mt-10 pt-6 border-t border-white/5 text-center">
          <p className="text-[9px] text-neutral-700 font-bold uppercase tracking-[0.2em]">
            SECURE ACCESS BY SUPABASE AUTH
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
