import { AlertCircle, Download, X } from 'lucide-react';
import React from 'react';

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props?: any, key?: any): any;
  export function jsxs(type: any, props?: any, key?: any): any;
  export function jsxDEV(type: any, props?: any, key?: any): any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

type DocItem = {
  url?: string | null;
  downloadUrl?: string | null;
  documentType?: string | null;
  title?: string;
  role?: string;
  name?: string; // Original filename for extension detection
};

type Props = {
  url?: string | null;
  downloadUrl?: string | null;
  documentType?: string | null;
  error?: string | null;
  title?: string;
  documents?: DocItem[];
  onClose: () => void;
  user?: any; // Allow user prop to be passed without error, though unused
};

const DocumentViewer: React.FC<Props> = ({ url, downloadUrl, documentType, error, title, documents, onClose }) => {
  const [activeTab, setActiveTab] = React.useState(0);

  // Normalize input to a list of documents
  const allDocs: DocItem[] = React.useMemo(() => {
    if (documents && documents.length > 0) {
      return documents;
    }
    return [{ url, downloadUrl, documentType, title }];
  }, [documents, url, downloadUrl, documentType, title]);

  const activeDoc = allDocs[activeTab] || {};
  const currentUrl = activeDoc.url;
  const currentTitle = activeDoc.title || title || 'Document Viewer';

  return (
    <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden relative flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-lg font-bold">{currentTitle}</h3>
              <p className="text-xs text-slate-500">Preview</p>
            </div>
            {allDocs.length > 1 && (
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 {allDocs.map((doc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === idx ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {doc.role || doc.title || `Doc ${idx + 1}`}
                    </button>
                 ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeDoc.downloadUrl && (
              <a href={activeDoc.downloadUrl} className="text-slate-500 hover:text-emerald-600 flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-100" target="_blank" rel="noreferrer">
                <Download size={16} /> Download
              </a>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
        </div>
        <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-center p-8">
              <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
              <h4 className="font-bold text-slate-900 mb-2">{title ? `${title} — ${error}` : error}</h4>
              <p className="text-sm text-slate-500">The file is missing or cannot be displayed.</p>
              {activeDoc.downloadUrl && (
                <div className="mt-4">
                  <a href={activeDoc.downloadUrl} className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-bold border border-emerald-100" target="_blank" rel="noreferrer">
                    <Download size={16} /> Download File
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 p-4">
              {(() => {
                const lowerUrl = currentUrl?.toLowerCase() || '';
                const lowerName = currentTitle?.toLowerCase() || '';
                const originalName = activeDoc.name?.toLowerCase() || '';
                const lowerType = activeDoc.documentType?.toLowerCase() || '';

                const isPdf = lowerUrl.includes('.pdf') || lowerName.endsWith('.pdf') || originalName.endsWith('.pdf') || lowerType.includes('pdf');
                const isImg = !isPdf && (
                    lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ||
                    lowerName.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ||
                    originalName.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ||
                    lowerType.includes('image')
                );

                if (isImg) {
                  return <img src={currentUrl || ''} alt={currentTitle} className="max-w-full max-h-full object-contain" />;
                } else if (isPdf) {
                  return <embed src={currentUrl || ''} type="application/pdf" className="w-full h-full" />;
                } else {
                  return (
                    <iframe
                        src={currentUrl || ''}
                        title={currentTitle || 'Document'}
                        className="w-full h-full border-none"
                    />
                  );
                }
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
