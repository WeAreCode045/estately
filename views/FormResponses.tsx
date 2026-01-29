import React, { useEffect, useState } from 'react';
import formService from '../services/formService';
import FormResponseList from '../components/FormResponseList';
import { useParams } from 'react-router-dom';

const FormResponses: React.FC = () => {
  const params: any = useParams();
  const formId = params.formId;
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res: any = await formService.listResponses(formId);
      setResponses(res.documents || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (formId) fetch(); }, [formId]);

  if (!formId) return <div className="p-6">No form selected.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Responses</h1>
          <p className="text-sm text-slate-500">Responses for form {formId}</p>
        </div>
        <div>
          <button onClick={fetch} className="px-3 py-1 bg-slate-100 rounded">Refresh</button>
        </div>
      </div>

      {loading ? <div>Loading…</div> : <FormResponseList responses={responses} />}
    </div>
  );
};

export default FormResponses;
