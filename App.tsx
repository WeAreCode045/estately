import {
  Bell,
  Blocks,
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
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HashRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { COLLECTIONS, DATABASE_ID, databases, projectService, Query } from './services/appwrite';
import { contractTemplatesService } from './services/contractTemplatesService';
import type { User as AppUser, Contract, ContractTemplate, Project, TaskTemplate } from './types';
import { ContractStatus, ProjectStatus, UserRole } from './types';
import AcceptInvite from './views/AcceptInvite';
import AgencyInfo from './views/AgencyInfo';
import BlockBuilder from './views/BlockBuilder';
import Contracts from './views/Contracts';
import Dashboard from './views/Dashboard';
import DocumentManagement from './views/DocumentManagement';
import Documents from './views/Documents';
import FormDefinitionEditor from './views/FormDefinitionEditor';
import FormEditorView from './views/FormEditor';
import FormsList from './views/FormsList';
import Login from './views/Login';
import Profile from './views/Profile';
import PropertyBrochure from './views/PropertyBrochure';
import TemplateRendererExample from './views/TemplateRendererExample';

type ProjectDetailProps = {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  templates: ContractTemplate[];
  user: AppUser | null;
  allUsers: AppUser[];
  onRefresh?: () => Promise<void>;
};

const ProjectDetail: React.FC<ProjectDetailProps> = (props) => {
  const Component = React.lazy<React.ComponentType<ProjectDetailProps>>(() =>
    import('./views/ProjectDetail').then((mod) => {
      const typed = mod as {
        ProjectDetail?: React.ComponentType<ProjectDetailProps>;
        default?: React.ComponentType<ProjectDetailProps>;
      };
      const Comp = typed.ProjectDetail ?? typed.default ?? (() => <div>ProjectDetail export not found</div>);
      return { default: Comp as React.ComponentType<ProjectDetailProps> };
    })
  );

  return (
    <React.Suspense fallback={<div />}>
      <Component {...props} />
    </React.Suspense>
  );
};

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

  type DocDefinition = {
    id: string;
    title: string;
    description?: string;
    role?: string;
  };

  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [docDefinitions, setDocDefinitions] = useState<DocDefinition[]>([]);

  const effectiveUser = React.useMemo(() => {
    if (profile) {
      const user = {
        ...profile,
        id: profile.userId,
        avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email}`,
        assignedTasks: profile.assignedTasks ? (typeof profile.assignedTasks === 'string' ? JSON.parse(profile.assignedTasks) : profile.assignedTasks) : [],
        userDocuments: profile.userDocuments ? (typeof profile.userDocuments === 'string' ? JSON.parse(profile.userDocuments) : profile.userDocuments) : []
      } as AppUser;

      // Debug logging
      console.log('Profile loaded:', {
        email: user.email,
        role: user.role,
        roleType: typeof user.role,
        profileRole: profile.role
      });

      return user;
    }
    // If no profile yet, don't render authenticated views
    return null;
  }, [profile, user]);

  const fetchData = useCallback(async () => {
    try {
      const [profilesData, invitesData] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.INVITES, [Query.equal('status', 'PENDING')])
      ]);

      const userMap = new Map();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      interface InviteDoc {
        $id: string;
        userId?: string;
        name?: string;
        email: string;
        role?: UserRole;
        projectId?: string;
      }

      invitesData.documents.forEach((doc: InviteDoc) => {
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
      const [templatesResponse, docsResponse, contractTemplates, contractsResponse] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS),
        contractTemplatesService.list(),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.CONTRACTS, [
          Query.limit(100),
          Query.orderDesc('$createdAt')
        ])
      ]);

      setContracts(contractsResponse.documents.map((doc: any) => ({
        id: doc.$id,
        projectId: doc.projectId,
        title: doc.title,
        content: doc.content,
        status: doc.status as ContractStatus,
        assignees: doc.assignees || [],
        signedBy: doc.signedBy || [],
        createdAt: doc.$createdAt,
        signatureData: doc.signatureData ? (typeof doc.signatureData === 'string' ? JSON.parse(doc.signatureData) : doc.signatureData) : {},
        visibility: doc.visibility || 'public'
      })));

      setTemplates(contractTemplates);

      setTaskTemplates(templatesResponse.documents.map((d: any) => ({
        id: d.$id,
        title: d.title,
        description: d.description,
        category: d.category
      } as TaskTemplate)));

      setDocDefinitions(docsResponse.documents.map((d: any) => ({
        id: d.$id,
        title: d.title,
        description: d.description,
        role: d.role
      })));

      setProjects(projectsData.documents.map((doc: unknown) => {
        const d = doc as {
          $id: string;
          title: string;
          status?: string;
          price?: number;
          handover_date?: string;
          reference_nr?: string;
          property_id?: string;
          agent_id?: string;
          buyer_id?: string;
          seller_id?: string;
          $createdAt?: string;
          $permissions?: string[];
          // Legacy fields (for backward compatibility)
          address?: string;
          description?: string;
          bedrooms?: number;
          bathrooms?: number;
          sqft?: number;
          buildYear?: number;
          livingArea?: number;
          garages?: number;
          media?: string[];
          sellerId?: string;
          buyerId?: string;
          managerId?: string;
          coverImageId?: string;
          referenceNumber?: string;
          tasks?: string | any[];
          milestones?: string | any[];
          agenda?: string | any[];
          contractIds?: string[];
          messages?: string | any[];
        };

        // For backward compatibility: create legacy property object from old or new structure
        const legacyProperty = {
          address: d.address || 'Address not available',
          price: d.price || 0,
          description: d.description || '',
          bedrooms: d.bedrooms || 0,
          bathrooms: d.bathrooms || 0,
          sqft: d.sqft || 0,
          buildYear: d.buildYear || null,
          livingArea: d.livingArea || 0,
          garages: d.garages || 0,
          images: d.media || [],
        };

        const mapContractStatusToProjectStatus = (status: ContractStatus | string | undefined): ProjectStatus | undefined => {
          // Map contract statuses to project statuses according to your business logic
          switch (status) {
            case ContractStatus.DRAFT: return ProjectStatus.PENDING;
            case ContractStatus.PENDING_SIGNATURE: return ProjectStatus.PENDING;
            case ContractStatus.SIGNED: return ProjectStatus.UNDER_CONTRACT;
            case ContractStatus.EXECUTED: return ProjectStatus.SOLD;
            case ContractStatus.CANCELLED: return ProjectStatus.ARCHIVED;
            default: return undefined;
          }
        };

        return {
          id: d.$id,
          $databaseId: DATABASE_ID,
          $collectionId: COLLECTIONS.PROJECTS,
          title: d.title,
          status: mapContractStatusToProjectStatus(d.status),
          price: d.price || 0,
          handover_date: d.handover_date,
          reference_nr: d.reference_nr || d.referenceNumber,
          property_id: d.property_id || d.$id, // Use property_id if available, fallback to project id
          agent_id: d.agent_id || d.managerId || '',
          buyer_id: d.buyer_id,
          seller_id: d.seller_id,
          $permissions: d.$permissions || [],
          created_by: d.seller_id || d.sellerId || '',
          // Legacy compatibility fields
          property: legacyProperty,
          media: d.media || [],
          sellerId: d.sellerId || d.seller_id,
          buyerId: d.buyerId || d.buyer_id,
          managerId: d.managerId || d.agent_id,
          coverImageId: d.coverImageId,
          referenceNumber: d.reference_nr || d.referenceNumber,
          createdAt: d.$createdAt,
          tasks: d.tasks ? (typeof d.tasks === 'string' ? JSON.parse(d.tasks) : d.tasks) : [],
          milestones: d.milestones ? (typeof d.milestones === 'string' ? JSON.parse(d.milestones) : d.milestones) : [],
          agenda: d.agenda ? (typeof d.agenda === 'string' ? JSON.parse(d.agenda) : d.agenda) : [],
          contractIds: d.contractIds || [],
          messages: d.messages ? (typeof d.messages === 'string' ? JSON.parse(d.messages) : d.messages) : [],
        } as Project;
      }));
    } catch (error) {
      globalThis.console?.error?.('Error fetching data:', error);
    }
  }, [setAllUsers, setContracts, setTemplates, setTaskTemplates, setDocDefinitions, setProjects]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [fetchData, user, profile]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  // If user is authenticated but profile hasn't loaded yet, show loading
  if (user && !effectiveUser) {
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
        <Route path="projects/:projectId/brochure" element={<PropertyBrochure />} />
        <Route path="contracts" element={<Contracts user={effectiveUser as AppUser} projects={projects} contracts={contracts} setContracts={setContracts} templates={templates} setTemplates={setTemplates} />} />
        <Route path="documents" element={<Documents user={effectiveUser as AppUser} projects={projects} onRefresh={fetchData} />} />
        <Route path="admin/documents" element={<DocumentManagement user={effectiveUser as AppUser} />} />
        <Route path="admin/tasks" element={<TaskLibrary user={effectiveUser as AppUser} onRefresh={fetchData} />} />
        <Route path="admin/forms" element={<FormsList />} />
        <Route path="admin/block-builder" element={<BlockBuilder />} />
        <Route path="admin/renderer-test" element={<TemplateRendererExample />} />
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
  // Handle both enum values and string values for role comparison
  const userRoleStr = typeof user.role === 'string' ? user.role.toLowerCase() : '';
  const isAdmin = user.role === UserRole.ADMIN || userRoleStr === 'admin';
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
    { to: '/admin/block-builder', icon: <Blocks size={20} />, label: 'Block Builder' },
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
    if (typeof globalThis !== 'undefined' && (globalThis as any).document?.addEventListener) {
      (globalThis as any).document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      if (typeof globalThis !== 'undefined' && (globalThis as any).document?.removeEventListener) {
        (globalThis as any).document.removeEventListener('mousedown', handleClickOutside);
      }
    };
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
