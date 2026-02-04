import {
    CheckCircle, CheckCircle2,
    CheckSquare, Circle,
    History,
    MessageSquare, Phone
} from 'lucide-react';
import React from 'react';
import type { Project, User } from '../../types';

interface ProjectOverviewProps {
  project: Project;
  projectStatusData: any;
  seller?: User;
  buyer?: User;
  agent?: User;
  handleApproveDoc: (userId: string, taskId: string) => void;
  handleRejectDoc: (userId: string, taskId: string) => void;
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  projectStatusData,
  seller,
  buyer,
  agent,
  handleApproveDoc,
  handleRejectDoc
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Primary Participants Grid */}
      <h3 className="font-bold text-slate-900 text-lg">Key Stakeholders</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seller Contact Block */}
        {seller && (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 flex items-center gap-6">
            <div className="relative shrink-0">
              <img
                src={seller.avatar || ''}
                className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg object-cover"
                alt={seller.name}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">Seller</span>
                <h3 className="font-bold text-slate-900 truncate">{seller.name}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4 truncate">{seller.email}</p>
              <div className="flex gap-2">
                 <button className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5"><MessageSquare size={14}/> Message</button>
                 <a href={`tel:${seller.phone || ''}`} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center shrink-0"><Phone size={14}/></a>
              </div>
            </div>
          </div>
        )}

        {/* Buyer Contact Block */}
        {buyer && (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 flex items-center gap-6">
            <div className="relative shrink-0">
              <img
                src={buyer.avatar || ''}
                className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg object-cover"
                alt={buyer.name}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">Buyer</span>
                <h3 className="font-bold text-slate-900 truncate">{buyer.name}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4 truncate">{buyer.email}</p>
              <div className="flex gap-2">
                 <button className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5"><MessageSquare size={14}/> Message</button>
                 <a href={`tel:${buyer.phone || ''}`} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center shrink-0"><Phone size={14}/></a>
              </div>
            </div>
          </div>
        )}

        {/* Agent Contact Block */}
        {agent && (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 flex items-center gap-6">
            <div className="relative shrink-0">
              <img
                src={agent.avatar || ''}
                className="w-16 h-16 rounded-2xl border-2 border-white shadow-lg object-cover"
                alt={agent.name}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">Agent</span>
                <h3 className="font-bold text-slate-900 truncate">{agent.name}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4 truncate">{agent.email}</p>
              <div className="flex gap-2">
                 <button className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5"><MessageSquare size={14}/> Message</button>
                 <a href={`tel:${agent.phone || ''}`} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center shrink-0"><Phone size={14}/></a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Items List */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="text-blue-600" size={20} /> Action Items
          </h2>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
            {projectStatusData.tasks.filter((t: any) => t.status !== 'COMPLETED').length} Pending
          </span>
        </div>
        <div className="p-6 space-y-3">
          {projectStatusData.tasks.sort((a: any, b: any) => {
              if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
              if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
              return 0;
          }).map((task: any) => {
            const isCompleted = task.status === 'COMPLETED';
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-50 border-slate-50 opacity-60'
                    : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={isCompleted ? 'text-emerald-500' : 'text-slate-300'}>
                    {isCompleted ? <CheckCircle size={22} /> : <Circle size={22} />}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${task.role === 'SELLER' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {task.role}
                      </span>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Assigned to {task.userName} • {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isCompleted && (
                    <button
                      onClick={() => handleApproveDoc(task.user.id, task.taskId)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="Mark as Complete"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                  {isCompleted && (
                    <button
                      onClick={() => handleRejectDoc(task.user.id, task.taskId)}
                      className="p-2 text-slate-400 hover:text-amber-600 rounded-xl transition-colors"
                      title="Revert Status"
                    >
                      <History size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {projectStatusData.tasks.length === 0 && (
            <p className="text-center py-8 text-slate-400 italic">No tasks active for this project.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectOverview;
