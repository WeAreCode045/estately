import { ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useProject, useProjectDocuments, useProjectTasks } from '../hooks';
import type { Contract, ContractTemplate, Project as ProjectType, User } from '../types';
import { UserRole } from '../types';
import { useSettings } from '../utils/useSettings';

import { BulkSpecsModal, GeneralInfoModal } from '../features/projects/components';
import ProjectDocuments from '../features/projects/components/ProjectDocuments';
import ProjectHeader from '../features/projects/components/ProjectHeader';
import ProjectOverview from '../features/projects/components/ProjectOverview';
import ProjectProperty from '../features/projects/components/ProjectProperty';
import { ProjectTabBar } from '../features/projects/components/ProjectTabs';
import ProjectTeam from '../features/projects/components/ProjectTeam';

interface ProjectDetailProps {
  projects: ProjectType[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectType[]>>;
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  templates: ContractTemplate[];
  user: User | null;
  allUsers: User[];
  onRefresh?: () => Promise<void>;
}

/**
 * ProjectDetail View - Main project detail page
 *
 * Architecture:
 * - Uses custom hooks for data fetching (useProject, useProjectTasks, useProjectDocuments)
 * - Delegates UI rendering to feature components in features/projects/components/
 * - No direct API calls - all data management through hooks
 */
const ProjectDetail: React.FC<ProjectDetailProps> = ({ allUsers, user, onRefresh }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { googleApiKey } = useSettings();

  const [activeTab, setActiveTab] = React.useState<'overview' | 'team' | 'documents' | 'property'>('overview');
  const [showGeneralInfoModal, setShowGeneralInfoModal] = useState(false);
  const [showBulkSpecsModal, setShowBulkSpecsModal] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Data fetching via custom hooks
  const { project, propertyData, loading: projectLoading, error: projectError, updateProject } = useProject(id);
  const { tasks, loading: tasksLoading, updateTaskStatus } = useProjectTasks({
    projectId: id || ''
  });
  const {
    documents,
    loading: docsLoading,
    createDocument,
    updateVerificationStatus
  } = useProjectDocuments({
    projectId: id || ''
  });

  const isAdmin = user?.role?.toLowerCase() === UserRole.ADMIN;

  // Derive stakeholders from allUsers
  const seller = project ? allUsers.find(u => u.id === project.sellerId || u.$id === project.sellerId) : undefined;
  const buyer = project ? allUsers.find(u => u.id === project.buyerId || u.$id === project.buyerId) : undefined;
  const agent = project ? allUsers.find(u => u.id === project.agentId || u.$id === project.agentId) : undefined;

  // Handler for saving general info from modal
  const handleSaveGeneralInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setIsProcessing(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    try {
      const updates: any = {
        title: formData.get('title') as string,
        price: parseFloat(formData.get('price') as string) || 0,
        referenceNr: formData.get('referenceNumber') as string,
      };
      // Note: Address is stored in Property collection, not Project
      // For now just update project fields
      await updateProject(updates);
      setShowGeneralInfoModal(false);
      if (onRefresh) await onRefresh();
    } catch (error: any) {
      console.error('Error updating general info:', error);
      alert(`Failed to update: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for saving bulk specs from modal
  const handleSaveBulkSpecs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    setIsProcessing(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    try {
      // Note: These specs are stored in Property collection (rooms, size)
      // For now, update legacy project fields for backward compatibility
      const updates: any = {
        bedrooms: parseInt(formData.get('bedrooms') as string) || 0,
        bathrooms: parseFloat(formData.get('bathrooms') as string) || 0,
        sqft: parseInt(formData.get('sqft') as string) || 0,
        buildYear: parseInt(formData.get('buildYear') as string) || null,
        livingArea: parseInt(formData.get('livingArea') as string) || 0,
        garages: parseInt(formData.get('garages') as string) || 0,
      };
      await updateProject(updates);
      setShowBulkSpecsModal(false);
      if (onRefresh) await onRefresh();
    } catch (error: any) {
      console.error('Error updating specs:', error);
      alert(`Failed to update: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!id) {
    navigate('/dashboard');
    return null;
  }

  if (projectLoading || tasksLoading || docsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-red-900 mb-2">Project Not Found</h2>
          <p className="text-red-700">{projectError || 'This project does not exist or has been deleted.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <ProjectHeader
        project={project}
        propertyData={propertyData}
        isAdmin={isAdmin}
        onBack={() => navigate('/dashboard')}
        onUpdate={updateProject}
      />

      {/* Tabs Container */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
          <ProjectTabBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isAdmin={isAdmin}
          />

          <div className="p-8">
            {activeTab === 'overview' && (
              <ProjectOverview
                project={project}
                tasks={tasks}
                onUpdateTaskStatus={updateTaskStatus}
                seller={seller}
                buyer={buyer}
                agent={agent}
              />
            )}

            {activeTab === 'property' && (
              <ProjectProperty
                project={project}
                propertyData={propertyData}
                isAdmin={isAdmin}
                setShowGeneralInfoModal={setShowGeneralInfoModal}
                setTempAddress={setTempAddress}
                setShowBulkSpecsModal={setShowBulkSpecsModal}
                onUpdateProject={async (_, updates) => await updateProject(updates)}
              />
            )}

            {activeTab === 'documents' && (
              <ProjectDocuments
                project={project}
                documents={documents}
                isAdmin={isAdmin}
                onCreateDocument={createDocument}
                onUpdateVerification={updateVerificationStatus}
              />
            )}

            {activeTab === 'team' && (
              <ProjectTeam
                project={project}
                isAdmin={isAdmin}
                onUpdate={updateProject}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <GeneralInfoModal
        isOpen={showGeneralInfoModal}
        project={project}
        propertyData={propertyData}
        onClose={() => setShowGeneralInfoModal(false)}
        onSave={handleSaveGeneralInfo}
        isProcessing={isProcessing}
        googleApiKey={googleApiKey}
        tempAddress={tempAddress}
        setTempAddress={setTempAddress}
      />

      <BulkSpecsModal
        isOpen={showBulkSpecsModal}
        project={project}
        propertyData={propertyData}
        onClose={() => setShowBulkSpecsModal(false)}
        onSave={handleSaveBulkSpecs}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default ProjectDetail;
