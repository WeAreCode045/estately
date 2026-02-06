
export type BlockType = 'title' | 'text' | 'image' | 'container' | 'button' | 'gallery';

export interface BlockStyles {
  width?: string;
  height?: string;
  minHeight?: string;
  color?: string;
  fontSize?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  padding?: string;
  margin?: string;
  borderRadius?: string;
  display?: string;
  flexDirection?: 'row' | 'column';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexGrow?: string;
  flexShrink?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  borderWidth?: string;
  borderColor?: string;
}

export interface PageBlock {
  id: string;
  type: BlockType;
  content: string; // Text content or image URL
  dynamicField?: string; // e.g. "project.title"
  styles: BlockStyles;
  children?: PageBlock[];
}

export interface SavedPage {
  id: string;
  name: string;
  lastModified: number;
  blocks: PageBlock[];
}
