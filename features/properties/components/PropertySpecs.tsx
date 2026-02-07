import { Bath, Bed, Calendar, Car, Edit2, Maximize2, Square } from 'lucide-react';
import React from 'react';
import type { ParsedPropertyData } from '../../../api/propertyService';

interface PropertySpecsProps {
  propertyData: ParsedPropertyData | null;
  isAdmin: boolean;
  onEditClick?: () => void;
}

/**
 * PropertySpecs - Displays property specifications grid
 * Uses the new Property collection data structure (rooms, size)
 */
export const PropertySpecs: React.FC<PropertySpecsProps> = ({
  propertyData,
  isAdmin,
  onEditClick
}) => {
  // Extract data from the new structure
  const bedrooms = propertyData?.roomsData?.bedrooms || 0;
  const bathrooms = propertyData?.roomsData?.bathrooms || 0;
  const garages = propertyData?.roomsData?.garages || 0;
  const buildYear = propertyData?.roomsData?.buildYear || 'TBD';
  const floorSize = propertyData?.sizeData?.floorSize || 0;
  const lotSize = propertyData?.sizeData?.lotSize || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
          Property Specifications
        </h3>
        {isAdmin && onEditClick && (
          <button
            onClick={onEditClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all shadow-sm"
          >
            <Edit2 size={12} /> Edit All
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Bedrooms */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
          <Bed className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
          <p className="text-xl font-black text-slate-900">{bedrooms}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bedrooms</p>
        </div>

        {/* Bathrooms */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
          <Bath className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
          <p className="text-xl font-black text-slate-900">{bathrooms}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bathrooms</p>
        </div>

        {/* Living Area (Floor Size) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
          <Maximize2 className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
          <p className="text-xl font-black text-slate-900">
            {floorSize.toLocaleString()} <span className="text-[10px] font-bold">m²</span>
          </p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Living Area</p>
        </div>

        {/* Plot Size (Lot Size) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
          <Square className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
          <p className="text-xl font-black text-slate-900">
            {lotSize.toLocaleString()} <span className="text-[10px] font-bold">m²</span>
          </p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Plot Size</p>
        </div>

        {/* Build Year */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
          <Calendar className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
          <p className="text-xl font-black text-slate-900">{buildYear}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Build Year</p>
        </div>

        {/* Garages */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
          <Car className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
          <p className="text-xl font-black text-slate-900">{garages}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Garages</p>
        </div>
      </div>
    </div>
  );
};
