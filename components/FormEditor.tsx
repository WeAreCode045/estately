import React, { useState } from 'react';
import formService from '../services/formService';

const FormEditor: React.FC<{ form: any; onClose: () => void }> = ({ form, onClose }) => {
  const [title, setTitle] = useState(form.title || '');
  const [description, setDescription] = useState(form.description || '');
  const [schema, setSchema] = useState<string>(JSON.stringify(form.formSchema || { fields: [] }, null, 2));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsed = JSON.parse(schema);
      if (form && form.$id) {
        await formService.updateForm(form.$id, { title, description, formSchema: parsed });
      } else {
        await formService.createForm({ title, description, formSchema: parsed });
      }
      onClose();
    } catch (e) {
      alert('Save failed: ' + (e as any).message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">{form && form.$id ? 'Edit Form' : 'New Form'}</h3>
          <button onClick={onClose} className="text-slate-500">Close</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400">Form Schema (JSON)</label>
            <textarea value={schema} onChange={e => setSchema(e.target.value)} rows={10} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm" />
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white px-4 py-2 rounded-xl">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormEditor;
