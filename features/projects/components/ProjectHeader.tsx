import {
    Calendar,
    CheckCircle, ChevronRight,
    ClipboardList,
    Clock,
    Download,
    Edit2,
    FileText,
    Home,
    MapPin,
    Sparkles,
    Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getProperty, type ParsedPropertyData } from '../../../api/propertyService';
import AsyncImage from '../../../components/AsyncImage';
import type { Project } from '../../../types';
import { formatAddress, parseLocation, parseMedia } from '../../../utils/propertyHelpers';

interface ProjectHeaderProps {
  project: Project;
  projectStatusData: any;
  showActionMenu: boolean;
  setShowActionMenu: (show: boolean) => void;
  fetchInsights: () => void;
  setShowFormTemplatePicker: (show: boolean) => void;
  setShowTemplatePicker: (show: boolean) => void;
  setIsTaskLibraryOpen: (show: boolean) => void;
  setActiveTab: (tab: 'overview' | 'team' | 'documents' | 'property') => void;
  setShowGeneralInfoModal: (show: boolean) => void;
  onGenerateBrochure?: () => void;
  onViewBrochure?: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  projectStatusData,
  showActionMenu,
  setShowActionMenu,
  fetchInsights,
  setShowFormTemplatePicker,
  setShowTemplatePicker,
  setIsTaskLibraryOpen,
  setActiveTab,
  setShowGeneralInfoModal,
  onGenerateBrochure,
  onViewBrochure
}) => {
  const [propertyData, setPropertyData] = useState<ParsedPropertyData | null>(null);

  useEffect(() => {
    const loadProperty = async () => {
      if (!project.propertyId) return;
      try {
        const prop = await getProperty(project.propertyId);
        const mediaData = parseMedia(prop.media);
        const locationData = parseLocation(prop.location);
        setPropertyData({
          property: prop,
          descriptions: typeof prop.description === 'string' ? JSON.parse(prop.description) : prop.description,
          locationData,
          sizeData: typeof prop.size === 'string' ? JSON.parse(prop.size) : prop.size,
          mediaData,
          roomsData: typeof prop.rooms === 'string' ? JSON.parse(prop.rooms) : prop.rooms,
          specsData: typeof prop.specs === 'string' ? JSON.parse(prop.specs) : prop.specs,
          formattedAddress: formatAddress(locationData)
        });
      } catch (error) {
        console.error('Error loading property:', error);
      }
    };
    loadProperty();
  }, [project.propertyId]);

  const getCoverImageSrcOrId = () => {
    // Use cover from Property collection
    if (propertyData?.mediaData?.cover) {
      return propertyData.mediaData.cover;
    }
    // Fallback to first image from Property collection
    if (propertyData?.mediaData?.images && propertyData.mediaData.images.length > 0) {
      return propertyData.mediaData.images[0];
    }
    return null;
  };

  const coverImageSrcOrId = getCoverImageSrcOrId();
  const address = propertyData?.formattedAddress || 'Loading...';

  return (
    <div className="relative mb-8 group">
      {/* Background Container - Handles clipping for blur effects */}
      <div className="absolute inset-0 bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
      </div>

      {/* Content Container - Allows overflow for dropdowns */}
      <div className="relative z-10 p-8 md:p-10 text-white">
        <div className="flex flex-col xl:flex-row items-start justify-between gap-8 mb-6">
          <div className="flex-1 min-w-0 flex items-start gap-6">
             {coverImageSrcOrId ? (
                <AsyncImage
                  srcOrId={coverImageSrcOrId}
                  alt="Project"
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-700 shadow-lg"
                />
             ) : (
                <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center border-4 border-slate-700 shadow-lg">
                   <Home size={32} className="text-slate-500" />
                </div>
             )}
             <div className="pt-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Project Summary</p>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100/50">
                    {(project.status || '').replace('_', ' ')}
                  </span>
                </div>
                <h1 className="text-3xl font-black text-white leading-tight truncate mb-2">{project.title}</h1>
                <p className="text-sm text-slate-300 font-bold flex items-center gap-2 tracking-tight">
                  <MapPin size={14} className="text-blue-500 flex-shrink-0" /> {address}
                </p>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-8 self-end xl:self-start">
            <div className="text-right">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">List Price</p>
              <p className="text-2xl font-black text-blue-400">€{(project.price || 0).toLocaleString()}</p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className="w-12 h-12 bg-slate-800 text-slate-300 rounded-2xl hover:bg-slate-700 transition-all flex items-center justify-center shadow-lg border border-slate-700"
                title="Actions"
              >
                <Zap size={20} />
              </button>

              {showActionMenu && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 py-3 z-[100] animate-in slide-in-from-top-2 duration-200">
                   <div className="px-5 py-3 mb-1 border-b border-slate-50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Actions</span>
                   </div>
                   <button
                     onClick={() => { fetchInsights(); setShowActionMenu(false); }}
                     className="w-full px-5 py-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                   >
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <div className="font-bold">AI Analysis</div>
                        <div className="text-[10px] text-slate-400 font-normal">Generate insights & summaries</div>
                      </div>
                   </button>
                   <button
                     onClick={() => { setShowFormTemplatePicker(true); setShowActionMenu(false); }}
                     className="w-full px-5 py-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                   >
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <ClipboardList size={18} />
                      </div>
                      <div>
                        <div className="font-bold">Assign Form</div>
                        <div className="text-[10px] text-slate-400 font-normal">Request data from clients</div>
                      </div>
                   </button>
                   <button
                     onClick={() => { setShowTemplatePicker(true); setShowActionMenu(false); }}
                     className="w-full px-5 py-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                   >
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <FileText size={18} />
                      </div>
                       <div>
                        <div className="font-bold">Draft Contract</div>
                        <div className="text-[10px] text-slate-400 font-normal">Create legal documents</div>
                      </div>
                   </button>
                   <button
                     onClick={() => { setIsTaskLibraryOpen(true); setShowActionMenu(false); }}
                     className="w-full px-5 py-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                   >
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all">
                        <CheckCircle size={18} />
                      </div>
                       <div>
                        <div className="font-bold">Add Task</div>
                        <div className="text-[10px] text-slate-400 font-normal">Manage todos & timeline</div>
                      </div>
                   </button>
                   {onViewBrochure && (
                   <button
                     onClick={() => { onViewBrochure(); setShowActionMenu(false); }}
                     className="w-full px-5 py-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                   >
                      <div className="p-2 bg-pink-50 text-pink-600 rounded-xl group-hover:bg-pink-600 group-hover:text-white transition-all">
                        <FileText size={18} />
                      </div>
                       <div>
                        <div className="font-bold">View Brochure</div>
                        <div className="text-[10px] text-slate-400 font-normal">Interactive property template</div>
                      </div>
                   </button>
                   )}
                   {onGenerateBrochure && (
                   <button
                     onClick={() => { onGenerateBrochure(); setShowActionMenu(false); }}
                     className="w-full px-5 py-3 text-left text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                   >
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all">
                        <Download size={18} />
                      </div>
                       <div>
                        <div className="font-bold">Download Brochure</div>
                        <div className="text-[10px] text-slate-400 font-normal">Generate PDF flyer</div>
                      </div>
                   </button>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 border-t border-slate-800/50 pt-6">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Project ID</p>
            <p className="text-sm font-bold text-slate-300">{project.$id.substring(0, 8)}</p>
          </div>
          <div className="text-center md:text-left">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Created Date</p>
             <p className="text-sm font-bold text-slate-300 flex items-center justify-center md:justify-start gap-2">
               <Calendar size={14} className="text-slate-500"/> {project.$createdAt ? new Date(project.$createdAt).toLocaleDateString() : 'N/A'}
             </p>
          </div>
          <div className="text-center md:text-left">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Closing TARGET</p>
             <p className="text-sm font-bold text-white flex items-center justify-center md:justify-start gap-2">
                <Clock size={14} className="text-blue-500"/>
                {project.handover_date
                  ? <span className="text-blue-100 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-800/50">{new Date(project.handover_date).toLocaleDateString()}</span>
                  : 'Not Set'
                }
             </p>
          </div>
          <div className="flex items-center justify-end gap-2">
             <button onClick={() => setActiveTab('property')} className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5">
                 View Property <ChevronRight size={10} />
             </button>
             <button onClick={() => setShowGeneralInfoModal(true)} className="p-2 bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-all border border-slate-700">
                <Edit2 size={12} />
             </button>
          </div>
        </div>

        {/* Full Width Progress Bar at Bottom */}
        <div className="relative pt-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Completion Progress</p>
            <p className="text-sm font-black text-blue-400">
              {(() => {
                const total = projectStatusData?.tasks?.length || 0;
                const completed = projectStatusData?.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
                return total > 0 ? Math.round((completed / total) * 100) : 0;
              })()}%
            </p>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out relative"
              style={{ width: `${(() => {
                const total = projectStatusData?.tasks?.length || 0;
                const completed = projectStatusData?.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
                return total > 0 ? Math.round((completed / total) * 100) : 0;
              })()}%` }}
            >
               <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
