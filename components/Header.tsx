import React, { useState, useRef, useEffect } from 'react';
import { User, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface HeaderProps {
  user: User;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, language, onLanguageChange, onMenuClick }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLang(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFlagClass = (lang: Language) => {
    switch (lang) {
      case 'pt-br': return 'br';
      case 'en': return 'us';
      case 'es': return 'es';
      default: return 'un';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-secondary hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>    
        

        <div className="text-gray-400 text-xs md:text-sm font-medium truncate max-w-[150px] md:max-w-none">
          {t.management}
        </div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-6">
        {/* Language Selector */}
        <div className="relative" ref={langRef}>
          <button 
            onClick={() => setShowLang(!showLang)}
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 hover:bg-gray-50 rounded-full transition-colors"
          >
            <span className={`fi fi-${getFlagClass(language)} text-lg shadow-sm rounded-sm transition-transform hover:scale-110 active:scale-95`}></span>
          </button>
          
          {showLang && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button 
                onClick={() => { onLanguageChange('pt-br'); setShowLang(false); }} 
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${language === 'pt-br' ? 'bg-primary/5 text-primary font-bold' : 'hover:bg-gray-50 text-secondary'}`}
              >
                <span className="fi fi-br shadow-sm rounded-sm"></span> PT-BR
              </button>
              <button 
                onClick={() => { onLanguageChange('en'); setShowLang(false); }} 
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${language === 'en' ? 'bg-primary/5 text-primary font-bold' : 'hover:bg-gray-50 text-secondary'}`}
              >
                <span className="fi fi-us shadow-sm rounded-sm"></span> EN
              </button>
              <button 
                onClick={() => { onLanguageChange('es'); setShowLang(false); }} 
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${language === 'es' ? 'bg-primary/5 text-primary font-bold' : 'hover:bg-gray-50 text-secondary'}`}
              >
                <span className="fi fi-es shadow-sm rounded-sm"></span> ES
              </button>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 pl-3 md:pl-4 border-l border-gray-100"
          >
            <div className="text-right hidden md:block">
              <div className="text-sm font-bold text-secondary leading-tight">{user.name}</div>
              <div className="text-xs text-bodyText">{user.email}</div>
            </div>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-secondary/10 rounded-full border-2 border-secondary/20 flex items-center justify-center text-secondary font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-gray-50 md:hidden">
                <div className="text-sm font-bold text-secondary">{user.name}</div>
                <div className="text-xs text-bodyText">{user.email}</div>
              </div>
              <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-secondary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                {t.profile}
              </button>
              <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-secondary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                {t.financial}
              </button>
              <button className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-bold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                {t.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;