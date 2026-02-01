import { ID } from 'appwrite';
import {
    Bell,
    CheckSquare,
    Clock,
    FileText,
    Inbox,
    Loader2,
    Plus,
    Upload,
    X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import DocumentViewer from '../components/DocumentViewer';
import { COLLECTIONS, DATABASE_ID, databases, profileService } from '../services/appwrite';
import { documentService } from '../services/documentService';
import { Project, TaskTemplate, User, UserDocumentDefinition } from '../types';

interface TasksViewProps {
  user: User;
  projects: Project[];
  onRefresh: () => void;
}

const Tasks: React.FC<TasksViewProps> = ({ user, projects, onRefresh }) => {
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<UserDocumentDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerDownloadUrl, setViewerDownloadUrl] = useState<string | null>(null);

  const handleOpenViewer = async (provided: any, title?: string) => {
    try {
      let url = provided?.url;
      let fileId = provided?.fileId;

      if (!url && fileId) {
        url = await documentService.getFileUrl(fileId);
      }
      if (!url) throw new Error('No URL available');

      // Ensure mode=admin is present
      if (!url.includes('mode=admin')) {
        url = url.includes('?') ? `${url}&mode=admin` : `${url}?mode=admin`;
      }

      // Generate normalized download URL if we have a fileId
      if (fileId) {
        let dl = documentService.getFileDownload(fileId);
        setViewerDownloadUrl(dl);
      } else {
        setViewerDownloadUrl(null);
      }

      setViewerError(null);
      setViewerUrl(url);
      setViewerTitle(title || provided?.name || 'Document');
    } catch (e) {
      console.error('Error opening viewer:', e);
      alert('Could not load document for viewing.');
    }
  };

  const handleCloseViewer = () => {
    setViewerUrl(null);
    setViewerTitle(null);
    setViewerError(null);
    setViewerDownloadUrl(null);
  };

  // Personal Task State
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    projectId: 'personal',
    dueDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDefinitions();
  }, []);

  const fetchDefinitions = async () => {
    try {
      setLoading(true);
      const [templatesRes, docsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES),
        documentService.listDefinitions()
      ]);

      setTaskTemplates(templatesRes.documents as any);
      setRequiredDocs(docsRes.documents.map((d: any) => ({
        id: d.$id,
        title: d.title
      })) as any);
    } catch (error) {
      console.error('Error fetching definitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePersonalTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const profile = await profileService.getByUserId(user.id);
      if (!profile) throw new Error("Profile not found");

      await profileService.assignTask(profile.$id, ID.unique(), ({
        projectId: taskData.projectId,
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate
      } as any));

      setIsModalOpen(false);
      setTaskData({
        title: '',
        description: '',
        projectId: 'personal',
        dueDate: new Date().toISOString().split('T')[0]
      });
      onRefresh();
    } catch (error: any) {
      console.error('Error creating task:', error);
      alert(`Failed to create task: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setLoading(true);
      // Find profile document for current user, then update task status by profile doc id
      const profile = await profileService.getByUserId(user.id);
      if (!profile) throw new Error('Profile not found');
      await profileService.updateTaskStatus(profile.$id, taskId, 'COMPLETED');
      onRefresh();
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (taskId: string, projectId: string, file: File) => {
    try {
      setLoading(true);
      // Find matching required doc definition
      const task = (user.assignedTasks || []).find(at => at.taskId === taskId);
      const matchTitlePrefix = "Upload Document: ";
      const docTitle = task?.title?.replace(matchTitlePrefix, "");
      const reqDoc = requiredDocs.find(d => (d as any).title === docTitle);

      if (!reqDoc) {
        alert("This task is not linked to a document definition.");
        return;
      }

      await documentService.uploadDocument(user.id, reqDoc.id, projectId, file);
      onRefresh();
      alert("Document uploaded and task marked as completed!");
    } catch (error) {
      console.error('Upload failed:', error);
      alert("Upload failed.");
    } finally {
      setLoading(false);
      setUploadingTaskId(null);
    }
  };

  const allPendingTasks = (user.assignedTasks || []).map(at => {
    const p = projects.find(proj => proj.id === at.projectId);
    const template = taskTemplates.find(tpl => tpl.id === at.taskId || (tpl as any).$id === at.taskId);

    const matchTitlePrefix = "Upload Document: ";
    const isDocTask = at.title?.startsWith(matchTitlePrefix);

    // Prefer explicit assigned title/description on the assigned task; fallback to template
    const resolvedTitle = (at as any).title && (at as any).title.trim() ? (at as any).title : template?.title;
    const resolvedDescription = (at as any).description && (at as any).description.trim() ? (at as any).description : template?.description;

    return {
      ...at,
      id: at.taskId,
      title: resolvedTitle || 'Personal Task',
      description: resolvedDescription || '',
      projectTitle: p?.title || 'Personal / General',
      isDocumentTask: !!isDocTask
    };
  }).filter(t => t.status === 'PENDING')
    .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-slate-500 mt-1">Your personal action items and project assignments.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
        >
          <Plus size={18} /> New Personal Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard icon={<Clock size={20}/>} label="Overdue" count={allPendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length} color="red" />
        <StatsCard icon={<Bell size={20}/>} label="Due Soon" count={allPendingTasks.length} color="blue" />
        <StatsCard icon={<CheckSquare size={20}/>} label="Total Pending" count={allPendingTasks.length} color="amber" />
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Action Items</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {allPendingTasks.map(task => (
            <div key={task.id} className="p-6 hover:bg-slate-50/50 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${task.isDocumentTask ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {task.isDocumentTask ? <FileText size={20} /> : <CheckSquare size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{task.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description || 'No description provided.'}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">{task.projectTitle}</span>
                    {task.dueDate && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-slate-400'}`}>
                        <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {(() => {
                  // Find any uploaded document that matches this task's required doc
                  const userDocs = user.userDocuments ? (typeof user.userDocuments === 'string' ? JSON.parse(user.userDocuments) : user.userDocuments) : [];
                  const matchTitlePrefix = "Upload Document: ";
                  const isDocTask = task.title?.startsWith(matchTitlePrefix);
                  const docTitle = isDocTask ? task.title.replace(matchTitlePrefix, "") : "";
                  const req = docTitle ? requiredDocs.find(d => (d as any).title === docTitle) : null;
                  const userDoc = req ? userDocs.find((ud: any) => ud.userDocumentDefinitionId === req.id && ud.projectId === task.projectId) : null;

                  if (userDoc) {
                    return (
                      <button
                        onClick={() => handleOpenViewer(userDoc, task.title)}
                        className="flex items-center gap-2 bg-slate-100 text-slate-800 px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                      >
                        <FileText size={14} /> View Document
                      </button>
                    );
                  }

                  if (task.isDocumentTask) {
                    return (
                      <button
                        onClick={() => {
                            setUploadingTaskId(task.id);
                            setTimeout(() => fileInputRef.current?.click(), 0);
                        }}
                        className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-amber-700 transition-all shadow-sm"
                      >
                        <Upload size={14} /> Upload Document
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-sm"
                    >
                      <CheckSquare size={14} /> Complete
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
          {allPendingTasks.length === 0 && (
            <div className="py-20 text-center">
              <Inbox size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No pending tasks! You're all caught up.</p>
            </div>
          )}
        </div>
      </div>

      <input
        type="file"
        hidden
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingTaskId) {
            const task = allPendingTasks.find(t => t.id === uploadingTaskId);
            if (task) handleFileUpload(task.id, task.projectId, file);
          }
        }}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">New Personal Task</h2>
                <p className="text-slate-500 text-sm mt-1">Add a custom action item to your list.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreatePersonalTask} className="p-8 flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Task Title</label>
                  <input
                    required
                    type="text"
                    value={taskData.title}
                    onChange={e => setTaskData({...taskData, title: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Enter task title..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Description</label>
                  <textarea
                    value={taskData.description}
                    onChange={e => setTaskData({...taskData, description: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm h-[180px] resize-none focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Describe what needs to be done..."
                  />
                </div>
              </div>

              <div className="w-full lg:w-[240px] space-y-5 flex flex-col">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={taskData.dueDate}
                    onChange={e => setTaskData({...taskData, dueDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Project (Optional)</label>
                  <select
                    value={taskData.projectId}
                    onChange={e => setTaskData({...taskData, projectId: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="personal">Personal / General</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>

                <div className="mt-auto space-y-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full bg-slate-100 py-3.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {(viewerUrl || viewerError) && (
        <DocumentViewer
          url={viewerUrl}
          downloadUrl={viewerDownloadUrl}
          error={viewerError || undefined}
          title={viewerTitle || undefined}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
};

const StatsCard: React.FC<{ icon: React.ReactNode, label: string, count: number, color: 'blue' | 'red' | 'amber' }> = ({ icon, label, count, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };

  return (
    <div className={`p-6 border rounded-3xl ${colors[color]} flex items-center justify-between`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/50 rounded-2xl shadow-sm">{icon}</div>
        <div>
           <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
           <p className="text-2xl font-black">{count}</p>
        </div>
      </div>
    </div>
  );
};

export default Tasks;


