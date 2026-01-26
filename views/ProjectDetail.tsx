import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  Circle, 
  Plus, 
  Bot,
  FileText,
  User as UserIcon,
  MessageSquare,
  Sparkles,
  ClipboardList,
  History,
  Signature as SignatureIcon,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
  Eye,
  ExternalLink,
  Map as MapIcon,
  Loader2,
  Download,
  Library,
  ChevronRight,
  Send,
  UserPlus,
  Users as UsersGroupIcon,
  Edit2,
  Image as ImageIcon
} from 'lucide-react';
import { Project, User, UserRole, Contract, ContractStatus, ContractTemplate, Message, TaskTemplate, ProjectTask, RequiredDocument } from '../types';
import { documentService } from '../services/documentService';
import { GeminiService, GroundingLink } from '../services/geminiService';
import { MOCK_USERS } from '../constants';
import SignaturePad from '../components/SignaturePad';
import DocumentViewer from '../components/DocumentViewer3';
import { downloadContractPDF } from '../utils/pdfGenerator';
import { projectService, databases, DATABASE_ID, COLLECTIONS, client, inviteService } from '../services/appwrite';
import { ID, Query } from 'appwrite';
import { useSettings } from '../utils/useSettings';
import AddressAutocomplete from '../components/AddressAutocomplete';

interface ProjectDetailProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  templates: ContractTemplate[];
  user: User;
  allUsers: User[];
  onRefresh?: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projects, setProjects, contracts, setContracts, templates, user, allUsers, onRefresh }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === id);
  const projectContracts = contracts.filter(c => c.projectId === id);
  const isAdmin = user.role === UserRole.ADMIN;
  
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'contracts' | 'messages' | 'team' | 'documents'>('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [locationInsights, setLocationInsights] = useState<{ text: string, links: GroundingLink[] } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  
  const { googleApiKey } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectAddress, setProjectAddress] = useState(project?.property?.address || '');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectDocs, setProjectDocs] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadingForUserId, setUploadingForUserId] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);

  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerDownloadUrl, setViewerDownloadUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<string | null>(null);
  const [inlinePreviewDoc, setInlinePreviewDoc] = useState<any | null>(null);

  const handleInlinePreview = async (provided: any) => {
    try {
      let fileId = provided?.fileId;
      let documentType = provided?.documentType;
      let url = null;
      
      if (fileId) {
        // Always regenerate URL to ensure correct structure (preview vs view)
        url = await documentService.getFileUrl(fileId);
        
        // Also try to get metadata if documentType is missing
        if (!documentType) {
          try {
            const fileInfo = await documentService.getFile(fileId);
            documentType = fileInfo.mimeType;
          } catch (me) {
            console.warn('Could not fetch file metadata:', me);
          }
        }
      } else {
        url = provided?.url;
      }
      
      if (!url) return;

      setInlinePreviewDoc({ ...provided, url, documentType });
    } catch (e) {
      console.error('Error opening inline preview:', e);
    }
  };

  const handleOpenViewer = async (provided: any, title?: string) => {
    try {
      let fileId = provided?.fileId;
      let documentType = provided?.documentType;
      let url = null;
      
      if (fileId) {
        url = await documentService.getFileUrl(fileId);
        if (!documentType) {
          try {
            const fileInfo = await documentService.getFile(fileId);
            documentType = fileInfo.mimeType;
          } catch (me) {
            console.warn('Could not fetch file metadata:', me);
          }
        }
      } else {
        url = provided?.url;
      }
      
      if (!url) throw new Error('No URL available');

      // Generate normalized download URL if we have a fileId
      if (fileId) {
        let dl = documentService.getFileDownload(fileId);
        setViewerDownloadUrl(dl);
      } else {
        setViewerDownloadUrl(null);
      }

      setViewerError(null);
      setViewerUrl(url);
      setViewerType(documentType);
      setViewerTitle(title || provided?.name || 'Document');
    } catch (e) {
      console.error('Error opening viewer:', e);
      alert('Could not load document for viewing.');
    }
  };

  const handleCloseViewer = () => {
    setViewerUrl(null);
    setViewerTitle(null);
    setViewerError(null);
    setViewerDownloadUrl(null);
    setViewerType(null);
  };

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isTaskLibraryOpen, setIsTaskLibraryOpen] = useState(false);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [newTaskData, setNewTaskData] = useState<Partial<ProjectTask>>({
    title: '',
    description: '',
    category: 'GENERAL',
    dueDate: new Date().toISOString().split('T')[0],
    notifyAssignee: true,
    notifyAgentOnComplete: true
  });

  const fetchTaskTemplates = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES);
      setTaskTemplates(response.documents.map((doc: any) => ({
        id: doc.$id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        assigneeRoles: doc.assigneeRoles || [],
        notifyAssignee: doc.notifyAssignee,
        notifyAgentOnComplete: doc.notifyAgentOnComplete
      })));
    } catch (error) {
      console.error('Error fetching task templates:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTaskTemplates();
      fetchGlobalRequirements();
    }
  }, [id, isAdmin]);

  const fetchGlobalRequirements = async () => {
    try {
      const res = await documentService.listRequired();
      setRequiredDocs(res.documents as any);
    } catch (e) {
      console.error('Error fetching global requirements:', e);
    }
  };

  const projectStatusData = React.useMemo(() => {
    if (!project) return { tasks: [], docs: [] };
    
    const participants = [
      { role: 'SELLER' as UserRole, id: project.sellerId },
      { role: 'BUYER' as UserRole, id: project.buyerId }
    ];

    const tasks: any[] = [];
    const docsFound: any[] = [];

    participants.forEach(p => {
      if (!p.id) return;
      const profile = allUsers.find(u => u.id === p.id);
      if (profile) {
        const pTasks = profile.assignedTasks || [];
        // Show tasks that match this project OR have no projectId (fallback for legacy)
        pTasks.filter(t => t.projectId === id || !t.projectId).forEach(t => {
          const template = taskTemplates.find(tpl => tpl.id === t.taskId);
          tasks.push({ 
            ...t, 
            id: t.taskId, // Use taskId as key
            title: template?.title || t.taskId, 
            description: template?.description,
            role: p.role, 
            user: profile,
            userName: profile.name // Add name for the UI
          });
        });

        const pDocs = profile.userDocuments || [];
        pDocs.forEach(d => {
          docsFound.push({ ...d, role: p.role, user: profile });
        });
      }
    });

    const combinedDocs = requiredDocs
      .map(rd => {
        const template = taskTemplates.find(tpl => tpl.id === rd.taskId);
        const roles = template?.assigneeRoles || [];
        
        const participantsData = roles.map(role => {
          const u = allUsers.find(user => 
            (role === UserRole.SELLER && user.id === project.sellerId) || 
            (role === UserRole.BUYER && user.id === project.buyerId)
          );
          const log = docsFound.find(df => df.documentRequirementId === rd.id && df.user.id === u?.id);
          return { role, user: u, isProvided: !!log, url: log?.url, providedAt: log?.uploadedAt };
        });
        return { ...rd, participants: participantsData };
      });

    return { tasks, docs: combinedDocs };
  }, [allUsers, project, id, isAdmin, requiredDocs, taskTemplates]);

  const handleSyncDocs = async () => {
    setIsSyncing(true);
    try {
      await documentService.syncProjectRequirements(id!, 'MANUAL');
      onRefresh?.();
      alert('Missing document requirements synced successfully.');
    } catch (error) {
      console.error('Error syncing documents:', error);
      alert('Failed to sync document requirements');
    } finally {
      setIsSyncing(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingDocId && uploadingForUserId) {
      handleFileUpload(uploadingForUserId, uploadingDocId, file);
      setUploadingDocId(null);
      setUploadingForUserId(null);
    }
  };

  const handleFileUpload = async (uid: string, rDocId: string, file: File) => {
    try {
      setIsProcessing(true);
      await documentService.uploadDocument(uid, rDocId, id!, file);
      onRefresh?.();
      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveDoc = async (uid: string, docId: string) => {
    if (!window.confirm('Approve this document?')) return;
    try {
      await documentService.approveDocument(uid, docId);
      onRefresh?.();
    } catch (error) {
      console.error('Error approving document:', error);
    }
  };

  const handleRejectDoc = async (uid: string, docId: string) => {
    const reason = window.prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await documentService.rejectDocument(uid, docId);
      onRefresh?.();
    } catch (error) {
      console.error('Error rejecting document:', error);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!project) return;
    setIsProcessing(true);
    const formData = new FormData(e.currentTarget);
    const priceValue = formData.get('price') as string;

    try {
      let coverImageId = project.coverImageId || '';
      if (coverImage) {
        const upload = await projectService.uploadImage(coverImage);
        coverImageId = upload.$id;
      }

      const updates = {
        title: formData.get('title') as string,
        address: projectAddress,
        price: priceValue ? parseFloat(priceValue) : project.property.price,
        description: (formData.get('description') as string) || project.property.description,
        coverImageId: coverImageId,
        bedrooms: project.property.bedrooms,
        bathrooms: project.property.bathrooms,
        sqft: project.property.sqft,
      };

      await projectService.update(project.id, updates);
      setIsEditing(false);
      setCoverImage(null);
      alert('Project updated successfully!');
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating project:', error);
      alert(`Failed to update project: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  const gemini = new GeminiService();

  useEffect(() => {
    if (activeTab === 'messages') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, project?.messages]);

  useEffect(() => {
    if (id) {
      fetchMessages();
      
      const unsubscribe = client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`, response => {
        if (response.events.some(e => e.includes('create'))) {
          const payload = response.payload as any;
          if (payload.projectId === id) {
            setMessages(prev => {
              if (prev.some(m => m.id === payload.$id)) return prev;
              const newMessage: Message = {
                id: payload.$id,
                senderId: payload.senderId,
                text: payload.text,
                timestamp: payload.timestamp
              };
              return [...prev, newMessage];
            });
          }
        }
      });

      return () => unsubscribe();
    }
  }, [id]);

  const fetchMessages = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, [
        Query.equal('projectId', id!)
      ]);
      setMessages(response.documents.map((doc: any) => ({
        id: doc.$id,
        senderId: doc.senderId,
        text: doc.text,
        timestamp: doc.timestamp
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchInsights = async () => {
    setAiInsight('Thinking...');
    const result = await gemini.getProjectInsights(project);
    setAiInsight(result);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const msgData = {
        projectId: id,
        senderId: user.id,
        text: newMessage,
        timestamp: new Date().toISOString()
      };
      const response = await databases.createDocument(DATABASE_ID, COLLECTIONS.MESSAGES, ID.unique(), msgData);
      setMessages(prev => [...prev, {
        id: response.$id,
        senderId: response.senderId,
        text: response.text,
        timestamp: response.timestamp
      }]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const fetchLocationInsights = async () => {
    setIsLoadingLocation(true);
    let userLocation: { latitude: number, longitude: number } | undefined;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      userLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch (e) { console.warn("Could not get user location:", e); }
    const result = await gemini.getPropertyLocationInsights(project.property.address, userLocation);
    setLocationInsights(result);
    setIsLoadingLocation(false);
  };

  const handleGenerateContract = async (template?: ContractTemplate) => {
    if (!isAdmin) return;
    setIsGenerating(true);
    setShowTemplatePicker(false);
    try {
      const draftText = await gemini.generateContractDraft(project, seller!, buyer, template);
      const newContract: Contract = {
        id: `c-${Date.now()}`,
        projectId: project.id,
        title: template ? `${template.name} (${project.title})` : "New Sales Purchase Agreement (Draft)",
        content: draftText,
        status: ContractStatus.PENDING_SIGNATURE,
        assignees: [project.sellerId, ...(project.buyerId ? [project.buyerId] : [])],
        signedBy: [],
        createdAt: new Date().toISOString()
      };
      setContracts(prev => [...prev, newContract]);
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  const handleSignContract = (dataUrl: string) => {
    if (!signingContractId) return;
    setContracts(prev => prev.map(c => {
      if (c.id === signingContractId) {
        const updatedSignedBy = Array.from(new Set([...c.signedBy, user.id]));
        const allSigned = c.assignees.every(id => updatedSignedBy.includes(id));
        return {
          ...c,
          signedBy: updatedSignedBy,
          status: allSigned ? ContractStatus.SIGNED : c.status,
          signatureData: { ...(c.signatureData || {}), [user.id]: dataUrl }
        };
      }
      return c;
    }));
    setSigningContractId(null);
  };

  const toggleTask = (taskId: string) => {
    if (!isAdmin) return;
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) };
      }
      return p;
    }));
  };

  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!project || !id) return;

    try {
      const newTask: ProjectTask = {
        id: ID.unique(),
        title: newTaskData.title!,
        description: newTaskData.description || '',
        category: newTaskData.category as any,
        dueDate: newTaskData.dueDate!,
        completed: false,
        notifyAssignee: newTaskData.notifyAssignee,
        notifyAgentOnComplete: newTaskData.notifyAgentOnComplete
      };

      const updatedTasks = [...project.tasks, newTask];
      await projectService.update(id, { tasks: JSON.stringify(updatedTasks) });
      
      setProjects(prev => prev.map(p => p.id === id ? { ...p, tasks: updatedTasks } : p));
      setIsAddTaskModalOpen(false);
      setNewTaskData({
        title: '',
        description: '',
        category: 'General',
        dueDate: new Date().toISOString().split('T')[0],
        notifyAssignee: true,
        notifyAgentOnComplete: true
      });
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task');
    }
  };

  const addFromTemplate = async (template: TaskTemplate) => {
    if (!project || !id) return;

    try {
      const newTask: ProjectTask = {
        id: ID.unique(),
        title: template.title,
        description: template.description || '',
        category: template.category as any,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 days
        completed: false,
        notifyAssignee: template.notifyAssignee,
        notifyAgentOnComplete: template.notifyAgentOnComplete
      };

      const updatedTasks = [...project.tasks, newTask];
      await projectService.update(id, { tasks: JSON.stringify(updatedTasks) });
      
      setProjects(prev => prev.map(p => p.id === id ? { ...p, tasks: updatedTasks } : p));
      setIsTaskLibraryOpen(false);
    } catch (error) {
      console.error('Error adding task from template:', error);
      alert('Failed to add task from library');
    }
  };

  const assignUser = async (role: 'seller' | 'buyer', userId: string) => {
    if (!isAdmin || !id) return;
    try {
      const field = role === 'seller' ? 'sellerId' : 'buyerId';
      await projectService.update(id, { [field]: userId });
      
      setProjects(prev => prev.map(p => {
        if (p.id === project.id) {
          return role === 'seller' ? { ...p, sellerId: userId } : { ...p, buyerId: userId };
        }
        return p;
      }));
    } catch (error) {
      console.error('Error assigning user:', error);
      alert('Failed to assign user');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSending(true);
    try {
      await inviteService.create({
        email: inviteEmail.toLowerCase(),
        name: inviteName,
        role: inviteRole,
        projectId: id,
        invitedBy: user.id
      });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      alert(`Invitation sent to ${inviteEmail}`);
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  if (!project) return <div className="p-8 text-center">Project not found.</div>;

  const seller = allUsers.find(u => u.id === project.sellerId);
  const buyer = allUsers.find(u => u.id === project.buyerId);

  const currentCoverImage = project.coverImageId 
    ? projectService.getImagePreview(project.coverImageId)
    : project.property.images[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <input 
        type="file" 
        ref={docFileInputRef} 
        className="hidden" 
        onChange={onFileChange}
      />

      {signingContractId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <SignaturePad onSave={handleSignContract} onCancel={() => setSigningContractId(null)} />
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Edit Project</h2>
                <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateProject} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project Title</label>
                    <input name="title" defaultValue={project.title} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div className="col-span-2 text-center">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 text-left">Cover Image</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative cursor-pointer aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                    >
                      {coverImage ? (
                        <img src={URL.createObjectURL(coverImage)} className="w-full h-full object-cover" alt="Preview" />
                      ) : project.coverImageId ? (
                        <img src={projectService.getImagePreview(project.coverImageId)} className="w-full h-full object-cover" alt="Current" />
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
                      <input name="address" defaultValue={project.property.address} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Listing Price</label>
                    <input name="price" type="number" defaultValue={project.property.price} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                    <textarea name="description" defaultValue={project.property.description} className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none"></textarea>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={isProcessing} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50">
                    {isProcessing ? 'Saving Changes...' : 'Update Project'}
                  </button>
                </div>
              </form>
            </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Choose a Template</h3>
              <button onClick={() => setShowTemplatePicker(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
            </div>
            <div className="p-6 space-y-3">
              <button onClick={() => handleGenerateContract()} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group">
                <div className="text-left">
                  <p className="font-bold text-slate-900">Standard AI Scratchpad</p>
                  <p className="text-xs text-slate-500">Let Gemini generate a document from scratch.</p>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
              </button>
              {templates.map(tmpl => (
                <button key={tmpl.id} onClick={() => handleGenerateContract(tmpl)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Library size={18}/></div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">{tmpl.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Saved Agency Template</p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors">
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
            <div className="relative h-72">
              <img src={currentCoverImage} alt={project.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
                <div className="text-white">
                  <h1 className="text-3xl font-bold">{project.title}</h1>
                  <p className="flex items-center gap-2 mt-2 opacity-90"><MapPin size={16} /> {project.property.address}</p>
                </div>
                <div className="flex items-center gap-4">
                  {isAdmin && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 text-white hover:bg-white/20 transition-all"
                      title="Edit Project"
                    >
                      <Edit2 size={20} />
                    </button>
                  )}
                  <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-white">
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">List Price</p>
                    <p className="text-2xl font-bold">${project.property.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar">
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<ClipboardList size={18}/>} label="Overview" />
              {isAdmin && (
                <>
                  <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckCircle size={18}/>} label="Tasks" />
                  <TabButton active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} icon={<FileText size={18}/>} label="Documents" />
                </>
              )}
              <TabButton active={activeTab === 'contracts'} onClick={() => setActiveTab('contracts')} icon={<FileText size={18}/>} label="Contracts" />
              <TabButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={<MessageSquare size={18}/>} label="Chat" />
              {isAdmin && <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={<UsersGroupIcon size={18}/>} label="Team Management" />}
            </div>

            <div className="p-8">
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <FeatureBox icon={<Bed size={20}/>} value={project.property.bedrooms} label="Bedrooms" />
                    <FeatureBox icon={<Bath size={20}/>} value={project.property.bathrooms} label="Bathrooms" />
                    <FeatureBox icon={<Maximize size={20}/>} value={project.property.sqft} label="Square Feet" />
                    <FeatureBox icon={<History size={20}/>} value={project.status.replace('_', ' ')} label="Status" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Property Description</h3>
                    <p className="text-slate-600 leading-relaxed">{project.property.description}</p>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Project Progress</h3>
                    <div className="flex items-center justify-between relative">
                       <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 -z-0"></div>
                       {project.milestones.map((m, i) => (
                         <div key={m.id} className="relative z-10 flex flex-col items-center flex-1">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${m.achieved ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                             {m.achieved ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                           </div>
                           <p className={`text-[10px] font-bold uppercase mt-2 text-center tracking-tighter ${m.achieved ? 'text-emerald-600' : 'text-slate-400'}`}>{m.title}</p>
                           <p className="text-[9px] text-slate-400 mt-0.5">{m.date}</p>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-slate-100 pt-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2"><MapIcon className="text-blue-600" size={20} /><h3 className="text-lg font-bold text-slate-900">Neighborhood Insights</h3></div>
                      <button onClick={fetchLocationInsights} disabled={isLoadingLocation} className="text-sm font-bold text-blue-600 flex items-center gap-2 hover:underline disabled:opacity-50">
                        {isLoadingLocation && <Loader2 size={16} className="animate-spin" />}
                        {locationInsights ? 'Refresh Data' : 'Load Area Info'}
                      </button>
                    </div>
                    {locationInsights && (
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 animate-in fade-in slide-in-from-top-4">
                        <p className="text-slate-700 leading-relaxed prose prose-sm max-w-none mb-6 whitespace-pre-line">{locationInsights.text}</p>
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                          {locationInsights.links.map((link, idx) => (
                            <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"><MapPin size={12} /> {link.title}</a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Participant Tasks</h3>
                      <p className="text-xs text-slate-500">View tasks currently assigned to Buyer and Seller in their profiles.</p>
                    </div>
                  </div>
                  
                  <div className={`grid gap-6 ${inlinePreviewDoc ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {/* Tasks Columns */}
                    <div className={`${inlinePreviewDoc ? 'xl:col-span-1' : 'md:col-span-2'} grid grid-cols-1 gap-6 ${!inlinePreviewDoc && 'md:grid-cols-2'}`}>
                      {/* Column for Seller tasks */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700">Seller — <span className="text-sm font-medium text-slate-600">{(allUsers.find(u => u.id === project?.sellerId)?.name) || 'Unassigned'}</span></h4>
                        {projectStatusData.tasks.filter((t: any) => t.role === 'SELLER').length === 0 ? (
                          <div className="py-6 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">No tasks for seller.</div>
                        ) : (
                          projectStatusData.tasks.filter((t: any) => t.role === 'SELLER').map((t: any, idx: number) => (
                            <div key={`seller-${idx}`} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${t.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-100 opacity-70' : 'bg-white border-slate-200 shadow-sm'}`}>
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${t.status === 'COMPLETED' ? 'text-emerald-500 bg-emerald-100' : 'text-slate-300 bg-slate-100'}`}>
                                  {t.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-semibold truncate ${t.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{t.title}</p>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Assigned: {new Date(t.assignedAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {(() => {
                                  try {
                                    const rd = requiredDocs.find((r: any) => r.taskId === t.taskId);
                                    const userDocs = t.user?.userDocuments ? (typeof t.user.userDocuments === 'string' ? JSON.parse(t.user.userDocuments) : t.user.userDocuments) : [];
                                    const reqId = rd? (rd.$id || rd.id) : null;
                                    const provided = reqId ? userDocs.find((d: any) => d.documentRequirementId === reqId && (rd?.isGlobal || d.projectId === id)) : null;
                                    if (provided) {
                                      return (
                                        <button 
                                          onClick={() => handleInlinePreview(provided)} 
                                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${inlinePreviewDoc?.fileId === provided.fileId ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                          {inlinePreviewDoc?.fileId === provided.fileId ? 'Previewing' : 'View Document'}
                                        </button>
                                      );
                                    }
                                  } catch (e) {
                                    // ignore parse errors
                                  }
                                  return null;
                                })()}

                                {t.status === 'PENDING' ? (
                                  <button onClick={() => handleApproveDoc(t.user.id, t.taskId)} className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">Mark Complete</button>
                                ) : (
                                  <button onClick={() => handleRejectDoc(t.user.id, t.taskId)} className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-300 transition-colors">Revert</button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Column for Buyer tasks */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-700">Buyer — <span className="text-sm font-medium text-slate-600">{(allUsers.find(u => u.id === project?.buyerId)?.name) || 'Unassigned'}</span></h4>
                        {projectStatusData.tasks.filter((t: any) => t.role === 'BUYER').length === 0 ? (
                          <div className="py-6 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">No tasks for buyer.</div>
                        ) : (
                          projectStatusData.tasks.filter((t: any) => t.role === 'BUYER').map((t: any, idx: number) => (
                            <div key={`buyer-${idx}`} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${t.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-100 opacity-70' : 'bg-white border-slate-200 shadow-sm'}`}>
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${t.status === 'COMPLETED' ? 'text-emerald-500 bg-emerald-100' : 'text-slate-300 bg-slate-100'}`}>
                                  {t.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-semibold truncate ${t.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{t.title}</p>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Assigned: {new Date(t.assignedAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {(() => {
                                  try {
                                    const rd = requiredDocs.find((r: any) => r.taskId === t.taskId);
                                    const userDocs = t.user?.userDocuments ? (typeof t.user.userDocuments === 'string' ? JSON.parse(t.user.userDocuments) : t.user.userDocuments) : [];
                                    const reqId = rd? (rd.$id || rd.id) : null;
                                    const provided = reqId ? userDocs.find((d: any) => d.documentRequirementId === reqId && (rd?.isGlobal || d.projectId === id)) : null;
                                    if (provided) {
                                      return (
                                        <button 
                                          onClick={() => handleInlinePreview(provided)} 
                                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${inlinePreviewDoc?.fileId === provided.fileId ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                          {inlinePreviewDoc?.fileId === provided.fileId ? 'Previewing' : 'View Document'}
                                        </button>
                                      );
                                    }
                                  } catch (e) {
                                    // ignore parse errors
                                  }
                                  return null;
                                })()}

                                {t.status === 'PENDING' ? (
                                  <button onClick={() => handleApproveDoc(t.user.id, t.taskId)} className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">Mark Complete</button>
                                ) : (
                                  <button onClick={() => handleRejectDoc(t.user.id, t.taskId)} className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-300 transition-colors">Revert</button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Inline Preview Container */}
                    {inlinePreviewDoc && (
                      <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[600px] overflow-hidden sticky top-8 animate-in slide-in-from-right-4 duration-300">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Preview</p>
                            <h4 className="font-bold text-slate-900 truncate max-w-[200px] md:max-w-md">{inlinePreviewDoc.name || 'Document'}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                             <a 
                               href={documentService.getFileDownload(inlinePreviewDoc.fileId)} 
                               className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                               title="Download"
                               target="_blank" 
                               rel="noreferrer"
                             >
                                <Download size={20} />
                             </a>
                             <button 
                               onClick={() => setInlinePreviewDoc(null)}
                               className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                             >
                               <X size={20} />
                             </button>
                          </div>
                        </div>
                        <div className="flex-1 bg-slate-100 flex items-center justify-center p-4">
                          {(() => {
                            const url = inlinePreviewDoc.url;
                            const lowerUrl = url?.toLowerCase() || '';
                            const lowerName = inlinePreviewDoc.name?.toLowerCase() || '';
                            const lowerType = inlinePreviewDoc.documentType?.toLowerCase() || '';

                            const isPdf = lowerUrl.includes('.pdf') || lowerName.endsWith('.pdf') || lowerType.includes('pdf');
                            const isImg = !isPdf && (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) || lowerName.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) || lowerType.includes('image'));
                            
                            if (isImg) {
                              return <img src={url} alt={inlinePreviewDoc.name} className="max-w-full max-h-full object-contain shadow-lg rounded-lg" />;
                            } else if (isPdf) {
                              // Use <embed> or <object> instead of <iframe>
                              return <embed src={url} type="application/pdf" className="w-full h-full rounded-lg shadow-inner" />;
                            } else {
                              return (
                                <div className="text-center p-8">
                                  <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
                                  <p className="text-slate-600 font-medium mb-4">This file type cannot be previewed natively.</p>
                                  <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                                  >
                                    Open in new tab
                                  </a>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Closing Documents Audit</h3>
                      <p className="text-sm text-slate-500">Global requirements matched against participant profiles.</p>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={handleSyncDocs}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                        disabled={isSyncing}
                      >
                        {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Sync Missing Tasks
                      </button>
                    )}
                  </div>

                  <div className={`grid gap-6 ${inlinePreviewDoc ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'}`}>
                    <div className={inlinePreviewDoc ? 'xl:col-span-1' : 'w-full'}>
                      <div className="grid grid-cols-1 gap-4">
                        {projectStatusData.docs.length === 0 ? (
                          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                            <FileText size={40} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No document requirements found.</p>
                          </div>
                        ) : (
                          projectStatusData.docs.map(rd => (
                            <div key={rd.$id} className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-blue-200 transition-all space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                                    <FileText size={20} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{rd.name}</p>
                                    <p className="text-xs text-slate-500 line-clamp-1">{rd.description}</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                                {(rd as any).participants.map((p: any) => (
                                  <div key={p.role} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-1.5 rounded-lg ${p.isProvided ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                        {p.isProvided ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.role}</p>
                                        <p className="text-xs font-bold text-slate-700 truncate max-w-[60px]">{p.user?.name || 'Pending'}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      {p.isProvided ? (
                                        <button 
                                          onClick={() => handleInlinePreview({ url: p.url, name: rd.name, fileId: p.fileId })}
                                          className={`p-1.5 rounded-lg transition-colors ${inlinePreviewDoc?.url === p.url ? 'bg-blue-600 text-white' : 'hover:bg-blue-100 text-blue-600'}`}
                                          title="Preview"
                                        >
                                          <Eye size={16} />
                                        </button>
                                      ) : (
                                        isAdmin && p.user && (
                                          <button 
                                            onClick={() => {
                                              setUploadingDocId((rd as any).$id);
                                              setUploadingForUserId(p.user.id);
                                              docFileInputRef.current?.click();
                                            }}
                                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                            title="Upload for user"
                                          >
                                            <Plus size={16} />
                                          </button>
                                        )
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Inline Preview Container (Same logic as Tasks tab) */}
                    {inlinePreviewDoc && (
                      <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[600px] overflow-hidden sticky top-8 animate-in slide-in-from-right-4 duration-300">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Preview</p>
                            <h4 className="font-bold text-slate-900 truncate max-w-[200px] md:max-w-md">{inlinePreviewDoc.name || 'Document'}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                             <a 
                               href={documentService.getFileDownload(inlinePreviewDoc.fileId)} 
                               className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                               title="Download"
                               target="_blank" 
                               rel="noreferrer"
                             >
                                <Download size={20} />
                             </a>
                             <button 
                               onClick={() => setInlinePreviewDoc(null)}
                               className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                             >
                               <X size={20} />
                             </button>
                          </div>
                        </div>
                        <div className="flex-1 bg-slate-100 flex items-center justify-center p-4">
                          {(() => {
                            const url = inlinePreviewDoc.url;
                            const lowerUrl = url?.toLowerCase() || '';
                            const lowerName = inlinePreviewDoc.name?.toLowerCase() || '';
                            const lowerType = inlinePreviewDoc.documentType?.toLowerCase() || '';

                            const isPdf = lowerUrl.includes('.pdf') || lowerName.endsWith('.pdf') || lowerType.includes('pdf');
                            const isImg = !isPdf && (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) || lowerName.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) || lowerType.includes('image'));
                            
                            if (isImg) {
                              return <img src={url} alt={inlinePreviewDoc.name} className="max-w-full max-h-full object-contain shadow-lg rounded-lg" />;
                            } else if (isPdf) {
                              return <embed src={url} type="application/pdf" className="w-full h-full rounded-lg shadow-inner" />;
                            } else {
                              return (
                                <div className="text-center p-8">
                                  <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
                                  <p className="text-slate-600 font-medium mb-4">This file type cannot be previewed natively.</p>
                                  <a 
                                    href={url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                                  >
                                    Open in new tab
                                  </a>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'contracts' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Project Contracts</h3>
                    {isAdmin && (
                      <button onClick={() => setShowTemplatePicker(true)} disabled={isGenerating} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-slate-800 transition-all disabled:opacity-50">
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
                        AI Builder
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {projectContracts.map(contract => (
                      <div key={contract.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FileText size={20}/></div>
                            <h4 className="font-bold text-slate-900">{contract.title}</h4>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-2">{contract.content.substring(0, 150)}...</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                             {contract.status === ContractStatus.SIGNED ? <CheckCircle2 className="text-emerald-500" /> : <Clock className="text-amber-500" />}
                             <span className="text-[10px] font-bold mt-1 uppercase">{contract.status.replace('_', ' ')}</span>
                          </div>
                          <div className="h-10 w-[1px] bg-slate-100"></div>
                          <div className="flex flex-col gap-2">
                            {contract.assignees.includes(user.id) && !contract.signedBy.includes(user.id) && (
                              <button onClick={() => setSigningContractId(contract.id)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"><SignatureIcon size={14}/> Sign Now</button>
                            )}
                            <button onClick={() => downloadContractPDF(contract, project, allUsers)} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"><Download size={14}/> PDF</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {projectContracts.length === 0 && <p className="text-center py-12 text-slate-400 italic">No contracts generated yet.</p>}
                  </div>
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[60vh]">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                    {messages.map((msg) => {
                      const isMe = msg.senderId === user.id;
                      const sender = allUsers.find(u => u.id === msg.senderId);
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <img src={sender?.avatar} className="w-8 h-8 rounded-full shadow-sm" alt="" />
                            <div className={`p-3 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none'}`}>
                              <p className="text-[10px] font-bold opacity-70 mb-1">{sender?.name}</p>
                              {msg.text}
                              <p className="text-[9px] mt-2 opacity-50 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 flex gap-2">
                    <input 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button 
                      type="submit"
                      disabled={isSending}
                      className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'team' && isAdmin && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">Project Participants</h2>
                    <button 
                      onClick={() => setShowInviteModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <UserPlus size={18} /> Invite New
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Seller Management */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserIcon size={18}/> Seller</h3>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        {seller ? (
                          <div className="flex items-center gap-3">
                            <img src={seller.avatar} className="w-10 h-10 rounded-full" alt="" />
                            <div>
                              <Link to={`/profile/${seller.id}`} className="font-bold text-sm hover:text-blue-600 transition-colors">{seller.name}</Link>
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
                              <Link to={`/profile/${buyer.id}`} className="font-bold text-sm hover:text-blue-600 transition-colors">{buyer.name}</Link>
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
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Bot size={80}/></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-blue-400 mb-4"><Bot size={20} /><span className="font-bold uppercase tracking-wider text-xs">AI Project Insights</span></div>
              {aiInsight ? (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{aiInsight}</p>
                  <button onClick={() => setAiInsight(null)} className="mt-4 text-[10px] font-bold text-blue-400 hover:text-blue-300">REFRESH INSIGHTS</button>
                </div>
              ) : (
                <button onClick={fetchInsights} className="w-full py-3 bg-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-colors"><Sparkles size={16}/> Analyze Project</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 border-b border-slate-50 pb-4">Key Participants</h3>
            <ParticipantRow user={seller} role="Seller" isAdmin={isAdmin} />
            <ParticipantRow user={buyer} role="Buyer" isAdmin={isAdmin} />
            <ParticipantRow user={allUsers.find(u => u.id === project.managerId)} role="Manager" isAdmin={isAdmin} />
          </div>
        </div>
      </div>

        {/* Task Library Modal */}
      {(viewerUrl || viewerError) && (
        <DocumentViewer 
          url={viewerUrl} 
          downloadUrl={viewerDownloadUrl}
          documentType={viewerType}
          error={viewerError || undefined} 
          title={viewerTitle || undefined} 
          onClose={handleCloseViewer} 
        />
      )}
      {isTaskLibraryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Task Library</h3>
                <p className="text-xs text-slate-500">Pick from pre-set admin tasks</p>
              </div>
              <button onClick={() => setIsTaskLibraryOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-3">
              {taskTemplates.map(tmpl => (
                <button 
                  key={tmpl.id} 
                  onClick={() => addFromTemplate(tmpl)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-900">{tmpl.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{tmpl.description || tmpl.category}</p>
                  </div>
                  <Plus className="text-slate-300 group-hover:text-blue-500" size={18} />
                </button>
              ))}
              {taskTemplates.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic">No templates found. Go to Admin Tasks to add some.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">New Task</h3>
              <button onClick={() => setIsAddTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddTask} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Title</label>
                <input 
                  type="text" 
                  required
                  value={newTaskData.title}
                  onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="Schedule Inspection"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                <textarea 
                  value={newTaskData.description}
                  onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                    value={newTaskData.category}
                    onChange={e => setNewTaskData({...newTaskData, category: e.target.value as any})}
                  >
                    <option value="GENERAL">General</option>
                    <option value="LEGAL">Legal</option>
                    <option value="FINANCIAL">Financial</option>
                    <option value="INSPECTION">Inspection</option>
                    <option value="CLOSING">Closing</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Due Date</label>
                  <input 
                    type="date"
                    required
                    value={newTaskData.dueDate}
                    onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={newTaskData.notifyAssignee}
                    onChange={e => setNewTaskData({...newTaskData, notifyAssignee: e.target.checked})}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Notify assigned user</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={newTaskData.notifyAgentOnComplete}
                    onChange={e => setNewTaskData({...newTaskData, notifyAgentOnComplete: e.target.checked})}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Notify agent on completion</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddTaskModalOpen(false)} className="flex-1 px-4 py-2.5 font-bold text-slate-500">Cancel</button>
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Invite to Project</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSendInvite} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="participant@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'BUYER' | 'SELLER')}
                >
                  <option value="BUYER">Buyer</option>
                  <option value="SELLER">Seller</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 px-4 py-2.5 font-bold text-slate-500">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSending}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                >
                  {isSending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ParticipantRow: React.FC<{ user?: User, role: string, isAdmin?: boolean }> = ({ user, role, isAdmin }) => (
  <div className="flex items-center gap-3">
    <img src={user?.avatar} className="w-10 h-10 rounded-full border border-slate-100" alt="" />
    <div className="min-w-0">
      {isAdmin && user ? (
        <Link to={`/profile/${user.id}`} className="text-sm font-bold text-slate-900 truncate hover:text-blue-600 transition-colors">
          {user.name}
        </Link>
      ) : (
        <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Unassigned'}</p>
      )}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{role}</p>
    </div>
  </div>
);

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-8 py-5 text-sm font-bold border-b-2 transition-all shrink-0 ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
    {icon} {label}
  </button>
);

const FeatureBox: React.FC<{ icon: React.ReactNode, value: string | number, label: string }> = ({ icon, value, label }) => (
  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
    <div className="text-blue-600 mb-2">{icon}</div>
    <p className="text-lg font-bold text-slate-900">{value}</p>
    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
  </div>
);

export default ProjectDetail;
