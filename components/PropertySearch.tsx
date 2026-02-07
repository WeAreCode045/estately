import { Building, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import React, { useState } from 'react';
import { Query } from '../api/appwrite';
import type { ParsedPropertyData } from '../api/propertyService';
import { listProperties } from '../api/propertyService';

import { parseDescription } from '../utils/propertyHelpers';

interface PropertySearchProps {
  onSelect?: (property: ParsedPropertyData) => void;
}

interface SearchFilters {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minFloorSize?: number;
}

export const PropertySearch: React.FC<PropertySearchProps> = ({ onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<ParsedPropertyData[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const queries: any[] = [];

      // Text search in description
      if (searchQuery) {
        queries.push(Query.search('description', searchQuery));
      }

      // Fetch all properties (since JSON fields can't be queried directly)
      const allProperties = await listProperties(queries);

      // Client-side filtering for JSON fields
      const filtered = allProperties.filter(prop => {
        const parsed = prop as ParsedPropertyData;

        // City filter
        if (filters.city && !parsed.locationData.city.toLowerCase().includes(filters.city.toLowerCase())) {
          return false;
        }

        // Bedrooms filter
        if (filters.minBedrooms && parsed.roomsData.bedrooms < filters.minBedrooms) {
          return false;
        }

        // Bathrooms filter
        if (filters.minBathrooms && parsed.roomsData.bathrooms < filters.minBathrooms) {
          return false;
        }

        // Floor size filter
        if (filters.minFloorSize && parsed.sizeData.floorSize < filters.minFloorSize) {
          return false;
        }

        return true;
      });

      setResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setResults([]);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building size={20} className="text-indigo-600" />
          Property Search
        </h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            showFilters
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by description..."
          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl animate-in fade-in slide-in-from-top-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">City</label>
            <input
              type="text"
              value={filters.city || ''}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              placeholder="Amsterdam, Rotterdam..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Min Bedrooms</label>
            <input
              type="number"
              min="0"
              value={filters.minBedrooms || ''}
              onChange={(e) => setFilters({ ...filters, minBedrooms: parseInt(e.target.value) || undefined })}
              placeholder="0"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Min Bathrooms</label>
            <input
              type="number"
              min="0"
              value={filters.minBathrooms || ''}
              onChange={(e) => setFilters({ ...filters, minBathrooms: parseInt(e.target.value) || undefined })}
              placeholder="0"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Min Floor Size (m²)</label>
            <input
              type="number"
              min="0"
              value={filters.minFloorSize || ''}
              onChange={(e) => setFilters({ ...filters, minFloorSize: parseInt(e.target.value) || undefined })}
              placeholder="0"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-300 transition-all"
            >
              <X size={14} />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search Button */}
      <button
        onClick={handleSearch}
        disabled={isSearching}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSearching ? 'Searching...' : 'Search Properties'}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-600">
            Found {results.length} {results.length === 1 ? 'property' : 'properties'}
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result) => (
              <button
                key={result.property.$id}
                onClick={() => onSelect?.(result)}
                className="w-full text-left p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {result.formattedAddress}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {(() => {
                        const descriptions = parseDescription(result.property.description);
                        const propertyDesc = descriptions.find(d => d.type === 'propertydesc');
                        return propertyDesc?.content || 'No description';
                      })()}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                      <span>{result.roomsData.bedrooms} bed</span>
                      <span>{result.roomsData.bathrooms} bath</span>
                      <span>{result.sizeData.floorSize}m²</span>
                    </div>
                  </div>
                  <MapPin size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && searchQuery && !isSearching && (
        <div className="text-center py-8 text-slate-500">
          <Building size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No properties found</p>
          <p className="text-sm mt-1">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
};
