import React from 'react';
import { FormField, SelectOption } from './types';
import { Trash2, Plus, X } from 'lucide-react';

interface PropertiesPanelProps {
  field: FormField | null;
  onUpdate: (field: FormField) => void;
  onDelete: (id: string) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ field, onUpdate, onDelete }) => {
  if (!field) {
    return (
      <div className="p-6 text-center h-full flex flex-col items-center justify-center bg-white border-l border-slate-200">
        <div className="p-4 bg-slate-50 rounded-full mb-4">
          <Plus className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">Select a field to edit its properties</p>
      </div>
    );
  }

  const handleChange = (key: keyof FormField, value: any) => {
    onUpdate({ ...field, [key]: value });
  };

  const handleOptionChange = (index: number, key: keyof SelectOption, value: string) => {
    if (!field.options) return;
    const newOptions = [...field.options];
    newOptions[index] = { ...newOptions[index], [key]: value };
    handleChange('options', newOptions);
  };

  const addOption = () => {
    const newOptions = [...(field.options || []), { label: `Option ${(field.options?.length || 0) + 1}`, value: `opt_${Date.now()}` }];
    handleChange('options', newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = field.options?.filter((_, i) => i !== index);
    handleChange('options', newOptions);
  };

  return (
    <div className="p-6 border-l border-slate-200 bg-white h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800">Field Settings</h3>
        <button
          onClick={() => onDelete(field.id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete Field"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Label</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => handleChange('label', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Placeholder</label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => handleChange('placeholder', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <label className="text-sm font-medium text-slate-700">Required Field</label>
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => handleChange('required', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Help Text</label>
          <input
            type="text"
            value={field.helpText || ''}
            onChange={(e) => handleChange('helpText', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {['select', 'radio', 'checkbox'].includes(field.type) && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Options</label>
              <button
                onClick={addOption}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Option
              </button>
            </div>
            <div className="space-y-2">
              {field.options?.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={opt.label}
                    placeholder="Label"
                    onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    onClick={() => removeOption(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;
