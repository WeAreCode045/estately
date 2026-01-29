import React from 'react';
import DocumentViewer from './DocumentViewer3';
import { Eye, Edit2, Trash2 } from 'lucide-react';

const TemplateList: React.FC<{ templates: any[]; onEdit: (t: any) => void; onRefresh: () => void }> = ({ templates, onEdit, onRefresh }) => {
  if (!templates || templates.length === 0) return <div className="p-6 text-sm text-slate-500">No templates found.</div>;

  return (
    <div className="grid grid-cols-1 gap-4">
      {templates.map(t => (
        <div key={t.$id || t.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{t.title || t.name}</p>
            <p className="text-xs text-slate-500">Status: {t.analysisStatus || t.status || 'PENDING'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(t)} className="p-2 rounded-lg hover:bg-slate-50"><Edit2 size={16} /></button>
            <button onClick={() => { if (confirm('Delete template?')) { /* TODO delete */ onRefresh(); } }} className="p-2 rounded-lg hover:bg-slate-50 text-red-600"><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateList;
