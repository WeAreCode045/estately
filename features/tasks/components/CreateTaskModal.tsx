import { Loader2, X } from 'lucide-react';
import React, { useState } from 'react';

interface CreateTaskModalProps {
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    projectId: string;
    dueDate: string;
  }) => Promise<void>;
  loading?: boolean;
  projects?: Array<{ id: string; title: string }>;
}

/**
 * CreateTaskModal - Modal for creating new personal tasks
 *
 * Controlled component - form state managed internally,
 * submission handled by parent via onCreate callback
 */
const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  onClose,
  onCreate,
  loading = false,
  projects = []
}) => {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    projectId: 'personal',
    dueDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onCreate(taskData);
    } catch (error) {
      // Error handled by parent
      console.error('Create task error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">New Personal Task</h2>
            <p className="text-slate-500 text-sm mt-1">Add a custom action item to your list.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 flex flex-col lg:flex-row gap-8">
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

            {projects.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Project (Optional)</label>
                <select
                  value={taskData.projectId}
                  onChange={e => setTaskData({...taskData, projectId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="personal">Personal / General</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            )}

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
                onClick={onClose}
                className="w-full bg-slate-100 py-3.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
