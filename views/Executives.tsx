import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Executive, Language, UserRole } from '../types';
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

interface ExecutivesProps {
  role: UserRole;
  language: Language;
}

const MARITAL_STATUS_MAP: Record<string, number> = {
  'Solteiro(a)': 1,
  'Casado(a)': 2,
  'Divorciado(a)': 3,
  'Viúvo(a)': 4
};

const REVERSE_MARITAL_STATUS_MAP: Record<number, string> = {
  1: 'Solteiro(a)',
  2: 'Casado(a)',
  3: 'Divorciado(a)',
  4: 'Viúvo(a)'
};

const ROLE_MAP: Record<number, string> = {
  0: 'HEAD',
  1: 'Executivo Líder',
  2: 'Executivo',
  3: 'Financeiro'
};

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

const Executives: React.FC<ExecutivesProps> = ({ role, language }) => {
  const t = TRANSLATIONS[language];
  const [showModal, setShowModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [selectedExec, setSelectedExec] = useState<Executive | null>(null);
  const [isPF, setIsPF] = useState(true);
  const [cepError, setCepError] = useState(false);
  const [docError, setDocError] = useState(false);
  const [cnpjError, setCnpjError] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  
  const [executivesList, setExecutivesList] = useState<Executive[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchDocument, setSearchDocument] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const TABS = [t.general, t.address, t.bankData, t.documents];
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  
  const [bankAccounts, setBankAccounts] = useState<BankAccountCardData[]>([]);

  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([
    { id: '1', type: 'RG', category: 'Identidade', name: 'identidade_joao.pdf', date: '10/06/2024 09:00', status: 'Ativo' }
  ]);

  const [formData, setFormData] = useState({ 
    name: '', document: '', email: '', birthDate: '', rg: '', phone: '', whatsapp: '',
    birthPlace: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    razaoSocial: '', cnpj: '', estadoCivil: '', tradeName: '', representativeName: '', jobTitle: '',
    role: 2, leaderId: null as string | null, leaderName: ''
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

  const [leaderOptions, setLeaderOptions] = useState<{id: string, name: string}[]>([]);
  const [showLeaderOptions, setShowLeaderOptions] = useState(false);
  const [isSearchingLeader, setIsSearchingLeader] = useState(false);

  const handleLeaderSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setFormData(prev => ({ ...prev, leaderName: term, leaderId: null }));
    
    if (term.length < 2) {
        setLeaderOptions([]);
        setShowLeaderOptions(false);
        return;
    }

    setIsSearchingLeader(true);
    setShowLeaderOptions(true);
    
    try {
        let query = supabase.from('executives').select('id, full_name').or('role.eq.0,role.eq.1').ilike('full_name', `%${term}%`).limit(5);
        if (selectedExec) query = query.neq('id', selectedExec.id);

        const { data } = await query;
        if (data) setLeaderOptions(data.map((d: any) => ({ id: d.id.toString(), name: d.full_name })));
    } catch (err) {
        console.error(err);
    } finally {
        setIsSearchingLeader(false);
    }
  };

  const selectLeader = (leader: {id: string, name: string}) => {
      setFormData(prev => ({ ...prev, leaderId: leader.id, leaderName: leader.name }));
      setShowLeaderOptions(false);
  };

  const fetchExecutives = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('executives').select('*');

      if (searchName) {
        query = query.or(`full_name.ilike.%${searchName}%,company_name.ilike.%${searchName}%`);
      }

      const cleanDoc = searchDocument.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanDoc) {
        query = query.or(`cpf.eq.${cleanDoc},cnpj.eq.${cleanDoc},rg.ilike.%${cleanDoc}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedExecutives: Executive[] = (data || []).map((item: any) => ({
        id: item.id.toString(),
        name: item.full_name || item.company_name || 'Sem Nome',
        document: item.cpf || item.cnpj || '',
        email: item.email || '',
        role: ROLE_MAP[item.role as number] || 'Não definido'
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

  const fetchBankAccounts = async () => {
    if (!selectedExec) return;
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('executive_id', selectedExec.id);

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
        isValid: item.is_valid
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
  }, [showModal, activeTabIndex, selectedExec]);

  const handleToggleBank = async (id: string) => {
    if (!selectedExec) return;

    // Otimistic update
    const updatedAccounts = bankAccounts.map(acc => ({
      ...acc,
      isActive: acc.id === id
    }));
    setBankAccounts(updatedAccounts);

    try {
      // Primeiro, desativa todas as contas deste executivo
      await supabase
        .from('bank_accounts')
        .update({ is_primary: false })
        .eq('executive_id', selectedExec.id);

      // Depois, ativa a conta selecionada
      await supabase
        .from('bank_accounts')
        .update({ is_primary: true })
        .eq('id', id);
      
      // Recarrega para garantir consistência
      fetchBankAccounts();
    } catch (error) {
      console.error('Erro ao atualizar conta principal:', error);
      fetchBankAccounts(); // Reverte em caso de erro
    }
  };

  const handleDeleteBank = async (account: BankAccountCardData) => {
    if (!selectedExec) return;
    
    const confirmMessage = `Deseja mesmo remover a instituicao ${account.bankName} do cliente ${selectedExec.name}?`;
    if (window.confirm(confirmMessage)) {
      try {
        const { error } = await supabase
          .from('bank_accounts')
          .delete()
          .eq('id', account.id);
        
        if (error) throw error;
        
        fetchBankAccounts();
      } catch (error) {
        console.error('Erro ao excluir conta:', error);
        alert('Erro ao excluir conta.');
      }
    }
  };

  const handleSaveBank = async (data: NewBankData) => {
    if (!selectedExec) return;
    setIsLoading(true);
    try {
      const bankName = BANKS.find(b => b.code === data.bankCode)?.name || '';
      
      // Salvar Conta Bancária (Tipo 1)
      if (data.agency && data.account) {
        const kindMap: Record<string, number> = { 'Corrente': 1, 'Poupança': 2, 'Conjunta': 3 };
        const { error } = await supabase.from('bank_accounts').insert({
          executive_id: selectedExec.id,
          account_type: 1,
          bank_id: data.bankCode,
          bank_name: bankName,
          agency: data.agency,
          account: data.account,
          digit: data.digit,
          account_kind: kindMap[data.kind],
          account_holder: selectedExec.name,
          is_primary: bankAccounts.length === 0
        });
        if (error) throw error;
      }

      // Salvar Chave Pix (Tipo 2)
      if (data.pixKey) {
        const pixMap: Record<string, number> = { 'CPF/CNPJ': 1, 'E-mail': 2, 'Celular': 3, 'Aleatória': 4 };
        const { error } = await supabase.from('bank_accounts').insert({
          executive_id: selectedExec.id,
          account_type: 2,
          bank_id: data.bankCode,
          bank_name: bankName,
          pix_key_type: pixMap[data.pixType],
          pix_key: data.pixKey,
          is_primary: bankAccounts.length === 0 && !data.agency
        });
        if (error) throw error;
      }

      await fetchBankAccounts();
      setShowAddBankModal(false);
    } catch (error) {
      console.error('Erro ao salvar banco:', error);
      alert('Erro ao salvar dados bancários.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = async (exec: Executive | null = null) => {
    setSelectedExec(exec);
    setActiveTabIndex(0);
    setCepError(false);
    setDocError(false);
    setCnpjError(false);
    setFieldErrors({});
    
    if (exec) {
      // Determina se é PF ou PJ baseado no tamanho do documento (heurística inicial)
      const cleanDoc = exec.document.replace(/\D/g, '');
      setIsPF(cleanDoc.length <= 11);

      // Preenchimento inicial com dados da lista
      setFormData({
        name: exec.name,
        document: exec.document,
        email: exec.email,
        birthDate: '', rg: '', phone: '', whatsapp: '', birthPlace: '', role: 2, leaderId: null, leaderName: '',
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
        razaoSocial: '', cnpj: '', estadoCivil: '', tradeName: '', representativeName: '', jobTitle: ''
      });

      // Buscar dados completos do executivo
      const { data, error } = await supabase.from('executives').select('*').eq('id', exec.id).single();
      
      if (data && !error) {
        // Determina se é PF ou PJ com prioridade para customer_type
        if (data.customer_type === 'PJ') {
          setIsPF(false);
        } else if (data.customer_type === 'PF') {
          setIsPF(true);
        } else {
          setIsPF(!!data.cpf);
        }

        let fetchedLeaderName = '';
        if (data.leader_id) {
            const { data: leaderData } = await supabase.from('executives').select('full_name').eq('id', data.leader_id).single();
            if (leaderData) fetchedLeaderName = leaderData.full_name;
        }

        setFormData(prev => ({
          ...prev,
          name: data.full_name || '',
          document: data.cpf ? maskCPF(data.cpf) : '',
          email: data.email || '',
          birthDate: data.birth_date || '',
          rg: data.rg || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          birthPlace: data.birth_place || '',
          cep: data.postal_code ? maskCEP(data.postal_code) : '',
          logradouro: data.street || '',
          numero: data.address_number || '',
          complemento: data.complement || '',
          bairro: data.neighborhood || '',
          cidade: data.city || '',
          estado: data.state ? (BRAZILIAN_STATES[data.state - 1]?.value || '') : '',
          razaoSocial: data.company_name || '',
          cnpj: data.cnpj ? maskCNPJ(data.cnpj) : '',
          estadoCivil: data.marital_status ? REVERSE_MARITAL_STATUS_MAP[data.marital_status] : '',
          tradeName: data.trade_name || '',
          representativeName: data.representative_name || '',
          jobTitle: data.job_title || '',
          role: data.role ?? 2,
          leaderId: data.leader_id,
          leaderName: fetchedLeaderName
        }));
      }
    } else {
      setIsPF(true);
      setFormData({
        name: '', document: '', email: '', birthDate: '', rg: '', phone: '', whatsapp: '', birthPlace: '', role: 2, leaderId: null, leaderName: '',
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
        razaoSocial: '', cnpj: '', estadoCivil: '', tradeName: '', representativeName: '', jobTitle: ''
      });
    }
    setShowModal(true);
  };

  const getInputClass = (fieldName: string, errorState: boolean = false) => {
    const hasError = fieldErrors[fieldName] || errorState;
    return `w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none shadow-inner transition-all text-secondary ${
      hasError ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-secondary/20'
    }`;
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      const stateId = BRAZILIAN_STATES.findIndex(s => s.value === formData.estado) + 1;
      const maritalStatusId = MARITAL_STATUS_MAP[formData.estadoCivil] || null;
      
      // Validação de campos obrigatórios
      const requiredFields = isPF 
        ? ['name', 'document', 'email', 'birthDate', 'phone', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado']
        : ['razaoSocial', 'cnpj', 'email', 'phone', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado'];

      const newErrors: Record<string, boolean> = {};
      let hasError = false;

      requiredFields.forEach(field => {
        if (!formData[field as keyof typeof formData]) {
          newErrors[field] = true;
          hasError = true;
        }
      });

      if (docError || cnpjError || cepError) hasError = true;

      setFieldErrors(newErrors);

      if (hasError) {
        alert('Erro ao salvar executivo. Verifique os dados.');
        setIsLoading(false);
        return;
      }

      const payload = {
        customer_type: isPF ? 'PF' : 'PJ',
        full_name: formData.name,
        cpf: isPF ? (formData.document.replace(/\D/g, '') || null) : null,
        email: formData.email,
        birth_date: formData.birthDate || null,
        rg: formData.rg,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || null,
        birth_place: formData.birthPlace,
        postal_code: formData.cep.replace(/\D/g, '') || null,
        street: formData.logradouro,
        address_number: formData.numero,
        complement: formData.complemento,
        neighborhood: formData.bairro,
        city: formData.cidade,
        state: stateId > 0 ? stateId : null,
        company_name: formData.razaoSocial,
        cnpj: !isPF ? (formData.cnpj.replace(/\D/g, '') || null) : null,
        marital_status: maritalStatusId,
        trade_name: formData.tradeName,
        representative_name: formData.representativeName,
        job_title: formData.jobTitle,
        role: formData.role,
        leader_id: formData.role === 2 ? (formData.leaderId || null) : null
      };

      let error;
      if (selectedExec) {
        const { error: updateError } = await supabase
          .from('executives')
          .update(payload)
          .eq('id', selectedExec.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('executives')
          .insert([payload]);
        error = insertError;
      }

      if (error) {
        // Tratamento específico para o erro de constraint que você encontrou
        if (error.code === '23514' && error.message.includes('executives_customer_type_check')) {
           alert('ERRO DE BANCO DE DADOS: É necessário rodar o script SQL para permitir cadastro de PF. Veja o arquivo "migration_fix_customer_type.sql".');
           return; // Interrompe aqui para não cair no catch e mostrar o erro genérico
        }
        throw error;
      }

      await fetchExecutives();
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar executivo:', error);
      alert('Erro ao salvar executivo. Verifique os dados.');
    } finally {
      setIsLoading(false);
    }
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
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.name}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.role}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {executivesList.map(exec => (
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
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex p-1 bg-gray-100 rounded-xl mb-6 w-full sm:w-fit">
                      <button onClick={() => { setIsPF(true); setCnpjError(false); }} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${isPF ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
                        {t.pf}
                      </button>
                      <button onClick={() => { setIsPF(false); setDocError(false); }} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isPF ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
                        {t.pj}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isPF ? (
                      <>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Completo (*)</label>
                            <input type="text" className={getInputClass('name')} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                          </div>
                          <DatePicker label="Nascimento (*)" value={formData.birthDate} onChange={(d) => setFormData({...formData, birthDate: d})} language={language} />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className={`block text-[10px] font-bold uppercase mb-1 ${docError ? 'text-red-500' : 'text-gray-400'}`}>CPF (*)</label>
                            <input 
                              type="text" 
                              className={getInputClass('document', docError)}
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
                            <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-sm font-bold text-secondary" value={formData.estadoCivil} onChange={(e) => setFormData({...formData, estadoCivil: e.target.value})}>
                              <option value="">Selecione...</option>
                              <option>Solteiro(a)</option>
                              <option>Casado(a)</option>
                              <option>Divorciado(a)</option>
                              <option>Viúvo(a)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nível de Acesso (*)</label>
                            <select className={getInputClass('role')} value={formData.role} onChange={(e) => setFormData({...formData, role: parseInt(e.target.value)})}>
                              {Object.entries(ROLE_MAP).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                              ))}
                            </select>
                          </div>
                          {formData.role === 2 && (
                            <div className="relative">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Líder Responsável</label>
                              <input type="text" className={getInputClass('leaderName')} value={formData.leaderName} onChange={handleLeaderSearch} placeholder="Busque por nome..." />
                              {showLeaderOptions && leaderOptions.length > 0 && (
                                <div className="absolute top-full left-0 w-full bg-white border border-gray-100 rounded-xl shadow-xl mt-1 z-10 max-h-40 overflow-y-auto">
                                  {leaderOptions.map(leader => (
                                    <div key={leader.id} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-secondary" onClick={() => selectLeader(leader)}>
                                      {leader.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {isSearchingLeader && <span className="absolute right-3 top-8 text-xs text-gray-400">...</span>}
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">RG</label>
                            <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-secondary" value={formData.rg} onChange={(e) => setFormData({...formData, rg: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Naturalidade</label>
                            <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-secondary" value={formData.birthPlace} onChange={(e) => setFormData({...formData, birthPlace: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail (*)</label>
                            <input type="email" className={getInputClass('email')} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefone (*)</label>
                              <input type="text" className={getInputClass('phone')} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">WhatsApp</label>
                              <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-secondary" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Razão Social (*)</label>
                            <input type="text" className={getInputClass('razaoSocial')} value={formData.razaoSocial} onChange={(e) => setFormData({...formData, razaoSocial: e.target.value})} />
                          </div>
                          <div>
                            <label className={`block text-[10px] font-bold uppercase mb-1 ${cnpjError ? 'text-red-500' : 'text-gray-400'}`}>CNPJ (*)</label>
                            <input type="text" className={getInputClass('cnpj', cnpjError)} value={formData.cnpj} onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              const val = maskCNPJ(e.target.value);
                              setFormData({...formData, cnpj: val});
                              if (raw.length === 14) {
                                setCnpjError(!validateCNPJ(raw));
                              } else {
                                setCnpjError(false);
                              }
                            }} />
                            {cnpjError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Documento inválido</p>}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Fantasia</label>
                            <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-secondary" value={formData.tradeName} onChange={(e) => setFormData({...formData, tradeName: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome do Representante</label>
                            <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-secondary" value={formData.representativeName} onChange={(e) => setFormData({...formData, representativeName: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cargo do Representante</label>
                            <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-secondary" value={formData.jobTitle} onChange={(e) => setFormData({...formData, jobTitle: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail (*)</label>
                            <input type="email" className={getInputClass('email')} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefone (*)</label>
                            <input type="text" className={getInputClass('phone')} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nível de Acesso (*)</label>
                            <select className={getInputClass('role')} value={formData.role} onChange={(e) => setFormData({...formData, role: parseInt(e.target.value)})}>
                              {Object.entries(ROLE_MAP).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                              ))}
                            </select>
                          </div>
                          {formData.role === 2 && (
                            <div className="relative">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Líder Responsável</label>
                              <input type="text" className={getInputClass('leaderName')} value={formData.leaderName} onChange={handleLeaderSearch} placeholder="Busque por nome..." />
                              {showLeaderOptions && leaderOptions.length > 0 && (
                                <div className="absolute top-full left-0 w-full bg-white border border-gray-100 rounded-xl shadow-xl mt-1 z-10 max-h-40 overflow-y-auto">
                                  {leaderOptions.map(leader => (
                                    <div key={leader.id} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-secondary" onClick={() => selectLeader(leader)}>
                                      {leader.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  </div>
                )}

                {activeTabIndex === 1 && (
                  <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="col-span-12 md:col-span-3">
                        <label className={`block text-[10px] font-bold uppercase mb-1 ${cepError ? 'text-red-500' : 'text-gray-400'}`}>
                          CEP {isSearchingCep && <span className="animate-pulse ml-1 text-primary lowercase">(buscando...)</span>}
                        </label>
                        <input 
                          type="text" 
                          className={getInputClass('cep', cepError)}
                          value={formData.cep}
                          onChange={handleCEPChange}
                          placeholder="00000-000"
                        />
                        {cepError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">CEP inválido</p>}
                      </div>
                      <div className="col-span-12 md:col-span-9">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Logradouro (*)</label>
                        <input 
                          type="text" 
                          className={getInputClass('logradouro')}
                          value={formData.logradouro}
                          onChange={(e) => setFormData({...formData, logradouro: e.target.value})}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Número</label>
                        <input 
                          type="text" 
                          className={getInputClass('numero')}
                          value={formData.numero}
                          onChange={(e) => setFormData({...formData, numero: e.target.value})}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Complemento</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-secondary" 
                          value={formData.complemento}
                          onChange={(e) => setFormData({...formData, complemento: e.target.value})}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-6">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bairro</label>
                        <input 
                          type="text" 
                          className={getInputClass('bairro')}
                          value={formData.bairro}
                          onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                        />
                      </div>

                      <div className="col-span-12 md:col-span-6">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cidade (*)</label>
                        <input 
                          type="text" 
                          className={getInputClass('cidade')}
                          value={formData.cidade}
                          onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-6">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado (*)</label>
                        <select 
                          className={getInputClass('estado')}
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
                            <button onClick={() => handleDeleteBank(acc)} className="text-gray-300 hover:text-red-500 transition-colors p-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                          </div>
                        </div>
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
                    <div className="p-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-secondary mb-4 shadow-sm">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                      </div>
                      <h4 className="text-sm font-black text-secondary uppercase tracking-[0.1em] mb-2">Central de Arquivos do Executivo</h4>
                      <p className="text-[11px] text-bodyText mb-8 max-lg">Anexe os documentos necessários para validação do perfil executivo.</p>
                      
                      <div className="w-full max-xl flex flex-col sm:flex-row gap-4 items-center">
                        <select className="w-full flex-1 px-5 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none text-[11px] font-black uppercase tracking-widest shadow-sm appearance-none cursor-pointer text-secondary">
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
                                  <td className="px-6 py-4 text-[11px] text-bodyText font-bold text-secondary">{doc.name}</td>
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
                <button onClick={handleSave} disabled={docError || cnpjError || cepError || isLoading} className={`px-14 py-2.5 bg-buttons text-white rounded-[1.5rem] font-black shadow-2xl hover:opacity-95 transform transition-all hover:-translate-y-1 text-xs uppercase tracking-widest ${docError || cnpjError || cepError || isLoading ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>{isLoading ? '...' : (selectedExec ? t.save : t.register)}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddBankModal && (
        <AddBankModal
          isOpen={showAddBankModal}
          onClose={() => setShowAddBankModal(false)}
          onSave={handleSaveBank}
          holderName={selectedExec?.name || ''}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default Executives;