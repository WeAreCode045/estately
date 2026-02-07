import {
    CheckCircle2,
    CheckSquare,
    Edit2,
    FileText,
    Plus,
    Settings,
    ShieldCheck,
    Trash2,
    X
} from 'lucide-react';
/* eslint-env browser */
import React, { useEffect, useState } from 'react';
import { COLLECTIONS, DATABASE_ID, databases } from '../api/appwrite';
import type { UserDocumentDefinition } from '../types';

interface DocumentManagementProps {
  user: any;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ user: _user }) => {
  const [docDefinitions, setDocDefinitions] = useState<UserDocumentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<UserDocumentDefinition | null>(null);

  const [formData, setFormData] = useState<Partial<UserDocumentDefinition>>({
    key: '',
    title: '',
    description: '',
    allowedFileTypes: ['pdf', 'jpg', 'png'],
    overrideDocumentName: '',
    status: 'ACTIVE',
    autoCreateTaskForAssignee: true,
    autoAssignTo: [],
    autoAddToNewProjects: true
  });

  useEffect(() => {
    fetchDocDefinitions();
  }, []);

  const fetchDocDefinitions = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS);
      setDocDefinitions(response.documents.map((doc: any) => ({
        id: doc.$id,
        key: doc.$id, // Use ID as key
        title: doc.title || doc.name,
        description: doc.description,
        allowedFileTypes: doc.allowedFileTypes || [],
        overrideDocumentName: doc.overrideDocumentName || '',
        status: doc.status || 'ACTIVE',
        autoCreateTaskForAssignee: doc.autoCreateTaskForAssignee ?? true,
        autoAssignTo: doc.autoAssignTo || [],
        autoAddToNewProjects: doc.autoAddToNewProjects ?? true,
        visibility: doc.visibility || 'public'
      } as UserDocumentDefinition)));
    } catch (error) {
      console.error('Error fetching doc definitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Exclude 'key' from attributes as it's not in the schema (it's the Document ID)
      // Map 'title' to 'name' as per database schema
      const payload = {
        name: formData.title,
        description: formData.description,
        status: formData.status || 'ACTIVE',
        allowedFileTypes: formData.allowedFileTypes,
        overrideDocumentName: formData.overrideDocumentName,
        autoCreateTaskForAssignee: formData.autoCreateTaskForAssignee,
        autoAssignTo: formData.autoAssignTo,
        autoAddToNewProjects: formData.autoAddToNewProjects,
        visibility: formData.visibility
      };

      if (editingDoc) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, editingDoc.id, payload);
      } else {
        // Use the custom key as the Document ID on creation
        const customId = formData.key!.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
        await databases.createDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, customId, payload);
      }
      setIsModalOpen(false);
      setEditingDoc(null);
      fetchDocDefinitions();
    } catch (error: any) {
      console.error('Error saving document definition:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteDef = async (id: string) => {
    if (!window.confirm('Delete this user document definition?')) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, id);
      fetchDocDefinitions();
    } catch (error) {
      console.error('Error deleting doc definition:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Documents</h1>
          <p className="text-slate-500 mt-1">Define documents that participants must upload.</p>
        </div>
        <button
          onClick={() => {
            setEditingDoc(null);
            setFormData({
              key: '',
              title: '',
              description: '',
              allowedFileTypes: ['pdf', 'jpg', 'png'],
              overrideDocumentName: '',
              status: 'ACTIVE',
              autoCreateTaskForAssignee: true,
              autoAssignTo: [],
              autoAddToNewProjects: true
            });
            setIsModalOpen(true);
          }}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
        >
          <Plus size={18} /> New User Document
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {docDefinitions.length === 0 && !loading ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No User Documents Defined</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">Create document templates that trigger automatically per project.</p>
          </div>
        ) : (
          docDefinitions.map(def => {
            return (
              <div key={def.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                        {def.title} <span className="text-xs font-normal text-slate-400">({def.key})</span>
                      </h3>
                      <p className="text-slate-500 text-sm mt-1">
                        {def.description || 'No description provided.'}
                      </p>

                      <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full">
                          <CheckSquare size={14} className="text-slate-400" />
                          <span>Provider: <strong>{def.autoAssignTo?.join(', ') || 'Not set'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full">
                          <Settings size={14} className="text-slate-400" />
                          <span>Auto-Task: <strong>{def.autoCreateTaskForAssignee ? 'Yes' : 'No'}</strong></span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${def.autoAddToNewProjects ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                          <CheckCircle2 size={14} />
                          <span>Auto-Add: <strong>{def.autoAddToNewProjects ? 'Enabled' : 'Disabled'}</strong></span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${def.visibility === 'public' || !def.visibility ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                          <span>Visibility: <strong>{def.visibility === 'public' || !def.visibility ? 'Public' : 'Private'}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingDoc(def);
                        setFormData(def);
                        setIsModalOpen(true);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteDef(def.id)}
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
                  <h2 className="text-2xl font-bold text-slate-900">{editingDoc ? 'Edit Document' : 'New User Document'}</h2>
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
                  <div className="space-y-2">
                    <label htmlFor="doc-title" className="text-sm font-bold text-slate-700">Display Title</label>
                    <input
                      id="doc-title"
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Passport Copy"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="doc-key" className="text-sm font-bold text-slate-700">Internal Key (ID)</label>
                    <input
                      id="doc-key"
                      type="text"
                      required
                      disabled={!!editingDoc}
                      value={formData.key}
                      onChange={e => setFormData({...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                      placeholder="e.g. passport_copy"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="doc-description" className="text-sm font-bold text-slate-700">Description</label>
                    <textarea
                      id="doc-description"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Instructions for the user..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="doc-overrideName" className="text-sm font-bold text-slate-700">Override Storage Filename</label>
                    <input
                      id="doc-overrideName"
                      type="text"
                      value={formData.overrideDocumentName}
                      onChange={e => setFormData({...formData, overrideDocumentName: e.target.value})}
                      placeholder="e.g. IdentityDocument"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">
                      Final filename will be: [Name]_[UserId].[ext]
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="doc-visibility" className="text-sm font-bold text-slate-700">Visibility</label>
                    <select
                      id="doc-visibility"
                      value={formData.visibility || 'public'}
                      onChange={e => setFormData({...formData, visibility: e.target.value as any})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="public">Public (Visible to all participants)</option>
                      <option value="private">Private (Visible to admins & assignee)</option>
                    </select>
                  </div>

                  <fieldset className="space-y-2 md:col-span-2">
                    <legend className="text-sm font-bold text-slate-700">Auto-Assign To</legend>
                    <div className="flex gap-4">
                      {['SELLER', 'BUYER'].map(role => (
                        <label key={role} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all">
                          <input
                            type="checkbox"
                            checked={formData.autoAssignTo?.includes(role)}
                            onChange={e => {
                              const current = formData.autoAssignTo || [];
                              if (e.target.checked) setFormData({...formData, autoAssignTo: [...current, role]});
                              else setFormData({...formData, autoAssignTo: current.filter(c => c !== role)});
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-slate-600 tracking-wider">INVITE {role}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="space-y-4 md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all">
                      <input
                        type="checkbox"
                        checked={formData.autoCreateTaskForAssignee}
                        onChange={e => setFormData({...formData, autoCreateTaskForAssignee: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-700">Create Task Automagically</p>
                        <p className="text-xs text-slate-500">Creates a "Please upload [Title]" task for assigned users.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all">
                      <input
                        type="checkbox"
                        checked={formData.autoAddToNewProjects}
                        onChange={e => setFormData({...formData, autoAddToNewProjects: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-700">Add to all projects</p>
                        <p className="text-xs text-slate-500">Automatically include this requirement in every new project.</p>
                      </div>
                    </label>
                  </div>

                  <fieldset className="space-y-2 md:col-span-2">
                    <legend className="text-sm font-bold text-slate-700">Allowed File Extensions</legend>
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
                  </fieldset>
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
                    {editingDoc ? 'Update Definition' : 'Create Definition'}
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
