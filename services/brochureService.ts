import { defaultTheme } from '../components/pdf/themes';
import type { Agency, BrochureData, BrochureSettings, PageConfig, PropertyData } from '../components/pdf/types';
import type { Project, User, Agency as AppAgency } from '../types';
import { COLLECTIONS, DATABASE_ID, databases, projectService } from './appwrite';
import { getPropertyParsed } from './propertyService';

export const brochureService = {
  /**
   * Fetches the agency document and parses the brochure data.
   * Returns a normalized object ready for the PDF renderer.
   */
  async getAgencyBrochureConfig(agencyId: string): Promise<{ agency: Agency, settings: BrochureSettings, pages: PageConfig[] }> {
    try {
      const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.AGENCIES, agencyId) as unknown as AppAgency;

      let settings: BrochureSettings = {
        theme: defaultTheme
      };

      let pages: PageConfig[] = [];

      if (doc.brochure) {
        try {
          const defaultPages: PageConfig[] = [
            { type: 'cover', enabled: true },
            { type: 'description', enabled: true },
            { type: 'gallery', enabled: true },
            { type: 'features', enabled: true },
            { type: 'map', enabled: true },
            { type: 'contact', enabled: true }
          ];

          const parsed: BrochureData = JSON.parse(doc.brochure);

          // Merge settings with defaults
          if (parsed.settings) {
            settings = {
               ...settings,
               ...parsed.settings,
               theme: {
                   colors: { ...defaultTheme.colors, ...(parsed.settings.theme?.colors || {}) },
                   fonts: { ...defaultTheme.fonts, ...(parsed.settings.theme?.fonts || {}) },
                   shapes: { ...defaultTheme.shapes, ...(parsed.settings.theme?.shapes || {}) },
                   background: { ...defaultTheme.background, ...(parsed.settings.theme?.background || {}) }
               }
            };
          }

          // Use pages from data
          pages = (parsed.pages && Array.isArray(parsed.pages) && parsed.pages.length > 0)
            ? parsed.pages
            : defaultPages;

        } catch (e) {
          console.error("Failed to parse brochure JSON", e);
          // Fallback to defaults
          pages = [
            { type: 'cover', enabled: true },
            { type: 'description', enabled: true },
            { type: 'gallery', enabled: true },
            { type: 'features', enabled: true },
            { type: 'map', enabled: true },
            { type: 'contact', enabled: true }
          ];
        }
      }

      const agency: Agency = {
          id: doc.$id,
          name: doc.name,
          address: doc.address,
          email: undefined,
          phone: undefined,
          logo: doc.logo,
          website: undefined,
          brochureSettings: settings
      };

      return { agency, settings, pages };

    } catch (error) {
      console.error("Error fetching agency config", error);
      throw error;
    }
  },

  /**
   * Maps the application Project type to the PDF system's PropertyData type.
   */
  async transformProjectToPropertyData(project: Project, agent?: User): Promise<PropertyData> {
    // Load property data from new schema if available
    let propertyData;
    let address = '';
    let price = 0;
    let description = '';
    let bedrooms = 0;
    let bathrooms = 0;
    let sqft = 0;
    let buildYear: number | null = null;
    let propertyImages: string[] = [];

    if (project.property_id) {
      try {
        propertyData = await getPropertyParsed(project.property_id);
        address = propertyData.formattedAddress;
        // Price is stored at project level, not property level
        price = project.price || 0;
        // Extract property description (filter type 'propertydesc')
        const propDesc = propertyData.descriptions.find(d => d.type === 'propertydesc');
        description = propDesc?.content || '';
        bedrooms = propertyData.roomsData.bedrooms || 0;
        bathrooms = propertyData.roomsData.bathrooms || 0;
        sqft = propertyData.sizeData.floorSize || propertyData.sizeData.lotSize || 0;
        buildYear = propertyData.specsData.find(s => s.match(/\d{4}/))?.match(/\d{4}/)?.[0] ? parseInt(propertyData.specsData.find(s => s.match(/\d{4}/))!.match(/\d{4}/)![0]) : null;
        propertyImages = propertyData.mediaData.images || [];
      } catch (error) {
        console.error('Failed to load property data, falling back to legacy:', error);
        // Fallback to legacy
        address = project.property.address;
        price = project.property.price || 0;
        description = project.property.description || '';
        bedrooms = project.property.bedrooms || 0;
        bathrooms = project.property.bathrooms || 0;
        sqft = project.property.sqft || 0;
        buildYear = project.property.buildYear || null;
        propertyImages = (project.property as any).images || [];
      }
    } else {
      // Legacy fallback
      address = project.property.address;
      price = project.property.price || 0;
      description = project.property.description || '';
      bedrooms = project.property.bedrooms || 0;
      bathrooms = project.property.bathrooms || 0;
      sqft = project.property.sqft || 0;
      buildYear = project.property.buildYear || null;
      propertyImages = (project.property as any).images || [];
    }

    // Resolve cover image
    let coverImage = '';
    if (project.coverImageId) {
        coverImage = await projectService.getImagePreview(project.coverImageId);
    } else if ((project as any).media && (project as any).media.length > 0) {
        const first = (project as any).media[0];
        if (first && first.startsWith('http')) {
          coverImage = first;
        } else if (first) {
          coverImage = await projectService.getImagePreview(first);
        }
    } else if (propertyImages.length > 0) {
         const first = propertyImages[0];
         if (first && first.startsWith('http')) {
           coverImage = first;
         } else if (first) {
           coverImage = await projectService.getImagePreview(first);
         }
    }

    // Resolve images
    // Prefer media (new system) over property images
    const rawImages = ((project as any).media && (project as any).media.length > 0) ? (project as any).media : propertyImages;
    const images = await Promise.all(rawImages.map(async img => {
      if (!img) return '';
      return img.startsWith('http') ? img : await projectService.getImagePreview(img);
    }));

    return {
      id: project.id,
      title: project.title,
      address,
      price,
      currency: '€',
      description: description.replace(/<[^>]*>?/gm, ''), // Strip HTML
      specs: {
        beds: bedrooms,
        baths: bathrooms,
        sqft,
        buildYear,
      },
      features: [
         ...(buildYear ? [{ label: 'Built', value: buildYear }] : []),
         // Add more custom mapping here
      ],
      images,
      coverImage,
      agent: agent ? {
          name: agent.name,
          email: agent.email,
          phone: agent.phone || '',
          role: agent.role,
          avatar: agent.avatar
      } : undefined
    };
  }
};
