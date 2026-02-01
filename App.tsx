import {
    Bell,
    BookOpen,
    Building2,
    Calendar,
    CheckSquare,
    ChevronDown,
    ClipboardList,
    FileSignature,
    FileText,
    Home,
    LayoutDashboard,
    Library,
    LogOut,
    Mail,
    Search,
    Settings as SettingsIcon,
    ShieldCheck,
    User as UserIcon,
    Users as UsersIcon
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { HashRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { COLLECTIONS, DATABASE_ID, databases, projectService, Query } from './services/appwrite';
import { contractTemplatesService } from './services/contractTemplatesService';
import { User as AppUser, Contract, ContractTemplate, Project, UserRole } from './types';
import AcceptInvite from './views/AcceptInvite';
import AgencyInfo from './views/AgencyInfo';
import Contracts from './views/Contracts';
import Dashboard from './views/Dashboard';
import DocumentManagement from './views/DocumentManagement';
import Documents from './views/Documents';
import FormDefinitionEditor from './views/FormDefinitionEditor';
import FormEditorView from './views/FormEditor';
import FormsList from './views/FormsList';
import Login from './views/Login';
import Profile from './views/Profile';
import ProjectDetail from './views/ProjectDetail';
import Register from './views/Register';
import Settings from './views/Settings';
import TaskLibrary from './views/TaskLibrary';
import Tasks from './views/Tasks';
import UsersManagement from './views/UsersManagement';

const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
    <div className="bg-slate-100 p-8 rounded-full mb-6 text-slate-400">
      <Building2 size={64} />
    </div>
    <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
    <p className="text-slate-500 mt-2">This module is currently in development for your portal.</p>
  </div>
);

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  return (
    <AuthProvider>
      <HashRouter>
        <AppContent
          projects={projects}
          setProjects={setProjects}
          contracts={contracts}
          setContracts={setContracts}
          templates={templates}
          setTemplates={setTemplates}
          allUsers={allUsers}
          setAllUsers={setAllUsers}
        />
      </HashRouter>
    </AuthProvider>
  );
};

const AppContent: React.FC<{
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  templates: ContractTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<ContractTemplate[]>>;
  allUsers: AppUser[];
  setAllUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
}> = ({
  projects,
  setProjects,
  contracts,
  setContracts,
  templates,
  setTemplates,
  allUsers,
  setAllUsers
}) => {
  const { user, profile, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [docDefinitions, setDocDefinitions] = useState<any[]>([]);

  const effectiveUser = React.useMemo(() => {
    if (profile) {
      return {
        ...profile,
        id: profile.userId,
        avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email}`,
        assignedTasks: profile.assignedTasks ? (typeof profile.assignedTasks === 'string' ? JSON.parse(profile.assignedTasks) : profile.assignedTasks) : [],
        userDocuments: profile.userDocuments ? (typeof profile.userDocuments === 'string' ? JSON.parse(profile.userDocuments) : profile.userDocuments) : []
      } as AppUser;
    }
    if (user) {
      return {
        id: user.$id,
        name: user.name,
        email: user.email,
        role: UserRole.BUYER,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
      } as AppUser;
    }
    return null;
  }, [profile, user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, profile]);

  const fetchData = async () => {
    try {
      const [profilesData, invitesData] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.INVITES, [Query.equal('status', 'PENDING')])
      ]);

      const userMap = new Map();
      profilesData.documents.forEach((doc: any) => {
        if (!userMap.has(doc.userId)) {
          userMap.set(doc.userId, {
            id: doc.userId,
            userId: doc.userId,
            $id: doc.$id,
            name: doc.name,
            email: doc.email,
            role: doc.role as UserRole,
            phone: doc.phone,
            address: doc.address,
            firstName: doc.firstName,
            lastName: doc.lastName,
            city: doc.city,
            postalCode: doc.postalCode,
            country: doc.country,
            birthday: doc.birthday,
            birthPlace: doc.birthPlace,
            idNumber: doc.idNumber,
            vatNumber: doc.vatNumber,
            bankAccount: doc.bankAccount,
            avatar: doc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.email}`,
            status: doc.status || 'ACTIVE',
            assignedTasks: doc.assignedTasks ? (typeof doc.assignedTasks === 'string' ? JSON.parse(doc.assignedTasks) : doc.assignedTasks) : [],
            userDocuments: doc.userDocuments ? (typeof doc.userDocuments === 'string' ? JSON.parse(doc.userDocuments) : doc.userDocuments) : []
          });
        }
      });

      invitesData.documents.forEach((doc: any) => {
        if (!userMap.has(doc.email)) {
          userMap.set(doc.email, {
            id: doc.$id,
            userId: doc.userId,
            name: doc.name || doc.email.split('@')[0],
            email: doc.email,
            role: doc.role as UserRole,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.email}`,
            status: 'PENDING_INVITE',
            projectId: doc.projectId
          });
        }
      });

      setAllUsers(Array.from(userMap.values()));

      const projectsData = await projectService.list();
      const [templatesResponse, docsResponse, contractTemplates] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS),
        contractTemplatesService.list()
      ]);

      setTemplates(contractTemplates);

      setTaskTemplates(templatesResponse.documents.map((d: any) => ({
        id: d.$id,
        title: d.title,
        description: d.description,
        category: d.category
      })));

      setDocDefinitions(docsResponse.documents.map((d: any) => ({
        id: d.$id,
        title: d.title,
        description: d.description,
        role: d.role
      })));

      setProjects(projectsData.documents.map((doc: any) => ({
        id: doc.$id,
        title: doc.title,
        property: {
          address: doc.address,
          price: doc.price,
          description: doc.description,
          bedrooms: doc.bedrooms,
          bathrooms: doc.bathrooms,
          sqft: doc.sqft,
          buildYear: doc.buildYear,
          livingArea: doc.livingArea,
          garages: doc.garages,
          images: [],
        },
        sellerId: doc.sellerId,
        buyerId: doc.buyerId,
        managerId: doc.managerId,
        status: doc.status,
        coverImageId: doc.coverImageId,
        handover_date: doc.handover_date,
        referenceNumber: doc.referenceNumber,
        createdAt: doc.$createdAt,
        tasks: doc.tasks ? (typeof doc.tasks === 'string' ? JSON.parse(doc.tasks) : doc.tasks) : [],
        milestones: doc.milestones ? (typeof doc.milestones === 'string' ? JSON.parse(doc.milestones) : doc.milestones) : [],
        agenda: doc.agenda ? (typeof doc.agenda === 'string' ? JSON.parse(doc.agenda) : doc.agenda) : [],
        contractIds: doc.contractIds || [],
        messages: doc.messages ? (typeof doc.messages === 'string' ? JSON.parse(doc.messages) : doc.messages) : [],
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route
        path="/login"
        element={!user ? <Login onSwitchToRegister={() => setAuthView('register')} /> : <Navigate to="/" />}
      />
      <Route
        path="/register"
        element={!user ? <Register onSwitchToLogin={() => setAuthView('login')} /> : <Navigate to="/" />}
      />
      <Route
        path="/"
        element={
          !user
            ? authView === 'login'
              ? <Login onSwitchToRegister={() => setAuthView('register')} />
              : <Register onSwitchToLogin={() => setAuthView('login')} />
            : <Layout user={effectiveUser as AppUser} />
        }
      >
        <Route index element={<Dashboard projects={projects} user={effectiveUser as AppUser} allUsers={allUsers} taskTemplates={taskTemplates} />} />
        <Route path="projects" element={<Dashboard projects={projects} user={effectiveUser as AppUser} allUsers={allUsers} />} />
        <Route path="projects/:id" element={<ProjectDetail projects={projects} setProjects={setProjects} contracts={contracts} setContracts={setContracts} templates={templates} user={effectiveUser as AppUser} allUsers={allUsers} onRefresh={fetchData} />} />
        <Route path="contracts" element={<Contracts user={effectiveUser as AppUser} projects={projects} contracts={contracts} setContracts={setContracts} templates={templates} setTemplates={setTemplates} />} />
        <Route path="documents" element={<Documents user={effectiveUser as AppUser} projects={projects} onRefresh={fetchData} />} />
        <Route path="admin/documents" element={<DocumentManagement user={effectiveUser as AppUser} />} />
        <Route path="admin/tasks" element={<TaskLibrary user={effectiveUser as AppUser} onRefresh={fetchData} />} />
        <Route path="admin/forms" element={<FormsList />} />
        <Route path="admin/forms/edit/:id" element={<FormEditorView />} />
        <Route path="admin/forms/templates/edit/:id" element={<FormDefinitionEditor />} />
        <Route path="users" element={<UsersManagement user={effectiveUser as AppUser} allUsers={allUsers} setAllUsers={setAllUsers} projects={projects} />} />
        <Route path="admin/agency" element={<AgencyInfo user={effectiveUser as AppUser} allUsers={allUsers} />} />
        <Route path="profile" element={<Profile user={effectiveUser as AppUser} projects={projects} taskTemplates={taskTemplates} docDefinitions={docDefinitions} allUsers={allUsers} />} />
        <Route path="profile/:userId" element={<Profile user={effectiveUser as AppUser} projects={projects} taskTemplates={taskTemplates} docDefinitions={docDefinitions} allUsers={allUsers} />} />
        <Route path="agenda" element={<PlaceholderView title="Agenda & Calendar" />} />
        <Route path="tasks" element={<Tasks user={effectiveUser as AppUser} projects={projects} onRefresh={fetchData} />} />
        <Route path="inbox" element={<PlaceholderView title="Inbox" />} />
        <Route path="kb" element={<PlaceholderView title="Knowledge Base" />} />
        <Route path="settings" element={<Settings user={effectiveUser as AppUser} />} />
      </Route>
    </Routes>
  );
};

const Layout: React.FC<{ user: AppUser }> = ({ user }) => (
  <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
    <Sidebar user={user} />
    <div className="flex-1 flex flex-col min-w-0">
      <Header user={user} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
        <Outlet />
      </main>
    </div>
  </div>
);

interface MenuNavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const Sidebar: React.FC<{ user: AppUser }> = ({ user }) => {
  const location = useLocation();
  const isAdmin = user.role === UserRole.ADMIN;
  const { logout } = useAuth();

  const primaryMenu: MenuNavItem[] = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/projects', icon: <Building2 size={20} />, label: 'Projects' },
    { to: '/documents', icon: <FileText size={20} />, label: 'Vault' },
    { to: '/tasks', icon: <CheckSquare size={20} />, label: 'Tasks' },
    { to: '/agenda', icon: <Calendar size={20} />, label: 'Agenda' },
    { to: '/inbox', icon: <Mail size={20} />, label: 'Inbox' },
    { to: '/kb', icon: <BookOpen size={20} />, label: 'Knowledge Base' },
  ];

  const adminMenu: MenuNavItem[] = [
    { to: '/admin/agency', icon: <Building2 size={20} />, label: 'Agency Info' },
    { to: '/admin/tasks', icon: <Library size={20} />, label: 'Task Library' },
    { to: '/admin/documents', icon: <ShieldCheck size={20} />, label: 'Doc Requirements' },
    { to: '/admin/forms', icon: <ClipboardList size={20} />, label: 'Project Forms' },
    { to: '/contracts?tab=templates', icon: <FileSignature size={20} />, label: 'Contract Templates' },
    { to: '/users', icon: <UsersIcon size={20} />, label: 'User Directory' },
    { to: '/settings', icon: <SettingsIcon size={20} />, label: 'System Settings' },
  ];

  return (
    <div className="w-20 md:w-64 bg-slate-900 text-slate-400 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <Home size={24} />
        </div>
        <span className="hidden md:block font-bold text-white text-xl tracking-tight">EstateFlow</span>
      </div>

      <nav className="flex-1 px-4 mt-4 overflow-y-auto no-scrollbar space-y-6">
        <div className="space-y-1">
          {primaryMenu.map((item) => (
            <SidebarLink
              key={item.label}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
            />
          ))}
        </div>

        {isAdmin && (
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Administration</p>
            <div className="space-y-1">
              {adminMenu.map((item) => (
                <SidebarLink
                  key={item.label}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={location.pathname === item.to}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2 w-full hover:bg-slate-800 rounded-lg transition-colors text-sm"
        >
          <LogOut size={18} />
          <span className="hidden md:block">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-slate-800 hover:text-slate-100'}`}
  >
    {icon}
    <span className="hidden md:block font-medium text-sm">{label}</span>
  </Link>
);

const Header: React.FC<{ user: AppUser }> = ({ user }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 z-40 relative">
      <div className="flex items-center gap-4 bg-slate-100 px-3 py-2 rounded-lg w-full max-w-md">
        <Search size={18} className="text-slate-400" />
        <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-sm w-full" />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end mr-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
            user.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-600' :
            user.role === UserRole.SELLER ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
          }`}>
            {user.role} Portal
          </span>
        </div>
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 group p-1 rounded-full hover:bg-slate-50 transition-colors"
          >
            <img src={user.avatar} className="w-9 h-9 rounded-full ring-2 ring-slate-100 object-cover shadow-sm group-hover:ring-blue-200" alt="Profile" />
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-slate-50 mb-1">
                <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <UserIcon size={16} className="text-slate-400" /> My Profile
              </button>
              <button
                onClick={() => setIsDropdownOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <SettingsIcon size={16} className="text-slate-400" /> Account Settings
              </button>
              <div className="border-t border-slate-50 mt-1 pt-1">
                <button
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default App;
