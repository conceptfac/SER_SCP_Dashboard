import React, { useState } from 'react';
import { UserRole } from '../types';
import { DOC_CATEGORY_MAP, DOC_TYPE_MAP, DOC_STATUS_MAP } from '../constants'; // Assumindo que você possa mover isso, ou defina localmente se preferir

// Definindo a interface localmente para garantir compatibilidade se não estiver no types.ts
export interface UploadedDocument {
  id: string;
  type: string;
  category: string;
  name: string;
  date: string;
  status: 'Ativo' | 'Pendente' | 'Rejeitado';
  url: string;
  filePath: string;
}

interface DocumentsTabProps {
  uploadedDocs: UploadedDocument[];
  selectedDocType: string;
  setSelectedDocType: (val: string) => void;
  isReadOnly: boolean;
  onFileUpload: (file: File) => Promise<void>;
  onDeleteDocument: (doc: UploadedDocument) => Promise<void>;
  userRole?: UserRole;
  fileInputRef: React.RefObject<HTMLInputElement>;
  acceptedExtensions: string[];
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({
  uploadedDocs,
  selectedDocType,
  setSelectedDocType,
  isReadOnly,
  onFileUpload,
  onDeleteDocument,
  userRole,
  fileInputRef,
  acceptedExtensions
}) => {
  // Estado local visual (o pai não precisa saber se está arrastando)
  const [isDragging, setIsDragging] = useState(false);

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
      await onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-left-2 duration-300">
      <div 
        className={`p-10 bg-gray-50 border-2 border-dashed ${isDragging ? 'border-secondary bg-secondary/5' : 'border-gray-200'} rounded-[3rem] flex flex-col items-center text-center transition-colors ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`} 
        onDragOver={!isReadOnly ? handleDragOver : undefined} 
        onDragLeave={!isReadOnly ? handleDragLeave : undefined} 
        onDrop={!isReadOnly ? handleDrop : undefined}
      >
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-secondary mb-4 shadow-sm">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
        </div>
        <h4 className="text-sm font-black text-secondary uppercase tracking-[0.1em] mb-2">Central de Arquivos do Executivo</h4>
        <p className="text-[11px] text-bodyText mb-8 max-lg">Anexe os documents necessários para validação do perfil.</p>
        
        <input 
          type="file" 
          hidden 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept={acceptedExtensions.join(',')} 
          disabled={isReadOnly} 
        />
        
        <div className="w-full max-xl flex flex-col sm:flex-row gap-4 items-center">
          <select 
            className={`w-full flex-1 px-5 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none text-[11px] font-black uppercase tracking-widest shadow-sm appearance-none cursor-pointer text-secondary ${isReadOnly ? 'cursor-not-allowed' : ''}`} 
            value={selectedDocType} 
            onChange={(e) => setSelectedDocType(e.target.value)} 
            disabled={isReadOnly}
          >
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
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isReadOnly} 
            className={`w-full sm:w-auto px-12 py-3.5 bg-secondary text-white text-[10px] font-black rounded-2xl shadow-2xl hover:opacity-95 uppercase tracking-[0.2em] transition-all transform hover:-translate-y-1 ${isReadOnly ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}
          >
            ANEXAR
          </button>
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
                    <td className="px-6 py-4"><span className="text-[10px] font-black text-primary uppercase">{doc.category}</span></td>
                    <td className="px-6 py-4 text-xs font-black text-secondary">{doc.type}</td>
                    <td className="px-6 py-4 text-[11px] text-bodyText font-bold text-secondary">{doc.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${doc.status === 'Ativo' ? 'bg-green-100 text-green-700 border-green-200' : doc.status === 'Rejeitado' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => window.open(doc.url, '_blank')} className="p-2 text-secondary hover:bg-secondary/10 rounded-xl transition-all mr-2" title="Visualizar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </button>
                      {(doc.status !== 'Ativo' || userRole === UserRole.HEAD) && !isReadOnly && (
                        <button onClick={() => onDeleteDocument(doc)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all" title="Excluir">
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
  );
};

export default DocumentsTab;