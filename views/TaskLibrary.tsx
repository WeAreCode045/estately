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
  FileText
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

  const getMatchedUsers = () => {
    const matches: { user: User, projectId: string }[] = [];

    allUsers.forEach(u => {
      // 1. Role Match
      const roleMatch = assignFilters.roles.length === 0 || assignFilters.roles.includes(u.role);
      
      // 2. Project participation check - find matching projects
      let matchingProjects: string[] = [];
      if (assignFilters.projectSelection === 'ACTIVE') {
        matchingProjects = allProjects
          .filter(p => ['ACTIVE', 'UNDER_CONTRACT'].includes(p.status) && 
                      (p.sellerId === u.id || p.buyerId === u.id || p.managerId === u.id))
          .map(p => p.id);
      } else if (assignFilters.projectSelection === 'SELECTED') {
        matchingProjects = allProjects
          .filter(p => assignFilters.selectedProjectIds.includes(p.id) && 
                      (p.sellerId === u.id || p.buyerId === u.id || p.managerId === u.id))
          .map(p => p.id);
      } else {
        // IGNORE - user matches but no specific project linked by filter
        matchingProjects = ['personal'];
      }

      const projectMatch = matchingProjects.length > 0;

      // 3. Manual user selection check
      const userSelectionMatch = assignFilters.userSelection === 'ALL' || assignFilters.selectedUserIds.includes(u.id);

      // Logical Combination
      let result = roleMatch;
      
      if (assignFilters.projectLogic === 'AND') {
        result = result && projectMatch;
      } else {
        result = result || projectMatch;
      }

      if (assignFilters.scopeLogic === 'AND') {
        result = result && userSelectionMatch;
      } else {
        result = result || userSelectionMatch;
      }

      if (result) {
        // If it matches, add each project assignment
        matchingProjects.forEach(pid => {
           matches.push({ user: u, projectId: pid });
        });
      }
    });

    return matches;
  };
  
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
      
      // Deduplicate users by email (same as App.tsx) to prevent double counting
      const userMap = new Map();
      usersRes.documents.forEach((d: any) => {
        if (!userMap.has(d.email)) {
          userMap.set(d.email, {
            id: d.userId || d.$id, // Use userId for matching projects/auth, fallback to doc ID
            $id: d.$id, // Keep Profile document ID for service calls
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
        property: {
          address: d.address || '',
          price: d.price || 0,
        }
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

  const Toggle: React.FC<{ label: string, sub: string, checked: boolean, onChange: (v: boolean) => void, inline?: boolean }> = ({ label, sub, checked, onChange, inline }) => (
    <label className={`flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors ${inline ? 'p-2 bg-transparent hover:bg-slate-50' : ''}`}>
      <div>
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">{sub}</p>
      </div>
      <div className="relative inline-flex items-center ml-4">
        <input 
          type="checkbox" 
          className="sr-only peer"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </div>
    </label>
  );

  const LogicToggle: React.FC<{ value: 'AND' | 'OR', onChange: (v: 'AND' | 'OR') => void }> = ({ value, onChange }) => (
    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner">
      <button 
        type="button"
        onClick={() => onChange('AND')}
        className={`px-2 py-1 rounded-md text-[9px] font-black transition-all ${value === 'AND' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 opacity-50'}`}
      >
        AND
      </button>
      <button 
        type="button"
        onClick={() => onChange('OR')}
        className={`px-2 py-1 rounded-md text-[9px] font-black transition-all ${value === 'OR' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 opacity-50'}`}
      >
        OR
      </button>
    </div>
  );

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Ensure we only send valid attributes to Appwrite
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
        await databases.updateDocument(
          DATABASE_ID, 
          COLLECTIONS.TASK_TEMPLATES, 
          editingTemplate.id, 
          payload
        );
      } else {
        await databases.createDocument(
          DATABASE_ID, 
          COLLECTIONS.TASK_TEMPLATES, 
          ID.unique(), 
          payload
        );
      }
      
      setIsModalOpen(false);
      setEditingTemplate(null);
      setTemplateData({
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
      fetchTaskTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert(`Failed to save template: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  const handleBulkAssign = async () => {
    if (!selectedTaskForAssign) return;
    try {
      setLoading(true);
      
      const assignments = getMatchedUsers();

      let count = 0;
      for (const { user: u, projectId: pid } of assignments) {
        // Find if user already has this task FOR THIS PROJECT
        const alreadyAssigned = u.assignedTasks?.some(t => t.taskId === selectedTaskForAssign.id && t.projectId === pid);
        let status: 'PENDING' | 'COMPLETED' = 'PENDING';
        
        if (assignFilters.checkVault) {
          const docReqsResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, [
            Query.equal("taskId", selectedTaskForAssign.id)
          ]);
          
          if (docReqsResponse.documents.length > 0) {
            const reqId = docReqsResponse.documents[0].$id;
            const hasDoc = u.userDocuments?.some(d => d.documentRequirementId === reqId && (d.projectId === pid || d.projectId === 'global'));
            if (hasDoc) status = 'COMPLETED';
          }
        }

        if (!alreadyAssigned) {
          // Use (u as any).$id because types.ts might not have $id, but our fetched users do
          await profileService.assignTask((u as any).$id, selectedTaskForAssign.id, { status, projectId: pid });
          count++;
        } else if (assignFilters.checkVault && status === 'COMPLETED') {
           const task = u.assignedTasks?.find(t => t.taskId === selectedTaskForAssign.id && t.projectId === pid);
           if (task && task.status === 'PENDING') {
              await profileService.updateTaskStatus((u as any).$id, selectedTaskForAssign.id, 'COMPLETED');
              count++;
           }
        }
      }

      alert(`Bulk Operation Complete: ${count} assignments were created or updated.`);
      setIsAssignModalOpen(false);
      if (onRefresh) onRefresh();
      fetchUsersAndProjects();
    } catch (error: any) {
      console.error('Bulk assign error:', error);
      alert(`Assignment failed: ${error.message}`);
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
              reminderIntervalDays: 3
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
                  onClick={() => {
                    setEditingTemplate(tmpl);
                    setTemplateData(tmpl);
                    setIsModalOpen(true);
                  }}
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
            
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                <Layout size={12} />
                Assignees: {tmpl.assigneeRoles?.join(', ') || 'None'}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                <CheckSquare size={12} />
                Visibility: {tmpl.showTaskToUser ? 'Visible to User' : 'Admin Only'}
              </div>
              {tmpl.sendReminders && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600">
                  <Bell size={12} />
                  Reminders every {tmpl.reminderIntervalDays} days
                </div>
              )}
            </div>

            <button 
              onClick={() => {
                setSelectedTaskForAssign(tmpl);
                setAssignFilters({
                  userSelection: 'ALL',
                  selectedUserIds: [],
                  scopeLogic: 'AND',
                  roles: [],
                  roleLogic: 'AND',
                  projectSelection: 'IGNORE',
                  selectedProjectIds: [],
                  projectLogic: 'AND',
                  checkVault: true
                });
                setIsAssignModalOpen(true);
              }}
              className="w-full mb-4 bg-slate-50 text-slate-600 hover:bg-blue-100 hover:text-blue-700 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all gap-2 border border-slate-100 flex items-center justify-center shadow-sm"
            >
              <Users size={14} /> Assign to Users
            </button>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded">
                {tmpl.category}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {tmpl.deadlineType === 'RELATIVE' ? `${tmpl.deadlineDays}d deadline` : tmpl.deadlineDate}
              </span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 pb-4 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingTemplate ? 'Edit Template' : 'New Task Template'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">Configure a standard reusable task.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-8 pt-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Task Title</label>
                    <input 
                      required
                      type="text" 
                      value={templateData.title}
                      onChange={e => setTemplateData({...templateData, title: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      placeholder="e.g. Confirm Financial Disclosure"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Description</label>
                    <textarea 
                      value={templateData.description}
                      onChange={e => setTemplateData({...templateData, description: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm h-[120px] resize-none focus:border-blue-500 outline-none"
                      placeholder="Detailed instructions for this task..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Category</label>
                    <select 
                      value={templateData.category}
                      onChange={e => setTemplateData({...templateData, category: e.target.value as any})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                    >
                      <option value="GENERAL">General</option>
                      <option value="LEGAL">Legal</option>
                      <option value="INSPECTION">Inspection</option>
                      <option value="FINANCIAL">Financial</option>
                      <option value="CLOSING">Closing</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Deadline Type</label>
                      <select 
                        value={templateData.deadlineType}
                        onChange={e => setTemplateData({...templateData, deadlineType: e.target.value as 'RELATIVE' | 'FIXED'})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                      >
                        <option value="RELATIVE">Relative (Days)</option>
                        <option value="FIXED">Fixed Date</option>
                      </select>
                    </div>
                    {templateData.deadlineType === 'RELATIVE' ? (
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Days to Complete</label>
                        <input 
                          type="number" 
                          value={templateData.deadlineDays}
                          onChange={e => setTemplateData({...templateData, deadlineDays: parseInt(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Deadline Date</label>
                        <input 
                          type="date" 
                          value={templateData.deadlineDate || ''}
                          onChange={e => setTemplateData({...templateData, deadlineDate: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Assignee Roles</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(UserRole).map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            const current = templateData.assigneeRoles || [];
                            if (current.includes(role)) {
                              setTemplateData({ ...templateData, assigneeRoles: current.filter(r => r !== role) });
                            } else {
                              setTemplateData({ ...templateData, assigneeRoles: [...current, role] });
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            templateData.assigneeRoles?.includes(role)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50 p-5 rounded-3xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-700">Show to User</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Visibility Controls</p>
                      </div>
                      <Toggle 
                        label="" sub="" 
                        checked={!!templateData.showTaskToUser} 
                        onChange={v => setTemplateData({...templateData, showTaskToUser: v})} 
                        inline
                      />
                    </div>

                    {templateData.showTaskToUser && (
                      <div className="space-y-3 pt-3 border-t border-slate-200 animate-in slide-in-from-top-2">
                        <select 
                          value={templateData.visibilityType}
                          onChange={e => setTemplateData({...templateData, visibilityType: e.target.value as any})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                        >
                          <option value="ALWAYS">Always Visible</option>
                          <option value="DATE">Visible on Specific Date</option>
                          <option value="DAYS_AFTER_START">Visible X Days after Start</option>
                          <option value="AFTER_TASK">Visible after Completion of Task</option>
                        </select>

                        {templateData.visibilityType === 'DATE' && (
                          <input 
                            type="date"
                            value={templateData.visibilityDate || ''}
                            onChange={e => setTemplateData({...templateData, visibilityDate: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          />
                        )}

                        {templateData.visibilityType === 'DAYS_AFTER_START' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">Days:</span>
                            <input 
                              type="number"
                              value={templateData.visibilityDays || 0}
                              onChange={e => setTemplateData({...templateData, visibilityDays: parseInt(e.target.value)})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                            />
                          </div>
                        )}

                        {templateData.visibilityType === 'AFTER_TASK' && (
                          <select 
                            value={templateData.visibilityTaskId || ''}
                            onChange={e => setTemplateData({...templateData, visibilityTaskId: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          >
                            <option value="">Select Task...</option>
                            {taskTemplates.filter(t => t.id !== editingTemplate?.id).map(t => (
                              <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-5 rounded-3xl space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notifications</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Toggle 
                        label="For Admin" sub="Alert Agent" 
                        checked={!!templateData.notifyAgentOnComplete} 
                        onChange={v => setTemplateData({...templateData, notifyAgentOnComplete: v})} 
                        inline
                      />
                      <Toggle 
                        label="For Assignee" sub="Alert User" 
                        checked={!!templateData.notifyAssignee} 
                        onChange={v => setTemplateData({...templateData, notifyAssignee: v})} 
                        inline
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-700">Reminders</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Auto Follow-up</p>
                      </div>
                      <Toggle 
                        label="" sub="" 
                        checked={!!templateData.sendReminders} 
                        onChange={v => setTemplateData({...templateData, sendReminders: v})} 
                        inline
                      />
                    </div>

                    {templateData.sendReminders && (
                      <div className="flex items-center gap-3 pt-2 animate-in slide-in-from-top-2">
                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-widest">Every X Days</span>
                        <input 
                          type="number" 
                          value={templateData.reminderIntervalDays}
                          onChange={e => setTemplateData({...templateData, reminderIntervalDays: parseInt(e.target.value)})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-8 mt-4 border-t border-slate-50">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (editingTemplate ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssignModalOpen && selectedTaskForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Assign Task</h2>
                  <p className="text-slate-500 text-sm">Bulk assign <strong>{selectedTaskForAssign.title}</strong> to filtered users.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                disabled={loading}
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Filters */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <FilterIcon size={14} /> Criteria
                    </h3>
                    
                    {/* User Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Users Scope</label>
                        <LogicToggle 
                          value={assignFilters.scopeLogic} 
                          onChange={v => setAssignFilters({...assignFilters, scopeLogic: v})} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setAssignFilters({...assignFilters, userSelection: 'ALL'})}
                          className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${assignFilters.userSelection === 'ALL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'}`}
                        >
                          All Users
                        </button>
                        <button 
                          onClick={() => setAssignFilters({...assignFilters, userSelection: 'SELECTED'})}
                          className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${assignFilters.userSelection === 'SELECTED' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'}`}
                        >
                          Manual Selection
                        </button>
                      </div>
                    </div>

                    {/* Roles */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Roles</label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[UserRole.SELLER, UserRole.BUYER, UserRole.ADMIN].map(role => (
                          <button 
                            key={role}
                            onClick={() => {
                              const roles = assignFilters.roles.includes(role) 
                                ? assignFilters.roles.filter(r => r !== role)
                                : [...assignFilters.roles, role];
                              setAssignFilters({...assignFilters, roles});
                            }}
                            className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${assignFilters.roles.includes(role) ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Project Status Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Projects Filter</label>
                        <LogicToggle 
                          value={assignFilters.projectLogic} 
                          onChange={v => setAssignFilters({...assignFilters, projectLogic: v})} 
                        />
                      </div>
                      <select 
                        value={assignFilters.projectSelection}
                        onChange={e => setAssignFilters({...assignFilters, projectSelection: e.target.value as any})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                      >
                        <option value="IGNORE">Ignore (All Users)</option>
                        <option value="ACTIVE">Users in Active Projects Only</option>
                        <option value="SELECTED">Manual Project Selection</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <FileText size={20} />
                         </div>
                         <div>
                           <p className="text-xs font-bold text-slate-700">Vault Intelligence</p>
                           <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Smart Detection</p>
                         </div>
                      </div>
                      <div className="relative inline-flex items-center ml-4">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={assignFilters.checkVault}
                          onChange={e => setAssignFilters({...assignFilters, checkVault: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Selections and Preview */}
                <div className="space-y-6">
                  {assignFilters.userSelection === 'SELECTED' && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          Select Users ({assignFilters.selectedUserIds.length})
                        </h4>
                        <button 
                          onClick={() => {
                            const pool = allUsers.filter(u => assignFilters.roles.length === 0 || assignFilters.roles.includes(u.role));
                            const allPoolIds = pool.map(u => u.id);
                            const allPoolSelected = allPoolIds.every(id => assignFilters.selectedUserIds.includes(id));
                            
                            let next;
                            if (allPoolSelected) {
                              next = assignFilters.selectedUserIds.filter(id => !allPoolIds.includes(id));
                            } else {
                              next = Array.from(new Set([...assignFilters.selectedUserIds, ...allPoolIds]));
                            }
                            setAssignFilters({...assignFilters, selectedUserIds: next});
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
                        >
                          {allUsers.filter(u => assignFilters.roles.length === 0 || assignFilters.roles.includes(u.role)).every(u => assignFilters.selectedUserIds.includes(u.id)) ? 'Deselect Visible' : 'Select Visible'}
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {allUsers
                          .filter(u => assignFilters.roles.length === 0 || assignFilters.roles.includes(u.role))
                          .map(u => (
                          <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                            <input 
                              type="checkbox"
                              checked={assignFilters.selectedUserIds.includes(u.id)}
                              onChange={e => {
                                let next;
                                if (e.target.checked) {
                                  next = Array.from(new Set([...assignFilters.selectedUserIds, u.id]));
                                } else {
                                  next = assignFilters.selectedUserIds.filter(id => id !== u.id);
                                }
                                setAssignFilters({...assignFilters, selectedUserIds: next});
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-700">{u.name}</p>
                              <p className="text-[10px] text-slate-400">{u.role}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {assignFilters.projectSelection === 'SELECTED' && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          Select Projects ({assignFilters.selectedProjectIds.length})
                        </h4>
                        <button 
                          onClick={() => {
                            const allIds = allProjects.map(p => p.id);
                            const next = assignFilters.selectedProjectIds.length === allProjects.length ? [] : allIds;
                            setAssignFilters({...assignFilters, selectedProjectIds: next});
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
                        >
                          {assignFilters.selectedProjectIds.length === allProjects.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {allProjects.map(p => (
                          <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                            <input 
                              type="checkbox"
                              checked={assignFilters.selectedProjectIds.includes(p.id)}
                              onChange={e => {
                                let next;
                                if (e.target.checked) {
                                  next = Array.from(new Set([...assignFilters.selectedProjectIds, p.id]));
                                } else {
                                  next = assignFilters.selectedProjectIds.filter(id => id !== p.id);
                                }
                                setAssignFilters({...assignFilters, selectedProjectIds: next});
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-700">{p.title}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Status: {p.status}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-600 text-white p-6 rounded-[2rem] shadow-xl shadow-blue-600/20 relative overflow-hidden">
                    <div className="relative z-10">
                       <h4 className="text-[11px] font-bold text-blue-100 uppercase tracking-widest mb-1">Estimated Impact</h4>
                       <p className="text-3xl font-bold">{getMatchedUsers().length} Assignments</p>
                       <p className="text-blue-100 text-xs mt-2 leading-relaxed opacity-80">
                         Starting this process will scan all users based on your logic and assign this task to those who don't have it yet for the specific projects.
                       </p>
                    </div>
                    <Users className="absolute -right-4 -bottom-4 text-blue-500/20" size={120} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 flex gap-4 bg-white shrink-0">
               <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkAssign}
                disabled={loading}
                className="flex-[3] bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <CheckSquare size={20} /> Execute Bulk Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskLibrary;
