import { ChevronRight, Library, X } from 'lucide-react';
import React from 'react';
import type { ContractTemplate } from '../../../../types';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ContractTemplate[];
  onGenerateScratch: () => void;
  onGenerateTemplate: (template: ContractTemplate) => void;
}

const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  templates,
  onGenerateScratch,
  onGenerateTemplate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Choose a Template</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
        </div>
        <div className="p-6 space-y-3">
          <button onClick={onGenerateScratch} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group">
            <div className="text-left">
              <p className="font-bold text-slate-900">Standard AI Scratchpad</p>
              <p className="text-xs text-slate-500">Let Gemini generate a document from scratch.</p>
            </div>
            <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
          </button>
          {templates.map(tmpl => (
            <button key={tmpl.id} onClick={() => onGenerateTemplate(tmpl)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Library size={18} /></div>
                <div className="text-left">
                  <p className="font-bold text-slate-900">{tmpl.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Saved Agency Template</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplatePickerModal;
