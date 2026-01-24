
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ExternalLink,
  Map as MapIcon,
  Loader2,
  Download,
  Library,
  ChevronRight,
  Send,
  UserPlus,
  Users as UsersGroupIcon
} from 'lucide-react';
import { Project, User, UserRole, Contract, ContractStatus, ContractTemplate, Message } from '../types';
import { GeminiService, GroundingLink } from '../services/geminiService';
import { MOCK_USERS } from '../constants';
import SignaturePad from '../components/SignaturePad';
import { downloadContractPDF } from '../utils/pdfGenerator';

interface ProjectDetailProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  templates: ContractTemplate[];
  user: User;
  allUsers: User[];
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projects, setProjects, contracts, setContracts, templates, user, allUsers }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === id);
  const projectContracts = contracts.filter(c => c.projectId === id);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'contracts' | 'messages' | 'team'>('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [locationInsights, setLocationInsights] = useState<{ text: string, links: GroundingLink[] } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [signingContractId, setSigningContractId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const gemini = new GeminiService();

  useEffect(() => {
    if (activeTab === 'messages') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, project?.messages]);

  if (!project) return <div className="p-8 text-center">Project not found.</div>;

  const seller = allUsers.find(u => u.id === project.sellerId);
  const buyer = allUsers.find(u => u.id === project.buyerId);
  const isAdmin = user.role === UserRole.ADMIN;

  const fetchInsights = async () => {
    setAiInsight('Thinking...');
    const result = await gemini.getProjectInsights(project);
    setAiInsight(result);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: Message = {
      id: `m-${Date.now()}`,
      senderId: user.id,
      text: newMessage,
      timestamp: new Date().toISOString()
    };

    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, messages: [...(p.messages || []), msg] } : p));
    setNewMessage('');
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

  const assignUser = (role: 'seller' | 'buyer', userId: string) => {
    if (!isAdmin) return;
    setProjects(prev => prev.map(p => {
      if (p.id === project.id) {
        return role === 'seller' ? { ...p, sellerId: userId } : { ...p, buyerId: userId };
      }
      return p;
    }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {signingContractId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <SignaturePad onSave={handleSignContract} onCancel={() => setSigningContractId(null)} />
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
              <img src={project.property.images[0]} alt={project.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
                <div className="text-white">
                  <h1 className="text-3xl font-bold">{project.title}</h1>
                  <p className="flex items-center gap-2 mt-2 opacity-90"><MapPin size={16} /> {project.property.address}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70">List Price</p>
                  <p className="text-2xl font-bold">${project.property.price.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar">
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<ClipboardList size={18}/>} label="Overview" />
              <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckCircle size={18}/>} label="Tasks" />
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
                    <h3 className="text-lg font-bold">Project Tasklist</h3>
                    {isAdmin && <button className="text-sm text-blue-600 font-bold flex items-center gap-1"><Plus size={16}/> New Task</button>}
                  </div>
                  <div className="space-y-3">
                    {project.tasks.map(task => (
                      <div key={task.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${task.completed ? 'bg-slate-50 border-slate-100 opacity-70' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center gap-4">
                          <button onClick={() => toggleTask(task.id)} className={`transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-blue-500'}`}>
                            {task.completed ? <CheckCircle size={24} /> : <Circle size={24} />}
                          </button>
                          <div>
                            <p className={`font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Due: {task.dueDate}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded text-slate-600">{task.category}</span>
                      </div>
                    ))}
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
                <div className="flex flex-col h-[500px] animate-in fade-in duration-300">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 rounded-t-3xl border border-slate-200">
                    {(project.messages || []).map((msg) => {
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
                  <form onSubmit={handleSendMessage} className="p-4 bg-white border border-slate-200 border-t-0 rounded-b-3xl flex gap-2">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"><Send size={20}/></button>
                  </form>
                </div>
              )}

              {activeTab === 'team' && isAdmin && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Seller Management */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserIcon size={18}/> Seller</h3>
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                        {seller ? (
                          <div className="flex items-center gap-3">
                            <img src={seller.avatar} className="w-10 h-10 rounded-full" alt="" />
                            <div><p className="font-bold text-sm">{seller.name}</p><p className="text-xs text-slate-500">{seller.email}</p></div>
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
                            <div><p className="font-bold text-sm">{buyer.name}</p><p className="text-xs text-slate-500">{buyer.email}</p></div>
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
            <ParticipantRow user={seller} role="Seller" />
            {buyer && <ParticipantRow user={buyer} role="Buyer" />}
            <ParticipantRow user={allUsers.find(u => u.id === project.managerId)} role="Manager" />
          </div>
        </div>
      </div>
    </div>
  );
};

const ParticipantRow: React.FC<{ user?: User, role: string }> = ({ user, role }) => (
  <div className="flex items-center gap-3">
    <img src={user?.avatar} className="w-10 h-10 rounded-full border border-slate-100" alt="" />
    <div className="min-w-0">
      <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Unassigned'}</p>
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
