import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Layout,
  Bell,
  Users,
  Search,
  Filter as FilterIcon,
  X,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { User, TaskTemplate, UserRole, Project } from '../types';
import { databases, DATABASE_ID, COLLECTIONS, profileService, projectService, Query } from '../services/appwrite';
import { ID } from 'appwrite';

interface TaskLibraryProps {
  user: User;
  onRefresh?: () => void;
}

const TaskLibrary: React.FC<TaskLibraryProps> = ({ user, onRefresh }) => {
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<TaskTemplate | null>(null);

  const [assignFilters, setAssignFilters] = useState({
    userSelection: 'ALL' as 'ALL' | 'SELECTED',
    selectedUserIds: [] as string[],
    scopeLogic: 'AND' as 'AND' | 'OR',
    roles: [] as UserRole[],
    roleLogic: 'AND' as 'AND' | 'OR',
    projectSelection: 'IGNORE' as 'IGNORE' | 'ACTIVE' | 'SELECTED',
    selectedProjectIds: [] as string[],
    projectLogic: 'AND' as 'AND' | 'OR',
    checkVault: true
  });

  const [templateData, setTemplateData] = useState<Partial<TaskTemplate>>({
    title: '',
    description: '',
    category: 'GENERAL' as any,
    assigneeRoles: [UserRole.SELLER],
    showTaskToUser: true,
    sendReminders: false,
    notifyAssignee: true,
    notifyAgentOnComplete: true,
    deadlineType: 'RELATIVE',
    deadlineDays: 7,
    reminderIntervalDays: 3,
    visibilityType: 'ALWAYS'
  });

  useEffect(() => {
    fetchTaskTemplates();
    fetchUsersAndProjects();
  }, []);

  const fetchUsersAndProjects = async () => {
    try {
      const [usersRes, projectsRes] = await Promise.all([
        profileService.listAll(),
        projectService.list()
      ]);

      const userMap = new Map();
      usersRes.documents.forEach((d: any) => {
        if (!userMap.has(d.email)) {
          userMap.set(d.email, {
            id: d.userId || d.$id,
            $id: d.$id,
            name: d.name,
            email: d.email,
            role: d.role,
            assignedTasks: d.assignedTasks ? (typeof d.assignedTasks === 'string' ? JSON.parse(d.assignedTasks) : d.assignedTasks) : [],
            userDocuments: d.userDocuments ? (typeof d.userDocuments === 'string' ? JSON.parse(d.userDocuments) : d.userDocuments) : []
          } as any);
        }
      });

      setAllUsers(Array.from(userMap.values()));
      setAllProjects(projectsRes.documents.map((d: any) => ({
        id: d.$id,
        title: d.title,
        status: d.status,
        sellerId: d.sellerId,
        buyerId: d.buyerId,
        managerId: d.managerId,
        property: { address: d.address || '', price: d.price || 0 }
      } as any)));
    } catch (error) {
      console.error('Error fetching users/projects:', error);
    }
  };

  const fetchTaskTemplates = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES);
      setTaskTemplates(response.documents.map((doc: any) => ({
        id: doc.$id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        assigneeRoles: doc.assigneeRoles || [],
        showTaskToUser: doc.showTaskToUser ?? true,
        sendReminders: doc.sendReminders ?? false,
        notifyAssignee: doc.notifyAssignee ?? true,
        notifyAgentOnComplete: doc.notifyAgentOnComplete ?? true,
        deadlineType: doc.deadlineType || 'RELATIVE',
        deadlineDays: doc.deadlineDays,
        deadlineDate: doc.deadlineDate,
        reminderIntervalDays: doc.reminderIntervalDays || 3,
        visibilityType: doc.visibilityType || 'ALWAYS',
        visibilityDate: doc.visibilityDate,
        visibilityDays: doc.visibilityDays,
        visibilityTaskId: doc.visibilityTaskId
      })));
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const payload: any = {
        title: templateData.title,
        description: templateData.description,
        category: templateData.category,
        assigneeRoles: templateData.assigneeRoles,
        showTaskToUser: templateData.showTaskToUser,
        sendReminders: templateData.sendReminders,
        notifyAssignee: templateData.notifyAssignee,
        notifyAgentOnComplete: templateData.notifyAgentOnComplete,
        deadlineType: templateData.deadlineType,
        deadlineDays: templateData.deadlineDays,
        deadlineDate: templateData.deadlineDate,
        reminderIntervalDays: templateData.reminderIntervalDays,
        visibilityType: templateData.visibilityType,
        visibilityDate: templateData.visibilityDate,
        visibilityDays: templateData.visibilityDays,
        visibilityTaskId: templateData.visibilityTaskId
      };

      if (editingTemplate) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES, editingTemplate.id, payload);
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES, ID.unique(), payload);
      }

      setIsModalOpen(false);
      setEditingTemplate(null);
      setTemplateData({
        title: '', description: '', category: 'GENERAL' as any,
        assigneeRoles: [UserRole.SELLER], showTaskToUser: true, sendReminders: false,
        notifyAssignee: true, notifyAgentOnComplete: true, deadlineType: 'RELATIVE',
        deadlineDays: 7, reminderIntervalDays: 3, visibilityType: 'ALWAYS'
      });
      fetchTaskTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert(`Failed to save template: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES, id);
      fetchTaskTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Library</h1>
          <p className="text-slate-500 mt-1">Manage standardized reusable task templates for the agency.</p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setTemplateData({
              title: '', description: '', category: 'GENERAL' as any,
              assigneeRoles: [UserRole.SELLER], showTaskToUser: true, sendReminders: false,
              notifyAssignee: true, notifyAgentOnComplete: true, deadlineType: 'RELATIVE',
              deadlineDays: 7, reminderIntervalDays: 3
            });
            setIsModalOpen(true);
          }}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
        >
          <Plus size={18} /> Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {taskTemplates.map(tmpl => (
          <div key={tmpl.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm group hover:border-blue-200 transition-all flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-slate-50 text-slate-400 p-3 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <CheckSquare size={24} />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingTemplate(tmpl); setTemplateData(tmpl); setIsModalOpen(true); }}
                  className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => deleteTemplate(tmpl.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h4 className="font-bold text-slate-900 mb-1">{tmpl.title}</h4>
            <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{tmpl.description || 'No description provided.'}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded">
                {tmpl.category}
              </span>
              {tmpl.sendReminders && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  <Bell size={10} className="inline mr-1" />
                  {tmpl.reminderIntervalDays}d reminders
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-auto pt-4 border-t border-slate-50">
              <Users size={12} />
              {tmpl.assigneeRoles?.join(', ') || 'None'}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="p-8 pb-4 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingTemplate ? 'Edit Template' : 'New Task Template'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveTemplate} className="p-8 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Task Title</label>
                    <input
                      required type="text" value={templateData.title || ''}
                      onChange={e => setTemplateData({...templateData, title: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm"
                      placeholder="e.g. Confirm Financial Disclosure"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Description</label>
                    <textarea
                      value={templateData.description || ''}
                      onChange={e => setTemplateData({...templateData, description: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm h-32 resize-none"
                      placeholder="Detailed instructions..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Category</label>
                    <select
                      value={templateData.category}
                      onChange={e => setTemplateData({...templateData, category: e.target.value as any})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm"
                    >
                      <option value="GENERAL">General</option>
                      <option value="LEGAL">Legal</option>
                      <option value="INSPECTION">Inspection</option>
                      <option value="FINANCIAL">Financial</option>
                      <option value="CLOSING">Closing</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Assignee Roles</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(UserRole).map(role => (
                        <button
                          key={role} type="button"
                          onClick={() => {
                            const current = templateData.assigneeRoles || [];
                            setTemplateData({
                              ...templateData,
                              assigneeRoles: current.includes(role)
                                ? current.filter(r => r !== role)
                                : [...current, role]
                            });
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            templateData.assigneeRoles?.includes(role)
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Deadline Type</label>
                      <select
                        value={templateData.deadlineType}
                        onChange={e => setTemplateData({...templateData, deadlineType: e.target.value as 'RELATIVE' | 'FIXED'})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm"
                      >
                        <option value="RELATIVE">Days</option>
                        <option value="FIXED">Fixed Date</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">
                        {templateData.deadlineType === 'RELATIVE' ? 'Days' : 'Date'}
                      </label>
                      {templateData.deadlineType === 'RELATIVE' ? (
                        <input
                          type="number" value={templateData.deadlineDays || 0}
                          onChange={e => setTemplateData({...templateData, deadlineDays: parseInt(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm"
                        />
                      ) : (
                        <input
                          type="date" value={templateData.deadlineDate || ''}
                          onChange={e => setTemplateData({...templateData, deadlineDate: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-8 mt-4 border-t border-slate-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (editingTemplate ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskLibrary;

