import { Bot, CheckCircle2, ClipboardList, Clock, Download, Eye, FileText, Globe, History, Loader2, Lock, Plus, Shield, Signature as SignatureIcon, Trash2, User as UserIcon, X } from 'lucide-react';
import React from 'react';
import type { Contract, FormDefinition, FormSubmission, User } from '../../types';
import { ContractStatus } from '../../types';

interface ProjectDocumentsProps {
  // Data
  projectContracts: Contract[];
  forms: FormSubmission[];
  projectStatusData: any;
  allUsers: User[];
  isAdmin: boolean;
  user: User;
  project: any;
  formDefinitions: FormDefinition[];

  // State
  isGenerating: boolean;
  isSyncing: boolean;

  // Actions
  setShowTemplatePicker: (show: boolean) => void;
  setShowFormEditor: (show: boolean) => void;
  handleSyncDocs: () => void;
  handleUndoContractSignature: (contractId: string, userId: string) => void;
  setSigningContractId: (id: string | null) => void;
  handleUnlockContract: (contract: Contract) => void;
  handleToggleVisibility: (contract: Contract) => void;
  handleDeleteContract: (id: string) => void;
  downloadContractPDF: (contract: Contract, project: any, users: User[]) => void;
  handleUndoForm: (form: FormSubmission, role: string) => void;
  handleUnlockForm: (form: FormSubmission) => void;
  setSelectedSubmission: (form: FormSubmission | null) => void;
  handleDeleteForm: (form: FormSubmission) => void;
  downloadFormPDF: (form: FormSubmission, def: FormDefinition, users: User[], project: any) => Promise<void>;
  handleUndoRequirement: (fileId: string) => void;
  handleOpenViewer: (docs: any[], title: string) => void;
  handleDeleteRequirement: (fileIds: string[]) => void;
}

const ProjectDocuments: React.FC<ProjectDocumentsProps> = ({
  projectContracts,
  forms,
  projectStatusData,
  allUsers,
  isAdmin,
  user,
  project,
  formDefinitions,
  isGenerating,
  isSyncing,
  setShowTemplatePicker,
  setShowFormEditor,
  handleSyncDocs,
  handleUndoContractSignature,
  setSigningContractId,
  handleUnlockContract,
  handleToggleVisibility,
  handleDeleteContract,
  downloadContractPDF,
  handleUndoForm,
  handleUnlockForm,
  setSelectedSubmission,
  handleDeleteForm,
  downloadFormPDF,
  handleUndoRequirement,
  handleOpenViewer,
  handleDeleteRequirement
}) => {
  const visibleContracts = projectContracts.filter(c =>
    isAdmin ||
    c.visibility === 'public' ||
    (c.assignees?.some(id => id === user.id || id === user.$id || id === user.userId))
  );

  const visibleForms = forms.filter(f => {
    if (isAdmin) return true;
    if (f.assignedToUserId === user.id || f.assignedToUserId === user.$id || f.assignedToUserId === user.userId) return true;
    const def = formDefinitions?.find((d: any) => d.key === f.formKey);
    if (def && def.visibility === 'public') return true;
    if ((project?.sellerId === user.id || project?.sellerId === user.$id || project?.sellerId === user.userId) && f.meta?.includes('seller')) return true;
    if ((project?.buyerId === user.id || project?.buyerId === user.$id || project?.buyerId === user.userId) && f.meta?.includes('buyer')) return true;
    return false;
  });

  const visibleDocs = projectStatusData.docs.filter((rd: any) => {
    const isPublic = !rd.visibility || rd.visibility === 'public';
    const isParticipant = rd.participants.some((p: any) => p.user?.id === user.id || p.user?.$id === user.id || p.user?.userId === user.id);
    return isAdmin || isPublic || isParticipant;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
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
              {visibleDocs.filter((d: any) => d.participants.every((p: any) => p.isProvided)).length}
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
              {visibleDocs.filter((d: any) => d.participants.some((p: any) => !p.isProvided)).length}
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
                                        const def = formDefinitions?.find((d: any) => d.key === f.formKey);
                                        // We might need to fetch it if not in list
                                        if (!def) {
                                            // Fallback or assume passed props are sufficient
                                            // In a real app we'd fetch it. For now, we rely on parent providing good `formDefinitions`
                                        }
                                        if (def && project) {
                                           await downloadFormPDF(f, def, allUsers, project);
                                        } else {
                                            alert("Form definition not found, cannot download PDF.");
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
              {visibleDocs.map((rd: any) => {
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
    </div>
  );
};

export default ProjectDocuments;
