import React from 'react';

export interface BankAccountCardData {
  id: string;
  bankCode: string;
  bankName: string;
  agency: string;
  account: string;
  digit: string;
  type: string;
  pixKey?: string;
  pixType?: string;
  isActive: boolean;
  isValid: boolean;
}

interface BankAccountCardProps {
  account: BankAccountCardData;
  onToggle: (id: string) => void;
  onDelete: (account: BankAccountCardData) => void;
}

const BankAccountCard: React.FC<BankAccountCardProps> = ({ account, onToggle, onDelete }) => {
  return (
    <div className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between ${account.isActive ? 'bg-secondary/5 border-secondary/30 shadow-sm' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-100 font-black text-secondary text-sm shadow-sm">{account.bankCode}</div>
        <div>
          <p className="text-sm font-black text-secondary uppercase tracking-tight">{account.bankName}</p>
          {account.type !== 'Pix' && (
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest">AG: {account.agency} | CC: {account.account}-{account.digit} | {account.type}</p>
          )}
          {account.type === 'Pix' && account.pixKey && (
            <p className="text-[10px] font-black text-primary mt-2 flex items-center gap-2 uppercase"><span className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(47,84,160,0.5)]"></span> {account.pixType}: {account.pixKey}</p>
          )}
          <span className={`mt-2 inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase border ${account.isValid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
            {account.isValid ? 'Válido' : 'Inválido'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="flex flex-col items-end mr-2">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-tighter">{account.isActive ? 'ATIVO' : 'LATENTE'}</p>
          <div onClick={() => onToggle(account.id)} className={`w-12 h-6 rounded-full cursor-pointer transition-all relative ${account.isActive ? 'bg-green-500' : 'bg-gray-200 shadow-inner'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-md ${account.isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
          </div>
        </div>
        <button onClick={() => onDelete(account)} className="text-gray-300 hover:text-red-500 transition-colors p-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
      </div>
    </div>
  );
};

export default BankAccountCard;