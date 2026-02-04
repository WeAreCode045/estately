import {
    ArrowRight,
    Bell,
    Building2,
    CheckCircle2,
    ClipboardList,
    Clock,
    Edit2,
    FileText,
    Image as ImageIcon,
    Plus,
    TrendingUp,
    X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AddressAutocomplete from '../components/AddressAutocomplete';
import AdminAgendaWidget from '../components/AdminAgendaWidget';
import AdminStatsGrid from '../components/AdminStatsGrid';
import AdminTasksWidget from '../components/AdminTasksWidget';
import DocumentViewer from '../components/DocumentViewer';
import FormRenderer from '../components/FormRenderer';
import { COLLECTIONS, DATABASE_ID, databases, projectService, Query } from '../services/appwrite';
import { contractTemplatesService } from '../services/contractTemplatesService';
import { documentService } from '../services/documentService';
import { projectFormsService } from '../services/projectFormsService';
import type { FormSubmission, Project, TaskTemplate, User } from '../types';
import { ProjectStatus } from '../types';
import { useSettings } from '../utils/useSettings';

interface AdminDashboardProps {
  projects: Project[];
  user: User;
  allUsers: User[];
  taskTemplates?: TaskTemplate[];
  onRefresh?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  projects = [],
  user,
  allUsers = [],
  taskTemplates = [],
  onRefresh
}) => {
  const { googleApiKey } = useSettings();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectAddress, setProjectAddress] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<FormSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string, title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_FORMS, [
          Query.limit(50),
          Query.orderDesc('$createdAt')
        ]);
        const items = res.documents.map((d: any) => ({
          id: d.$id,
          projectId: d.projectId,
          formKey: d.formKey,
          title: d.title || '',
          data: d.data ? (typeof d.data === 'string' ? JSON.parse(d.data) : d.data) : {},
          attachments: d.attachments ? (typeof d.attachments === 'string' ? JSON.parse(d.attachments) : d.attachments) : [],
          submittedByUserId: d.submittedByUserId,
          assignedToUserId: d.assignedToUserId || null,
          status: d.status,
          createdAt: d.$createdAt,
          updatedAt: d.$updatedAt,
          meta: d.meta ? (typeof d.meta === 'string' ? JSON.parse(d.meta) : d.meta) : undefined,
        }));
        setRecentSubmissions(items);
      } catch (err) {
        console.error('Error fetching submissions:', err);
      }
    };
    fetchSubmissions();
  }, []);

  const visibleProjects = [...projects].sort((a, b) => {
    // Sort by creation date descending
    const dateA = new Date((a as any).$createdAt || 0).getTime();
    const dateB = new Date((b as any).$createdAt || 0).getTime();
    return dateB - dateA;
  });

  const recentProjects = visibleProjects.slice(0, 5);

  // Compile notifications
  const notifications = [
    // 1. Completed Forms
    ...recentSubmissions
      .filter(s => s.status === 'completed' || s.status === 'submitted')
      .map(s => {
        const project = projects.find(p => p.id === s.projectId);
        const submitter = allUsers.find(u => u.id === s.submittedByUserId || u.$id === s.submittedByUserId);

        // Format title as "[username] signed [formname]" or "[username] submitted a new [formname]"
        const userName = submitter?.name || 'Unknown User';
        const formName = s.title || s.formKey;
        const descriptiveTitle = s.status === 'completed'
          ? `${userName} signed ${formName}`
          : `${userName} submitted a new ${formName}`;

        return {
          id: s.id,
          type: 'form',
          title: descriptiveTitle,
          userName,
          date: s.updatedAt || s.createdAt,
          projectName: project?.title || 'Unknown Project',
          projectId: s.projectId,
          link: `/projects/${s.projectId}?tab=forms&submission=${s.id}`,
          isExternal: false,
          rawSubmission: s,
          project,
          icon: <ClipboardList className="text-indigo-500" size={16} />
        };
      }),

    // 2. Completed Generic Tasks
    ...allUsers.flatMap(u => (u.assignedTasks || [])
      .filter((t: any) => t.status === 'COMPLETED' && t.projectId && t.projectId !== 'personal')
      .map((t: any) => {
        const project = projects.find(p => p.id === t.projectId);
        return {
          id: `${u.id}_${t.taskId}_${t.completedAt}`,
          type: 'task',
          title: `${u.name} completed task: ${t.title || t.taskId}`,
          userName: u.name,
          date: t.completedAt || new Date().toISOString(),
          projectName: project?.title || 'Unknown Project',
          projectId: t.projectId,
          link: `/projects/${t.projectId}`,
          isExternal: false,
          icon: <CheckCircle2 className="text-emerald-500" size={16} />
        };
      })
    ),

    // 3. Uploaded Documents
    ...allUsers.flatMap(u => (u.userDocuments || [])
      .filter((d: any) => d.projectId && d.projectId !== 'personal')
      .map((d: any) => {
        const project = projects.find(p => p.id === d.projectId);
        return {
            id: d.fileId,
            type: 'document',
            title: `${u.name} uploaded document ${d.name}`,
            userName: u.name,
            date: d.uploadedAt || new Date().toISOString(),
            projectName: project?.title || 'Unknown Project',
            projectId: d.projectId,
            link: d.url,
            isExternal: true,
            icon: <FileText className="text-blue-500" size={16} />
        };
      })
    )
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .slice(0, 15); // Show last 15 notifications

  const stats = [
    {
      label: 'Active Projects',
      value: visibleProjects.filter(p => p.status === ProjectStatus.ACTIVE).length,
      icon: <Building2 className="text-blue-600" />,
      color: 'bg-blue-50'
    },
    {
      label: 'Under Contract',
      value: visibleProjects.filter(p => p.status === ProjectStatus.UNDER_CONTRACT).length,
      icon: <Clock className="text-amber-600" />,
      color: 'bg-amber-50'
    },
    {
      label: 'Completed Sales',
      value: visibleProjects.filter(p => p.status === ProjectStatus.SOLD).length,
      icon: <CheckCircle2 className="text-emerald-600" />,
      color: 'bg-emerald-50'
    },
    {
      label: 'Portfolio Value',
      value: `€${((visibleProjects.reduce((acc, p) => acc + (p.property?.price || 0), 0)) / 1000000).toFixed(1)}M`,
      icon: <TrendingUp className="text-indigo-600" />,
      color: 'bg-indigo-50'
    },
  ];

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
        coverImageId,
        bedrooms: parseInt(formData.get('bedrooms') as string) || 0,
        bathrooms: parseInt(formData.get('bathrooms') as string) || 0,
        sqft: parseInt(formData.get('sqft') as string) || 0,
        livingArea: parseInt(formData.get('livingArea') as string) || 0,
        garages: parseInt(formData.get('garages') as string) || 0,
        buildYear: parseInt(formData.get('buildYear') as string) || null,
        handover_date: formData.get('handover_date') ? new Date(formData.get('handover_date') as string).toISOString() : null
      };

      const newProject = await projectService.create(data);

      try {
        await documentService.syncProjectRequirements(newProject.$id, 'PROJECT_CREATION');
      } catch (syncError) {
        console.error('Error syncing initial document requirements:', syncError);
      }

      try {
        await projectFormsService.autoProvisionForms(newProject.$id, {
          ...data,
          id: newProject.$id
        });
      } catch (formError) {
        console.error('Error auto-provisioning forms:', formError);
      }

      try {
        await contractTemplatesService.autoProvisionContracts(newProject.$id, {
          ...data,
          id: newProject.$id
        });
      } catch (contractError) {
        console.error('Error auto-provisioning contracts:', contractError);
      }

      if (onRefresh) onRefresh();
      setShowNewProjectModal(false);
      setCoverImage(null);
      setProjectAddress('');
      alert('Project launched successfully!');
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
        coverImageId,
        bedrooms: parseInt(formData.get('bedrooms') as string) || 0,
        bathrooms: parseInt(formData.get('bathrooms') as string) || 0,
        sqft: parseInt(formData.get('sqft') as string) || 0,
        livingArea: parseInt(formData.get('livingArea') as string) || 0,
        garages: parseInt(formData.get('garages') as string) || 0,
        buildYear: parseInt(formData.get('buildYear') as string) || null,
        handover_date: formData.get('handover_date') ? new Date(formData.get('handover_date') as string).toISOString() : null
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
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

      {/* New Project Modal */}
      {showNewProjectModal && (
        <ProjectModal
          title="Create New Project"
          onClose={() => setShowNewProjectModal(false)}
          onSubmit={handleCreateProject}
          isProcessing={isProcessing}
          projectAddress={projectAddress}
          setProjectAddress={setProjectAddress}
          coverImage={coverImage}
          setCoverImage={setCoverImage}
          fileInputRef={fileInputRef}
          googleApiKey={googleApiKey}
          submitLabel="Launch Project"
        />
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <ProjectModal
          title="Edit Project"
          onClose={() => setEditingProject(null)}
          onSubmit={handleUpdateProject}
          isProcessing={isProcessing}
          projectAddress={projectAddress}
          setProjectAddress={setProjectAddress}
          coverImage={coverImage}
          setCoverImage={setCoverImage}
          fileInputRef={fileInputRef}
          googleApiKey={googleApiKey}
          submitLabel="Update Project"
          project={editingProject}
        />
      )}

      {/* Stats Grid */}
      <AdminStatsGrid stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        {/* Left Column: Projects List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="text-blue-600" size={20} /> Most Recent Projects
              </h2>
              <Link to="/projects" className="text-blue-600 text-xs font-extrabold uppercase tracking-widest flex items-center gap-1 hover:underline">
                View All Projects <ArrowRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-slate-50">
                {recentProjects.map((project) => (
                    <div key={project.id} className="p-4 hover:bg-slate-50/50 transition-all flex items-center justify-between gap-4 group">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                                {project.coverImageId ? (
                                    <img src={projectService.getImagePreview(project.coverImageId)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <Building2 size={24} />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{project.title}</h3>
                                <p className="text-xs text-slate-500 truncate">{project.property.address}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-xs font-bold text-slate-900">€{(project.property.price || 0).toLocaleString()}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                    project.status === ProjectStatus.ACTIVE ? 'bg-blue-50 text-blue-600' :
                                    project.status === ProjectStatus.UNDER_CONTRACT ? 'bg-amber-50 text-amber-600' :
                                    'bg-emerald-50 text-emerald-600'
                                }`}>
                                    {project.status.replace('_', ' ')}
                                </span>
                            </div>
                            <Link
                                to={`/projects/${project.id}`}
                                className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                            >
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                ))}

                {recentProjects.length === 0 && (
                    <div className="py-20 text-center text-slate-400 italic">
                        No projects launched yet.
                    </div>
                )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <Link to="/projects" className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest">
                    See More Projects
                </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AdminAgendaWidget projects={visibleProjects} />
            <AdminTasksWidget
                user={user}
                projects={visibleProjects}
                taskTemplates={taskTemplates}
            />
          </div>
        </div>

        {/* Right Column: Notifications Feed */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[800px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="text-amber-500" size={20} /> Activity Feed
              </h2>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
              {notifications.map((notif: any) => (
                <div key={notif.id} className="p-4 hover:bg-slate-50/50 transition-all flex items-start gap-3 group">
                  <div className="mt-1 p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-white group-hover:shadow-sm group-hover:text-blue-600 transition-all shrink-0">
                    {notif.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                        <button
                            onClick={() => {
                                if (notif.type === 'form') {
                                    setSelectedSubmission(notif.rawSubmission);
                                } else if (notif.type === 'document') {
                                    setSelectedDocument({ url: notif.link, title: notif.title });
                                } else {
                                    // Tasks still navigate for now or just do nothing
                                    window.location.href = notif.link;
                                }
                            }}
                            className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block text-left w-full"
                        >
                            {notif.title}
                        </button>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                            {new Date(notif.date).toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-xs text-slate-600">
                        <span className="font-bold text-slate-700">{notif.userName}</span> completed in <span className="font-medium text-slate-800">{notif.projectName}</span>
                    </p>
                  </div>
                </div>
              ))}

              {notifications.length === 0 && (
                  <div className="py-20 px-6 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <Bell size={24} />
                    </div>
                    <p className="text-xs text-slate-400 font-medium italic">No recent activity detected.</p>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedSubmission && (
        <FormRenderer
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onUpdate={() => {
              setSelectedSubmission(null);
              window.location.reload();
          }}
          user={user}
          allUsers={allUsers}
          project={projects.find(p => p.id === selectedSubmission.projectId)}
          readOnly={true}
        />
      )}

      {selectedDocument && (
        <DocumentViewer
          url={selectedDocument.url}
          title={selectedDocument.title}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
};

// Project Modal Component
interface ProjectModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isProcessing: boolean;
  projectAddress: string;
  setProjectAddress: (address: string) => void;
  coverImage: File | null;
  setCoverImage: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  googleApiKey: string | null;
  submitLabel: string;
  project?: Project;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  title,
  onClose,
  onSubmit,
  isProcessing,
  projectAddress,
  setProjectAddress,
  coverImage,
  setCoverImage,
  fileInputRef,
  googleApiKey,
  submitLabel,
  project
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Project Title
              </label>
              <input
                name="title"
                defaultValue={project?.title}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                placeholder="Sunset Valley Estate"
              />
            </div>

            <div className="col-span-2 text-center">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-left">
                Cover Image
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative cursor-pointer aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 hover:bg-blue-50/30 transition-all"
              >
                {coverImage ? (
                  <img src={URL.createObjectURL(coverImage)} className="w-full h-full object-cover" alt="Preview" />
                ) : project?.coverImageId ? (
                  <img src={projectService.getImagePreview(project.coverImageId)} className="w-full h-full object-cover" alt="Current" />
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <ImageIcon size={32} className="mb-2 opacity-50 group-hover:text-blue-500 transition-transform" />
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
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Property Address
              </label>
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
                <input
                  name="address"
                  defaultValue={project?.property?.address}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="123 Ocean Drive, Miami, FL"
                />
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Listing Price
              </label>
              <input
                name="price"
                type="number"
                defaultValue={project?.property?.price}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                placeholder="850000"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Handover Date
              </label>
              <input
                name="handover_date"
                type="date"
                defaultValue={project?.handover_date ? new Date(project.handover_date).toISOString().split('T')[0] : ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Bedrooms
              </label>
              <input
                name="bedrooms"
                type="number"
                defaultValue={project?.property?.bedrooms || 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Bathrooms
              </label>
              <input
                name="bathrooms"
                type="number"
                defaultValue={project?.property?.bathrooms || 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Sq Ft
              </label>
              <input
                name="sqft"
                type="number"
                defaultValue={project?.property?.sqft || 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Living Area (m²)
              </label>
              <input
                name="livingArea"
                type="number"
                defaultValue={project?.property?.livingArea || 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Garages
              </label>
              <input
                name="garages"
                type="number"
                defaultValue={project?.property?.garages || 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Build Year
              </label>
              <input
                name="buildYear"
                type="number"
                defaultValue={project?.property?.buildYear || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                placeholder="2020"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                defaultValue={project?.property?.description}
                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none"
                placeholder="Enter property highlights..."
              ></textarea>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;

