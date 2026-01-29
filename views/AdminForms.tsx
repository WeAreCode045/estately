import React, { useEffect, useState } from 'react';
import formService from '../services/formService';
import FormList from '../components/FormList';
import FormEditor from '../components/FormEditor';

const AdminForms: React.FC = () => {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res: any = await formService.listForms();
      setForms(res.documents || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Forms</h1>
          <p className="text-sm text-slate-500">Create and manage forms.</p>
        </div>
        <div>
          <button onClick={() => setEditing({})} className="bg-blue-600 text-white px-4 py-2 rounded-xl">New Form</button>
        </div>
      </div>

      {loading ? <div>Loading…</div> : <FormList forms={forms} onEdit={(f: any) => setEditing(f)} onRefresh={fetch} />}

      {editing && <FormEditor form={editing} onClose={() => { setEditing(null); fetch(); }} />}
    </div>
  );
};

export default AdminForms;
