import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import React, { useState } from 'react';
import type { ParsedPropertyData } from '../../../api/propertyService';
import AsyncImage from '../../../components/AsyncImage';

interface PropertyGalleryProps {
  propertyData: ParsedPropertyData | null;
  isAdmin: boolean;
  onManageGallery?: () => void;
}

/**
 * PropertyGallery - Displays property image gallery with carousel
 * Uses the new Property collection media data structure
 */
export const PropertyGallery: React.FC<PropertyGalleryProps> = ({
  propertyData,
  isAdmin,
  onManageGallery
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Use property media data from Property collection
  const displayImages = propertyData?.mediaData?.images || [];

  // Use Property collection cover
  const coverImage = propertyData?.mediaData?.cover || '';

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
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-900">Property Gallery</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">
            {displayImages.length} Assets
          </span>
        </div>
        {isAdmin && onManageGallery && (
          <button
            onClick={onManageGallery}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all shadow-sm"
          >
            <ImageIcon size={12} /> Manage Gallery
          </button>
        )}
      </div>

      {displayImages.length > 0 ? (
        <div className="relative group bg-slate-950 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl">
            <AsyncImage
              srcOrId={displayImages[currentImageIndex]}
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
                currentImageIndex === idx
                  ? 'border-blue-600 scale-105 shadow-md'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <AsyncImage srcOrId={img} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
