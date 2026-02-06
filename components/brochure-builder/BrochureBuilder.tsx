
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { PageConfig } from '../pdf/types';
import BlockRenderer from './components/BlockRenderer';
import { PlusIcon, PreviewIcon } from './components/Icons';
import PreviewModal from './components/PreviewModal';
import PropertiesPanel from './components/PropertiesPanel';
import Sidebar from './components/Sidebar';
import { DEFAULT_STYLES, INITIAL_BLOCKS } from './constants';
import type { BlockType, PageBlock } from './types';

interface BrochureBuilderProps {
  initialBlocks?: PageBlock[];
  onSave?: (blocks: PageBlock[]) => void;
  onSavePage?: (blocks: PageBlock[]) => void;
  savedPages?: PageConfig[];
  onDeletePage?: (index: number) => void;
  onLoadPage?: (index: number) => PageBlock[] | undefined;
  previewData?: Record<string, any>;
}

const BrochureBuilder: React.FC<BrochureBuilderProps> = ({
    initialBlocks,
    onSave,
    onSavePage,
    savedPages = [],
    onDeletePage,
    onLoadPage,
    previewData
}) => {
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks || INITIAL_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  // Helper to find parent of a block
  const findParentBlock = (blocksToCheck: PageBlock[], childId: string): { parent: PageBlock | null, index: number, list: PageBlock[] } | null => {
    for (let i = 0; i < blocksToCheck.length; i++) {
        if (blocksToCheck[i].id === childId) {
            return { parent: null, index: i, list: blocksToCheck };
        }
        if (blocksToCheck[i].children) {
            if (blocksToCheck[i].children!.some(c => c.id === childId)) {
                return { parent: blocksToCheck[i], index: blocksToCheck[i].children!.findIndex(c => c.id === childId), list: blocksToCheck[i].children! };
            }
            const found = findParentBlock(blocksToCheck[i].children!, childId);
            if (found) return found;
        }
    }
    return null;
  };

  // Helper to find a block by ID
  const findBlock = (id: string, blocksList: PageBlock[] = blocks): PageBlock | null => {
    for (const block of blocksList) {
      if (block.id === id) return block;
      if (block.children) {
        const found = findBlock(id, block.children);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedBlock = selectedBlockId ? findBlock(selectedBlockId) : null;

  const updateBlock = (id: string, updates: Partial<PageBlock>) => {
    const updateRecursive = (list: PageBlock[]): PageBlock[] => {
      return list.map(block => {
        if (block.id === id) {
          return { ...block, ...updates };
        }
        if (block.children) {
          return { ...block, children: updateRecursive(block.children) };
        }
        return block;
      });
    };
    setBlocks(updateRecursive(blocks));
  };

  const deleteBlock = (id: string) => {
    const deleteRecursive = (list: PageBlock[]): PageBlock[] => {
      return list.filter(block => block.id !== id).map(block => ({
        ...block,
        children: block.children ? deleteRecursive(block.children) : undefined
      }));
    };
    setBlocks(deleteRecursive(blocks));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const duplicateBlock = (id: string) => {
    const blockToDuplicate = findBlock(id);
    if (!blockToDuplicate) return;

    const newId = uuidv4();
    const duplicatedBlock = {
      ...JSON.parse(JSON.stringify(blockToDuplicate)),
      id: newId,
      content: blockToDuplicate.content + ' (Copy)'
    };

    const insertRecursive = (list: PageBlock[]): PageBlock[] => {
      const index = list.findIndex(b => b.id === id);
      if (index !== -1) {
        const newList = [...list];
        newList.splice(index + 1, 0, duplicatedBlock);
        return newList;
      }
      return list.map(block => ({
        ...block,
        children: block.children ? insertRecursive(block.children) : undefined
      }));
    };
    setBlocks(insertRecursive(blocks));
    setSelectedBlockId(newId);
  };

  const createBlock = (type: BlockType): PageBlock => {
    return {
      id: uuidv4(),
      type,
      content: type === 'title' ? 'New Heading' : type === 'text' ? 'Lorem ipsum dolor sit amet...' : type === 'button' ? 'Click Me' : type === 'image' ? 'https://via.placeholder.com/400x300' : '',
      styles: { ...DEFAULT_STYLES[type] },
      children: type === 'container' ? [] : undefined
    };
  };

  const handleAddBlock = (type: BlockType) => {
    const newBlock = createBlock(type);

    // If a container is selected, add to it
    if (selectedBlockId) {
        const target = findBlock(selectedBlockId);
        if (target && target.type === 'container') {
             // Add to container
             updateBlock(selectedBlockId, {
                 children: [...(target.children || []), newBlock]
             });
             return;
        }
    }

    // Otherwise add to root
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id); // Select the new block
  };

  const handleDrop = (draggedId: string | null, draggedType: BlockType | null, targetId: string) => {
    if (draggedId === targetId) return;

    let newBlocks = [...blocks];
    let draggedBlock: PageBlock | null = null;

    // 1. Get the dragged block (either existing or new)
    if (draggedId) {
      // Move existing
      const found = findBlock(draggedId);
      if (found) draggedBlock = found;
      // Remove from old location
      newBlocks = deleteBlockFromList(newBlocks, draggedId);
    } else if (draggedType) {
      // Create new
      draggedBlock = createBlock(draggedType);
    }

    if (!draggedBlock) return;

    // 2. Insert into new location (targetId)
    // If targetId is 'root', append to root.
    // If targetId is a container, append to container.
    // If targetId is another block, insert after/before?
    // The BlockRenderer logic calls onDrop when dropping ON a block.

    const insertInto = (list: PageBlock[], targetId: string, blockToInsert: PageBlock): PageBlock[] => {
      return list.map(block => {
        if (block.id === targetId) {
          // If dropped ON component -> if container, add to children. If not, maybe add after?
          // For now, let's assume if it's a container, we add inside.
          // If NOT container, we add AFTER it in parent list (complicated here without parent ref).
          // But wait, BlockRenderer passes targetId as the block ID dropped ON.

          if (block.type === 'container') {
             return {
                 ...block,
                 children: [...(block.children || []), blockToInsert]
             };
          } else {
             // We can't insert 'after' easily in this map.
             // We need to find parent and insert.
             return block;
          }
        }
        if (block.children) {
          return { ...block, children: insertInto(block.children, targetId, blockToInsert) };
        }
        return block;
      });
    };

    // Optimized insert logic
    // Needs to handle 'insert after' vs 'insert inside'.
    // Current BlockRenderer drops simply pass targetId.
    // Let's modify approach: Find parent of targetId.

    const addToTarget = () => {
         // Special handling for dropping on a container vs other blocks
         const targetBlock = findBlock(targetId, newBlocks); // Use current state (minus dragged)
         if (targetBlock?.type === 'container') {
             // Insert as child
             targetBlock.children = [...(targetBlock.children || []), draggedBlock!];
         } else {
             // Insert after target in its parent list
             const findAndInsertAfter = (list: PageBlock[]): PageBlock[] => {
                 const idx = list.findIndex(b => b.id === targetId);
                 if (idx !== -1) {
                     const copy = [...list];
                     copy.splice(idx + 1, 0, draggedBlock!);
                     return copy;
                 }
                 return list.map(b => ({
                     ...b,
                     children: b.children ? findAndInsertAfter(b.children) : undefined
                 }));
             };
             newBlocks = findAndInsertAfter(newBlocks);
         }
    };

    // Special 'root' target
    if (targetId === 'root') {
        newBlocks.push(draggedBlock);
    } else {
        addToTarget();
    }

    setBlocks(newBlocks);
    setSelectedBlockId(draggedBlock.id);
  };

  // Helper used in handleDrop
  const deleteBlockFromList = (list: PageBlock[], id: string): PageBlock[] => {
      return list.filter(b => b.id !== id).map(b => ({
          ...b,
          children: b.children ? deleteBlockFromList(b.children, id) : undefined
      }));
  };

  // Root drop handler
  const handleRootDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('blockId');
      const draggedType = e.dataTransfer.getData('blockType') as BlockType;

      if (!draggedId && !draggedType) return;
      handleDrop(draggedId || null, draggedType || null, 'root');
  };

  const handleRootDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleSelectBlock = (block: PageBlock) => {
      setSelectedBlockId(block.id);
  };

  const handleNew = () => {
    if (confirm('Create a new blank page? Any unsaved changes on the current canvas will be lost.')) {
        setBlocks([]);
        setSelectedBlockId(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <Sidebar
        onAddBlock={handleAddBlock}
        onSave={() => onSave?.(blocks)}
        onSavePage={() => {
            onSavePage?.(blocks);
            setSelectedBlockId(null);
        }}
        onExport={() => setShowPreviewModal(true)}
        onNew={handleNew}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar - Optional */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
           <div className="flex items-center text-sm text-slate-500">
              Canvas ({blocks.length} elements)
           </div>
           <div className="flex items-center gap-2">
              <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${previewMode ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                  <PreviewIcon />
                  {previewMode ? 'Edit Mode' : 'Preview Mode'}
              </button>
           </div>
        </div>

        {/* Canvas Area */}
        <div
            className="flex-1 overflow-auto bg-slate-100 p-8 custom-scrollbar flex justify-center"
            onDragOver={handleRootDragOver}
            onDrop={handleRootDrop}
            onClick={() => setSelectedBlockId(null)}
        >
            <div
                className={`bg-white shadow-xl min-h-[800px] w-full max-w-[900px] transition-all duration-300 ${previewMode ? 'scale-100' : 'scale-100'} origin-top`}
                id="canvas-root"
            >
                {blocks.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-300 pointer-events-none">
                        <PlusIcon />
                        <p className="mt-2 text-sm">Drag blocks here or click to add</p>
                    </div>
                ) : (
                    blocks.map(block => (
                        <BlockRenderer
                            key={block.id}
                            block={block}
                            selectedBlockId={selectedBlockId}
                            onSelect={handleSelectBlock}
                            onDrop={handleDrop}
                            onDragStart={(id) => setDraggedBlockId(id)}
                            onResize={(id, width) => updateBlock(id, { styles: { ...findBlock(id)?.styles, width } })}
                            isPreview={previewMode}
                            previewData={previewData}
                        />
                    ))
                )}
            </div>
        </div>
      </div>

      <PropertiesPanel
        selectedBlock={selectedBlock}
        onUpdate={(updates) => selectedBlockId && updateBlock(selectedBlockId, updates)}
        onDelete={deleteBlock}
        onDuplicate={duplicateBlock}
        savedPages={savedPages}
        onDeletePage={onDeletePage}
        onNewPage={handleNew}
        onLoadPage={(idx) => {
            const blocks = onLoadPage?.(idx);

            if (!blocks) {
                alert('Cannot edit this page: Source data is missing or incompatible.');
                return;
            }

            if (confirm('Load this page into the editor? Current unsaved changes on the canvas will be replaced.')) {
                setBlocks(JSON.parse(JSON.stringify(blocks))); // Deep copy to avoid reference issues
                setSelectedBlockId(null); // Ensure we stay on the pages view or switch to root
            }
        }}
      />

      {showPreviewModal && (
          <PreviewModal
              blocks={blocks}
              onClose={() => setShowPreviewModal(false)}
          />
      )}
    </div>
  );
};

export default BrochureBuilder;
