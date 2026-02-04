import { Bath, Bed, Calendar, Car, Maximize2, Square, X } from 'lucide-react';
import React from 'react';
import type { Project } from '../../../types';

interface BulkSpecsModalProps {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  isProcessing: boolean;
}

const BulkSpecsModal: React.FC<BulkSpecsModalProps> = ({
  isOpen,
  project,
  onClose,
  onSave,
  isProcessing
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Edit Property Specifications</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bedrooms</label>
              <div className="relative">
                <Bed size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="bedrooms" type="number" defaultValue={project.property.bedrooms} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bathrooms</label>
              <div className="relative">
                <Bath size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="bathrooms" type="number" step="0.5" defaultValue={project.property.bathrooms} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Plot Size (Sq Ft)</label>
              <div className="relative">
                <Square size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="sqft" type="number" defaultValue={project.property.sqft} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Living Area (Sq Ft)</label>
              <div className="relative">
                <Maximize2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="livingArea" type="number" defaultValue={project.property.livingArea} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Build Year</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="buildYear" type="number" defaultValue={project.property.buildYear} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Garages</label>
              <div className="relative">
                <Car size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input name="garages" type="number" defaultValue={project.property.garages} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm" />
              </div>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isProcessing} className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md disabled:opacity-50">
              {isProcessing ? 'Saving...' : 'Update Specifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkSpecsModal;
