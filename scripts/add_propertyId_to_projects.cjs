const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';
const COLLECTION_ID = 'projects';

async function addPropertyIdAttribute() {
  try {
    console.log('Adding propertyId attribute to projects collection...');

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'propertyId',
      36, // UUID length
      false // not required initially (for migration)
    );

    console.log('✓ propertyId attribute created');
    console.log('\n✅ Successfully added propertyId to projects collection!');
    console.log('Note: The attribute may take a few moments to become available.');
  } catch (error) {
    console.error('Error adding propertyId attribute:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

addPropertyIdAttribute();
