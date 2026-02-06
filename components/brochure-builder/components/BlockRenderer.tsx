
import React, { useRef, useState } from 'react';
import type { BlockType, PageBlock } from '../types';

interface BlockRendererProps {
  block: PageBlock;
  selectedBlockId: string | null;
  onSelect: (block: PageBlock) => void;
  onDrop: (draggedId: string | null, draggedType: BlockType | null, targetId: string) => void;
  onDragStart: (id: string) => void;
  onResize?: (id: string, newWidth: string) => void;
  isPreview?: boolean;
  previewData?: any;
}

const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  selectedBlockId,
  onSelect,
  onDrop,
  onDragStart,
  onResize,
  isPreview = false,
  previewData
}) => {
  const isSelected = selectedBlockId === block.id;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleClick = (e: React.MouseEvent) => {
    if (isPreview) return;
    e.stopPropagation();
    onSelect(block);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isPreview || isResizing) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    onDragStart(block.id);
    e.dataTransfer.setData('blockId', block.id);
    e.currentTarget.classList.add('opacity-40');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-40');
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDragOver(false);
    }
  };

  const handleDropEvent = (e: React.DragEvent) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const draggedId = e.dataTransfer.getData('blockId');
    const draggedType = e.dataTransfer.getData('blockType') as BlockType;

    if (draggedId || draggedType) {
      onDrop(draggedId || null, draggedType || null, block.id);
    }
  };

  const onMouseDownResize = (e: React.MouseEvent) => {
    if (isPreview) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    const element = (e.target as HTMLElement).closest('.block-wrapper');
    if (element) {
      startWidth.current = element.getBoundingClientRect().width;
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!onResize) return;
      const deltaX = moveEvent.clientX - startX.current;
      const parentWidth = element?.parentElement?.getBoundingClientRect().width || 1;
      const newWidthPx = startWidth.current + deltaX;
      const newWidthPercent = Math.max(5, Math.min(100, (newWidthPx / parentWidth) * 100));
      onResize(block.id, `${newWidthPercent.toFixed(1)}%`);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Helper to split styles between layout and content
  const getStyles = () => {
    const {
      width, height, minHeight, flexGrow, flexShrink, margin, display,
      ...visualStyles
    } = block.styles;

    const layout: React.CSSProperties = {
      width: width || '100%',
      height: height || 'auto',
      minHeight,
      flexGrow: flexGrow || '0',
      flexShrink: '0',
      margin,
      maxWidth: '100%',
    };

    const content: React.CSSProperties = {
      ...visualStyles,
      // Internal content usually wants to fill the layout box
      width: '100%',
      height: height ? '100%' : 'auto',
      backgroundImage: visualStyles.backgroundImage ? `url(${visualStyles.backgroundImage})` : undefined,
      border: `${visualStyles.borderWidth || '0px'} solid ${visualStyles.borderColor || 'transparent'}`,
    } as any;

    return { layout, content };
  };

  const { layout, content } = getStyles();

  const dropZoneClasses = isDragOver ? 'ring-2 ring-blue-400 ring-inset bg-blue-50/30' : '';
  const selectionClasses = !isPreview && isSelected ? 'ring-2 ring-blue-500 relative z-40' : '';
  const hoverClasses = !isPreview ? 'hover:outline hover:outline-1 hover:outline-blue-200 cursor-default group' : '';

  const renderInner = () => {
    let dynamicVal: any = undefined;

    if (block.dynamicField && previewData && isPreview) {
        const parts = block.dynamicField.split('.');
        let val: any = previewData;
        let found = true;
        for (const part of parts) {
            if (val === undefined || val === null) {
                found = false;
                break;
            }
            val = val[part];
        }
        if (found) dynamicVal = val;
    }

    const displayText = (!isPreview && block.dynamicField)
        ? `{{${block.dynamicField}}}`
        : (dynamicVal !== undefined ? String(dynamicVal) : block.content);

    switch (block.type) {
      case 'title':
        return <h1 style={content}>{displayText}</h1>;
      case 'text':
        return <p style={content}>{displayText}</p>;
      case 'image': {
         if (block.dynamicField && !isPreview) {
             return (
                 <div style={{ ...content, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '12px', border: '1px dashed #cbd5e1' }}>
                     <span className="font-mono">{`{{${block.dynamicField}}}`}</span>
                 </div>
             );
         }

         const imgSrc = (dynamicVal && typeof dynamicVal === 'string') ? dynamicVal : (block.content || 'https://picsum.photos/400/200');

        return (
          <img
            src={imgSrc}
            style={{
              ...content,
              display: 'block',
              pointerEvents: 'none',
              objectFit: block.styles.objectFit || 'cover'
            }}
            alt="Block Content"
          />
        );
      }
      case 'button':
        return (
          <button style={{ ...content, pointerEvents: 'none' }}>
            {displayText}
          </button>
        );
      case 'gallery': {
        const galleryImages = (Array.isArray(dynamicVal) && dynamicVal.length > 0)
            ? dynamicVal
            : [1,2,3,4].map(idx => `https://picsum.photos/seed/${idx + (block.id ? 0 : 1)}/400/300`);

        return (
          <div style={{
            ...content,
            display: 'grid',
            gridTemplateColumns: (block.styles as any).gridTemplateColumns || 'repeat(2, 1fr)',
            gap: block.styles.gap || '10px',
            width: '100%'
          }}>
             {galleryImages.map((src: string, idx: number) => (
                 <div key={idx} className="bg-slate-100 aspect-[4/3] rounded overflow-hidden">
                     <img
                        src={src}
                        className="w-full h-full object-cover opacity-80"
                        alt={`Gallery item ${idx}`}
                      />
                 </div>
             ))}
          </div>
        );
      }
      case 'container':
        return (
          <div
            style={{
              ...content,
              display: block.styles.display || 'flex',
              flexDirection: block.styles.flexDirection || 'column',
              minHeight: block.styles.minHeight || '50px',
            }}
            className={`transition-colors relative ${isDragOver && block.type === 'container' ? 'bg-blue-50/20' : ''}`}
          >
            {block.children?.map((child) => (
              <BlockRenderer
                key={child.id}
                block={child}
                selectedBlockId={selectedBlockId}
                onSelect={onSelect}
                onDrop={onDrop}
                onDragStart={onDragStart}
                onResize={onResize}
                isPreview={isPreview}
                previewData={previewData}
              />
            ))}
            {!isPreview && (!block.children || block.children.length === 0) && (
              <div className="p-8 border-2 border-dashed border-slate-200 text-slate-300 text-center w-full text-xs uppercase tracking-widest font-bold">
                Drop Zone
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`block-wrapper transition-shadow duration-200 ${dropZoneClasses} ${selectionClasses} ${hoverClasses} relative`}
      onClick={handleClick}
      draggable={!isPreview && !isResizing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropEvent}
      style={layout}
    >
      {renderInner()}

      {!isPreview && isSelected && (
        <div
          className="absolute -right-1 top-0 bottom-0 w-3 cursor-col-resize hover:bg-blue-500/50 z-50 transition-colors group-hover:bg-blue-400/20 flex items-center justify-center"
          onMouseDown={onMouseDownResize}
        >
          <div className="w-1.5 h-12 bg-blue-500 rounded-full shadow-lg border border-white" />
        </div>
      )}
    </div>
  );
};

export default BlockRenderer;
