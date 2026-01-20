
import React, { useState } from 'react';
import { User, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface DashboardProps {
  user: User;
  language: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ user, language }) => {
  const [isMasked, setIsMasked] = useState(true);
  const t = TRANSLATIONS[language];

  const formatValue = (val: number) => {
    if (isMasked) return 'R$ ****';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const cards = [
    { title: t.walletParticipation, value: 125000.50, color: 'bg-primary' },
    { title: t.walletIndividual, value: 45000.00, color: 'bg-secondary' },
    { title: t.walletInherited, value: 7800.25, color: 'bg-accent' },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-secondary">
            {t.welcome} <span className="text-primary">{user.name}!</span>
          </h2>
          <p className="text-sm md:text-base text-bodyText">{t.missedYou}</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsMasked(!isMasked)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-secondary rounded-lg font-semibold transition-all shadow-sm"
          >
            {isMasked ? (
              <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            ) : (
              <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
            )}
            <span className="text-sm">{t.maskedButton}</span>
          </button>
          <button className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 text-secondary rounded-lg transition-all shadow-sm" title={t.help}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${card.color}`}></div>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-secondary/5 rounded-xl group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-bodyText uppercase tracking-wider">{card.title}</h3>
              <div className="flex items-baseline justify-between pt-4">
                <span className="text-xl md:text-2xl font-extrabold text-secondary tracking-tight">
                  {formatValue(card.value)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
            {t.monthlyEvolution}
          </h3>
          <div className="h-48 md:h-64 bg-gray-50 rounded-xl flex items-end justify-around p-4 gap-1 md:gap-2">
            {[40, 60, 45, 90, 65, 80, 50, 75, 85, 95].map((h, i) => (
              <div key={i} className="bg-secondary/20 w-full rounded-t-lg transition-all hover:bg-secondary" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            {t.recentActivity}
          </h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-secondary/5 text-secondary rounded-full flex items-center justify-center font-bold text-xs md:text-base">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-bold text-secondary truncate">Novo Contrato #2938{i}</p>
                  <p className="text-[10px] md:text-xs text-bodyText truncate">Finalizado por João Silva</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-medium text-gray-400 whitespace-nowrap">{i}h atrás</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
