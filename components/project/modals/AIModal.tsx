import { Loader2, Sparkles, X } from 'lucide-react';
import React from 'react';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  insight: string;
}

const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, insight }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">AI Project Analysis</h3>
              <p className="text-xs text-slate-500 font-medium">Strategic insights based on current project state.</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white p-2 rounded-xl text-slate-400 hover:text-slate-600 border border-slate-100 shadow-sm transition-all"><X size={20}/></button>
        </div>
        <div className="p-8 max-h-[70vh] overflow-y-auto no-scrollbar">
          {insight === 'Thinking...' ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 size={40} className="text-indigo-600 animate-spin mb-4" />
              <p className="text-slate-500 font-medium italic">Analyzing documents and status...</p>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line text-sm">
              {insight || 'No insights available.'}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIModal;
