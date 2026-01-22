export type OnboardingStep = 'aptitude' | 'analysis' | 'password' | 'registration' | 'completed';

export interface OnboardingState {
  step: OnboardingStep;
  isApt: boolean;
  missingRequirements: string[];
  analysisStatus?: 'approved' | 'rejected' | 'pending';
  registrationStatus?: 'approved' | 'rejected' | 'pending';
}

export const calculateOnboardingState = (formData: any, bankAccounts: any[], docs: any[], dbData: any): OnboardingState => {
  const missing: string[] = [];
  
  // Validações básicas
  if (!formData.name) missing.push('Nome Completo');
  if (!formData.document) missing.push('CPF/CNPJ');
  if (bankAccounts.length === 0) missing.push('Conta Bancária Ativa');
  
  const hasRG = docs.some(d => d.type === 'RG' || d.type === 'CNH');
  if (!hasRG) missing.push('Documento de Identidade');

  const isApt = missing.length === 0;
  
  // Lógica de Step baseada no que vem do Banco de Dados
  let currentStep: OnboardingStep = 'aptitude';
  if (isApt) currentStep = 'analysis';
  if (dbData?.analysis_status === 'approved') currentStep = 'password';
  if (dbData?.has_password) currentStep = 'registration';
  if (dbData?.registration_status === 'approved') currentStep = 'completed';

  return {
    step: currentStep,
    isApt,
    missingRequirements: missing,
    analysisStatus: dbData?.analysis_status,
    registrationStatus: dbData?.registration_status
  };
};