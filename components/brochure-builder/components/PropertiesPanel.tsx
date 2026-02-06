
import React, { useState } from 'react';
import type { PageConfig } from '../../pdf/types';
import { AVAILABLE_VARIABLES, FONT_SIZES, TEXT_ALIGNS } from '../constants';
import { generateContentSuggestion, suggestStylePairing } from '../services/geminiService';
import type { BlockStyles, PageBlock } from '../types';
import { DuplicateIcon, LayersIcon, MagicIcon, TrashIcon } from './Icons';

interface PropertiesPanelProps {
  selectedBlock: PageBlock | null;
  onUpdate: (updates: Partial<PageBlock>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  savedPages?: PageConfig[];
  onDeletePage?: (index: number) => void;
  onLoadPage?: (index: number) => void;
  onNewPage?: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedBlock,
    onUpdate,
    onDelete,
    onDuplicate,
    savedPages = [],
    onDeletePage,
    onLoadPage,
    onNewPage
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);

  if (!selectedBlock) {
    return (
      <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
           <h2 className="font-bold text-slate-200 text-xs uppercase tracking-widest flex items-center gap-2">
             <LayersIcon /> Brochure Pages
           </h2>
           {onNewPage && (
             <button
                onClick={onNewPage}
                className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors font-bold uppercase tracking-wide"
                title="Create New Blank Page"
             >
                + New
             </button>
           )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
           {savedPages.length === 0 ? (
               <div className="text-center py-10 text-slate-600">
                   <p className="text-sm">No saved pages yet.</p>
                   <p className="text-xs mt-2 opacity-50">Create your layout and click "Save as Page"</p>
               </div>
           ) : (
               savedPages.map((page, idx) => {
                   const isEditable = !!page.blocks;
                   return (
                   <div key={idx} className={`bg-slate-800 rounded border border-slate-700 p-3 group hover:border-blue-500/50 transition-colors relative ${!isEditable ? 'opacity-70' : ''}`}>
                       <div className="flex items-center justify-between mb-2">
                           <div className="flex flex-col min-w-0">
                               <span className="text-xs font-bold text-slate-300 uppercase truncate pr-4">{page.title || page.type}</span>
                               {!isEditable && <span className="text-[9px] text-slate-500 font-mono mt-0.5">NATIVE TEMPLATE</span>}
                           </div>
                           <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => onDeletePage?.(idx)}
                                    className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <TrashIcon />
                                </button>
                           </div>
                       </div>

                       {/* Mini Preview Frame */}
                       <div 
                         className={`bg-white aspect-[3/4] rounded-sm overflow-hidden relative transition-all shadow-sm ${isEditable ? 'cursor-pointer group-hover:ring-2 ring-blue-500/30' : 'cursor-not-allowed border border-slate-600'}`} 
                         onClick={() => isEditable && onLoadPage?.(idx)}
                       >
                           <iframe
                                title={`Preview ${idx}`}
                                srcDoc={page.htmlContent || '<html><body></body></html>'}
                                className="w-[200%] h-[200%] transform scale-50 origin-top-left pointer-events-none select-none bg-white"
                                tabIndex={-1}
                           />
                           {isEditable ? (
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center z-10">
                                <button className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-700 pointer-events-none">
                                    Edit Page
                                </button>
                            </div>
                           ) : (
                               <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center z-10">
                                   <div className="bg-slate-800/90 text-slate-400 text-[9px] font-bold px-2 py-1 rounded backdrop-blur-sm border border-slate-700">
                                       SYSTEM PAGE
                                   </div>
                               </div>
                           )}
                       </div>
                   </div>
               )})
           )}
        </div>
      </div>
    );
  }

  const handleStyleChange = (key: keyof BlockStyles, value: string) => {
    onUpdate({
      styles: {
        ...selectedBlock.styles,
        [key]: value
      }
    });
  };

  const handleMagicContent = async () => {
    if (selectedBlock.type !== 'title' && selectedBlock.type !== 'text') return;
    setIsAiLoading(true);
    const suggestion = await generateContentSuggestion(selectedBlock.content, selectedBlock.type);
    if (suggestion) {
      onUpdate({ content: suggestion });
    }
    setIsAiLoading(false);
  };

  const handleMagicColors = async () => {
    if (!selectedBlock.styles.backgroundColor) return;
    setIsAiLoading(true);
    const pairing = await suggestStylePairing(selectedBlock.styles.backgroundColor);
    if (pairing) {
      onUpdate({
        styles: {
          ...selectedBlock.styles,
          color: pairing.text,
          borderColor: pairing.accent
        }
      });
    }
    setIsAiLoading(false);
  };

  const inputClass = "w-full p-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-slate-600";
  const labelClass = "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block";
  const sectionTitleClass = "text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-800";

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden text-slate-300">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <h2 className="font-bold text-slate-200 text-xs uppercase tracking-tighter flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          {selectedBlock.type}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => onDuplicate(selectedBlock.id)}
            title="Duplicate"
            className="text-slate-400 hover:text-blue-400 hover:bg-slate-800 p-1.5 rounded transition-all"
          >
            <DuplicateIcon />
          </button>
          <button
            onClick={() => onDelete(selectedBlock.id)}
            title="Delete"
            className="text-slate-400 hover:text-red-400 hover:bg-slate-800 p-1.5 rounded transition-all"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
        {/* Layout Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Layout & Sizing</h3>
            <button
              onClick={() => handleStyleChange('width', '100%')}
              className="text-[9px] text-blue-400 hover:text-blue-300 underline"
            >
              Reset to 100%
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={labelClass}>Width</span>
              <input
                type="text"
                className={inputClass}
                value={selectedBlock.styles.width || ''}
                onChange={(e) => handleStyleChange('width', e.target.value)}
                placeholder="100%"
              />
            </div>
            <div>
              <span className={labelClass}>Height</span>
              <input
                type="text"
                className={inputClass}
                value={selectedBlock.styles.height || ''}
                onChange={(e) => handleStyleChange('height', e.target.value)}
                placeholder="auto"
              />
            </div>
          </div>
        </div>

        {/* Container Specific */}
        {selectedBlock.type === 'container' && (
          <div>
            <h3 className={sectionTitleClass}>Container Flow</h3>
            <div className="space-y-4">
              <div>
                <span className={labelClass}>Direction</span>
                <div className="flex bg-slate-800 p-1 rounded border border-slate-700">
                  <button
                    onClick={() => handleStyleChange('flexDirection', 'column')}
                    className={`flex-1 py-1.5 text-xs rounded transition-all ${selectedBlock.styles.flexDirection === 'column' || !selectedBlock.styles.flexDirection ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Column
                  </button>
                  <button
                    onClick={() => handleStyleChange('flexDirection', 'row')}
                    className={`flex-1 py-1.5 text-xs rounded transition-all ${selectedBlock.styles.flexDirection === 'row' ? 'bg-slate-700 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Row
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className={labelClass}>Align</span>
                  <select
                    className={inputClass}
                    value={selectedBlock.styles.alignItems || 'stretch'}
                    onChange={(e) => handleStyleChange('alignItems', e.target.value)}
                  >
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="flex-end">End</option>
                    <option value="stretch">Stretch</option>
                  </select>
                </div>
                <div>
                  <span className={labelClass}>Gap</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={selectedBlock.styles.gap || ''}
                    onChange={(e) => handleStyleChange('gap', e.target.value)}
                    placeholder="20px"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

                {/* Dynamic Data Section */}
        {(selectedBlock.type === 'title' || selectedBlock.type === 'text' || selectedBlock.type === 'button') && (
           <div className="mb-6">
             <h3 className={sectionTitleClass}>Dynamic Data</h3>
             <div>
                <span className={labelClass}>Bind to Attribute</span>
                <select
                  className={inputClass}
                  value={selectedBlock.dynamicField || ''}
                  onChange={(e) => onUpdate({ dynamicField: e.target.value })}
                >
                  {AVAILABLE_VARIABLES.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Overrides static content when available</p>
             </div>
           </div>
        )}

        {/* Content Section */}
        {(selectedBlock.type === 'title' || selectedBlock.type === 'text' || selectedBlock.type === 'button') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Content</h3>
              <button
                onClick={handleMagicContent}
                disabled={isAiLoading}
                className="text-[9px] bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded hover:bg-indigo-800 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <MagicIcon /> AI Smart
              </button>
            </div>
            <textarea
              className={`${inputClass} h-24 resize-none`}
              value={selectedBlock.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
            />
          </div>
        )}

        {selectedBlock.type === 'image' && (
          <div className="space-y-4">
            <h3 className={sectionTitleClass}>Image Options</h3>
            <div>
                <label className={labelClass}>Dynamic Source</label>
                <select
                  className={inputClass}
                  value={selectedBlock.dynamicField || ''}
                  onChange={(e) => onUpdate({ dynamicField: e.target.value })}
                >
                  {AVAILABLE_VARIABLES.filter(v =>
                      v.value === '' ||
                      v.value?.includes('logo') ||
                      v.value?.includes('image') ||
                      v.value?.includes('Image')
                  ).map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
            </div>
            {!selectedBlock.dynamicField && (
                <div>
                  <label className={labelClass}>Source URL</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={selectedBlock.content}
                    onChange={(e) => onUpdate({ content: e.target.value })}
                  />
                </div>
            )}
            <div>
              <label className={labelClass}>Fit Mode</label>
              <div className="flex bg-slate-800 p-1 rounded border border-slate-700">
                <button
                  onClick={() => handleStyleChange('objectFit', 'cover')}
                  className={`flex-1 py-1.5 text-xs rounded transition-all ${selectedBlock.styles.objectFit === 'cover' || !selectedBlock.styles.objectFit ? 'bg-slate-700 text-blue-400' : 'text-slate-500'}`}
                >
                  Cover
                </button>
                <button
                  onClick={() => handleStyleChange('objectFit', 'contain')}
                  className={`flex-1 py-1.5 text-xs rounded transition-all ${selectedBlock.styles.objectFit === 'contain' ? 'bg-slate-700 text-blue-400' : 'text-slate-500'}`}
                >
                  Contain
                </button>
              </div>
            </div>
          </div>
        )}

                {selectedBlock.type === 'gallery' && (
          <div className="space-y-4">
            <h3 className={sectionTitleClass}>Gallery Grid</h3>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <span className={labelClass}>Columns</span>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    className={inputClass}
                    value={(selectedBlock.styles.gridTemplateColumns?.match(/repeat\((\d+)/)?.[1]) || '2'}
                    onChange={(e) => handleStyleChange('gridTemplateColumns', `repeat(${e.target.value}, 1fr)`)}
                  />
               </div>
               <div>
                  <span className={labelClass}>Gap</span>
                  <input
                    type="text"
                    className={inputClass}
                    value={selectedBlock.styles.gap || '10px'}
                    onChange={(e) => handleStyleChange('gap', e.target.value)}
                  />
               </div>
            </div>
          </div>
        )}

        {/* Style Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Appearance</h3>
            <button
              onClick={handleMagicColors}
              disabled={isAiLoading}
              className="text-[9px] bg-purple-900/50 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded hover:bg-purple-800 transition-colors flex items-center gap-1"
            >
              <MagicIcon /> Palette
            </button>
          </div>
          <div>
            <span className={labelClass}>Background Color</span>
            <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded border border-slate-700">
              <input
                type="color"
                className="w-8 h-8 bg-transparent border-none p-0 cursor-pointer"
                value={selectedBlock.styles.backgroundColor || '#ffffff'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
              />
              <span className="text-xs font-mono text-slate-400 uppercase">{selectedBlock.styles.backgroundColor || '#ffffff'}</span>
            </div>
          </div>
          <div>
            <span className={labelClass}>Padding</span>
            <input
              type="text"
              className={inputClass}
              value={selectedBlock.styles.padding || ''}
              onChange={(e) => handleStyleChange('padding', e.target.value)}
              placeholder="20px"
            />
          </div>
        </div>

        {/* Typography */}
        {(selectedBlock.type === 'title' || selectedBlock.type === 'text' || selectedBlock.type === 'button') && (
          <div className="space-y-4">
            <h3 className={sectionTitleClass}>Typography</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={labelClass}>Size</span>
                <select
                  className={inputClass}
                  value={selectedBlock.styles.fontSize || '16px'}
                  onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                >
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <span className={labelClass}>Alignment</span>
                <select
                  className={inputClass}
                  value={selectedBlock.styles.textAlign || 'left'}
                  onChange={(e) => handleStyleChange('textAlign', e.target.value as any)}
                >
                  {TEXT_ALIGNS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="flex-1">
              <span className={labelClass}>Text Color</span>
              <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded border border-slate-700">
                <input
                  type="color"
                  className="w-8 h-8 bg-transparent border-none p-0 cursor-pointer"
                  value={selectedBlock.styles.color || '#000000'}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                />
                <span className="text-xs font-mono text-slate-400 uppercase">{selectedBlock.styles.color || '#000000'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-800 text-[9px] text-slate-600 text-center uppercase tracking-widest">
        Brochure Architecture v1
      </div>
    </div>
  );
};

export default PropertiesPanel;
