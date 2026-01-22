import React from 'react';
import { BRAZILIAN_STATES } from '../constants';

interface AddressTabProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleCEPChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cepError: boolean;
  isSearchingCep: boolean;
  isReadOnly: boolean;
  getInputClass: (field: string, error?: boolean) => string;
}

const AddressTab: React.FC<AddressTabProps> = ({
  formData,
  setFormData,
  handleCEPChange,
  cepError,
  isSearchingCep,
  isReadOnly,
  getInputClass
}) => {
  return (
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
  );
};

export default AddressTab;