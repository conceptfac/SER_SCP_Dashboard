import { BankAccountCardData } from '../components/BankAccountCard';
import { UploadedDocument } from '../components/DocumentsTab';

// Definição dos IDs baseados nas suas constantes
const DOC_TYPE_IDS = {
  RG: 1,
  CPF: 2,
  CNH: 3,
  CIN: 4,
  PASSAPORTE: 5,
  RESIDENCIA: 6,
  CONTRATO: 7 // Assumindo ID 7 para contrato assinado (ajuste conforme seu DB)
};

export type OnboardingStep = 'aptitude' | 'analysis' | 'password' | 'registration' | 'completed';

export interface OnboardingState {
  step: OnboardingStep;
  isApt: boolean;
  missingRequirements: string[];
  analysisStatus: 'approved' | 'rejected' | 'pending';
  analysisReason: string | null;
  registrationStatus: 'approved' | 'rejected' | 'pending';
  registrationReason: string | null;
  hasContractSigned: boolean;
}

export const calculateOnboardingState = (
  formData: any,
  bankAccounts: BankAccountCardData[],
  docs: UploadedDocument[],
  dbData: any
): OnboardingState => {
  const missing: string[] = [];

  // 1. Validação de Dados Pessoais
  if (!formData.name) missing.push('Nome Completo');
  if (!formData.document) missing.push('CPF/CNPJ');
  if (!formData.email) missing.push('E-mail');
  if (!formData.phone) missing.push('Telefone');
  if (!formData.logradouro || !formData.cep) missing.push('Endereço Completo');

  // 2. Validação Bancária (Pelo menos uma ativa)
  const hasActiveBank = bankAccounts.some(b => b.isActive); // Adicionei verificação de validade se houver campo b.isValid
  if (!hasActiveBank) missing.push('Conta Bancária Ativa');

  // 3. Validação de Documentos Obrigatórios
  // Identidade (Pelo menos um desses)
  const identityDocs = [DOC_TYPE_IDS.RG, DOC_TYPE_IDS.CPF, DOC_TYPE_IDS.CNH, DOC_TYPE_IDS.CIN, DOC_TYPE_IDS.PASSAPORTE];
  // Docs precisam vir com o ID numérico correto do banco ou string mapeada
  const hasIdentity = docs.some(d => {
    // Tenta converter para número caso venha string, ou compara nomes se necessário
    const typeId = Number(d.type) || 0; 
    // Se d.type vier como string "RG", precisa ajustar a lógica ou garantir que venha o ID. 
    // Assumindo que no fetchDocuments você mapeia para o nome, aqui verificamos pelo nome ou ID se disponível.
    return d.category === 'Identidade' || identityDocs.includes(typeId) || ['RG', 'CPF', 'CNH', 'CIN', 'Passaporte'].includes(d.type);
  });

  if (!hasIdentity) missing.push('Documento de Identidade');

  // Residência
  const hasResidence = docs.some(d => 
    d.category === 'Residência' || 
    Number(d.type) === DOC_TYPE_IDS.RESIDENCIA || 
    d.type === 'Comprovante de Residência'
  );
  if (!hasResidence) missing.push('Comprovante de Residência');

  // Verifica Aptidão
  const isApt = missing.length === 0;

  // Verifica Contrato (Para fase final)
  const hasContractSigned = docs.some(d => d.category === 'Contrato' || d.type.includes('Contrato'));

  // LÓGICA DE TRANSIÇÃO DE ESTADOS
  // A etapa deve ser guiada pelo banco de dados, não apenas pela aptidão
  let currentStep: OnboardingStep = dbData?.onboarding_step || 'aptitude';

  // Se estiver na etapa de aptidão e estiver apto, avança automaticamente para análise
  if (currentStep === 'aptitude' && isApt) {
    currentStep = 'analysis';
  }

  if (currentStep === 'analysis') {
    // Se aprovado na análise, vai para senha
    if (dbData?.analysis_status === 'approved') {
      currentStep = 'password';
    }
  }

  if (currentStep === 'password') {
    // Se já tem senha definida (login efetuado), vai para cadastro final
    if (dbData?.has_password === true) {
      currentStep = 'registration';
    }
  }

  if (currentStep === 'registration') {
    // Se aprovado no cadastro final, completou
    if (dbData?.registration_status === 'approved') {
      currentStep = 'completed';
    }
  }

  // Se por algum motivo o banco estiver em uma etapa avançada mas o cliente não for mais apto (ex: deletou doc),
  // podemos forçar a volta ou apenas sinalizar. Por enquanto, mantemos a consistência visual com o banco.
  // Mas se estiver em 'aptitude' e isApt for true, continuamos em 'aptitude' até o usuário clicar em "Enviar".

  // Se foi rejeitado em alguma etapa, o step se mantém na etapa da rejeição para correção
  if (dbData?.analysis_status === 'rejected') currentStep = 'analysis';
  if (dbData?.registration_status === 'rejected') currentStep = 'registration';

  return {
    step: currentStep,
    isApt,
    missingRequirements: missing,
    analysisStatus: dbData?.analysis_status || 'pending',
    analysisReason: dbData?.analysis_rejection_reason,
    registrationStatus: dbData?.registration_status || 'pending',
    registrationReason: dbData?.registration_rejection_reason,
    hasContractSigned
  };
};