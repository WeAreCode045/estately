import React from 'react';
import { Eye } from 'lucide-react';
import type { FormSubmission } from '../types';

interface Props {
  submission: FormSubmission;
  onView: (s: FormSubmission) => void;
}

const FormListItem: React.FC<Props> = ({ submission, onView }) => {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
      <div>
        <div className="text-sm font-bold text-slate-900">{submission.title || submission.formKey}</div>
        <div className="text-xs text-slate-500">{submission.status} · {new Date(submission.createdAt).toLocaleString()}</div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onView(submission)} className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 hover:bg-slate-100">
          <Eye size={16} />
        </button>
      </div>
    </div>
  );
}

export default FormListItem;
