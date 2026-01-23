
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { User, UserRole, Language } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './views/Dashboard';
import Customers from './views/Customers';
import SCPInfoView from './views/SCPInfo';
import Contracts from './views/Contracts';
import Executives from './views/Executives';
import Login from './components/Login';
import { TRANSLATIONS } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('pt-br');
  const [activeView, setActiveView] = useState('dashboard');
  const [viewParams, setViewParams] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const t = TRANSLATIONS[language];

  const fetchUserProfile = async (userId: string, email: string) => {
    const cleanEmail = email.trim();
    try {
      console.log('Buscando perfil para:', cleanEmail);
      
      // 1. Tenta buscar perfil de executivo
      const { data: execData, error } = await supabase
        .from('executives')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (execData) {
        console.log('Perfil Executivo encontrado. Role:', execData.role);
        
        // Mapeamento explícito para garantir que o número do banco corresponda ao Enum correto
        let finalRole: UserRole = UserRole.CLIENTE;
        const dbRole = Number(execData.role);

        // Mapeia 0, 1, 2, 3 para os Enums corretos (independente do valor interno do Enum)
        if (dbRole === 0) finalRole = UserRole.HEAD;
        else if (dbRole === 1) finalRole = UserRole.EXECUTIVO_LEADER;
        else if (dbRole === 2) finalRole = UserRole.EXECUTIVO;
        else if (dbRole === 3) finalRole = UserRole.FINANCEIRO;
        
        console.log('Role final aplicada:', finalRole);

        setUser({
          id: execData.id.toString(),
          name: execData.full_name,
          email: execData.email,
          role: finalRole
        });
        return;
      }

      // 2. Se não achou executivo, tenta buscar perfil de cliente
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (custData) {
        console.log('Perfil Cliente encontrado.');
        setUser({
          id: custData.id.toString(),
          name: custData.full_name,
          email: custData.email,
          role: UserRole.CLIENTE
        });
        return;
      }

      // 3. Fallback: Usuário existe no Auth mas não nas tabelas públicas
      console.log('Perfil NÃO encontrado nas tabelas públicas. Usando fallback.');
      setUser({
        id: userId,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: UserRole.CLIENTE
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Verifica sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email!);
      } else {
        setIsLoading(false);
      }
    });

    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#211F38] font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="loading-spinner"></div>
          <p className="text-white font-bold tracking-widest uppercase text-xs">Carregando SER Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  /* Código antigo de simulação removido */
  /*
  useEffect(() => {
    const timer = setTimeout(() => {
      const initialUser: User = { ... };
      setUser(initialUser);
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  */

  const handleRoleChange = (role: UserRole) => {
    if (user) {
      setUser({ ...user, role });
      if (role === UserRole.CLIENTE && (activeView === 'dashboard' || activeView === 'scp-info' || activeView === 'exec-reg')) {
        setActiveView('contracts');
      }
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Usa verificação explícita de undefined para não quebrar com role 0 (HEAD)
  const currentRole = user?.role !== undefined ? user.role : UserRole.CLIENTE;

  return (
    <div className="min-h-screen bg-white flex overflow-x-hidden font-sans">
      {/* Role Switcher for Demo */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-4 bg-white shadow-2xl rounded-2xl border border-gray-100 hidden md:flex">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Demo Role Selector</p>
        <div className="flex gap-2">
          {Object.values(UserRole).map(role => (
            <button
              key={role}
              onClick={() => handleRoleChange(role)}
              className={`px-3 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                user?.role === role ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-primary/30'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <Sidebar 
        role={currentRole} 
        language={language} 
        onNavigate={(view) => {
          setActiveView(view);
          setViewParams(null);
          setIsSidebarOpen(false); // Close sidebar on mobile after navigate
        }}
        activeView={activeView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          user={user!} 
          language={language} 
          onLanguageChange={setLanguage} 
          onMenuClick={toggleSidebar}
          onLogout={handleLogout}
          onNavigate={(view, params) => {
            setActiveView(view);
            setViewParams(params);
          }}
        />
        
        <main className="flex-1 pt-16 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && currentRole !== UserRole.CLIENTE && <Dashboard user={user!} language={language} />}
            {activeView === 'clients' && currentRole !== UserRole.CLIENTE && <Customers role={currentRole} language={language} userId={user!.id} userName={user!.name} initialOpenId={viewParams?.openClientId} openTimestamp={viewParams?.timestamp} initialTab={viewParams?.initialTab} />}
            {activeView === 'scp-info' && currentRole !== UserRole.CLIENTE && <SCPInfoView role={currentRole} language={language} />}
            {activeView === 'contracts' && <Contracts role={currentRole} language={language} />}
            {activeView === 'exec-reg' && (currentRole === UserRole.HEAD || currentRole === UserRole.EXECUTIVO_LEADER) && <Executives role={currentRole} language={language} userId={user!.id} />}
            
            {activeView === 'dashboard' && currentRole === UserRole.CLIENTE && (
              <div className="flex flex-col items-center justify-center h-64 text-center animate-in fade-in zoom-in duration-300 px-4">
                <span className="text-5xl mb-4">🚫</span>
                <h3 className="text-2xl font-bold text-secondary font-display">{t.restrictedAccess}</h3>
                <p className="text-bodyText">{t.notAvailable}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
