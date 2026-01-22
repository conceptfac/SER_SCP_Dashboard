import React from 'react';
import DatePicker from './DatePicker';
import { Language, UserRole } from '../types';
import { ROLE_MAP } from '../constants';

interface GeneralTabProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isPF: boolean;
  setIsPF: (val: boolean) => void;
  isReadOnly: boolean;
  language: Language;
  userRole?: UserRole;
  entityType: 'executive' | 'client';
  docError: boolean;
  setDocError: (val: boolean) => void;
  cnpjError: boolean;
  setCnpjError: (val: boolean) => void;
  ageError: boolean;
  setAgeError: (val: boolean) => void;
  duplicateErrors: Record<string, string>;
  checkDuplicate: (field: any, value: string) => void;
  handleLeaderSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  leaderOptions: any[];
  showLeaderOptions: boolean;
  selectLeader: (leader: any) => void;
  isSearchingLeader: boolean;
  validateCPF: (cpf: string) => boolean;
  validateCNPJ: (cnpj: string) => boolean;
  validateAge: (date: string) => boolean;
  maskCPF: (v: string) => string;
  maskCNPJ: (v: string) => string;
  getInputClass: (field: string, error?: boolean) => string;
  t: any;
}

const GeneralTab: React.FC<GeneralTabProps> = (props) => {
  const { 
    formData, setFormData, isPF, setIsPF, isReadOnly, language, userRole, entityType, 
    docError, setDocError, cnpjError, setCnpjError, ageError, setAgeError, 
    duplicateErrors, checkDuplicate, handleLeaderSearch, leaderOptions, 
    showLeaderOptions, selectLeader, isSearchingLeader, validateCPF, 
    validateCNPJ, validateAge, maskCPF, maskCNPJ, getInputClass, t 
  } = props;

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex p-1 bg-gray-100 rounded-xl mb-6 w-full sm:w-fit">
        <button 
          onClick={() => {
            if (isReadOnly) return; 
            setIsPF(true); 
            setCnpjError(false); 
            // Limpa erros de CNPJ ao mudar para PF, lógica simplificada via props se necessário, 
            // mas aqui focamos na UI. O pai já limpou via setIsPF wrapper se necessário.
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
                  {Object.entries(ROLE_MAP || {}).map(([key, value]) => (
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
                    {Object.entries(ROLE_MAP || {}).map(([key, value]) => (
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
  );
};

export default GeneralTab;