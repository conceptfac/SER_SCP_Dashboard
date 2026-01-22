
import React, { useState, useEffect } from 'react';
import { User, UserRole, Language } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './views/Dashboard';
import Clients from './views/Clients';
import SCPInfoView from './views/SCPInfo';
import Contracts from './views/Contracts';
import Executives from './views/Executives';
import { TRANSLATIONS } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('pt-br');
  const [activeView, setActiveView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const t = TRANSLATIONS[language];

  // Initial setup - simulating login
  useEffect(() => {
    const timer = setTimeout(() => {
      const initialUser: User = {
        id: '1',
        name: 'Carlos Mendes',
        email: 'carlos.mendes@ser-pro.com',
        role: UserRole.HEAD
      };
      setUser(initialUser);
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleRoleChange = (role: UserRole) => {
    if (user) {
      setUser({ ...user, role });
      if (role === UserRole.CLIENTE && (activeView === 'dashboard' || activeView === 'scp-info' || activeView === 'exec-reg')) {
        setActiveView('contracts');
      }
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

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

  const currentRole = user?.role || UserRole.CLIENTE;

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
        />
        
        <main className="flex-1 pt-16 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && currentRole !== UserRole.CLIENTE && <Dashboard user={user!} language={language} />}
            {activeView === 'clients' && currentRole !== UserRole.CLIENTE && <Clients role={currentRole} language={language} />}
            {activeView === 'scp-info' && currentRole !== UserRole.CLIENTE && <SCPInfoView role={currentRole} language={language} />}
            {activeView === 'contracts' && <Contracts role={currentRole} language={language} />}
            {activeView === 'exec-reg' && currentRole === UserRole.HEAD && <Executives role={currentRole} language={language} />}
            
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
