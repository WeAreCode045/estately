import { ChevronRight, Edit2, MapPin } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../services/appwrite';
import { Project, ProjectStatus } from '../types';

interface ProjectSummaryCardProps {
  project: Project;
  isAdmin?: boolean;
  onEdit?: () => void;
}

const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({ project, isAdmin, onEdit }) => {
  const statusColors = {
    [ProjectStatus.ACTIVE]: 'bg-blue-50 text-blue-600 border-blue-100',
    [ProjectStatus.UNDER_CONTRACT]: 'bg-amber-50 text-amber-600 border-amber-100',
    [ProjectStatus.SOLD]: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    [ProjectStatus.DRAFT]: 'bg-slate-50 text-slate-600 border-slate-100',
    [ProjectStatus.ARCHIVED]: 'bg-slate-200 text-slate-700 border-slate-200',
  };

  const getCoverImageUrl = () => {
    // 1. Explicit cover image
    if (project.coverImageId) {
      return projectService.getImagePreview(project.coverImageId);
    }

    // 2. First image from 'media' (new gallery system)
    if (project.media && project.media.length > 0) {
      const id = project.media[0];
      // Ensure it's an ID and not a URL (though type is string[])
      if (!id.startsWith('http')) {
        return projectService.getImagePreview(id);
      }
      return id;
    }

    // 3. First image from 'property.images' (legacy/fallback)
    if (project.property?.images && project.property.images.length > 0) {
       const img = project.property.images[0];
       // Ensure ID
       if (!img.startsWith('http')) {
          return projectService.getImagePreview(img);
       }
       return img;
    }

    // 4. Default placeholder
    return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
  };

  const coverImage = getCoverImageUrl();

  return (
    <div className="group relative">
      <Link to={`/projects/${project.id}`} className="block">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group-hover:shadow-md transition-all group-hover:-translate-y-1">
          <div className="relative h-44">
            <img
              src={coverImage}
              alt={project.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
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
              <p className="font-bold text-slate-900">€{(project.property?.price || 0).toLocaleString()}</p>
              <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                Manage <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {isAdmin && onEdit && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-xl text-slate-600 hover:text-blue-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <Edit2 size={16} />
        </button>
      )}
    </div>
  );
};

export default ProjectSummaryCard;

