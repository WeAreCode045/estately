import React from 'react';

const FormResponseList: React.FC<{ responses: any[] }> = ({ responses }) => {
  if (!responses || responses.length === 0) return <div className="p-6 text-sm text-slate-500">No responses yet.</div>;

  return (
    <div className="space-y-3">
      {responses.map(r => (
        <div key={r.$id || r.id} className="bg-white p-4 rounded-2xl border">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">Submitted: {r.submittedAt}</div>
              <div className="text-xs text-slate-500">By: {r.submittedBy || r.profileId}</div>
            </div>
            <div>
              <button onClick={() => { alert(JSON.stringify(r.responseData, null, 2)); }} className="px-3 py-1 bg-slate-100 rounded">Inspect</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FormResponseList;
