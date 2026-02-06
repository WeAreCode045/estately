
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Download,
    Edit2,
    Eye,
    FileText,
    Library,
    Plus,
    Save,
    Search,
    Trash2,
    X
} from 'lucide-react';
/* eslint-env browser */
import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useSearchParams } from 'react-router-dom';
import SignaturePad from '../components/SignaturePad';
import { MOCK_USERS } from '../constants';
import { contractTemplatesService } from '../services/contractTemplatesService';
import type { Contract, ContractTemplate, Project, User} from '../types';
import { ContractStatus, UserRole } from '../types';
import { downloadContractPDF } from '../utils/pdfGenerator';

interface ContractsProps {
  user: User;
  projects: Project[];
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  templates: ContractTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<ContractTemplate[]>>;
}

const Contracts: React.FC<ContractsProps> = ({ user, projects, contracts, setContracts, templates, setTemplates }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'all' | 'templates';

  const [activeView, setActiveView] = useState<'all' | 'templates'>(tabParam || 'all');
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const [provisioningTemplateId, setProvisioningTemplateId] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isProvisioning, setIsProvisioning] = useState(false);

  useEffect(() => {
    if (tabParam && tabParam !== activeView) {
      setActiveView(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (view: 'all' | 'templates') => {
    setActiveView(view);
    setSearchParams({ tab: view });
  };

  const [previewingContractId, setPreviewingContractId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const isAdmin = user.role === UserRole.ADMIN;

  const statusIcons = {
    [ContractStatus.SIGNED]: <CheckCircle2 className="text-emerald-500" size={16} />,
    [ContractStatus.PENDING_SIGNATURE]: <Clock className="text-amber-500" size={16} />,
    [ContractStatus.DRAFT]: <FileText className="text-slate-400" size={16} />,
    [ContractStatus.CANCELLED]: <AlertCircle className="text-red-500" size={16} />,
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

  const handleDownload = (contract: Contract) => {
    const project = projects.find(p => p.id === contract.projectId);
    if (project) downloadContractPDF(contract, project, MOCK_USERS);
  };

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    try {
      if (editingTemplate.id.startsWith('tmpl-')) {
        // Create new
        const { id, ...templateData } = editingTemplate;
        const newTemplate = await contractTemplatesService.create(templateData);
        setTemplates(prev => [...prev, newTemplate]);
      } else {
        // Update existing
        await contractTemplatesService.update(editingTemplate.id, editingTemplate);
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...editingTemplate } : t));
      }
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
    } catch (err: any) {
      console.error('Failed to save contract template', err);
      alert(`Failed to save template: ${err?.message || 'Unknown error'}`);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      try {
        await contractTemplatesService.delete(id);
        setTemplates(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        console.error('Failed to delete contract template', err);
        alert('Failed to delete template.');
      }
    }
  };

  const handleProvision = async () => {
    if (!provisioningTemplateId || selectedProjectIds.length === 0) return;

    setIsProvisioning(true);
    try {
      await contractTemplatesService.provisionTemplateToProjects(provisioningTemplateId, selectedProjectIds);
      alert('Successfully added template to selected projects.');
      setProvisioningTemplateId(null);
      setSelectedProjectIds([]);
    } catch (err) {
      console.error('Failed to provision template', err);
      alert('Failed to add template to projects.');
    } finally {
      setIsProvisioning(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contract Center</h1>
          <p className="text-slate-500 mt-1">Manage, generate and sign project legal documents.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeView === 'templates' && isAdmin && (
            <button
              onClick={() => {
                setEditingTemplate({
                  id: `tmpl-${Date.now()}`,
                  name: '',
                  content: '',
                  needSignatureFromSeller: false,
                  needSignatureFromBuyer: false,
                  autoCreateTaskForAssignee: false,
                  autoAddToNewProjects: false,
                  autoAssignTo: [],
                  allowChanges: 'always'
                });
                setIsTemplateModalOpen(true);
              }}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
            >
              <Plus size={18} /> New Template
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-100">
        <button
          onClick={() => handleTabChange('all')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeView === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <FileText size={18} /> All Documents
        </button>
        {isAdmin && (
          <button
            onClick={() => handleTabChange('templates')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeView === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <Library size={18} /> Template Library
          </button>
        )}
      </div>

      {activeView === 'all' ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search contracts..." className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4">Contract Title</th>
                  <th className="px-6 py-4">Related Project</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map(contract => (
                  <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <FileText size={20} />
                        </div>
                        <span className="font-bold text-slate-900">{contract.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm text-slate-500 font-medium">
                        {projects.find(p => p.id === contract.projectId)?.title}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {statusIcons[contract.status]}
                        <span className={`text-xs font-bold capitalize ${contract.status === ContractStatus.SIGNED ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {contract.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500">
                      {new Date(contract.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPreviewingContractId(contract.id)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 border border-transparent hover:border-slate-100 transition-all"><Eye size={18} /></button>
                        <button onClick={() => handleDownload(contract)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 border border-transparent hover:border-slate-100 transition-all"><Download size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all group flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Library size={24} />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingTemplate(template); setIsTemplateModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">{template.name}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {template.needSignatureFromSeller && (
                  <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded uppercase tracking-tighter border border-amber-100">Seller Sign</span>
                )}
                {template.needSignatureFromBuyer && (
                  <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-tighter border border-blue-100">Buyer Sign</span>
                )}
                {template.autoAddToNewProjects && (
                  <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-tighter border border-indigo-100">Auto-Add</span>
                )}
              </div>
              <div className="flex-1 bg-slate-50 rounded-xl p-4 overflow-hidden mb-4 relative">
                <p className="text-[10px] font-mono text-slate-400 line-clamp-6 leading-relaxed">
                  {template.content}
                </p>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent"></div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <FileText size={12} /> {template.content.length} characters
                </div>
                <button
                  onClick={() => setProvisioningTemplateId(template.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  <Plus size={12} /> Push to projects
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setEditingTemplate({
                id: `tmpl-${Date.now()}`,
                name: '',
                content: '',
                needSignatureFromSeller: false,
                needSignatureFromBuyer: false,
                autoCreateTaskForAssignee: false,
                autoAddToNewProjects: false,
                autoAssignTo: [],
                allowChanges: 'always'
              });
              setIsTemplateModalOpen(true);
            }}
            className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all group min-h-[250px]"
          >
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
              <Plus size={24} />
            </div>
            <span className="font-bold">Create New Template</span>
          </button>
        </div>
      )}

      {/* Signing Modal */}
      {signingContractId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Sign Contract</h2>
                <p className="text-sm text-slate-500">Please review and sign to complete this step.</p>
              </div>
              <button
                onClick={() => setSigningContractId(null)}
                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-2">Legal Declaration</h3>
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "I hereby acknowledge that I have read and understood the terms of this contract and my signature below constitutes a legally binding agreement."
                </p>
              </div>

              <SignaturePad
                onCancel={() => setSigningContractId(null)}
                onSave={async (data) => {
                  try {
                    handleSignContract(data);
                  } catch (err) {
                    console.error("Signature save failed", err);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewingContractId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-3xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{contracts.find(c => c.id === previewingContractId)?.title}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Preview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const c = contracts.find(cn => cn.id === previewingContractId);
                    if (c) handleDownload(c);
                  }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={() => setPreviewingContractId(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 bg-slate-50/50">
              <div
                className="bg-white shadow-sm border border-slate-200 rounded-sm p-16 min-h-[1000px] max-w-2xl mx-auto font-serif leading-relaxed text-slate-800 prose prose-slate max-w-none break-words overflow-hidden"
                dangerouslySetInnerHTML={{ __html: contracts.find(c => c.id === previewingContractId)?.content || '' }}
              />

              <div className="mt-20 pt-12 border-t-2 border-slate-100 grid grid-cols-2 gap-12 text-sm italic text-slate-400 max-w-2xl mx-auto">
                <div>Signature Witness A</div>
                <div>Signature Witness B</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
      {isTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                  <Library size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingTemplate.id.startsWith('tmpl-') ? 'Create Contract Template' : 'Edit Template'}
                  </h2>
                  <p className="text-sm text-slate-500">Configure your automated legal document.</p>
                </div>
              </div>
              <button
                onClick={() => { setIsTemplateModalOpen(false); setEditingTemplate(null); }}
                className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: General Info & Content */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Template Title</label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      placeholder="e.g. Sales Agreement"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Content / Terms</label>
                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">WYSIWYG Enabled</span>
                    </div>
                    <div className="quill-container bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                      <ReactQuill
                        theme="snow"
                        value={editingTemplate.content}
                        onChange={(content) => setEditingTemplate({ ...editingTemplate, content })}
                        modules={{
                          toolbar: [
                            [{ header: [1, 2, false] }],
                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                            [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
                            ['link', 'clean']
                          ],
                        }}
                        className="bg-white border-none h-80 overflow-y-auto"
                        placeholder="Enter legal terms and conditions..."
                      />
                    </div>
                  </div>
                </div>

                {/* Right Side: Automation Settings */}
                <div className="space-y-6">
                  <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 space-y-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Save size={18} className="text-blue-600" />
                      Placeholder Helper
                    </h3>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                      {[
                        'buyer.name', 'buyer.birthday', 'buyer.address', 'buyer.placeofbirth',
                        'buyer.personal_identification_number', 'buyer.bank_account', 'buyer.phone', 'buyer.mail',
                        'seller.name', 'seller.birthday', 'seller.address', 'seller.placeofbirth',
                        'seller.personal_identification_number', 'seller.bank_account', 'seller.phone', 'seller.mail',
                        'agency.name', 'agency.address',
                        'agent.name', 'agent.phone', 'agent.mail',
                        'property.address', 'property.price',
                        'project.number', 'project.handover_date',
                        'current_date'
                      ].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            const newContent = editingTemplate.content + ` [${p}]`;
                            setEditingTemplate({ ...editingTemplate, content: newContent });
                          }}
                          className="text-[10px] font-mono bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all"
                        >
                          [{p}]
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Click a tag to insert it into the editor. These will be automatically replaced with project data.</p>
                  </div>

                  <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 space-y-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Save size={18} className="text-blue-600" />
                      Automation Settings
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Visibility</p>
                          <p className="text-[11px] text-slate-500">Control who can see this document.</p>
                        </div>
                        <select
                          value={editingTemplate.visibility || 'public'}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, visibility: e.target.value as any })}
                          className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Auto-Add to Projects</p>
                          <p className="text-[11px] text-slate-500">Spawn this contract for every new project created.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingTemplate.autoAddToNewProjects}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, autoAddToNewProjects: e.target.checked })}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Require Seller Signature</p>
                          <p className="text-[11px] text-slate-500">The seller must sign this via the portal.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingTemplate.needSignatureFromSeller}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, needSignatureFromSeller: e.target.checked })}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Require Buyer Signature</p>
                          <p className="text-[11px] text-slate-500">The buyer must sign this via the portal.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingTemplate.needSignatureFromBuyer}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, needSignatureFromBuyer: e.target.checked })}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Auto-create Task</p>
                          <p className="text-[11px] text-slate-500">Notify assignees about this document automatically.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingTemplate.autoCreateTaskForAssignee}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, autoCreateTaskForAssignee: e.target.checked })}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Modification Policy</label>
                      <select
                        value={editingTemplate.allowChanges || 'always'}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, allowChanges: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                      >
                        <option value="always">Always Allow Changes</option>
                        <option value="before_submission">Only Before Submission</option>
                        <option value="never">Never Allow Changes (Locked)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Who should sign? (Roles)</label>
                      <div className="flex flex-wrap gap-2">
                        {[UserRole.SELLER, UserRole.BUYER, UserRole.AGENT].map(role => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              const roles = editingTemplate.autoAssignTo || [];
                              const newRoles = roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role];
                              setEditingTemplate({ ...editingTemplate, autoAssignTo: newRoles });
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              (editingTemplate.autoAssignTo || []).includes(role)
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button
                onClick={() => { setIsTemplateModalOpen(false); setEditingTemplate(null); }}
                className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                className="px-8 py-3 rounded-2xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
              >
                <Save size={18} />
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Modal for Provisioning */}
      {provisioningTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setProvisioningTemplateId(null)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-lg relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add to Projects</h2>
                <p className="text-xs text-slate-500 mt-1">Select projects to add this contract to.</p>
              </div>
              <button
                onClick={() => setProvisioningTemplateId(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                disabled={isProvisioning}
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {projects.map(project => (
                  <label
                    key={project.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedProjectIds.includes(project.id)
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-xs text-slate-400 border border-slate-100">
                        {project.title.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{project.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{project.property.address}</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.includes(project.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjectIds([...selectedProjectIds, project.id]);
                        } else {
                          setSelectedProjectIds(selectedProjectIds.filter(id => id !== project.id));
                        }
                      }}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      disabled={isProvisioning}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button
                onClick={() => setProvisioningTemplateId(null)}
                className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all text-xs"
                disabled={isProvisioning}
              >
                Cancel
              </button>
              <button
                onClick={handleProvision}
                disabled={isProvisioning || selectedProjectIds.length === 0}
                className="px-8 py-3 rounded-2xl font-bold text-xs bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProvisioning ? (
                   <>
                    <Clock size={16} className="animate-spin" />
                    Processing...
                   </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add to {selectedProjectIds.length} Projects
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

export default Contracts;
