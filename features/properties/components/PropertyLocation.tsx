import { ChevronRight, Loader2, Map as MapIcon, MapPin, Sparkles } from 'lucide-react';
import React from 'react';
import type { GroundingLink } from '../../../api/geminiService';
import type { ParsedPropertyData } from '../../../api/propertyService';

interface PropertyLocationProps {
  propertyData: ParsedPropertyData | null;
  googleApiKey: string | null;
  locationInsights?: { text: string; links: GroundingLink[] } | null;
  isLoadingLocation?: boolean;
  onFetchInsights?: () => void;
}

/**
 * PropertyLocation - Displays property location with map and AI insights
 * Uses the new Property collection location data structure
 */
export const PropertyLocation: React.FC<PropertyLocationProps> = ({
  propertyData,
  googleApiKey,
  locationInsights = null,
  isLoadingLocation = false,
  onFetchInsights
}) => {
  const address = propertyData?.formattedAddress;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <MapIcon size={20} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Area & Neighborhood</h3>
        </div>
        {onFetchInsights && (
          <button
            onClick={onFetchInsights}
            disabled={isLoadingLocation}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {isLoadingLocation ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {locationInsights ? 'Update Insights' : 'Analyze Neighborhood'}
          </button>
        )}
      </div>

      {/* Google Maps Integration */}
      <div className="mb-8 rounded-2xl overflow-hidden shadow-sm border border-slate-100 h-[300px] bg-slate-50 relative">
        {address ? (
          <iframe
            title="Property Location Map"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={
              googleApiKey
                ? `https://www.google.com/maps/embed/v1/place?key=${googleApiKey}&q=${encodeURIComponent(address)}`
                : `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`
            }
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <MapPin size={48} className="mb-2 opacity-50" />
            <p className="text-sm font-bold">No address available</p>
          </div>
        )}
      </div>

      {/* AI Insights */}
      {locationInsights ? (
        <div className="animate-in fade-in slide-in-from-top-4">
          <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-line mb-8">
            {locationInsights.text}
          </p>
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
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Click the button above to generate AI-powered insights about schools, amenities, and market trends for
            this neighborhood.
          </p>
        </div>
      )}
    </div>
  );
};
