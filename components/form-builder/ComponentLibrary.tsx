import React from 'react';
import { FieldType } from './types';
import { FIELD_ICONS } from './constants';
import { Plus } from 'lucide-react';

interface ComponentLibraryProps {
  onAddField: (type: FieldType) => void;
}

const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onAddField }) => {
  const fieldTypes = Object.values(FieldType);

  return (
    <div className="p-4 border-r border-slate-200 bg-white h-full overflow-y-auto custom-scrollbar">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
        Form Components
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {fieldTypes.map((type) => (
          <button
            key={type}
            onClick={() => onAddField(type)}
            className="group flex items-center justify-between p-3 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all duration-200 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="p-1.5 bg-white rounded border border-slate-200 group-hover:border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                {FIELD_ICONS[type]}
              </span>
              <span className="capitalize">{type}</span>
            </div>
            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <p className="text-xs text-indigo-700 font-medium leading-relaxed">
          Pro Tip: Use the AI Generator in the top bar to build complex forms instantly.
        </p>
      </div>
    </div>
  );
};

export default ComponentLibrary;
