import { AlertCircle, FileCheck, FileText, Loader2, UploadCloud, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { GeminiService } from '../../services/geminiService';
import type { FormSchema } from './types';

interface PDFReaderModalProps {
  onClose: () => void;
  onGenerated: (schema: FormSchema) => void;
}

const STATUS_MESSAGES = [
  "Reading document structure...",
  "Identifying input fields...",
  "Scanning for labels and hints...",
  "Extracting multiple choice options...",
  "Analyzing validation requirements...",
  "Generating digital form schema...",
  "Polishing final layout..."
];

const PDFReaderModal: React.FC<PDFReaderModalProps> = ({ onClose, onGenerated }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle simulated progress and status cycling
  useEffect(() => {
    let interval: number;
    let statusInterval: number;

    if (loading) {
      // Progress simulation: 0 to 95%
      interval = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          const increment = Math.random() * 5;
          return Math.min(prev + increment, 95);
        });
      }, 600);

      // Status message cycling
      statusInterval = window.setInterval(() => {
        setStatusIdx(prev => (prev + 1) % STATUS_MESSAGES.length);
      }, 2500);
    } else {
      setProgress(0);
      setStatusIdx(0);
    }

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile: File | undefined) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else if (selectedFile) {
      setError('Please select a valid PDF file.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    validateAndSetFile(droppedFile);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const base64Data = await fileToBase64(file);
      const gemini = new GeminiService();
      const newSchema = await gemini.generateFormFromPDF(base64Data);

      // Complete progress before closing
      setProgress(100);
      setTimeout(() => {
        onGenerated(newSchema);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Failed to analyze the PDF. Ensure it's not password protected or too large.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">AI PDF Reader</h3>
              <p className="text-xs text-emerald-100 font-medium">Extract Form Fields from Documents</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50 scale-[1.02]'
                  : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50'
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                isDragging ? 'bg-emerald-100' : 'bg-slate-50 group-hover:bg-emerald-100'
              }`}>
                <UploadCloud className={`w-8 h-8 transition-colors ${
                  isDragging ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'
                }`} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-700">Drop your PDF here</p>
                <p className="text-sm text-slate-400">or click to browse files</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf"
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-top-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shrink-0">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document</p>
                  </div>
                </div>
                {!loading && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {loading && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600 animate-pulse">{STATUS_MESSAGES[statusIdx]}</span>
                    <span className="font-bold text-emerald-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500 ease-out relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold">
                    Gemini AI is processing document pages...
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 my-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-6 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading || !file}
              className="flex-[2] py-3 px-6 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Analyze PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default PDFReaderModal;
