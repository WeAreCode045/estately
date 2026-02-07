import { X } from 'lucide-react';
import React from 'react';
import PropertyGalleryEditor from '../PropertyGalleryEditor';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  media: string[];
  coverImageId?: string;
  onUpdate: (media: string[], coverId: string) => Promise<void>;
}

const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen,
  onClose,
  projectId,
  media,
  coverImageId,
  onUpdate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div>
              <h2 className="text-xl font-bold text-slate-900">Manage Property Gallery</h2>
              <p className="text-sm text-slate-500">Upload, reorder, and set the main cover image.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            <PropertyGalleryEditor
                projectId={projectId}
                media={media}
                coverImageId={coverImageId}
                onUpdate={onUpdate}
            />
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
             <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">
                 Done
             </button>
        </div>
      </div>
    </div>
  );
};

export default GalleryModal;
