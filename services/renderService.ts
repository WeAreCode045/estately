import { env } from '../utils/env';
import { COLLECTIONS, DATABASE_ID, databases } from './appwrite';
import { prepareAppwriteDataForRendering, renderAppwriteContentBrowser as renderAppwriteContent } from './templateRendererBrowser';

/**
 * Service for rendering templates with Appwrite data
 */
export const renderService = {
  /**
   * Renders a template HTML with data from Appwrite collections
   *
   * @param templateHtml - The HTML template content
   * @param options - Rendering options
   * @returns Rendered HTML with dynamically resolved image URLs
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async renderTemplate(
    templateHtml: string,
    options: {
      projectId?: string;
      agencyId?: string;
      userId?: string;
      s3BaseUrl?: string;
      additionalData?: Record<string, any>;
    }
  ): Promise<string> {
    const {
      projectId,
      agencyId,
      userId,
      s3BaseUrl = env.s3BaseUrl,
      additionalData = {}
    } = options;

    try {
      // Fetch required data from Appwrite
      let agency = null;
      let project = null;
      let user = null;

      // Fetch agency data
      if (agencyId) {
        try {
          agency = await databases.getDocument(DATABASE_ID, COLLECTIONS.AGENCIES, agencyId);
        } catch (error) {
          console.warn('Agency not found:', error);
        }
      } else {
        // Get first agency
        try {
          const agencyList = await databases.listDocuments(DATABASE_ID, COLLECTIONS.AGENCIES, []);
          agency = agencyList.documents[0] || null;
        } catch (error) {
          console.warn('No agency found:', error);
        }
      }

      // Fetch project data
      if (projectId) {
        try {
          project = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId);
        } catch (error) {
          console.warn('Project not found:', error);
        }
      }

      // Fetch user data
      if (userId) {
        try {
          user = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId);
        } catch (error) {
          console.warn('User not found:', error);
        }
      }

      // Prepare data object for renderer
      const dataObject = prepareAppwriteDataForRendering(
        agency,
        project,
        user,
        additionalData
      );

      // Render the template
      const renderedHtml = renderAppwriteContent(templateHtml, dataObject, s3BaseUrl, {
        fallbackImage: 'https://via.placeholder.com/400x300?text=No+Image',
        hideOnMissing: false,
        debug: env.isDev
      });

      return renderedHtml;

    } catch (error) {
      console.error('Error rendering template:', error);
      throw error;
    }
  },

  /**
   * Renders a saved template by ID
   */
  async renderTemplateById(
    templateId: string,
    options: {
      projectId?: string;
      agencyId?: string;
      userId?: string;
    }
  ): Promise<string> {
    try {
      // Fetch template from database
      const template = await databases.getDocument(DATABASE_ID, COLLECTIONS.TEMPLATES, templateId);

      const templateHtml = template.content || template.html || '';

      return await this.renderTemplate(templateHtml, options);
    } catch (error) {
      console.error('Error rendering template by ID:', error);
      throw error;
    }
  },

  /**
   * Preview template rendering (for testing)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async previewTemplate(
    templateHtml: string,
    mockData?: {
      agency?: any;
      project?: any;
      user?: any;
    }
  ): Promise<string> {
    const s3BaseUrl = env.s3BaseUrl;

    const dataObject = prepareAppwriteDataForRendering(
      mockData?.agency || {
        logo: 'agency/demo-logo.png',
        name: 'Demo Agency'
      },
      mockData?.project || {
        coverImageId: 'projects/demo-cover.jpg',
        title: 'Demo Project'
      },
      mockData?.user || {
        avatar: 'profiles/demo-avatar.jpg',
        name: 'Demo User'
      }
    );

    return renderAppwriteContent(templateHtml, dataObject, s3BaseUrl, {
      fallbackImage: 'https://via.placeholder.com/400x300?text=Preview',
      hideOnMissing: false,
      debug: true
    });
  },

  /**
   * Batch render multiple projects with the same template
   */
  async batchRenderProjects(
    templateHtml: string,
    projectIds: string[],
    options?: {
      s3BaseUrl?: string;
    }
  ): Promise<Array<{ projectId: string; renderedHtml: string; error?: string }>> {
    const results = await Promise.allSettled(
      projectIds.map(async (projectId) => {
        const renderedHtml = await this.renderTemplate(templateHtml, {
          projectId,
          ...options
        });
        return { projectId, renderedHtml };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          projectId: projectIds[index],
          renderedHtml: '',
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }
};
