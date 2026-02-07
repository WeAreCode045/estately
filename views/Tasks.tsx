import {
    Inbox,
    Loader2,
    Plus
} from 'lucide-react';
import React, { useRef, useState } from 'react';

import DocumentViewer from '../components/DocumentViewer';
import { useAuth } from '../contexts/AuthContext';
import CreateTaskModal from '../features/tasks/components/CreateTaskModal';
import TaskListItem from '../features/tasks/components/TaskListItem';
import TaskStatsCards from '../features/tasks/components/TaskStatsCards';
import { useUserTasks } from '../hooks';

/**
 * Tasks View - User's personal task management page
 *
 * Architecture:
 * - Uses useUserTasks hook for data fetching
 * - Delegates rendering to feature components in features/tasks/components/
 * - Minimal local state - only UI state (modals, file uploads)
 */
const Tasks: React.FC = () => {
  const { user } = useAuth();

  // Data from hook
  const {
    pendingTasks,
    overdueTasks,
    completedTasksCount,
    userDocuments,
    loading,
    createPersonalTask,
    completeTask
  } = useUserTasks(user?.id || '');

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document Viewer State
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerDownloadUrl, setViewerDownloadUrl] = useState<string | null>(null);

  const handleCreateTask = async (taskData: {
    title: string;
    description: string;
    projectId: string;
    dueDate: string;
  }) => {
    try {
      await createPersonalTask(taskData);
      setIsModalOpen(false);
    } catch (error: any) {
      alert(`Failed to create task: ${error.message}`);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleFileUpload = async (taskId: string, file: File) => {
    // File upload logic handled by parent or service
    // TODO: Implement document upload flow
    console.log('Upload file for task:', taskId, file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
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

      {/* Stats Cards */}
      <TaskStatsCards
        overdueCount={overdueTasks.length}
        dueSoonCount={pendingTasks.length}
        totalPendingCount={pendingTasks.length}
      />

      {/* Task List */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Action Items</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {pendingTasks.map(task => (
            <TaskListItem
              key={task.$id}
              task={task}
              userDocuments={userDocuments}
              onComplete={() => handleCompleteTask(task.$id)}
              onUpload={(file) => handleFileUpload(task.$id, file)}
              onViewDocument={(doc) => {
                // Open viewer
                setViewerUrl(doc.url || '');
                setViewerTitle(doc.name);
              }}
            />
          ))}

          {pendingTasks.length === 0 && (
            <div className="py-20 text-center">
              <Inbox size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No pending tasks! You're all caught up.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
        <CreateTaskModal
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreateTask}
          loading={loading}
        />
      )}

      {/* Document Viewer */}
      {(viewerUrl || viewerError) && (
        <DocumentViewer
          url={viewerUrl}
          downloadUrl={viewerDownloadUrl}
          error={viewerError || undefined}
          title={viewerTitle || undefined}
          onClose={() => {
            setViewerUrl(null);
            setViewerTitle(null);
            setViewerError(null);
            setViewerDownloadUrl(null);
          }}
        />
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        hidden
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingTaskId) {
            handleFileUpload(uploadingTaskId, file);
            setUploadingTaskId(null);
          }
        }}
      />
    </div>
  );
};

export default Tasks;
