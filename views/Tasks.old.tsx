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
import { COLLECTIONS, DATABASE_ID, databases, profileService, taskService, documentRecordService } from '../api/appwrite';
import { documentService } from '../api/documentService';
import type { Project, Task, TaskTemplate, User, UserDocumentDefinition, DocumentRecord } from '../types';

interface TasksViewProps {
  user: User;
  projects: Project[];
  onRefresh: () => void;
}

const Tasks: React.FC<TasksViewProps> = ({ user, projects, onRefresh }) => {
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<UserDocumentDefinition[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userDocuments, setUserDocuments] = useState<DocumentRecord[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
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
      const fileId = provided?.fileId;

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
        const dl = await documentService.getFileDownload(fileId);
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
    fetchTasks();
  }, [user.id]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // Get user profile to find their profile ID
      const profile = await profileService.getByUserId(user.id);
      if (profile) {
        setUserProfile(profile);
        // Fetch tasks assigned to this profile
        const userTasks = await taskService.listByAssignee(profile.$id);
        setTasks(userTasks);
        
        // Fetch user's documents
        const docs = await documentRecordService.listByOwner(profile.$id);
        setUserDocuments(docs);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

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
      
      if (!userProfile) {
        throw new Error("User profile not found");
      }

      await taskService.create({
        title: taskData.title,
        description: taskData.description,
        task_type: 'personal',
        status: 'todo',
        project_id: taskData.projectId,
        assignee_id: userProfile.$id,
        due_date: taskData.dueDate
      });

      setIsModalOpen(false);
      setTaskData({
        title: '',
        description: '',
        projectId: 'personal',
        dueDate: new Date().toISOString().split('T')[0]
      });
      await fetchTasks();
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
      await taskService.updateStatus(taskId, 'completed');
      await fetchTasks();
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
      // Find the task to get required doc info
      const task = tasks.find(t => t.$id === taskId);
      if (!task || !task.required_doc_type) {
        alert("This task is not linked to a document definition.");
        return;
      }

      // Upload document using legacy service (will be refactored separately)
      await documentService.uploadDocument(user.id, task.required_doc_type, projectId, file);
      
      // Mark task as completed
      await taskService.updateStatus(taskId, 'completed');
      await fetchTasks();
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

  // Map tasks to display format with project info
  const allPendingTasks = tasks
    .filter(t => t.status !== 'completed')
    .map(task => {
      const project = projects.find(p => p.id === task.project_id);
      const isDocTask = task.task_type === 'document_upload';

      return {
        id: task.$id,
        title: task.title,
        description: task.description || '',
        projectTitle: project?.title || 'Personal / General',
        projectId: task.project_id,
        dueDate: task.due_date,
        status: task.status,
        isDocumentTask: isDocTask,
        taskType: task.task_type,
        requiredDocType: task.required_doc_type
      };
    })
    .sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });

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
                  // Check if a document has been uploaded for this task
                  const matchingDoc = task.isDocumentTask && task.requiredDocType
                    ? userDocuments.find(doc => 
                        doc.type === task.requiredDocType && 
                        doc.project_id === task.projectId
                      )
                    : null;

                  if (matchingDoc) {
                    return (
                      <button
                        onClick={() => handleOpenViewer({ fileId: matchingDoc.file_id, name: matchingDoc.title }, task.title)}
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


