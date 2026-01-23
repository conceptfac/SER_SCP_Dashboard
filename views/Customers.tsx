import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Language, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';
import RegisterModal from '../components/RegisterModal';

interface Customer {
  id: string;
  name: string;
  document: string;
  consultant: string;
  type: 'PF' | 'PJ';
  status: string;
  email: string;
  phone: string;
  contracts: string[];
  executive?: {
    id: string;
    name: string;
    document: string;
    email: string;
  };
}

interface CustomersProps {
  role: UserRole;
  language: Language;
  userId: string;
  userName: string;
  initialOpenId?: string;
  openTimestamp?: number;
}

const Customers: React.FC<CustomersProps> = ({ role, language, userId, userName, initialOpenId, openTimestamp }) => {
  const t = TRANSLATIONS[language];
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showExecutiveModal, setShowExecutiveModal] = useState(false);
  const [selectedExecutive, setSelectedExecutive] = useState<any | null>(null);
  const [handledInitialId, setHandledInitialId] = useState<string | null>(null);
  const [handledTimestamp, setHandledTimestamp] = useState<number>(0);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState(0);

  // Search states
  const [searchName, setSearchName] = useState('');
  const [searchDocument, setSearchDocument] = useState('');
  const [searchConsultant, setSearchConsultant] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select(`
          *,
          executives (
            id,
            full_name,
            cpf,
            cnpj,
            email
          )
        `)
        .order('register_date', { ascending: false });

      // Se não for HEAD, filtra apenas os clientes do executivo logado e esconde arquivados
      if (role !== UserRole.HEAD) {
        query = query.eq('executive_id', userId).neq('account_status', 'archived');
      }

      if (searchName) {
        query = query.or(`full_name.ilike.%${searchName}%,company_name.ilike.%${searchName}%`);
      }

      if (searchDocument) {
        const cleanDoc = searchDocument.replace(/\D/g, '');
        if (cleanDoc) {
           query = query.or(`cpf.eq.${cleanDoc},cnpj.eq.${cleanDoc}`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: Customer[] = (data || []).map((c: any) => ({
        id: c.id.toString(),
        name: c.customer_type === 'PJ' ? c.company_name : c.full_name,
        document: c.customer_type === 'PJ' ? c.cnpj : c.cpf,
        consultant: c.executives?.full_name || '-',
        type: c.customer_type,
        status: c.account_status || 'pending',
        email: c.email,
        phone: c.phone,
        contracts: [],
        executive: c.executives ? {
            id: c.executives.id,
            name: c.executives.full_name,
            document: c.executives.cpf || c.executives.cnpj || '',
            email: c.executives.email
        } : undefined
      }));

      // Filtro client-side para consultor se necessário (apenas para HEAD)
      const filtered = role === UserRole.HEAD && searchConsultant 
        ? mapped.filter(c => c.consultant.toLowerCase().includes(searchConsultant.toLowerCase()))
        : mapped;

      setCustomers(filtered);

    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [role, userId]);

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedCustomers = React.useMemo(() => {
    if (!sortConfig.key) return customers;

    return [...customers].sort((a, b) => {
      let aVal = '';
      let bVal = '';

      if (sortConfig.key === 'name') { aVal = a.name?.toLowerCase() || ''; bVal = b.name?.toLowerCase() || ''; }
      else if (sortConfig.key === 'executive') { aVal = a.executive?.name?.toLowerCase() || ''; bVal = b.executive?.name?.toLowerCase() || ''; }
      else if (sortConfig.key === 'status') { aVal = a.status?.toLowerCase() || ''; bVal = b.status?.toLowerCase() || ''; }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, sortConfig]);

  useEffect(() => {
    if (initialOpenId && customers.length > 0) {
      if (openTimestamp && openTimestamp !== handledTimestamp) {
        const target = customers.find(c => c.id === initialOpenId);
        if (target) {
          handleOpenModal(target);
          setHandledTimestamp(openTimestamp);
        }
      } else if (!openTimestamp && initialOpenId !== handledInitialId) {
        const target = customers.find(c => c.id === initialOpenId);
        if (target) {
          handleOpenModal(target);
          setHandledInitialId(initialOpenId);
        }
      }
    }

    if (pendingOpenId && customers.length > 0) {
      const target = customers.find(c => c.id.toString() === pendingOpenId.toString());
      if (target) {
        handleOpenModal(target, 2);
        setPendingOpenId(null);
      }
    }
  }, [initialOpenId, customers, handledInitialId, openTimestamp, handledTimestamp, pendingOpenId]);

  const handleOpenModal = (customer: Customer | null = null, tabIndex: number = 0) => {
    setSelectedCustomer(customer);
    setModalTab(tabIndex);
    setShowModal(true);
  };

  const handleOpenExecutiveModal = (executive: any) => {
    setSelectedExecutive(executive);
    setShowExecutiveModal(true);
  };

  const handleModalSuccess = (data?: { id: string, isNew: boolean }) => {
    setShowModal(false);
    fetchCustomers();
    if (data?.isNew && data.id) {
      setPendingOpenId(data.id.toString());
    }
  };

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

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-secondary font-display">{t.search} {t.customers}</h2>
        <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center btn-primary-style">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          {t.register}
        </button>
      </div>

      <div className={`bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 ${role === UserRole.HEAD ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
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
            placeholder="000.000.000-00" 
            value={searchDocument}
            onChange={(e) => setSearchDocument(e.target.value)}
          />
        </div>
        {role === UserRole.HEAD && (
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.consultant}</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" 
              placeholder={t.searchExec} 
              value={searchConsultant}
              onChange={(e) => setSearchConsultant(e.target.value)}
            />
          </div>
        )}
        <div className="flex items-end">
           <button onClick={fetchCustomers} className="w-full btn-secondary-style">{isLoading ? '...' : t.search}</button>
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
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.document}</th>
                {role === UserRole.HEAD && (
                   <th onClick={() => handleSort('executive')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-secondary select-none group">
                     <div className="flex items-center gap-1">
                       Executivo
                       {sortConfig.key === 'executive' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                     </div>
                   </th>
                )}
                <th onClick={() => handleSort('status')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right cursor-pointer hover:text-secondary select-none group">
                  <div className="flex items-center justify-end gap-1">
                    {t.status}
                    {sortConfig.key === 'status' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-secondary font-normal">
                    <button onClick={() => handleOpenModal(customer)} className="font-bold hover:text-primary hover:underline text-left">
                      {customer.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-normal text-secondary">{customer.document}</td>
                  {role === UserRole.HEAD && (
                    <td className="px-6 py-4">
                      {customer.executive ? (
                        <button 
                          onClick={() => handleOpenExecutiveModal(customer.executive)}
                          className="text-secondary font-bold text-[10px] hover:text-primary hover:underline uppercase tracking-widest"
                        >
                          {customer.executive.name}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[10px] uppercase tracking-widest">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getStatusColor(customer.status)}`}>
                       {t[customer.status as keyof typeof t] || customer.status}
                     </span>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <RegisterModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
          initialData={selectedCustomer}
          entityType="client"
          language={language}
          userRole={role}
          currentUserId={userId}
          currentUserName={userName}
          initialTab={modalTab}
        />
      )}

      {showExecutiveModal && (
        <RegisterModal
          isOpen={showExecutiveModal}
          onClose={() => setShowExecutiveModal(false)}
          onSuccess={() => {
            setShowExecutiveModal(false);
            fetchCustomers();
          }}
          initialData={selectedExecutive}
          entityType="executive"
          language={language}
          userRole={role}
        />
      )}
    </div>
  );
};

export default Customers;