import { ChevronRight, ClipboardList, Loader2, X } from 'lucide-react';
import React from 'react';
import type { FormDefinition } from '../../../../types';

interface FormTemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  formDefinitions: FormDefinition[];
  onSelect: (def: FormDefinition) => void;
}

const FormTemplatePickerModal: React.FC<FormTemplatePickerModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  formDefinitions,
  onSelect
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Assign Information Form</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 size={32} className="text-indigo-600 animate-spin mb-3" />
              <p className="text-sm text-slate-500 italic">Syncing templates...</p>
            </div>
          ) : formDefinitions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No form templates found.</div>
          ) : formDefinitions.map(def => (
            <button
              key={def.id}
              onClick={() => onSelect(def)}
              className="w-full flex items-center justify-between p-4 bg-white hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ClipboardList size={18} /></div>
                <div className="text-left">
                  <p className="font-bold text-slate-900">{def.title}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">{def.role || 'General Form'}</p>
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

export default FormTemplatePickerModal;
