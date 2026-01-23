import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Executive, Language, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';
import RegisterModal from '../components/RegisterModal';

interface ExecutiveDisplay {
  id: string;
  name: string;
  document: string;
  email: string;
  role: string;
  status: string;
}

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
  const [selectedExec, setSelectedExec] = useState<ExecutiveDisplay | null>(null);
  
  const [executivesList, setExecutivesList] = useState<ExecutiveDisplay[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchDocument, setSearchDocument] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'denied': return 'bg-red-100 text-red-700 border-red-200';
      case 'archiving': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'archived': return 'bg-gray-900 text-white border-gray-900';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  const fetchExecutives = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('executives').select('*');

      // Se for LÍDER, mostra apenas os executivos subordinados a ele
      if (role === UserRole.EXECUTIVO_LEADER) {
        query = query.eq('leader_id', userId);
      }

      // Se não for HEAD, esconde arquivados
      if (role !== UserRole.HEAD) {
        query = query.neq('account_status', 'archived');
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

      const mappedExecutives: ExecutiveDisplay[] = (data || []).map((item: any) => ({
        id: item.id.toString(),
        name: item.full_name || item.company_name || 'Sem Nome',
        document: item.cpf || item.cnpj || '',
        email: item.email || '',
        role: ROLE_MAP[item.role as number] || 'Não definido',
        status: item.account_status || 'pending'
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

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedExecutives = React.useMemo(() => {
    if (!sortConfig.key) return executivesList;

    return [...executivesList].sort((a, b) => {
      let aVal = '';
      let bVal = '';

      if (sortConfig.key === 'name') { aVal = a.name?.toLowerCase() || ''; bVal = b.name?.toLowerCase() || ''; }
      else if (sortConfig.key === 'role') { aVal = a.role?.toLowerCase() || ''; bVal = b.role?.toLowerCase() || ''; }
      else if (sortConfig.key === 'status') { aVal = a.status?.toLowerCase() || ''; bVal = b.status?.toLowerCase() || ''; }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [executivesList, sortConfig]);

  const handleOpenModal = (exec: ExecutiveDisplay | null = null) => {
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
                <th onClick={() => handleSort('name')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-secondary select-none group">
                  <div className="flex items-center gap-1">
                    {t.name}
                    {sortConfig.key === 'name' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th onClick={() => handleSort('role')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-secondary select-none group">
                  <div className="flex items-center gap-1">
                    {t.role}
                    {sortConfig.key === 'role' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
                <th onClick={() => handleSort('status')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right cursor-pointer hover:text-secondary select-none group">
                  <div className="flex items-center justify-end gap-1">
                    {t.status}
                    {sortConfig.key === 'status' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedExecutives.map(exec => (
                <tr key={exec.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 text-secondary font-normal">
                    <button onClick={() => handleOpenModal(exec)} className="font-bold hover:text-primary hover:underline text-left">
                      {exec.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-primary uppercase tracking-widest font-normal">{exec.role}</td>
                  <td className="px-6 py-4 text-right">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getStatusColor(exec.status)}`}>
                       {t[exec.status as keyof typeof t] || exec.status}
                     </span>
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
          userRole={role}
        />
      )}
    </div>
  );
};

export default Executives;