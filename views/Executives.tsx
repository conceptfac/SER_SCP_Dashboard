import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Executive, Language, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';
import RegisterModal from '../components/RegisterModal';

interface ExecutivesProps {
  role: UserRole;
  language: Language;
  userId: string;
}

const ROLE_MAP: Record<number, string> = {
  0: 'HEAD',
  1: 'Executivo Líder',
  2: 'Executivo',
  3: 'Financeiro'
};

const Executives: React.FC<ExecutivesProps> = ({ role, language, userId }) => {
  const t = TRANSLATIONS[language];
  const [showModal, setShowModal] = useState(false);
  const [selectedExec, setSelectedExec] = useState<Executive | null>(null);
  
  const [executivesList, setExecutivesList] = useState<Executive[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchDocument, setSearchDocument] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchExecutives = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('executives').select('*');

      // Se for LÍDER, mostra apenas os executivos subordinados a ele
      if (role === UserRole.EXECUTIVO_LEADER) {
        query = query.eq('leader_id', userId);
      }

      if (searchName) {
        query = query.or(`full_name.ilike.%${searchName}%,company_name.ilike.%${searchName}%`);
      }

      const cleanDoc = searchDocument.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanDoc) {
        query = query.or(`cpf.eq.${cleanDoc},cnpj.eq.${cleanDoc},rg.ilike.%${cleanDoc}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedExecutives: Executive[] = (data || []).map((item: any) => ({
        id: item.id.toString(),
        name: item.full_name || item.company_name || 'Sem Nome',
        document: item.cpf || item.cnpj || '',
        email: item.email || '',
        role: ROLE_MAP[item.role as number] || 'Não definido'
      }));
      
      setExecutivesList(mappedExecutives);
    } catch (error) {
      console.error('Erro ao buscar executivos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutives();
  }, []);

  const handleOpenModal = (exec: Executive | null = null) => {
    setSelectedExec(exec);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    fetchExecutives();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-secondary font-display">{t.executives}</h2>
        <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center btn-primary-style">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          {t.register}
        </button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.name}</label>
          <input 
            type="text" 
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" 
            placeholder={t.placeholderSearch} 
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.document}</label>
          <input 
            type="text" 
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" 
            placeholder="CPF, CNPJ ou RG" 
            value={searchDocument}
            onChange={(e) => setSearchDocument(e.target.value)}
          />
        </div>
        <div className="flex items-end">
           <button onClick={fetchExecutives} className="w-full btn-secondary-style">{isLoading ? '...' : t.search}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.name}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.role}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {executivesList.map(exec => (
                <tr key={exec.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 text-secondary font-normal">{exec.name}</td>
                  <td className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-widest font-normal">{exec.role}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleOpenModal(exec)} className="text-secondary font-bold text-[10px] uppercase hover:underline tracking-widest">Detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <RegisterModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
          initialData={selectedExec}
          entityType="executive"
          language={language}
        />
      )}
    </div>
  );
};

export default Executives;