import React from 'react';
import { UserRole } from '../types';
import { OnboardingState } from '../utils/onboardingWorkflow';

interface OnboardingTabProps {
  onboardingState: OnboardingState | null;
  initialData: any;
  entityType: 'executive' | 'client';
  userRole?: UserRole;
  onAction: (step: 'analysis' | 'registration', action: 'approve' | 'reject', reason?: string) => Promise<void>;
}

const OnboardingTab: React.FC<OnboardingTabProps> = ({
  onboardingState,
  initialData,
  entityType,
  userRole,
  onAction
}) => {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Apto': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pendente': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Não Apto': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-left-2 duration-300 p-2">
      {onboardingState && (
        <>
          {/* Header da Aba */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-6">
            <div>
              <h4 className="text-xl font-bold text-secondary uppercase tracking-tighter font-display">Fluxo de Onboarding</h4>
              <p className="text-xs text-bodyText mt-1">Status atual: <span className="font-bold text-secondary">{initialData?.name || (entityType === 'executive' ? 'Executivo' : 'Cliente')}</span></p>
            </div>
            <span className={`px-5 py-2 rounded-full text-[10px] font-black shadow-sm border uppercase tracking-widest ${getStatusColor(initialData?.status || 'Pendente')}`}>
              {initialData?.status || 'Pendente'}
            </span>
          </div>

          {/* Timeline Visual */}
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

          {/* Legenda */}
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

          {/* Detalhes e Ações */}
          <div className={`p-8 rounded-[2.5rem] border-2 shadow-sm transition-all animate-in fade-in zoom-in duration-300 ${onboardingState.isApt ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
            <div className="flex items-start gap-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${onboardingState.isApt ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {onboardingState.isApt ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                )}
              </div>
              <div className="flex-1">
                <h5 className="text-xl font-black uppercase tracking-tighter">
                  {onboardingState.step === 'aptitude' ? (onboardingState.isApt ? 'Cliente Apto' : 'Cliente Inapto') : 
                   onboardingState.step === 'analysis' ? 'Em Análise' :
                   onboardingState.step === 'password' ? 'Aguardando Senha' :
                   onboardingState.step === 'registration' ? 'Cadastro Final' : 'Concluído'}
                </h5>
                <p className="text-sm mt-1 opacity-80 leading-relaxed font-medium">
                  {onboardingState.step === 'aptitude' && !onboardingState.isApt && 'Existem pendências cadastrais que precisam ser resolvidas.'}
                  {onboardingState.step === 'aptitude' && onboardingState.isApt && 'Todos os dados obrigatórios foram preenchidos. Aguardando envio para análise.'}
                  {onboardingState.step === 'analysis' && 'O cadastro está sob análise de um HEAD.'}
                  {onboardingState.step === 'password' && 'Aguardando o cliente definir sua senha de acesso.'}
                  {onboardingState.step === 'registration' && 'Aguardando assinatura de contrato e aprovação final.'}
                  {onboardingState.step === 'completed' && 'Processo de onboarding finalizzato com sucesso.'}
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12">
                  <p className="text-[10px] font-black uppercase tracking-widest col-span-full mb-2 opacity-60">Requisitos Atendidos:</p>
                  {[
                    { label: 'Dados Pessoais', ok: !onboardingState.missingRequirements.includes('Nome Completo') && !onboardingState.missingRequirements.includes('CPF/CNPJ') },
                    { label: 'Contato (Email/Tel)', ok: !onboardingState.missingRequirements.includes('E-mail') && !onboardingState.missingRequirements.includes('Telefone') },
                    { label: 'Endereço Completo', ok: !onboardingState.missingRequirements.includes('Endereço Completo') },
                    { label: 'Conta Bancária', ok: !onboardingState.missingRequirements.includes('Conta Bancária Ativa e Válida') },
                    { label: 'Documento Identidade', ok: !onboardingState.missingRequirements.includes('Documento de Identidade') },
                    { label: 'Comp. Residência', ok: !onboardingState.missingRequirements.includes('Comprovante de Residência') }
                  ].map((req, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d={req.ok ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}/></svg>
                      </div>
                      <span className="text-xs font-bold tracking-tight">{req.label}</span>
                    </div>
                  ))}
                </div>

                {/* Actions for HEAD */}
                {userRole === UserRole.HEAD && onboardingState.step === 'analysis' && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3">Ação Necessária (HEAD):</p>
                    <div className="flex gap-3">
                      <button onClick={() => onAction('analysis', 'approve')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">Aprovar Análise</button>
                      <button onClick={() => {
                        const reason = prompt('Motivo da rejeição:');
                        if (reason) onAction('analysis', 'reject', reason);
                      }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">Rejeitar</button>
                    </div>
                    {onboardingState.analysisStatus === 'rejected' && (
                      <p className="mt-2 text-xs text-red-600 font-bold">Motivo da rejeição: {onboardingState.analysisStatus}</p>
                    )}
                  </div>
                )}

                {userRole === UserRole.HEAD && onboardingState.step === 'registration' && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3">Ação Necessária (HEAD):</p>
                    <div className="flex gap-3">
                      <button onClick={() => onAction('registration', 'approve')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">Aprovar Cadastro Final</button>
                      <button onClick={() => {
                        const reason = prompt('Motivo da rejeição:');
                        if (reason) onAction('registration', 'reject', reason);
                      }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">Rejeitar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OnboardingTab;