import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Client, Language, UserRole } from '../types';
import { TRANSLATIONS, BANKS, BRAZILIAN_STATES } from '../constants';
import DatePicker from '../components/DatePicker';
import BankAccountCard, { BankAccountCardData } from '../components/BankAccountCard';
import AddBankModal, { NewBankData } from '../components/AddBankModal';

interface UploadedDocument {
  id: string;
  type: string;
  category: string;
  name: string;
  date: string;
  status: 'Ativo' | 'Pendente' | 'Rejeitado';
}

interface ClientsProps {
  role: UserRole;
  language: Language;
}

const ACCOUNT_KIND_MAP: Record<number, string> = {
  1: 'Corrente',
  2: 'Poupança',
  3: 'Conjunta'
};

const PIX_KEY_TYPE_MAP: Record<number, string> = {
  1: 'CPF/CNPJ',
  2: 'E-mail',
  3: 'Celular',
  4: 'Aleatória'
};

const Clients: React.FC<ClientsProps> = ({ role, language }) => {
  const t = TRANSLATIONS[language];
  const [showModal, setShowModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isPF, setIsPF] = useState(true);
  const [cepError, setCepError] = useState(false);
  const [docError, setDocError] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const TABS = [t.general, t.address, t.bankData, t.documents, t.statusFlow];
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const [bankAccounts, setBankAccounts] = useState<BankAccountCardData[]>([]);
  const [editingAccount, setEditingAccount] = useState<BankAccountCardData | null>(null);

  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([
    { id: '1', type: 'CNH', category: 'Identidade', name: 'cnh_frente_verso.pdf', date: '24/05/2024 10:20', status: 'Ativo' },
    { id: '2', type: 'Energia', category: 'Residência', name: 'conta_luz_maio.jpg', date: '25/05/2024 14:15', status: 'Ativo' }
  ]);

  const [formData, setFormData] = useState({
    name: '', document: '', email: '', phone: '', birthDate: '', foundingDate: '',
    rg: '', naturalidade: '', estadoCivil: '', profissao: '', razaoSocial: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''
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

  const clients: Client[] = [
    { id: '1', name: 'Fulano da Silva Sauro', document: '123.456.789-00', consultant: 'João Silva', type: 'PF', status: 'Pendente', email: 'fulano@example.com', phone: '11 99999-8888', contracts: [] },
    { id: '2', name: 'Tech Solutions LTDA', document: '12.345.678/0001-99', consultant: 'Maria Santos', type: 'PJ', status: 'Apto', email: 'contato@tech.com', phone: '11 4444-3333', contracts: ['CTR-29382'] },
  ];

  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14);
  const maskCNPJ = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);
  const maskCEP = (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const val = isPF ? maskCPF(e.target.value) : maskCNPJ(e.target.value);
    setFormData({...formData, document: val});
    
    if (isPF && raw.length === 11) {
      setDocError(!validateCPF(raw));
    } else if (!isPF && raw.length === 14) {
      setDocError(!validateCNPJ(raw));
    } else {
      setDocError(false);
    }
  };

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

  const fetchBankAccounts = async () => {
    if (!selectedClient) return;
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('customer_id', selectedClient.id)
        .order('id', { ascending: true });

      if (error) throw error;

      const mappedAccounts: BankAccountCardData[] = (data || []).map((item: any) => ({
        id: item.id.toString(),
        bankCode: item.bank_id,
        bankName: item.bank_name,
        agency: item.agency || '',
        account: item.account || '',
        digit: item.digit || '',
        type: item.account_type === 1 ? (ACCOUNT_KIND_MAP[item.account_kind] || 'Conta') : 'Pix',
        pixKey: item.pix_key,
        pixType: item.pix_key_type ? PIX_KEY_TYPE_MAP[item.pix_key_type] : undefined,
        isActive: item.is_primary,
        isValid: item.is_valid,
        holderName: item.account_holder
      }));

      setBankAccounts(mappedAccounts);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
    }
  };

  useEffect(() => {
    if (showModal && activeTabIndex === 2) {
      fetchBankAccounts();
    }
  }, [showModal, activeTabIndex, selectedClient]);

  const handleToggleBank = async (id: string) => {
    if (!selectedClient) return;
    const updatedAccounts = bankAccounts.map(acc => ({
      ...acc,
      isActive: acc.id === id
    }));
    setBankAccounts(updatedAccounts);

    try {
      await supabase.from('bank_accounts').update({ is_primary: false }).eq('customer_id', selectedClient.id);
      await supabase.from('bank_accounts').update({ is_primary: true }).eq('id', id);
      fetchBankAccounts();
    } catch (error) {
      console.error('Erro ao atualizar conta principal:', error);
      fetchBankAccounts();
    }
  };

  const handleDeleteBank = async (account: BankAccountCardData) => {
    if (!selectedClient) return;
    if (window.confirm(`Deseja mesmo remover a instituicao ${account.bankName} do cliente ${selectedClient.name}?`)) {
      try {
        const { error } = await supabase.from('bank_accounts').delete().eq('id', account.id);
        if (error) throw error;
        fetchBankAccounts();
      } catch (error) {
        console.error('Erro ao excluir conta:', error);
        alert('Erro ao excluir conta.');
      }
    }
  };

  const handleEditBank = (account: BankAccountCardData) => {
    setEditingAccount(account);
    setShowAddBankModal(true);
  };

  const handleSaveBank = async (data: NewBankData) => {
    if (!selectedClient) return;
    setIsLoading(true);
    try {
      const bankName = BANKS.find(b => b.code === data.bankCode)?.name || '';
      const kindMap: Record<string, number> = { 'Corrente': 1, 'Poupança': 2, 'Conjunta': 3 };
      const pixMap: Record<string, number> = { 'CPF/CNPJ': 1, 'E-mail': 2, 'Celular': 3, 'Aleatória': 4 };

      const payload: any = {
        customer_id: selectedClient.id,
        account_type: data.accountType === 'BANK' ? 1 : 2,
        bank_id: data.bankCode,
        bank_name: bankName,
        is_primary: editingAccount ? editingAccount.isActive : bankAccounts.length === 0
      };

      if (data.accountType === 'BANK') {
        Object.assign(payload, { 
          agency: data.agency, account: data.account, digit: data.digit, account_kind: kindMap[data.kind], account_holder: data.holderName || selectedClient.name,
          pix_key: null, pix_key_type: null
        });
      } else {
        Object.assign(payload, { 
          pix_key_type: pixMap[data.pixType], pix_key: data.pixKey,
          agency: null, account: null, digit: null, account_kind: null, account_holder: null
        });
      }

      let error;
      if (editingAccount) {
        const { error: updateError } = await supabase.from('bank_accounts').update(payload).eq('id', editingAccount.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('bank_accounts').insert(payload);
        error = insertError;
      }

      if (error) throw error;
      await fetchBankAccounts();
      setShowAddBankModal(false);
      setEditingAccount(null);
    } catch (error) {
      console.error('Erro ao salvar banco:', error);
      alert('Erro ao salvar dados bancários.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (client: Client | null = null) => {
    setSelectedClient(client);
    setIsPF(client ? client.type === 'PF' : true);
    setActiveTabIndex(0);
    setCepError(false);
    setDocError(false);
    if (client) {
      setFormData({
        name: client.name, document: client.document, email: client.email, phone: client.phone,
        birthDate: '', foundingDate: '', rg: '', naturalidade: '', estadoCivil: '', profissao: '', 
        razaoSocial: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''
      });
    } else {
      setFormData({
        name: '', document: '', email: '', phone: '', birthDate: '', foundingDate: '',
        rg: '', naturalidade: '', estadoCivil: '', profissao: '', razaoSocial: '',
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''
      });
    }
    setShowModal(true);
  };

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
        <h2 className="text-xl md:text-2xl font-bold text-secondary font-display">{t.search} {t.clients}</h2>
        <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center btn-primary-style">
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
            onChange={(e) => { e.target.value = isPF ? maskCPF(e.target.value) : maskCNPJ(e.target.value) }}
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
              {clients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-secondary font-normal">{client.name}</td>
                  <td className="px-6 py-4 text-sm font-normal text-secondary">{client.document}</td>
                  <td className="px-6 py-4">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getStatusColor(client.status)}`}>{client.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleOpenModal(client)} className="text-secondary font-bold text-[10px] uppercase tracking-widest">Detalhes</button>
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
          <div className="relative bg-white w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[95vh] overflow-y-auto sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 flex flex-col font-sans">
            <div className="p-6 md:p-8 flex-1">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-secondary font-display">{TABS[activeTabIndex]}</h3>
                  <p className="text-sm text-bodyText">{selectedClient ? `${selectedClient.name} (${selectedClient.type})` : t.register}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-secondary hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {!selectedClient && (
                <div className="flex p-1 bg-gray-100 rounded-xl mb-8 w-full sm:w-fit">
                  <button onClick={() => {setIsPF(true); setDocError(false); setFormData({...formData, document: ''})}} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${isPF ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
                    {t.pf}
                  </button>
                  <button onClick={() => {setIsPF(false); setDocError(false); setFormData({...formData, document: ''})}} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isPF ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
                    {t.pj}
                  </button>
                </div>
              )}

              <div className="flex gap-4 md:gap-8 border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
                {TABS.map((tab, idx) => (
                  <button key={tab} onClick={() => setActiveTabIndex(idx)} className={`pb-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${activeTabIndex === idx ? 'text-secondary border-secondary' : 'text-gray-400 border-transparent hover:text-secondary/50'}`}>
                    {tab}
                  </button>
                ))}
              </div>

              <div className="min-h-[400px]">
                {activeTabIndex === 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{isPF ? `${t.fullName} (*)` : `${t.companyName} (*)`}</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-secondary/20 text-secondary" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{isPF ? 'RG' : t.businessName}</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-secondary" value={formData.rg} onChange={(e) => setFormData({...formData, rg: e.target.value})} />
                      </div>
                      <DatePicker 
                        label={isPF ? `${t.birthDate} (*)` : 'Data de fundação (*)'}
                        value={isPF ? formData.birthDate : formData.foundingDate}
                        onChange={(d) => setFormData(prev => ({...prev, [isPF ? 'birthDate' : 'foundingDate']: d}))}
                        language={language}
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-[10px] font-bold uppercase mb-1 ${docError ? 'text-red-500' : 'text-gray-400'}`}>{isPF ? 'CPF (*)' : `${t.cnpj} (*)`}</label>
                        <input 
                          type="text" 
                          className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none transition-all text-secondary ${docError ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-secondary/20'}`} 
                          value={formData.document}
                          onChange={handleDocumentChange}
                        />
                        {docError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Documento inválido</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{isPF ? 'Naturalidade' : 'Profissão do Representante'}</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-secondary" value={formData.naturalidade} onChange={(e) => setFormData({...formData, naturalidade: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.email} (*)</label>
                        <input type="email" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-secondary" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{isPF ? 'Estado Civil' : 'Consultor Responsável'}</label>
                        <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm text-secondary" value={formData.estadoCivil} onChange={(e) => setFormData({...formData, estadoCivil: e.target.value})}>
                          {isPF ? (<><option value="">Selecione...</option><option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option></>) : (<><option>João Silva</option><option>Maria Santos</option></>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.phone} (*)</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-secondary" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTabIndex === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-[10px] font-bold uppercase mb-1 ${cepError ? 'text-red-500' : 'text-gray-400'}`}>
                          {t.zipCode} {isSearchingCep && <span className="animate-pulse ml-1 text-primary lowercase">(buscando...)</span>}
                        </label>
                        <input 
                          type="text" 
                          className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none transition-all text-secondary ${cepError ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-secondary/20'}`} 
                          value={formData.cep}
                          onChange={handleCEPChange}
                          placeholder="00000-000"
                        />
                        {cepError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">CEP inválido</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.street}</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-secondary" 
                          value={formData.logradouro}
                          onChange={(e) => setFormData({...formData, logradouro: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Número</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-secondary" 
                          value={formData.numero}
                          onChange={(e) => setFormData({...formData, numero: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.neighborhood}</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-secondary" 
                          value={formData.bairro}
                          onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.city}</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-secondary" 
                          value={formData.cidade}
                          onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{t.state}</label>
                        <select 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm text-secondary"
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
                        <BankAccountCard
                          key={acc.id}
                          account={acc}
                          onToggle={handleToggleBank}
                          onDelete={handleDeleteBank}
                          onEdit={handleEditBank}
                        />
                      ))}
                      {bankAccounts.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm font-bold uppercase tracking-widest">
                          Nenhuma conta bancária encontrada
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTabIndex === 3 && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center text-center">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-secondary mb-4 shadow-sm">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                      </div>
                      <h4 className="text-sm font-black text-secondary uppercase tracking-widest mb-1">Central de Documentação</h4>
                      <p className="text-[11px] text-bodyText mb-6 max-w-md">Para prosseguir, anexe pelo menos um documento de identidade e um comprovante de residência atualizado.</p>
                      
                      <div className="w-full max-w-lg flex flex-col sm:flex-row gap-4 items-center">
                        <select className="w-full flex-1 px-5 py-3 bg-white border border-gray-100 rounded-2xl outline-none text-xs font-black uppercase tracking-widest shadow-sm appearance-none cursor-pointer text-secondary">
                          <optgroup label="Documento de Identidade * Obrigatório - pelo menos uma das opções">
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
                        <button className="w-full sm:w-auto px-10 py-3 bg-buttons text-white text-[10px] font-black rounded-2xl shadow-xl hover:opacity-90 uppercase tracking-widest transition-all transform hover:-translate-y-1">ANEXAR ARQUIVO</button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">Documentos em Análise / Enviados</h4>
                      <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                              <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Arquivo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {uploadedDocs.map(doc => (
                                <tr key={doc.id} className="hover:bg-gray-50/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{doc.category}</span>
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

                {activeTabIndex === 4 && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-left-2 duration-300 p-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                       <div>
                         <h4 className="text-xl font-bold text-secondary uppercase tracking-tighter font-display">Fluxo de Onboarding</h4>
                         <p className="text-xs text-bodyText mt-1">Status atual: <span className="font-bold text-secondary">{selectedClient?.name || 'Cliente'}</span></p>
                       </div>
                       <span className={`px-5 py-2 rounded-full text-[10px] font-black shadow-sm border uppercase tracking-widest ${getStatusColor(selectedClient?.status || 'Pendente')}`}>{selectedClient?.status || 'Pendente'}</span>
                    </div>

                    <div className="flex items-start justify-between overflow-x-auto pb-8 gap-4 no-scrollbar">
                      {[
                        { label: 'Não Apto', desc: 'É necessário completar e regularizar todos dados do cliente;', s: 'rejected' },
                        { label: 'Apto', desc: 'Cliente apto para o consultor lançar uma recomendação de aporte;', s: 'done' },
                        { label: 'Análise', desc: 'Analise automática dos dados do cliente após recomendação;', s: 'next' },
                        { label: 'Senha', desc: 'O cliente deve validar o email e definir uma senha de acesso;', s: 'next' },
                        { label: 'Onboarding', desc: 'O cliente deve ter todos os passos do onboarding concluidos;', s: 'next' },
                        { label: 'Cadastrado', desc: 'O cliente assinou o contrato e esta habilitado para novos;', s: 'next' }
                      ].map((step, i, arr) => (
                        <React.Fragment key={i}>
                          <div className="flex flex-col items-center min-w-[160px] text-center group">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 transition-all duration-500 shadow-lg ${
                              step.s === 'done' ? 'bg-white border-green-500 text-green-500 ring-4 ring-green-100' : 
                              step.s === 'rejected' ? 'bg-white border-red-500 text-red-500 ring-4 ring-red-100' :
                              'bg-gray-100 border-gray-300 text-gray-400'}`}>
                              
                              {step.s === 'done' && (
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                              )}
                              {step.s === 'rejected' && (
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                              )}
                              {step.s === 'next' && (
                                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                              )}
                            </div>
                            <h5 className="mt-4 text-[11px] font-black text-secondary uppercase tracking-widest">{step.label}</h5>
                            <p className="mt-2 text-[9px] text-bodyText leading-tight max-w-[140px] px-2">{step.desc}</p>
                          </div>
                          {i < arr.length - 1 && (
                            <div className="pt-7 flex-1 min-w-[30px] flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                      <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">Legenda de Status</h6>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
                          <span className="text-[11px] font-bold text-secondary">Etapa concluída</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-gray-300 rounded-full shadow-sm flex items-center justify-center text-[8px] text-white"></div>
                          <span className="text-[11px] font-bold text-secondary">Próxima etapas</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-orange-500 rounded-full shadow-sm"></div>
                          <span className="text-[11px] font-bold text-secondary">Revisão Manual</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm flex items-center justify-center text-[10px] text-white">✕</div>
                          <span className="text-[11px] font-bold text-secondary">Rejeitado</span>
                        </div>
                      </div>
                    </div>

                    <div className={`p-8 rounded-[2.5rem] border-2 shadow-sm transition-all animate-in fade-in zoom-in duration-300 ${selectedClient?.status === 'Apto' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                      <div className="flex items-start gap-5">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${selectedClient?.status === 'Apto' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {selectedClient?.status === 'Apto' ? (
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                            ) : (
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                            )}
                         </div>
                         <div className="flex-1">
                            <h5 className="text-xl font-black uppercase tracking-tighter">Cliente {selectedClient?.status === 'Apto' ? 'Apto' : 'Inapto'}</h5>
                            <p className="text-sm mt-1 opacity-80 leading-relaxed font-medium">
                              {selectedClient?.status === 'Apto' 
                                ? 'Este cliente atende a todos os requisitos obrigatórios e está apto para realizar operações.'
                                : 'Atenção: O cadastro deste cliente possui pendências críticas que impossibilitam o aporte imediato.'}
                            </p>

                            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12">
                               <p className="text-[10px] font-black uppercase tracking-widest col-span-full mb-2 opacity-60">Requisitos Atendidos:</p>
                               {[
                                 { label: 'Dados Pessoais', ok: true },
                                 { label: 'Idade mínima 18 anos', ok: true },
                                 { label: 'E-mail confirmado', ok: true },
                                 { label: 'Documentos de Identificação', ok: selectedClient?.status === 'Apto' },
                                 { label: 'Comprovante de residência', ok: true },
                                 { label: 'Dados bancários', ok: selectedClient?.status === 'Apto' }
                               ].map((req, i) => (
                                 <div key={i} className="flex items-center gap-3">
                                   <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d={req.ok ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}/></svg>
                                   </div>
                                   <span className="text-xs font-bold tracking-tight">{req.label}</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 md:p-8 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 rounded-b-3xl border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-8 py-2.5 font-bold text-bodyText hover:text-secondary transition-colors uppercase text-xs tracking-widest">{t.cancel}</button>
              <button disabled={docError || cepError} className={`px-14 py-2.5 bg-buttons text-white rounded-2xl font-bold shadow-xl hover:opacity-95 transition-all transform hover:-translate-y-1 active:scale-95 uppercase text-xs tracking-widest ${docError || cepError ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
                {selectedClient ? t.save : t.register}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddBankModal && (
        <AddBankModal
          isOpen={showAddBankModal}
          onClose={() => { setShowAddBankModal(false); setEditingAccount(null); }}
          onSave={handleSaveBank}
          holderName={selectedClient?.name || ''}
          isLoading={isLoading}
          language={language}
          existingAccounts={bankAccounts}
          initialData={editingAccount ? {
            bankCode: editingAccount.bankCode,
            agency: editingAccount.agency,
            account: editingAccount.account,
            digit: editingAccount.digit,
            kind: editingAccount.type !== 'Pix' ? editingAccount.type : 'Corrente',
            pixType: editingAccount.pixType || 'CPF/CNPJ',
            pixKey: editingAccount.pixKey || '',
            holderName: editingAccount.holderName || selectedClient?.name || '',
            accountType: editingAccount.type === 'Pix' ? 'PIX' : 'BANK'
          } : undefined}
        />
      )}
    </div>
  );
};

export default Clients;