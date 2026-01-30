import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Project, User, UserRole, ProjectStatus } from '../types';
import { 
  Building2, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Plus,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  Circle,
  FileText,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Download,
  User as UserIcon,
  CheckSquare,
  X,
  Edit2,
  Image as ImageIcon
} from 'lucide-react';
import { projectService } from '../services/appwrite';
import { documentService } from '../services/documentService';
import { projectFormsService } from '../services/projectFormsService';
import { useSettings } from '../utils/useSettings';
import AddressAutocomplete from '../components/AddressAutocomplete';

interface DashboardProps {
  projects: Project[];
  user: User;
  allUsers: User[];
  taskTemplates?: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ projects = [], user, allUsers = [], taskTemplates = [] }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const { googleApiKey } = useSettings();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectAddress, setProjectAddress] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter projects based on role
  const visibleProjects = isAdmin 
    ? (projects || []) 
    : (projects || []).filter(p => p.sellerId === user.id || p.buyerId === user.id);

  // For non-admins, focus on the first matching project
  const userProject = !isAdmin ? visibleProjects[0] : null;

  // New logic for User tasks (Personal Audit)
  const userProjectTasks = userProject ? (user.assignedTasks || [])
    .filter(at => at.projectId === userProject.id)
    .map(at => {
      const template = taskTemplates.find(tpl => tpl.id === at.taskId);
      return {
        ...at,
        id: at.taskId,
        title: template?.title || at.taskId,
        completed: at.status === 'COMPLETED'
      };
    }) : [];

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    const formData = new FormData(e.currentTarget);
    const priceValue = formData.get('price') as string;
    
    try {
      let coverImageId = '';
      if (coverImage) {
        const upload = await projectService.uploadImage(coverImage);
        coverImageId = upload.$id;
      }

      const data = {
        title: formData.get('title') as string,
        address: projectAddress || (formData.get('address') as string) || '',
        price: priceValue ? parseFloat(priceValue) : 0,
        status: ProjectStatus.ACTIVE,
        managerId: user.id,
        description: (formData.get('description') as string) || '',
        coverImageId: coverImageId,
        bedrooms: 0,
        bathrooms: 0,
        sqft: 0
      };

      const newProject = await projectService.create(data);
      
      // Auto-trigger required documents
      try {
        await documentService.syncProjectRequirements(newProject.$id, 'PROJECT_CREATION');
      } catch (syncError) {
        console.error('Error syncing initial document requirements:', syncError);
      }

      // Auto-provision forms
      try {
        await projectFormsService.autoProvisionForms(newProject.$id, {
          ...data,
          id: newProject.$id
        });
      } catch (formError) {
        console.error('Error auto-provisioning forms:', formError);
      }

      setShowNewProjectModal(false);
      setCoverImage(null);
      setProjectAddress('');
      alert('Project launched successfully!');
      window.location.reload();
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert(`Failed to launch project: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProject) return;

    setIsProcessing(true);
    const formData = new FormData(e.currentTarget);
    const priceValue = formData.get('price') as string;

    try {
      let coverImageId = editingProject.coverImageId || '';
      if (coverImage) {
        const upload = await projectService.uploadImage(coverImage);
        coverImageId = upload.$id;
      }

      const updates = {
        title: formData.get('title') as string,
        address: projectAddress || (formData.get('address') as string) || editingProject.property.address,
        price: priceValue ? parseFloat(priceValue) : editingProject.property.price,
        description: (formData.get('description') as string) || editingProject.property.description,
        coverImageId: coverImageId,
        bedrooms: editingProject.property.bedrooms,
        bathrooms: editingProject.property.bathrooms,
        sqft: editingProject.property.sqft,
      };

      await projectService.update(editingProject.id, updates);
      setEditingProject(null);
      setCoverImage(null);
      setProjectAddress('');
      alert('Project updated successfully!');
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating project:', error);
      alert(`Failed to update project: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setProjectAddress(project.property.address);
    setCoverImage(null);
  };

  if (isAdmin) {
    const stats = [
      { label: 'Active Projects', value: visibleProjects.filter(p => p.status === ProjectStatus.ACTIVE).length, icon: <Building2 className="text-blue-600" />, color: 'bg-blue-50' },
      { label: 'Under Contract', value: visibleProjects.filter(p => p.status === ProjectStatus.UNDER_CONTRACT).length, icon: <Clock className="text-amber-600" />, color: 'bg-amber-50' },
      { label: 'Completed Sales', value: visibleProjects.filter(p => p.status === ProjectStatus.SOLD).length, icon: <CheckCircle2 className="text-emerald-600" />, color: 'bg-emerald-50' },
      { label: 'Portfolio Value', value: `$${((visibleProjects.reduce((acc, p) => acc + (p.property?.price || 0), 0)) / 1000000).toFixed(1)}M`, icon: <TrendingUp className="text-indigo-600" />, color: 'bg-indigo-50' },
    ];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agency Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage and track all property transactions.</p>
          </div>
          <button 
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md"
          >
            <Plus size={20} />
            <span>New Project</span>
          </button>
        </div>

        {showNewProjectModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Create New Project</h2>
                <button onClick={() => setShowNewProjectModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project Title</label>
                    <input name="title" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Sunset Valley Estate" />
                  </div>
                  <div className="col-span-2 text-center">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-left">Cover Image</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative cursor-pointer aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                    >
                      {coverImage ? (
                        <img src={URL.createObjectURL(coverImage)} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="flex flex-col items-center text-slate-400">
                          <ImageIcon size={32} className="mb-2 opacity-50 group-hover:text-blue-500 group-hover:scale-110 transition-transform" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Click to upload photo</p>
                        </div>
                      )}
                      {coverImage && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Edit2 className="text-white" size={24} />
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Property Address</label>
                    {googleApiKey ? (
                      <AddressAutocomplete 
                        apiKey={googleApiKey}
                        value={projectAddress}
                        onChange={setProjectAddress}
                        name="address"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" 
                        placeholder="123 Ocean Drive, Miami, FL"
                      />
                    ) : (
                      <input name="address" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="123 Ocean Drive, Miami, FL" />
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Listing Price</label>
                    <input name="price" type="number" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="850000" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                    <textarea name="description" className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none" placeholder="Enter property highlights..."></textarea>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowNewProjectModal(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={isProcessing} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50">
                    {isProcessing ? 'Creating...' : 'Launch Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingProject && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Edit Project</h2>
                <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateProject} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project Title</label>
                    <input name="title" defaultValue={editingProject.title} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div className="col-span-2 text-center">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-left">Cover Image</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative cursor-pointer aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                    >
                      {coverImage ? (
                        <img src={URL.createObjectURL(coverImage)} className="w-full h-full object-cover" alt="Preview" />
                      ) : editingProject.coverImageId ? (
                        <img src={projectService.getImagePreview(editingProject.coverImageId)} className="w-full h-full object-cover" alt="Current" />
                      ) : (
                        <div className="flex flex-col items-center text-slate-400">
                          <ImageIcon size={32} className="mb-2 opacity-50 group-hover:text-blue-500" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Click to change photo</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <Edit2 className="text-white" size={24} />
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Property Address</label>
                    {googleApiKey ? (
                      <AddressAutocomplete 
                        apiKey={googleApiKey}
                        value={projectAddress}
                        onChange={setProjectAddress}
                        name="address"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" 
                      />
                    ) : (
                      <input name="address" defaultValue={editingProject.property.address} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Listing Price</label>
                    <input name="price" type="number" defaultValue={editingProject.property.price} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                    <textarea name="description" defaultValue={editingProject.property.description} className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none"></textarea>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setEditingProject(null)} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={isProcessing} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50">
                    {isProcessing ? 'Saving Changes...' : 'Update Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                {stat.icon}
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Active Listings</h2>
              <Link to="/projects" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleProjects.map((project) => (
                <ProjectSummaryCard 
                  key={project.id} 
                  project={project} 
                  isAdmin={isAdmin}
                  onEdit={() => openEditModal(project)}
                />
              ))}
              {visibleProjects.length === 0 && (
                 <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 italic">No listings currently active.</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Coming Up</h2>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="space-y-6">
                {visibleProjects.flatMap(p => p.agenda || []).map((event, idx) => (
                  <div key={idx} className="flex gap-4 group cursor-pointer">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-[9px] font-bold text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <span>MAY</span>
                        <span className="text-xs leading-tight">28</span>
                      </div>
                      <div className="w-[1px] flex-1 bg-slate-100 mt-2"></div>
                    </div>
                    <div className="pb-6">
                      <p className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{event.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">10:00 AM - 11:30 AM</p>
                      <div className="mt-2">
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">{event.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {visibleProjects.flatMap(p => p.agenda || []).length === 0 && (
                  <p className="text-center py-12 text-slate-400 italic text-xs font-medium">No appointments scheduled.</p>
                )}
              </div>

              {/* My Tasks Widget */}
              <div className="mt-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">My Tasks</h3>
                  <Link to="/tasks" className="text-blue-600 text-xs font-bold hover:underline">View All</Link>
                </div>
                <div className="space-y-3">
                  {user && user.assignedTasks && user.assignedTasks.length > 0 ? (
                    user.assignedTasks
                      .slice()
                      .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
                      .slice(0, 5)
                      .map((t, i) => {
                        const template = taskTemplates.find(tp => tp.id === t.taskId || (tp as any).$id === t.taskId);
                        return (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                                {t.status === 'COMPLETED' ? <CheckCircle className="" /> : <Clock className="" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{t.title || template?.title || 'Task'}</p>
                                <p className="text-[10px] text-slate-400 truncate">{t.projectId ? (projects.find(p => p.id === t.projectId)?.title || 'Project') : 'Personal'} • {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'}</p>
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SELLER / BUYER DASHBOARD
  if (!userProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
        <div className="bg-slate-100 p-8 rounded-full mb-6 text-slate-400 shadow-inner">
          <Building2 size={64} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Project Not Assigned</h1>
        <p className="text-slate-500 mt-2 max-w-sm">You aren't currently assigned to an active property project. Contact your agent to get started.</p>
      </div>
    );
  }

  const agent = allUsers.find(u => u.id === userProject.managerId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome, {user.name.split(' ')[0]}</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" /> {userProject.property.address}
          </p>
        </div>
        <Link 
          to={`/projects/${userProject.id}`}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          View Full Project File <ArrowRight size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tasks and Documents */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Progress Widget (Replaces portfolios for clients) */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <CheckCircle2 size={120} />
             </div>
             <div className="relative z-10">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Overall Sale Progress</p>
                <h2 className="text-4xl font-bold mb-6">65% <span className="text-lg font-normal opacity-70">to completion</span></h2>
                <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-white rounded-full shadow-sm" style={{ width: '65%' }}></div>
                </div>
                <div className="mt-6 flex gap-6">
                   <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Status</p>
                      <p className="text-sm font-bold">Under Contract</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Next Step</p>
                      <p className="text-sm font-bold">Final Walkthrough</p>
                   </div>
                </div>
             </div>
          </div>

          {/* TASK LIST WIDGET */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="text-emerald-500" size={20} /> Action Items
              </h2>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                {userProjectTasks.filter(t => !t.completed).length} Pending
              </span>
            </div>
            <div className="p-6 space-y-3">
              {userProjectTasks.map(task => (
                <div key={task.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${task.completed ? 'bg-slate-50 border-slate-50 opacity-60' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={task.completed ? 'text-emerald-500' : 'text-slate-300'}>
                      {task.completed ? <CheckCircle size={22} /> : <Circle size={22} />}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Assigned: {new Date(task.assignedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {userProjectTasks.length === 0 && (
                <p className="text-center py-8 text-slate-400 italic">No tasks assigned for this project.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Agent Contact and Documents */}
        <div className="space-y-8">
          
          {/* CONTACT AGENT WIDGET */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-center gap-2">
              <UserIcon size={18} className="text-blue-600" /> Your Dedicated Agent
            </h2>
            <div className="relative mb-4 inline-block">
              <img src={agent?.avatar} className="w-24 h-24 rounded-3xl border-4 border-white shadow-xl object-cover" alt="" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <h3 className="font-bold text-slate-900 text-xl">{agent?.name}</h3>
            <p className="text-xs text-slate-500 mb-8 font-medium">Real Estate Advisor • EstateFlow Agency</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-all text-xs shadow-md">
                <MessageSquare size={16} /> Message
              </button>
              <a href={`tel:${agent?.phone || '555-0123'}`} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition-all text-xs">
                <Phone size={16} /> Call
              </a>
              <a href={`mailto:${agent?.email}`} className="col-span-2 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl border border-slate-100 transition-all text-xs">
                <Mail size={16} /> Send Email
              </a>
            </div>
          </div>

          {/* DOCUMENTS WIDGET */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" /> Recent Vault Items
              </h2>
              <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {(user.documents || []).length > 0 ? (
                (user.documents || []).slice(0, 3).map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 group cursor-pointer p-2 hover:bg-slate-50 rounded-2xl transition-all">
                    <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Added {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <button className="text-slate-300 hover:text-slate-600">
                      <Download size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium italic">Vault is empty.</p>
                  <button className="mt-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">+ Upload Doc</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectSummaryCard: React.FC<{ 
  project: Project; 
  isAdmin?: boolean; 
  onEdit?: () => void;
}> = ({ project, isAdmin, onEdit }) => {
  const statusColors = {
    [ProjectStatus.ACTIVE]: 'bg-blue-50 text-blue-600 border-blue-100',
    [ProjectStatus.UNDER_CONTRACT]: 'bg-amber-50 text-amber-600 border-amber-100',
    [ProjectStatus.SOLD]: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    [ProjectStatus.DRAFT]: 'bg-slate-50 text-slate-600 border-slate-100',
    [ProjectStatus.ARCHIVED]: 'bg-slate-200 text-slate-700 border-slate-200',
  };

  const coverImage = project.coverImageId 
    ? projectService.getImagePreview(project.coverImageId)
    : project.property?.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

  return (
    <div className="group relative">
      <Link to={`/projects/${project.id}`} className="block">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group-hover:shadow-md transition-all group-hover:-translate-y-1">
          <div className="relative h-44">
            <img 
              src={coverImage} 
              alt={project.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
            <div className="absolute top-4 left-4">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border shadow-sm ${statusColors[project.status] || 'bg-slate-50'}`}>
                {(project.status || 'ACTIVE').replace('_', ' ')}
              </span>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-bold text-base drop-shadow-md truncate">{project.title}</p>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-1 text-slate-400 text-[10px] mb-3 font-medium uppercase tracking-widest">
              <MapPin size={12} className="text-blue-500" />
              <span className="truncate">{project.property?.address}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
              <p className="font-bold text-slate-900">${(project.property?.price || 0).toLocaleString()}</p>
              <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                Manage <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </Link>
      
      {isAdmin && onEdit && (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-xl text-slate-600 hover:text-blue-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <Edit2 size={16} />
        </button>
      )}
    </div>
  );
};

export default Dashboard;
