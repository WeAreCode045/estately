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
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileSignature,
  FileText,
  FormInput,
  Globe,
  History,
  Home,
  Lock,
  Mail,
  Map,
  MessageSquare,
  Phone,
  RefreshCcw,
  Shield,
  Square,
  Trash2,
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
import { COLLECTIONS, DATABASE_ID, contractService, databases, profileService, projectFormsService, projectService } from '../services/appwrite';
import { documentService } from '../services/documentService';
import { formDefinitionsService } from '../services/formDefinitionsService';
import type { Contract, FormSubmission, Project, TaskTemplate, User } from '../types';
import { ContractStatus, UserRole } from '../types';
import { downloadContractPDF, downloadFormPDF } from '../utils/pdfGenerator';

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
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'notifications' | 'timeline'>('documents');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [requiredDocs, setRequiredDocs] = useState<any[]>([]);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<FormSubmission | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string, title: string } | null>(null);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerDocs, setViewerDocs] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false); // Placeholder for copied view
  const [showFormEditor, setShowFormEditor] = useState(false); // Placeholder
  const [isGenerating, setIsGenerating] = useState(false); // Placeholder
  const [formDefinitions, setFormDefinitions] = useState<any[]>([]);

  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.AGENT;

  // Filter to only projects where user is seller, buyer or manager
  const visibleProjects = (projects || []).filter(
    p => p.sellerId === user.id || p.buyerId === user.id ||
         p.sellerId === user.$id || p.buyerId === user.$id ||
         p.managerId === user.id || p.managerId === user.$id
  );

  // Focus on the first matching project for the personal dashboard
  const userProject = visibleProjects[0] || null;

  const projectStatusData = React.useMemo(() => {
    if (!userProject) return { tasks: [], docs: [] };

    const participants = [
      { role: 'SELLER' as UserRole, id: userProject.sellerId },
      { role: 'BUYER' as UserRole, id: userProject.buyerId }
    ];

    const tasks: any[] = [];
    const docsFound: any[] = [];

    participants.forEach(p => {
      if (!p.id) return;
      const profile = allUsers.find(u => u.id === p.id);
      if (profile) {
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
            (role.toLowerCase() === 'seller' && user.id === userProject.sellerId) ||
            (role.toLowerCase() === 'buyer' && user.id === userProject.buyerId)
          );
          // Match by definition ID and project scope
          const log = docsFound.find(df =>
            df.userDocumentDefinitionId === (rd as any).$id &&
            df.user.id === u?.id &&
            (df.projectId === userProject.id)
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

    return { tasks, docs: combinedDocs };
  }, [allUsers, userProject, requiredDocs]);

  const handleOpenViewer = async (provided: any | any[], title?: string) => {
    try {
      if (Array.isArray(provided)) {
         // Resolve all
         const resolved = await Promise.all(provided.map(async (doc) => {
             if (doc.url) return doc;
             if (doc.fileId) {
                try {
                    const file = await documentService.getFile(doc.fileId);
                    const isImage = file.mimeType.startsWith('image/');
                    const url = isImage ? documentService.getFilePreview(doc.fileId) : documentService.getFileView(doc.fileId);
                    return { ...doc, url, documentType: file.mimeType, name: file.name };
                } catch(e) {
                    const url = await documentService.getFileUrl(doc.fileId);
                    return { ...doc, url };
                }
             }
             return doc;
         }));
         setViewerDocs(resolved);
      } else {
        if (provided.url) {
           setViewerDocs([{ ...provided, title: title || provided.title || 'Document' }]);
        } else if (provided.fileId) {
           try {
               const file = await documentService.getFile(provided.fileId);
               const isImage = file.mimeType.startsWith('image/');
               const url = isImage ? documentService.getFilePreview(provided.fileId) : documentService.getFileView(provided.fileId);
               setViewerDocs([{ ...provided, url, title: title || provided.title || 'Document', documentType: file.mimeType, name: file.name }]);
           } catch(e) {
               const url = await documentService.getFileUrl(provided.fileId);
               setViewerDocs([{ ...provided, url, title: title || provided.title || 'Document' }]);
           }
        }
      }
      // setSelectedDocument({ url: '', title: '' }); // REMOVED to prevent double modal opening
    } catch (e) {
      console.error('Error opening viewer:', e);
      alert('Could not load document for viewing.');
    }
  };

  const handleUndoRequirement = async (fileId: string) => {
    if (!isAdmin) {
      // Permission Check: Ensure user owns this document
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
        // Since we don't have direct access to refresh the parent props easily unless passed,
        // we might strictly rely on onRefresh or re-fetch locally.
        // For UserDashboard, we have a local fetch in useEffect. We should trigger it.
        // We can check if we need to call the fetch function again.
        // For now, let's assume onRefresh handles it or we update local state if possible.
    } catch (error) {
        console.error("Failed to undo upload:", error);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleUndoContractSignature = async (contractId: string, userId: string) => {
    // 1. Check Locked Status
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    // If fully signed, it is locked (unless admin unlocks it later)
    if (contract.status === ContractStatus.SIGNED && !isAdmin) {
       alert('This contract is finalized and locked. Contact an admin to unlock it.');
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
     // 1. Check Locked Status
     let meta: any = {};
     try { meta = typeof form.meta === 'string' ? JSON.parse(form.meta) : (form.meta || {}); } catch(e){}
     const signatures = meta.signatures || {};
     const needsSeller = meta.needsSignatureFromSeller === true || meta.needsSignatureFromSeller === 'true';
     const needsBuyer = meta.needsSignatureFromBuyer === true || meta.needsSignatureFromBuyer === 'true';
     const allSigned = (!needsSeller || signatures.seller) && (!needsBuyer || signatures.buyer);

     // If complete and all signed, it is locked
     if ((form.status === 'completed' || form.status === 'closed' || allSigned) && !isAdmin) {
        alert('This form is finalized and locked. Contact an admin to unlock it.');
        return;
     }

     // 2. Permission Check
     const isSeller = user.id === userProject?.sellerId || user.$id === userProject?.sellerId;
     const isBuyer = user.id === userProject?.buyerId || user.$id === userProject?.buyerId;
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

             await projectFormsService.update(form.id, updates);
             setForms(prev => prev.map(f => f.id === form.id ? { ...f, ...updates, meta: updates.meta || f.meta } : f));
         }
     } catch (e) {
         console.error("Undo form failed", e);
     }
  };

  const handleSyncDocs = async () => {
    setIsSyncing(true);
    try {
      if (userProject) {
        await documentService.autoProvisionDocuments(userProject.id, userProject);
        alert('Missing document assignments synced successfully.');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error syncing documents:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!isAdmin || !confirm('Delete this contract?')) return;
    try {
        await contractService.delete(contractId);
        setContracts(prev => prev.filter(c => c.id !== contractId));
    } catch(e) { console.error(e); }
  };

  const handleDeleteForm = async (f: any) => {
    if (!isAdmin || !confirm('Delete this form?')) return;
    try {
        await projectFormsService.delete(f.id);
        setForms(prev => prev.filter(form => form.id !== f.id));
    } catch(e) { console.error(e); }
  };

  const handleDeleteRequirement = async (fileIds: string[]) => {
      // Re-use logic or implement separate
      // Ideally reuse handleUndoRequirement logic but loop it
      if (!isAdmin || !confirm('Delete these documents?')) return;
      try {
        await Promise.all(fileIds.map(fid => documentService.deleteDocument(fid)));
        // Refresh handled by caller or refresh generic
        if (onRefresh) onRefresh();
      } catch (e) { console.error(e); }
  };

  // Fetch additional data
  useEffect(() => {
    if (userProject) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [contractsRes, formsRes, reqDocsRes, defsRes] = await Promise.all([
            contractService.listByProject(userProject.id),
            projectFormsService.listByProject(userProject.id),
            documentService.listDefinitions(),
            formDefinitionsService.list()
          ]);
          setContracts((contractsRes.documents as any) || []);
          setForms(formsRes.items || []);
          setRequiredDocs(reqDocsRes.documents);
          setFormDefinitions(defsRes || []);
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [userProject]);

  useEffect(() => {
    if (signingContract) {
      setShowSignaturePad(false);
    }
  }, [signingContract]);



  const handleUnlockContract = async (contract: Contract) => {
    if (!isAdmin) return;
    if (!confirm('Unlock this contract? It will be editable and signatures may be invalidated.')) return;
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
    // We assume setting back to submitted (allows editing only incomplete parts? or triggers re-sign?)
    // Actually, unlocking usually means allowing edits. So maybe back to 'submitted' or 'assigned'.
    // If it was 'closed', make it 'submitted'.
    try {
        await projectFormsService.update(form.id, { status: 'submitted' });
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
      let definitionId = 'general';

      // Check if it's a virtual task for a required document
      if (uploadingTaskId && uploadingTaskId.startsWith('req_doc_')) {
        definitionId = uploadingTaskId.replace('req_doc_', '');
      } else {
        // Find matching required doc definition from explicit assigned tasks
        const task = (user.assignedTasks || []).find((at: any) => at.taskId === uploadingTaskId);
        const matchTitlePrefix = "Upload Document: ";
        const docTitle = task?.title?.replace(matchTitlePrefix, "");
        const reqDoc = requiredDocs.find(d => d.title === docTitle);
        if (reqDoc) definitionId = reqDoc.$id || reqDoc.id;
      }

      await documentService.uploadDocument(profileId, definitionId, userProject.id, file);

      if (onRefresh) onRefresh();
      // Optimistically update local state if needed, or rely on refresh
      alert('Document uploaded successfully!');
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
      setActiveTab('documents');
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
          const taskTitle = template?.title || at.title || at.taskId || 'Untitled Task';

          // Heuristic to check if work is actually done even if task status isn't updated
          let heuristicCompleted = false;

          // Check if it's a form task
          if (taskTitle.startsWith('Fill out form: ')) {
            const formTitle = taskTitle.replace('Fill out form: ', '').trim();
            const matchingForm = forms.find(f => f.title === formTitle);
            if (matchingForm && (matchingForm.status === 'submitted' || matchingForm.status === 'completed' || matchingForm.status === 'closed')) {
              heuristicCompleted = true;
            }
          }

          // Check if it's a document upload task
          if (taskTitle.startsWith('Upload Document: ')) {
            const docTitle = taskTitle.replace('Upload Document: ', '').trim();
            const docDef = requiredDocs.find(d => d.title === docTitle);
            if (docDef) {
               const hasUploaded = (user.userDocuments || []).some((ud: any) =>
                 ud.userDocumentDefinitionId === docDef.$id || ud.userDocumentDefinitionId === docDef.id
               );
               if (hasUploaded) heuristicCompleted = true;
            }
          }

          return {
            ...at,
            id: at.id || at.taskId || `task_${Math.random()}`,
            taskId: at.taskId,
            title: taskTitle,
            completed: at.status === 'COMPLETED' || heuristicCompleted,
            type: 'task',
            assignedAt: at.assignedAt || new Date().toISOString()
          };
        }),

        // 2. Forms assigned to the user
        ...forms
        .filter(f => (
          f.assignedToUserId === user.id ||
          f.assignedToUserId === user.$id ||
          f.assignedToUserId === user.userId
        ))
        .map(f => {
          let meta: any = {};
          try {
            meta = typeof f.meta === 'string' ? JSON.parse(f.meta) : (f.meta || {});
          } catch (e) {}

          const needsSeller = meta.needsSignatureFromSeller === true || meta.needsSignatureFromSeller === 'true' || meta.needSignatureFromSeller === true || meta.needSignatureFromSeller === 'true';
          const needsBuyer = meta.needsSignatureFromBuyer === true || meta.needsSignatureFromBuyer === 'true' || meta.needSignatureFromBuyer === true || meta.needSignatureFromBuyer === 'true';
          const signatures = meta.signatures || {};

          const userId = user.id || user.$id;
          const userAuthId = user.userId;

          const isUserSeller = (userId && userId === userProject?.sellerId) || (userAuthId && userAuthId === userProject?.sellerId);
          const isUserBuyer = (userId && userId === userProject?.buyerId) || (userAuthId && userAuthId === userProject?.buyerId);

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
        }),

        // 4. Missing Document Uploads (Virtual Tasks)
        ...requiredDocs
        .filter(docDef => {
             // Determine user role
             const isSeller = user.id === userProject.sellerId || user.$id === userProject.sellerId;
             const isBuyer = user.id === userProject.buyerId || user.$id === userProject.buyerId;

             // Check relevance
             if (docDef.autoAssignTo && docDef.autoAssignTo.length > 0) {
               const roles = docDef.autoAssignTo.map((r: string) => r.toUpperCase());
               if (isSeller && !roles.includes('SELLER')) return false;
               if (isBuyer && !roles.includes('BUYER')) return false;
             }

             // Check if explicit task already exists (to avoid duplicates)
             const existingTask = (user.assignedTasks || []).some((t: any) => t.title === `Upload Document: ${docDef.title}`);
             if (existingTask) return false;

             return true;
        })
        .map(docDef => {
             const uploaded = (user.userDocuments || []).some((ud: any) =>
               ud.userDocumentDefinitionId === docDef.$id || ud.userDocumentDefinitionId === docDef.id
             );

             return {
                id: `req_doc_${docDef.$id}`,
                taskId: `req_doc_${docDef.$id}`,
                title: `Upload Document: ${docDef.title}`,
                completed: uploaded,
                type: 'document-upload',
                assignedAt: userProject.createdAt || new Date().toISOString(),
                data: docDef
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

      case 'documents':
        // Filter visible items based on visibility settings + user role + assignments
        const visibleContracts = contracts.filter(c =>
          isAdmin ||
          !c.visibility || c.visibility === 'public' ||
          (c.assignees?.some(id => id === user.id || id === user.$id))
        );

        const visibleForms = forms.filter(f => {
            if (isAdmin) return true;
            if (f.assignedToUserId === user.id || f.assignedToUserId === user.$id) return true;
            // Lookup Definition Visibility
            const def = formDefinitions?.find((d:any) => d.key === f.formKey);
            // Default to public if not specified
            if (!def || !def.visibility || def.visibility === 'public') return true;

            const metaStr = typeof f.meta === 'string' ? f.meta : JSON.stringify(f.meta || {});
            if ((userProject?.sellerId === user.id || userProject?.sellerId === user.$id) && metaStr.includes('seller')) return true; // Loose check
            if ((userProject?.buyerId === user.id || userProject?.buyerId === user.$id) && metaStr.includes('buyer')) return true; // Loose check
            return false;
        });

        const visibleDocs = projectStatusData.docs.filter(rd => {
            const def: any = rd;
            const isPublic = !def.visibility || def.visibility === 'public';
            const isParticipant = rd.participants.some((p: any) => p.user?.id === user.id || p.user?.$id === user.id || p.user?.userId === user.id);
            return isAdmin || isPublic || isParticipant;
        });

        return (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Document Vault</h3>
                      <p className="text-xs text-slate-500">Unified repository for Contracts, Forms, and Property Requirements.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => setShowTemplatePicker(true)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                            disabled={isGenerating}
                          >
                            <FileSignature size={16} />
                            Contract Builder
                          </button>
                          <button
                            onClick={() => setShowFormEditor(true)}
                            className="bg-white text-slate-900 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                          >
                            <FormInput size={16} />
                            Manual Form
                          </button>
                        </>
                      )}
                      <button
                        onClick={handleSyncDocs}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-100 transition-colors"
                        title="Sync Requirements"
                        disabled={isSyncing}
                      >
                        {isSyncing ? <RefreshCcw size={18} className="animate-spin" /> : <History size={18} />}
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
                      {visibleContracts.map(contract => (
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
                                     const isSeller = assigneeId === userProject?.sellerId;
                                     const isBuyer = assigneeId === userProject?.buyerId;
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
                                                 {!isLocked || isAdmin ? (
                                                     <button
                                                        onClick={() => handleUndoContractSignature(contract.id, assigneeId)}
                                                        className={`p-1 rounded text-slate-400 hover:text-red-500 transition-colors ${isLocked ? 'hover:bg-red-50' : 'hover:bg-slate-100'}`}
                                                        title="Undo Signature"
                                                     >
                                                        <X size={12} />
                                                     </button>
                                                 ) : null}
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
                                       <button onClick={() => setSigningContract(contract)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm" title="Sign Contract">
                                          <FileSignature size={16}/>
                                       </button>
                                     )}

                                     {isAdmin && contract.status === ContractStatus.SIGNED && (
                                        <button onClick={() => handleUnlockContract(contract)} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100" title="Unlock Contract">
                                           <LockIcon size={16}/>
                                        </button>
                                     )}

                                     <button onClick={() => setSigningContract(contract)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200" title="View Contract">
                                        <Eye size={16}/>
                                     </button>
                                     <button onClick={() => downloadContractPDF(contract, userProject, allUsers)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200" title="Download PDF">
                                        <Download size={16}/>
                                     </button>
                                     {isAdmin && (
                                       <>
                                           <button onClick={() => handleToggleVisibility(contract)} className={`p-2 rounded-xl transition-colors border ${contract.visibility === 'public' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`} title={contract.visibility === 'public' ? 'Make Private' : 'Make Public'}>
                                              {contract.visibility === 'public' ? <Globe size={16}/> : <Shield size={16}/>}
                                           </button>
                                           <button onClick={() => handleDeleteContract(contract.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100" title="Delete Contract">
                                              <Trash2 size={16}/>
                                           </button>
                                       </>
                                     )}
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))}
                      {visibleContracts.length === 0 && (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                           No contracts visible.
                        </div>
                      )}
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
                               const isSeller = assignedUser?.id === userProject?.sellerId;
                               const isBuyer = assignedUser?.id === userProject?.buyerId;
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
                                 const sellerUser = allUsers.find(u => u.id === userProject?.sellerId || u.userId === userProject?.sellerId);
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
                                 const buyerUser = allUsers.find(u => u.id === userProject?.buyerId || u.userId === userProject?.buyerId);
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
                                                     {!isLocked || isAdmin ? (
                                                         <button
                                                             onClick={() => handleUndoForm(f, p.role)}
                                                             className={`p-1 rounded text-slate-400 hover:text-red-500 transition-colors ${isLocked ? 'hover:bg-red-50' : 'hover:bg-slate-100'}`}
                                                             title="Undo Completion"
                                                         >
                                                             <X size={12} />
                                                         </button>
                                                     ) : null}
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
                                               <LockIcon size={16}/>
                                            </button>
                                         )}

                                         <button
                                            onClick={() => setSelectedForm(f)}
                                            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                                            title="View Submission"
                                         >
                                            <Eye size={16}/>
                                         </button>
                                         <button
                                            onClick={async () => {
                                                try {
                                                    let def = null;
                                                    const fetchedDef = await formDefinitionsService.getByKey(f.formKey);
                                                    if (fetchedDef) def = fetchedDef;

                                                    if (def && userProject) {
                                                       await downloadFormPDF(f, def, allUsers, userProject);
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
                          <p className="text-slate-500 text-sm">There are no visible document requirements.</p>
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
                                           <>
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
                                           </>
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
            { id: 'documents', label: 'Overview', icon: Home },
            { id: 'details', label: 'Property Details', icon: Building2 },
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
      {/* Document Viewer Modal */}
      {viewerDocs.length > 0 && (
        <DocumentViewer
          documents={viewerDocs}
          onClose={() => setViewerDocs([])}
          user={user}
        />
      )}


      {/* Form Editor Modal (Admin Only) */}
      {showFormEditor && isAdmin && (
        <div className="fixed inset-0 z-50 bg-white animate-in slide-in-from-bottom-5 duration-300 flex items-center justify-center">
           <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Manual Form Editor</h3>
                  <button onClick={() => setShowFormEditor(false)} className="p-1 hover:bg-slate-50 rounded-full"><X size={18}/></button>
               </div>
               <p className="text-slate-500 text-sm mb-6">
                  Creating new form definitions is only available in the Project Detail view for Managers.
               </p>
               <button onClick={() => setShowFormEditor(false)} className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold">Close</button>
           </div>
        </div>
      )}

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
                  {!showSignaturePad ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                       <button
                         onClick={() => setShowSignaturePad(true)}
                         className="w-full max-w-md bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                       >
                         <FileSignature size={20} />
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

