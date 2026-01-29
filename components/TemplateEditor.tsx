import React, { useState } from 'react';
import { DocTemplate } from '../types';
import { X, Loader2 } from 'lucide-react';
import { docTemplateService } from '../services/docTemplateService';

const TemplateEditor: React.FC<{ template: any; onClose: () => void }> = ({ template, onClose }) => {
  const [title, setTitle] = useState(template.title || '');
  const [rolesAssigned, setRolesAssigned] = useState<string[]>(template.rolesAssigned || ['BUYER','SELLER']);
  const [saving, setSaving] = useState(false);

  const toggleRole = (r: string) => {
    setRolesAssigned(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await docTemplateService.update(template.$id || template.id, { title, rolesAssigned } as any);
      alert('Saved');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">Edit Template</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700"><X /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400">Assign to roles</label>
            <div className="flex items-center gap-3">
              <label className={`px-3 py-1 rounded-lg border ${rolesAssigned.includes('BUYER') ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                <input type="checkbox" checked={rolesAssigned.includes('BUYER')} onChange={() => toggleRole('BUYER')} /> Buyer
              </label>
              <label className={`px-3 py-1 rounded-lg border ${rolesAssigned.includes('SELLER') ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                <input type="checkbox" checked={rolesAssigned.includes('SELLER')} onChange={() => toggleRole('SELLER')} /> Seller
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white px-4 py-2 rounded-xl">
              {saving ? <Loader2 className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
