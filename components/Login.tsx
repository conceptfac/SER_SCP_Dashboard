import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let error;
      
      if (isSignUp) {
        // Validação de Segurança:
        // Verifica se o e-mail já existe na base de dados (Executivos ou Clientes) antes de permitir o cadastro da senha.
        const { data: execExists } = await supabase
          .from('executives')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        const { data: custExists } = await supabase
          .from('customers')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (!execExists && !custExists) {
          throw new Error('Este e-mail não possui pré-cadastro no sistema. Entre em contato com o administrador.');
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        error = signUpError;
        if (!error) {
          alert('Cadastro realizado com sucesso! Se a confirmação de e-mail estiver ativada no Supabase, verifique sua caixa de entrada.');
          setIsSignUp(false);
          setLoading(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        error = signInError;
      }

      if (error) throw error;
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message);
    } finally {
      setLoading(false);
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
          <p className="text-sm text-gray-400 font-bold mt-2">{isSignUp ? 'Crie sua conta de acesso' : 'Entre com suas credenciais'}</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
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
            {loading ? 'PROCESSANDO...' : (isSignUp ? 'CADASTRAR' : 'ENTRAR')}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-[10px] font-bold text-gray-400 hover:text-secondary uppercase tracking-widest transition-colors"
            >
              {isSignUp ? 'Já possui conta? Fazer Login' : 'Não possui conta? Criar agora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
