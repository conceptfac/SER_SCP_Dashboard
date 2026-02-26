import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Language, UserRole } from '../types';
import { TRANSLATIONS, BRAZILIAN_STATES, BANKS } from '../constants';
import DatePicker from './DatePicker';
import BankAccountCard, { BankAccountCardData } from './BankAccountCard';
import AddBankModal, { NewBankData } from './AddBankModal';

interface UploadedDocument {
  id: string;
  type: string;
  category: string;
  name: string;
  date: string;
  status: 'Ativo' | 'Pendente' | 'Rejeitado';
  url: string;
  filePath: string;
}

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  entityType: 'executive' | 'client';
  language: Language;
  userRole?: UserRole;
  currentUserId?: string;
  currentUserName?: string;
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

const DOC_CATEGORY_MAP: Record<number, string> = {
  1: 'Identidade',
  2: 'Contrato',
  3: 'Residência',
  4: 'Outros'
};

const DOC_TYPE_MAP: Record<number, string> = {
  1: 'RG',
  2: 'CPF',
  3: 'CNH',
  4: 'CIN',
  5: 'Passaporte',
  6: 'Comprovante de Residência'
};

const DOC_STATUS_MAP: Record<number, 'Ativo' | 'Pendente' | 'Rejeitado'> = {
  1: 'Pendente',
  2: 'Ativo',
  3: 'Rejeitado'
};

const DOC_VALUE_TO_ID: Record<string, number> = {
  'RG': 1,
  'CPF': 2,
  'CNH': 3,
  'CIN': 4,
  'Passaporte': 5,
  'Residencia': 6
};

const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx', '.pdf', '.ppt', '.pptx', '.txt'];

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSuccess, initialData, entityType, language, userRole, currentUserId, currentUserName }) => {
  const t = TRANSLATIONS[language];
  const TABS = [t.general, t.address, t.bankData, t.documents];
  if (entityType === 'client') TABS.push(t.statusFlow);
  
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isPF, setIsPF] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEntityId, setCurrentEntityId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [cepError, setCepError] = useState(false);
  const [docError, setDocError] = useState(false);
  const [ageError, setAgeError] = useState(false);
  const [duplicateErrors, setDuplicateErrors] = useState<Record<string, string>>({});
  const [cnpjError, setCnpjError] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  
  const [bankAccounts, setBankAccounts] = useState<BankAccountCardData[]>([]);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountCardData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocType, setSelectedDocType] = useState('RG');

  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);

  const [formData, setFormData] = useState({ 
    name: '', document: '', email: '', birthDate: '', rg: '', phone: '', whatsapp: '',
    birthPlace: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    razaoSocial: '', cnpj: '', estadoCivil: '', tradeName: '', representativeName: '', jobTitle: '',
    role: 2, leaderId: null as string | null, leaderName: ''
  });

  const [leaderOptions, setLeaderOptions] = useState<{id: string, name: string}[]>([]);
  const [showLeaderOptions, setShowLeaderOptions] = useState(false);
  const [isSearchingLeader, setIsSearchingLeader] = useState(false);

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

  const loadData = async () => {
    setActiveTabIndex(0);
    setCepError(false);
    setDocError(false);
    setAgeError(false);
    setCnpjError(false);
    setFieldErrors({});
    setDuplicateErrors({});
    setPreviousStatus(null);
    
    if (initialData) {
      const cleanDoc = initialData.document.replace(/\D/g, '');
      setIsPF(cleanDoc.length <= 11);
      setCurrentStatus(initialData.status || 'pending');

      setFormData({
        name: initialData.name,
        document: initialData.document,
        email: initialData.email,
        birthDate: '', rg: '', phone: '', whatsapp: '', birthPlace: '', role: 2, leaderId: null, leaderName: '',
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
        razaoSocial: '', cnpj: '', estadoCivil: '', tradeName: '', representativeName: '', jobTitle: ''
      });

      const table = entityType === 'executive' ? 'executives' : 'customers';
      const { data, error } = await supabase.from(table).select('*').eq('id', initialData.id).single();
      
      if (data && !error) {
        if (data.customer_type === 'PJ') {
          setIsPF(false);
        } else if (data.customer_type === 'PF') {
          setIsPF(true);
        } else {
          setIsPF(!!data.cpf);
        }

        // Atualiza status e status anterior com dados frescos do banco
        if (data.account_status) setCurrentStatus(data.account_status);
        if (data.previous_status) setPreviousStatus(data.previous_status);

        let fetchedLeaderName = '';
        const leaderIdField = entityType === 'executive' ? 'leader_id' : 'executive_id';
        if (data[leaderIdField]) {
            const { data: leaderData } = await supabase.from('executives').select('full_name').eq('id', data[leaderIdField]).single();
            if (leaderData) fetchedLeaderName = leaderData.full_name;
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
      
      // Auto-assign leader if current user is Executive/Leader and creating a client
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
      // Busca a notificação pendente relacionada a esta entidade
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('related_entity_id', entityId)
        .eq('type', 'archive_client')
        .in('status', ['unread', 'read'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (notifications && notifications.length > 0) {
        await supabase
          .from('notifications')
          .update({ status: action })
          .eq('id', notifications[0].id);
      }
    } catch (error) {
      console.error('Erro ao resolver notificação:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentEntityId) return;
    
    const action = newStatus === 'archiving' ? 'arquivar' : 'desarquivar';
    if (!window.confirm(`Deseja realmente ${action} este registro?`)) return;

    setIsLoading(true);
    try {
        const table = entityType === 'executive' ? 'executives' : 'customers';
        
        const updateData: any = { account_status: newStatus };

        // Se estiver arquivando, salva o status atual como anterior
        // Evita salvar 'archiving' ou 'archived' como status anterior para não perder o status original
        if (newStatus === 'archiving' && currentStatus !== 'archiving' && currentStatus !== 'archived') {
            updateData.previous_status = currentStatus;
        }

        const { error } = await supabase
            .from(table)
            .update(updateData)
            .eq('id', currentEntityId);

        if (error) throw error;

        // Se for HEAD aceitando ou negando, resolve a notificação pendente
        if (userRole === UserRole.HEAD && (newStatus === 'archived' || newStatus === 'active' || newStatus === 'pending')) {
             const action = newStatus === 'archived' ? 'accepted' : 'denied';
             await resolveNotification(currentEntityId, action);
        }

        // Enviar notificação para HEADs se quem solicitou não for HEAD
        if (newStatus === 'archiving' && userRole !== UserRole.HEAD) {
            console.log('Enviando notificação de arquivamento para HEADs...');
            const notificationPayload = {
                target_role: 0, // HEAD
                sender_id: currentUserId,
                type: 'archive_client',
                title: 'archive_client', // Usado como chave ou ignorado em favor da tradução
                message: JSON.stringify({
                    executive_id: currentUserId,
                    client_id: currentEntityId
                }),
                related_entity_id: currentEntityId,
                status: 'unread'
            };
            
            const { error: notifError } = await supabase.from('notifications').insert(notificationPayload);
            
            if (notifError) {
                console.error('Erro ao criar notificação:', notifError);
                alert('Erro ao enviar solicitação de arquivamento.');
            }
            else console.log('Notificação criada com sucesso.');
        }

        setCurrentStatus(newStatus);
        if (onSuccess) onSuccess();
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        alert('Erro ao atualizar status.');
    } finally {
        setIsLoading(false);
    }
  };

  const checkDuplicate = async (field: 'document' | 'cnpj' | 'rg' | 'email', value: string) => {
    if (!value || value.length < 3) return;
    
    const table = entityType === 'executive' ? 'executives' : 'customers';
    let query = supabase.from(table).select('id');
    
    if (field === 'document') { // CPF
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

    if (currentEntityId) {
        query = query.neq('id', currentEntityId);
    }

    const { data } = await query;

    if (data && data.length > 0) {
        setDuplicateErrors(prev => ({...prev, [field]: `Este dado já está cadastrado para outro ${entityType === 'executive' ? 'executivo' : 'cliente'}.`}));
    } else {
        setDuplicateErrors(prev => {
            const newErrs = {...prev};
            delete newErrs[field];
            return newErrs;
        });
    }
  };

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
        if (initialData && entityType === 'executive') query = query.neq('id', initialData.id);
        if (currentEntityId && entityType === 'executive') query = query.neq('id', currentEntityId);

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
    if (!currentEntityId) return;
    try {
      const idField = entityType === 'executive' ? 'executive_id' : 'customer_id';
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq(idField, currentEntityId)
        .order('is_primary', { ascending: false })
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

  const fetchDocuments = async () => {
    if (!currentEntityId) return;
    try {
      const ownerType = entityType === 'client' ? 1 : 2;
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', currentEntityId)
        .eq('owner_type', ownerType)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedDocs = await Promise.all((data || []).map(async (doc: any) => {
        // Gera uma URL assinada válida por 1 hora (3600 segundos)
        // Isso funciona tanto para buckets públicos quanto privados
        const { data: signedData } = await supabase.storage
          .from('app-uploads')
          .createSignedUrl(doc.file_url, 3600);

        return {
          id: doc.id.toString(),
          type: DOC_TYPE_MAP[doc.type] || doc.type.toString(),
          category: DOC_CATEGORY_MAP[doc.category] || 'Outros',
          name: doc.file_url ? doc.file_url.split('/').pop() : 'Documento',
          date: new Date(doc.created_at).toLocaleString('pt-BR'),
          status: DOC_STATUS_MAP[doc.status] || 'Pendente',
          url: signedData?.signedUrl || '#',
          filePath: doc.file_url
        };
      }));

      setUploadedDocs(mappedDocs);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (isReadOnly) return;
    if (!currentEntityId) {
      alert("É necessário salvar o cadastro antes de anexar documentos.");
      return;
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(fileExtension)) {
      alert(`Formato de arquivo não suportado. Formatos aceitos: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      const folder = entityType === 'executive' ? 'executives' : 'customers';
      const filePath = `${folder}/${currentEntityId}/${file.name}`;
      
      const { error } = await supabase.storage
        .from('app-uploads')
        .upload(filePath, file, { upsert: true });

      if (error) throw new Error(`Erro no Storage: ${error.message}`);

      const typeId = DOC_VALUE_TO_ID[selectedDocType] || 1;
      const categoryId = typeId === 6 ? 3 : 1; // 6 is Residencia -> Category 3, others -> Category 1
      const ownerType = entityType === 'client' ? 1 : 2;

      const { error: dbError } = await supabase.from('documents').insert({
        category: categoryId, type: typeId, file_url: filePath, status: 1, owner_id: currentEntityId, owner_type: ownerType, is_valid: true
      });
      
      if (dbError) {
        await supabase.storage.from('app-uploads').remove([filePath]);
        throw new Error(`Erro no Banco de Dados: ${dbError.message}`);
      }

      await fetchDocuments();
    } catch (error: any) {
      console.error('Erro ao enviar arquivo:', error);
      if (error.message.includes('row-level security')) {
        alert('Erro de Permissão (RLS): Verifique se as políticas do Supabase permitem inserção para usuários anônimos.');
      } else {
        alert(`Erro ao enviar arquivo: ${error.message}`);
      }
    } finally { setIsLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteDocument = async (doc: UploadedDocument) => {
    if (isReadOnly) return;
    if (doc.status === 'Ativo' && userRole !== UserRole.HEAD) return;

    if (window.confirm(`Deseja realmente excluir o documento ${doc.name}?`)) {
      try {
        if (doc.filePath) {
          const { error: storageError } = await supabase.storage
            .from('app-uploads')
            .remove([doc.filePath]);

          if (storageError) throw new Error(`Erro ao excluir do Storage: ${storageError.message}`);
        }

        const { error } = await supabase.from('documents').delete().eq('id', doc.id);
        if (error) throw error;
        await fetchDocuments();
      } catch (error: any) {
        console.error('Erro ao excluir documento:', error);
        alert(`Erro ao excluir documento: ${error.message || error}`);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTabIndex === 2) fetchBankAccounts();
      if (activeTabIndex === 3) fetchDocuments();
    }
  }, [isOpen, activeTabIndex, initialData]);

  const handleToggleBank = async (id: string) => {
    if (isReadOnly) return;
    if (!currentEntityId) return;

    const updatedAccounts = bankAccounts.map(acc => ({
      ...acc,
      isActive: acc.id === id
    }));
    setBankAccounts(updatedAccounts);

    try {
      const idField = entityType === 'executive' ? 'executive_id' : 'customer_id';
      await supabase
        .from('bank_accounts')
        .update({ is_primary: false })
        .eq(idField, currentEntityId);

      await supabase
        .from('bank_accounts')
        .update({ is_primary: true })
        .eq('id', id);
      
      fetchBankAccounts();
    } catch (error) {
      console.error('Erro ao atualizar conta principal:', error);
      fetchBankAccounts();
    }
  };

  const handleDeleteBank = async (account: BankAccountCardData) => {
    if (isReadOnly) return;
    if (!currentEntityId) return;
    
    const confirmMessage = `Deseja mesmo remover a instituicao ${account.bankName} do cliente ${formData.name}?`;
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

  const handleEditBank = (account: BankAccountCardData) => {
    if (isReadOnly) return;
    setEditingAccount(account);
    setShowAddBankModal(true);
  };

  const handleSaveBank = async (data: NewBankData) => {
    if (isReadOnly) return;
    if (!currentEntityId) return;
    setIsLoading(true);
    try {
      const bankName = BANKS.find(b => b.code === data.bankCode)?.name || '';
      const idField = entityType === 'executive' ? 'executive_id' : 'customer_id';
      
      const payload: any = {
        [idField]: currentEntityId,
        account_type: data.accountType === 'BANK' ? 1 : 2,
        bank_id: data.bankCode,
        bank_name: bankName,
        is_primary: editingAccount ? editingAccount.isActive : bankAccounts.length === 0
      };

      if (data.accountType === 'BANK') {
        const kindMap: Record<string, number> = { 'Corrente': 1, 'Poupança': 2, 'Conjunta': 3 };
        Object.assign(payload, {
          agency: data.agency,
          account: data.account,
          digit: data.digit,
          account_kind: kindMap[data.kind],
          account_holder: data.holderName || formData.name,
          pix_key: null, pix_key_type: null
        });
      }

      if (data.accountType === 'PIX') {
        const pixMap: Record<string, number> = { 'CPF/CNPJ': 1, 'E-mail': 2, 'Celular': 3, 'Aleatória': 4 };
        Object.assign(payload, {
          pix_key_type: pixMap[data.pixType],
          pix_key: data.pixKey,
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

  const handleSave = async () => {
    if (isReadOnly) return;
    try {
      setIsLoading(true);
      setFieldErrors({});
      
      const stateId = BRAZILIAN_STATES.findIndex(s => s.value === formData.estado) + 1;
      const maritalStatusId = MARITAL_STATUS_MAP[formData.estadoCivil] || null;
      
      const requiredFields = isPF 
        ? ['name', 'document', 'email', 'birthDate', 'phone', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado']
        : ['razaoSocial', 'cnpj', 'representativeName', 'email', 'phone', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado'];

      const newErrors: Record<string, boolean> = {};
      let hasError = false;

      requiredFields.forEach(field => {
        if (!formData[field as keyof typeof formData]) {
          newErrors[field] = true;
          hasError = true;
        }
      });

      if (docError || cnpjError || cepError || ageError) hasError = true;

      setFieldErrors(newErrors);

      if (hasError) {
        alert('Erro ao salvar. Verifique os dados.');
        setIsLoading(false);
        return;
      }

      const payload: any = {
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
      };

      if (entityType === 'executive') {
        payload.role = formData.role;
        payload.leader_id = formData.role === 2 ? (formData.leaderId || null) : null;
      } else {
        payload.executive_id = formData.leaderId || null;
      }

      const table = entityType === 'executive' ? 'executives' : 'customers';
      let error;
      const isCreating = !currentEntityId;

      if (currentEntityId) {
        const { error: updateError } = await supabase
          .from(table)
          .update(payload)
          .eq('id', currentEntityId);
        error = updateError;
        if (!error) {
          alert('Alterações salvas com sucesso!');
        }
      } else {
        const { data, error: insertError } = await supabase
          .from(table)
          .insert([payload])
          .select('id')
          .single();
        error = insertError;
        if (!error && data) {
          setCurrentEntityId(data.id);
        }
      }

      if (error) {
        if (error.code === '23514' && error.message.includes('customer_type_check')) {
           alert('ERRO DE BANCO DE DADOS: É necessário rodar o script SQL para permitir cadastro de PF.');
           setIsLoading(false);
           return;
        }
        throw error;
      }

      if (isCreating) {
        alert('Cadastro realizado com sucesso! Agora você pode adicionar dados bancários e documentos.');
        setActiveTabIndex(2);
      } else {
        onSuccess(); // Re-fetches the list in the parent component
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar. Verifique os dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Apto': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pendente': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Não Apto': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
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

    if (currentStatus !== 'archiving' && currentStatus !== 'archived') {
      return (
        <button 
          onClick={() => handleStatusChange('archiving')}
          className="px-4 py-2 text-[10px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors uppercase tracking-widest border border-transparent hover:border-red-100"
        >
          Arquivar
        </button>
      );
    }

    const canManage = currentStatus === 'archiving' || userRole === UserRole.HEAD;
    if (!canManage) return null;

    if (userRole === UserRole.HEAD && currentStatus === 'archiving') {
      return (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div>
                <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1">Solicitação de Arquivamento</p>
                <p className="text-[10px] text-orange-600 font-medium leading-tight">Este registro aguarda aprovação para ser arquivado.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => handleStatusChange('archived')} className="px-4 py-2 bg-white text-green-600 text-[10px] font-black rounded-xl shadow-sm hover:bg-green-50 transition-colors uppercase tracking-widest border border-green-100">Aceitar</button>
                <button onClick={() => handleStatusChange(previousStatus || 'pending')} className="px-4 py-2 bg-white text-red-600 text-[10px] font-black rounded-xl shadow-sm hover:bg-red-50 transition-colors uppercase tracking-widest border border-red-100">Negar</button>
            </div>
         </div>
      );
    }

    return (
      <button 
        onClick={() => handleStatusChange(previousStatus || 'pending')}
        className="px-4 py-2 text-[10px] font-black text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors uppercase tracking-widest border border-transparent hover:border-green-100"
      >
        Desarquivar
      </button>
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
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="flex p-1 bg-gray-100 rounded-xl mb-6 w-full sm:w-fit">
                  <button 
                    onClick={() => {
                      if (isReadOnly) return; 
                      setIsPF(true); 
                      setCnpjError(false); 
                      setDuplicateErrors(prev => { const n = {...prev}; delete n.cnpj; return n; });
                      setFieldErrors({});
                    }} 
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${isPF ? 'bg-white text-primary shadow-sm' : 'text-gray-400'} ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {t.pf}
                  </button>
                  <button 
                    onClick={() => {
                      if (isReadOnly) return; 
                      setIsPF(false); 
                      setDocError(false); 
                      setDuplicateErrors(prev => { const n = {...prev}; delete n.document; delete n.rg; return n; });
                      setFieldErrors({});
                    }} 
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isPF ? 'bg-white text-primary shadow-sm' : 'text-gray-400'} ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {t.pj}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isPF ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Completo (*)</label>
                        <input type="text" className={getInputClass('name')} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={isReadOnly} />
                      </div>
                      <div>
                        <DatePicker 
                          label="Nascimento (*)" 
                          value={formData.birthDate} 
                          onChange={(d) => {
                            setFormData({...formData, birthDate: d});
                            setAgeError(!validateAge(d));
                          }} 
                          language={language} 
                          disabled={isReadOnly}
                        />
                        {ageError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">É necessário ser maior de 18 anos</p>}
                      </div>
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
                          onBlur={(e) => checkDuplicate('document', e.target.value)}
                          disabled={isReadOnly}
                        />
                        {docError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Documento inválido</p>}
                        {duplicateErrors.document && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">{duplicateErrors.document}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado Civil</label>
                        <select className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none shadow-inner text-sm font-bold text-secondary ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`} value={formData.estadoCivil} onChange={(e) => setFormData({...formData, estadoCivil: e.target.value})} disabled={isReadOnly}>
                          <option value="">Selecione...</option>
                          <option>Solteiro(a)</option>
                          <option>Casado(a)</option>
                          <option>Divorciado(a)</option>
                          <option>Viúvo(a)</option>
                        </select>
                      </div>
                      {entityType === 'executive' && (
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nível de Acesso (*)</label>
                          <select className={getInputClass('role')} value={formData.role} onChange={(e) => setFormData({...formData, role: parseInt(e.target.value)})} disabled={isReadOnly}>
                            {Object.entries(ROLE_MAP).map(([key, value]) => (
                              <option key={key} value={key}>{value}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {(entityType === 'client' || (entityType === 'executive' && formData.role === 2)) && (
                        <div className="relative">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{entityType === 'client' ? 'Consultor Responsável' : 'Líder Responsável'}</label>
                          <input 
                            type="text" 
                            className={getInputClass('leaderName')} 
                            value={formData.leaderName} 
                            onChange={handleLeaderSearch} 
                            placeholder="Busque por nome..." 
                            disabled={(entityType === 'client' && userRole !== UserRole.HEAD) || isReadOnly}
                          />
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
                        <input type="text" className={getInputClass('rg')} value={formData.rg} onChange={(e) => setFormData({...formData, rg: e.target.value})} onBlur={(e) => checkDuplicate('rg', e.target.value)} disabled={isReadOnly} />
                        {duplicateErrors.rg && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">{duplicateErrors.rg}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Naturalidade</label>
                        <input type="text" className={getInputClass('birthPlace')} value={formData.birthPlace} onChange={(e) => setFormData({...formData, birthPlace: e.target.value})} disabled={isReadOnly} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail (*)</label>
                        <input type="email" className={getInputClass('email')} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} onBlur={(e) => checkDuplicate('email', e.target.value)} disabled={isReadOnly} />
                        {duplicateErrors.email && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">{duplicateErrors.email}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefone (*)</label>
                          <input type="text" className={getInputClass('phone')} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} disabled={isReadOnly} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">WhatsApp</label>
                          <input type="text" className={getInputClass('whatsapp')} value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} disabled={isReadOnly} />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Razão Social (*)</label>
                        <input type="text" className={getInputClass('razaoSocial')} value={formData.razaoSocial} onChange={(e) => setFormData({...formData, razaoSocial: e.target.value})} disabled={isReadOnly} />
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
                        }} 
                        onBlur={(e) => checkDuplicate('cnpj', e.target.value)}
                        disabled={isReadOnly}
                        />
                        {cnpjError && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">Documento inválido</p>}
                        {duplicateErrors.cnpj && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">{duplicateErrors.cnpj}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome Fantasia</label>
                        <input type="text" className={getInputClass('tradeName')} value={formData.tradeName} onChange={(e) => setFormData({...formData, tradeName: e.target.value})} disabled={isReadOnly} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nome do Representante (*)</label>
                        <input type="text" className={getInputClass('representativeName')} value={formData.representativeName} onChange={(e) => setFormData({...formData, representativeName: e.target.value})} disabled={isReadOnly} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cargo do Representante</label>
                        <input type="text" className={getInputClass('jobTitle')} value={formData.jobTitle} onChange={(e) => setFormData({...formData, jobTitle: e.target.value})} disabled={isReadOnly} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail (*)</label>
                        <input type="email" className={getInputClass('email')} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} onBlur={(e) => checkDuplicate('email', e.target.value)} disabled={isReadOnly} />
                        {duplicateErrors.email && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tighter">{duplicateErrors.email}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefone (*)</label>
                        <input type="text" className={getInputClass('phone')} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} disabled={isReadOnly} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {entityType === 'executive' && (
                        <>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nível de Acesso (*)</label>
                            <select className={getInputClass('role')} value={formData.role} onChange={(e) => setFormData({...formData, role: parseInt(e.target.value)})} disabled={isReadOnly}>
                              {Object.entries(ROLE_MAP).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                              ))}
                            </select>
                          </div>
                          {formData.role === 2 && (
                            <div className="relative">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Líder Responsável</label>
                              <input type="text" className={getInputClass('leaderName')} value={formData.leaderName} onChange={handleLeaderSearch} placeholder="Busque por nome..." disabled={isReadOnly} />
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
                        </>
                      )}
                      {entityType === 'client' && (
                         <div className="relative">
                           <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Consultor Responsável</label>
                           <input 
                              type="text" 
                              className={getInputClass('leaderName')} 
                              value={formData.leaderName} 
                              onChange={handleLeaderSearch} 
                              placeholder="Busque por nome..." 
                              disabled={(userRole !== UserRole.HEAD) || isReadOnly}
                           />
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
                      disabled={isReadOnly}
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
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="col-span-12 md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Número</label>
                    <input 
                      type="text" 
                      className={getInputClass('numero')}
                      value={formData.numero}
                      onChange={(e) => setFormData({...formData, numero: e.target.value})}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Complemento</label>
                    <input 
                      type="text" 
                      className={getInputClass('complemento')}
                      value={formData.complemento}
                      onChange={(e) => setFormData({...formData, complemento: e.target.value})}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bairro</label>
                    <input 
                      type="text" 
                      className={getInputClass('bairro')}
                      value={formData.bairro}
                      onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cidade (*)</label>
                    <input 
                      type="text" 
                      className={getInputClass('cidade')}
                      value={formData.cidade}
                      onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Estado (*)</label>
                    <select 
                      className={getInputClass('estado')}
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}
                      disabled={isReadOnly}
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
                  <button onClick={() => setShowAddBankModal(true)} disabled={isReadOnly} className={`flex items-center gap-2 px-6 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold shadow-xl hover:opacity-95 transform transition-all hover:-translate-y-0.5 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
                <div className={`p-10 bg-gray-50 border-2 border-dashed ${isDragging ? 'border-secondary bg-secondary/5' : 'border-gray-200'} rounded-[3rem] flex flex-col items-center text-center transition-colors ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`} onDragOver={!isReadOnly ? handleDragOver : undefined} onDragLeave={!isReadOnly ? handleDragLeave : undefined} onDrop={!isReadOnly ? handleDrop : undefined}>
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-secondary mb-4 shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                  </div>
                  <h4 className="text-sm font-black text-secondary uppercase tracking-[0.1em] mb-2">Central de Arquivos do Executivo</h4>
                  <p className="text-[11px] text-bodyText mb-8 max-lg">Anexe os documents necessários para validação do perfil.</p>
                  
                  <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} accept={ACCEPTED_EXTENSIONS.join(',')} disabled={isReadOnly} />
                  <div className="w-full max-xl flex flex-col sm:flex-row gap-4 items-center">
                    <select className={`w-full flex-1 px-5 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none text-[11px] font-black uppercase tracking-widest shadow-sm appearance-none cursor-pointer text-secondary ${isReadOnly ? 'cursor-not-allowed' : ''}`} value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)} disabled={isReadOnly}>
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
                    <button onClick={() => fileInputRef.current?.click()} disabled={isReadOnly} className={`w-full sm:w-auto px-12 py-3.5 bg-secondary text-white text-[10px] font-black rounded-2xl shadow-2xl hover:opacity-95 uppercase tracking-[0.2em] transition-all transform hover:-translate-y-1 ${isReadOnly ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}>ANEXAR</button>
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
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${doc.status === 'Ativo' ? 'bg-green-100 text-green-700 border-green-200' : doc.status === 'Rejeitado' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                  {doc.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => window.open(doc.url, '_blank')} className="p-2 text-secondary hover:bg-secondary/10 rounded-xl transition-all mr-2" title="Visualizar"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
                                {(doc.status !== 'Ativo' || userRole === UserRole.HEAD) && !isReadOnly && (
                                  <button onClick={() => handleDeleteDocument(doc)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all" title="Excluir">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                  </button>
                                )}
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
                      <p className="text-xs text-bodyText mt-1">Status atual: <span className="font-bold text-secondary">{initialData?.name || (entityType === 'executive' ? 'Executivo' : 'Cliente')}</span></p>
                    </div>
                    <span className={`px-5 py-2 rounded-full text-[10px] font-black shadow-sm border uppercase tracking-widest ${getStatusColor(initialData?.status || 'Pendente')}`}>{initialData?.status || 'Pendente'}</span>
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

                <div className={`p-8 rounded-[2.5rem] border-2 shadow-sm transition-all animate-in fade-in zoom-in duration-300 ${initialData?.status === 'Apto' ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                  <div className="flex items-start gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${initialData?.status === 'Apto' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {initialData?.status === 'Apto' ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h5 className="text-xl font-black uppercase tracking-tighter">Cliente {initialData?.status === 'Apto' ? 'Apto' : 'Inapto'}</h5>
                        <p className="text-sm mt-1 opacity-80 leading-relaxed font-medium">
                          {initialData?.status === 'Apto' 
                            ? 'Este cliente atende a todos os requisitos obrigatórios e está apto para realizar operações.'
                            : 'Atenção: O cadastro deste cliente possui pendências críticas que impossibilitam o aporte imediato.'}
                        </p>

                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12">
                            <p className="text-[10px] font-black uppercase tracking-widest col-span-full mb-2 opacity-60">Requisitos Atendidos:</p>
                            {[
                              { label: 'Dados Pessoais', ok: true },
                              { label: 'Idade mínima 18 anos', ok: true },
                              { label: 'E-mail confirmado', ok: true },
                              { label: 'Documentos de Identificação', ok: initialData?.status === 'Apto' },
                              { label: 'Comprovante de residência', ok: true },
                              { label: 'Dados bancários', ok: initialData?.status === 'Apto' }
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
