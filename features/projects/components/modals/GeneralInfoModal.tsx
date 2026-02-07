import { X } from 'lucide-react';
import React from 'react';
import AddressAutocomplete from '../../../../components/AddressAutocomplete';
import type { Project } from '../../../../types';

interface GeneralInfoModalProps {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  isProcessing: boolean;
  googleApiKey: string | null;
  tempAddress: string;
  setTempAddress: (val: string) => void;
}

const GeneralInfoModal: React.FC<GeneralInfoModalProps> = ({
  isOpen,
  project,
  onClose,
  onSave,
  isProcessing,
  googleApiKey,
  tempAddress,
  setTempAddress
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Edit General Information</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project Title</label>
              <input name="title" type="text" defaultValue={project.title} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Property Address</label>
              {googleApiKey ? (
                <AddressAutocomplete
                  apiKey={googleApiKey}
                  value={tempAddress}
                  onChange={setTempAddress}
                  name="address"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="123 Ocean Drive, Miami, FL"
                />
              ) : (
                <input name="address" type="text" defaultValue={project.property.address} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Price</label>
              <input name="price" type="number" defaultValue={project.property.price} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Reference Number</label>
              <input name="referenceNumber" type="text" defaultValue={project.referenceNumber} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="REF-001" />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isProcessing} className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50">
              {isProcessing ? 'Saving...' : 'Update Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeneralInfoModal;
