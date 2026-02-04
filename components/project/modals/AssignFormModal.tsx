import { ChevronRight, X } from 'lucide-react';
import React from 'react';
import type { FormDefinition, User } from '../../../types';

interface AssignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: FormDefinition | null;
  users: User[];
  onAssign: (userId: string) => void;
}

const AssignFormModal: React.FC<AssignFormModalProps> = ({
  isOpen,
  onClose,
  selectedTemplate,
  users,
  onAssign
}) => {
  if (!isOpen || !selectedTemplate) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg">Assign {selectedTemplate.title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">Select a user to assign this form to. This will create a pending submission for them to fill out.</p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => onAssign(u.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all text-left group"
                >
                  <img src={u.avatar} className="w-10 h-10 rounded-full" alt="" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900">{u.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">{u.role}</div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignFormModal;
