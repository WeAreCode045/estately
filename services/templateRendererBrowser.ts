import { env } from '../utils/env';

/**
 * Browser-compatible template renderer (client-side)
 * Uses native DOMParser instead of jsdom
 */

/**
 * Deep resolver for accessing nested object properties via dot notation
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
 * Browser-compatible renderer using native DOMParser
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderAppwriteContentBrowser(
  html: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataObject: any,
  options?: {
    fallbackImage?: string;
    hideOnMissing?: boolean;
    debug?: boolean;
    useDirectUrls?: boolean; // If true, resolved paths are already full URLs
  }
): string {
  const {
    fallbackImage = 'https://via.placeholder.com/400x300?text=Image+Not+Found',
    hideOnMissing = false,
    debug = false,
    useDirectUrls = false
  } = options || {};

  try {
    // Use native DOMParser in browser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find all elements with data-appwrite-src attribute
    const elementsWithDataSrc = doc.querySelectorAll('[data-appwrite-src]');

    if (debug) {
      // eslint-disable-next-line no-console
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
        if (useDirectUrls) {
          // Path is already a full URL (presigned)
          finalUrl = resolvedPath;
        } else {
          // Build S3 URL from path
          finalUrl = env.getS3Url(resolvedPath);
        }
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
    });

    // Return the serialized HTML
    // Use XMLSerializer for browser compatibility
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error rendering Appwrite content:', error);
    throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Example data object structure
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prepareAppwriteDataForRendering(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agency: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalData?: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      role: user?.role || '',
      ...user
    },
    profiles: {
      avatar: user?.avatar || null
    },
    ...additionalData
  };
}
