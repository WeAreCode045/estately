export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  shapes: {
    borderRadius: number;
    cardStyle: 'flat' | 'shadow' | 'border' | 'filled';
  };
  background: {
    style: 'clean' | 'geometric' | 'subtle';
  };
}

export type PageType = 'cover' | 'description' | 'gallery' | 'features' | 'map' | 'contact';

export interface PageConfig {
  type: PageType;
  enabled: boolean;
  title?: string; // Optional override for page title
  columns?: number; // Specific for gallery
  options?: Record<string, any>;
}

export interface BrochureSettings {
  templateId?: string; // e.g. 'classic', 'modern'
  theme: ThemeConfig;
  pages: PageConfig[];
}

// Re-defining Agency here to strictly match the PDF needs,
// though we usually map from the main application's Agency type.
export interface Agency {
  id: string;
  name: string;
  logo?: string;
  address: string;
  email?: string;
  phone?: string;
  website?: string;
  brochureSettings?: BrochureSettings; // The parsed object
}

// Property Data Interface for the PDF
export interface PropertyFeature {
  label: string;
  value: string | number | boolean;
  icon?: string;
}

export interface PropertyData {
  id: string;
  title: string;
  address: string;
  price: number;
  currency: string;
  description: string;
  specs: {
    beds: number;
    baths: number;
    sqft: number;
    lotSize?: number;
    buildYear?: number;
  };
  features: PropertyFeature[];
  images: string[]; // Array of URLs
  coverImage: string;
  agent?: {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    role?: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
}
