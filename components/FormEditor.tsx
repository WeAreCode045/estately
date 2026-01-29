import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateSubmissionParams, FormSubmission } from '../types';
import { projectFormsService } from '../services/appwrite';

interface Props {
  projectId: string;
  onClose: () => void;
  onCreated?: (s: FormSubmission) => void;
}

const FormEditor: React.FC<Props> = ({ projectId, onClose, onCreated }) => {
  const [title, setTitle] = useState('Nieuwe Lijst van Zaken');
  const [jsonData, setJsonData] = useState(JSON.stringify({ items: [] }, null, 2));
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsed = JSON.parse(jsonData);
      const params: CreateSubmissionParams = {
        projectId,
        formKey: 'lijst_van_zaken',
        title,
        data: parsed,
        attachments: [],
        status: 'submitted'
      };
      const created = await projectFormsService.createSubmission(params);
      onCreated?.(created);
      onClose();
    } catch (err: any) {
      alert('Invalid JSON: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-auto max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-lg">Create Form Submission</h3>
          <button onClick={onClose} className="p-2 text-slate-500"><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">JSON Data</label>
            <textarea value={jsonData} onChange={(e) => setJsonData(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm h-48 font-mono" />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-xl bg-blue-600 text-white">{isSaving ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormEditor;
