import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface LoginProps {
  onLoginSuccess: (role?: number, initialView?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<'selection' | 'form'>('selection');

  // Monitora o estado de autenticação para lidar com o retorno do Login Social (Google) e Login por Senha
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Adiciona INITIAL_SESSION para capturar o estado quando a página carrega já logada (ex: retorno do Google)
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user.email) {
        const email = session.user.email;
        try {
          let role = 2; // Default Executivo
          let initialView = 'dashboard';

          // 1. Verificar se o e-mail está pré-cadastrado (Segurança)
          const { data: execExists } = await supabase.from('executives').select('id').ilike('email', email).maybeSingle();
          const { data: custExists } = await supabase.from('customers').select('id, onboarding_step, analysis_status').ilike('email', email).maybeSingle();

          if (!execExists && !custExists) {
            await supabase.auth.signOut();
            setError('E-mail não cadastrado no sistema!');
            return;
          }

          if (execExists) {
             const { data: execData } = await supabase.from('executives').select('role').eq('id', execExists.id).single();
             if (execData) role = execData.role;
          }

          // 2. Se for cliente, atualizar status de onboarding (Login Social conta como validação)
          // Nota: O Trigger no banco de dados (migration_trigger_update_onboarding.sql) também faz isso por segurança
          if (custExists) {
             role = 4; // UserRole.CLIENTE
             initialView = 'contracts'; // Define Contratos como tela inicial
             const updates: any = { has_password: true };
             if (custExists.onboarding_step === 'password') {
                 updates.onboarding_step = 'registration';
             } 
             // Fallback: Se já foi aprovado na análise e está logando, garante que vá para registration
             else if (custExists.analysis_status === 'approved' && custExists.onboarding_step !== 'completed' && custExists.onboarding_step !== 'registration') {
                 updates.onboarding_step = 'registration';
             }
             await supabase.from('customers').update(updates).eq('id', custExists.id);
          }

          onLoginSuccess(role, initialView);
        } catch (err) { console.error('Erro no processamento de login:', err); }
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, [onLoginSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const cleanEmail = email.trim().toLowerCase();

    try {
      let error;
      
      if (isSignUp) {
        // Validação de Segurança:
        // Verifica se o e-mail já existe na base de dados (Executivos ou Clientes) antes de permitir o cadastro da senha.
        const { data: execExists } = await supabase
          .from('executives')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();

        const { data: custExists } = await supabase
          .from('customers')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!execExists && !custExists) {
          throw new Error('E-mail não cadastrado!');
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        error = signUpError;
        if (!error) {
          alert('Conta validada com sucesso! Verifique seu e-mail para confirmar.');
          setIsSignUp(false);
          setLoading(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        error = signInError;
      }

      if (error) throw error;
      // O useEffect lidará com a atualização do banco e onLoginSuccess via evento SIGNED_IN
    } catch (err: any) {
      if (err.message === 'Invalid login credentials') {
        setError('E-mail ou senha incorretos. Se for seu primeiro acesso, volte e clique em PRIMEIRO ACESSO.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      // Tenta obter a mensagem de várias fontes possíveis no objeto de erro
      let message = err.message || (typeof err === 'object' && err.msg ? err.msg : JSON.stringify(err));

      // Se a mensagem for um JSON string (como no seu caso), faz o parse
      if (typeof message === 'string' && message.trim().startsWith('{')) {
        try {
           const parsed = JSON.parse(message);
           if (parsed.msg) message = parsed.msg;
        } catch (e) { /* ignora erro de parse */ }
      }

      // Tradução de erros conhecidos
      if (message && message.includes('provider is not enabled')) {
          message = 'O login com Google não está habilitado nas configurações do Supabase.';
      }

      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#211F38] p-4">
      <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
           <img 
            src="https://raw.githubusercontent.com/conceptfac/SER_SCP_Dashboard/main/imgs/logo.svg" 
            alt="Logo SCP" 
            className="h-12 mx-auto mb-6"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <h2 className="text-2xl font-black text-secondary uppercase tracking-tighter">Acesso ao Sistema</h2>
          <p className="text-sm text-gray-400 font-bold mt-2">
            {step === 'selection' ? 'Selecione uma opção para continuar' : (isSignUp ? 'Valide seu e-mail para criar a senha' : 'Entre com suas credenciais')}
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>
        )}

        {step === 'selection' ? (
          <div className="space-y-4">
            <button
              onClick={() => { setIsSignUp(false); setStep('form'); setError(''); }}
              className="w-full py-4 bg-secondary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:opacity-95 hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
            >
              JÁ SOU CADASTRADO
            </button>
            <button
              onClick={() => { setIsSignUp(true); setStep('form'); setError(''); }}
              className="w-full py-4 bg-white text-secondary border-2 border-secondary rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg hover:bg-gray-50 hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
            >
              PRIMEIRO ACESSO
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">Ou</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full py-4 bg-white text-gray-600 border border-gray-200 rounded-2xl font-bold text-xs shadow-sm hover:bg-gray-50 hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Entrar com Google
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-secondary/30 focus:ring-4 focus:ring-secondary/5 transition-all text-secondary font-bold text-sm"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-secondary/30 focus:ring-4 focus:ring-secondary/5 transition-all text-secondary font-bold text-sm"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-secondary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:opacity-95 hover:translate-y-[-2px] active:translate-y-[0px] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'PROCESSANDO...' : (isSignUp ? 'VALIDAR CONTA' : 'ENTRAR')}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => { setStep('selection'); setError(''); }}
                className="text-[10px] font-bold text-gray-400 hover:text-secondary uppercase tracking-widest transition-colors"
              >
                VOLTAR
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
