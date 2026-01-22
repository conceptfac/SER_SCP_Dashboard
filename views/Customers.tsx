import React from 'react';
import { Language, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';

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
}

interface CustomersProps {
  role: UserRole;
  language: Language;
}

const Customers: React.FC<CustomersProps> = ({ role, language }) => {
  const t = TRANSLATIONS[language];

  const customers: Customer[] = [
    { id: '1', name: 'Fulano da Silva Sauro', document: '123.456.789-00', consultant: 'João Silva', type: 'PF', status: 'Pendente', email: 'fulano@example.com', phone: '11 99999-8888', contracts: [] },
    { id: '2', name: 'Tech Solutions LTDA', document: '12.345.678/0001-99', consultant: 'Maria Santos', type: 'PJ', status: 'Apto', email: 'contato@tech.com', phone: '11 4444-3333', contracts: ['CTR-29382'] },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Apto': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pendente': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Não Apto': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-secondary font-display">{t.search} {t.customers}</h2>
        <button className="w-full sm:w-auto flex items-center justify-center btn-primary-style">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          {t.register}
        </button>
      </div>

      <div className={`bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 ${role === UserRole.HEAD ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.name}</label>
          <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" placeholder={t.placeholderSearch} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.document}</label>
          <input 
            type="text" 
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" 
            placeholder="000.000.000-00" 
          />
        </div>
        {role === UserRole.HEAD && (
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.consultant}</label>
            <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" placeholder={t.searchExec} />
          </div>
        )}
        <div className="flex items-end">
           <button className="w-full btn-secondary-style">{t.search}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.name}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.document}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.status}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-secondary font-normal">{customer.name}</td>
                  <td className="px-6 py-4 text-sm font-normal text-secondary">{customer.document}</td>
                  <td className="px-6 py-4">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getStatusColor(customer.status)}`}>{customer.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-secondary font-bold text-[10px] uppercase tracking-widest">Detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Customers;