import { Eye, UserIcon } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import type { Project, User } from '../../types';
import { UserRole } from '../../types';

interface ProjectTeamProps {
  project: Project;
  seller?: User;
  buyer?: User;
  agent?: User;
  allUsers: User[];
  defaultAgentId?: string;
  onSwitchUser?: (id: string) => void;
  assignUser: (role: 'seller' | 'buyer' | 'manager', userId: string) => void;
  setShowInviteModal: (show: boolean) => void;
}

const ProjectTeam: React.FC<ProjectTeamProps> = ({
  project,
  seller,
  buyer,
  agent,
  allUsers,
  defaultAgentId,
  onSwitchUser,
  assignUser,
  setShowInviteModal
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Project Participants</h2>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <UserIcon size={18} /> Invite New
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Agent Management */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserIcon size={18}/> Real Estate Agent</h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            {agent ? (
              <div className="flex items-center gap-3">
                <img src={agent.avatar} className="w-10 h-10 rounded-full" alt="" />
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${agent.id}`} className="font-bold text-sm hover:text-blue-600 transition-colors">{agent.name}</Link>
                    {onSwitchUser && (
                      <button
                        onClick={() => onSwitchUser(agent.id)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all tooltip"
                        title="View as Agent"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{agent.email}</p>
                </div>
              </div>
            ) : <p className="text-sm text-slate-400 italic">No agent assigned</p>}
          </div>
          <select onChange={(e) => assignUser('manager', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm" value={project.managerId || defaultAgentId || ''}>
            {allUsers.filter(u => u.role === UserRole.AGENT || u.role === UserRole.ADMIN).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        {/* Seller Management */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserIcon size={18}/> Seller</h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            {seller ? (
              <div className="flex items-center gap-3">
                <img src={seller.avatar} className="w-10 h-10 rounded-full" alt="" />
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${seller.id}`} className="font-bold text-sm hover:text-blue-600 transition-colors">{seller.name}</Link>
                    {onSwitchUser && (
                      <button
                        onClick={() => onSwitchUser(seller.id)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all tooltip"
                        title="View as Seller"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{seller.email}</p>
                </div>
              </div>
            ) : <p className="text-sm text-slate-400 italic">No seller assigned</p>}
          </div>
          <select onChange={(e) => assignUser('seller', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm" value={project.sellerId}>
            {allUsers.filter(u => u.role === UserRole.SELLER).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        {/* Buyer Management */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserIcon size={18}/> Buyer</h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            {buyer ? (
              <div className="flex items-center gap-3">
                <img src={buyer.avatar} className="w-10 h-10 rounded-full" alt="" />
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${buyer.id}`} className="font-bold text-sm hover:text-blue-600 transition-colors">{buyer.name}</Link>
                    {onSwitchUser && (
                      <button
                        onClick={() => onSwitchUser(buyer.id)}
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all tooltip"
                        title="View as Buyer"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{buyer.email}</p>
                </div>
              </div>
            ) : <p className="text-sm text-slate-400 italic">No buyer assigned</p>}
          </div>
          <select onChange={(e) => assignUser('buyer', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm" value={project.buyerId || ''}>
            <option value="">Unassigned</option>
            {allUsers.filter(u => u.role === UserRole.BUYER).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ProjectTeam;
