import React, { useState } from 'react';
import { BANKS } from '../constants';

export interface NewBankData {
  bankCode: string;
  agency: string;
  account: string;
  digit: string;
  kind: string;
  pixType: string;
  pixKey: string;
}

interface AddBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewBankData) => void;
  holderName: string;
  isLoading: boolean;
}

const AddBankModal: React.FC<AddBankModalProps> = ({ isOpen, onClose, onSave, holderName, isLoading }) => {
  const [formData, setFormData] = useState<NewBankData>({
    bankCode: '001',
    agency: '',
    account: '',
    digit: '',
    kind: 'Corrente',
    pixType: 'CPF/CNPJ',
    pixKey: ''
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-2xl font-bold text-secondary uppercase tracking-tighter font-display">Nova Entidade Financeira</h4>
            <button onClick={onClose} className="text-gray-400 hover:text-secondary transition-colors"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Instituição Bancária (*)</label>
              <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold text-secondary shadow-inner" value={formData.bankCode} onChange={(e) => setFormData({...formData, bankCode: e.target.value})}>
                {BANKS.map(bank => <option key={bank.code} value={bank.code}>{bank.code} - {bank.name}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Agência</label>
                <input type="text" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner text-secondary" placeholder="0000" value={formData.agency} onChange={(e) => setFormData({...formData, agency: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Conta e Dígito</label>
                <div className="flex gap-2">
                  <input type="text" className="flex-1 px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner text-secondary" placeholder="000000" value={formData.account} onChange={(e) => setFormData({...formData, account: e.target.value})} />
                  <input type="text" maxLength={3} className="w-20 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner text-center text-secondary" placeholder="D" value={formData.digit} onChange={(e) => setFormData({...formData, digit: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Tipo de Conta</label>
                <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner text-secondary" value={formData.kind} onChange={(e) => setFormData({...formData, kind: e.target.value})}>
                  <option>Corrente</option><option>Poupança</option><option>Conjunta</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Titular da Conta (*)</label>
                <input type="text" className="w-full px-5 py-3 bg-gray-200 border border-gray-100 rounded-2xl outline-none text-sm font-bold cursor-not-allowed opacity-60 text-secondary" disabled value={holderName} />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-50">
               <h5 className="text-[10px] font-bold text-secondary uppercase mb-4 tracking-widest flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full"></span> Conectar Chave Pix (Opcional)</h5>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <select className="px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner text-secondary" value={formData.pixType} onChange={(e) => setFormData({...formData, pixType: e.target.value})}>
                   <option>CPF / CNPJ</option><option>E-mail</option><option>Celular</option><option>Chave Aleatória</option>
                 </select>
                 <input type="text" className="px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner text-secondary" placeholder="Insira a chave pix" value={formData.pixKey} onChange={(e) => setFormData({...formData, pixKey: e.target.value})} />
               </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <button onClick={onClose} className="px-8 py-3 text-xs font-black text-bodyText hover:text-secondary uppercase tracking-widest transition-colors">DESCARTAR</button>
            <button onClick={() => onSave(formData)} disabled={isLoading} className="px-12 py-3 bg-secondary text-white rounded-2xl text-xs font-black shadow-2xl hover:opacity-95 uppercase tracking-widest transition-all">{isLoading ? 'SALVANDO...' : 'CONCLUIR ADIÇÃO'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBankModal;