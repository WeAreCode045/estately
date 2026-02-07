const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';

async function inspectTasksCollection() {
  console.log('🔍 Inspecting tasks collection structure...\n');

  try {
    const collection = await databases.getCollection(DATABASE_ID, 'tasks');

    console.log(`Collection: ${collection.name} (${collection.$id})`);
    console.log(`Total attributes: ${collection.attributes.length}\n`);

    console.log('Attributes:');
    collection.attributes.forEach(attr => {
      const required = attr.required ? '✓ required' : '○ optional';
      const type = attr.type;
      const size = attr.size ? `(size: ${attr.size})` : '';
      const elements = attr.elements ? `[${attr.elements.join(', ')}]` : '';
      const def = attr.default !== undefined ? `(default: "${attr.default}")` : '';

      console.log(`  • ${attr.key}`);
      console.log(`    Type: ${type} ${elements} ${size} ${def}`);
      console.log(`    ${required}`);
    });

    console.log('\n✅ Inspection complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

inspectTasksCollection();
