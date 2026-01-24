
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
  ExternalLink,
  // Fix: Added missing User as UserIcon import
  User as UserIcon
} from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  user: User;
  allUsers: User[];
}

const Dashboard: React.FC<DashboardProps> = ({ projects, user, allUsers }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  
  // Filter projects based on role
  const visibleProjects = isAdmin 
    ? projects 
    : projects.filter(p => p.sellerId === user.id || p.buyerId === user.id);

  // If not admin, we assume they have exactly one project based on requirements
  const userProject = !isAdmin ? visibleProjects[0] : null;

  if (isAdmin) {
    const stats = [
      { label: 'Active Projects', value: visibleProjects.filter(p => p.status === ProjectStatus.ACTIVE).length, icon: <Building2 className="text-blue-600" />, color: 'bg-blue-50' },
      { label: 'Pending Contracts', value: visibleProjects.filter(p => p.status === ProjectStatus.UNDER_CONTRACT).length, icon: <Clock className="text-amber-600" />, color: 'bg-amber-50' },
      { label: 'Completed Sales', value: visibleProjects.filter(p => p.status === ProjectStatus.SOLD).length, icon: <CheckCircle2 className="text-emerald-600" />, color: 'bg-emerald-50' },
      { label: 'Portfolio Value', value: `$${(visibleProjects.reduce((acc, p) => acc + p.property.price, 0) / 1000000).toFixed(1)}M`, icon: <TrendingUp className="text-indigo-600" />, color: 'bg-indigo-50' },
    ];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user.name}</h1>
            <p className="text-slate-500 mt-1">Agency Overview: Track all ongoing property transactions.</p>
          </div>
          <button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg">
            <Plus size={20} />
            <span>New Project</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                {stat.icon}
              </div>
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent Projects</h2>
              <Link to="/projects" className="text-blue-600 text-sm font-semibold flex items-center gap-1 hover:underline">
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleProjects.map((project) => (
                <ProjectSummaryCard key={project.id} project={project} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Upcoming Agenda</h2>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="space-y-6">
                {visibleProjects.flatMap(p => p.agenda).map((event, idx) => (
                  <div key={idx} className="flex gap-4 group cursor-pointer">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex flex-col items-center justify-center text-[10px] font-bold text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <span>MAY</span>
                        <span className="text-sm leading-tight">28</span>
                      </div>
                      <div className="w-[1px] flex-1 bg-slate-100 mt-2"></div>
                    </div>
                    <div className="pb-6">
                      <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{event.title}</p>
                      <p className="text-xs text-slate-500 mt-1">10:00 AM - 11:30 AM</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex -space-x-2">
                          <img src="https://picsum.photos/seed/p1/32" className="w-6 h-6 rounded-full border-2 border-white" alt="" />
                          <img src="https://picsum.photos/seed/p2/32" className="w-6 h-6 rounded-full border-2 border-white" alt="" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{event.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {visibleProjects.flatMap(p => p.agenda).length === 0 && (
                  <p className="text-center py-8 text-slate-400 italic text-sm">No upcoming appointments.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Seller / Buyer View
  if (!userProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
        <div className="bg-slate-100 p-6 rounded-full mb-6 text-slate-400">
          <Building2 size={64} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">No Projects Found</h1>
        <p className="text-slate-500 mt-2 max-w-md">You are currently not part of any active property projects. Please contact your agent if this is unexpected.</p>
      </div>
    );
  }

  const stats = [
    { label: 'Sale Progress', value: '65%', icon: <CheckCircle2 className="text-blue-600" />, color: 'bg-blue-50' },
    { label: 'Next Milestone', value: 'Final Walkthrough', icon: <Clock className="text-amber-600" />, color: 'bg-amber-50' },
  ];

  const agent = allUsers.find(u => u.id === userProject.managerId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hi {user.name.split(' ')[0]}, your project status</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" /> {userProject.property.address}
          </p>
        </div>
        <Link 
          to={`/projects/${userProject.id}`}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md flex items-center justify-center gap-2"
        >
          View Full Details <ArrowRight size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              {stat.icon}
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1 truncate">{stat.value}</p>
          </div>
        ))}
        {/* Project Context Box */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-blue-500/20">
          <div>
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Contract Status</p>
            <p className="text-2xl font-bold">Awaiting Signatures</p>
            <p className="text-blue-100/70 text-xs mt-2 italic">You have 1 document pending review.</p>
          </div>
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-md">
            <FileText size={32} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tasks Widget */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-500" /> Pending Tasks
              </h2>
              <span className="text-xs font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">
                {userProject.tasks.filter(t => !t.completed).length} Remaining
              </span>
            </div>
            <div className="p-6 space-y-3">
              {userProject.tasks.map(task => (
                <div key={task.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${task.completed ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}>
                  <div className="flex items-center gap-4">
                    <div className={task.completed ? 'text-emerald-500' : 'text-slate-300'}>
                      {task.completed ? <CheckCircle size={22} /> : <Circle size={22} />}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium uppercase tracking-wider">Due: {task.dueDate}</p>
                    </div>
                  </div>
                  {!task.completed && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">{task.category}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* Agent Widget */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <MessageSquare size={64} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <UserIcon size={20} className="text-blue-600" /> Your Agent
            </h2>
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <img src={agent?.avatar} className="w-20 h-20 rounded-2xl border-2 border-white shadow-md object-cover" alt="" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <h3 className="font-bold text-slate-900">{agent?.name}</h3>
              <p className="text-xs text-slate-500 mb-6">Expert Real Estate Advisor</p>
              
              <div className="w-full space-y-3">
                <button className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all text-sm">
                  <MessageSquare size={18} /> Message Agent
                </button>
                <div className="flex gap-2">
                  <a href={`tel:${agent?.phone || '555-0123'}`} className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl border border-slate-100 transition-all text-sm">
                    <Phone size={16} /> Call
                  </a>
                  <a href={`mailto:${agent?.email}`} className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl border border-slate-100 transition-all text-sm">
                    <Mail size={16} /> Email
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Documents Widget */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" /> Vault
              </h2>
              <button className="text-xs font-bold text-blue-600 hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {user.documents?.slice(0, 3).map(doc => (
                <div key={doc.id} className="flex items-center gap-3 group">
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
              ))}
              {(!user.documents || user.documents.length === 0) && (
                <div className="py-8 text-center border-2 border-dashed border-slate-50 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium italic">No personal documents yet.</p>
                  <button className="mt-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">+ Upload First</button>
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
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group-hover:shadow-md transition-all group-hover:-translate-y-1">
        <div className="relative h-48">
          <img src={project.property.images[0]} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute top-4 left-4">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border shadow-sm ${statusColors[project.status]}`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-white font-bold text-lg drop-shadow-md truncate">{project.title}</p>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-1 text-slate-400 text-xs mb-3">
            <Building2 size={14} />
            <span className="truncate">{project.property.address}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <p className="font-bold text-slate-900">${project.property.price.toLocaleString()}</p>
            <div className="flex items-center gap-1 text-xs font-semibold text-blue-600">
              Manage Project <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Dashboard;
