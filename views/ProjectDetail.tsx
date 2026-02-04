import { ID } from 'appwrite';
import {
  ArrowLeft,
  Check,
  X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import DocumentViewer from '../components/DocumentViewer';
import FormEditor from '../components/FormEditor';
import FormRenderer from '../components/FormRenderer';

import { AIModal, AddTaskModal, AssignFormModal, BulkSpecsModal, FormTemplatePickerModal, GeneralInfoModal, InviteModal, ProjectDocuments, ProjectHeader, ProjectOverview, ProjectProperty, ProjectTabBar, ProjectTeam, SigningModal, TaskLibraryModal, TemplatePickerModal } from '../components/project';
import { COLLECTIONS, DATABASE_ID, client, databases, inviteService, profileService, projectFormsService, projectService } from '../services/appwrite';
import { documentService } from '../services/documentService';
import { formDefinitionsService } from '../services/formDefinitionsService';
import type { GroundingLink } from '../services/geminiService';
import { GeminiService } from '../services/geminiService';
import type { Contract, ContractTemplate, FormDefinition, FormSubmission, Project, ProjectTask, TaskTemplate, User, UserDocumentDefinition } from '../types';
import { ContractStatus, UserRole } from '../types';
import { downloadContractPDF, downloadFormPDF } from '../utils/pdfGenerator';
import { useSettings } from '../utils/useSettings';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [locationInsights, setLocationInsights] = useState<{ text: string, links: GroundingLink[] } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);


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
                  documentType = file.mimeType;
                  if (!item.name) item.name = file.name;
                  downloadUrl = documentService.getFileDownload(fileId);
              } catch(e) {
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

  const fetchTaskTemplates = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES);
      setTaskTemplates(response.documents.map((doc: any) => ({
        id: doc.$id,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        assigneeRoles: doc.assigneeRoles || [],
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
        pTasks.filter(t => t.projectId === id || !t.projectId).forEach(t => {
          const template = taskTemplates.find(tpl => tpl.id === t.taskId);
          tasks.push({
            ...t,
            id: t.taskId,
            title: template?.title || t.taskId,
            description: template?.description,
            role: p.role,
            user: profile,
            userName: profile.name
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

  const handleProjectPropertyUpdate = async (projectId: string, updates: any) => {
    try {
      await projectService.update(projectId, updates);

      // Update local state immediately to reflect changes in UI (e.g. cover image)
      setProjects((prev) => prev.map((p) => {
          if (p.id === projectId) {
              return { ...p, ...updates };
          }
          return p;
      }));

      onRefresh?.();
    } catch (error) {
      console.error("Project property update failed:", error);
      throw error;
    }
  };

  const gemini = new GeminiService();

  useEffect(() => {
    if (!id) return;
    loadForms();
    const unsubscribe = client.subscribe(`databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`, response => {
      // Chat removed
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
      }
      if (targetUserIds.length > 0) {
        for (const userId of targetUserIds) {
          await executeFormAssignment(def, userId);
        }
      } else {
        setSelectedTemplate(def);
        setIsAssigningForm(true);
      }
    } else {
      setSelectedTemplate(def);
      setIsAssigningForm(true);
    }
  };

  const executeFormAssignment = async (def: FormDefinition, targetProfileId: string) => {
    if (!id || !project) return;
    try {
      setIsLoadingForms(true);
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

      if (def.autoCreateTaskForAssignee) {
        const newTask: ProjectTask = {
          id: ID.unique(),
          title: `Fill out form: ${def.title}`,
          description: `Please complete the ${def.title} form as requested.`,
          category: 'Legal',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          completed: false,
          notifyAssignee: true,
          notifyAgentOnComplete: true
        };
        const updatedTasks = [...project.tasks, newTask];
        await projectService.update(id, { tasks: JSON.stringify(updatedTasks) });
        await profileService.assignTask(targetProfileId, newTask.id, {
          title: newTask.title,
          description: newTask.description,
          dueDate: newTask.dueDate,
          projectId: id,
          status: 'PENDING'
        });
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
    const contractToSign = contracts.find(c => c.id === signingContractId);
    if (!contractToSign) return;
    try {
      const updatedSignedBy = Array.from(new Set([...contractToSign.signedBy, user.id]));
      const allSigned = contractToSign.assignees.every(id => updatedSignedBy.includes(id));
      const newStatus = allSigned ? ContractStatus.SIGNED : contractToSign.status;
      const newSignatureData = { ...(contractToSign.signatureData || {}), [user.id]: dataUrl };
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.CONTRACTS, signingContractId, {
        signedBy: updatedSignedBy,
        status: newStatus,
        signatureData: JSON.stringify(newSignatureData)
      });
      setContracts(prev => prev.map(c => {
        if (c.id === signingContractId) {
          return { ...c, signedBy: updatedSignedBy, status: newStatus, signatureData: newSignatureData };
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
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    if (contract.status === ContractStatus.SIGNED && !isAdmin) {
       alert('This contract is finalized and locked.');
       return;
    }
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

  const handleAddTask = async (taskData: Partial<ProjectTask>) => {
    if (!project || !id) return;
    try {
      const newTask: ProjectTask = {
        id: ID.unique(),
        title: taskData.title as string,
        description: taskData.description || '',
        category: taskData.category as any,
        dueDate: taskData.dueDate as string,
        completed: false,
        notifyAssignee: taskData.notifyAssignee ?? true,
        notifyAgentOnComplete: taskData.notifyAgentOnComplete ?? true
      };
      const updatedTasks = [...project.tasks, newTask];
      await projectService.update(id, { tasks: JSON.stringify(updatedTasks) });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, tasks: updatedTasks } : p));
      setIsAddTaskModalOpen(false);
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
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
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

  const handleSendInvite = async (data: { name: string, email: string, role: string }) => {
    if (!id) return;
    try {
      await inviteService.create({
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role as any,
        projectId: id,
        invitedBy: user.id
      });
      setShowInviteModal(false);
      alert(`Invitation sent to ${data.email}`);
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Failed to send invitation');
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

      <ProjectHeader
        project={project}
        projectStatusData={projectStatusData}
        showActionMenu={showActionMenu}
        setShowActionMenu={setShowActionMenu}
        fetchInsights={fetchInsights}
        setShowFormTemplatePicker={setShowFormTemplatePicker}
        setShowTemplatePicker={setShowTemplatePicker}
        setIsTaskLibraryOpen={setIsTaskLibraryOpen}
        setActiveTab={setActiveTab}
        setShowGeneralInfoModal={setShowGeneralInfoModal}
      />

      {/* Breadcrumb and Editable Title Header - kept for navigation structure outside the unified header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4 px-2">
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
                  <button onClick={() => handleSaveInlineField('title', editValue)} className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shrink-0"><Check size={18}/></button>
                  <button onClick={() => setEditingField(null)} className="p-2.5 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all shrink-0"><X size={18}/></button>
                </div>
              ) : (
                <div className="group flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-500 truncate">{project.title} <span className="text-slate-300 text-sm font-normal ml-2">Detail View</span></h1>
                </div>
              )}
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
         <ProjectTabBar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />

         <div className="p-8">
            {activeTab === 'overview' && (
               <ProjectOverview
                  project={project}
                  projectStatusData={projectStatusData}
                  seller={seller}
                  buyer={buyer}
                  agent={agent}
                  handleApproveDoc={handleApproveDoc}
                  handleRejectDoc={handleRejectDoc}
               />
            )}

            {activeTab === 'property' && (
               <ProjectProperty
                  project={project}
                  isAdmin={isAdmin}
                  setShowGeneralInfoModal={setShowGeneralInfoModal}
                  setTempAddress={setTempAddress}
                  setShowBulkSpecsModal={setShowBulkSpecsModal}
                  isLoadingLocation={isLoadingLocation}
                  locationInsights={locationInsights}
                  fetchLocationInsights={fetchLocationInsights}
                  onUpdateProject={handleProjectPropertyUpdate}
               />
            )}

            {activeTab === 'documents' && (
               <ProjectDocuments
                  projectContracts={projectContracts}
                  forms={forms}
                  projectStatusData={projectStatusData}
                  allUsers={allUsers}
                  isAdmin={isAdmin}
                  user={user}
                  project={project}
                  formDefinitions={formDefinitions}
                  isGenerating={isGenerating}
                  isSyncing={isSyncing}
                  setShowTemplatePicker={setShowTemplatePicker}
                  setShowFormEditor={setShowFormEditor}
                  handleSyncDocs={handleSyncDocs}
                  handleUndoContractSignature={handleUndoContractSignature}
                  setSigningContractId={setSigningContractId}
                  handleUnlockContract={handleUnlockContract}
                  handleToggleVisibility={handleToggleVisibility}
                  handleDeleteContract={handleDeleteContract}
                  downloadContractPDF={downloadContractPDF}
                  handleUndoForm={handleUndoForm}
                  handleUnlockForm={handleUnlockForm}
                  setSelectedSubmission={setSelectedSubmission}
                  handleDeleteForm={handleDeleteForm}
                  downloadFormPDF={downloadFormPDF}
                  handleUndoRequirement={handleUndoRequirement}
                  handleOpenViewer={handleOpenViewer}
                  handleDeleteRequirement={handleDeleteRequirement}
               />
            )}

            {activeTab === 'team' && isAdmin && (
               <ProjectTeam
                  project={project}
                  seller={seller}
                  buyer={buyer}
                  agent={agent}
                  allUsers={allUsers}
                  defaultAgentId={defaultAgentId}
                  onSwitchUser={onSwitchUser}
                  assignUser={assignUser}
                  setShowInviteModal={setShowInviteModal}
               />
            )}
         </div>
      </div>

      {/* --- Rest of the Modals --- */}
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

      <TaskLibraryModal
        isOpen={isTaskLibraryOpen}
        onClose={() => setIsTaskLibraryOpen(false)}
        taskTemplates={taskTemplates}
        onSelectTemplate={addFromTemplate}
      />

      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onAdd={handleAddTask}
      />

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

      <AssignFormModal
        isOpen={isAssigningForm}
        selectedTemplate={selectedTemplate}
        onClose={() => setIsAssigningForm(false)}
        onAssign={executeFormAssignment}
        project={project}
        allUsers={allUsers}
      />

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleSendInvite}
      />

      <SigningModal
        isOpen={!!signingContractId}
        onClose={() => setSigningContractId(null)}
        contract={projectContracts.find(c => c.id === signingContractId) || null}
        onSign={handleSignContract}
        user={user}
        allUsers={allUsers}
      />

      <GeneralInfoModal
        isOpen={showGeneralInfoModal}
        project={project!}
        onClose={() => setShowGeneralInfoModal(false)}
        onSave={handleSaveGeneralInfo}
        isProcessing={isProcessing}
        googleApiKey={googleApiKey}
        tempAddress={tempAddress}
        setTempAddress={setTempAddress}
      />

      <BulkSpecsModal
        isOpen={showBulkSpecsModal}
        project={project!}
        onClose={() => setShowBulkSpecsModal(false)}
        onSave={handleSaveBulkSpecs}
        isProcessing={isProcessing}
      />

      <TemplatePickerModal
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        templates={templates}
        onGenerate={handleGenerateContract}
      />

      <FormTemplatePickerModal
        isOpen={showFormTemplatePicker}
        onClose={() => setShowFormTemplatePicker(false)}
        isLoading={isLoadingForms}
        formDefinitions={formDefinitions}
        onSelect={handleTemplateAssignmentClick}
      />

      <AIModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        aiInsight={aiInsight}
      />

    </div>
  );
};

export default ProjectDetail;
