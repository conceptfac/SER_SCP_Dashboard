import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Language, UserRole } from '../types';
import { 
  TRANSLATIONS, 
  BRAZILIAN_STATES, 
  BANKS,
  DOC_CATEGORY_MAP,
  DOC_TYPE_MAP,
  DOC_STATUS_MAP,
  DOC_VALUE_TO_ID,
  ACCEPTED_EXTENSIONS 
} from '../constants';
import BankAccountCard, { BankAccountCardData } from './BankAccountCard';
import AddBankModal, { NewBankData } from './AddBankModal';
import GeneralTab from './GeneralTab';
import AddressTab from './AddressTab';
import BankDataTab from './BankDataTab';
import DocumentsTab, { UploadedDocument } from './DocumentsTab';
import OnboardingTab from './OnboardingTab'; // Importando a nova Tab
import { calculateOnboardingState, OnboardingState } from '../utils/onboardingWorkflow';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data?: { id: string, isNew: boolean }) => void;
  initialData?: any;
  entityType: 'executive' | 'client';
  language: Language;
  userRole?: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  initialTab?: number;
}

// Mapas auxiliares para lógica interna
const MARITAL_STATUS_MAP: Record<string, number> = { 'Solteiro(a)': 1, 'Casado(a)': 2, 'Divorciado(a)': 3, 'Viúvo(a)': 4 };
const REVERSE_MARITAL_STATUS_MAP: Record<number, string> = { 1: 'Solteiro(a)', 2: 'Casado(a)', 3: 'Divorciado(a)', 4: 'Viúvo(a)' };
const ACCOUNT_KIND_MAP: Record<number, string> = { 1: 'Corrente', 2: 'Poupança', 3: 'Conjunta' };
const PIX_KEY_TYPE_MAP: Record<number, string> = { 1: 'CPF/CNPJ', 2: 'E-mail', 3: 'Celular', 4: 'Aleatória' };

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSuccess, initialData, entityType, language, userRole, currentUserId, currentUserName, initialTab }) => {
  const t = TRANSLATIONS[language];
  const TABS = [t.general, t.address, t.bankData, t.documents];
  if (entityType === 'client') TABS.push(t.statusFlow || 'Status');
  
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isPF, setIsPF] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEntityId, setCurrentEntityId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [duplicateErrors, setDuplicateErrors] = useState<Record<string, string>>({});
  
  // Estados de erro
  const [cepError, setCepError] = useState(false);
  const [docError, setDocError] = useState(false);
  const [ageError, setAgeError] = useState(false);
  const [cnpjError, setCnpjError] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  
  // Listas de dados
  const [bankAccounts, setBankAccounts] = useState<BankAccountCardData[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [leaderOptions, setLeaderOptions] = useState<{id: string, name: string}[]>([]);
  
  // Controles de UI
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountCardData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocType, setSelectedDocType] = useState('RG');
  const [showLeaderOptions, setShowLeaderOptions] = useState(false);
  const [isSearchingLeader, setIsSearchingLeader] = useState(false);
  
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);

  const [formData, setFormData] = useState({ 
    name: '', document: '', email: '', birthDate: '', rg: '', phone: '', whatsapp: '',
    birthPlace: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    razaoSocial: '', cnpj: '', estadoCivil: '', tradeName: '', representativeName: '', jobTitle: '',
    role: 2, leaderId: null as string | null, leaderName: ''
  });

  // Funções de Máscara e Validação
  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14);
  const maskCNPJ = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);
  const maskCEP = (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);

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

  const validateAge = (dateString: string) => {
    if (!dateString) return true;
    const [y, m, d] = dateString.split('-').map(Number);
    const today = new Date();
    const birthDate = new Date(y, m - 1, d);
    let age = today.getFullYear() - birthDate.getFullYear();
    const mDiff = today.getMonth() - birthDate.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 18;
  };

  const isReadOnly = currentStatus === 'archiving' || currentStatus === 'archived';

  useEffect(() => {
    if (isOpen) {
      loadData();
      setCurrentEntityId(initialData?.id || null);
    }
  }, [isOpen, initialData]);

  // Recalcular estado de onboarding
  useEffect(() => {
    if (entityType === 'client' && currentEntityId) {
      const fetchDBState = async () => {
        const { data } = await supabase.from('customers').select('onboarding_step, analysis_status, analysis_rejection_reason, has_password, registration_status, registration_rejection_reason').eq('id', currentEntityId).single();
        if (data) {
           const state = calculateOnboardingState(formData, bankAccounts, uploadedDocs, data);
           setOnboardingState(state);
        }
      };
      fetchDBState();
    } else if (entityType === 'client') {
       setOnboardingState(calculateOnboardingState(formData, bankAccounts, uploadedDocs, null));
    }
  }, [formData, bankAccounts, uploadedDocs, currentEntityId, entityType]);

  // Efeito para promover automaticamente para análise e notificar o HEAD
  useEffect(() => {
    const promoteToAnalysis = async () => {
      if (!currentEntityId || entityType !== 'client' || !onboardingState?.isApt) return;
      
      // Verifica o estado real no banco para evitar loops ou atualizações desnecessárias
      const { data: customer } = await supabase.from('customers').select('onboarding_step, executive_id').eq('id', currentEntityId).single();
      
      if (customer && customer.onboarding_step === 'aptitude') {
         // Atualiza para análise
         await supabase.from('customers').update({ onboarding_step: 'analysis' }).eq('id', currentEntityId);
         
         // Envia notificação
         const execName = currentUserName || 'Executivo'; // Simplificação: assume que quem está editando é o executivo ou usa o nome da sessão
         
         await supabase.from('notifications').insert({
             type: 'new_registration_analysis',
             target_role: 0, // HEAD
             title: 'Novo Cadastro em Análise',
             message: JSON.stringify({ executive: execName, client: formData.name }),
             related_entity_id: currentEntityId,
             status: 'unread'
         });
      }
    };

    promoteToAnalysis();
  }, [onboardingState?.isApt, currentEntityId, entityType]);

  const loadData = async () => {
    setActiveTabIndex(initialTab ?? 0);
    setCepError(false);
    setDocError(false);
    setAgeError(false);
    setCnpjError(false);
    setFieldErrors({});
    setDuplicateErrors({});
    setPreviousStatus(null);
    
    if (initialData) {
      const cleanDoc = (initialData.document || '').replace(/\D/g, ''); 
      setIsPF(cleanDoc.length <= 11);
      setCurrentStatus(initialData.status || 'pending');

      setFormData({
        name: initialData.name || '',
        document: initialData.document || '',
        email: initialData.email || '',
        birthDate: '', rg: '', phone: '', whatsapp: '', birthPlace: '', role: 2, leaderId: null, leaderName: '',
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
        razaoSocial: '', cnpj: '', estadoCivil: '', tradeName: '', representativeName: '', jobTitle: ''
      });

      const table = entityType === 'executive' ? 'executives' : 'customers';
      const { data, error } = await supabase.from(table).select('*').eq('id', initialData.id).single();
      
      if (data && !error) {
        if (data.customer_type === 'PJ') setIsPF(false);
        else if (data.customer_type === 'PF') setIsPF(true);
        else setIsPF(!!data.cpf);

        if (data.account_status) setCurrentStatus(data.account_status);
        if (data.previous_status) setPreviousStatus(data.previous_status);

        let fetchedLeaderName = '';
        const leaderIdField = entityType === 'executive' ? 'leader_id' : 'executive_id';
        if (data[leaderIdField]) {
            const { data: leaderData } = await supabase.from('executives').select('full_name').eq('id', data[leaderIdField]).single();
            if (leaderData) fetchedLeaderName = leaderData.full_name || '';
        }

        const reverseMaritalStatus = REVERSE_MARITAL_STATUS_MAP[data.marital_status] || '';

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
          estadoCivil: reverseMaritalStatus,
          tradeName: data.trade_name || '',
          representativeName: data.representative_name || '',
          jobTitle: data.job_title || '',
          role: data.role ?? 2,
          leaderId: data[leaderIdField],
          leaderName: fetchedLeaderName
        }));
      }
    } else {
      setIsPF(true);
      setCurrentStatus('pending');
      let defaultLeaderId = null;
      let defaultLeaderName = '';
      if (entityType === 'client' && userRole !== UserRole.HEAD && currentUserId) {
         defaultLeaderId = currentUserId;
         defaultLeaderName = currentUserName || '';
      }
      setFormData({
        name: '', document: '', email: '', birthDate: '', rg: '', phone: '', whatsapp: '', birthPlace: '', role: 2, leaderId: defaultLeaderId, leaderName: defaultLeaderName,
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
        razaoSocial: '', cnpj: '', estadoCivil: '', tradeName: '', representativeName: '', jobTitle: ''
      });
    }
  };

  const resolveNotification = async (entityId: string, action: 'accepted' | 'denied') => {
    try {
      const { data: notifications } = await supabase.from('notifications').select('id').eq('related_entity_id', entityId).eq('type', 'archive_client').in('status', ['unread', 'read']).order('created_at', { ascending: false }).limit(1);
      if (notifications && notifications.length > 0) {
        await supabase.from('notifications').update({ status: action }).eq('id', notifications[0].id);
      }
    } catch (error) { console.error(error); }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentEntityId) return;
    const action = newStatus === 'archiving' ? 'arquivar' : 'desarquivar';
    if (!window.confirm(`Deseja realmente ${action} este registro?`)) return;

    setIsLoading(true);
    try {
        const table = entityType === 'executive' ? 'executives' : 'customers';
        const updateData: any = { account_status: newStatus };

        if (newStatus === 'archiving' && currentStatus !== 'archiving' && currentStatus !== 'archived') {
            updateData.previous_status = currentStatus;
        }

        const { error } = await supabase.from(table).update(updateData).eq('id', currentEntityId);
        if (error) throw error;

        if (userRole === UserRole.HEAD && (newStatus === 'archived' || newStatus === 'active' || newStatus === 'pending')) {
             const action = newStatus === 'archived' ? 'accepted' : 'denied';
             await resolveNotification(currentEntityId, action);
        }

        if (newStatus === 'archiving' && userRole !== UserRole.HEAD) {
            const notificationPayload = {
                target_role: 0, sender_id: currentUserId, type: 'archive_client', title: 'archive_client',
                message: JSON.stringify({ executive_id: currentUserId, client_id: currentEntityId }), related_entity_id: currentEntityId, status: 'unread'
            };
            await supabase.from('notifications').insert(notificationPayload);
        }

        setCurrentStatus(newStatus);
        if (onSuccess) onSuccess();
    } catch (error) { console.error(error); alert('Erro ao atualizar status.'); } finally { setIsLoading(false); }
  };

  const checkDuplicate = async (field: 'document' | 'cnpj' | 'rg' | 'email', value: string) => {
    if (!value || value.length < 3) return;
    const table = entityType === 'executive' ? 'executives' : 'customers';
    let query = supabase.from(table).select('id');
    
    if (field === 'document') {
        const cleanVal = value.replace(/\D/g, '');
        if (cleanVal.length !== 11) return;
        query = query.eq('cpf', cleanVal);
    } else if (field === 'cnpj') {
        const cleanVal = value.replace(/\D/g, '');
        if (cleanVal.length !== 14) return;
        query = query.eq('cnpj', cleanVal);
    } else {
        query = query.eq(field, value);
    }

    if (currentEntityId) query = query.neq('id', currentEntityId);
    const { data } = await query;

    if (data && data.length > 0) {
        setDuplicateErrors(prev => ({...prev, [field]: `Este dado já está cadastrado.`}));
    } else {
        setDuplicateErrors(prev => { const newErrs = {...prev}; delete newErrs[field]; return newErrs; });
    }
  };

  const handleLeaderSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setFormData(prev => ({ ...prev, leaderName: term, leaderId: null }));
    if (term.length < 2) { setLeaderOptions([]); setShowLeaderOptions(false); return; }

    setIsSearchingLeader(true);
    setShowLeaderOptions(true);
    try {
        let query = supabase.from('executives').select('id, full_name').or('role.eq.0,role.eq.1').ilike('full_name', `%${term}%`).limit(5);
        if (initialData && entityType === 'executive') query = query.neq('id', initialData.id);
        if (currentEntityId && entityType === 'executive') query = query.neq('id', currentEntityId);
        const { data } = await query;
        if (data) setLeaderOptions(data.map((d: any) => ({ id: d.id.toString(), name: d.full_name })));
    } catch (err) { console.error(err); } finally { setIsSearchingLeader(false); }
  };

  const selectLeader = (leader: {id: string, name: string}) => {
      setFormData(prev => ({ ...prev, leaderId: leader.id, leaderName: leader.name }));
      setShowLeaderOptions(false);
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
        if (data.erro) setCepError(true);
        else {
          setFormData(prev => ({
            ...prev,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          }));
        }
      } catch (error) { setCepError(true); } finally { setIsSearchingCep(false); }
    }
  };

  const fetchBankAccounts = async () => {
    if (!currentEntityId) return;
    try {
      const idField = entityType === 'executive' ? 'executive_id' : 'customer_id';
      const { data, error } = await supabase.from('bank_accounts').select('*').eq(idField, currentEntityId).order('is_primary', { ascending: false }).order('id', { ascending: true });
      if (error) throw error;
      const mappedAccounts: BankAccountCardData[] = (data || []).map((item: any) => ({
        id: item.id.toString(), bankCode: item.bank_id, bankName: item.bank_name, agency: item.agency || '',
        account: item.account || '', digit: item.digit || '', type: item.account_type === 1 ? (ACCOUNT_KIND_MAP[item.account_kind] || 'Conta') : 'Pix',
        pixKey: item.pix_key, pixType: item.pix_key_type ? PIX_KEY_TYPE_MAP[item.pix_key_type] : undefined,
        isActive: item.is_primary, isValid: item.is_valid, holderName: item.account_holder
      }));
      setBankAccounts(mappedAccounts);
    } catch (error) { console.error(error); }
  };

  const fetchDocuments = async () => {
    if (!currentEntityId) return;
    try {
      const ownerType = entityType === 'client' ? 1 : 2;
      const { data, error } = await supabase.from('documents').select('*').eq('owner_id', currentEntityId).eq('owner_type', ownerType).order('created_at', { ascending: false });
      if (error) throw error;
      const mappedDocs = await Promise.all((data || []).map(async (doc: any) => {
        const { data: signedData } = await supabase.storage.from('app-uploads').createSignedUrl(doc.file_url, 3600);
        return {
          id: doc.id.toString(), type: DOC_TYPE_MAP[doc.type] || doc.type.toString(), category: DOC_CATEGORY_MAP[doc.category] || 'Outros',
          name: doc.file_url ? doc.file_url.split('/').pop() : 'Documento', date: new Date(doc.created_at).toLocaleString('pt-BR'),
          status: DOC_STATUS_MAP[doc.status] || 'Pendente', statusId: doc.status, url: signedData?.signedUrl || '#', filePath: doc.file_url
        };
      }));
      setUploadedDocs(mappedDocs);
    } catch (error) { console.error(error); }
  };

  const handleFileUpload = async (file: File) => {
    if (isReadOnly) return;
    if (!currentEntityId) { alert("É necessário salvar o cadastro antes de anexar documentos."); return; }
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(fileExtension)) { alert(`Formato não suportado.`); return; }

    setIsLoading(true);
    try {
      const folder = entityType === 'executive' ? 'executives' : 'customers';
      const filePath = `${folder}/${currentEntityId}/${file.name}`;
      const { error } = await supabase.storage.from('app-uploads').upload(filePath, file, { upsert: true });
      if (error) throw new Error(error.message);

      const typeId = DOC_VALUE_TO_ID[selectedDocType] || 1;
      let categoryId = 1;
      if (typeId === 6) categoryId = 3; // Residência
      if (typeId === 7) categoryId = 2; // Contrato
      
      const ownerType = entityType === 'client' ? 1 : 2;

      const { error: dbError } = await supabase.from('documents').insert({
        category: categoryId, type: typeId, file_url: filePath, status: 1, owner_id: currentEntityId, owner_type: ownerType, is_valid: true
      });
      if (dbError) throw dbError;

      if (typeId === 7 && entityType === 'client') {
        const execName = currentUserName || 'Executivo';
        
        // Resetar status para pendente e limpar motivo de rejeição para permitir nova aprovação
        await supabase.from('customers').update({ 
            registration_status: 'pending',
            registration_rejection_reason: null
        }).eq('id', currentEntityId);

        await supabase.from('notifications').insert({
           type: 'new_registration_analysis',
           target_role: 0, // HEAD
           title: 'Contrato Enviado',
           message: JSON.stringify({ 
               executive: execName, 
               client: formData.name,
               subtype: 'contract_upload'
           }),
           related_entity_id: currentEntityId,
           status: 'unread'
       });
      }

      await fetchDocuments();
    } catch (error: any) { alert(`Erro ao enviar arquivo: ${error.message}`); } finally { setIsLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteDocument = async (doc: UploadedDocument) => {
    if (isReadOnly) return;
    if (doc.status === 'Ativo' && userRole !== UserRole.HEAD) return;
    if (window.confirm(`Excluir ${doc.name}?`)) {
      try {
        if (doc.filePath) await supabase.storage.from('app-uploads').remove([doc.filePath]);
        await supabase.from('documents').delete().eq('id', doc.id);
        await fetchDocuments();
      } catch (error: any) { alert(`Erro: ${error.message}`); }
    }
  };

  const handleDocumentStatusChange = async (doc: UploadedDocument, newStatus: number) => {
    if (isReadOnly || !currentEntityId) return;
    try {
        const { error } = await supabase.from('documents').update({ status: newStatus }).eq('id', doc.id);
        if (error) throw error;
        await fetchDocuments();
    } catch (error) {
        console.error(error);
        alert('Erro ao atualizar status do documento.');
    }
  };

  useEffect(() => {
    if (isOpen && currentEntityId) {
      fetchBankAccounts();
      fetchDocuments();
    }
  }, [isOpen, currentEntityId]);

  const handleToggleBank = async (id: string) => {
    if (isReadOnly || !currentEntityId) return;
    const updatedAccounts = bankAccounts.map(acc => ({ ...acc, isActive: acc.id === id }));
    setBankAccounts(updatedAccounts);
    try {
      const idField = entityType === 'executive' ? 'executive_id' : 'customer_id';
      await supabase.from('bank_accounts').update({ is_primary: false }).eq(idField, currentEntityId);
      await supabase.from('bank_accounts').update({ is_primary: true }).eq('id', id);
      fetchBankAccounts();
    } catch (error) { fetchBankAccounts(); }
  };

  const handleDeleteBank = async (account: BankAccountCardData) => {
    if (isReadOnly || !currentEntityId) return;
    if (window.confirm(`Remover ${account.bankName}?`)) {
      try {
        await supabase.from('bank_accounts').delete().eq('id', account.id);
        fetchBankAccounts();
      } catch (error) { alert('Erro ao excluir conta.'); }
    }
  };

  const handleEditBank = (account: BankAccountCardData) => {
    if (isReadOnly) return;
    setEditingAccount(account);
    setShowAddBankModal(true);
  };

  const handleSaveBank = async (data: NewBankData) => {
    if (isReadOnly || !currentEntityId) return;
    setIsLoading(true);
    try {
      let bankName = BANKS.find(b => b.code === data.bankCode)?.name || '';
      let bankId = data.bankCode;
      const idField = entityType === 'executive' ? 'executive_id' : 'customer_id';

      if (data.accountType === 'PIX') {
        bankName = 'Chave Pix';
        bankId = '000';
      }

      const payload: any = {
        [idField]: currentEntityId, account_type: data.accountType === 'BANK' ? 1 : 2,
        bank_id: bankId, bank_name: bankName, is_primary: editingAccount ? editingAccount.isActive : bankAccounts.length === 0
      };

      if (data.accountType === 'BANK') {
        Object.assign(payload, { agency: data.agency, account: data.account, digit: data.digit, account_kind: 1, account_holder: data.holderName || formData.name, pix_key: null, pix_key_type: null });
      }
      if (data.accountType === 'PIX') {
        const pixMap: Record<string, number> = { 'CPF/CNPJ': 1, 'E-mail': 2, 'Celular': 3, 'Aleatória': 4 };
        Object.assign(payload, { pix_key_type: pixMap[data.pixType], pix_key: data.pixKey, agency: null, account: null, digit: null, account_kind: null, account_holder: null });
      }

      if (editingAccount) await supabase.from('bank_accounts').update(payload).eq('id', editingAccount.id);
      else await supabase.from('bank_accounts').insert(payload);

      await fetchBankAccounts();
      setShowAddBankModal(false);
      setEditingAccount(null);
    } catch (error) { alert('Erro ao salvar dados bancários.'); } finally { setIsLoading(false); }
  };

  const handleOnboardingAction = async (step: 'aptitude' | 'analysis' | 'registration', action: 'approve' | 'reject' | 'submit', reason?: string) => {
    if (!currentEntityId) return;

    // Validação rigorosa para aprovação da análise pelo HEAD
    if (step === 'analysis' && action === 'approve') {
      // 1. Validar Campos do Formulário (Mesma lógica do handleSave)
      const requiredFields = isPF 
        ? ['name', 'document', 'email', 'birthDate', 'phone', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado']
        : ['razaoSocial', 'cnpj', 'representativeName', 'email', 'phone', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado'];

      const newErrors: Record<string, boolean> = {};
      let hasError = false;
      requiredFields.forEach(field => { if (!formData[field as keyof typeof formData]) { newErrors[field] = true; hasError = true; } });
      
      if (docError || cnpjError || cepError || ageError || Object.keys(duplicateErrors).length > 0) hasError = true;

      if (hasError) {
        setFieldErrors(newErrors);
        alert('Não é possível aprovar: Existem pendências ou campos inválidos no formulário de cadastro.');
        return;
      }

      // 2. Validar Banco Ativo
      const hasActiveBank = bankAccounts.some(acc => acc.isActive && acc.isValid);
      if (!hasActiveBank) {
        alert('Não é possível aprovar: O cliente deve possuir pelo menos uma conta bancária ativa e válida.');
        return;
      }

      // 3. Validar Documentos Aceitos (Identidade e Residência)
      const hasApprovedIdentity = uploadedDocs.some(doc => (['RG', 'CPF', 'CNH', 'CIN', 'Passaporte'].includes(doc.type) || doc.category === 'Identidade') && doc.status === 'Ativo');
      const hasApprovedResidence = uploadedDocs.some(doc => (doc.type === 'Comprovante de Residência' || doc.category === 'Residência') && doc.status === 'Ativo');

      if (!hasApprovedIdentity || !hasApprovedResidence) {
        alert('Não é possibile aprovar: É necessário ter pelo menos um documento de Identidade e um de Residência com status "Ativo" (Aceito).');
        return;
      }
    }

    // Validação para aprovação final (Registration)
    if (step === 'registration' && action === 'approve') {
        const hasApprovedContract = uploadedDocs.some(doc => 
            (doc.type === 'Contrato' || doc.category === 'Contrato') && 
            doc.status === 'Ativo'
        );

        if (!hasApprovedContract) {
            alert('Não é possível aprovar: É necessário ter pelo menos um Contrato Assinado com status "Ativo" (Aprovado).');
            return;
        }
    }

    setIsLoading(true);
    try {
      const updates: any = {};
      if (step === 'aptitude' && action === 'submit') {
        updates.onboarding_step = 'analysis';
        updates.analysis_status = 'pending';
        updates.account_status = 'pending';

        // Enviar notificação para o HEAD (Reenvio ou Envio Manual)
        const execName = currentUserName || 'Executivo';
        await supabase.from('notifications').insert({
             type: 'new_registration_analysis',
             target_role: 0, // HEAD
             title: 'Cadastro Enviado para Análise',
             message: JSON.stringify({ executive: execName, client: formData.name }),
             related_entity_id: currentEntityId,
             status: 'unread'
         });
      } else if (step === 'analysis') {
        updates.analysis_status = action === 'approve' ? 'approved' : 'rejected';
        updates.analysis_rejection_reason = reason || null;
        if (action === 'approve') {
          updates.onboarding_step = 'password';
          updates.account_status = 'pending';
        } else {
          updates.account_status = 'denied';
        }
      } else if (step === 'registration') {
        updates.registration_status = action === 'approve' ? 'approved' : 'rejected';
        updates.registration_rejection_reason = reason || null;
        if (action === 'approve') {
          updates.onboarding_step = 'completed';
          updates.account_status = 'active';
        } else {
          updates.account_status = 'denied';
        }
      }
      await supabase.from('customers').update(updates).eq('id', currentEntityId);
      if (updates.account_status) setCurrentStatus(updates.account_status);
      const { data } = await supabase.from('customers').select('*').eq('id', currentEntityId).single();
      if (data) setOnboardingState(calculateOnboardingState(formData, bankAccounts, uploadedDocs, data));

      // Se for etapa de análise OU registro, resolver notificação e fechar modal
      if ((step === 'analysis' || step === 'registration') && (action === 'approve' || action === 'reject')) {
          const notifStatus = action === 'approve' ? 'accepted' : 'denied';
          
          // Buscar notificações pendentes deste tipo para este cliente
          const { data: notifications } = await supabase
              .from('notifications')
              .select('id')
              .eq('related_entity_id', currentEntityId)
              .eq('type', 'new_registration_analysis')
              .in('status', ['unread', 'read']);

          if (notifications && notifications.length > 0) {
              await supabase.from('notifications').update({ status: notifStatus }).in('id', notifications.map(n => n.id));
          }
          
          alert(`${step === 'analysis' ? 'Análise' : 'Aprovação Final'} processada com sucesso.`);
          onClose();
          if (onSuccess) onSuccess();
          return;
      }

      alert('Status atualizado com sucesso!');
    } catch (error) { alert('Erro ao atualizar onboarding.'); } finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    setIsLoading(true);
    setFieldErrors({});
    
    const stateId = BRAZILIAN_STATES.findIndex(s => s.value === formData.estado) + 1;
    const requiredFields = isPF 
      ? ['name', 'document', 'email', 'birthDate', 'phone', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado']
      : ['razaoSocial', 'cnpj', 'representativeName', 'email', 'phone', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado'];

    const newErrors: Record<string, boolean> = {};
    let hasError = false;
    requiredFields.forEach(field => { if (!formData[field as keyof typeof formData]) { newErrors[field] = true; hasError = true; } });
    if (docError || cnpjError || cepError || ageError) hasError = true;
    setFieldErrors(newErrors);

    if (hasError) { alert('Erro ao salvar. Verifique os dados.'); setIsLoading(false); return; }

    try {
      const payload: any = {
        customer_type: isPF ? 'PF' : 'PJ', full_name: formData.name,
        cpf: isPF ? (formData.document.replace(/\D/g, '') || null) : null,
        email: formData.email, birth_date: formData.birthDate || null,
        rg: formData.rg, phone: formData.phone || null, whatsapp: formData.whatsapp || null,
        birth_place: formData.birthPlace, postal_code: formData.cep.replace(/\D/g, '') || null,
        street: formData.logradouro, address_number: formData.numero, complement: formData.complemento,
        neighborhood: formData.bairro, city: formData.cidade, state: stateId > 0 ? stateId : null,
        company_name: formData.razaoSocial, cnpj: !isPF ? (formData.cnpj.replace(/\D/g, '') || null) : null,
        marital_status: MARITAL_STATUS_MAP[formData.estadoCivil] || null,
        trade_name: formData.tradeName, representative_name: formData.representativeName, job_title: formData.jobTitle,
      };

      if (entityType === 'executive') {
        payload.role = formData.role;
        payload.leader_id = formData.role === 2 ? (formData.leaderId || null) : null;
      } else {
        payload.executive_id = formData.leaderId || null;
      }

      const table = entityType === 'executive' ? 'executives' : 'customers';
      let savedId = currentEntityId;
      let isNew = !currentEntityId;

      if (currentEntityId) {
        await supabase.from(table).update(payload).eq('id', currentEntityId);
      } else {
        const { data } = await supabase.from(table).insert([payload]).select('id').single();
        if (data) {
          savedId = data.id;
          setCurrentEntityId(data.id);
        }
      }
      onSuccess({ id: savedId ? savedId.toString() : '', isNew });
    } catch (error: any) { alert('Erro ao salvar.'); } finally { setIsLoading(false); }
  };

  const getInputClass = (fieldName: string, errorState: boolean = false) => {
    const hasError = fieldErrors[fieldName] || errorState || !!duplicateErrors[fieldName];
    return `w-full px-4 py-2.5 bg-gray-50 border rounded-xl outline-none shadow-inner transition-all text-secondary ${
      hasError ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-secondary/20'
    }`;
  };

  const renderActionButtons = () => {
    if (!currentEntityId) return null;
    if (entityType === 'executive' && userRole !== UserRole.HEAD) return null;

    // Cabeçalho de Análise para o HEAD
    if (userRole === UserRole.HEAD && onboardingState?.step === 'analysis' && onboardingState?.analysisStatus !== 'rejected') {
      return (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 mr-4">
            <div>
                <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Cadastro em Análise</p>
                <p className="text-[10px] text-blue-600 font-medium leading-tight">Aprovar dados do cliente?</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => handleOnboardingAction('analysis', 'approve')} className="px-4 py-2 bg-white text-green-600 text-[10px] font-black rounded-xl shadow-sm hover:bg-green-50 uppercase border border-green-100">Aceitar</button>
                <button onClick={() => { const r = prompt('Motivo:'); if(r) handleOnboardingAction('analysis', 'reject', r); }} className="px-4 py-2 bg-white text-red-600 text-[10px] font-black rounded-xl shadow-sm hover:bg-red-50 uppercase border border-red-100">Negar</button>
            </div>
         </div>
      );
    }

    // Cabeçalho de Aprovação Final para o HEAD
    if (userRole === UserRole.HEAD && onboardingState?.step === 'registration' && onboardingState?.registrationStatus !== 'rejected' && onboardingState?.hasContractSigned) {
      return (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 mr-4">
            <div>
                <p className="text-[10px] font-black text-purple-800 uppercase tracking-widest mb-1">Aprovação Final</p>
                <p className="text-[10px] text-purple-600 font-medium leading-tight">Aprovar contrato e cadastro?</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => handleOnboardingAction('registration', 'approve')} className="px-4 py-2 bg-white text-green-600 text-[10px] font-black rounded-xl shadow-sm hover:bg-green-50 uppercase border border-green-100">Aceitar</button>
                <button onClick={() => { const r = prompt('Motivo:'); if(r) handleOnboardingAction('registration', 'reject', r); }} className="px-4 py-2 bg-white text-red-600 text-[10px] font-black rounded-xl shadow-sm hover:bg-red-50 uppercase border border-red-100">Negar</button>
            </div>
         </div>
      );
    }

    if (currentStatus !== 'archiving' && currentStatus !== 'archived') {
      return (
        <button onClick={() => handleStatusChange('archiving')} className="px-4 py-2 text-[10px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors uppercase tracking-widest border border-transparent hover:border-red-100">Arquivar</button>
      );
    }

    if (userRole === UserRole.HEAD && currentStatus === 'archiving') {
      return (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div>
                <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1">Solicitação de Arquivamento</p>
                <p className="text-[10px] text-orange-600 font-medium leading-tight">Este registro aguarda aprovação.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => handleStatusChange('archived')} className="px-4 py-2 bg-white text-green-600 text-[10px] font-black rounded-xl shadow-sm hover:bg-green-50 uppercase border border-green-100">Aceitar</button>
                <button onClick={() => handleStatusChange(previousStatus || 'pending')} className="px-4 py-2 bg-white text-red-600 text-[10px] font-black rounded-xl shadow-sm hover:bg-red-50 uppercase border border-red-100">Negar</button>
            </div>
         </div>
      );
    }

    return (
      <button onClick={() => handleStatusChange(previousStatus || 'pending')} className="px-4 py-2 text-[10px] font-black text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors uppercase tracking-widest border border-transparent hover:border-green-100">Desarquivar</button>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-secondary/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[95vh] overflow-y-auto sm:rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col font-sans">
        <div className="p-8 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-2xl font-bold text-secondary uppercase tracking-tighter font-display">{TABS[activeTabIndex]}</h3>
              <p className="text-sm text-bodyText font-bold">{initialData?.name || (currentEntityId ? formData.name : t.register)}</p>
            </div>
            <div className="flex items-center gap-4 self-end sm:self-auto">
              <div className="mr-2">{renderActionButtons()}</div>
              <button onClick={onClose} className="text-gray-400 hover:text-secondary rounded-full w-9 h-9 flex items-center justify-center transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <div className="flex gap-8 border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
            {TABS.map((tab, idx) => {
              const isDisabled = !currentEntityId && idx >= 2;
              return (
                <button key={tab} onClick={() => !isDisabled && setActiveTabIndex(idx)} disabled={isDisabled} className={`pb-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTabIndex === idx ? 'text-secondary border-secondary' : 'text-gray-400 border-transparent hover:text-secondary/60'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="min-h-[400px]">
            {activeTabIndex === 0 && (
              <GeneralTab 
                formData={formData} setFormData={setFormData} isPF={isPF} setIsPF={setIsPF}
                isReadOnly={isReadOnly} language={language} userRole={userRole} entityType={entityType}
                docError={docError} setDocError={setDocError} cnpjError={cnpjError} setCnpjError={setCnpjError}
                ageError={ageError} setAgeError={setAgeError} duplicateErrors={duplicateErrors}
                checkDuplicate={checkDuplicate} handleLeaderSearch={handleLeaderSearch}
                leaderOptions={leaderOptions} showLeaderOptions={showLeaderOptions}
                selectLeader={selectLeader} isSearchingLeader={isSearchingLeader}
                validateCPF={validateCPF} validateCNPJ={validateCNPJ} validateAge={validateAge}
                maskCPF={maskCPF} maskCNPJ={maskCNPJ} getInputClass={getInputClass} t={t}
              />
            )}

            {activeTabIndex === 1 && (
              <AddressTab 
                formData={formData} setFormData={setFormData} handleCEPChange={handleCEPChange}
                cepError={cepError} isSearchingCep={isSearchingCep} isReadOnly={isReadOnly}
                getInputClass={getInputClass}
              />
            )}

            {activeTabIndex === 2 && (
              <BankDataTab
                bankAccounts={bankAccounts}
                isReadOnly={isReadOnly}
                onAddBank={() => setShowAddBankModal(true)}
                onToggleBank={handleToggleBank}
                onDeleteBank={handleDeleteBank}
                onEditBank={handleEditBank}
              />
            )}

            {activeTabIndex === 3 && (
              <DocumentsTab
                uploadedDocs={uploadedDocs}
                selectedDocType={selectedDocType}
                setSelectedDocType={setSelectedDocType}
                isReadOnly={isReadOnly}
                onUpdateStatus={handleDocumentStatusChange}
                onFileUpload={handleFileUpload}
                onDeleteDocument={handleDeleteDocument}
                userRole={userRole}
                fileInputRef={fileInputRef}
                acceptedExtensions={ACCEPTED_EXTENSIONS}
                allowContractUpload={entityType === 'executive' || (onboardingState?.step === 'registration' || onboardingState?.step === 'completed')}
              />
            )}

            {activeTabIndex === 4 && (
              <OnboardingTab 
                onboardingState={onboardingState}
                initialData={initialData}
                entityType={entityType}
                userRole={userRole}
                onAction={handleOnboardingAction}
                onNavigateToTab={setActiveTabIndex}
              />
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end gap-4">
            <button onClick={onClose} className="px-8 py-2.5 text-xs font-black text-bodyText hover:text-secondary uppercase tracking-widest transition-colors">{t.cancel}</button>
            <button onClick={handleSave} disabled={docError || cnpjError || cepError || ageError || isLoading || Object.keys(duplicateErrors).length > 0 || isReadOnly} className={`px-14 py-2.5 bg-buttons text-white rounded-[1.5rem] font-black shadow-2xl hover:opacity-95 transform transition-all hover:-translate-y-1 text-xs uppercase tracking-widest ${docError || cnpjError || cepError || ageError || isLoading || Object.keys(duplicateErrors).length > 0 || isReadOnly ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>{isLoading ? '...' : (currentEntityId ? t.save : t.register)}</button>
          </div>
        </div>
      </div>

      {showAddBankModal && (
        <AddBankModal
          isOpen={showAddBankModal}
          onClose={() => { setShowAddBankModal(false); setEditingAccount(null); }}
          onSave={handleSaveBank}
          holderName={formData.name || ''}
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
            holderName: editingAccount.holderName || formData.name || '',
            accountType: editingAccount.type === 'Pix' ? 'PIX' : 'BANK'
          } : undefined}
        />
      )}
    </div>
  );
};

export default RegisterModal;