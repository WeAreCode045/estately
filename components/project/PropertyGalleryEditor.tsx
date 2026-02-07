import { CheckCircle2, Loader2, Star, Trash2, Upload } from 'lucide-react';
/* eslint-env browser */
import React, { useRef, useState } from 'react';
import { projectService } from '../../services/appwrite';
import AsyncImage from '../AsyncImage';

interface PropertyGalleryEditorProps {
  projectId: string;
  media: string[];
  coverImageId?: string;
  onUpdate: (items: string[], coverId: string) => Promise<void>;
}

const PropertyGalleryEditor: React.FC<PropertyGalleryEditorProps> = ({
  projectId,
  media,
  coverImageId,
  onUpdate
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to ensure we have a valid list to work with
  const files = media || [];

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImages(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkRemove = async () => {
    if (selectedImages.length === 0) return;
    if (!confirm(`Are you sure you want to remove ${selectedImages.length} images?`)) return;

    const newList = files.filter(f => !selectedImages.includes(f));
    // If we removed the cover image, set new cover to the first one available
    let newCover = coverImageId;
    if (coverImageId && selectedImages.includes(coverImageId)) {
      newCover = newList.length > 0 ? newList[0] : '';
    }
    await onUpdate(newList, newCover!);
    setSelectedImages([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const newIds: string[] = [];
      try {
        for (let i = 0; i < e.target.files.length; i++) {
          const file = e.target.files[i];
          if (!file) continue;
          const response = await projectService.uploadPropertyImage(projectId, file);

          if ((response as any).key) {
             newIds.push((response as any).key);
          }
        }

        const updatedList = [...files, ...newIds];
        // If no cover image yet, set the first new one as cover
          const newCoverId = (coverImageId || (updatedList.length > 0 ? updatedList[0] : '')) || '';

        await onUpdate(updatedList, newCoverId);
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Failed to upload images.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleSetMain = async (id: string) => {
    // Requirements: "with the main image as first image"
    // So we move this image to index 0
    const newList = [...files];
    const index = newList.indexOf(id);
    if (index > -1) {
      newList.splice(index, 1);
      newList.unshift(id);
    }
    await onUpdate(newList, id);
  };

  const handleRemove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this image?')) return;

    const newList = files.filter(f => f !== id);
    // If we removed the cover image, set new cover to the first one available
    let newCover = coverImageId;
    if (id === coverImageId) {
      newCover = newList.length > 0 ? newList[0] : '';
    }
    await onUpdate(newList, newCover!);
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('sourceIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const sourceIndexStr = e.dataTransfer.getData('sourceIndex');
    if (!sourceIndexStr) return;

    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const newList = [...files];
    const [movedItem] = newList.splice(sourceIndex, 1);
    if (typeof movedItem !== 'undefined') {
      newList.splice(targetIndex, 0, movedItem as string);
    }

    // If "main image as first image" is strict rule, we might need to update coverID if index 0 changed
    // But usually user explicitly sets main. However, prompt says "main image as first image".
    // If dragging changes index 0, should we update cover?
    // Let's assume coverID must track the item at index 0 if that's the rule, OR coverID tracks a specific ID and that ID moves to 0.
    // The prompt says "set the main image ... to show in the slider gallery with the main image as first image".
    // This implies forcing main image to be first.
    // If I drag something else to pos 0, does it become main? Or should main always bubble to top?
    // I will stick to: SetMain moves to top. Dragging reorders freely. If I drag X to top, X becomes main?
    // Let's keep it simple: Dragging updates list order. SetMain updates coverID AND moves to top.

    // update with the new ordering; ensure coverId is a string
    await onUpdate(newList, newList[0] || '');
  };

  return (
    <div className="space-y-6">
      {selectedImages.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={18} />
                <span>{selectedImages.length} images selected</span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setSelectedImages([])}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-sm font-medium"
                >
                    Cancel
                </button>
                <button
                    onClick={handleBulkRemove}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium shadow-sm transition-all"
                >
                    <Trash2 size={16} /> Delete Selected
                </button>
            </div>
        </div>
      )}

      <div className="flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
           onClick={() => fileInputRef.current?.click()}>
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
        <div className="text-center">
            {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-blue-600" />
                    <span className="text-sm font-bold text-slate-500">Uploading...</span>
                </div>
            ) : (
                <>
                    <Upload className="mx-auto text-slate-400 mb-2" />
                    <p className="font-bold text-slate-600">Click to upload images</p>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">JPG, PNG, WebP</p>
                </>
            )}
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 text-slate-400 italic">No images yet. Upload some to get started.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((fileId, index) => {
            const isMain = fileId === coverImageId || index === 0;
            const isSelected = selectedImages.includes(fileId);

            return (
              <div
                key={fileId}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`relative aspect-square rounded-xl overflow-hidden group border-2 transition-all cursor-move ${
                   dragOverIndex === index ? 'border-blue-500 scale-105 z-10' :
                   isSelected ? 'border-blue-500 ring-4 ring-blue-500/20' :
                   isMain ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-slate-100'
                }`}
              >
                <AsyncImage
                  srcOrId={fileId}
                  className="w-full h-full object-cover"
                  alt=""
                />

                {/* Selection Checkbox */}
                <button
                    onClick={(e) => toggleSelection(fileId, e)}
                    className={`absolute top-2 left-2 p-1.5 rounded-lg z-20 transition-all ${
                        isSelected
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-black/30 text-white/70 hover:bg-black/50 hover:text-white opacity-0 group-hover:opacity-100'
                    }`}
                >
                    {isSelected ? <CheckCircle2 size={16} fill="currentColor" className="text-white" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                </button>

                {/* Actions Overlay */}
                <div className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity flex flex-col items-center justify-center gap-2 p-2 ${
                    isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                }`}>
                    {!isMain && (
                        <button
                            onClick={() => handleSetMain(fileId)}
                            className="flex items-center gap-2 bg-white/90 hover:bg-white text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all"
                        >
                            <Star size={12} fill="currentColor" /> Set Main
                        </button>
                    )}
                    <button
                        onClick={(e) => handleRemove(fileId, e)}
                        className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full shadow-sm"
                        title="Remove image"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {isMain && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-md z-10">
                        <CheckCircle2 size={16} />
                    </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PropertyGalleryEditor;
