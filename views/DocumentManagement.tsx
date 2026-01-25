import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2,
  ShieldCheck,
  Bell,
  CheckCircle2,
  Clock,
  Settings,
  X,
  CheckSquare,
  Users,
  Search,
  Filter as FilterIcon
} from 'lucide-react';
import { User, RequiredDocument, TaskTemplate, UserRole, Project } from '../types';
import { databases, DATABASE_ID, COLLECTIONS, profileService, projectService } from '../services/appwrite';
import { ID } from 'appwrite';

interface DocumentManagementProps {
  user: User;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ user }) => {
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<RequiredDocument | null>(null);

  const [formData, setFormData] = useState<Partial<RequiredDocument>>({
    name: '',
    taskId: '',
    allowedFileTypes: ['pdf', 'jpg', 'png'],
    isGlobal: true,
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchRequiredDocs();
    fetchTaskTemplates();
    fetchUsersAndProjects();
  }, []);

  const fetchUsersAndProjects = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        profileService.listAll(),
        projectService.list()
      ]);
      setAllUsers(usersRes.documents.map((d: any) => ({
        id: d.$id,
        name: d.name,
        email: d.email,
        role: d.role,
        assignedTasks: d.assignedTasks ? (typeof d.assignedTasks === 'string' ? JSON.parse(d.assignedTasks) : d.assignedTasks) : [],
        userDocuments: d.userDocuments ? (typeof d.userDocuments === 'string' ? JSON.parse(d.userDocuments) : d.userDocuments) : []
      } as User)));
      setAllProjects(projectsRes.documents.map((d: any) => ({
        id: d.$id,
        title: d.title,
        status: d.status,
        sellerId: d.sellerId,
        buyerId: d.buyerId
      } as Project)));
    } catch (error) {
      console.error('Error fetching users/projects:', error);
    }
  };

  const fetchTaskTemplates = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES);
      setTaskTemplates(response.documents.map((d: any) => ({
        id: d.$id,
        title: d.title,
        description: d.description,
        assigneeRoles: d.assigneeRoles || [],
        deadlineType: d.deadlineType || 'RELATIVE',
        deadlineDays: d.deadlineDays || 7,
        sendReminders: d.sendReminders ?? true,
        reminderIntervalDays: d.reminderIntervalDays || 3,
        visibilityType: d.visibilityType || 'ALWAYS'
      } as TaskTemplate)));
    } catch (error) {
      console.error('Error fetching task templates:', error);
    }
  };

  const fetchRequiredDocs = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS);
      setRequiredDocs(response.documents.map((doc: any) => ({
        id: doc.$id,
        name: doc.name,
        taskId: doc.taskId,
        allowedFileTypes: doc.allowedFileTypes || [],
        isGlobal: doc.isGlobal ?? true,
        status: doc.status
      } as RequiredDocument)));
    } catch (error) {
      console.error('Error fetching required docs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const linkedTask = taskTemplates.find(t => t.id === formData.taskId);
      if (!linkedTask) {
        alert("Please select a task.");
        return;
      }

      // Ensure we send ONLY required fields. Others are derived from the task template.
      const payload = {
        name: formData.name || linkedTask.title,
        status: formData.status || 'ACTIVE',
        taskId: formData.taskId,
        allowedFileTypes: formData.allowedFileTypes,
        isGlobal: formData.isGlobal
      };

      if (editingDoc) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, editingDoc.id, payload);
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, ID.unique(), payload);
      }
      setIsModalOpen(false);
      setEditingDoc(null);
      fetchRequiredDocs();
    } catch (error: any) {
      console.error('Error saving document req:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteReq = async (id: string) => {
    if (!window.confirm('Delete this requirement definition?')) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, id);
      fetchRequiredDocs();
    } catch (error) {
      console.error('Error deleting doc req:', error);
    }
  };

  const someOtherFunc = () => {}; // Temporary placeholder if needed, but I'll just remove the whole block.

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Requirements</h1>
          <p className="text-slate-500 mt-1">Standardized document requirements that trigger automatically per project.</p>
        </div>
        <button 
          onClick={() => {
            setEditingDoc(null);
            setFormData({
              name: '',
              allowedFileTypes: ['pdf', 'jpg', 'png'],
              taskId: '',
              isGlobal: true,
              status: 'ACTIVE'
            });
            setIsModalOpen(true);
          }}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
        >
          <Plus size={18} /> New Requirement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {requiredDocs.length === 0 && !loading ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Document Requirements</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">Create document requirements and link them to user tasks.</p>
          </div>
        ) : (
          requiredDocs.map(doc => {
            const linkedTask = taskTemplates.find(t => t.id === doc.taskId);
            return (
              <div key={doc.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                        {doc.name || linkedTask?.title}
                      </h3>
                      <p className="text-slate-500 text-sm mt-1">
                        {linkedTask?.description || 'No description provided.'}
                      </p>
                      
                      <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full">
                          <CheckSquare size={14} className="text-slate-400" />
                          <span>Trigger: <strong>{linkedTask?.visibilityType === 'ALWAYS' ? 'PROJECT_START' : (linkedTask?.visibilityType === 'AFTER_TASK' ? 'OFFER_ACCEPTED' : 'OTHER')}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full">
                          <Settings size={14} className="text-slate-400" />
                          <span>Provider: <strong>{linkedTask?.assigneeRoles?.join(', ') || 'Not set'}</strong></span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${doc.isGlobal ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                          <CheckCircle2 size={14} />
                          <span>Scope: <strong>{doc.isGlobal ? 'Global' : 'Project-Specific'}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingDoc(doc);
                        setFormData(doc);
                        setIsModalOpen(true);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => deleteReq(doc.id)}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{editingDoc ? 'Edit Requirement' : 'New Document Requirement'}</h2>
                  <p className="text-slate-500 mt-1">Define how this document should be collected.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Linked Task Template</label>
                    <select 
                      required
                      value={formData.taskId}
                      onChange={e => setFormData({...formData, taskId: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="">Select a Task to fulfill</option>
                      {taskTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({t.assigneeRoles?.join(', ')})</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">
                      The document name, description, and provider will be pulled from this task.
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Override Document Name (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Passport Copy (leave empty to use task title)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all">
                      <input 
                        type="checkbox"
                        checked={formData.isGlobal}
                        onChange={e => setFormData({...formData, isGlobal: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-700">Global Requirement</p>
                        <p className="text-xs text-slate-500">If enabled, one upload fulfills the task across all user's projects (e.g. Passport).</p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700">Allowed File Extensions</label>
                    <div className="flex flex-wrap gap-3">
                      {['pdf', 'jpg', 'png', 'docx'].map(ext => (
                        <label key={ext} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                          <input 
                            type="checkbox"
                            checked={formData.allowedFileTypes?.includes(ext)}
                            onChange={e => {
                              const current = formData.allowedFileTypes || [];
                              if (e.target.checked) setFormData({...formData, allowedFileTypes: [...current, ext]});
                              else setFormData({...formData, allowedFileTypes: current.filter(c => c !== ext)});
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-slate-600 uppercase">{ext}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[3] bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    {editingDoc ? 'Update Requirement' : 'Create Requirement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
