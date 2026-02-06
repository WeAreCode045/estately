import React from 'react';
import type { FormSchema, FormField} from './types';
import { FieldType } from './types';
import { GripVertical, Copy, Trash2, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Layout } from 'lucide-react';

interface CanvasProps {
  schema: FormSchema;
  selectedFieldId: string | null;
  isPreview: boolean;
  onSelectField: (id: string) => void;
  onDeleteField: (id: string) => void;
  onDuplicateField: (field: FormField) => void;
  onUpdateSchema: (schema: FormSchema) => void;
  onMoveField: (index: number, direction: 'up' | 'down') => void;
  onUpdateField: (field: FormField) => void;
}

const Canvas: React.FC<CanvasProps> = ({ 
  schema, 
  selectedFieldId, 
  isPreview, 
  onSelectField, 
  onDeleteField, 
  onDuplicateField,
  onUpdateSchema,
  onMoveField,
  onUpdateField
}) => {
  const renderFieldInput = (field: FormField) => {
    const commonClasses = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none transition-all focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500";
    const previewDisabled = !isPreview;

    switch (field.type) {
      case FieldType.SECTION:
        return null;
      case FieldType.TEXTAREA:
        return <textarea placeholder={field.placeholder} disabled={previewDisabled} className={`${commonClasses} min-h-[100px] resize-none`} />;
      case FieldType.SELECT:
        return (
          <select disabled={previewDisabled} className={commonClasses}>
            <option value="">Select an option...</option>
            {field.options?.map((opt, i) => (
              <option key={i} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case FieldType.CHECKBOX:
        return (
          <div className="space-y-3 pt-1">
            {field.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" disabled={previewDisabled} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all" />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{opt.label}</span>
              </label>
            )) || (
              <label className="flex items-center gap-3 opacity-50 italic">
                <input type="checkbox" disabled className="w-5 h-5 rounded border-slate-300" />
                <span className="text-sm">Default checkbox option...</span>
              </label>
            )}
          </div>
        );
      case FieldType.RADIO:
        return (
          <div className="space-y-3 pt-1">
            {field.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name={field.id} disabled={previewDisabled} className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 transition-all" />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{opt.label}</span>
              </label>
            ))}
          </div>
        );
      default:
        return <input type={field.type as any} placeholder={field.placeholder} disabled={previewDisabled} className={commonClasses} />;
    }
  };

  const renderField = (field: FormField, index: number, isNested: boolean = false) => {
    const isSelected = selectedFieldId === field.id;
    const isSection = field.type === FieldType.SECTION;

    return (
      <div
        key={field.id}
        onClick={(e) => {
          e.stopPropagation();
          if (!isPreview) onSelectField(field.id);
        }}
        className={`relative group rounded-2xl transition-all duration-300 ${
          !isPreview 
            ? `p-5 border-2 ${isSelected ? 'border-indigo-500 bg-white shadow-xl shadow-indigo-50' : 'border-transparent hover:border-slate-200'}`
            : isSection ? 'mb-10' : 'mb-6'
        } ${isSection && !isPreview ? 'bg-slate-50/50 border-dashed border-slate-300' : ''} ${isNested ? 'ml-6 border-l-2 border-indigo-100 pl-6' : ''}`}
      >
        {/* Advanced Controls for Builder Mode */}
        {!isPreview && isSelected && (
          <div className="absolute -top-6 right-4 flex items-center bg-indigo-600 text-white rounded-xl px-3 py-2 shadow-xl gap-4 animate-in fade-in slide-in-from-bottom-3 duration-300 z-10 scale-90 origin-right">
            <div className="flex items-center gap-2 pr-2 border-r border-white/20">
              <button 
                onClick={(e) => { e.stopPropagation(); onMoveField(index, 'up'); }}
                disabled={index === 0 && !isNested}
                className="p-1.5 hover:bg-white/20 rounded-lg disabled:opacity-30 transition-colors"
                title="Move Up"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onMoveField(index, 'down'); }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Move Down"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDuplicateField(field); }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Duplicate">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDeleteField(field.id); }} className="p-1.5 hover:bg-red-500 rounded-lg transition-colors text-red-100 hover:text-white" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isPreview && (
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
            <GripVertical className="w-6 h-6 cursor-grab" />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSection && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateField({ ...field, isCollapsed: !field.isCollapsed });
                  }}
                  className={`p-2 hover:bg-indigo-100 rounded-xl transition-all duration-300 ${field.isCollapsed ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
                >
                  {field.isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              )}
              {isSection && <Layout className="w-5 h-5 text-indigo-400" />}
              <label className={`font-semibold transition-colors ${isSection ? 'text-xl text-slate-900' : 'text-sm text-slate-700'}`}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1 font-black">*</span>}
              </label>
            </div>
          </div>
          
          {isSection ? (
            <div className={`space-y-6 overflow-hidden transition-all duration-500 ${field.isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'}`}>
              <div className="pt-2">
                {field.children && field.children.length > 0 ? (
                  field.children.map((child, idx) => renderField(child, idx, true))
                ) : !isPreview && (
                  <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center justify-center gap-2 group/empty transition-all hover:bg-indigo-50/30 hover:border-indigo-200">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-300 group-hover/empty:text-indigo-400 transition-colors">
                      <Layout className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 group-hover/empty:text-indigo-500 transition-colors">Drop fields here to group them</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {renderFieldInput(field)}
              {field.helpText && (
                <p className="text-xs text-slate-400 font-medium leading-relaxed italic px-1">{field.helpText}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-slate-50 p-6 md:p-12 overflow-y-auto custom-scrollbar flex justify-center">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[700px] flex flex-col">
          {/* Enhanced Form Header */}
          <div className={`p-10 border-b border-slate-50 transition-all ${!isPreview ? 'hover:bg-slate-50/50 cursor-text' : ''}`}>
            <input
              type="text"
              readOnly={isPreview}
              value={schema.title}
              onChange={(e) => onUpdateSchema({ ...schema, title: e.target.value })}
              className="w-full text-4xl font-black text-slate-900 border-none outline-none bg-transparent mb-4 placeholder-slate-200 tracking-tight"
              placeholder="Give your form a title..."
            />
            <textarea
              readOnly={isPreview}
              rows={1}
              value={schema.description}
              onChange={(e) => onUpdateSchema({ ...schema, description: e.target.value })}
              className="w-full text-lg text-slate-500 border-none outline-none bg-transparent placeholder-slate-200 resize-none font-medium"
              placeholder="Describe what this form is for..."
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          </div>

          <div className="p-10 flex-1 space-y-4">
            {schema.fields.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-slate-200 mb-6">
                  <Layout className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-400 mb-2">Your canvas is empty</h4>
                <p className="text-slate-300 font-medium">Click components on the left to start building</p>
              </div>
            ) : (
              schema.fields.map((field, index) => renderField(field, index))
            )}
          </div>

          {/* Action Footer */}
          <div className="p-10 pt-0">
            <button 
              className="w-full py-6 px-8 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xl hover:bg-indigo-700 transform active:scale-[0.99] transition-all shadow-2xl shadow-indigo-100 uppercase tracking-widest disabled:opacity-20"
              disabled={!isPreview && schema.fields.length === 0}
            >
              {schema.submitButtonText || 'Submit Form'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Canvas;
