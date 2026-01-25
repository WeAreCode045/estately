
import React, { useState, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  User as UserIcon, 
  LayoutDashboard, 
  LogOut, 
  Search, 
  Bell, 
  Users as UsersIcon,
  Settings,
  Plus,
  ChevronDown,
  Building2,
  Calendar,
  CheckSquare,
  Mail,
  BookOpen
} from 'lucide-react';
import { UserRole, Project, User as AppUser, Contract, ContractTemplate } from './types';
import { MOCK_USERS, MOCK_PROJECTS, MOCK_CONTRACTS, MOCK_TEMPLATES } from './constants';
import Dashboard from './views/Dashboard';
import ProjectDetail from './views/ProjectDetail';
import Profile from './views/Profile';
import Contracts from './views/Contracts';
import UsersManagement from './views/UsersManagement';

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
  const [currentUser, setCurrentUser] = useState<AppUser>(MOCK_USERS[0]); 
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [templates, setTemplates] = useState<ContractTemplate[]>(MOCK_TEMPLATES);
  const [allUsers, setAllUsers] = useState<AppUser[]>(MOCK_USERS);

  const switchUser = (role: UserRole) => {
    const found = allUsers.find(u => u.role === role);
    if (found) setCurrentUser(found);
  };

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
        <Sidebar user={currentUser} onSwitchRole={switchUser} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header user={currentUser} />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
            <Routes>
              <Route path="/" element={<Dashboard projects={projects} user={currentUser} allUsers={allUsers} />} />
              <Route path="/projects" element={<Dashboard projects={projects} user={currentUser} allUsers={allUsers} />} />
              <Route path="/projects/:id" element={<ProjectDetail projects={projects} setProjects={setProjects} contracts={contracts} setContracts={setContracts} templates={templates} user={currentUser} allUsers={allUsers} />} />
              <Route path="/contracts" element={<Contracts user={currentUser} projects={projects} contracts={contracts} setContracts={setContracts} templates={templates} setTemplates={setTemplates} />} />
              <Route path="/documents" element={<Contracts user={currentUser} projects={projects} contracts={contracts} setContracts={setContracts} templates={templates} setTemplates={setTemplates} />} />
              <Route path="/users" element={<UsersManagement user={currentUser} allUsers={allUsers} setAllUsers={setAllUsers} />} />
              <Route path="/profile" element={<Profile user={currentUser} />} />
              
              <Route path="/agenda" element={<PlaceholderView title="Agenda & Calendar" />} />
              <Route path="/tasks" element={<PlaceholderView title="Tasks Overview" />} />
              <Route path="/inbox" element={<PlaceholderView title="Inbox" />} />
              <Route path="/kb" element={<PlaceholderView title="Knowledge Base" />} />
              <Route path="/settings" element={<PlaceholderView title="Settings" />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
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

  const agentMenu: MenuNavItem[] = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/projects', icon: <Building2 size={20} />, label: 'Projects' },
    { to: '/documents', icon: <FileText size={20} />, label: 'Documents' },
    { to: '/agenda', icon: <Calendar size={20} />, label: 'Agenda' },
    { to: '/tasks', icon: <CheckSquare size={20} />, label: 'Tasks' },
    { to: '/users', icon: <UsersIcon size={20} />, label: 'Users' },
    { to: '/inbox', icon: <Mail size={20} />, label: 'Inbox' },
    { to: '/kb', icon: <BookOpen size={20} />, label: 'Knowledge Base' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const clientMenu: MenuNavItem[] = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/projects', icon: <Building2 size={20} />, label: 'Projects' },
    { to: '/documents', icon: <FileText size={20} />, label: 'Documents' },
    { to: '/agenda', icon: <Calendar size={20} />, label: 'Agenda' },
    { to: '/tasks', icon: <CheckSquare size={20} />, label: 'Tasks' },
    { to: '/inbox', icon: <Mail size={20} />, label: 'Inbox' },
    { to: '/kb', icon: <BookOpen size={20} />, label: 'Knowledge Base' },
  ];

  const currentMenu = isAdmin ? agentMenu : clientMenu;

  return (
    <div className="w-20 md:w-64 bg-slate-900 text-slate-400 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <Home size={24} />
        </div>
        <span className="hidden md:block font-bold text-white text-xl tracking-tight">EstateFlow</span>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto no-scrollbar">
        {currentMenu.map((item) => (
          <SidebarLink 
            key={item.label}
            to={item.to} 
            icon={item.icon} 
            label={item.label} 
            active={location.pathname === item.to} 
          />
        ))}
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
        <button className="flex items-center gap-3 px-3 py-2 w-full hover:bg-slate-800 rounded-lg transition-colors text-sm">
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
                <Settings size={16} className="text-slate-400" /> Account Settings
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
