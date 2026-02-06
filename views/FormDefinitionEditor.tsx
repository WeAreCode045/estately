/* eslint-env browser */
import { ChevronLeft, Eye, FileText, Loader2, Save, Settings2, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formDefinitionsService } from '../services/formDefinitionsService';
import projectFormsService from '../services/projectFormsService';
import type { FormDefinition } from '../types';

import AIGeneratorModal from '../components/form-builder/AIGeneratorModal';
import Canvas from '../components/form-builder/Canvas';
import ComponentLibrary from '../components/form-builder/ComponentLibrary';
import { INITIAL_SCHEMA } from '../components/form-builder/constants';
import PDFReaderModal from '../components/form-builder/PDFReaderModal';
import PropertiesPanel from '../components/form-builder/PropertiesPanel';
import type { FormField, FormSchema } from '../components/form-builder/types';
import { FieldType } from '../components/form-builder/types';

const FormDefinitionEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    key: '',
    title: '',
    description: '',
    schema: INITIAL_SCHEMA as FormSchema,
    defaultData: '{}',
    visibility: 'public' as 'public' | 'private',
    needSignatureFromSeller: false,
    needSignatureFromBuyer: false,
    autoCreateTaskForAssignee: false,
    autoAddToNewProjects: false,
    autoAssignTo: [] as string[],
    allowChanges: 'always' as 'always' | 'never' | 'before_submission'
  });

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [backfillExisting, setBackfillExisting] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadDefinition(id);
    }
  }, [id]);

  const loadDefinition = async (defId: string) => {
    setLoading(true);
    try {
      const def = await formDefinitionsService.get(defId);
      if (def) {
        setFormData({
          key: def.key,
          title: def.title,
          description: def.description || '',
          schema: typeof def.schema === 'string' ? JSON.parse(def.schema) : (def.schema || INITIAL_SCHEMA),
          defaultData: JSON.stringify(def.defaultData, null, 2),
            visibility: (def as any).visibility || 'public',
            needSignatureFromSeller: def.needSignatureFromSeller || false,
          needSignatureFromBuyer: def.needSignatureFromBuyer || false,
          autoCreateTaskForAssignee: def.autoCreateTaskForAssignee || false,
          autoAddToNewProjects: def.autoAddToNewProjects || false,
          autoAssignTo: Array.isArray(def.autoAssignTo) ? def.autoAssignTo : (def.autoAssignTo ? [def.autoAssignTo as any] : []),
          allowChanges: def.allowChanges || 'always'
        });
      }
    } catch (err) {
      console.error('Failed to load definition', err);
    } finally {
      setLoading(false);
    }
  };

  const findAndModify = (fields: FormField[], targetId: string, modifier: (f: FormField) => FormField | null): FormField[] => {
    return fields.reduce((acc: FormField[], field) => {
      if (field.id === targetId) {
        const modified = modifier(field);
        if (modified) acc.push(modified);
      } else if (field.children) {
        acc.push({ ...field, children: findAndModify(field.children, targetId, modifier) });
      } else {
        acc.push(field);
      }
      return acc;
    }, []);
  };

  const addField = useCallback((type: FieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: type === FieldType.SECTION ? 'New Section' : `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: type === FieldType.SECTION ? '' : `Enter ${type}...`,
      required: false,
      options: ['select', 'radio', 'checkbox'].includes(type) ? [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' }
      ] : undefined,
      children: type === FieldType.SECTION ? [] : undefined,
      isCollapsed: false
    };

    setFormData(prev => {
      // If a section is selected, try to add into it
      const addToSection = (fields: FormField[], sectionId: string): FormField[] => {
        return fields.map(f => {
          if (f.id === sectionId && f.type === FieldType.SECTION) {
            return { ...f, children: [...(f.children || []), newField], isCollapsed: false };
          }
          if (f.children) {
            return { ...f, children: addToSection(f.children, sectionId) };
          }
          return f;
        });
      };

      let newFields = [...prev.schema.fields];
      if (selectedFieldId) {
        newFields = addToSection(prev.schema.fields, selectedFieldId);
        const wasAdded = JSON.stringify(newFields) !== JSON.stringify(prev.schema.fields);
        if (!wasAdded) {
          newFields = [...prev.schema.fields, newField];
        }
      } else {
        newFields = [...prev.schema.fields, newField];
      }

      setSelectedFieldId(newField.id);
      return {
        ...prev,
        schema: { ...prev.schema, fields: newFields }
      };
    });
  }, [selectedFieldId]);

  const updateField = useCallback((updatedField: FormField) => {
    setFormData(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: findAndModify(prev.schema.fields, updatedField.id, () => updatedField)
      }
    }));
  }, []);

  const deleteField = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: findAndModify(prev.schema.fields, id, () => null)
      }
    }));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }, [selectedFieldId]);

  const duplicateField = useCallback((field: FormField) => {
    const duplicated: FormField = {
      ...field,
      id: `field_${Date.now()}_dup`,
      label: `${field.label} (Copy)`,
      children: field.children ? field.children.map(c => ({ ...c, id: `field_${Date.now()}_${Math.random()}` })) : undefined
    };

    setFormData(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: [...prev.schema.fields, duplicated]
      }
    }));
    setSelectedFieldId(duplicated.id);
  }, []);

  const moveField = useCallback((index: number, direction: 'up' | 'down') => {
    setFormData(prev => {
      const fields = [...prev.schema.fields];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= fields.length) return prev;

      // Guard against undefined elements and perform safe swap
      const a = fields[index];
      const b = fields[targetIndex];
      if (!a || !b) return prev;

      fields[index] = b;
      fields[targetIndex] = a;

      return { ...prev, schema: { ...prev.schema, fields } };
    });
  }, []);

  const findFieldById = (fields: FormField[], fieldId: string | null): FormField | undefined => {
    if (!fieldId) return undefined;
    for (const f of fields) {
      if (f.id === fieldId) return f;
      if (f.children) {
        const found = findFieldById(f.children, fieldId);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedField = findFieldById(formData.schema.fields, selectedFieldId);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedDefault = JSON.parse(formData.defaultData);

      const payload: Omit<FormDefinition, 'id'> = {
        key: formData.key,
        title: formData.title,
        description: formData.description,
        schema: formData.schema,
        defaultData: parsedDefault,
        needSignatureFromSeller: formData.needSignatureFromSeller,
        needSignatureFromBuyer: formData.needSignatureFromBuyer,
        autoCreateTaskForAssignee: formData.autoCreateTaskForAssignee,
        autoAddToNewProjects: formData.autoAddToNewProjects,
        autoAssignTo: formData.autoAssignTo,
        allowChanges: formData.allowChanges
      };

      let savedDef: FormDefinition;
      if (id && id !== 'new') {
        savedDef = await formDefinitionsService.update(id, payload);
      } else {
        savedDef = await formDefinitionsService.create(payload);
      }

      if (backfillExisting && (payload.autoAssignTo?.length || payload.autoAddToNewProjects)) {
        // Trigger backfill in background or wait for it?
        // Better to wait or show progress if it can take time.
        // For now, call it and then navigate.
        await projectFormsService.backfillFormToProjects(savedDef);
      }

      navigate('/admin/forms');
    } catch (err: any) {
      alert('Error saving: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Template...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-40 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/forms')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">
              {id === 'new' ? 'New Form Template' : `Editing: ${formData.title || 'Template'}`}
            </h1>
            <p className="text-xs text-slate-400 font-medium">Form Definition Builder</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsAIModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100">
            <Sparkles className="w-4 h-4" /> AI Generator
          </button>
          <button onClick={() => setIsPDFModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100">
            <FileText className="w-4 h-4" /> PDF to Form
          </button>
          <div className="w-[1px] h-6 bg-slate-200 mx-1" />
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setIsPreview(false)} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${!isPreview ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>
              <Settings2 className="w-4 h-4" /> Builder
            </button>
            <button onClick={() => setIsPreview(true)} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${isPreview ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>
              <Eye className="w-4 h-4" /> Preview
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 ml-2"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Template
          </button>
        </div>
      </header>

      {/* Settings Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-2 min-w-fit">
          <label htmlFor="form-title" className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Title</label>
          <input
            id="form-title"
            type="text"
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none w-40"
            value={formData.title}
            onChange={e => {
              const newTitle = e.target.value;
              const newKey = id === 'new'
                ? newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
                : formData.key;
              setFormData(f => ({ ...f, title: newTitle, key: newKey }));
            }}
            placeholder="Template Title"
          />
        </div>

        <div className="w-[1px] h-4 bg-slate-100" />

        <div className="flex items-center gap-2 min-w-fit">
          <label htmlFor="form-allowChanges" className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Changes</label>
          <select
            id="form-allowChanges"
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            value={formData.allowChanges}
            onChange={e => setFormData(f => ({ ...f, allowChanges: e.target.value as any }))}
          >
            <option value="always">Always</option>
            <option value="before_submission">Pre-Submit</option>
            <option value="never">Never</option>
          </select>
        </div>

        <div className="w-[1px] h-4 bg-slate-100" />

        <div className="flex items-center gap-3 min-w-fit">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
            <input type="checkbox" className="rounded-sm" checked={formData.autoAddToNewProjects} onChange={e => setFormData(f => ({ ...f, autoAddToNewProjects: e.target.checked }))} />
            Auto-Add
          </label>
        </div>

        <div className="w-[1px] h-4 bg-slate-100" />

        <div className="flex items-center gap-2 min-w-fit">
          <label htmlFor="form-visibility" className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Visibility</label>
          <select
            id="form-visibility"
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            value={formData.visibility || 'public'}
            onChange={e => setFormData(f => ({ ...f, visibility: e.target.value as any }))}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="w-[1px] h-4 bg-slate-100" />

        <fieldset className="flex items-center gap-2 min-w-fit">
          <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Assign</legend>
          <div className="flex items-center gap-2">
            {['seller', 'buyer', 'admin'].map(role => (
              <label key={role} className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer border px-1.5 py-0.5 rounded bg-slate-50/50 hover:bg-white hover:text-blue-600 transition-colors">
                <input
                  type="checkbox"
                  className="rounded-sm"
                  checked={formData.autoAssignTo.includes(role)}
                  onChange={e => {
                    const checked = e.target.checked;
                    setFormData(f => ({
                      ...f,
                      autoAssignTo: checked
                        ? [...f.autoAssignTo, role]
                        : f.autoAssignTo.filter(r => r !== role)
                    }));
                  }}
                />
                <span className="capitalize">{role}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="w-[1px] h-4 bg-slate-100" />

        <fieldset className="flex items-center gap-2 min-w-fit">
          <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Need Sign</legend>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                className="rounded-sm"
                checked={formData.needSignatureFromSeller}
                onChange={e => setFormData(f => ({ ...f, needSignatureFromSeller: e.target.checked }))}
              />
              Seller
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                className="rounded-sm"
                checked={formData.needSignatureFromBuyer}
                onChange={e => setFormData(f => ({ ...f, needSignatureFromBuyer: e.target.checked }))}
              />
              Buyer
            </label>
          </div>
        </fieldset>

        <div className="flex-1" />

        <div className="flex items-center gap-2 min-w-fit ml-auto">
          <label className="flex items-center gap-1.5 text-xs font-bold text-amber-600 cursor-pointer opacity-80 hover:opacity-100">
            <input
              type="checkbox"
              checked={backfillExisting}
              onChange={e => setBackfillExisting(e.target.checked)}
              className="rounded-sm"
            />
            Backfill Projects
          </label>
        </div>
      </div>

      <main className="flex flex-1 overflow-hidden relative">
        <aside className={`w-72 shrink-0 h-full border-r border-slate-200 bg-white transition-transform duration-300 ${isPreview ? '-translate-x-full absolute z-10' : 'translate-x-0 relative'}`}>
          <ComponentLibrary onAddField={addField} />
        </aside>

        <Canvas
          schema={formData.schema}
          selectedFieldId={selectedFieldId}
          isPreview={isPreview}
          onSelectField={(id) => setSelectedFieldId(id)}
          onDeleteField={deleteField}
          onDuplicateField={duplicateField}
          onUpdateSchema={(newSchema) => setFormData(prev => ({ ...prev, schema: newSchema }))}
          onMoveField={moveField}
          onUpdateField={updateField}
        />

        <aside className={`w-80 shrink-0 h-full border-l border-slate-200 bg-white transition-transform duration-300 ${isPreview ? 'translate-x-full absolute right-0 z-10' : 'translate-x-0 relative'}`}>
          <PropertiesPanel
            field={selectedField}
            onUpdate={updateField}
            onDelete={deleteField}
          />
        </aside>
      </main>

      {isAIModalOpen && <AIGeneratorModal onClose={() => setIsAIModalOpen(false)} onGenerated={(newSchema) => setFormData(prev => ({ ...prev, schema: newSchema }))} />}
      {isPDFModalOpen && <PDFReaderModal onClose={() => setIsPDFModalOpen(false)} onGenerated={(newSchema) => setFormData(prev => ({ ...prev, schema: newSchema }))} />}
    </div>
  );
};

export default FormDefinitionEditor;
