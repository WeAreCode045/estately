
import type { PageBlock } from './types';

export const INITIAL_BLOCKS: PageBlock[] = [
  {
    id: 'initial-container',
    type: 'container',
    content: '',
    styles: {
      padding: '40px',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      width: '100%',
      minHeight: '200px'
    },
    children: [
      {
        id: 'initial-title',
        type: 'title',
        content: 'Welcome to Brochure Builder',
        styles: {
          fontSize: '36px',
          fontWeight: '700',
          color: '#1e293b',
          textAlign: 'center'
        }
      },
      {
        id: 'initial-text',
        type: 'text',
        content: 'Start building your amazing HTML template by adding blocks from the left sidebar.',
        styles: {
          fontSize: '18px',
          color: '#64748b',
          textAlign: 'center',
          width: '80%'
        }
      }
    ]
  }
];

export const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px', '40px', '48px', '64px'];
export const FONT_WEIGHTS = ['300', '400', '500', '600', '700', '800'];
export const TEXT_ALIGNS = ['left', 'center', 'right'];
export const BACKGROUND_SIZES = ['cover', 'contain', 'auto'];
export const OBJECT_FITS = ['cover', 'contain', 'fill', 'none'];

export const AVAILABLE_VARIABLES = [
  { label: 'None', value: '' },
  { label: 'Project Name', value: 'project.name' },
  { label: 'Project Description', value: 'project.description' },
  { label: 'Project Address', value: 'project.address' },
  { label: 'Project City', value: 'project.city' },
  { label: 'Project Price', value: 'project.price' },
  { label: 'Living Area', value: 'project.livingArea' },
  { label: 'Bedrooms', value: 'project.bedrooms' },
  { label: 'Agency Name', value: 'agency.name' },
  { label: 'Agency Logo', value: 'agency.logo' },
  { label: 'Project Cover Image', value: 'project.coverImage' },
  { label: 'Agent Name', value: 'agent.name' },
  { label: 'Agent Email', value: 'agent.email' },
  { label: 'Agent Phone', value: 'agent.phone' },
];

export const DEFAULT_STYLES: Record<string, any> = {
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#000000',
    marginBottom: '20px',
    textAlign: 'left'
  },
  text: {
    fontSize: '16px',
    fontWeight: '400',
    color: '#333333',
    marginBottom: '10px',
    textAlign: 'left'
  },
  image: {
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
    borderRadius: '0px'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer'
  },
  container: {
    padding: '20px',
    backgroundColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  gallery: {
    display: 'grid',
    gap: '10px',
    gridTemplateColumns: 'repeat(2, 1fr)',
    width: '100%',
    padding: '10px'
  }
};
