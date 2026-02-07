import { Edit2, Home } from 'lucide-react';
import React from 'react';
import type { ParsedPropertyData } from '../../../api/propertyService';
import type { Project } from '../../../types';

interface PropertyGeneralInfoProps {
  project: Project;
  propertyData: ParsedPropertyData | null;
  isAdmin: boolean;
  onEditClick?: () => void;
}

/**
 * PropertyGeneralInfo - Displays general property information
 * Uses the new Property collection data structure
 */
export const PropertyGeneralInfo: React.FC<PropertyGeneralInfoProps> = ({
  project,
  propertyData,
  isAdmin,
  onEditClick
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Home size={20} className="text-indigo-600" /> General Information
        </h2>
        {isAdmin && onEditClick && (
          <button
            onClick={onEditClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all shadow-sm"
          >
            <Edit2 size={12} /> Edit Details
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-50">
        <div className="p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Title</p>
          <p className="text-sm font-bold text-slate-900">{project.title}</p>
        </div>
        <div className="p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</p>
          <p className="text-sm font-bold text-slate-900">
            {propertyData?.formattedAddress || 'N/A'}
          </p>
        </div>
        <div className="p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price</p>
          <p className="text-sm font-black text-blue-600">
            €{(project.price || 0).toLocaleString()}
          </p>
        </div>
        <div className="p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference Number</p>
          <p className="text-sm font-bold text-slate-900">{project.referenceNr || project.referenceNumber || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};
