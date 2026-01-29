import React, { useEffect, useState } from 'react';
import { projectService, databases, DATABASE_ID, COLLECTIONS, projectFormsService, profileService } from '../services/appwrite';
import type { FormSubmission } from '../types';
import FormListItem from '../components/FormListItem';
import FormRenderer from '../components/FormRenderer';
import { Loader2 } from 'lucide-react';

const statusOptions = ['draft', 'submitted', 'assigned', 'closed', 'rejected'];

const FormsList: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [filters, setFilters] = useState<{ projectId?: string; status?: string; assignedTo?: string; search?: string }>({});
  const [items, setItems] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FormSubmission | null>(null);

  useEffect(() => {
    loadMeta();
    loadItems();
  }, []);

  useEffect(() => {
    loadItems();
  }, [filters]);

  const loadMeta = async () => {
    try {
      const pRes = await projectService.list();
      setProjects(pRes.documents || []);
    } catch (e) {
      console.error('Failed loading projects', e);
    }

    try {
      const prof = await profileService.listAll();
      setProfiles(prof.documents || []);
    } catch (e) { console.warn(e); }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await projectFormsService.listAll({ projectId: filters.projectId, status: filters.status, assignedTo: filters.assignedTo, search: filters.search });
      setItems(res.items || []);
    } catch (e) {
      console.error('Error loading forms list', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Forms Management</h2>
          <p className="text-sm text-slate-500">Admin view — filter and inspect project form submissions.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-3">
        <select className="px-3 py-2 border rounded-lg" value={filters.projectId || ''} onChange={e => setFilters(f => ({ ...f, projectId: e.target.value || undefined }))}>
          <option value="">All projects</option>
          {projects.map(p => <option key={p.$id} value={p.$id}>{p.title || p.name || p.$id}</option>)}
        </select>

        <select className="px-3 py-2 border rounded-lg" value={filters.status || ''} onChange={e => setFilters(f => ({ ...f, status: e.target.value || undefined }))}>
          <option value="">All statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="px-3 py-2 border rounded-lg" value={filters.assignedTo || ''} onChange={e => setFilters(f => ({ ...f, assignedTo: e.target.value || undefined }))}>
          <option value="">Any assignee</option>
          {profiles.map(u => <option key={u.$id} value={u.userId || u.$id}>{u.name || u.userId || u.$id}</option>)}
        </select>

        <input placeholder="Search title or data..." className="flex-1 px-3 py-2 border rounded-lg" value={filters.search || ''} onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined }))} />

        <button onClick={loadItems} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Apply</button>
      </div>

      <div>
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No submissions found.</div>
        ) : (
          <div className="grid gap-3">
            {items.map(i => (
              <div key={i.id} onClick={() => setSelected(i)}>
                <FormListItem submission={i} onView={(s) => setSelected(s)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && <FormRenderer submission={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default FormsList;
