import { defaultTheme } from '../components/pdf/themes';
import type { Agency, BrochureSettings, PageConfig, PropertyData } from '../components/pdf/types';
import type { Project, User } from '../types';
import { COLLECTIONS, DATABASE_ID, databases, projectService } from './appwrite';

export const brochureService = {
  /**
   * Fetches the agency document and parses the brochureSettings.
   * Returns a normalized object ready for the PDF renderer.
   */
  async getAgencyBrochureConfig(agencyId: string): Promise<{ agency: Agency, settings: BrochureSettings }> {
    try {
      const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.AGENCY, agencyId);

      let settings: BrochureSettings = {
        theme: defaultTheme,
        pages: []
      };

      if (doc.brochureSettings) {
        try {
          const defaultPages: PageConfig[] = [
            { type: 'cover', enabled: true },
            { type: 'description', enabled: true },
            { type: 'gallery', enabled: true },
            { type: 'features', enabled: true },
            { type: 'map', enabled: true },
            { type: 'contact', enabled: true }
          ];

          const parsed = JSON.parse(doc.brochureSettings);
          // Merge with defaults to ensure type safety
          settings = {
             ...settings,
             ...parsed,
             theme: {
                 colors: { ...defaultTheme.colors, ...(parsed.theme?.colors || {}) },
                 fonts: { ...defaultTheme.fonts, ...(parsed.theme?.fonts || {}) }
             },
             pages: (parsed.pages as PageConfig[]) || defaultPages
          };

          if (!settings.pages || settings.pages.length === 0) {
              settings.pages = defaultPages;
          }

        } catch (e) {
          console.error("Failed to parse brochure settings JSON", e);
        }
      }

      const agency: Agency = {
          id: doc.$id,
          name: doc.name,
          address: doc.address,
          email: doc.email,
          phone: doc.phone,
          logo: doc.logo,
          website: doc.website,
          brochureSettings: settings
      };

      return { agency, settings };

    } catch (error) {
      console.error("Error fetching agency config", error);
      throw error;
    }
  },

  /**
   * Maps the application Project type to the PDF system's PropertyData type.
   */
  transformProjectToPropertyData(project: Project, agent?: User): PropertyData {
    // Collect features from property attributes or description if needed
    // This is a mapping utility

    // Resolve cover image
    let coverImage = '';
    if (project.coverImageId) {
        coverImage = projectService.getImagePreview(project.coverImageId);
    } else if (project.media && project.media.length > 0) {
        const first = project.media[0];
        if (first && first.startsWith('http')) {
          coverImage = first;
        } else if (first) {
          coverImage = projectService.getImagePreview(first);
        }
    } else if (project.property.images && project.property.images.length > 0) {
         const first = project.property.images[0];
         if (first && first.startsWith('http')) {
           coverImage = first;
         } else if (first) {
           coverImage = projectService.getImagePreview(first);
         }
    }

    // Resolve images
    // Prefer media (new system) over property.images (legacy)
    const rawImages = (project.media && project.media.length > 0) ? project.media : (project.property.images || []);
    const images = rawImages.map(img => {
      if (!img) return '';
      return img.startsWith('http') ? img : projectService.getImagePreview(img);
    });

    return {
      id: project.id,
      title: project.title,
      address: project.property.address,
      price: project.property.price || 0,
      currency: '€', // Hardcoded or from project settings
      description: (project.property.description || '').replace(/<[^>]*>?/gm, ''), // Strip HTML
      specs: {
        beds: project.property.bedrooms || 0,
        baths: project.property.bathrooms || 0,
        sqft: project.property.sqft || 0,
        buildYear: project.property.buildYear,
      },
      features: [
         // Map some standard features if available
         ...(project.property.buildYear ? [{ label: 'Built', value: project.property.buildYear }] : []),
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
