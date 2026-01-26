import React from 'react';
import { UserRole, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface SidebarProps {
  role: UserRole;
  language: Language;
  onNavigate: (view: string) => void;
  activeView: string;
  isOpen: boolean;
  onClose: () => void;
}

const Icons = {
  scp: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  executives: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  clients: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  investments: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
};

const Sidebar: React.FC<SidebarProps> = ({ role, language, onNavigate, activeView, isOpen, onClose }) => {
  const t = TRANSLATIONS[language];

  const menuItems = [
    { 
      id: 'scp', 
      label: 'SCP', 
      icon: Icons.scp, 
      role: [UserRole.HEAD, UserRole.EXECUTIVO_LEADER, UserRole.EXECUTIVO, UserRole.FINANCEIRO],
      subItems: [
        { id: 'dashboard', label: t.dashboard, view: 'dashboard' },
        { id: 'scpInfo', label: t.scpInfo, view: 'scp-info' }
      ] 
    },
    {
      id: 'executives',
      label: role === UserRole.EXECUTIVO_LEADER ? t.leaderSession : t.headSession,
      icon: Icons.executives,
      role: [UserRole.HEAD, UserRole.EXECUTIVO_LEADER],
      subItems: [
        { id: 'regExec', label: t.executives, view: 'exec-reg' }
      ]
    },
    {
      id: 'clients',
      label: t.clients,
      icon: Icons.clients,
      role: [UserRole.HEAD, UserRole.EXECUTIVO_LEADER, UserRole.EXECUTIVO],
      subItems: [
        { id: 'clientList', label: t.clients, view: 'clients' }
      ]
    },
    {
      id: 'investments',
      label: t.investments,
      icon: Icons.investments,
      subItems: [
        { id: 'contractList', label: t.contracts, view: 'contracts' }
      ]
    }
  ];

  // Filtra os itens permitidos
  let filteredItems = menuItems.filter(item => !item.role || item.role.includes(role));

  // Se for CLIENTE, move 'investments' (Contratos) para o topo da lista
  if (role === UserRole.CLIENTE) {
    const investmentsItem = filteredItems.find(i => i.id === 'investments');
    const otherItems = filteredItems.filter(i => i.id !== 'investments');
    if (investmentsItem) filteredItems = [investmentsItem, ...otherItems];
  }

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-[#211F38] shadow-2xl transition-transform duration-300 transform 
    lg:translate-x-0 lg:static lg:inset-auto
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={sidebarClasses}>
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <img 
                src="https://raw.githubusercontent.com/conceptfac/SER_SCP_Dashboard/main/imgs/logo.svg" 
                alt="Logo SCP" 
                className="h-10 w-auto sidebar-logo"
                onError={(e) => {
                  console.error("Erro ao carregar a logo do GitHub");
                  e.currentTarget.style.display = 'none';
                }}
              />        
            </div>
            <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <nav className="space-y-6 flex-1">
            {filteredItems.map(item => (
              <div key={item.id}>
                <div className="text-gray-500 uppercase text-[10px] font-bold tracking-[0.2em] mb-3 flex items-center gap-2 px-2">
                  <span className="text-white">{item.icon}</span>
                  {item.label}
                </div>
                <ul className="space-y-1">
                  {item.subItems.map(sub => (
                    <li key={sub.id}>
                      <button
                        onClick={() => onNavigate(sub.view)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                          activeView === sub.view 
                          ? 'bg-primary/20 text-white border-l-4 border-primary font-semibold' 
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                      >
                        {sub.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;