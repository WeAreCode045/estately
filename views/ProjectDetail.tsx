import { ID } from 'appwrite';
import {
  ArrowLeft,
  Bath,
  Bed,
  Bot,
  Calendar,
  Car,
  Check,
  CheckCircle,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  Download,
  Edit2,
  Eye,
  FileText,
  Globe,
  History,
  Home,
  Image as ImageIcon,
  Library,
  Loader2,
  Lock,
  Map as MapIcon,
  MapPin,
  Maximize2,
  MessageSquare,
  Phone,
  Plus,
  Shield,
  Signature as SignatureIcon,
  Sparkles,
  Square,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users as UsersGroupIcon,
  X,
  Zap
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AddressAutocomplete from '../components/AddressAutocomplete';
import DocumentViewer from '../components/DocumentViewer';
import FormEditor from '../components/FormEditor';
import FormRenderer from '../components/FormRenderer';
import SignaturePad from '../components/SignaturePad';
import { COLLECTIONS, DATABASE_ID, client, databases, inviteService, profileService, projectFormsService, projectService } from '../services/appwrite';
import { documentService } from '../services/documentService';
import { formDefinitionsService } from '../services/formDefinitionsService';
import type { GroundingLink } from '../services/geminiService';
import { GeminiService } from '../services/geminiService';
import type { Contract, ContractTemplate, FormDefinition, FormSubmission, Project, ProjectTask, TaskTemplate, User, UserDocumentDefinition } from '../types';
import { ContractStatus, UserRole } from '../types';
import { downloadContractPDF, downloadFormPDF } from '../utils/pdfGenerator';
import { useSettings } from '../utils/useSettings';

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-8 py-5 text-sm font-bold border-b-2 transition-all shrink-0 ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
    {icon} {label}
  </button>
);

interface ProjectDetailProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  templates: ContractTemplate[];
  user: User;
  allUsers: User[];
  onRefresh?: () => void;
  onSwitchUser?: (identifier: UserRole | string) => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projects, setProjects, contracts, setContracts, templates, user, allUsers, onRefresh, onSwitchUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === id);
  const projectContracts = contracts.filter(c => c.projectId === id);
  const isAdmin = user.role === UserRole.ADMIN;

    const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'documents' | 'property'>('overview');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const nextImage = () => {
      if (project?.property?.images && project.property.images.length > 0) {
        setCurrentImageIndex((prev) => (prev + 1) % (project?.property?.images?.length || 1));
      }
    };

    const prevImage = () => {
      if (project?.property?.images && project.property.images.length > 0) {
        const len = project.property.images.length;
        setCurrentImageIndex((prev) => (prev - 1 + len) % len);
      }
    };
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [locationInsights, setLocationInsights] = useState<{ text: string, links: GroundingLink[] } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { googleApiKey, defaultAgentId } = useSettings();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [showBulkSpecsModal, setShowBulkSpecsModal] = useState(false);
  const [showGeneralInfoModal, setShowGeneralInfoModal] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);


  const [forms, setForms] = useState<any[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [formDefinitions, setFormDefinitions] = useState<FormDefinition[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormDefinition | null>(null);
  const [isAssigningForm, setIsAssigningForm] = useState(false);
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showFormTemplatePicker, setShowFormTemplatePicker] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadingForUserId, setUploadingForUserId] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [requiredDocs, setRequiredDocs] = useState<UserDocumentDefinition[]>([]);

  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerDownloadUrl, setViewerDownloadUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<string | null>(null);
  const [viewerDocs, setViewerDocs] = useState<any[]>([]);

  useEffect(() => {
    if (signingContractId) {
      setShowSignaturePad(false);
    }
  }, [signingContractId]);

  const handleOpenViewer = async (provided: any | any[], title?: string) => {
    try {
        const items = Array.isArray(provided) ? provided : [provided];
        const docs = [];

        for (const item of items) {
            if (!item) continue;

            const fileId = item.fileId || item.id;
            let documentType = item.documentType;
            let url = null;
            let downloadUrl = null;

            if (fileId) {
              try {
                  const file = await documentService.getFile(fileId);
                  const isImage = file.mimeType.startsWith('image/');
                  url = isImage ? documentService.getFilePreview(fileId) : documentService.getFileView(fileId);

                  // Always use mimeType (from storage) as the documentType for detection
                  documentType = file.mimeType;

                  // Also capture original filename if available
                  if (!item.name) item.name = file.name;

                  downloadUrl = documentService.getFileDownload(fileId);
              } catch(e) {
                 // Fallback
                 url = await documentService.getFileUrl(fileId);
                 downloadUrl = documentService.getFileDownload(fileId);
              }
            } else {
              url = item.url;
            }

            if (url) {
                docs.push({
                    url,
                    downloadUrl,
                    documentType,
                    title: title || item.title || item.name || 'Document',
                    role: item.role,
                    name: item.name
                });
            }
        }

        if (docs.length === 0) throw new Error('No valid documents found');

        setViewerDocs(docs);
        setViewerUrl(docs[0]!.url);
        setViewerDownloadUrl(docs[0]!.downloadUrl);
        setViewerType(docs[0]!.documentType);
        setViewerTitle(docs[0]!.title);
        setViewerError(null);
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
    setViewerDocs([]);
  };

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isTaskLibraryOpen, setIsTaskLibraryOpen] = useState(false);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [newTaskData, setNewTaskData] = useState<Partial<ProjectTask>>({
    title: '',
    description: '',
    category: 'General',
    dueDate: new Date().toISOString().slice(0, 10),
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
        // New/required fields to satisfy TaskTemplate type
        showTaskToUser: doc.showTaskToUser ?? true,
        sendReminders: doc.sendReminders ?? false,
        deadlineType: doc.deadlineType || 'RELATIVE',
        deadlineDays: doc.deadlineDays ?? 7,
        deadlineDate: doc.deadlineDate,
        reminderIntervalDays: doc.reminderIntervalDays ?? 3,
        visibilityType: doc.visibilityType || 'ALWAYS',
        visibilityDate: doc.visibilityDate,
        visibilityDays: doc.visibilityDays,
        visibilityTaskId: doc.visibilityTaskId,
        // keep existing notification flags for backward compatibility
        notifyAssignee: doc.notifyAssignee ?? true,
        notifyAgentOnComplete: doc.notifyAgentOnComplete ?? true
      })));
    } catch (error) {
      console.error('Error fetching task templates:', error);
    }
  };

  const fetchFormDefinitions = async () => {
    try {
      setIsLoadingForms(true);
      const defs = await formDefinitionsService.list();
      setFormDefinitions(defs);
    } catch (e) {
      console.error('Error fetching form definitions:', e);
    } finally {
      setIsLoadingForms(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchFormDefinitions();
      fetchTaskTemplates();
      fetchGlobalRequirements();
    }
  }, [id, isAdmin]);

  const fetchGlobalRequirements = async () => {
    try {
      const res = await documentService.listDefinitions();
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
        const roles = rd.autoAssignTo || [];

        const participantsData = roles.map((role: string) => {
          const u = allUsers.find(user =>
            (role.toLowerCase() === 'seller' && user.id === project.sellerId) ||
            (role.toLowerCase() === 'buyer' && user.id === project.buyerId)
          );
          // Match by definition ID and project scope
          const log = docsFound.find(df =>
            df.userDocumentDefinitionId === (rd as any).$id &&
            df.user.id === u?.id &&
            (df.projectId === id)
          );
          return {
            role,
            user: u,
            isProvided: !!log,
            url: log?.url,
            fileId: log?.fileId,
            documentType: log?.documentType,
            providedAt: log?.uploadedAt,
            name: log?.name
          };
        });
        return { ...rd, participants: participantsData };
      });

    return { tasks, docs: combinedDocs, vault: docsFound };
  }, [allUsers, project, id, isAdmin, requiredDocs, taskTemplates]);

  const handleSyncDocs = async () => {
    setIsSyncing(true);
    try {
      if (project) {
        await documentService.autoProvisionDocuments(id!, project);
        onRefresh?.();
        alert('Missing document assignments synced successfully.');
      }
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


  const handleSaveInlineField = async (field: string, value: any) => {
    if (!project) return;
    setIsProcessing(true);
    try {
      const updates: any = {};

      if (field === 'address') updates.address = value;
      else if (field === 'price') updates.price = parseFloat(value);
      else if (field === 'description') updates.description = value;
      else if (field === 'title') updates.title = value;
      else if (field === 'handover_date') updates.handover_date = value || null;
      else if (field === 'referenceNumber') updates.referenceNumber = value;
      else if (field === 'bedrooms') updates.bedrooms = parseInt(value);
      else if (field === 'bathrooms') updates.bathrooms = parseFloat(value);
      else if (field === 'sqft') updates.sqft = parseInt(value);

      await projectService.update(project.id, updates);
      setEditingField(null);
      setEditValue(null);
      onRefresh?.();
    } catch (error: any) {
      console.error('Error updating project field:', error);
      alert(`Failed to update: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveBulkSpecs = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!project) return;
    setIsProcessing(true);
    const formData = new FormData(e.currentTarget);

    try {
      const updates: any = {
        bedrooms: parseInt(formData.get('bedrooms') as string) || 0,
        bathrooms: parseFloat(formData.get('bathrooms') as string) || 0,
        sqft: parseInt(formData.get('sqft') as string) || 0,
        buildYear: parseInt(formData.get('buildYear') as string) || null,
        livingArea: parseInt(formData.get('livingArea') as string) || 0,
        garages: parseInt(formData.get('garages') as string) || 0,
      };

      await projectService.update(project.id, updates);
      setShowBulkSpecsModal(false);
      onRefresh?.();
    } catch (error: any) {
      console.error('Error updating bulk specs:', error);
      alert(`Failed to update specs: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveGeneralInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!project) return;
    setIsProcessing(true);
    const formData = new FormData(e.currentTarget);

    try {
      const updates: any = {
        title: formData.get('title') as string,
        address: googleApiKey ? tempAddress : (formData.get('address') as string),
        price: parseFloat(formData.get('price') as string) || 0,
        referenceNumber: formData.get('referenceNumber') as string,
      };

      await projectService.update(project.id, updates);
      setShowGeneralInfoModal(false);
      onRefresh?.();
    } catch (error: any) {
      console.error('Error updating general info:', error);
      alert(`Failed to update general info: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const gemini = new GeminiService();

  useEffect(() => {
    if (!id) return;

    loadForms();

    const unsubscribe = client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`, response => {
      if (response.events.some(e => e.includes('create'))) {
        const payload = response.payload as any;
        if (payload.projectId === id) {
          // No-op for now since chat is removed
        }
      }
    });

    return () => unsubscribe();
  }, [id]);

  const loadForms = async () => {
    if (!id) return;
    setIsLoadingForms(true);
    try {
      const [res, defs] = await Promise.all([
        projectFormsService.listByProject(id),
        formDefinitionsService.list()
      ]);
      setForms(res.items || []);
      setFormDefinitions(defs);
    } catch (e) {
      console.error('Error loading forms:', e);
      setForms([]);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const handleDeleteForm = async (submission: FormSubmission) => {
    try {
      await projectFormsService.deleteSubmission(submission.id);
      setForms(prev => prev.filter(f => f.id !== submission.id));
    } catch (e: any) {
      alert('Failed to delete: ' + (e.message || 'Unknown error'));
    }
  };

  const handleTemplateAssignmentClick = async (def: FormDefinition) => {
    if (!id || !project) return;

    // Handle Auto-Assignment if configured
    if (def.autoAssignTo && def.autoAssignTo.length > 0) {
      const targetUserIds: string[] = [];
      const missingRoles: string[] = [];

      def.autoAssignTo.forEach(role => {
        let targetUserId = '';
        if (role === 'seller') targetUserId = project.sellerId;
        else if (role === 'buyer') targetUserId = project.buyerId || '';
        else if (role === 'admin') targetUserId = project.managerId;

        if (targetUserId) {
          targetUserIds.push(targetUserId);
        } else {
          missingRoles.push(role);
        }
      });

      if (missingRoles.length > 0) {
        alert(`Cannot auto-assign some roles: ${missingRoles.join(', ')} is not yet set for this project.`);
        // If we have some targets, we'll assign to them, but we might want to also allow manual assignment for the rest?
        // For simplicity, if any are missing, we'll show the manual picker for the missing roles later?
        // Actually, let's just assign to the ones we have and inform the user.
      }

      if (targetUserIds.length > 0) {
        for (const userId of targetUserIds) {
          await executeFormAssignment(def, userId);
        }
      } else {
        // Fallback to manual assignment if NO auto-assignment was possible
        setSelectedTemplate(def);
        setIsAssigningForm(true);
      }
    } else {
      // Manual Assignment
      setSelectedTemplate(def);
      setIsAssigningForm(true);
    }
  };

  const executeFormAssignment = async (def: FormDefinition, targetProfileId: string) => {
    if (!id || !project) return;

    try {
      setIsLoadingForms(true);
      // 1. Create Form Submission
      await projectFormsService.createSubmission({
        projectId: project.id,
        formKey: def.key,
        title: def.title,
        data: def.defaultData || {},
        assignedToUserId: targetProfileId,
        status: 'assigned',
        meta: {
          needsSignatureFromSeller: def.needSignatureFromSeller,
          needsSignatureFromBuyer: def.needSignatureFromBuyer
        }
      });

      // 2. Handle Auto-Task Creation if enabled
      if (def.autoCreateTaskForAssignee) {
        const newTask: ProjectTask = {
          id: ID.unique(),
          title: `Fill out form: ${def.title}`,
          description: `Please complete the ${def.title} form as requested.`,
          category: 'Legal',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Default 3 days
          completed: false,
          notifyAssignee: true,
          notifyAgentOnComplete: true
        };

        const updatedTasks = [...project.tasks, newTask];
        await projectService.update(id, { tasks: JSON.stringify(updatedTasks) });

        // Also assign to profile for "My Tasks" view
        await profileService.assignTask(targetProfileId, newTask.id, {
          title: newTask.title,
          description: newTask.description,
          dueDate: newTask.dueDate,
          projectId: id,
          status: 'PENDING'
        });

        // Update local state for tasks
        setProjects(prev => prev.map(p => p.id === id ? { ...p, tasks: updatedTasks } : p));
      }

      setIsAssigningForm(false);
      loadForms();
    } catch (err: any) {
      alert('Failed to assign form: ' + err.message);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const fetchInsights = async () => {
    if (!project) return;
    setShowAIModal(true);
    setAiInsight('Thinking...');
    try {
      const result = await gemini.getProjectInsights(project);
      setAiInsight(result);
    } catch (e) {
      setAiInsight('Error generating insights.');
    }
  };

  const fetchLocationInsights = async () => {
    if (!project) return;
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
    if (!isAdmin || !project) return;
    setIsGenerating(true);
    setShowTemplatePicker(false);
    try {
      const draftText = await gemini.generateContractDraft(project, seller!, buyer, template);

      const payload = {
        projectId: project.id,
        title: template ? `${template.name} (${project.title})` : "New Sales Purchase Agreement (Draft)",
        content: draftText,
        status: ContractStatus.PENDING_SIGNATURE,
        assignees: [project.sellerId, ...(project.buyerId ? [project.buyerId] : [])],
        signedBy: [],
        createdAt: new Date().toISOString()
      };

      const response = await databases.createDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, ID.unique(), payload);

      const newContract: Contract = {
        id: response.$id,
        projectId: payload.projectId,
        title: payload.title,
        content: payload.content,
        status: payload.status,
        assignees: payload.assignees,
        signedBy: payload.signedBy,
        createdAt: payload.createdAt,
        signatureData: {}
      };
      setContracts(prev => [...prev, newContract]);
    } catch (e) {
      console.error(e);
      alert('Failed to save contract to database.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSignContract = async (dataUrl: string) => {
    if (!signingContractId) return;

    // Find contract to update
    const contractToSign = contracts.find(c => c.id === signingContractId);
    if (!contractToSign) return;

    try {
      const updatedSignedBy = Array.from(new Set([...contractToSign.signedBy, user.id]));
      const allSigned = contractToSign.assignees.every(id => updatedSignedBy.includes(id));
      const newStatus = allSigned ? ContractStatus.SIGNED : contractToSign.status;
      const newSignatureData = { ...(contractToSign.signatureData || {}), [user.id]: dataUrl };

      // Update in Appwrite
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, signingContractId, {
        signedBy: updatedSignedBy,
        status: newStatus,
        signatureData: JSON.stringify(newSignatureData) // Store as JSON string
      });

      // Update local state
      setContracts(prev => prev.map(c => {
        if (c.id === signingContractId) {
          return {
            ...c,
            signedBy: updatedSignedBy,
            status: newStatus,
            signatureData: newSignatureData
          };
        }
        return c;
      }));
    } catch (error) {
       console.error("Failed to sign contract", error);
       alert("Failed to save signature. Please try again.");
    }

    setSigningContractId(null);
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!isAdmin || !confirm('Are you sure you want to delete this contract? This action cannot be undone.')) return;

    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, contractId);
      setContracts(prev => prev.filter(c => c.id !== contractId));
    } catch (error) {
      console.error('Failed to delete contract:', error);
      alert('Failed to delete contract. Please try again.');
    }
  };

  const handleDeleteRequirement = async (fileIds: string[]) => {
    if (!isAdmin || !confirm('Are you sure you want to delete these documents?')) return;
    setIsProcessing(true);
    try {
      await Promise.all(fileIds.map(fid => documentService.deleteDocument(fid)));
      onRefresh?.();
    } catch (error) {
      console.error('Failed to delete documents:', error);
      alert('Failed to delete documents. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndoRequirement = async (fileId: string) => {
    if (!isAdmin) {
      // Permission Check
      let isMine = false;
      for (const rd of projectStatusData.docs) {
          const part = rd.participants.find((p:any) => p.fileId === fileId);
          if (part && (part.user?.id === user.id || part.user?.$id === user.id || part.user?.userId === user.id)) {
              isMine = true;
              break;
          }
      }
      if (!isMine) {
          alert("You can only remove documents you uploaded.");
          return;
      }
    }

    if (!confirm('Undo this upload? The file will be deleted.')) return;
    setIsProcessing(true);
    try {
        await documentService.deleteDocument(fileId);
        onRefresh?.();
    } catch (error) {
        console.error("Failed to undo upload:", error);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleUndoContractSignature = async (contractId: string, userId: string) => {
    // 1. Status Check
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    if (contract.status === ContractStatus.SIGNED && !isAdmin) {
       alert('This contract is finalized and locked.');
       return;
    }

    // 2. Permission Check
    const isMySignature = (userId === user.id || userId === user.$id);
    if (!isAdmin && !isMySignature) {
       alert('You can only undo your own signature.');
       return;
    }

    if (!confirm('Undo signature? This will revert the status.')) return;
    try {
        const updatedSignedBy = contract.signedBy.filter(id => id !== userId);
        const newStatus = ContractStatus.PENDING_SIGNATURE;

        const newSigData = contract.signatureData ? { ...contract.signatureData } : {};
        delete newSigData[userId];

        await databases.updateDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, contractId, {
            signedBy: updatedSignedBy,
            status: newStatus,
            signatureData: JSON.stringify(newSigData)
        });

        setContracts(prev => prev.map(c => c.id === contractId ? {
             ...c, signedBy: updatedSignedBy, status: newStatus, signatureData: newSigData
        } : c));

    } catch(e) {
        console.error("Undo sign failed", e);
        alert("Could not undo signature.");
    }
  };

  const handleUndoForm = async (form: any, role: string) => {
     // 1. Locked Check
     let meta: any = {};
     try { meta = typeof form.meta === 'string' ? JSON.parse(form.meta) : (form.meta || {}); } catch(e){}
     const signatures = meta.signatures || {};
     const needsSeller = meta.needsSignatureFromSeller === true || meta.needsSignatureFromSeller === 'true';
     const needsBuyer = meta.needsSignatureFromBuyer === true || meta.needsSignatureFromBuyer === 'true';
     const allSigned = (!needsSeller || signatures.seller) && (!needsBuyer || signatures.buyer);

     if ((form.status === 'completed' || form.status === 'closed' || allSigned) && !isAdmin) {
        alert('This form is finalized and locked.');
        return;
     }

     // 2. Permission Check
     const isSeller = user.id === project?.sellerId || user.$id === project?.sellerId;
     const isBuyer = user.id === project?.buyerId || user.$id === project?.buyerId;
     const isMyRole = (role === 'SELLER' && isSeller) || (role === 'BUYER' && isBuyer) || (role === 'ASSIGNEE' && (form.assignedToUserId === user.id || form.assignedToUserId === user.$id));

     if (!isAdmin && !isMyRole) {
          alert('You can only undo your own actions.');
          return;
     }

     if (!confirm('Undo form completion?')) return;
     try {
         if (form.status === 'submitted' || form.status === 'completed' || form.status === 'closed') {
             const updates: any = {};

             if (role === 'SELLER' && meta.signatures?.seller) {
                 delete meta.signatures.seller;
                 delete meta.signatures.sellerDate;
                 updates.meta = JSON.stringify(meta);
                 updates.status = 'submitted';
             } else if (role === 'BUYER' && meta.signatures?.buyer) {
                 delete meta.signatures.buyer;
                 delete meta.signatures.buyerDate;
                 updates.meta = JSON.stringify(meta);
                 updates.status = 'submitted';
             } else if (role === 'ASSIGNEE' || role === 'SUBMITTED') {
                 updates.status = 'assigned';
             }

             await projectFormsService.updateSubmission(form.id, updates);
             setForms(prev => prev.map(f => f.id === form.id ? { ...f, ...updates, meta: updates.meta || f.meta } : f));
         }
     } catch (e) {
         console.error("Undo form failed", e);
     }
  };

  const handleUnlockContract = async (contract: Contract) => {
    if (!isAdmin) return;
    if (!confirm('Unlock this contract?')) return;
    try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, contract.id, {
            status: ContractStatus.PENDING_SIGNATURE
        });
        setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: ContractStatus.PENDING_SIGNATURE } : c));
    } catch (error) {
        console.error("Failed to unlock:", error);
    }
  };

  const handleUnlockForm = async (form: any) => {
    if (!isAdmin) return;
    if (!confirm('Unlock this form?')) return;
    try {
        await projectFormsService.updateSubmission(form.id, { status: 'submitted' });
        setForms(prev => prev.map(f => f.id === form.id ? { ...f, status: 'submitted' } : f));
    } catch(e) { console.error(e); }
  };

  const handleToggleVisibility = async (contract: Contract) => {
    if (!isAdmin) return;
    const newVis = contract.visibility === 'public' ? 'private' : 'public';
    try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, contract.id, { visibility: newVis });
        setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, visibility: newVis } : c));
    } catch(e) { console.error(e); }
  };

  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!project || !id) return;

    try {
      const newTask: ProjectTask = {
        id: ID.unique(),
        title: newTaskData.title as string,
        description: newTaskData.description || '',
        category: newTaskData.category as any,
        dueDate: newTaskData.dueDate as string,
        completed: false,
        notifyAssignee: newTaskData.notifyAssignee ?? true,
        notifyAgentOnComplete: newTaskData.notifyAgentOnComplete ?? true
      };

      const updatedTasks = [...project.tasks, newTask];
      await projectService.update(id, { tasks: JSON.stringify(updatedTasks) });

      setProjects(prev => prev.map(p => p.id === id ? { ...p, tasks: updatedTasks } : p));
      setIsAddTaskModalOpen(false);
      setNewTaskData({
        title: '',
        description: '',
        category: 'General',
        dueDate: new Date().toISOString().slice(0, 10),
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
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Default 7 days
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

  const assignUser = async (role: 'seller' | 'buyer' | 'manager', userId: string) => {
    if (!isAdmin || !id || !project) return;
    try {
      let field: string;
      if (role === 'seller') field = 'sellerId';
      else if (role === 'buyer') field = 'buyerId';
      else field = 'managerId';

      await projectService.update(id, { [field]: userId });

      setProjects(prev => prev.map(p => {
        if (p.id === project.id) {
          if (role === 'seller') return { ...p, sellerId: userId };
          if (role === 'buyer') return { ...p, buyerId: userId };
          return { ...p, managerId: userId };
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
  const agent = allUsers.find(u => u.id === (project.managerId || defaultAgentId));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <input
        type="file"
        ref={docFileInputRef}
        className="hidden"
        onChange={onFileChange}
      />

      {signingContractId && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{projectContracts.find(c => c.id === signingContractId)?.title}</h3>
                <p className="text-xs text-slate-500">Please review the document carefully before signing.</p>
              </div>
              <button
                onClick={() => setSigningContractId(null)}
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
                    dangerouslySetInnerHTML={{ __html: projectContracts.find(c => c.id === signingContractId)?.content || '' }}
                  />

                  {projectContracts.find(c => c.id === signingContractId)?.signedBy && (projectContracts.find(c => c.id === signingContractId)?.signedBy.length || 0) > 0 && (
                    <div className="mt-12 pt-8 border-t border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Signatures</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {projectContracts.find(c => c.id === signingContractId)?.signedBy.map((signerId: string) => {
                          const signer = allUsers.find(u => u.id === signerId || u.$id === signerId);
                          const sigData = (projectContracts.find(c => c.id === signingContractId)?.signatureData as any)?.[signerId];
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
              {!projectContracts.find(c => c.id === signingContractId)?.signedBy?.includes((user.id || user.$id)!) ? (
                <div className="w-full flex flex-col items-center gap-4">
                  {!showSignaturePad ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                       <button
                         onClick={() => setShowSignaturePad(true)}
                         className="w-full max-w-md bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                       >
                         <SignatureIcon size={20} />
                         Sign Document
                       </button>
                       <p className="text-xs text-slate-400">By clicking above, you agree to sign this legal document.</p>
                     </div>
                  ) : (
                    <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="flex items-center justify-between mb-4 px-2">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Draw your signature below</p>
                        <button onClick={() => setShowSignaturePad(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Cancel</button>
                      </div>
                      <SignaturePad
                        onSave={handleSignContract}
                        onCancel={() => setShowSignaturePad(false)}
                      />
                    </div>
                  )}
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
                    onClick={() => setSigningContractId(null)}
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

      {/* Modal removed in favor of inline editing */}

      {showGeneralInfoModal && project && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Edit General Information</h2>
              <button onClick={() => setShowGeneralInfoModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveGeneralInfo} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project Title</label>
                  <input name="title" type="text" defaultValue={project.title} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Property Address</label>
                  {googleApiKey ? (
                    <AddressAutocomplete
                      apiKey={googleApiKey}
                      value={tempAddress}
                      onChange={setTempAddress}
                      name="address"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                      placeholder="123 Ocean Drive, Miami, FL"
                    />
                  ) : (
                    <input name="address" type="text" defaultValue={project.property.address} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Price</label>
                  <input name="price" type="number" defaultValue={project.property.price} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Reference Number</label>
                  <input name="referenceNumber" type="text" defaultValue={project.referenceNumber} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="REF-001" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowGeneralInfoModal(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50">
                  {isProcessing ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkSpecsModal && project && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Edit Property Specifications</h2>
              <button onClick={() => setShowBulkSpecsModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveBulkSpecs} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bedrooms</label>
                  <div className="relative">
                    <Bed size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="bedrooms" type="number" defaultValue={project.property.bedrooms} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bathrooms</label>
                  <div className="relative">
                    <Bath size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="bathrooms" type="number" step="0.5" defaultValue={project.property.bathrooms} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Plot Size (Sq Ft)</label>
                  <div className="relative">
                    <Square size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="sqft" type="number" defaultValue={project.property.sqft} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Living Area (Sq Ft)</label>
                  <div className="relative">
                    <Maximize2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="livingArea" type="number" defaultValue={project.property.livingArea} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Build Year</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="buildYear" type="number" defaultValue={project.property.buildYear} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Garages</label>
                  <div className="relative">
                    <Car size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="garages" type="number" defaultValue={project.property.garages} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowBulkSpecsModal(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md disabled:opacity-50">
                  {isProcessing ? 'Saving...' : 'Update Specifications'}
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

      {/* Form Template Selection Modal */}
      {showFormTemplatePicker && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Assign Information Form</h3>
              <button onClick={() => setShowFormTemplatePicker(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
            </div>
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
              {isLoadingForms ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 size={32} className="text-indigo-600 animate-spin mb-3" />
                  <p className="text-sm text-slate-500 italic">Syncing templates...</p>
                </div>
              ) : formDefinitions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No form templates found.</div>
              ) : formDefinitions.map(def => (
                <button
                  key={def.id}
                  onClick={() => {
                    setShowFormTemplatePicker(false);
                    handleTemplateAssignmentClick(def);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ClipboardList size={18}/></div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">{def.title}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{def.role || 'General Form'}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">AI Project Analysis</h3>
                  <p className="text-xs text-slate-500 font-medium">Strategic insights based on current project state.</p>
                </div>
              </div>
              <button onClick={() => setShowAIModal(false)} className="bg-white p-2 rounded-xl text-slate-400 hover:text-slate-600 border border-slate-100 shadow-sm transition-all"><X size={20}/></button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto no-scrollbar">
              {aiInsight === 'Thinking...' ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                   <Loader2 size={40} className="text-indigo-600 animate-spin mb-4" />
                   <p className="text-slate-500 font-medium italic">Analyzing documents and status...</p>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                  {aiInsight || 'No insights available.'}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
               <button onClick={() => setShowAIModal(false)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md">
                 Got it
               </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            {isAdmin && editingField === 'title' ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-2xl font-bold px-3 py-1.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
                <button onClick={() => handleSaveInlineField('title', editValue)} className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shrink-0">
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18}/>}
                </button>
                <button onClick={() => setEditingField(null)} className="p-2.5 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all shrink-0"><X size={18}/></button>
              </div>
            ) : (
              <div className="group flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 truncate">{project.title}</h1>
                {isAdmin && (
                  <button
                    onClick={() => { setEditingField('title'); setEditValue(project.title); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5 opacity-60">
               <MapPin size={14} />
               <p className="text-xs font-bold truncate tracking-tight">{project.property.address}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Controls moved into Project Summary */}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50/50">
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<ClipboardList size={18}/>} label="Overview" />
              <TabButton active={activeTab === 'property'} onClick={() => setActiveTab('property')} icon={<Home size={18}/>} label="Property" />
              <TabButton active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} icon={<FileText size={18}/>} label="Documents" />
              {isAdmin && <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={<UsersGroupIcon size={18}/>} label="Team Management" />}
            </div>
            <div className="p-8">
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
                    {/* Progress Widget */}
                    <div className="lg:col-span-3 bg-slate-900 rounded-[32px] p-10 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Project Summary</p>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100/50">ACTIVE</span>
                              </div>
                              <h3 className="text-xl font-black text-white leading-tight truncate">{project.title}</h3>
                              <p className="text-xs text-slate-300 font-bold flex items-center gap-1.5 tracking-tight mt-1">
                                <MapPin size={12} className="text-blue-500 flex-shrink-0" /> <span className="truncate">{project.property.address}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-4 ml-4">
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">List Price</p>
                                <p className="text-lg font-black text-blue-400">${project.property.price?.toLocaleString() || 'TBD'}</p>
                              </div>

                              <div className="relative">
                                <button
                                  onClick={() => setShowActionMenu(!showActionMenu)}
                                  className="w-10 h-10 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center"
                                  title="Actions"
                                >
                                  <Zap size={16} />
                                </button>

                                {showActionMenu && (
                                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 py-3 z-[100] animate-in slide-in-from-top-2 duration-200">
                                     <div className="px-4 py-2 mb-1 border-b border-slate-50">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Management</span>
                                     </div>
                                     <button
                                       onClick={() => { fetchInsights(); setShowActionMenu(false); }}
                                       className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                                     >
                                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                          <Sparkles size={16} />
                                        </div>
                                        AI Analyze Project
                                     </button>
                                     <button
                                       onClick={() => { setShowFormTemplatePicker(true); setShowActionMenu(false); }}
                                       className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                                     >
                                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                          <ClipboardList size={16} />
                                        </div>
                                        Assign Form
                                     </button>
                                     <button
                                       onClick={() => { setShowTemplatePicker(true); setShowActionMenu(false); }}
                                       className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                                     >
                                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                          <FileText size={16} />
                                        </div>
                                        Assign Contract
                                     </button>
                                     <button
                                       onClick={() => { setIsTaskLibraryOpen(true); setShowActionMenu(false); }}
                                       className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                                     >
                                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-all">
                                          <CheckCircle size={16} />
                                        </div>
                                        Assign Task
                                     </button>
                                  </div>
                                )}
                              </div>
                            </div>
                         </div>

                         <div className="flex items-center gap-6 mb-6">
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Closing</p>
                              <p className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">{project.handover_date || 'Not set'}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Reference</p>
                              <p className="text-xs font-black text-blue-400 bg-blue-900/50 px-3 py-1.5 rounded-lg border border-blue-800/50">{project.referenceNumber || 'N/A'}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Created</p>
                              <p className="text-xs font-bold text-slate-300">{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</p>
                            </div>
                         </div>

                         <div className="flex items-center justify-between">
                            <button onClick={() => setActiveTab('property')} className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5">
                                View Specs <ChevronRight size={10} />
                            </button>
                            <button onClick={() => setShowGeneralInfoModal(true)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-all">
                               <Edit2 size={12} />
                            </button>
                         </div>

                         {/* Full Width Progress Bar at Bottom */}
                         <div className="mt-6 pt-4 border-t border-slate-700">
                           <div className="flex items-center justify-between mb-3">
                             <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Completion Progress</p>
                             <p className="text-sm font-bold text-blue-400">
                               {(() => {
                                 const total = projectStatusData.tasks.length;
                                 const completed = projectStatusData.tasks.filter((t: any) => t.status === 'COMPLETED').length;
                                 return total > 0 ? Math.round((completed / total) * 100) : 0;
                               })()}%
                             </p>
                           </div>
                           <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                             <div
                               className="h-full bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
                               style={{ width: `${(() => {
                                 const total = projectStatusData.tasks.length;
                                 const completed = projectStatusData.tasks.filter((t: any) => t.status === 'COMPLETED').length;
                                 return total > 0 ? Math.round((completed / total) * 100) : 0;
                               })()}%` }}
                             ></div>
                           </div>
                         </div>
                        </div>
                    </div>
                  </div>

                  {/* Primary Participants Grid */}
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
                      {projectStatusData.tasks.sort((a, b) => {
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
              )}

              {activeTab === 'documents' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {(() => {
                    const visibleContracts = projectContracts.filter(c =>
                      isAdmin ||
                      c.visibility === 'public' ||
                      (c.assignees?.some(id => id === user.id || id === user.$id || id === user.userId))
                    );

                    const visibleForms = forms.filter(f => {
                      if (isAdmin) return true;
                      if (f.assignedToUserId === user.id || f.assignedToUserId === user.$id) return true;
                      const def = formDefinitions?.find((d:any) => d.key === f.formKey);
                      if (def && def.visibility === 'public') return true;
                      if ((project?.sellerId === user.id || project?.sellerId === user.$id) && f.meta?.includes('seller')) return true;
                      if ((project?.buyerId === user.id || project?.buyerId === user.$id) && f.meta?.includes('buyer')) return true;
                      return false;
                    });

                    const visibleDocs = projectStatusData.docs.filter(rd => {
                        const def: any = rd;
                        const isPublic = !def.visibility || def.visibility === 'public';
                        const isParticipant = rd.participants.some((p: any) => p.user?.id === user.id || p.user?.$id === user.id);
                        return isAdmin || isPublic || isParticipant;
                    });

                    return (
                        <React.Fragment>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Document Vault</h3>
                      <p className="text-xs text-slate-500">Unified repository for Contracts, Forms, and Property Requirements.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <React.Fragment>
                          <button
                            onClick={() => setShowTemplatePicker(true)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                            disabled={isGenerating}
                          >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                            Contract Builder
                          </button>
                          <button
                            onClick={() => setShowFormEditor(true)}
                            className="bg-white text-slate-900 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                          >
                            <Plus size={16} />
                            Manual Form
                          </button>
                        </React.Fragment>
                      )}
                      <button
                        onClick={handleSyncDocs}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-100 transition-colors"
                        title="Sync Requirements"
                        disabled={isSyncing}
                      >
                        {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <History size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Document Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText size={24}/>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">{visibleContracts.length}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contracts</div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <ClipboardList size={24}/>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900">{visibleForms.length}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Forms</div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={24}/>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-emerald-600">
                          {visibleDocs.filter(d => d.participants.every((p: any) => p.isProvided)).length}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provided</div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock size={24}/>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-amber-600">
                          {visibleDocs.filter(d => d.participants.some((p: any) => !p.isProvided)).length}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attention</div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Legal Contracts */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Legal Contracts</span>
                      <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {visibleContracts.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                           No contracts visible.
                        </div>
                      ) : (
                      visibleContracts.map(contract => (
                        <div key={contract.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:border-indigo-200 transition-all group">
                           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                              <div className="flex items-start gap-4 flex-1">
                                 <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <FileText size={24} />
                                 </div>
                                 <div className="min-w-0">
                                    <h4 className="font-bold text-slate-900 text-lg truncate mb-1 flex items-center gap-2">
                                        {contract.title}
                                        {contract.status === ContractStatus.SIGNED && <Lock size={14} className="text-amber-500"/>}
                                    </h4>
                                    <p className="text-sm text-slate-500 line-clamp-1">{contract.content.replace(/<[^>]*>/g, ' ').substring(0, 80)}...</p>
                                 </div>
                              </div>

                              <div className="flex flex-wrap gap-3 items-center">
                                 {/* Status Cards */}
                                 {contract.assignees && contract.assignees.length > 0 ? (
                                   contract.assignees.map((assigneeId) => {
                                     const assignee = allUsers.find((u) => u.id === assigneeId);
                                     const isSigned = contract.signedBy.includes(assigneeId);
                                     const isLocked = contract.status === ContractStatus.SIGNED;

                                     // Determine role display
                                     const isSeller = assigneeId === project?.sellerId;
                                     const isBuyer = assigneeId === project?.buyerId;
                                     const roleLabel = isSeller ? 'SELLER' : isBuyer ? 'BUYER' : 'ASSIGNEE';

                                     return (
                                       <div key={assigneeId} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${isSigned ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                          <div className="relative shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                                              {assignee?.avatar ? <img src={assignee.avatar} className="w-full h-full object-cover" /> : <UserIcon size={14} className="text-slate-400" />}
                                            </div>
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isSigned ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                                          </div>

                                          <div className="min-w-[80px]">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">{roleLabel}</div>
                                            <div className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{assignee?.name || 'Pending...'}</div>
                                          </div>

                                          {isSigned ? (
                                             <div className="flex items-center gap-2">
                                                 <div className="text-[10px] font-bold text-emerald-600 bg-white px-1.5 py-0.5 rounded shadow-sm">
                                                    {new Date().toLocaleDateString()}
                                                 </div>
                                                 {(!isLocked || isAdmin) && (
                                                     <button
                                                        onClick={() => handleUndoContractSignature(contract.id, assigneeId)}
                                                        className={`p-1 rounded text-slate-400 hover:text-red-500 transition-colors ${isLocked ? 'hover:bg-red-50' : 'hover:bg-slate-100'}`}
                                                        title="Undo Signature"
                                                     >
                                                        <X size={12} />
                                                     </button>
                                                 )}
                                             </div>
                                          ) : (
                                            <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shadow-sm">
                                              Waiting
                                            </div>
                                          )}
                                       </div>
                                     );
                                   })
                                 ) : (
                                   <span
                                     className={`text-[10px] font-bold uppercase ${
                                       contract.status === ContractStatus.SIGNED
                                         ? 'text-emerald-600'
                                         : 'text-amber-600'
                                     }`}
                                   >
                                     {contract.status.replace('_', ' ')}
                                   </span>
                                 )}

                                 {/* Actions */}
                                 <div className="flex gap-2 ml-2 pl-2 border-l border-slate-100 transition-opacity">
                                     {contract.assignees.includes(user.id) && !contract.signedBy.includes(user.id) && contract.status !== ContractStatus.SIGNED && (
                                       <button onClick={() => setSigningContractId(contract.id)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm" title="Sign Contract">
                                          <SignatureIcon size={16}/>
                                       </button>
                                     )}

                                     {isAdmin && contract.status === ContractStatus.SIGNED && (
                                        <button onClick={() => handleUnlockContract(contract)} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100" title="Unlock Contract">
                                           <Lock size={16}/>
                                        </button>
                                     )}

                                     <button onClick={() => setSigningContractId(contract.id)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200" title="View Contract">
                                        <Eye size={16}/>
                                     </button>
                                     <button onClick={() => downloadContractPDF(contract, project, allUsers)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200" title="Download PDF">
                                        <Download size={16}/>
                                     </button>
                                     {isAdmin && (
                                       <React.Fragment>
                                           <button onClick={() => handleToggleVisibility(contract)} className={`p-2 rounded-xl transition-colors border ${contract.visibility === 'public' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`} title={contract.visibility === 'public' ? 'Make Private' : 'Make Public'}>
                                              {contract.visibility === 'public' ? <Globe size={16}/> : <Shield size={16}/>}
                                           </button>
                                           <button onClick={() => handleDeleteContract(contract.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100" title="Delete Contract">
                                              <Trash2 size={16}/>
                                           </button>
                                       </React.Fragment>
                                     )}
                                 </div>
                              </div>
                           </div>
                        </div>
                      )))}

                    </div>
                  </div>

                   {/* Section: Project Forms */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Information Forms</span>
                      <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {visibleForms.length === 0 ? (
                           <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                              No forms visible.
                           </div>
                        ) : (
                          visibleForms.map((f: any) => {
                             let meta: any = {};
                             try { meta = typeof f.meta === 'string' ? JSON.parse(f.meta) : (f.meta || {}); } catch(e){}

                             const needsSeller = meta.needsSignatureFromSeller === true || meta.needsSignatureFromSeller === 'true' || meta.needSignatureFromSeller === true || meta.needSignatureFromSeller === 'true';
                             const needsBuyer = meta.needsSignatureFromBuyer === true || meta.needsSignatureFromBuyer === 'true' || meta.needSignatureFromBuyer === true || meta.needSignatureFromBuyer === 'true';
                             const signatures = meta.signatures || {};

                             const assignedUser = allUsers.find(u => u.id === f.assignedToUserId || u.$id === f.assignedToUserId || u.userId === f.assignedToUserId);

                             // Build Participants List
                             const participants: any[] = [];

                             // 1. Assignee (Submission Status)
                             const isSubmitted = f.status === 'submitted' || f.status === 'completed' || f.status === 'closed';
                             const allSigned = (!needsSeller || signatures.seller) && (!needsBuyer || signatures.buyer);
                             const isLocked = (f.status === 'completed' || f.status === 'closed' || allSigned);

                             if (!isSubmitted || (!needsSeller && !needsBuyer)) {
                               const isSeller = assignedUser?.id === project?.sellerId;
                               const isBuyer = assignedUser?.id === project?.buyerId;
                               participants.push({
                                 user: assignedUser,
                                 role: isSeller ? 'SELLER' : isBuyer ? 'BUYER' : 'ASSIGNEE',
                                 status: isSubmitted ? 'SUBMITTED' : 'PENDING',
                                 label: isSubmitted ? 'Submitted' : 'Pending',
                                 isComplete: isSubmitted,
                                 date: f.updatedAt || f.createdAt
                               });
                             }

                             // 2. Signers (if submitted)
                             if (isSubmitted) {
                               if (needsSeller) {
                                 const sellerUser = allUsers.find(u => u.id === project?.sellerId || u.userId === project?.sellerId);
                                 const signed = !!signatures.seller;
                                 participants.push({
                                   user: sellerUser,
                                   role: 'SELLER',
                                   status: signed ? 'SIGNED' : 'PENDING',
                                   label: signed ? 'Signed' : 'Pending Sign',
                                   isComplete: signed,
                                   date: signatures.sellerDate || new Date().toISOString()
                                 });
                               }
                               if (needsBuyer) {
                                 const buyerUser = allUsers.find(u => u.id === project?.buyerId || u.userId === project?.buyerId);
                                 const signed = !!signatures.buyer;
                                 participants.push({
                                   user: buyerUser,
                                   role: 'BUYER',
                                   status: signed ? 'SIGNED' : 'PENDING',
                                   label: signed ? 'Signed' : 'Pending Sign',
                                   isComplete: signed,
                                   date: signatures.buyerDate || new Date().toISOString()
                                 });
                               }
                             }

                             return (
                              <div key={f.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:border-indigo-200 transition-all group">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                   <div className="flex items-start gap-4 flex-1">
                                      <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:scale-110 transition-transform">
                                         <ClipboardList size={24} />
                                      </div>
                                      <div className="min-w-0">
                                         <h4 className="font-bold text-slate-900 text-lg truncate mb-1 flex items-center gap-2">
                                            {f.title}
                                            {isLocked && <Lock size={14} className="text-amber-500"/>}
                                         </h4>
                                         <p className="text-sm text-slate-500 line-clamp-1">
                                            {isSubmitted
                                              ? (needsSeller || needsBuyer ? 'Pending final signatures.' : 'Form successfully submitted.')
                                              : 'Waiting for initial submission.'}
                                         </p>
                                      </div>
                                   </div>

                                   <div className="flex flex-wrap gap-3 items-center">
                                      {/* Status Cards */}
                                      {participants.map((p, idx) => (
                                          <div key={`${f.id}-p-${idx}`} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${p.isComplete ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                              <div className="relative shrink-0">
                                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                                                  {p.user?.avatar ? <img src={p.user.avatar} className="w-full h-full object-cover" alt="Avatar" /> : <UserIcon size={14} className="text-slate-400" />}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${p.isComplete ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
                                              </div>

                                              <div className="min-w-[80px]">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">{p.role}</div>
                                                <div className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{p.user?.name || 'Unknown'}</div>
                                              </div>

                                              {p.isComplete && p.date ? (
                                                 <div className="flex items-center gap-2">
                                                     <div className="text-[10px] font-bold text-emerald-600 bg-white px-1.5 py-0.5 rounded shadow-sm">
                                                        {new Date(p.date).toLocaleDateString()}
                                                     </div>
                                                     {(!isLocked || isAdmin) && (
                                                         <button
                                                             onClick={() => handleUndoForm(f, p.role)}
                                                             className={`p-1 rounded text-slate-400 hover:text-red-500 transition-colors ${isLocked ? 'hover:bg-red-50' : 'hover:bg-slate-100'}`}
                                                             title="Undo Completion"
                                                         >
                                                             <X size={12} />
                                                         </button>
                                                     )}
                                                 </div>
                                              ) : (
                                                <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shadow-sm">
                                                  Waiting
                                                </div>
                                              )}
                                          </div>
                                      ))}

                                      {/* Actions */}
                                      <div className="flex gap-2 ml-2 pl-2 border-l border-slate-100 transition-opacity">
                                         {isAdmin && isLocked && (
                                            <button
                                               onClick={() => handleUnlockForm(f)}
                                               className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100"
                                               title="Unlock Form"
                                            >
                                               <Lock size={16}/>
                                            </button>
                                         )}

                                         <button
                                            onClick={() => setSelectedSubmission(f)}
                                            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                                            title="View Submission"
                                         >
                                            <Eye size={16}/>
                                         </button>
                                         <button
                                            onClick={async () => {
                                                try {
                                                    let def = formDefinitions?.find(d => d.key === f.formKey);
                                                    if (!def) {
                                                        const fetchedDef = await formDefinitionsService.getByKey(f.formKey);
                                                        if (fetchedDef) def = fetchedDef;
                                                    }
                                                    if (def && project) {
                                                       await downloadFormPDF(f, def, allUsers, project);
                                                    }
                                                } catch (e) {
                                                    console.error("Download failed", e);
                                                    alert("Could not generate PDF.");
                                                }
                                            }}
                                            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                                            title="Download PDF"
                                         >
                                            <Download size={16}/>
                                         </button>
                                         {isAdmin && (
                                           <button
                                              onClick={() => handleDeleteForm(f)}
                                              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                                              title="Delete Form"
                                           >
                                              <Trash2 size={16}/>
                                           </button>
                                         )}
                                      </div>
                                   </div>
                                </div>
                              </div>
                             );
                          })
                        )}
                    </div>
                  </div>

                  {/* Closing Requirements */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Closing Requirements</span>
                      <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>

                    {visibleDocs.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center">
                          <FileText size={48} className="text-slate-300 mx-auto mb-4" />
                          <h4 className="font-bold text-slate-900 mb-1">No Requirements Found</h4>
                          <p className="text-slate-500 text-sm">There are no document requirements configured for this project type.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {visibleDocs.map(rd => {
                            const isPublicDoc = !rd.visibility || rd.visibility === 'public';
                            const providedParticipants = rd.participants.filter((p: any) => p.isProvided && (p.url || p.fileId));
                            const viewerDocs = providedParticipants
                                .filter((p: any) => isAdmin || isPublicDoc || p.user?.id === user.id || p.user?.$id === user.id)
                                .map((p: any) => ({
                                fileId: p.fileId,
                                url: p.url,
                                documentType: p.documentType,
                                title: `${p.role} - ${rd.title}`,
                                role: p.role,
                                name: p.name
                            }));

                            return (
                            <div key={rd.$id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:border-indigo-200 transition-all group">
                               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                  <div className="flex items-start gap-4 flex-1">
                                     <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:scale-110 transition-transform">
                                        <FileText size={24} />
                                     </div>
                                     <div className="min-w-0">
                                        <h4 className="font-bold text-slate-900 text-lg truncate mb-1">{rd.title}</h4>
                                        <p className="text-sm text-slate-500 line-clamp-1">Mandatory document for property transfer.</p>
                                     </div>
                                  </div>

                                  <div className="flex flex-wrap gap-3 items-center">
                                    {rd.participants.map((p: any) => (
                                       <div key={p.role} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${p.isProvided ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                          <div className="relative shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                                              {p.user?.avatar ? <img src={p.user.avatar} className="w-full h-full object-cover" alt="avatar" /> : <UserIcon size={14} className="text-slate-400" />}
                                            </div>
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${p.isProvided ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                          </div>

                                          <div className="min-w-[80px]">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">{p.role}</div>
                                            <div className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{p.user?.name || 'Pending...'}</div>
                                          </div>

                                          {p.isProvided && p.providedAt ? (
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] font-bold text-emerald-600 bg-white px-1.5 py-0.5 rounded shadow-sm">
                                                  {new Date(p.providedAt).toLocaleDateString('en-GB')}
                                                </div>
                                                {(isAdmin || p.user?.id === user.id || p.user?.$id === user.id) && (
                                                    <button
                                                         onClick={() => handleUndoRequirement(p.fileId)}
                                                         className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors"
                                                         title="Delete Upload"
                                                     >
                                                         <X size={12} />
                                                     </button>
                                                )}
                                            </div>
                                          ) : (
                                            <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shadow-sm">
                                              Waiting
                                            </div>
                                          )}
                                       </div>
                                    ))}

                                    {/* Actions */}
                                    <div className="flex gap-2 ml-2 pl-2 border-l border-slate-100 transition-opacity">
                                       {viewerDocs.length > 0 && (
                                           <React.Fragment>
                                              <button
                                                onClick={() => handleOpenViewer(viewerDocs, rd.title)}
                                                className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                                                title="View Documents"
                                              >
                                                <Eye size={16} />
                                              </button>

                                              <button
                                                 onClick={() => {
                                                    if (viewerDocs[0]?.url) window.open(viewerDocs[0].url, '_blank');
                                                 }}
                                                 className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                                                 title="Download Document"
                                              >
                                                <Download size={16} />
                                              </button>

                                              {isAdmin && (
                                                <button
                                                   onClick={() => handleDeleteRequirement(viewerDocs.map((d: any) => d.fileId))}
                                                   className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                                                   title="Delete All Documents"
                                                >
                                                   <Trash2 size={16} />
                                                </button>
                                              )}
                                           </React.Fragment>
                                       )}
                                    </div>
                                  </div>
                               </div>
                            </div>
                            );
                          })}
                        </div>
                    )}
                  </div>
                    </React.Fragment>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'property' && project && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {/* General Information Section */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                         <Home size={20} className="text-indigo-600" /> General Information
                      </h2>
                      {isAdmin && (
                        <button
                          onClick={() => { setShowGeneralInfoModal(true); setTempAddress(project.property.address); }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all shadow-sm"
                        >
                            <Edit2 size={12} /> Edit Details
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-50">
                      <div className="p-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Title</p>
                        <p className="text-sm font-bold text-slate-900">{project.title}</p>
                      </div>
                      <div className="p-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</p>
                        <p className="text-sm font-bold text-slate-900">{project.property.address}</p>
                      </div>
                      <div className="p-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price</p>
                        <p className="text-sm font-black text-blue-600">${(project.property.price || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference Number</p>
                        <p className="text-sm font-bold text-slate-900">{project.referenceNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Property Description */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                         <FileText size={20} className="text-blue-600" /> Property Overview
                      </h2>
                      {isAdmin && editingField !== 'description' && (
                        <button
                          onClick={() => { setEditingField('description'); setEditValue(project.property.description); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Edit Description"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>

                    {isAdmin && editingField === 'description' ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <textarea
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingField(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                          <button
                            onClick={() => handleSaveInlineField('description', editValue)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2"
                          >
                            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16}/>}
                            Save Description
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">{project.property.description || 'No description provided for this property.'}</p>
                    )}

                    {/* Handover Date Section */}
                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Clock size={20} className="text-orange-500" />
                          <h3 className="font-bold text-slate-900">Project Handover Date</h3>
                        </div>
                        {isAdmin && editingField !== 'handover_date' && (
                          <button
                            onClick={() => { setEditingField('handover_date'); setEditValue(project.handover_date ? new Date(project.handover_date).toISOString().split('T')[0] : ''); }}
                            className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                            title="Edit Handover Date"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>

                      {isAdmin && editingField === 'handover_date' ? (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                          <input
                            type="date"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <button
                            onClick={() => handleSaveInlineField('handover_date', editValue)}
                            disabled={isProcessing}
                            className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
                          >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18}/>}
                          </button>
                          <button onClick={() => setEditingField(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"><X size={18}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                           <div className="px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-xs font-bold ring-1 ring-orange-100">
                             {project.handover_date ? new Date(project.handover_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'NOT SCHEDULED'}
                           </div>
                           {!project.handover_date && isAdmin && (
                             <button
                               onClick={() => { setEditingField('handover_date'); setEditValue(''); }}
                               className="text-xs font-bold text-blue-600 hover:underline"
                             >
                               Set Date
                             </button>
                           )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Property Specs */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <h3 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
                         Property Specifications
                       </h3>
                       {isAdmin && (
                         <button
                           onClick={() => setShowBulkSpecsModal(true)}
                           className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all shadow-sm"
                         >
                            <Edit2 size={12} /> Edit All
                         </button>
                       )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                      {/* Bedrooms */}
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
                        <Bed className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
                        <p className="text-xl font-black text-slate-900">{project.property.bedrooms || 0}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bedrooms</p>
                      </div>

                      {/* Bathrooms */}
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
                        <Bath className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
                        <p className="text-xl font-black text-slate-900">{project.property.bathrooms || 0}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bathrooms</p>
                      </div>

                      {/* Living Area */}
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
                        <Maximize2 className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
                        <p className="text-xl font-black text-slate-900">{(project.property.livingArea || 0).toLocaleString()} <span className="text-[10px] font-bold">m²</span></p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Living Area</p>
                      </div>

                      {/* Plot Size */}
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
                        <Square className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
                        <p className="text-xl font-black text-slate-900">{(project.property.sqft || 0).toLocaleString()} <span className="text-[10px] font-bold">m²</span></p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Plot Size</p>
                      </div>

                      {/* Build Year */}
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
                        <Calendar className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
                        <p className="text-xl font-black text-slate-900">{project.property.buildYear || 'TBD'}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Build Year</p>
                      </div>

                      {/* Garages */}
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
                        <Car className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
                        <p className="text-xl font-black text-slate-900">{project.property.garages || 0}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Garages</p>
                      </div>
                    </div>
                  </div>

                  {/* Image Gallery */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                       <h3 className="font-bold text-slate-900">Property Gallery</h3>
                       <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">
                         {project.property.images?.length || 0} Assets
                       </span>
                    </div>
                    {project.property.images && project.property.images.length > 0 ? (
                      <div className="relative group bg-slate-950 flex items-center justify-center p-4">
                        <div className="relative w-full max-w-4xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl">
                          <img
                            src={project.property.images[currentImageIndex] ? projectService.getImagePreview(project.property.images[currentImageIndex]) : ''}
                            alt="Property"
                            className="w-full h-full object-cover"
                          />

                          {project.property.images.length > 1 && (
                            <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={prevImage}
                                className="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full p-3 shadow-lg transition-all"
                              >
                                <ChevronLeft size={24} />
                              </button>
                              <button
                                onClick={nextImage}
                                className="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full p-3 shadow-lg transition-all"
                              >
                                <ChevronRight size={24} />
                              </button>
                            </div>
                          )}

                          <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                            {currentImageIndex + 1} / {project.property.images.length}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-300">
                        <ImageIcon size={64} className="mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">No gallery images uploaded</p>
                      </div>
                    )}

                    {/* Thumbnail Strip */}
                    {project.property.images && project.property.images.length > 0 && (
                      <div className="p-4 bg-slate-50 flex gap-3 overflow-x-auto no-scrollbar">
                        {project.property.images.map((img, idx) => (
                          <button
                            key={img}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`relative min-w-[100px] h-[60px] rounded-xl overflow-hidden border-2 transition-all ${
                              currentImageIndex === idx ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                             <img src={projectService.getImagePreview(img)} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Neighborhood Insights (AIGround) */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                           <MapIcon size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Area & Neighborhood</h3>
                      </div>
                      <button
                        onClick={fetchLocationInsights}
                        disabled={isLoadingLocation}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                      >
                         {isLoadingLocation ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                         {locationInsights ? 'Update Insights' : 'Analyze Neighborhood'}
                      </button>
                    </div>

                    {locationInsights ? (
                      <div className="animate-in fade-in slide-in-from-top-4">
                        <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-line mb-8">{locationInsights.text}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {locationInsights.links.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-300 hover:bg-white transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                  <MapPin size={14} />
                                </div>
                                <span className="text-xs font-bold text-slate-700">{link.title}</span>
                              </div>
                              <ChevronRight size={14} className="text-slate-300" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                         <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-slate-400">
                           <MapIcon size={32} />
                         </div>
                         <h4 className="font-bold text-slate-900 mb-2">No Area Data Loaded</h4>
                         <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Click the button above to generate AI-powered insights about schools, amenities, and market trends for this neighborhood.</p>
                      </div>
                    )}
                  </div>
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
              )}

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
          documents={viewerDocs}
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
                    <option value="General">General</option>
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

      {showFormEditor && (
        <FormEditor projectId={project.id} onClose={() => setShowFormEditor(false)} onCreated={(s) => setForms(prev => [s, ...prev])} />
      )}

      {selectedSubmission && (
        <FormRenderer
          submission={selectedSubmission}
          user={user}
          allUsers={allUsers}
          project={project}
          onClose={() => setSelectedSubmission(null)}
          onUpdate={(updated) => {
            setForms(prev => prev.map(f => f.id === updated.id ? updated : f));
          }}
        />
      )}

      {isAssigningForm && selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">Assign {selectedTemplate.title}</h3>
              <button onClick={() => setIsAssigningForm(false)} className="p-2 text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">Select a user to assign this form to. This will create a pending submission for them to fill out.</p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {allUsers
                  .filter(u => u.id === project.sellerId || u.id === project.buyerId || u.id === project.managerId)
                  .map(u => (
                    <button
                      key={u.id}
                      onClick={() => executeFormAssignment(selectedTemplate, u.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all text-left group"
                    >
                      <img src={u.avatar} className="w-10 h-10 rounded-full" alt="" />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-900">{u.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">{u.role}</div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </button>
                  ))}
              </div>
            </div>
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

export default ProjectDetail;
