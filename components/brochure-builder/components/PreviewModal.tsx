
import React, { useState } from 'react';
import { exportBlocksToHtml } from '../services/htmlExportService';
import type { PageBlock } from '../types';
import BlockRenderer from './BlockRenderer';
import { CloseIcon, DownloadIcon } from './Icons';

interface PreviewModalProps {
  blocks: PageBlock[];
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ blocks, onClose }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const htmlCode = exportBlocksToHtml(blocks);

  const handleDownload = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brochure-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-white">Preview Brochure</h2>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'preview'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Visual Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'code'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                HTML Code
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-2 transition-colors border border-blue-500"
            >
              <DownloadIcon />
              <span>Export HTML</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950/50">
          {activeTab === 'preview' ? (
            <div className="h-full overflow-y-auto custom-scrollbar p-8">
              <div className="min-h-[800px] bg-white shadow-xl mx-auto max-w-4xl relative">
                {blocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-20 text-slate-300">
                    <p className="text-xl">Canvas is empty</p>
                  </div>
                ) : (
                  blocks.map(block => (
                    <BlockRenderer key={block.id} block={block} />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto bg-[#1e1e1e] p-6 text-sm font-mono custom-scrollbar">
                <pre className="text-blue-300 leading-relaxed whitespace-pre-wrap">{htmlCode}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
