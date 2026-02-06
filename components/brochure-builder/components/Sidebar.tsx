
import React from 'react';
import type { BlockType } from '../types';
import { LayersIcon, MagicIcon, PlusIcon, SaveIcon } from './Icons';

interface SidebarProps {
  onAddBlock: (type: BlockType) => void;
  onSave: () => void;
  onSavePage: () => void;
  onExport: () => void;
  onNew: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddBlock, onSave, onSavePage, onExport, onNew }) => {
  const blockOptions: { type: BlockType; label: string; icon: string }[] = [
    { type: 'title', label: 'Title Block', icon: 'H1' },
    { type: 'text', label: 'Text Block', icon: 'T' },
    { type: 'image', label: 'Image Block', icon: 'IMG' },
    { type: 'container', label: 'Container', icon: 'BOX' },
    { type: 'button', label: 'Button', icon: 'BTN' },
    { type: 'gallery', label: 'Gallery', icon: 'GAL' },
  ];

  const handleDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData('blockType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full z-30">
      <div className="p-6 border-b border-slate-100 flex items-center gap-2">
        <h1 className="font-bold text-slate-800 text-lg">Brochure Builder</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Add Elements</h2>
          <div className="grid grid-cols-1 gap-2">
            {blockOptions.map((opt) => (
              <button
                key={opt.type}
                draggable
                onDragStart={(e) => handleDragStart(e, opt.type)}
                onClick={() => onAddBlock(opt.type)}
                className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors text-sm font-medium text-slate-700 cursor-grab active:cursor-grabbing group"
              >
                <span className="w-8 h-8 bg-white rounded border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 shadow-sm group-hover:border-blue-300 group-hover:text-blue-500 transition-colors">
                  {opt.icon}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-slate-400 text-center italic">Drag into canvas to add</p>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Project</h2>
          <div className="space-y-2">
            <button
              onClick={onSave}
              className="w-full flex items-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
              title="Save current state for editing later"
            >
              <SaveIcon /> Save Template
            </button>
            <button
              onClick={onSavePage}
              className="w-full flex items-center gap-2 p-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
              title="Save as a page in the brochure settings"
            >
              <LayersIcon /> Save as Page
            </button>
            <button
              onClick={onExport}
              className="w-full flex items-center gap-2 p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-100 transition-colors text-sm font-medium"
            >
              <MagicIcon /> Export HTML
            </button>
            <button
              onClick={onNew}
              className="w-full flex items-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
            >
              <PlusIcon /> Clear Canvas
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <LayersIcon />
          <span>v1.0.0 Stable</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
