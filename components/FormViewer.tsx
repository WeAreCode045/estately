import React, { useState } from 'react';
import formService from '../services/formService';

const FormViewer: React.FC<{ form: any; profileId: string; onSubmitted?: (res:any)=>void }> = ({ form, profileId, onSubmitted }) => {
  const schema = form?.formSchema || { fields: [] };
  const [values, setValues] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key: string, v: any) => setValues((s:any)=> ({ ...s, [key]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await formService.submitResponse(form.$id || form.id, profileId, values, { waitForAppend: true });
      onSubmitted && onSubmitted(res);
      alert('Submitted');
    } catch (e) { alert('Submit failed: ' + (e as any).message); }
    setSubmitting(false);
  };

  return (
    <div className="bg-white p-4 rounded-2xl border">
      <h3 className="font-bold mb-3">{form.title}</h3>
      <div className="space-y-3">
        {(schema.fields || []).map((f: any) => (
          <div key={f.name}>
            <label className="text-xs font-bold text-slate-400">{f.label || f.name}</label>
            <input value={values[f.name] || ''} onChange={e=>handleChange(f.name, e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" />
          </div>
        ))}
      </div>
      <div className="pt-4 flex justify-end">
        <button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded-xl">{submitting ? 'Submitting…' : 'Submit'}</button>
      </div>
    </div>
  );
};

export default FormViewer;
