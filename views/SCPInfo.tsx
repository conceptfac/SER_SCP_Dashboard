
import React, { useState } from 'react';
import { UserRole, Language, SCPInfo } from '../types';
import { TRANSLATIONS } from '../constants';
import { geminiService } from '../geminiService';

interface SCPInfoProps {
  role: UserRole;
  language: Language;
}

const SCPInfoView: React.FC<SCPInfoProps> = ({ role, language }) => {
  const t = TRANSLATIONS[language];
  const [prompt, setPrompt] = useState('');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const scpInfos: SCPInfo[] = [
    { id: '1', title: 'Relatório Trimestral Q3 2024', description: 'Consolidado das operações do terceiro trimestre com foco em expansão agro.', date: '15/10/2024 14:30', pdfUrl: '#' },
    { id: '2', title: 'Novas Regras de Aporte', description: 'Atualização das políticas de entrada para novos sócios participantes.', date: '01/10/2024 09:15', pdfUrl: '#' },
    { id: '3', title: 'Inauguração Filial MT', description: 'Fotos e documentos da nova sede em Mato Grosso.', date: '25/09/2024 11:00' },
  ];

  const handleEditImage = async () => {
    if (!prompt) return;
    setIsProcessing(true);
    try {
      const response = await fetch('https://picsum.photos/800/600');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await geminiService.editImage(base64, prompt);
        setEditedImage(result);
        setIsProcessing(false);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      alert('Failed to edit image. Check API Key.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary">{t.scpInfo}</h2>
        {role === UserRole.HEAD && (
          <button className="px-6 py-2.5 bg-secondary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
            {t.addInfo}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scpInfos.map(info => (
          <div key={info.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-secondary/5 rounded-lg text-secondary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-secondary mb-2">{info.title}</h3>
            </div>
            <p className="text-sm text-bodyText mb-6 line-clamp-3 ml-10">{info.description}</p>
            <div className="flex items-center justify-between mt-auto ml-10">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{info.date}</span>
              {info.pdfUrl && (
                <button className="p-2 bg-secondary/5 text-secondary rounded-lg hover:bg-secondary hover:text-white transition-all shadow-sm flex items-center gap-2">
                  <span className="text-[10px] font-bold">DOWNLOAD</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    
    </div>
  );
};

export default SCPInfoView;
