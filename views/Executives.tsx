import React, { useState } from 'react';
import { Executive, Language, UserRole } from '../types';
import { TRANSLATIONS, BANKS, BRAZILIAN_STATES } from '../constants';
import DatePicker from '../components/DatePicker';

interface BankAccount {
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
}

interface UploadedDocument {
  id: string;
  type: string;
  category: string;
  name: string;
  date: string;
  status: 'Ativo' | 'Pendente' | 'Rejeitado';
}

interface ExecutivesProps {
  role: UserRole;
  language: Language;
}

const Executives: React.FC<ExecutivesProps> = ({ role, language }) => {
  const t = TRANSLATIONS[language];
  const [showModal, setShowModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [selectedExec, setSelectedExec] = useState<Executive | null>(null);
  const [cepError, setCepError] = useState(false);
  const [docError, setDocError] = useState(false);
  const [cnpjError, setCnpjError] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  
  const TABS = [t.general, t.address, t.bankData, t.documents];
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
    { id: '1', bankCode: '341', bankName: 'Itaú Unibanco S.A.', agency: '0102', account: '12345', digit: '6', type: 'Corrente', isActive: true, pixKey: 'exec@pix.com', pixType: 'E-mail' },
    { id: '2', bankCode: '001', bankName: 'Banco do Brasil S.A.', agency: '4321', account: '98765', digit: 'X', type: 'Corrente', isActive: false },
    { id: '3', bankCode: '260', bankName: 'Nu Pagamentos S.A. (Nubank)', agency: '0001', account: '665544', digit: '2', type: 'Corrente', isActive: false }
  ]);

  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([
    { id: '1', type: 'RG', category: 'Identidade', name: 'identidade_joao.pdf', date: '10/06/2024 09:00', status: 'Ativo' }
  ]);

  const [formData, setFormData] = useState({ 
    name: '', document: '', email: '', birthDate: '', rg: '', phone: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    razaoSocial: '', cnpj: ''
  });

  const validateCPF = (cpf: string) => {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(10, 11))) return false;
    return true;
  };

  const validateCNPJ = (cnpj: string) => {
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14 || !!cnpj.match(/(\d)\1{13}/)) return false;
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    const digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    return true;
  };

  const executives: Executive[] = [
    { id: '1', name: 'João Silva', document: '111.222.333-44', email: 'joao@ser.com', role: 'Executivo Leader' },
  ];

  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14);
  const maskCNPJ = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);
  const maskCEP = (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const maskedValue = maskCEP(e.target.value);
    
    setFormData(prev => ({ ...prev, cep: maskedValue }));
    setCepError(false);

    if (rawValue.length === 8) {
      setIsSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${rawValue}/json/`);
        const data = await response.json();
        
        if (data.erro) {
          setCepError(true);
        } else {
          setFormData(prev => ({
            ...prev,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        setCepError(true);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleToggleBank = (id: string) => {
    setBankAccounts(bankAccounts.map(acc => ({
      ...acc,
      isActive: acc.id === id
    })));
  };

  const handleOpenModal = (exec: Executive | null = null) => {
    setSelectedExec(exec);
    setActiveTabIndex(0);
    setCepError(false);
    setDocError(false);
    setCnpjError(false);
    if (exec) {
      setFormData({
        ...formData, 
        name: exec.name, 
        document: exec.document, 
        email: exec.email,
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''
      });
    } else {
      setFormData({
        name: '', document: '', email: '', birthDate: '', rg: '', phone: '',
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
        razaoSocial: '', cnpj: ''
      });
    }
    setShowModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-secondary font-display">{t.executives}</h2>
        <button onClick={() => handleOpenModal()} className="w-full sm:w-auto px-6 py-2.5 bg-buttons text-white rounded-xl font-bold hover:opacity-90 shadow-lg flex items-center justify-center gap-2 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          {t.register}
        </button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.name}</label>
          <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm" placeholder={t.placeholderSearch} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.document}</label>
          <input 
            type="text" 
            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm" 
            placeholder="000.000.000-00" 
            onChange={(e) => { e.target.value = maskCPF(e.target.value) }}
          />
        </div>
        <div className="flex items-end">
           <button className="w-full bg-secondary text-white font-bold py-2 rounded-lg hover:opacity-90 transition-all shadow-sm">{t.search}</button>
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
              {executives.map(exec => (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-secondary/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[95vh] overflow-y-auto sm:rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col font-sans">
            <div className="p-8 flex-1">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-secondary uppercase tracking-tighter font-display">{TABS[activeTabIndex]}</h3>
                  <p className="text-sm text-bodyText font-bold">{selectedExec?.name || t.register}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-secondary rounded-full w-9 h-9 flex items-center justify-center transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="flex gap-8 border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
                {TABS.map((tab, idx) => (
                  <button key={tab} onClick={() => setActiveTabIndex(idx)} className={`pb-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTabIndex === idx ? 'text-secondary border-secondary' : 'text-gray-400 border-transparent hover:text-secondary/60'}`}>
                    {tab}
                  </button>
                ))}
              </div>

              <div className="min-h-[400px]">
                {activeTabIndex === 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Completo (*)</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <DatePicker label="Nascimento (*)" value={formData.birthDate} onChange={(d) => setFormData({...formData, birthDate: d})} language={language} />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-[10px] font-bold uppercase mb-1 ${docError ? 'text-red-500' : 'text-gray-400'}`}>CPF (*)</label>
                        <input 
                          type="text" 
                          className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none shadow-inner transition-all ${docError ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-secondary/20'}`} 
                          value={formData.document} 
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            const val = maskCPF(e.target.value);
                            setFormData({...formData, document: val});
                            if (raw.length === 11) setDocError(!validateCPF(raw));
                            else setDocError(false);
                          }} 
                        />
                        {docError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Documento inválido</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado Civil</label>
                        <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-sm font-bold" value={formData.estadoCivil} onChange={(e) => setFormData({...formData, estadoCivil: e.target.value})}>
                          <option value="">Selecione...</option>
                          <option>Solteiro(a)</option>
                          <option>Casado(a)</option>
                          <option>Divorciado(a)</option>
                          <option>Viúvo(a)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">RG</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner" value={formData.rg} onChange={(e) => setFormData({...formData, rg: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail (*)</label>
                        <input type="email" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTabIndex === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-[10px] font-bold uppercase mb-1 ${cepError ? 'text-red-500' : 'text-gray-400'}`}>
                          CEP {isSearchingCep && <span className="animate-pulse ml-1 text-primary lowercase">(buscando...)</span>}
                        </label>
                        <input 
                          type="text" 
                          className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none shadow-inner transition-all ${cepError ? 'border-red-500' : 'border-gray-100 focus:border-secondary/30'}`} 
                          value={formData.cep}
                          onChange={handleCEPChange}
                          placeholder="00000-000"
                        />
                        {cepError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">CEP inválido</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Logradouro (*)</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner" 
                          value={formData.logradouro}
                          onChange={(e) => setFormData({...formData, logradouro: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Razão Social (*)</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner" 
                          value={formData.razaoSocial}
                          onChange={(e) => setFormData({...formData, razaoSocial: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-bold uppercase mb-1 ${cnpjError ? 'text-red-500' : 'text-gray-400'}`}>CNPJ (*)</label>
                        <input 
                          type="text" 
                          className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none shadow-inner transition-all ${cnpjError ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-secondary/20'}`} 
                          value={formData.cnpj}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            const val = maskCNPJ(e.target.value);
                            setFormData({...formData, cnpj: val});
                            if (raw.length === 14) setCnpjError(!validateCNPJ(raw));
                            else setCnpjError(false);
                          }}
                        />
                        {cnpjError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Documento inválido</p>}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cidade (*)</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner" 
                          value={formData.cidade}
                          onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado (*)</label>
                        <select 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-sm font-bold"
                          value={formData.estado}
                          onChange={(e) => setFormData({...formData, estado: e.target.value})}
                        >
                          <option value="">Selecione...</option>
                          {BRAZILIAN_STATES.map(state => (
                            <option key={state.value} value={state.value}>{state.value} - {state.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTabIndex === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-secondary uppercase tracking-widest">Instituições Conectadas</h4>
                      <button onClick={() => setShowAddBankModal(true)} className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold shadow-xl hover:opacity-95 transform transition-all hover:-translate-y-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                        ADICIONAR BANCO
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {bankAccounts.map(acc => (
                        <div key={acc.id} className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between ${acc.isActive ? 'bg-secondary/5 border-secondary/30 shadow-sm' : 'bg-white border-gray-100'}`}>
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-100 font-black text-secondary text-sm shadow-sm">{acc.bankCode}</div>
                            <div>
                              <p className="text-sm font-black text-secondary uppercase tracking-tight">{acc.bankName}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest">AG: {acc.agency} | CC: {acc.account}-{acc.digit} | {acc.type}</p>
                              {acc.pixKey && <p className="text-[10px] font-black text-primary mt-2 flex items-center gap-2 uppercase"><span className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(47,84,160,0.5)]"></span> PIX Ativo: {acc.pixKey}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-5">
                            <div className="flex flex-col items-end mr-2">
                              <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-tighter">{acc.isActive ? 'ATIVO' : 'LATENTE'}</p>
                              <div onClick={() => handleToggleBank(acc.id)} className={`w-12 h-6 rounded-full cursor-pointer transition-all relative ${acc.isActive ? 'bg-green-500' : 'bg-gray-200 shadow-inner'}`}>
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-md ${acc.isActive ? 'left-6.5' : 'left-0.5'}`}></div>
                              </div>
                            </div>
                            <button className="text-gray-300 hover:text-red-500 transition-colors p-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTabIndex === 3 && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="p-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-secondary mb-4 shadow-sm">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                      </div>
                      <h4 className="text-sm font-black text-secondary uppercase tracking-[0.1em] mb-2">Central de Arquivos do Executivo</h4>
                      <p className="text-[11px] text-bodyText mb-8 max-w-lg">Anexe os documentos necessários para validação do perfil executivo.</p>
                      
                      <div className="w-full max-xl flex flex-col sm:flex-row gap-4 items-center">
                        <select className="w-full flex-1 px-5 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none text-[11px] font-black uppercase tracking-widest shadow-sm appearance-none cursor-pointer">
                          <optgroup label="Documento de Identidade * Obrigatório">
                            <option value="RG">RG</option>
                            <option value="CPF">CPF</option>
                            <option value="CNH">CNH</option>
                            <option value="CIN">CIN</option>
                            <option value="Passaporte">Passaporte</option>
                          </optgroup>
                          <optgroup label="Comprovante de Residência * Obrigatório">
                            <option value="Residencia">Comprovante de Residência</option>
                          </optgroup>
                        </select>
                        <button className="w-full sm:w-auto px-12 py-3.5 bg-secondary text-white text-[10px] font-black rounded-2xl shadow-2xl hover:opacity-95 uppercase tracking-[0.2em] transition-all transform hover:-translate-y-1">ANEXAR</button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Histórico de Arquivos</h4>
                      <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                              <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Arquivo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {uploadedDocs.map(doc => (
                                <tr key={doc.id} className="hover:bg-gray-50/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <span className="text-[10px] font-black text-primary uppercase">{doc.category}</span>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-black text-secondary">{doc.type}</td>
                                  <td className="px-6 py-4 text-[11px] text-bodyText font-bold">{doc.name}</td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${doc.status === 'Ativo' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                      {doc.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button className="p-2 text-secondary hover:bg-secondary/10 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end gap-4">
                <button onClick={() => setShowModal(false)} className="px-8 py-2.5 text-xs font-black text-bodyText hover:text-secondary uppercase tracking-widest transition-colors">{t.cancel}</button>
                <button disabled={docError || cnpjError || cepError} className={`px-14 py-2.5 bg-buttons text-white rounded-[1.5rem] font-black shadow-2xl hover:opacity-95 transform transition-all hover:-translate-y-1 text-xs uppercase tracking-widest ${docError || cnpjError || cepError ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>{selectedExec ? t.save : t.register}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddBankModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAddBankModal(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-2xl font-bold text-secondary uppercase tracking-tighter font-display">Nova Entidade Financeira</h4>
                <button onClick={() => setShowAddBankModal(false)} className="text-gray-400 hover:text-secondary transition-colors"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Instituição Bancária (*)</label>
                  <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold text-secondary shadow-inner">
                    {BANKS.map(bank => <option key={bank.code} value={bank.code}>{bank.code} - {bank.name}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Agência (*)</label>
                    <input type="text" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner" placeholder="0000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Conta e Dígito (*)</label>
                    <div className="flex gap-2">
                      <input type="text" className="flex-1 px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner" placeholder="000000" />
                      <input type="text" maxLength={3} className="w-20 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner text-center" placeholder="D" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Tipo de Conta (*)</label>
                    <select className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner">
                      <option>Corrente</option><option>Poupança</option><option>Conjunta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Titular da Conta (*)</label>
                    <input type="text" className="w-full px-5 py-3 bg-gray-200 border border-gray-100 rounded-2xl outline-none text-sm font-bold cursor-not-allowed opacity-60" disabled value={selectedExec?.name || ''} />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50">
                   <h5 className="text-[10px] font-bold text-secondary uppercase mb-4 tracking-widest flex items-center gap-2"><span className="w-2 h-2 bg-primary rounded-full"></span> Conectar Chave Pix (Opcional)</h5>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <select className="px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner">
                       <option>CPF / CNPJ</option><option>E-mail</option><option>Celular</option><option>Chave Aleatória</option>
                     </select>
                     <input type="text" className="px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold shadow-inner" placeholder="Insira a chave pix" />
                   </div>
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                <button onClick={() => setShowAddBankModal(false)} className="px-8 py-3 text-xs font-black text-bodyText hover:text-secondary uppercase tracking-widest transition-colors">DESCARTAR</button>
                <button onClick={() => setShowAddBankModal(false)} className="px-12 py-3 bg-secondary text-white rounded-2xl text-xs font-black shadow-2xl hover:opacity-95 uppercase tracking-widest transition-all">CONCLUIR ADIÇÃO</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Executives;