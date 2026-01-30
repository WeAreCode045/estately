import React, { useEffect, useState } from 'react';
import { projectService, databases, DATABASE_ID, COLLECTIONS, projectFormsService, profileService } from '../services/appwrite';
import { formDefinitionsService } from '../services/formDefinitionsService';
import type { FormSubmission, FormDefinition } from '../types';
import FormListItem from '../components/FormListItem';
import FormRenderer from '../components/FormRenderer';
import { Loader2, Plus, Library, Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const statusOptions = ['draft', 'submitted', 'assigned', 'closed', 'rejected'];

const FormsList: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, profile } = useAuth() || {};
  const isAdmin = profile?.role === UserRole.ADMIN || authUser?.labels?.includes('admin');

  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [filters, setFilters] = useState<{ projectId?: string; status?: string; assignedTo?: string; search?: string }>({});
  const [items, setItems] = useState<FormSubmission[]>([]);
  const [definitions, setDefinitions] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FormSubmission | null>(null);
  const [activeView, setActiveView] = useState<'submissions' | 'definitions'>('submissions');

  useEffect(() => {
    loadMeta();
    loadItems();
  }, []);

  useEffect(() => {
    loadItems();
  }, [filters]);

  const loadMeta = async () => {
    try {
      const [pRes, defs] = await Promise.all([
        projectService.list(),
        formDefinitionsService.list()
      ]);
      setProjects(pRes.documents || []);
      setDefinitions(defs);
    } catch (e) {
      console.error('Failed loading metadata', e);
    }

    try {
      const prof = await profileService.listAll();
      setProfiles(prof.documents || []);
    } catch (e) { console.warn(e); }
  };

  const handleDelete = async (s: FormSubmission) => {
    try {
      await projectFormsService.deleteSubmission(s.id);
      setItems(prev => prev.filter(item => item.id !== s.id));
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
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
        <div className="flex items-center gap-3">
           {isAdmin && (
             <div className="flex bg-slate-100 p-1 rounded-xl">
               <button 
                 onClick={() => setActiveView('submissions')}
                 className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'submissions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Submissions
               </button>
               <button 
                 onClick={() => setActiveView('definitions')}
                 className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'definitions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 Templates
               </button>
             </div>
           )}
           {activeView === 'submissions' ? (
             <button 
               onClick={() => navigate('/admin/forms/edit/new')}
               className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors"
             >
               <Plus size={18} />
               New Submission
             </button>
           ) : (
             isAdmin && (
               <button 
                  onClick={() => navigate('/admin/forms/templates/edit/new')}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-800 transition-colors"
                >
                 <Plus size={18} />
                 Add Template
               </button>
             )
           )}
        </div>
      </div>

      {activeView === 'submissions' || !isAdmin ? (
        <>
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
                {items.map(i => {
                  const project = projects.find(p => p.$id === i.projectId);
                  const profile = profiles.find(u => (u.userId || u.$id) === i.assignedToUserId);
                  
                  return (
                    <div key={i.id}>
                      <FormListItem 
                        submission={i} 
                        onView={(s) => setSelected(s)} 
                        onDelete={handleDelete}
                        projectName={project?.title || project?.name}
                        assigneeName={profile?.name}
                        user={profile || (authUser ? { id: authUser.$id, name: authUser.name, email: authUser.email, role: UserRole.BUYER } : undefined)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {definitions.map(def => (
            <div key={def.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Library size={20} />
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Delete this template?')) {
                      formDefinitionsService.delete(def.id).then(loadMeta);
                    }
                  }}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{def.title}</h3>
              <p className="text-xs text-slate-500 mb-4 h-8 line-clamp-2">{def.description || 'Standard form definition'}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {def.needSignatureFromSeller && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-tighter">Seller Sign</span>
                )}
                {def.needSignatureFromBuyer && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-tighter">Buyer Sign</span>
                )}
                {def.autoAddToNewProjects && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tighter">Auto-Add</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{def.key}</span>
                <button 
                  onClick={() => navigate(`/admin/forms/templates/edit/${def.id}`)}
                  className="text-blue-600 text-xs font-bold hover:underline"
                >
                  Edit Definition
                </button>
              </div>
            </div>
          ))}
          {definitions.length === 0 && (
            <div className="col-span-3 py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
               <Library size={48} className="mx-auto text-slate-300 mb-4" />
               <p className="text-slate-500">No form templates defined yet.</p>
            </div>
          )}
        </div>
      )}

      {selected && <FormRenderer submission={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default FormsList;
