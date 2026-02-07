import { Plus, X } from 'lucide-react';
import React from 'react';
import type { TaskTemplate } from '../../../../types';

interface TaskLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTemplates: TaskTemplate[];
  onAddTemplate: (tmpl: TaskTemplate) => void;
}

const TaskLibraryModal: React.FC<TaskLibraryModalProps> = ({ isOpen, onClose, taskTemplates, onAddTemplate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Task Library</h3>
            <p className="text-xs text-slate-500">Pick from pre-set admin tasks</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-3">
          {taskTemplates.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => onAddTemplate(tmpl)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group"
            >
              <div className="text-left">
                <p className="font-bold text-slate-900">{tmpl.title}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{tmpl.description || tmpl.category}</p>
              </div>
              <Plus className="text-slate-300 group-hover:text-blue-500" size={18} />
            </button>
          ))}
          {taskTemplates.length === 0 && (
            <div className="text-center py-12 text-slate-400 italic">No templates found. Go to Admin Tasks to add some.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskLibraryModal;
