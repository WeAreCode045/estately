import React from 'react';

const FormList: React.FC<{ forms: any[]; onEdit: (f:any)=>void; onRefresh: ()=>void }> = ({ forms, onEdit, onRefresh }) => {
  if (!forms || forms.length === 0) return <div className="p-6 text-sm text-slate-500">No forms yet.</div>;

  return (
    <div className="grid gap-4">
      {forms.map(f => (
        <div key={f.$id || f.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between">
          <div>
            <div className="font-bold">{f.title || f.name}</div>
            <div className="text-xs text-slate-500">{f.description}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(f)} className="px-3 py-1 bg-slate-100 rounded">Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FormList;
