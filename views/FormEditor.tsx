import { ChevronLeft, Loader2, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectFormsService, projectService } from '../api/appwrite';
import type { CreateSubmissionParams } from '../types';

const FormEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    data: '{}',
    status: 'draft' as any
  });

  useEffect(() => {
    loadProjects();
    if (id && id !== 'new') {
      loadSubmission(id);
    }
  }, [id]);

  const loadProjects = async () => {
    try {
      const res = await projectService.list();
      setProjects(res.documents);
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  const loadSubmission = async (subId: string) => {
    setLoading(true);
    try {
      const sub = await projectFormsService.getSubmission(subId);
      setFormData({
        projectId: sub.projectId,
        title: sub.title,
        data: JSON.stringify(sub.data, null, 2),
        status: sub.status
      });
    } catch (err) {
      console.error('Failed to load submission', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedData = JSON.parse(formData.data);
      if (id && id !== 'new') {
        await projectFormsService.updateSubmission(id, {
          title: formData.title,
          data: parsedData,
          status: formData.status
        });
      } else {
        const params: CreateSubmissionParams = {
          projectId: formData.projectId,
          formKey: 'manual_entry',
          title: formData.title,
          data: parsedData,
          status: formData.status
        };
        await projectFormsService.createSubmission(params);
      }
      navigate('/admin/forms');
    } catch (err: any) {
      alert('Error saving: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/forms')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            {id === 'new' ? 'New Form Submission' : 'Edit Form Submission'}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Project</label>
            <select
              value={formData.projectId}
              onChange={e => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={id !== 'new'}
            >
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.$id} value={p.$id}>{p.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Title</label>
            <input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., Lijst van Zaken"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="assigned">Assigned</option>
                <option value="closed">Closed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 px-1">JSON Content</label>
          <textarea
            value={formData.data}
            onChange={e => setFormData({ ...formData, data: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm h-96 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder='{ "key": "value" }'
          />
        </div>
      </div>
    </div>
  );
};

export default FormEditor;
