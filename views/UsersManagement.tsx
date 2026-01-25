import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, UserRole, Project } from '../types';
import { profileService, inviteService, projectService } from '../services/appwrite';
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
  Trash2,
  Building2
} from 'lucide-react';

interface UsersManagementProps {
  user: User;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  projects: Project[];
}

const UsersManagement: React.FC<UsersManagementProps> = ({ user, allUsers, setAllUsers, projects }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newUserInfo, setNewUserInfo] = useState({ 
    name: '', 
    email: '', 
    role: UserRole.BUYER,
    projectId: '' 
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check if user already exists in allUsers
      const existingUser = allUsers.find(u => u.email.toLowerCase() === newUserInfo.email.toLowerCase());
      
      if (existingUser && existingUser.status !== 'PENDING_INVITE') {
        // Just link to project directly
        if (newUserInfo.projectId) {
          const field = newUserInfo.role === UserRole.SELLER ? 'sellerId' : 'buyerId';
          await projectService.update(newUserInfo.projectId, { [field]: existingUser.id });
          alert(`Successfully linked ${existingUser.name} to project.`);
        } else {
          // Just update role
          await handleRoleChange(existingUser.id, newUserInfo.role);
        }
      } else {
        // Create a document in our 'invites' collection
        const inviteData = {
          email: newUserInfo.email.toLowerCase(),
          name: newUserInfo.name,
          role: newUserInfo.role,
          projectId: newUserInfo.projectId || undefined,
          invitedBy: user.id
        };
        
        const response = await inviteService.create(inviteData);
        
        setAllUsers(prev => {
          // Remove existing pending if any (to avoid duplicates)
          const filtered = prev.filter(u => u.email.toLowerCase() !== newUserInfo.email.toLowerCase());
          return [...filtered, {
            id: response.$id,
            name: newUserInfo.name || newUserInfo.email.split('@')[0],
            email: newUserInfo.email,
            role: newUserInfo.role as UserRole,
            status: 'PENDING_INVITE',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUserInfo.email}`
          }];
        });
        alert(`Invitation sent to ${newUserInfo.email}`);
      }
      
      setIsInviteModalOpen(false);
      setNewUserInfo({ name: '', email: '', role: UserRole.BUYER, projectId: '' });
    } catch (error) {
      console.error('Error in handleInvite:', error);
      alert('Failed to process invitation/assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (userToInvite: User) => {
    try {
      setLoading(true);
      await inviteService.create({
        email: userToInvite.email.toLowerCase(),
        name: userToInvite.name,
        role: userToInvite.role,
        projectId: (userToInvite as any).projectId || undefined,
        invitedBy: user.id
      });
      alert(`Invitation resent to ${userToInvite.email}`);
    } catch (error) {
      console.error('Error resending invite:', error);
      alert('Failed to resend invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (!window.confirm(`Are you sure you want to remove ${userToDelete.name}?`)) return;
    
    try {
      if (userToDelete.status === 'PENDING_INVITE') {
        // For pending invites, the 'id' is the document ID in the invites collection
        await inviteService.delete(userToDelete.id);
      } else {
        // For active users, we need to delete the profile document
        const docId = (userToDelete as any).$id;
        if (docId) {
          await profileService.delete(docId);
        } else {
          // Fallback: find profile by userId
          const profiles = await profileService.listAll();
          const doc = profiles.documents.find((d: any) => d.userId === userToDelete.id);
          if (doc) await profileService.delete(doc.$id);
        }
      }
      setAllUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      alert('User removed successfully.');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to remove user');
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const response = await profileService.listAll();
      const doc = response.documents.find((d: any) => d.userId === userId);
      
      if (doc) {
        await profileService.update(doc.$id, { role: newRole });
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
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
                        <Link 
                          to={`/profile/${u.id}`} 
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {u.name}
                        </Link>
                        <p className="text-xs text-slate-400">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <select 
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border-none bg-transparent cursor-pointer ${
                        u.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-600' :
                        u.role === UserRole.SELLER ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                      }`}
                    >
                      {Object.values(UserRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
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
                    <div className="flex items-center justify-end gap-2">
                      {u.status === 'PENDING_INVITE' && (
                        <button 
                          onClick={() => handleResendInvite(u)}
                          className="p-2 hover:bg-amber-50 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                          title="Resend Invitation"
                        >
                          <Mail size={18} />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleDeleteUser(u)}
                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>

                      {(u.role === UserRole.BUYER || u.role === UserRole.SELLER) && (
                        <button 
                          onClick={() => {
                            setNewUserInfo({
                              name: u.name,
                              email: u.email,
                              role: u.role,
                              projectId: ''
                            });
                            setIsInviteModalOpen(true);
                          }}
                          className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                          title="Assign to Project"
                        >
                          <Building2 size={18} />
                        </button>
                      )}
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

              {(newUserInfo.role === UserRole.BUYER || newUserInfo.role === UserRole.SELLER) && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Link to Property</label>
                  <select 
                    required={newUserInfo.role !== UserRole.ADMIN}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                    value={newUserInfo.projectId}
                    onChange={e => setNewUserInfo({...newUserInfo, projectId: e.target.value})}
                  >
                    <option value="">Select a property...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.property.address} ({p.title})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsInviteModalOpen(false)} className="flex-1 px-4 py-2.5 font-bold text-slate-500">Cancel</button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
