import { JSDOM } from 'jsdom';

/**
 * Deep resolver for accessing nested object properties via dot notation
 * e.g., "project.coverImageId" => dataObject.project.coverImageId
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveObjectPath(obj: any, path: string): any {
  if (!path || !obj) return undefined;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Renders Appwrite-sourced content with dynamic S3 image URLs
 *
 * @param html - The HTML template with data-appwrite-src attributes
 * @param dataObject - Object containing all data from Appwrite collections
 * @param s3BaseUrl - Base URL for S3 bucket (e.g., "https://bucket.s3.region.amazonaws.com/")
 * @param options - Additional rendering options
 * @returns Rendered HTML with resolved image URLs
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderAppwriteContent(
  html: string,
  dataObject: any,
  s3BaseUrl: string,
  options?: {
    fallbackImage?: string;
    hideOnMissing?: boolean;
    debug?: boolean;
  }
): string {
  const {
    fallbackImage = 'https://via.placeholder.com/400x300?text=Image+Not+Found',
    hideOnMissing = false,
    debug = false
  } = options || {};

  try {
    // Parse HTML using jsdom
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Find all elements with data-appwrite-src attribute
    const elementsWithDataSrc = document.querySelectorAll('[data-appwrite-src]');

    if// eslint-disable-next-line no-console
       (debug) {
      console.log(`Found ${elementsWithDataSrc.length} elements with data-appwrite-src`);
    }

    elementsWithDataSrc.forEach((element, index) => {
      const dataSrc = element.getAttribute('data-appwrite-src');

      if (!dataSrc) {
        if (debug) {
          // eslint-disable-next-line no-console
          console.log(`Element ${index}: No data-appwrite-src value`);
        }
        return;
      }

      if (debug) {
        // eslint-disable-next-line no-console
        console.log(`Element ${index}: Processing data-appwrite-src="${dataSrc}"`);
      }

      // Resolve the path in the data object
      const resolvedPath = resolveObjectPath(dataObject, dataSrc);

      if (debug) {
        // eslint-disable-next-line no-console
        console.log(`Element ${index}: Resolved value:`, resolvedPath);
      }

      let finalUrl: string | null = null;

      if (resolvedPath) {
        // Construct S3 URL
        // Ensure no double slashes
        const cleanBaseUrl = s3BaseUrl.endsWith('/') ? s3BaseUrl.slice(0, -1) : s3BaseUrl;
        const cleanPath = resolvedPath.startsWith('/') ? resolvedPath.slice(1) : resolvedPath;
        finalUrl = `${cleanBaseUrl}/${cleanPath}`;
      } else {
        // Value not found in dataObject
        if (hideOnMissing) {
          // Hide the element
          (element as HTMLElement).style.display = 'none';
          if (debug) {
            // eslint-disable-next-line no-console
            console.log(`Element ${index}: Hidden due to missing data`);
          }
          return;
        } else {
          // Use fallback
          finalUrl = fallbackImage;
          if (debug) {
            // eslint-disable-next-line no-console
            console.log(`Element ${index}: Using fallback image`);
          }
        }
      }

      // Set the src attribute
      if (finalUrl) {
        element.setAttribute('src', finalUrl);

        // Also set alt text if not present
        if (!element.getAttribute('alt') && dataSrc) {
          const altText = dataSrc.split('.').pop() || 'Image';
          element.setAttribute('alt', altText);
        }

        if (debug) {
          // eslint-disable-next-line no-console
          console.log(`Element ${index}: Final URL set to: ${finalUrl}`);
        }
      }

      // Optionally keep data-appwrite-src for debugging, or remove it
      // element.removeAttribute('data-appwrite-src');
    });

    // Return the serialized HTML
    return dom.serialize();

  } catch (error) {
    console.error('Error rendering Appwrite content:', error);
    throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Example usage and data object structure
 */
export const EXAMPLE_DATA_OBJECT = {
  agency: {
    logo: 'agency/logo.png',
    name: 'Estate Agency Pro',
    address: '123 Main Street'
  },
  project: {
    coverImageId: 'projects/cover-123.jpg',
    title: 'Luxury Apartment',
    price: 450000,
    images: [
      'projects/img1.jpg',
      'projects/img2.jpg',
      'projects/img3.jpg'
    ]
  },
  user: {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    avatar: 'profiles/user-avatar-456.jpg',
    name: 'John Doe',
    email: 'john@example.com'
  },
  profiles: {
    avatar: 'profiles/default-avatar.jpg'
  }
};

/**
 * Helper function to prepare data from Appwrite for rendering
 */
export function prepareAppwriteDataForRendering(
  agency: any,
  project: any,
  user: any,
  additionalData?: Record<string, any>
): any {
  return {
    agency: {
      logo: agency?.logo || null,
      name: agency?.name || '',
      address: agency?.address || '',
      bankAccount: agency?.bankAccount || '',
      vatCode: agency?.vatCode || '',
      ...agency
    },
    project: {
      coverImageId: project?.coverImageId || null,
      title: project?.title || '',
      address: project?.address || '',
      price: project?.price || null,
      description: project?.description || '',
      bedrooms: project?.bedrooms || null,
      bathrooms: project?.bathrooms || null,
      sqft: project?.sqft || null,
      media: project?.media || [],
      ...project
    },
    user: {
      avatar: user?.avatar || null,
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: user?.role || '',
      ...user
    },
    profiles: {
      avatar: user?.avatar || null
    },
    ...additionalData
  };
}

/**
 * Batch render multiple templates with the same data
 */
export function batchRenderTemplates(
  templates: Array<{ id: string; html: string }>,
  dataObject: any,
  s3BaseUrl: string,
  options?: Parameters<typeof renderAppwriteContent>[3]
): Array<{ id: string; renderedHtml: string; error?: string }> {
  return templates.map(template => {
    try {
      const renderedHtml = renderAppwriteContent(template.html, dataObject, s3BaseUrl, options);
      return {
        id: template.id,
        renderedHtml
      };
    } catch (error) {
      return {
        id: template.id,
        renderedHtml: template.html, // Return original on error
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}
