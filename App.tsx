import React, { useState, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  User as UserIcon, 
  LayoutDashboard, 
  LogOut, 
  Search, 
  Bell, 
  Users as UsersIcon,
  Settings as SettingsIcon,
  Plus,
  ChevronDown,
  Building2,
  Calendar,
  CheckSquare,
  Mail,
  BookOpen,
  Library,
  ShieldCheck
} from 'lucide-react';
import { UserRole, Project, User as AppUser, Contract, ContractTemplate } from './types';
import { MOCK_USERS, MOCK_PROJECTS, MOCK_CONTRACTS, MOCK_TEMPLATES } from './constants';
import Dashboard from './views/Dashboard';
import ProjectDetail from './views/ProjectDetail';
import Profile from './views/Profile';
import Contracts from './views/Contracts';
import Documents from './views/Documents';
import DocumentManagement from './views/DocumentManagement';
import TaskLibrary from './views/TaskLibrary';
import Tasks from './views/Tasks';
import UsersManagement from './views/UsersManagement';
import Settings from './views/Settings';
import DocTemplates from './views/DocTemplates';
import AdminForms from './views/AdminForms';
import FormResponses from './views/FormResponses';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './views/Login';
import Register from './views/Register';
import AcceptInvite from './views/AcceptInvite';
import { projectService, COLLECTIONS, DATABASE_ID, client, databases, Query } from './services/appwrite';

// Simple placeholder for new routes
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
  const [currentUser, setCurrentUser] = useState<AppUser>({
    id: 'guest',
    name: 'Guest User',
    email: '',
    role: UserRole.BUYER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'
  }); 
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  const switchUser = (role: UserRole) => {
    const found = allUsers.find(u => u.role === role);
    if (found) setCurrentUser(found);
  };

  return (
    <AuthProvider>
      <HashRouter>
        <AppContent 
          currentUser={currentUser} 
          projects={projects} 
          setProjects={setProjects}
          contracts={contracts}
          setContracts={setContracts}
          templates={templates}
          setTemplates={setTemplates}
          allUsers={allUsers}
          setAllUsers={setAllUsers}
          switchUser={switchUser}
        />
      </HashRouter>
    </AuthProvider>
  );
};

const AppContent: React.FC<{
  currentUser: AppUser,
  projects: Project[],
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>,
  contracts: Contract[],
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>,
  templates: ContractTemplate[],
  setTemplates: React.Dispatch<React.SetStateAction<ContractTemplate[]>>,
  allUsers: AppUser[],
  setAllUsers: React.Dispatch<React.SetStateAction<AppUser[]>>,
  switchUser: (role: UserRole) => void
}> = ({ 
  currentUser, 
  projects, 
  setProjects, 
  contracts, 
  setContracts, 
  templates, 
  setTemplates, 
  allUsers, 
  setAllUsers, 
  switchUser 
}) => {
  const { user, profile, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [docDefinitions, setDocDefinitions] = useState<any[]>([]);

  // Deriving the effective user: Prioritize profile from DB, then account from Auth, then fallback (initial state/last mock switch)
  const effectiveUser = React.useMemo(() => {
    if (profile) {
      return {
        ...profile,
        id: profile.userId,
        avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email}`,
        assignedTasks: profile.assignedTasks ? (typeof profile.assignedTasks === 'string' ? JSON.parse(profile.assignedTasks) : profile.assignedTasks) : [],
        userDocuments: profile.userDocuments ? (typeof profile.userDocuments === 'string' ? JSON.parse(profile.userDocuments) : profile.userDocuments) : []
      };
    }
    if (user) {
      return {
        id: user.$id,
        name: user.name,
        email: user.email,
        role: currentUser.role || UserRole.BUYER,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
      };
    }
    return currentUser;
  }, [profile, user, currentUser.role]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, profile]);

  const fetchData = async () => {
    try {
      // Fetch users/profiles and pending invites
      const [profilesData, invitesData] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.INVITES, [Query.equal('status', 'PENDING')])
      ]);
      
      // Map to User objects and deduplicate by userId
      const userMap = new Map();
      profilesData.documents.forEach((doc: any) => {
        if (!userMap.has(doc.userId)) {
          userMap.set(doc.userId, {
            id: doc.userId, // Maps to Auth ID
            userId: doc.userId, // Explicitly exposed
            $id: doc.$id,  // Maps to Profile Document ID
            name: doc.name,
            email: doc.email,
            role: doc.role as UserRole,
            phone: doc.phone,
            address: doc.address,
            bio: doc.bio,
            avatar: doc.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.email}`,
            status: doc.status || 'ACTIVE',
            assignedTasks: doc.assignedTasks ? (typeof doc.assignedTasks === 'string' ? JSON.parse(doc.assignedTasks) : doc.assignedTasks) : [],
            userDocuments: doc.userDocuments ? (typeof doc.userDocuments === 'string' ? JSON.parse(doc.userDocuments) : doc.userDocuments) : []
          });
        }
      });

      // Add pending invites to the list
      invitesData.documents.forEach((doc: any) => {
        if (!userMap.has(doc.email)) {
          userMap.set(doc.email, {
            id: doc.$id, // Keep document ID as the primary ID for invites to support deletion/lookup
            userId: doc.userId, // Store the actual Appwrite User ID if the function has already run
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

      // Fetch projects
      const projectsData = await projectService.list();
      // Fetch definitions and templates
      const [templatesResponse, docsResponse] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS)
      ]);

      setTaskTemplates(templatesResponse.documents.map(d => ({ 
        id: d.$id, 
        title: d.title, 
        description: d.description,
        category: d.category 
      })));
      
      setDocDefinitions(docsResponse.documents.map(d => ({ 
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
          images: [], // Handled by storage later
        },
        sellerId: doc.sellerId,
        buyerId: doc.buyerId,
        managerId: doc.managerId,
        status: doc.status,
        coverImageId: doc.coverImageId,
        tasks: [], // Sub-collections or JSON later
        milestones: [],
        agenda: [],
        contractIds: [],
        messages: [],
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
    </div>;
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
        path="*" 
        element={
          !user ? (
            authView === 'login' 
              ? <Login onSwitchToRegister={() => setAuthView('register')} /> 
              : <Register onSwitchToLogin={() => setAuthView('login')} />
          ) : (
            <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
              <Sidebar user={effectiveUser as AppUser} onSwitchRole={switchUser} />

              <div className="flex-1 flex flex-col min-w-0">
                <Header user={effectiveUser as AppUser} />
                
                <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
                  <Routes>
                    <Route path="/" element={<Dashboard projects={projects} user={effectiveUser as AppUser} allUsers={allUsers} taskTemplates={taskTemplates} />} />
                    <Route path="/projects" element={<Dashboard projects={projects} user={effectiveUser as AppUser} allUsers={allUsers} />} />
                    <Route path="/projects/:id" element={<ProjectDetail projects={projects} setProjects={setProjects} contracts={contracts} setContracts={setContracts} templates={templates} user={effectiveUser as AppUser} allUsers={allUsers} onRefresh={fetchData} />} />
                    <Route path="/contracts" element={<Contracts user={effectiveUser as AppUser} projects={projects} contracts={contracts} setContracts={setContracts} templates={templates} setTemplates={setTemplates} />} />
                    <Route path="/documents" element={<Documents user={effectiveUser as AppUser} projects={projects} onRefresh={fetchData} />} />
                    <Route path="/admin/documents" element={<DocumentManagement user={effectiveUser as AppUser} />} />
                    <Route path="/admin/templates" element={<DocTemplates />} />
                    <Route path="/admin/forms" element={<AdminForms />} />
                    <Route path="/admin/forms/:formId/responses" element={<FormResponses />} />
                    <Route path="/admin/tasks" element={<TaskLibrary user={effectiveUser as AppUser} onRefresh={fetchData} />} />
                    <Route path="/users" element={<UsersManagement user={effectiveUser as AppUser} allUsers={allUsers} setAllUsers={setAllUsers} projects={projects} />} />
                    <Route path="/profile" element={<Profile user={effectiveUser as AppUser} projects={projects} taskTemplates={taskTemplates} docDefinitions={docDefinitions} allUsers={allUsers} />} />
                    <Route path="/profile/:userId" element={<Profile user={effectiveUser as AppUser} projects={projects} taskTemplates={taskTemplates} docDefinitions={docDefinitions} allUsers={allUsers} />} />
                    
                    <Route path="/agenda" element={<PlaceholderView title="Agenda & Calendar" />} />
                    <Route path="/tasks" element={<Tasks user={effectiveUser as AppUser} projects={projects} onRefresh={fetchData} />} />
                    <Route path="/inbox" element={<PlaceholderView title="Inbox" />} />
                    <Route path="/kb" element={<PlaceholderView title="Knowledge Base" />} />
                    <Route path="/settings" element={<Settings user={effectiveUser as AppUser} />} />
                  </Routes>
                </main>
              </div>
            </div>
          )
        } 
      />
    </Routes>
  );
};

interface MenuNavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const Sidebar: React.FC<{ user: AppUser, onSwitchRole: (role: UserRole) => void }> = ({ user, onSwitchRole }) => {
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
    { to: '/admin/tasks', icon: <Library size={20} />, label: 'Task Library' },
    { to: '/admin/documents', icon: <ShieldCheck size={20} />, label: 'Doc Requirements' },
    { to: '/admin/templates', icon: <FileText size={20} />, label: 'Doc Templates' },
    { to: '/admin/forms', icon: <FileText size={20} />, label: 'Forms' },
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

      {/* Demo Switcher - Helpful for testing role-specific layouts */}
      <div className="p-4 border-t border-slate-800 hidden md:block">
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-3 tracking-widest">Switch View</p>
        <div className="space-y-1">
          <button onClick={() => onSwitchRole(UserRole.ADMIN)} className={`w-full text-left px-3 py-1.5 rounded text-xs transition-all ${user.role === UserRole.ADMIN ? 'bg-blue-600/20 text-blue-400 font-bold' : 'hover:bg-slate-800'}`}>Agent Portal</button>
          <button onClick={() => onSwitchRole(UserRole.SELLER)} className={`w-full text-left px-3 py-1.5 rounded text-xs transition-all ${user.role === UserRole.SELLER ? 'bg-emerald-600/20 text-emerald-400 font-bold' : 'hover:bg-slate-800'}`}>Seller Portal</button>
          <button onClick={() => onSwitchRole(UserRole.BUYER)} className={`w-full text-left px-3 py-1.5 rounded text-xs transition-all ${user.role === UserRole.BUYER ? 'bg-indigo-600/20 text-indigo-400 font-bold' : 'hover:bg-slate-800'}`}>Buyer Portal</button>
        </div>
      </div>

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

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, active: boolean }> = ({ to, icon, label, active }) => (
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
  const { isImpersonating, stopImpersonation, impersonatedProfile } = useAuth();

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
        {isImpersonating && (
          <div className="hidden lg:flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-amber-700 animate-pulse">
            <UserIcon size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Viewing as {user.name}</span>
            <button 
              onClick={async () => {
                await stopImpersonation();
                window.location.href = '/';
              }}
              className="ml-2 bg-amber-200/50 hover:bg-amber-200 px-2 py-0.5 rounded text-[9px] font-bold text-amber-900 transition-colors"
            >
              EXIT
            </button>
          </div>
        )}
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
              {isImpersonating && (
                <button 
                  onClick={async () => {
                    await stopImpersonation();
                    setIsDropdownOpen(false);
                    window.location.href = '/';
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors text-left font-medium"
                >
                  <LogOut size={16} /> Stop Impersonating
                </button>
              )}
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
