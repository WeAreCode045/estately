import { Check, Clock, Edit2, FileText, Loader2, X } from 'lucide-react';
import React, { useState } from 'react';
import type { ParsedPropertyData } from '../../../api/propertyService';
import type { Project } from '../../../types';

interface PropertyDescriptionProps {
  project: Project;
  propertyData: ParsedPropertyData | null;
  isAdmin: boolean;
  onSaveDescription?: (value: string) => Promise<void>;
  onSaveHandoverDate?: (value: string) => Promise<void>;
}

/**
 * PropertyDescription - Displays property description and handover date
 * Uses the new Property collection description data structure
 */
export const PropertyDescription: React.FC<PropertyDescriptionProps> = ({
  project,
  propertyData,
  isAdmin,
  onSaveDescription,
  onSaveHandoverDate
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get description from property data (first description content) or fallback to legacy
  const description = propertyData?.descriptions?.[0]?.content || '';

  const handleSaveField = async (field: string) => {
    if (!editValue && field !== 'handover_date') return;

    setIsProcessing(true);
    try {
      if (field === 'description' && onSaveDescription) {
        await onSaveDescription(editValue);
      } else if (field === 'handover_date' && onSaveHandoverDate) {
        await onSaveHandoverDate(editValue);
      }
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      const err = error as { message?: string };
      console.error('Error updating field:', error);
      alert(`Failed to update: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText size={20} className="text-blue-600" /> Property Overview
        </h2>
        {isAdmin && editingField !== 'description' && onSaveDescription && (
          <button
            onClick={() => {
              setEditingField('description');
              setEditValue(description);
            }}
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
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditingField(null)}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveField('description')}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save Description
            </button>
          </div>
        </div>
      ) : (
        <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
          {description || 'No description provided for this property.'}
        </p>
      )}

      {/* Handover Date Section */}
      <div className="mt-8 pt-8 border-t border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-orange-500" />
            <h3 className="font-bold text-slate-900">Project Handover Date</h3>
          </div>
          {isAdmin && editingField !== 'handover_date' && onSaveHandoverDate && (
            <button
              onClick={() => {
                setEditingField('handover_date');
                const dateValue = project.handoverDate || project.handover_date || '';
                const formattedDate = (dateValue ? new Date(dateValue).toISOString().split('T')[0] : '') || '';
                setEditValue(formattedDate || '');
              }}
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
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => handleSaveField('handover_date')}
              disabled={isProcessing}
              className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            </button>
            <button
              onClick={() => setEditingField(null)}
              className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-xs font-bold ring-1 ring-orange-100">
              {project.handoverDate || project.handover_date
                ? new Date(project.handoverDate || project.handover_date || '').toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'NOT SCHEDULED'}
            </div>
            {!(project.handoverDate || project.handover_date) && isAdmin && onSaveHandoverDate && (
              <button
                onClick={() => {
                  setEditingField('handover_date');
                  setEditValue('');
                }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Set Date
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
