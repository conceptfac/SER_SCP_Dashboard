import React, { useState, useMemo } from 'react';
import { Contract, Language, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';
import CreateContractModal from '../components/CreateContractModal';

interface ContractsProps {
  role: UserRole;
  language: Language;
}

const Contracts: React.FC<ContractsProps> = ({ role, language }) => {
  const t = TRANSLATIONS[language];
  const [showModal, setShowModal] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [consultantName, setConsultantName] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });

  // Helper de formatação apenas para a tabela
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const contracts: Contract[] = [
    { id: '1', number: 'CTR-2024-001', status: 'Vigente', amount: 50000, rate: 1.5, months: 12, startDate: '2024-01-01', endDate: '2025-01-01', clientName: 'Fulano da Silva', executiveName: 'Consultor Master' },
  ];

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedContracts = useMemo(() => {
    if (!sortConfig.key) return contracts;

    return [...contracts].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortConfig.key === 'status') { aVal = a.status; bVal = b.status; }
      else if (sortConfig.key === 'amount') { aVal = a.amount; bVal = b.amount; }
      else if (sortConfig.key === 'rate') { aVal = a.rate; bVal = b.rate; }
      else if (sortConfig.key === 'months') { aVal = a.months; bVal = b.months; }
      else if (sortConfig.key === 'startDate') { aVal = a.startDate; bVal = b.startDate; }
      else if (sortConfig.key === 'clientName') { aVal = a.clientName; bVal = b.clientName; }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [contracts, sortConfig]);

  const handleSearch = () => {
    console.log('Pesquisando contratos:', { searchTerm, contractNumber, customerName, consultantName });
    // Aqui você implementaria a lógica real de busca
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-display font-bold text-secondary tracking-tight">{t.contracts}</h2>
        {role !== UserRole.CLIENTE && (
          <button 
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto px-6 py-2.5 bg-buttons text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            {t.createContract}
          </button>
        )}
      </div>

      {/* Painel de Pesquisa */}
      <div className={`bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 ${role === UserRole.HEAD ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Número do Contrato</label>
          <input 
            type="text" 
            value={contractNumber}
            onChange={(e) => setContractNumber(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" 
            placeholder="CTR-0000-000" 
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Nome do Cliente</label>
          <input 
            type="text" 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" 
            placeholder="Nome do cliente" 
          />
        </div>
        {role === UserRole.HEAD && (
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Consultor</label>
            <input 
              type="text" 
              value={consultantName}
              onChange={(e) => setConsultantName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" 
              placeholder="Nome do consultor" 
            />
          </div>
        )}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Status</label>
          <select 
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="Vigente">Vigente</option>
            <option value="Encerrado">Encerrado</option>
            <option value="Cancelado">Cancelado</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button 
            onClick={handleSearch}
            className="w-full btn-secondary-style"
          >
            {t.search}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 font-display">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.number}</th>
              <th onClick={() => handleSort('status')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-secondary select-none group">
                <div className="flex items-center gap-1">
                  {t.status}
                  {sortConfig.key === 'status' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>
              <th onClick={() => handleSort('amount')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-secondary select-none group">
                <div className="flex items-center gap-1">
                  {t.amount}
                  {sortConfig.key === 'amount' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>
              <th onClick={() => handleSort('rate')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-secondary select-none group">
                <div className="flex items-center gap-1">
                  {t.rate} (%)
                  {sortConfig.key === 'rate' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>
              <th onClick={() => handleSort('months')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-secondary select-none group">
                <div className="flex items-center gap-1">
                  {t.months}
                  {sortConfig.key === 'months' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>
              <th onClick={() => handleSort('startDate')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-secondary select-none group">
                <div className="flex items-center gap-1">
                  {t.startDate}
                  {sortConfig.key === 'startDate' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>
              <th onClick={() => handleSort('clientName')} className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-secondary select-none group">
                <div className="flex items-center gap-1">
                  {t.client}
                  {sortConfig.key === 'clientName' && <span className="text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedContracts.map(contract => (
              <tr key={contract.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-secondary font-normal">{contract.number}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-green-100 text-green-700 border-green-200`}>
                    {contract.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-primary font-display">{formatCurrency(contract.amount)}</td>
                <td className="px-6 py-4 text-sm font-semibold">{contract.rate}%</td>
                <td className="px-6 py-4 text-sm">{contract.months}m</td>
                <td className="px-6 py-4 text-sm text-gray-400">{contract.startDate}</td>
                <td className="px-6 py-4 text-sm font-medium">{contract.clientName}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-secondary font-bold text-[10px] hover:underline uppercase tracking-widest px-4 py-2 bg-gray-50 rounded-lg">
                    VISUALIZAR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateContractModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        language={language} 
      />
    </div>
  );
};

export default Contracts;