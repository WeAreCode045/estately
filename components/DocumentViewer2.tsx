import React from 'react';
import { X, AlertCircle, Download } from 'lucide-react';

type Props = {
  import React from 'react';
  import { X, AlertCircle, Download } from 'lucide-react';

  type Props = {
    url?: string | null;
    downloadUrl?: string | null;
    error?: string | null;
    title?: string;
    onClose: () => void;
  };

  const DocumentViewer: React.FC<Props> = ({ url, downloadUrl, error, title, onClose }) => {
    return (
      <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden relative">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">{title || 'Document Viewer'}</h3>
              <p className="text-xs text-slate-500">Preview</p>
            </div>
            <div className="flex items-center gap-3">
              {downloadUrl && (
                <a href={downloadUrl} className="text-slate-500 hover:text-emerald-600 flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-100" target="_blank" rel="noreferrer">
                  <Download size={16} /> Download
                </a>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
          </div>
          <div className="w-full h-full flex items-center justify-center">
            {error ? (
              <div className="text-center p-8">
                <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
                <h4 className="font-bold text-slate-900 mb-2">{title ? `${title} — ${error}` : error}</h4>
                <p className="text-sm text-slate-500">The file is missing or cannot be displayed.</p>
                {downloadUrl && (
                  <div className="mt-4">
                    <a href={downloadUrl} className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-bold border border-emerald-100" target="_blank" rel="noreferrer">
                      <Download size={16} /> Download File
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <iframe src={url || ''} title={title || 'Document'} className="w-full h-full" />
            )}
          </div>
        </div>
      </div>
    );
  };

  export default DocumentViewer;
