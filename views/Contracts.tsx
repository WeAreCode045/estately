
import React, { useState } from 'react';
import { User, Project, Contract, ContractStatus, ContractTemplate, UserRole } from '../types';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Signature as SignatureIcon,
  X,
  Printer,
  ChevronLeft,
  Plus,
  Settings,
  Edit2,
  Trash2,
  Save,
  Library
} from 'lucide-react';
import SignaturePad from '../components/SignaturePad';
import { downloadContractPDF } from '../utils/pdfGenerator';
import { MOCK_USERS } from '../constants';

interface ContractsProps {
  user: User;
  projects: Project[];
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  templates: ContractTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<ContractTemplate[]>>;
}

const Contracts: React.FC<ContractsProps> = ({ user, projects, contracts, setContracts, templates, setTemplates }) => {
  const [activeView, setActiveView] = useState<'all' | 'templates'>('all');
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
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

  const saveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setTemplates(prev => {
      const exists = prev.find(t => t.id === editingTemplate.id);
      if (exists) {
        return prev.map(t => t.id === editingTemplate.id ? editingTemplate : t);
      }
      return [...prev, editingTemplate];
    });
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const previewContract = contracts.find(c => c.id === previewingContractId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Signature Modal */}
      {signingContractId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <SignaturePad onSave={handleSignContract} onCancel={() => setSigningContractId(null)} />
        </div>
      )}

      {/* Contract Preview Modal */}
      {previewingContractId && previewContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-200">
          <div className="bg-slate-50 w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] flex flex-col rounded-none md:rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => setPreviewingContractId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{previewContract.title}</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Created: {new Date(previewContract.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="hidden sm:flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl text-sm font-bold text-slate-600 transition-colors">
                  <Printer size={18} /> Print
                </button>
                <button onClick={() => handleDownload(previewContract)} className="hidden sm:flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl text-sm font-bold text-slate-600 transition-colors">
                  <Download size={18} /> Download
                </button>
                <button onClick={() => setPreviewingContractId(null)} className="p-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-colors ml-2">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-200/50 flex justify-center">
              <div className="bg-white w-full max-w-4xl shadow-lg border border-slate-200 p-8 md:p-16 min-h-full prose prose-slate">
                <div className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm md:text-base">{previewContract.content}</div>
                <div className="mt-16 pt-12 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-8 text-center underline underline-offset-8">Execution signatures</h4>
                  <div className="grid grid-cols-2 gap-12">
                    {previewContract.assignees.map(uid => {
                      const u = MOCK_USERS.find(m => m.id === uid);
                      const sig = previewContract.signatureData?.[uid];
                      return (
                        <div key={uid} className="flex flex-col items-center">
                          <div className="h-20 w-full flex items-end justify-center pb-2 border-b-2 border-slate-900/10">
                            {sig ? <img src={sig} className="max-h-full max-w-full object-contain filter contrast-125" alt="Signature" /> : <span className="text-slate-300 italic text-sm mb-2">Signature Pending</span>}
                          </div>
                          <div className="mt-4 text-center">
                            <p className="font-bold text-slate-900 text-sm">{u?.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{u?.role}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Create/Edit Modal */}
      {isTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Template Editor</h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
            </div>
            <form onSubmit={saveTemplate} className="p-8 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Template Name</label>
                <input 
                  type="text" 
                  value={editingTemplate.name} 
                  onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-96">
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Content (Markdown)</label>
                  <textarea 
                    value={editingTemplate.content} 
                    onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})}
                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 resize-none"
                    placeholder="Enter legal text with placeholders like [PROPERTY_ADDRESS]..."
                    required
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Preview</label>
                  <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 overflow-y-auto prose prose-sm prose-slate max-w-none">
                    <div className="whitespace-pre-wrap font-serif text-slate-700">
                      {editingTemplate.content || <span className="text-slate-400 italic">No content yet...</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed font-medium">
                  <strong>Tip:</strong> Use markers like <code>[SELLER_NAME]</code>, <code>[BUYER_NAME]</code>, <code>[PRICE]</code>, and <code>[PROPERTY_ADDRESS]</code>. EstateFlow AI will automatically replace these with real project data when you generate a contract.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-6 py-2.5 font-bold text-slate-500 text-sm">Cancel</button>
                <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all"><Save size={18}/> Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                setEditingTemplate({ id: `tmpl-${Date.now()}`, name: '', content: '' });
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
          onClick={() => setActiveView('all')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeView === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <FileText size={18}/> All Documents
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveView('templates')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeView === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <Library size={18}/> Template Library
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
                    <td className="px-6 py-5"><span className="text-sm text-slate-500 font-medium">{projects.find(p => p.id === contract.projectId)?.title}</span></td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        {statusIcons[contract.status]}
                        <span className={`text-xs font-bold capitalize ${contract.status === ContractStatus.SIGNED ? 'text-emerald-600' : 'text-slate-600'}`}>{contract.status.replace('_', ' ').toLowerCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500">{new Date(contract.createdAt).toLocaleDateString()}</td>
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
                    <Edit2 size={16}/>
                  </button>
                  <button 
                    onClick={() => deleteTemplate(template.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">{template.name}</h3>
              <div className="flex-1 bg-slate-50 rounded-xl p-4 overflow-hidden mb-4 relative">
                <p className="text-[10px] font-mono text-slate-400 line-clamp-6 leading-relaxed">
                  {template.content}
                </p>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent"></div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-auto">
                <FileText size={12}/> {template.content.length} characters
              </div>
            </div>
          ))}
          <button 
            onClick={() => {
              setEditingTemplate({ id: `tmpl-${Date.now()}`, name: '', content: '' });
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
    </div>
  );
};

export default Contracts;
