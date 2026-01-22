import React, { useState, useEffect } from 'react';
import { BANKS, TRANSLATIONS } from '../constants';
import { Language } from '../types';
import { BankAccountCardData } from './BankAccountCard';

export interface NewBankData {
  bankCode: string;
  agency: string;
  account: string;
  digit: string;
  kind: string;
  pixType: string;
  pixKey: string;
  holderName: string;
  accountType: 'BANK' | 'PIX';
}

interface AddBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewBankData) => void;
  holderName: string;
  isLoading: boolean;
  language: Language;
  existingAccounts: BankAccountCardData[];
  initialData?: NewBankData;
}

const AddBankModal: React.FC<AddBankModalProps> = ({ isOpen, onClose, onSave, holderName, isLoading, language, existingAccounts, initialData }) => {
  const t = TRANSLATIONS[language];
  const [isBank, setIsBank] = useState(true);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<NewBankData>({
    bankCode: '001',
    agency: '',
    account: '',
    digit: '',
    kind: 'Corrente',
    pixType: 'CPF/CNPJ',
    pixKey: '',
    holderName: holderName,
    accountType: 'BANK'
  });

  if (!isOpen) return null;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setIsBank(initialData.accountType === 'BANK');
        setFormData(initialData);
      } else {
        setIsBank(true);
        setFormData({
          bankCode: '001',
          agency: '',
          account: '',
          digit: '',
          kind: 'Corrente',
          pixType: 'CPF/CNPJ',
          pixKey: '',
          holderName: holderName,
          accountType: 'BANK'
        });
      }
      setGeneralError('');
      setFieldErrors({});
    }
  }, [isOpen, initialData, holderName]);

  const handleSaveClick = () => {
    setGeneralError('');
    const errors: Record<string, boolean> = {};
    let hasError = false;

    if (isBank) {
      if (!formData.bankCode) { errors.bankCode = true; hasError = true; }
      if (!formData.agency) { errors.agency = true; hasError = true; }
      if (!formData.account) { errors.account = true; hasError = true; }
      if (!formData.kind) { errors.kind = true; hasError = true; }
      if (!formData.holderName) { errors.holderName = true; hasError = true; }

      const isDuplicate = existingAccounts.some(acc => 
        // Se estiver editando (initialData existe) e os campos chave não mudaram, não é duplicata
        (!initialData || (initialData.bankCode !== formData.bankCode || initialData.agency !== formData.agency || initialData.account !== formData.account)) &&
        acc.type !== 'Pix' && 
        acc.bankCode === formData.bankCode && 
        acc.agency === formData.agency && 
        acc.account === formData.account
      );
      if (isDuplicate) {
        setGeneralError('Esta conta bancária já está cadastrada para este usuário.');
        return;
      }
    } else {
      if (!formData.pixType) { errors.pixType = true; hasError = true; }
      if (!formData.pixKey) { errors.pixKey = true; hasError = true; }

      const isDuplicate = existingAccounts.some(acc => 
        (!initialData || initialData.pixKey !== formData.pixKey) &&
        acc.type === 'Pix' && 
        acc.pixKey === formData.pixKey
      );
      if (isDuplicate) {
        setGeneralError('Esta chave Pix já está cadastrada para este usuário.');
        return;
      }
    }

    setFieldErrors(errors);

    if (!hasError) {
      onSave({ ...formData, accountType: isBank ? 'BANK' : 'PIX' });
    }
  };

  const getInputClass = (fieldName: string) => {
    return `w-full px-5 py-3 bg-gray-50 border rounded-2xl outline-none text-sm font-bold text-secondary shadow-inner transition-all ${
      fieldErrors[fieldName] ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-100'
    }`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-2xl font-bold text-secondary uppercase tracking-tighter font-display">{initialData ? 'Editar Entidade Financeira' : 'Nova Entidade Financeira'}</h4>
            <button onClick={onClose} className="text-gray-400 hover:text-secondary transition-colors">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          {generalError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
              {generalError}
            </div>
          )}

          <div className="flex p-1 bg-gray-100 rounded-xl mb-8 w-full sm:w-fit">
            <button onClick={() => setIsBank(true)} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${isBank ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
              BANCO
            </button>
            <button onClick={() => setIsBank(false)} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isBank ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
              PIX
            </button>
          </div>

          <div className="space-y-6">
            {isBank ? (
              <>
                <div>
                  <label className={`block text-[10px] font-bold uppercase mb-2 tracking-widest ${fieldErrors.bankCode ? 'text-red-500' : 'text-gray-400'}`}>
                    Instituição Bancária (*)
                  </label>
                  <select className={getInputClass('bankCode')} value={formData.bankCode} onChange={(e) => setFormData({...formData, bankCode: e.target.value})}>
                    {BANKS.map(bank => <option key={bank.code} value={bank.code}>{bank.code} - {bank.name}</option>)}
                  </select>
                  {fieldErrors.bankCode && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Campo obrigatório</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-2 tracking-widest ${fieldErrors.agency ? 'text-red-500' : 'text-gray-400'}`}>Agência (*)</label>
                    <input type="text" className={getInputClass('agency')} placeholder="0000" value={formData.agency} onChange={(e) => setFormData({...formData, agency: e.target.value})} />
                    {fieldErrors.agency && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Campo obrigatório</p>}
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-2 tracking-widest ${fieldErrors.account ? 'text-red-500' : 'text-gray-400'}`}>Conta e Dígito (*)</label>
                    <div className="flex gap-2">
                      <input type="text" className={`flex-1 px-5 py-3 bg-gray-50 border rounded-2xl outline-none text-sm font-bold shadow-inner text-secondary transition-all ${fieldErrors.account ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-100'}`} placeholder="000000" value={formData.account} onChange={(e) => setFormData({...formData, account: e.target.value})} />
                      <input type="text" maxLength={3} className="w-20 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner text-center text-secondary" placeholder="D" value={formData.digit} onChange={(e) => setFormData({...formData, digit: e.target.value})} />
                    </div>
                    {fieldErrors.account && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Campo obrigatório</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-2 tracking-widest ${fieldErrors.kind ? 'text-red-500' : 'text-gray-400'}`}>Tipo de Conta (*)</label>
                    <select className={getInputClass('kind')} value={formData.kind} onChange={(e) => setFormData({...formData, kind: e.target.value})}>
                      <option>Corrente</option><option>Poupança</option><option>Conjunta</option>
                    </select>
                    {fieldErrors.kind && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Campo obrigatório</p>}
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-2 tracking-widest ${fieldErrors.holderName ? 'text-red-500' : 'text-gray-400'}`}>Titular da Conta (*)</label>
                    <input type="text" className={getInputClass('holderName')} placeholder="Nome do titular" value={formData.holderName} onChange={(e) => setFormData({...formData, holderName: e.target.value})} />
                    {fieldErrors.holderName && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Campo obrigatório</p>}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <h5 className="text-[10px] font-bold text-secondary uppercase mb-4 tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span> Conectar Chave Pix
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <select className={getInputClass('pixType')} value={formData.pixType} onChange={(e) => setFormData({...formData, pixType: e.target.value})}>
                      <option>CPF / CNPJ</option><option>E-mail</option><option>Celular</option><option>Chave Aleatória</option>
                    </select>
                    {fieldErrors.pixType && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Campo obrigatório</p>}
                  </div>
                  <div>
                    <input type="text" className={getInputClass('pixKey')} placeholder="Insira a chave pix" value={formData.pixKey} onChange={(e) => setFormData({...formData, pixKey: e.target.value})} />
                    {fieldErrors.pixKey && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Campo obrigatório</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <button onClick={onClose} className="px-8 py-3 text-xs font-black text-bodyText hover:text-secondary uppercase tracking-widest transition-colors">DESCARTAR</button>
            <button onClick={handleSaveClick} disabled={isLoading} className="px-12 py-3 bg-secondary text-white rounded-2xl text-xs font-black shadow-2xl hover:opacity-95 uppercase tracking-widest transition-all">
              {isLoading ? 'SALVANDO...' : (initialData ? t.save : t.register)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBankModal;