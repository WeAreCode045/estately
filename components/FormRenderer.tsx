import React from 'react';
import { X, Download } from 'lucide-react';
import type { FormSubmission } from '../types';
import { documentService } from '../services/documentService';

interface Props {
  submission: FormSubmission;
  onClose: () => void;
}

const FormRenderer: React.FC<Props> = ({ submission, onClose }) => {
  const getAttachmentUrl = async (fileId: string) => {
    try {
      return await documentService.getFileUrl(fileId);
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-auto max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{submission.title || submission.formKey}</h3>
            <div className="text-xs text-slate-500">{submission.status} · {new Date(submission.createdAt).toLocaleString()}</div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500"><X /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-sm font-semibold">Data</h4>
            <pre className="bg-slate-50 p-4 rounded-lg text-xs overflow-auto">{JSON.stringify(submission.data, null, 2)}</pre>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Attachments</h4>
            {submission.attachments && submission.attachments.length > 0 ? (
              <ul className="space-y-2">
                {submission.attachments.map((fid) => (
                  <li key={fid} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <span className="text-xs text-slate-700">{fid}</span>
                    <a className="inline-flex items-center gap-2 text-sm text-blue-600" href={documentService.getFileDownload(fid)} target="_blank" rel="noreferrer">
                      <Download size={14} /> Download
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-slate-500">No attachments</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormRenderer;
