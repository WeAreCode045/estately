import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const REGION = process.env.VITE_AWS_S3_REGION || process.env.AWS_REGION || 'eu-central-1';
const BUCKET = process.env.VITE_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET;
const ACCESS_KEY = process.env.VITE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.VITE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

if (!BUCKET || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Missing AWS configuration. Please check your .env file.');
  process.exit(1);
}

const client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

const corsRules = [
  {
    AllowedHeaders: ['*'],
    AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
    AllowedOrigins: ['*', 'http://localhost:3000', 'http://localhost:5173'], // Allow all for flexibility, explicit locals for clarity
    ExposeHeaders: ['ETag'],
    MaxAgeSeconds: 3000,
  },
];

async function updateCors() {
  try {
    console.log(`Updating CORS configuration for bucket: ${BUCKET}...`);
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: corsRules,
      },
    });

    await client.send(command);
    console.log('Successfully updated CORS configuration.');
  } catch (err) {
    console.error('Error updating CORS configuration:', err);
    process.exit(1);
  }
}

updateCors();
