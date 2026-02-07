/**
 * Environment variable utilities for Vite
 */

interface ImportMetaEnv {
  readonly VITE_S3_BASE_URL?: string;
  readonly VITE_AWS_S3_BUCKET?: string;
  readonly VITE_AWS_S3_REGION?: string;
  readonly VITE_APPWRITE_ENDPOINT?: string;
  readonly VITE_APPWRITE_PROJECT_ID?: string;
  readonly VITE_APPWRITE_DATABASE_ID?: string;
  readonly VITE_GOOGLE_API_KEY?: string;
  readonly DEV?: boolean;
  readonly PROD?: boolean;
}

// Define minimal AppwriteDocument interface if not imported
interface AppwriteDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface ContractTemplate extends AppwriteDocument {
  title: string;
  content: string; // De ruwe tekst met placeholders
  category: 'residential' | 'commercial' | 'rental';
  required_roles: string; // JSON Array: string[]
  schema?: string;        // JSON Object voor custom input velden
  created_by: string;    // Link naar Profile ID (Agent/Admin)
}

// Declare process for Node environment
declare const process: { env: Record<string, string | undefined> } | undefined;

export function getEnv(key: keyof ImportMetaEnv, defaultValue: string = ''): string {
  // Check if we're in a Vite environment
  if (typeof window !== 'undefined' && (window as Record<string, unknown>).import) {
    const importObj = (window as Record<string, unknown>).import as Record<string, unknown>;
    const metaObj = importObj?.meta as Record<string, unknown> | undefined;
    const envObj = metaObj?.env as Record<string, string> | undefined;
    if (envObj) {
      return (envObj[key] as string) || defaultValue;
    }
  }
  // Fallback to process.env for Node environments
  if (typeof process !== 'undefined' && process?.env) {
    return (process.env[key] as string) || defaultValue;
  }
  return defaultValue;
}

export function isDev(): boolean {
  // Check if we're in a Vite environment
  if (typeof window !== 'undefined' && (window as Record<string, unknown>).import) {
    const importObj = (window as Record<string, unknown>).import as Record<string, unknown>;
    const metaObj = importObj?.meta as Record<string, unknown> | undefined;
    const envObj = metaObj?.env as Record<string, boolean | undefined> | undefined;
    if (envObj) {
      return envObj.DEV === true;
    }
  }
  // Fallback to NODE_ENV for Node environments
  if (typeof process !== 'undefined' && process?.env) {
    return process.env.NODE_ENV === 'development';
  }
  return false;
}

/**
 * Construct S3 URL from bucket, region and path
 */
export function getS3Url(path: string): string {
  const bucket = getEnv('VITE_AWS_S3_BUCKET', 'code045-estately');
  const region = getEnv('VITE_AWS_S3_REGION', 'eu-central-1');

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Use standard S3 URL format: https://{bucket}.s3.{region}.amazonaws.com/{path}
  return `https://${bucket}.s3.${region}.amazonaws.com/${cleanPath}`;
}

export const env = {
  s3BaseUrl: getEnv('VITE_S3_BASE_URL', 'https://s3.eu-central-1.amazonaws.com/your-bucket'),
  s3Bucket: getEnv('VITE_AWS_S3_BUCKET', 'code045-estately'),
  s3Region: getEnv('VITE_AWS_S3_REGION', 'eu-central-1'),
  appwriteEndpoint: getEnv('VITE_APPWRITE_ENDPOINT', 'https://fra.cloud.appwrite.io/v1'),
  appwriteProjectId: getEnv('VITE_APPWRITE_PROJECT_ID', '6985280e001b83954ee0'),
  appwriteDatabaseId: getEnv('VITE_APPWRITE_DATABASE_ID', 'estately-main'),
  googleApiKey: getEnv('VITE_GOOGLE_API_KEY', ''),
  isDev: isDev(),
  getS3Url
};
