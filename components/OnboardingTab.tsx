import React from 'react';
import { UserRole } from '../types';
import { OnboardingState } from '../utils/onboardingWorkflow';

interface OnboardingTabProps {
  onboardingState: OnboardingState | null;
  initialData: any;
  entityType: 'executive' | 'client';
  userRole?: UserRole;
  onAction: (step: 'aptitude' | 'analysis' | 'registration', action: 'approve' | 'reject' | 'submit', reason?: string) => Promise<void>;
  onNavigateToTab?: (index: number) => void;
}

const OnboardingTab: React.FC<OnboardingTabProps> = ({
  onboardingState,
  initialData,
  entityType,
  userRole,
  onAction,
  onNavigateToTab
}) => {

  const steps = [
    { 
      id: 'aptitude', 
      label: onboardingState?.isApt ? 'Apto' : 'Não Apto', 
      desc: onboardingState?.isApt ? 'Cliente apto para o consultor lançar uma recomendação de aporte.' : 'É necessário completar e regularizar todos dados do cliente' 
    },
    { id: 'analysis', label: 'Análise', desc: 'Analise dos dados do cliente após recomendação.' },
    { id: 'password', label: 'Acesso', desc: 'O cliente deve validar o email e definir uma senha de acesso.' },
    { id: 'registration', label: 'Cadastro', desc: 'O cliente assinou o contrato e esta habilitado para novos aportes.' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === onboardingState?.step) || 0;

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
            <span className={`px-5 py-2 rounded-full text-[10px] font-black shadow-sm border uppercase tracking-widest ${onboardingState.step === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
              {onboardingState.step === 'completed' ? 'CONCLUÍDO' : steps[currentStepIndex]?.label || 'EM ANDAMENTO'}
            </span>
          </div>

          {/* Timeline Visual */}
          <div className="flex items-start justify-between overflow-x-auto pb-8 gap-4 no-scrollbar">
            {steps.map((step, i, arr) => {
              let status = 'pending';
              if (i < currentStepIndex || onboardingState.step === 'completed') status = 'done';
              else if (i === currentStepIndex) {
                if (step.id === 'aptitude' && !onboardingState.isApt) status = 'error';
                else if (step.id === 'analysis' && onboardingState.analysisStatus === 'rejected') status = 'error';
                else if (step.id === 'registration' && onboardingState.registrationStatus === 'rejected') status = 'error';
                else status = 'current';
              }

              return (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center min-w-[120px] text-center group">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 shadow-lg ${
                      status === 'done' ? 'bg-white border-green-500 text-green-500 ring-4 ring-green-50' : 
                      status === 'error' ? 'bg-white border-red-500 text-red-500 ring-4 ring-red-50' :
                      status === 'current' ? 'bg-white border-blue-500 text-blue-500 ring-4 ring-blue-50' :
                      'bg-gray-50 border-gray-200 text-gray-300'}`}>
                      
                      {status === 'done' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                      {status === 'error' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>}
                      {status === 'current' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                      {status === 'pending' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                    </div>
                    <h5 className={`mt-3 text-[10px] font-black uppercase tracking-widest ${status === 'pending' ? 'text-gray-400' : 'text-secondary'}`}>{step.label}</h5>
                    <p className="mt-1 text-[9px] text-gray-400 leading-tight max-w-[100px]">{step.desc}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="pt-7 flex-1 min-w-[30px] flex items-center justify-center">
                      <svg className={`w-8 h-8 ${status === 'done' ? 'text-green-500' : 'text-gray-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
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
          <div className={`p-8 rounded-[2.5rem] border-2 shadow-sm transition-all animate-in fade-in zoom-in duration-300 ${
            ((onboardingState.step === 'analysis' && onboardingState.analysisStatus === 'rejected') || 
             (onboardingState.step === 'registration' && onboardingState.registrationStatus === 'rejected'))
              ? 'bg-red-50 border-red-200'
              : (onboardingState.step === 'completed' 
                  ? 'bg-green-50 border-green-200'
                  : (onboardingState.step === 'aptitude' 
                      ? (onboardingState.isApt ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')
                      : 'bg-white border-gray-100'))
          }`}>
            <div className="flex items-start justify-between gap-5">
              <div className="flex-1">
                <h5 className={`text-xl font-black uppercase tracking-tighter ${
                    ((onboardingState.step === 'analysis' && onboardingState.analysisStatus === 'rejected') || 
                     (onboardingState.step === 'registration' && onboardingState.registrationStatus === 'rejected')) ? 'text-red-600' : 
                     (onboardingState.step === 'completed' ? 'text-green-600' : 'text-secondary')
                }`}>
                  {onboardingState.step === 'aptitude' && (onboardingState.isApt ? 'Pronto para Análise' : 'Pendências de Aptidão')}
                  {onboardingState.step === 'analysis' && (
                    onboardingState.analysisStatus === 'rejected' ? 'ANÁLISE REJEITADA' : 'Em Análise'
                  )}
                  {onboardingState.step === 'password' && 'Aguardando Senha'}
                  {onboardingState.step === 'registration' && (
                    onboardingState.registrationStatus === 'rejected' ? 'Cadastro Rejeitado' : 'Aguardando Contrato'
                  )}
                  {onboardingState.step === 'completed' && 'Onboarding Concluído'}
                </h5>
                
                <div className="text-sm mt-1 opacity-80 leading-relaxed font-medium">
                  {onboardingState.step === 'aptitude' && !onboardingState.isApt && 'Existem pendências cadastrais que precisam ser resolvidas.'}
                  {onboardingState.step === 'aptitude' && onboardingState.isApt && 'Todos os dados obrigatórios foram preenchidos. Aguardando envio para análise.'}
                  
                  {onboardingState.step === 'analysis' && onboardingState.analysisStatus !== 'rejected' && 'O cadastro está em avaliação pelo setor comercial, responsável pelo processo.'}
                  {onboardingState.step === 'analysis' && onboardingState.analysisStatus === 'rejected' && (
                      <div className="mt-2 text-red-600 font-bold">
                          Motivo: {onboardingState.analysisReason || 'Sem motivo informado.'}
                      </div>
                  )}

                  {onboardingState.step === 'password' && 'Aguardando o cliente definir sua senha de acesso.'}
{/*
                  {onboardingState.step === 'registration' && onboardingState.registrationReason || 'Sem motivo informado.'}
*/}
                  {onboardingState.step === 'completed' && 'Processo de onboarding finalizado com sucesso.'}
                </div>

                {onboardingState.step === 'aptitude' && (
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12">
                    <p className="text-[10px] font-black uppercase tracking-widest col-span-full mb-2 opacity-60">Requisitos:</p>
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
                )}

                {/* Action for Aptitude -> Analysis */}
                {onboardingState.step === 'aptitude' && onboardingState.isApt && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <button onClick={() => onAction('aptitude', 'submit')} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 uppercase tracking-widest shadow-lg shadow-blue-200">
                      Enviar para Análise
                    </button>
                  </div>
                )}

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
                  </div>
                )}

                {onboardingState.step === 'registration' && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3">
                      *O contrato cadastral deve ser enviado através da guia{' '}
                      <span onClick={() => onNavigateToTab?.(3)} className="cursor-pointer underline hover:text-blue-600 transition-colors">
                        Documentos
                      </span>
                    </p>
                    <div className="flex items-center gap-4">
                      {onboardingState.hasContractSigned && onboardingState.registrationStatus !== 'rejected' && (
                        <div className="px-4 py-2 rounded-lg text-xs font-bold bg-green-100 text-green-700">Contrato Enviado</div>
                      )}
                      {userRole === UserRole.HEAD && onboardingState.hasContractSigned && (
                        <button onClick={() => onAction('registration', 'approve')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">Aprovar Final</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Reenvio para Leader/Executive */}
              {onboardingState.step === 'analysis' && onboardingState.analysisStatus === 'rejected' && 
               (userRole === UserRole.EXECUTIVO || userRole === UserRole.EXECUTIVO_LEADER) && (
                  <button 
                    onClick={() => onAction('aptitude', 'submit')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 uppercase tracking-widest shadow-lg shadow-blue-200 shrink-0"
                  >
                    REENVIAR ANÁLISE
                  </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OnboardingTab;