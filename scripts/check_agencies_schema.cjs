/**
 * Check the schema of both agency and agencies collections
 */

const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';

async function checkSchema() {
  try {
    console.log('Checking "agency" collection...');
    const agencyDocs = await databases.listDocuments(DATABASE_ID, 'agency');
    if (agencyDocs.documents.length > 0) {
      console.log('\nAgency collection document structure:');
      const doc = agencyDocs.documents[0];
      console.log('Keys:', Object.keys(doc).filter(k => !k.startsWith('$')));
      console.log('\nFull document:', JSON.stringify(doc, null, 2));
    }

    console.log('\n\nChecking "agencies" collection...');
    const agenciesDocs = await databases.listDocuments(DATABASE_ID, 'agencies');
    if (agenciesDocs.documents.length > 0) {
      console.log('\nAgencies collection document structure:');
      const doc = agenciesDocs.documents[0];
      console.log('Keys:', Object.keys(doc).filter(k => !k.startsWith('$')));
      console.log('\nFull document:', JSON.stringify(doc, null, 2));
    } else {
      console.log('Agencies collection is empty');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
