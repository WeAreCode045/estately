
import type { PageBlock } from '../types';

const styleToCssString = (styles: React.CSSProperties): string => {
  return Object.entries(styles)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value}`;
    })
    .join('; ');
};

const getBlockStyles = (block: PageBlock) => {
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
    boxSizing: 'border-box'
  };

  const content: React.CSSProperties = {
    ...visualStyles,
    width: '100%',
    height: height ? '100%' : 'auto',
    backgroundColor: visualStyles.backgroundColor,
    backgroundImage: visualStyles.backgroundImage ? `url(${visualStyles.backgroundImage})` : undefined,
    border: `${visualStyles.borderWidth || '0px'} solid ${visualStyles.borderColor || 'transparent'}`,
    padding: visualStyles.padding,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: visualStyles.color,
    fontSize: visualStyles.fontSize,
    textAlign: visualStyles.textAlign,
    display: block.type === 'container' ? (display || 'flex') : 'block'
  } as any;

  if (block.type === 'container') {
    content.flexDirection = visualStyles.flexDirection || 'column';
    content.gap = visualStyles.gap;
    content.alignItems = visualStyles.alignItems;
    content.justifyContent = visualStyles.justifyContent;
  }

  return { layout, content };
};

const renderBlockToHtml = (block: PageBlock): string => {
  const { layout, content } = getBlockStyles(block);
  const layoutStyleStr = styleToCssString(layout);
  const contentStyleStr = styleToCssString(content);

  let innerHtml = '';

  const blockContent = block.dynamicField ? `{{${block.dynamicField}}}` : block.content;

  switch (block.type) {
    case 'title':
      innerHtml = `<h1 style="${contentStyleStr}">${blockContent}</h1>`;
      break;
    case 'text':
      innerHtml = `<p style="${contentStyleStr}">${blockContent}</p>`;
      break;
    case 'image':
      if (block.dynamicField) {
         const imgStyle = `${contentStyleStr}; object-fit: ${block.styles.objectFit || 'cover'}; display: block;`;
         innerHtml = `<img src="{{${block.dynamicField}}}" style="${imgStyle}" alt="Dynamic Image" />`;
      } else {
         const imgStyle = `${contentStyleStr}; object-fit: ${block.styles.objectFit || 'cover'}; display: block;`;
         innerHtml = `<img src="${block.content}" style="${imgStyle}" alt="Image" />`;
      }
      break;
    case 'button':
      innerHtml = `<button style="${contentStyleStr}; cursor: pointer; border: none;">${blockContent}</button>`;
      break;
    case 'gallery':
      const galleryStyle = `${contentStyleStr}; display: grid; grid-template-columns: ${block.styles.gridTemplateColumns || 'repeat(2, 1fr)'}; gap: ${block.styles.gap || '10px'};`;
      innerHtml = `<div style="${galleryStyle}">
         {{#each project.images}}
           <div style="aspect-ratio: 4/3; overflow: hidden; background-color: #f1f5f9;">
              <img src="{{this}}" style="width: 100%; height: 100%; object-fit: cover;" />
           </div>
         {{/each}}
      </div>`;
      break;
    case 'container':
      const childrenHtml = block.children?.map(renderBlockToHtml).join('') || '';
      innerHtml = `<div style="${contentStyleStr}">${childrenHtml}</div>`;
      break;
  }

  return `<div class="block-wrapper" style="${layoutStyleStr}">${innerHtml}</div>`;
};

export const exportBlocksToHtml = (blocks: PageBlock[]): string => {
  const contentHtml = blocks.map(renderBlockToHtml).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Template - Brochure</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }
        .page-container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            background-color: #ffffff;
            min-height: 100vh;
            overflow-x: hidden;
        }
        .block-wrapper {
            display: flex;
            flex-direction: column;
        }
        img { max-width: 100%; height: auto; }
        button { font-family: inherit; }
    </style>
</head>
<body>
    <div class="page-container">
        ${contentHtml}
    </div>
</body>
</html>`;
};
