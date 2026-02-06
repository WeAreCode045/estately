import React, { useState } from 'react';
import { Wand2, X, Sparkles, Loader2 } from 'lucide-react';
import { GeminiService } from '../../services/geminiService';
import type { FormSchema } from './types';

interface AIGeneratorModalProps {
  onClose: () => void;
  onGenerated: (schema: FormSchema) => void;
}

const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({ onClose, onGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const gemini = new GeminiService();
      const newSchema = await gemini.generateFormFromPrompt(prompt);
      onGenerated(newSchema);
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Form Architect</h3>
              <p className="text-xs text-indigo-100 font-medium">Powered by Gemini Pro</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Describe the form you need (e.g., "A contact form for a luxury wedding planner with date selection, guest count, and service preferences").
          </p>
          
          <textarea
            autoFocus
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Tell me what you're building..."
            className="w-full h-32 p-4 text-slate-800 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all resize-none mb-4"
          />

          {error && (
            <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="flex-[2] py-3 px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Schema...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Form
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGeneratorModal;
