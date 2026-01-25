
import React from 'react';
import { Link } from 'react-router-dom';
import { Project, User, UserRole, ProjectStatus } from '../types';
import { 
  Building2, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Plus,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  Circle,
  FileText,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Download,
  User as UserIcon,
  // Fix: Added missing CheckSquare import from lucide-react
  CheckSquare
} from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  user: User;
  allUsers: User[];
}

const Dashboard: React.FC<DashboardProps> = ({ projects = [], user, allUsers = [] }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  
  // Filter projects based on role
  const visibleProjects = isAdmin 
    ? (projects || []) 
    : (projects || []).filter(p => p.sellerId === user.id || p.buyerId === user.id);

  // For non-admins, focus on the first matching project
  const userProject = !isAdmin ? visibleProjects[0] : null;

  if (isAdmin) {
    const stats = [
      { label: 'Active Projects', value: visibleProjects.filter(p => p.status === ProjectStatus.ACTIVE).length, icon: <Building2 className="text-blue-600" />, color: 'bg-blue-50' },
      { label: 'Under Contract', value: visibleProjects.filter(p => p.status === ProjectStatus.UNDER_CONTRACT).length, icon: <Clock className="text-amber-600" />, color: 'bg-amber-50' },
      { label: 'Completed Sales', value: visibleProjects.filter(p => p.status === ProjectStatus.SOLD).length, icon: <CheckCircle2 className="text-emerald-600" />, color: 'bg-emerald-50' },
      { label: 'Portfolio Value', value: `$${((visibleProjects.reduce((acc, p) => acc + (p.property?.price || 0), 0)) / 1000000).toFixed(1)}M`, icon: <TrendingUp className="text-indigo-600" />, color: 'bg-indigo-50' },
    ];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agency Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage and track all property transactions.</p>
          </div>
          <button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md">
            <Plus size={20} />
            <span>New Project</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                {stat.icon}
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Active Listings</h2>
              <Link to="/projects" className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleProjects.map((project) => (
                <ProjectSummaryCard key={project.id} project={project} />
              ))}
              {visibleProjects.length === 0 && (
                 <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 italic">No listings currently active.</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Coming Up</h2>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="space-y-6">
                {visibleProjects.flatMap(p => p.agenda || []).map((event, idx) => (
                  <div key={idx} className="flex gap-4 group cursor-pointer">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-[9px] font-bold text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <span>MAY</span>
                        <span className="text-xs leading-tight">28</span>
                      </div>
                      <div className="w-[1px] flex-1 bg-slate-100 mt-2"></div>
                    </div>
                    <div className="pb-6">
                      <p className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{event.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">10:00 AM - 11:30 AM</p>
                      <div className="mt-2">
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">{event.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {visibleProjects.flatMap(p => p.agenda || []).length === 0 && (
                  <p className="text-center py-12 text-slate-400 italic text-xs font-medium">No appointments scheduled.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SELLER / BUYER DASHBOARD
  if (!userProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
        <div className="bg-slate-100 p-8 rounded-full mb-6 text-slate-400 shadow-inner">
          <Building2 size={64} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Project Not Assigned</h1>
        <p className="text-slate-500 mt-2 max-w-sm">You aren't currently assigned to an active property project. Contact your agent to get started.</p>
      </div>
    );
  }

  const agent = allUsers.find(u => u.id === userProject.managerId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome, {user.name.split(' ')[0]}</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" /> {userProject.property.address}
          </p>
        </div>
        <Link 
          to={`/projects/${userProject.id}`}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          View Full Project File <ArrowRight size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tasks and Documents */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Progress Widget (Replaces portfolios for clients) */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <CheckCircle2 size={120} />
             </div>
             <div className="relative z-10">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">Overall Sale Progress</p>
                <h2 className="text-4xl font-bold mb-6">65% <span className="text-lg font-normal opacity-70">to completion</span></h2>
                <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-white rounded-full shadow-sm" style={{ width: '65%' }}></div>
                </div>
                <div className="mt-6 flex gap-6">
                   <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Status</p>
                      <p className="text-sm font-bold">Under Contract</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">Next Step</p>
                      <p className="text-sm font-bold">Final Walkthrough</p>
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
                {(userProject.tasks || []).filter(t => !t.completed).length} Pending
              </span>
            </div>
            <div className="p-6 space-y-3">
              {(userProject.tasks || []).map(task => (
                <div key={task.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${task.completed ? 'bg-slate-50 border-slate-50 opacity-60' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={task.completed ? 'text-emerald-500' : 'text-slate-300'}>
                      {task.completed ? <CheckCircle size={22} /> : <Circle size={22} />}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Due: {task.dueDate}</p>
                    </div>
                  </div>
                  {!task.completed && (
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase">{task.category}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Agent Contact and Documents */}
        <div className="space-y-8">
          
          {/* CONTACT AGENT WIDGET */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-center gap-2">
              <UserIcon size={18} className="text-blue-600" /> Your Dedicated Agent
            </h2>
            <div className="relative mb-4 inline-block">
              <img src={agent?.avatar} className="w-24 h-24 rounded-3xl border-4 border-white shadow-xl object-cover" alt="" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <h3 className="font-bold text-slate-900 text-xl">{agent?.name}</h3>
            <p className="text-xs text-slate-500 mb-8 font-medium">Real Estate Advisor • EstateFlow Agency</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-all text-xs shadow-md">
                <MessageSquare size={16} /> Message
              </button>
              <a href={`tel:${agent?.phone || '555-0123'}`} className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition-all text-xs">
                <Phone size={16} /> Call
              </a>
              <a href={`mailto:${agent?.email}`} className="col-span-2 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl border border-slate-100 transition-all text-xs">
                <Mail size={16} /> Send Email
              </a>
            </div>
          </div>

          {/* DOCUMENTS WIDGET */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" /> Recent Vault Items
              </h2>
              <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {(user.documents || []).length > 0 ? (
                (user.documents || []).slice(0, 3).map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 group cursor-pointer p-2 hover:bg-slate-50 rounded-2xl transition-all">
                    <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Added {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <button className="text-slate-300 hover:text-slate-600">
                      <Download size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium italic">Vault is empty.</p>
                  <button className="mt-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">+ Upload Doc</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectSummaryCard: React.FC<{ project: Project }> = ({ project }) => {
  const statusColors = {
    [ProjectStatus.ACTIVE]: 'bg-blue-50 text-blue-600 border-blue-100',
    [ProjectStatus.UNDER_CONTRACT]: 'bg-amber-50 text-amber-600 border-amber-100',
    [ProjectStatus.SOLD]: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    [ProjectStatus.DRAFT]: 'bg-slate-50 text-slate-600 border-slate-100',
    [ProjectStatus.ARCHIVED]: 'bg-slate-200 text-slate-700 border-slate-200',
  };

  return (
    <Link to={`/projects/${project.id}`} className="block group">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group-hover:shadow-md transition-all group-hover:-translate-y-1">
        <div className="relative h-44">
          <img src={project.property.images[0]} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute top-4 left-4">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border shadow-sm ${statusColors[project.status] || 'bg-slate-50'}`}>
              {(project.status || 'ACTIVE').replace('_', ' ')}
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-white font-bold text-base drop-shadow-md truncate">{project.title}</p>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-1 text-slate-400 text-[10px] mb-3 font-medium uppercase tracking-widest">
            <MapPin size={12} className="text-blue-500" />
            <span className="truncate">{project.property?.address}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <p className="font-bold text-slate-900">${(project.property?.price || 0).toLocaleString()}</p>
            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
              Manage <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Dashboard;
