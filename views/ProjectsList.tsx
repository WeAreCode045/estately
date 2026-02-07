import { Building2, Clock, Euro, MapPin, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProperty } from '../api/propertyService';
import AsyncImage from '../components/AsyncImage';
import type { Project, User } from '../types';
import { ProjectStatus } from '../types';
import { formatAddress, parseLocation, parseMedia } from '../utils/propertyHelpers';

interface ProjectsListProps {
  projects: Project[];
  user: User;
  allUsers: User[];
}

/**
 * ProjectsList - Complete list of all projects for admin view
 */
const ProjectsList: React.FC<ProjectsListProps> = ({ projects }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [propertyData, setPropertyData] = useState<Record<string, { cover: string; address: string }>>({});

  // Fetch property data from Property collection
  useEffect(() => {
    const fetchPropertyData = async () => {
      const dataMap: Record<string, { cover: string; address: string }> = {};

      await Promise.all(
        projects.map(async (project) => {
          if (project.propertyId) {
            try {
              const property = await getProperty(project.propertyId);
              const mediaData = parseMedia(property.media);
              const locationData = parseLocation(property.location);
              const address = formatAddress(locationData);

              dataMap[project.$id || project.id || ''] = {
                cover: mediaData.cover || '',
                address: address || 'Address not available'
              };
            } catch (error) {
              console.error(`Failed to fetch property ${project.propertyId}:`, error);
            }
          }
        })
      );

      setPropertyData(dataMap);
    };

    if (projects.length > 0) {
      fetchPropertyData();
    }
  }, [projects]);

  // Filter and sort projects
  const filteredProjects = projects
    .filter(p => {
      const projectId = p.$id || p.id || '';
      const propertyAddress = propertyData[projectId]?.address || '';
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        propertyAddress.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date((a as { $createdAt?: string }).$createdAt || 0).getTime();
      const dateB = new Date((b as { $createdAt?: string }).$createdAt || 0).getTime();
      return dateB - dateA;
    });

  const statusColors: Record<ProjectStatus, string> = {
    [ProjectStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [ProjectStatus.ACTIVE]: 'bg-blue-100 text-blue-800',
    [ProjectStatus.UNDER_CONTRACT]: 'bg-purple-100 text-purple-800',
    [ProjectStatus.SOLD]: 'bg-green-100 text-green-800',
    [ProjectStatus.ARCHIVED]: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<ProjectStatus, string> = {
    [ProjectStatus.PENDING]: 'Pending',
    [ProjectStatus.ACTIVE]: 'Active',
    [ProjectStatus.UNDER_CONTRACT]: 'Under Contract',
    [ProjectStatus.SOLD]: 'Sold',
    [ProjectStatus.ARCHIVED]: 'Archived',
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">Manage all property projects</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200">
            <span className="text-2xl font-black text-slate-900">{filteredProjects.length}</span>
            <span className="text-xs text-slate-500 ml-2">Total</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search projects by title, address, or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | 'all')}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-bold text-slate-900 mb-2">No projects found</h3>
          <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const projectId = project.$id || project.id || '';
            const property = propertyData[projectId];
            const coverImage = property?.cover;
            const address = property?.address;
            const status = project.status || ProjectStatus.ACTIVE;

            return (
              <Link
                key={projectId}
                to={`/projects/${projectId}`}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all"
              >
                {/* Image */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  {coverImage ? (
                    <AsyncImage
                      srcOrId={coverImage}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Building2 size={48} />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[status]}`}>
                      {statusLabels[status]}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {project.title}
                  </h3>

                  {/* Address */}
                  {address && (
                    <div className="flex items-start gap-2 text-sm text-slate-600 mb-3">
                      <MapPin size={16} className="mt-0.5 flex-shrink-0 text-slate-400" />
                      <span className="line-clamp-2">{address}</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-3">
                    <Euro size={16} className="text-green-600" />
                    <span className="text-lg font-black text-green-600">
                      {(project.price || 0).toLocaleString('nl-NL')}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={14} />
                      <span>ID: {projectId.substring(0, 8)}</span>
                    </div>
                    {project.handover_date && (
                      <div className="text-xs text-slate-500">
                        Handover: {new Date(project.handover_date).toLocaleDateString('nl-NL')}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectsList;
