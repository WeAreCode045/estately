import { X } from 'lucide-react';
import React, { useState } from 'react';
import type { ProjectTask } from '../../../../types';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (taskData: Partial<ProjectTask>) => Promise<void>;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [newTaskData, setNewTaskData] = useState<Partial<ProjectTask>>({
    title: '',
    description: '',
    category: 'General',
    dueDate: new Date().toISOString().slice(0, 10),
    notifyAssignee: true,
    notifyAgentOnComplete: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        await onAdd(newTaskData);
        // Reset
        setNewTaskData({
            title: '',
            description: '',
            category: 'General',
            dueDate: new Date().toISOString().slice(0, 10),
            notifyAssignee: true,
            notifyAgentOnComplete: true
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">New Task</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Title</label>
            <input
              type="text"
              required
              value={newTaskData.title}
              onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              placeholder="Schedule Inspection"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
            <textarea
              value={newTaskData.description}
              onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                value={newTaskData.category}
                onChange={e => setNewTaskData({...newTaskData, category: e.target.value as any})}
              >
                <option value="General">General</option>
                <option value="LEGAL">Legal</option>
                <option value="FINANCIAL">Financial</option>
                <option value="INSPECTION">Inspection</option>
                <option value="CLOSING">Closing</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Due Date</label>
              <input
                type="date"
                required
                value={newTaskData.dueDate}
                onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={newTaskData.notifyAssignee}
                onChange={e => setNewTaskData({...newTaskData, notifyAssignee: e.target.checked})}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Notify assigned user</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={newTaskData.notifyAgentOnComplete}
                onChange={e => setNewTaskData({...newTaskData, notifyAgentOnComplete: e.target.checked})}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Notify agent on completion</span>
            </label>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 font-bold text-slate-500">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
