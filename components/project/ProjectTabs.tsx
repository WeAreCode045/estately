import { ClipboardList, FileText, Home, Users as UsersGroupIcon } from 'lucide-react';
import React from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-8 py-5 text-sm font-bold border-b-2 transition-all shrink-0 ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
    {icon} {label}
  </button>
);

interface ProjectTabsProps {
  activeTab: 'overview' | 'team' | 'documents' | 'property';
  setActiveTab: (tab: 'overview' | 'team' | 'documents' | 'property') => void;
  isAdmin: boolean;
}

export const ProjectTabs: React.FC<ProjectTabsProps> = ({ activeTab, setActiveTab, isAdmin }) => {
  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
      <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50/50">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<ClipboardList size={18}/>} label="Overview" />
        <TabButton active={activeTab === 'property'} onClick={() => setActiveTab('property')} icon={<Home size={18}/>} label="Property" />
        <TabButton active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} icon={<FileText size={18}/>} label="Documents" />
        {isAdmin && <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={<UsersGroupIcon size={18}/>} label="Team Management" />}
      </div>
{/* Closing div will be handled in parent or we should include children here?
    Better to keep tabs extraction simple and let parent handle content if possible,
    OR make this a wrapper component.
    The original code had the content INSIDE the same container as tabs.
    So this component should probably just be the Tab Bar, and the container should remain in parent or be a separate wrapper.
*/}
    </div>
  );
};

export const ProjectTabBar: React.FC<ProjectTabsProps> = ({ activeTab, setActiveTab, isAdmin }) => {
    return (
        <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50/50">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<ClipboardList size={18}/>} label="Overview" />
          <TabButton active={activeTab === 'property'} onClick={() => setActiveTab('property')} icon={<Home size={18}/>} label="Property" />
          <TabButton active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} icon={<FileText size={18}/>} label="Documents" />
          {isAdmin && <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={<UsersGroupIcon size={18}/>} label="Team Management" />}
        </div>
    );
}

export default ProjectTabBar;
