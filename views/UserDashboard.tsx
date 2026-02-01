import {
  Bath,
  Bed,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Download,
  Edit3,
  Eye,
  FileSignature,
  FileText,
  FormInput,
  Home,
  Mail,
  Map,
  MessageSquare,
  Phone,
  Square,
  Upload,
  User as UserIcon,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminAgendaWidget from '../components/AdminAgendaWidget';
import DocumentViewer from '../components/DocumentViewer';
import FormRenderer from '../components/FormRenderer';
import SignaturePad from '../components/SignaturePad';
import { contractService, profileService, projectFormsService, projectService } from '../services/appwrite';
import { documentService } from '../services/documentService';
import type { Contract, FormSubmission, Project, TaskTemplate, User } from '../types';

interface UserDashboardProps {
  projects: Project[];
  user: User;
  allUsers: User[];
  taskTemplates?: TaskTemplate[];
  onRefresh?: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({
  projects = [],
  user,
  allUsers = [],
  taskTemplates = [],
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'contracts' | 'forms' | 'notifications' | 'timeline'>('overview');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [requiredDocs, setRequiredDocs] = useState<any[]>([]);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<FormSubmission | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string, title: string } | null>(null);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter to only projects where user is seller, buyer or manager
  const visibleProjects = (projects || []).filter(
    p => p.sellerId === user.id || p.buyerId === user.id ||
         p.sellerId === user.$id || p.buyerId === user.$id ||
         p.managerId === user.id || p.managerId === user.$id
  );

  // Focus on the first matching project for the personal dashboard
  const userProject = visibleProjects[0] || null;

  // Fetch additional data
  useEffect(() => {
    if (userProject) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [contractsRes, formsRes, reqDocsRes] = await Promise.all([
            contractService.listByProject(userProject.id),
            projectFormsService.listByProject(userProject.id),
            documentService.listDefinitions()
          ]);
          setContracts((contractsRes.documents as any) || []);
          setForms(formsRes.items || []);
          setRequiredDocs(reqDocsRes.documents);
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [userProject]);

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    const newStatus = currentStatus ? 'PENDING' : 'COMPLETED';
    const profileId = user.id || user.$id;
    if (!profileId) return;

    try {
      setLoading(true);
      await profileService.updateTaskStatus(profileId, taskId, newStatus);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to update task status:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerUpload = (taskId: string) => {
    setUploadingTaskId(taskId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !uploadingTaskId || !userProject) return;

    const profileId = user.id || user.$id;
    if (!profileId) return;

    const file = e.target.files[0];
    setLoading(true);
    try {
      // Find matching required doc definition
      const task = (user.assignedTasks || []).find(at => at.taskId === uploadingTaskId);
      const matchTitlePrefix = "Upload Document: ";
      const docTitle = task?.title?.replace(matchTitlePrefix, "");
      const reqDoc = requiredDocs.find(d => d.title === docTitle);

      const definitionId = reqDoc?.$id || 'general';

      await documentService.uploadDocument(profileId, definitionId, userProject.id, file);

      if (onRefresh) onRefresh();
      alert('Document uploaded successfully and task marked as completed!');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setLoading(false);
      setUploadingTaskId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSignContract = async (signatureData: string) => {
    if (!signingContract || (!user.id && !user.$id)) return;

    setLoading(true);
    try {
      await contractService.sign(signingContract.id, (user.id || user.$id)!, signatureData);
      setSigningContract(null);
      if (onRefresh) onRefresh();
      alert('Contract signed successfully!');
    } catch (err) {
      console.error('Signing failed:', err);
      alert('Failed to sign contract.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewForm = (_title: string) => {
    // Try to find the matching form in our list
    const matchingForm = forms.find(f =>
      f.title.toLowerCase().includes(_title.toLowerCase()) ||
      _title.toLowerCase().includes(f.title.toLowerCase())
    );

    if (matchingForm) {
      setSelectedForm(matchingForm);
    } else {
      setActiveTab('forms');
    }
  };

  // Get user's tasks for this project
  const userProjectTasks = userProject
    ? [
        // 1. Explicitly assigned tasks from user profile
        ...(user.assignedTasks || [])
        .filter((at: any) => !at.projectId || at.projectId === userProject.id || at.projectId === 'personal')
        .map((at: any) => {
          const template = taskTemplates.find(tpl => tpl.id === at.taskId);
          return {
            ...at,
            id: at.id || at.taskId || `task_${Math.random()}`,
            taskId: at.taskId,
            title: template?.title || at.title || at.taskId || 'Untitled Task',
            completed: at.status === 'COMPLETED',
            type: 'task',
            assignedAt: at.assignedAt || new Date().toISOString()
          };
        }),

        // 2. Forms assigned to the user
        ...forms
        .filter(f => (f.assignedToUserId === user.id || f.assignedToUserId === user.$id))
        .map(f => {
          let meta: any = {};
          try {
            meta = typeof f.meta === 'string' ? JSON.parse(f.meta) : (f.meta || {});
          } catch (e) {}

          const needsSeller = meta.needsSignatureFromSeller === true || meta.needsSignatureFromSeller === 'true' || meta.needSignatureFromSeller === true || meta.needSignatureFromSeller === 'true';
          const needsBuyer = meta.needsSignatureFromBuyer === true || meta.needsSignatureFromBuyer === 'true' || meta.needSignatureFromBuyer === true || meta.needSignatureFromBuyer === 'true';
          const signatures = meta.signatures || {};

          const userId = user.id || user.$id;
          const isUserSeller = userId && (userId === userProject?.sellerId || userId === userProject?.sellerId); // Adjusted for safety
          const isUserBuyer = userId && (userId === userProject?.buyerId || userId === userProject?.buyerId);

          const needsMySign = (isUserSeller && needsSeller) || (isUserBuyer && needsBuyer);
          const iSigned = !!(isUserSeller ? signatures.seller : isUserBuyer ? signatures.buyer : false);

          return {
            id: f.id,
            taskId: f.id,
            title: `Form: ${f.title}`,
            completed: f.status === 'submitted' || f.status === 'completed' || f.status === 'closed',
            type: 'form',
            data: f,
            assignedAt: f.createdAt,
            needsSignature: needsMySign && !iSigned
          };
        }),

        // 3. Contracts that the user is an assignee of
        ...contracts
        .filter(c => {
          const userId = user.id || user.$id;
          return userId && c.assignees && c.assignees.includes(userId);
        })
        .map(c => {
          const userId = (user.id || user.$id)!;
          const isSigned = c.signedBy && c.signedBy.includes(userId);

          return {
            id: c.id,
            taskId: c.id,
            title: `Contract: ${c.title}`,
            completed: isSigned,
            type: 'contract',
            data: c,
            assignedAt: c.createdAt,
            needsSignature: !isSigned && c.status === 'PENDING_SIGNATURE'
          };
        })
      ].sort((a, b) => {
        // Sort incomplete tasks to the top, then by date
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(b.assignedAt || 0).getTime() - new Date(a.assignedAt || 0).getTime();
      })
    : [];

  // Get user's documents
  const userDocuments = user.userDocuments || [];

  // Find the agent/manager
  const agent = userProject
    ? allUsers.find(u => u.id === userProject.managerId)
    : null;

  // Show "Not Assigned" state if no project
  if (!userProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
        <div className="bg-slate-100 p-8 rounded-full mb-6 text-slate-400 shadow-inner">
          <Building2 size={64} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Project Not Assigned</h1>
        <p className="text-slate-500 mt-2 max-w-sm">
          You aren't currently assigned to an active property project. Contact your agent to get started.
        </p>
      </div>
    );
  }

  // Calculate progress
  const completedTasks = userProjectTasks.filter((t: any) => t.completed).length;
  const totalTasks = userProjectTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 65;

  // Image slider functions
  const nextImage = () => {
    if (userProject.property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % userProject.property.images.length);
    }
  };

  const prevImage = () => {
    if (userProject.property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + userProject.property.images.length) % userProject.property.images.length);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Progress Widget */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <CheckCircle2 size={120} />
              </div>
              <div className="relative z-10">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Overall Sale Progress</p>
                <h2 className="text-4xl font-bold mb-6">
                  {progressPercent}% <span className="text-lg font-normal opacity-70">to completion</span>
                </h2>
                <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full shadow-sm transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="mt-6 flex gap-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-60">Status</p>
                    <p className="text-sm font-bold">{(userProject.status || '').replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-60">Property</p>
                    <p className="text-sm font-bold truncate max-w-[200px]">{userProject.title}</p>
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
                  {userProjectTasks.filter((t: any) => !t.completed).length} Pending
                </span>
              </div>
              <div className="p-6 space-y-3">
                {userProjectTasks.map((task: any) => {
                  const isDocTask = requiredDocs.some(rd => rd.taskId === (task.taskId || task.id));
                  const isFormTask = task.type === 'form' || task.title?.toLowerCase().includes('form');
                  const isContractTask = task.type === 'contract';

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        task.completed
                          ? 'bg-slate-50 border-slate-50 opacity-60'
                          : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={task.completed ? 'text-emerald-500' : 'text-slate-300'}>
                          {task.completed ? <CheckCircle size={22} /> : <Circle size={22} />}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-slate-500 font-medium">
                              {task.type === 'contract' ? 'Contract Assignment' : task.type === 'form' ? 'Assigned Form' : 'Task'} • {new Date(task.assignedAt || Date.now()).toLocaleDateString()}
                            </p>
                            {task.needsSignature && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                <FileSignature size={10} /> Needs Signature
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!task.completed && (
                          <>
                            {isDocTask && (
                              <button
                                onClick={() => triggerUpload(task.taskId || task.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                title="Upload Document"
                              >
                                <Upload size={18} />
                              </button>
                            )}
                            {isFormTask && (
                              <button
                                onClick={() => handleViewForm(task.title)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                title="Go to Form"
                              >
                                <FormInput size={18} />
                              </button>
                            )}
                            {isContractTask && (
                              <button
                                onClick={() => setSigningContract(task.data)}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                                title="Sign Contract"
                              >
                                <FileSignature size={18} />
                              </button>
                            )}
                          </>
                        )}
                        {task.type === 'task' && (
                          <button
                            onClick={() => handleToggleTask(task.taskId || task.id, task.completed)}
                            className={`p-2 rounded-xl transition-colors ${
                              task.completed ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'
                            }`}
                            title={task.completed ? "Mark incomplete" : "Mark complete"}
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                        {task.completed && (task.type === 'form' || task.type === 'contract') && (
                          <div className="p-2 text-emerald-500 bg-emerald-50 rounded-xl">
                            <CheckCircle size={18} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {userProjectTasks.length === 0 && (
                  <p className="text-center py-8 text-slate-400 italic">No tasks assigned for this project.</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-8">
            {/* Property Description */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Property Description</h2>
              <p className="text-slate-600 leading-relaxed">{userProject.property.description}</p>
            </div>

            {/* Property Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
                <Bed className="mx-auto text-slate-400 mb-2" size={24} />
                <p className="text-2xl font-bold text-slate-900">{userProject.property.bedrooms}</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Bedrooms</p>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
                <Bath className="mx-auto text-slate-400 mb-2" size={24} />
                <p className="text-2xl font-bold text-slate-900">{userProject.property.bathrooms}</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Bathrooms</p>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
                <Square className="mx-auto text-slate-400 mb-2" size={24} />
                <p className="text-2xl font-bold text-slate-900">{(userProject.property.sqft || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Sq Ft</p>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
                <CalendarDays className="mx-auto text-slate-400 mb-2" size={24} />
                <p className="text-2xl font-bold text-slate-900">2020</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Year Built</p>
              </div>
            </div>

            {/* Image Slider */}
            {userProject.property.images.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="relative h-96">
                  <img
                    src={projectService.getImagePreview(userProject.property.images[currentImageIndex] || '')}
                    alt="Property"
                    className="w-full h-full object-cover"
                  />
                  {userProject.property.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
                      >
                        <ChevronRight size={20} />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {userProject.property.images.map((_: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Map Placeholder */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Map className="text-slate-400" size={20} />
                <h3 className="text-lg font-bold text-slate-900">Location</h3>
              </div>
              <div className="bg-slate-100 rounded-2xl h-48 flex items-center justify-center">
                <p className="text-slate-500">Map integration coming soon</p>
              </div>
              <p className="text-sm text-slate-600 mt-4">{userProject.property.address}</p>
            </div>

            {/* Neighbourhood Info */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="text-slate-400" size={20} />
                <h3 className="text-lg font-bold text-slate-900">Neighbourhood</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">A+</p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Walk Score</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">Excellent</p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Schools</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">Low</p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Crime Rate</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'contracts':
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Contracts</h2>
            {contracts.length > 0 ? (
              contracts.map((contract: any) => (
                <div key={contract.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${contract.status === 'SIGNED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {contract.status === 'SIGNED' ? <CheckCircle2 size={24} /> : <FileSignature size={24} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{contract.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            contract.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {contract.status === 'SIGNED' ? 'Completed' : 'Signature Required'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                            CREATED {new Date(contract.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSigningContract(contract)}
                      className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"
                    >
                      <Eye size={16} /> Open Document
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-slate-400 italic">No contracts available.</p>
            )}
          </div>
        );

      case 'forms':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Project Forms</h2>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                  {forms.length} Total
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forms.length > 0 ? (
                forms.map((form: any) => {
                  let meta: any = {};
                  try {
                    meta = typeof form.meta === 'string' ? JSON.parse(form.meta) : (form.meta || {});
                  } catch (e) {}

                  const needsSeller = meta.needsSignatureFromSeller === true || meta.needsSignatureFromSeller === 'true' || meta.needSignatureFromSeller === true || meta.needSignatureFromSeller === 'true';
                  const needsBuyer = meta.needsSignatureFromBuyer === true || meta.needsSignatureFromBuyer === 'true' || meta.needSignatureFromBuyer === true || meta.needSignatureFromBuyer === 'true';
                  const signatures = meta.signatures || {};
                  const isSellerSigned = !!signatures.seller;
                  const isBuyerSigned = !!signatures.buyer;

                  // Determine display status based on user requirements
                  let displayStatus = form.status;
                  let statusColor = "bg-slate-50 text-slate-600";

                  if (form.status === 'assigned') {
                    displayStatus = 'assigned';
                    statusColor = "bg-amber-50 text-amber-600";
                  } else if (form.status === 'submitted') {
                    const missingSeller = needsSeller && !isSellerSigned;
                    const missingBuyer = needsBuyer && !isBuyerSigned;

                    if (missingSeller && missingBuyer) {
                      displayStatus = 'submitted/waiting for signature';
                      statusColor = "bg-indigo-50 text-indigo-600";
                    } else if (missingSeller) {
                      displayStatus = 'waiting for seller signature';
                      statusColor = "bg-indigo-50 text-indigo-600";
                    } else if (missingBuyer) {
                      displayStatus = 'waiting for buyer signature';
                      statusColor = "bg-indigo-50 text-indigo-600";
                    } else {
                      displayStatus = 'submitted';
                      statusColor = "bg-emerald-50 text-emerald-600";
                    }
                  } else if (form.status === 'completed') {
                    displayStatus = 'completed';
                    statusColor = "bg-emerald-50 text-emerald-600";
                  }

                  return (
                    <div key={form.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 group hover:border-blue-100 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="bg-blue-50 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <FormInput size={20} />
                          </div>
                          <h3 className="font-bold text-slate-900 text-lg mb-1">{form.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${statusColor}`}>
                              {displayStatus}
                            </span>

                            {needsSeller && (
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                                isSellerSigned ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                              }`}>
                                {isSellerSigned ? <CheckCircle2 size={10} /> : <Clock size={10} />} Seller Sign
                              </span>
                            )}

                            {needsBuyer && (
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                                isBuyerSigned ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                              }`}>
                                {isBuyerSigned ? <CheckCircle2 size={10} /> : <Clock size={10} />} Buyer Sign
                              </span>
                            )}

                            <span className="text-[10px] text-slate-400 font-medium ml-auto">
                              {new Date(form.updatedAt || form.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {form.status === 'submitted' || form.status === 'completed' || form.status === 'closed' ? (
                          <button
                            onClick={() => setSelectedForm(form)}
                            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all text-xs"
                          >
                            <Eye size={14} /> View Response
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedForm(form)}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all text-xs shadow-md shadow-blue-500/10"
                          >
                            <Edit3 size={14} /> Fill Out Form
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <FormInput size={32} />
                  </div>
                  <h3 className="text-slate-900 font-bold">No Forms Yet</h3>
                  <p className="text-slate-500 text-sm mt-1">Your agent hasn't shared any forms for this project.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'notifications':
        // Compile dynamic activity feed for the user
        const activities = [
          // 1. Forms
          ...forms.map(f => {
            const submitter = allUsers.find(u => u.id === f.submittedByUserId || u.$id === f.submittedByUserId);
            const userName = submitter?.id === user.id || submitter?.$id === user.$id ? 'You' : (submitter?.name || 'Someone');

            let meta: any = {};
            try { meta = typeof f.meta === 'string' ? JSON.parse(f.meta) : (f.meta || {}); } catch(e){}

            const isSigned = f.status === 'completed';
            const text = isSigned
              ? `${userName} signed ${f.title}`
              : `${userName} submitted a new ${f.title}`;

            return {
              id: f.id,
              type: 'form',
              text,
              submission: f,
              date: f.updatedAt || f.createdAt,
              icon: <FileSignature size={20} className="text-indigo-500" />
            };
          }),

          // 2. Documents
          ...userDocuments
            .filter(d => d.projectId === userProject.id)
            .map(d => ({
              id: d.fileId,
              type: 'document',
              text: `You uploaded document ${d.name}`,
              url: d.url,
              name: d.name,
              date: d.uploadedAt || new Date().toISOString(),
              icon: <FileText size={20} className="text-blue-500" />
            })),

          // 3. Static messages from project (legacy)
          ...(userProject.messages || []).map((m: any) => ({
            id: m.id || Math.random().toString(),
            type: 'message',
            text: m.text,
            date: m.timestamp || new Date().toISOString(),
            icon: <Bell size={20} className="text-slate-400" />
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Property Activity</h2>
            {activities.length > 0 ? (
              activities.map((activity: any) => (
                <div
                  key={activity.id}
                  onClick={() => {
                    if (activity.type === 'form') setSelectedForm(activity.submission);
                    if (activity.type === 'document') setSelectedDocument({ url: activity.url, title: activity.name });
                  }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 group hover:border-blue-100 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{activity.icon}</div>
                    <div>
                      <p className="text-slate-900 font-medium group-hover:text-blue-600 transition-colors">{activity.text}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(activity.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-slate-400 italic">No activity recorded yet.</p>
            )}
          </div>
        );

      case 'timeline':
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Deal Timeline</h2>
            {userProject.milestones && userProject.milestones.length > 0 ? (
              userProject.milestones.map((milestone: any) => (
                <div key={milestone.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{milestone.title}</h3>
                      <p className="text-sm text-slate-500">
                        {new Date(milestone.date || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    {milestone.achieved ? (
                      <CheckCircle className="text-emerald-500" size={24} />
                    ) : (
                      <Clock className="text-slate-400" size={24} />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-slate-400 italic">No milestones available.</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Top Section: Property Address, Price, Thumbnail */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{userProject.property.address}</h1>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              ${(userProject.property.price || 0).toLocaleString()}
            </p>
          </div>
          {userProject.property.images.length > 0 && (
            <div className="w-32 h-24 rounded-2xl overflow-hidden shadow-lg">
              <img
                src={projectService.getImagePreview(userProject.property.images[0] || '')}
                alt="Property"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Menu */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Home },
            { id: 'details', label: 'Property Details', icon: Building2 },
            { id: 'contracts', label: 'Contracts', icon: FileSignature },
            { id: 'forms', label: 'Forms', icon: FormInput },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'timeline', label: 'Timeline', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Content Container */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            renderContent()
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          {/* Agent Details */}
          {agent && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-center gap-2">
                <UserIcon size={18} className="text-blue-600" /> Your Dedicated Agent
              </h2>
              <div className="relative mb-4 inline-block">
                <img
                  src={agent.avatar || ''}
                  className="w-24 h-24 rounded-3xl border-4 border-white shadow-xl object-cover"
                  alt={agent.name}
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <h3 className="font-bold text-slate-900 text-xl">{agent.name}</h3>
              <p className="text-xs text-slate-500 mb-8 font-medium">Real Estate Advisor • EstateFlow Agency</p>

              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-all text-xs shadow-md">
                  <MessageSquare size={16} /> Message
                </button>
                <a
                  href={`tel:${agent.phone || '555-0123'}`}
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition-all text-xs"
                >
                  <Phone size={16} /> Call
                </a>
                <a
                  href={`mailto:${agent.email || ''}`}
                  className="col-span-2 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl border border-slate-100 transition-all text-xs"
                >
                  <Mail size={16} /> Send Email
                </a>
              </div>
            </div>
          )}

          {/* Agenda Widget */}
          <AdminAgendaWidget projects={[userProject]} />

          {/* DOCUMENTS WIDGET */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" /> Recent Vault Items
              </h2>
              <Link to="/documents" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {userDocuments.length > 0 ? (
                userDocuments.slice(0, 3).map((doc: any) => (
                  <div
                    key={doc.fileId}
                    className="flex items-center gap-3 group cursor-pointer p-2 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Added {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}
                        </p>
                    </div>
                    <button className="text-slate-300 hover:text-slate-600">
                      <Download size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium italic">Vault is empty.</p>
                  <button className="mt-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                    + Upload Doc
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shared Overlays */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      />

      {selectedForm && (
        <FormRenderer
          submission={selectedForm}
          onClose={() => setSelectedForm(null)}
          onUpdate={() => {
            setSelectedForm(null);
            if (onRefresh) onRefresh();
          }}
          user={user}
          allUsers={allUsers}
          project={userProject}
          readOnly={selectedForm.status === 'submitted' || selectedForm.status === 'completed' || selectedForm.status === 'closed'}
        />
      )}

      {selectedDocument && (
        <DocumentViewer
          url={selectedDocument.url}
          title={selectedDocument.title}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {/* Signature & Reading Modal */}
      {signingContract && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{signingContract.title}</h3>
                <p className="text-xs text-slate-500">Please review the document carefully before signing.</p>
              </div>
              <button
                onClick={() => setSigningContract(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-slate-50/50">
              <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-8 md:p-12 min-h-full">
                <div className="max-w-prose mx-auto">
                  <div
                    className="prose prose-slate max-w-none font-serif text-slate-800 text-lg leading-relaxed break-words overflow-hidden"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    dangerouslySetInnerHTML={{ __html: signingContract.content }}
                  />

                  {signingContract.signedBy && signingContract.signedBy.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Signatures</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {signingContract.signedBy.map((signerId: string) => {
                          const signer = allUsers.find(u => u.id === signerId || u.$id === signerId);
                          const sigData = signingContract.signatureData && (signingContract.signatureData as any)[signerId];
                          return (
                            <div key={signerId} className="space-y-2">
                              {sigData ? (
                                <img src={sigData} alt={`Signature of ${signer?.name}`} className="h-16 object-contain" />
                              ) : (
                                <div className="h-16 flex items-center text-slate-400 italic text-sm">Signed (Image missing)</div>
                              )}
                              <p className="text-xs font-medium text-slate-600 border-t border-slate-100 pt-1">
                                {signer?.name || 'Unknown Signer'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex flex-col md:flex-row items-center justify-center gap-8">
              {!signingContract.signedBy?.includes((user.id || user.$id)!) ? (
                <div className="w-full flex flex-col items-center gap-4">
                  <div className="w-full max-w-lg">
                    <p className="text-sm font-bold text-center text-slate-400 uppercase tracking-widest mb-4">Draw your signature below</p>
                    <SignaturePad
                      onSave={handleSignContract}
                      onCancel={() => setSigningContract(null)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-900">Document Signed</p>
                    <p className="text-sm text-slate-500">You have already signed this contract.</p>
                  </div>
                  <button
                    onClick={() => setSigningContract(null)}
                    className="mt-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
                  >
                    Close Viewer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;

