
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { 
  Users as UsersIcon, 
  Search, 
  Plus, 
  Mail, 
  MoreHorizontal, 
  UserPlus,
  Filter,
  CheckCircle2,
  Clock,
  Trash2
} from 'lucide-react';

interface UsersManagementProps {
  user: User;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const UsersManagement: React.FC<UsersManagementProps> = ({ user, allUsers, setAllUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newUserInfo, setNewUserInfo] = useState({ name: '', email: '', role: UserRole.BUYER });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `u-${Date.now()}`,
      ...newUserInfo,
      status: 'PENDING_INVITE',
      avatar: `https://picsum.photos/seed/${newUserInfo.name}/100`
    };
    setAllUsers(prev => [...prev, newUser]);
    setIsInviteModalOpen(false);
    setNewUserInfo({ name: '', email: '', role: UserRole.BUYER });
    alert(`Invitation sent to ${newUserInfo.email}`);
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage agency staff, sellers, and buyers across the platform.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
        >
          <UserPlus size={18} /> Invite User
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-xl hover:bg-white text-slate-500"><Filter size={18}/></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} className="w-10 h-10 rounded-full border border-slate-200" alt="" />
                      <div>
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                      u.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-600' :
                      u.role === UserRole.SELLER ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {u.status === 'PENDING_INVITE' ? (
                      <div className="flex items-center gap-1.5 text-amber-500 text-xs font-bold">
                        <Clock size={14} /> Pending Invite
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                        <CheckCircle2 size={14} /> Active
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Mail size={12} className="text-slate-400" /> {u.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 border border-transparent hover:border-slate-100"><MoreHorizontal size={18}/></button>
                      <button 
                        onClick={() => setAllUsers(prev => prev.filter(x => x.id !== u.id))}
                        className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 border border-transparent hover:border-slate-100"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Invite New Participant</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Trash2 size={20}/></button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newUserInfo.name}
                  onChange={e => setNewUserInfo({...newUserInfo, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newUserInfo.email}
                  onChange={e => setNewUserInfo({...newUserInfo, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  value={newUserInfo.role}
                  onChange={e => setNewUserInfo({...newUserInfo, role: e.target.value as UserRole})}
                >
                  <option value={UserRole.BUYER}>Buyer</option>
                  <option value={UserRole.SELLER}>Seller</option>
                  <option value={UserRole.ADMIN}>Agent (Admin)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsInviteModalOpen(false)} className="flex-1 px-4 py-2.5 font-bold text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:bg-blue-700">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
