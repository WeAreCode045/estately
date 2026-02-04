import { Bath, Bed, Calendar, Car, Check, ChevronLeft, ChevronRight, Clock, Edit2, FileText, Home, ImageIcon, Loader2, Map as MapIcon, MapPin, Maximize2, Sparkles, Square, X } from 'lucide-react';
import React, { useState } from 'react';
import { projectService } from '../../services/appwrite';
import type { GroundingLink } from '../../services/geminiService';
import type { Project } from '../../types';
import { useSettings } from '../../utils/useSettings';
import { GalleryModal } from './index';

interface ProjectPropertyProps {
  project: Project;
  isAdmin: boolean;
  setShowGeneralInfoModal: (show: boolean) => void;
  setTempAddress: (addr: string) => void;
  setShowBulkSpecsModal: (show: boolean) => void;
  isLoadingLocation: boolean;
  locationInsights: { text: string, links: GroundingLink[] } | null;
  fetchLocationInsights: () => void;
  onUpdateProject: (projectId: string, updates: any) => Promise<void>;
}

const ProjectProperty: React.FC<ProjectPropertyProps> = ({
  project,
  isAdmin,
  setShowGeneralInfoModal,
  setTempAddress,
  setShowBulkSpecsModal,
  isLoadingLocation,
  locationInsights,
  fetchLocationInsights,
  onUpdateProject
}) => {
  const { googleApiKey } = useSettings();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  const displayImages = project.media && project.media.length > 0 ? project.media : (project.property.images || []);

  const handleUpdateGallery = async (newMedia: string[], newCoverId: string) => {
      // Update 'media' attribute and 'coverImageId'
      // We do NOT send 'property' object as the DB schema is flat (address, price, etc are top level)
      // 'media' is the new array<string> attribute we created.
      try {
          await onUpdateProject(project.id, {
             media: newMedia,
             coverImageId: newCoverId
          });

          // Optimistic update locally if needed, but the parent re-fetch/state update usually handles it
      } catch (e) {
          console.error("Failed to update gallery", e);
      }
  };

  const handleSaveInlineField = async (field: string, value: any) => {
    setIsProcessing(true);
    try {
      const updates: any = {};

      if (field === 'description') updates.description = value;
      if (field === 'handover_date') updates.handover_date = value || null;

      await onUpdateProject(project.id, updates);
      setEditingField(null);
      setEditValue(null);
    } catch (error: any) {
      console.error('Error updating project field:', error);
      alert(`Failed to update: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const nextImage = () => {
    if (displayImages.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
    }
  };

  const prevImage = () => {
    if (displayImages.length > 0) {
      const len = displayImages.length;
      setCurrentImageIndex((prev) => (prev - 1 + len) % len);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* General Information Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Home size={20} className="text-indigo-600" /> General Information
          </h2>
          {isAdmin && (
            <button
              onClick={() => { setShowGeneralInfoModal(true); setTempAddress(project.property.address); }}
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
            <p className="text-sm font-bold text-slate-900">{project.property.address}</p>
          </div>
          <div className="p-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price</p>
            <p className="text-sm font-black text-blue-600">€{(project.property.price || 0).toLocaleString()}</p>
          </div>
          <div className="p-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference Number</p>
            <p className="text-sm font-bold text-slate-900">{project.referenceNumber || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Property Description */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" /> Property Overview
          </h2>
          {isAdmin && editingField !== 'description' && (
            <button
              onClick={() => { setEditingField('description'); setEditValue(project.property.description); }}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title="Edit Description"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>

        {isAdmin && editingField === 'description' ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingField(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
              <button
                onClick={() => handleSaveInlineField('description', editValue)}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16}/>}
                Save Description
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">{project.property.description || 'No description provided for this property.'}</p>
        )}

        {/* Handover Date Section */}
        <div className="mt-8 pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-orange-500" />
              <h3 className="font-bold text-slate-900">Project Handover Date</h3>
            </div>
            {isAdmin && editingField !== 'handover_date' && (
              <button
                onClick={() => { setEditingField('handover_date'); setEditValue(project.handover_date ? new Date(project.handover_date).toISOString().split('T')[0] : ''); }}
                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                title="Edit Handover Date"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>

          {isAdmin && editingField === 'handover_date' ? (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
              <input
                type="date"
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={() => handleSaveInlineField('handover_date', editValue)}
                disabled={isProcessing}
                className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18}/>}
              </button>
              <button onClick={() => setEditingField(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"><X size={18}/></button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-xs font-bold ring-1 ring-orange-100">
                {project.handover_date ? new Date(project.handover_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'NOT SCHEDULED'}
              </div>
              {!project.handover_date && isAdmin && (
                <button
                  onClick={() => { setEditingField('handover_date'); setEditValue(''); }}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Set Date
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Property Specs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
            Property Specifications
          </h3>
          {isAdmin && (
            <button
              onClick={() => setShowBulkSpecsModal(true)}
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
            <p className="text-xl font-black text-slate-900">{project.property.bedrooms || 0}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bedrooms</p>
          </div>

          {/* Bathrooms */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
            <Bath className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
            <p className="text-xl font-black text-slate-900">{project.property.bathrooms || 0}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bathrooms</p>
          </div>

          {/* Living Area */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
            <Maximize2 className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
            <p className="text-xl font-black text-slate-900">{(project.property.livingArea || 0).toLocaleString()} <span className="text-[10px] font-bold">m²</span></p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Living Area</p>
          </div>

          {/* Plot Size */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
            <Square className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
            <p className="text-xl font-black text-slate-900">{(project.property.sqft || 0).toLocaleString()} <span className="text-[10px] font-bold">m²</span></p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Plot Size</p>
          </div>

          {/* Build Year */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
            <Calendar className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
            <p className="text-xl font-black text-slate-900">{project.property.buildYear || 'TBD'}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Build Year</p>
          </div>

          {/* Garages */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center group hover:border-blue-200 transition-all relative">
            <Car className="mx-auto text-slate-300 group-hover:text-blue-500 mb-3 transition-colors" size={24} />
            <p className="text-xl font-black text-slate-900">{project.property.garages || 0}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Garages</p>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <h3 className="font-bold text-slate-900">Property Gallery</h3>
             <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">
                {displayImages.length} Assets
             </span>
          </div>
          {isAdmin && (
             <button
               onClick={() => setShowGalleryModal(true)}
               className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all shadow-sm"
             >
               <ImageIcon size={12} /> Manage Gallery
             </button>
          )}
        </div>
        {displayImages.length > 0 ? (
          <div className="relative group bg-slate-950 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={displayImages[currentImageIndex] ? projectService.getImagePreview(displayImages[currentImageIndex]) : ''}
                alt="Property"
                className="w-full h-full object-cover"
              />

              {displayImages.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={prevImage}
                    className="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full p-3 shadow-lg transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full p-3 shadow-lg transition-all"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              )}

              <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                {currentImageIndex + 1} / {displayImages.length}
              </div>
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-300">
            <ImageIcon size={64} className="mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">No gallery images uploaded</p>
          </div>
        )}

        {/* Thumbnail Strip */}
        {displayImages.length > 0 && (
          <div className="p-4 bg-slate-50 flex gap-3 overflow-x-auto no-scrollbar">
            {displayImages.map((img, idx) => (
              <button
                key={img}
                onClick={() => setCurrentImageIndex(idx)}
                className={`relative min-w-[100px] h-[60px] rounded-xl overflow-hidden border-2 transition-all ${
                  currentImageIndex === idx ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={projectService.getImagePreview(img)} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Neighborhood Insights (AIGround) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <MapIcon size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Area & Neighborhood</h3>
          </div>
          <button
            onClick={fetchLocationInsights}
            disabled={isLoadingLocation}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {isLoadingLocation ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {locationInsights ? 'Update Insights' : 'Analyze Neighborhood'}
          </button>
        </div>

        {/* Google Maps Integration */}
        <div className="mb-8 rounded-2xl overflow-hidden shadow-sm border border-slate-100 h-[300px] bg-slate-50 relative">
          {project.property.address ? (
             <iframe
               width="100%"
               height="100%"
               style={{ border: 0 }}
               loading="lazy"
               allowFullScreen
               src={googleApiKey
                 ? `https://www.google.com/maps/embed/v1/place?key=${googleApiKey}&q=${encodeURIComponent(project.property.address)}`
                 : `https://maps.google.com/maps?q=${encodeURIComponent(project.property.address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`
               }
             ></iframe>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
               <MapPin size={48} className="mb-2 opacity-50" />
               <p className="text-sm font-bold">No address available</p>
            </div>
          )}
        </div>

        {locationInsights ? (
          <div className="animate-in fade-in slide-in-from-top-4">
            <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-line mb-8">{locationInsights.text}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {locationInsights.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-300 hover:bg-white transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <MapPin size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{link.title}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-slate-400">
              <MapIcon size={32} />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">No Area Data Loaded</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Click the button above to generate AI-powered insights about schools, amenities, and market trends for this neighborhood.</p>
          </div>
        )}
      </div>

      <GalleryModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        projectId={project.id}
        media={displayImages}
        coverImageId={project.coverImageId}
        onUpdate={handleUpdateGallery}
      />
    </div>
  );
};

export default ProjectProperty;
