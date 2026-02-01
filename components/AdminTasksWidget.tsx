import { CheckCircle, Clock } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { Project, TaskTemplate, User } from '../types';

interface AdminTasksWidgetProps {
  user: User;
  projects: Project[];
  taskTemplates: TaskTemplate[];
}

const AdminTasksWidget: React.FC<AdminTasksWidgetProps> = ({ user, projects, taskTemplates }) => {
  const assignedTasks = user.assignedTasks || [];

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">My Tasks</h3>
        <Link to="/tasks" className="text-blue-600 text-xs font-bold hover:underline">View All</Link>
      </div>
      <div className="space-y-3">
        {assignedTasks.length > 0 ? (
          assignedTasks
            .slice()
            .sort((a, b) => {
              const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
              const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
              return dateA - dateB;
            })
            .slice(0, 5)
            .map((t, i) => {
              const template = taskTemplates.find(tp => tp.id === t.taskId || (tp as any).$id === t.taskId);
              const project = t.projectId ? projects.find(p => p.id === t.projectId) : null;

              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                      {t.status === 'COMPLETED' ? <CheckCircle className="" /> : <Clock className="" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{t.title || template?.title || 'Task'}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {project?.title || 'Personal'} • {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'}
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold uppercase">
                    <span className={`px-2 py-1 rounded-full ${t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>{t.status}</span>
                  </div>
                </div>
              );
            })
        ) : (
          <p className="text-xs text-slate-400 italic">No pending tasks.</p>
        )}
      </div>
    </div>
  );
};

export default AdminTasksWidget;

