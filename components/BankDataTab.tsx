import React from 'react';
import BankAccountCard, { BankAccountCardData } from './BankAccountCard';

interface BankDataTabProps {
  bankAccounts: BankAccountCardData[];
  isReadOnly: boolean;
  onAddBank: () => void;
  onToggleBank: (id: string) => void;
  onDeleteBank: (account: BankAccountCardData) => void;
  onEditBank: (account: BankAccountCardData) => void;
}

const BankDataTab: React.FC<BankDataTabProps> = ({
  bankAccounts,
  isReadOnly,
  onAddBank,
  onToggleBank,
  onDeleteBank,
  onEditBank
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-secondary uppercase tracking-widest">Instituições Conectadas</h4>
        <button 
          onClick={onAddBank} 
          disabled={isReadOnly} 
          className={`flex items-center gap-2 px-6 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold shadow-xl hover:opacity-95 transform transition-all hover:-translate-y-0.5 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          ADICIONAR BANCO
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {bankAccounts.map(acc => (
          <BankAccountCard
            key={acc.id}
            account={acc}
            onToggle={onToggleBank}
            onDelete={onDeleteBank}
            onEdit={onEditBank}
          />
        ))}
        {bankAccounts.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm font-bold uppercase tracking-widest">
            Nenhuma conta bancária encontrada
          </div>
        )}
      </div>
    </div>
  );
};

export default BankDataTab;