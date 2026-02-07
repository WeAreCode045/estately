const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';
const PROPERTIES_COLLECTION_ID = 'properties';

async function checkPropertiesCollection() {
  try {
    console.log('Checking properties collection attributes...\n');

    const collection = await databases.getCollection(DATABASE_ID, PROPERTIES_COLLECTION_ID);

    console.log('Collection ID:', collection.$id);
    console.log('Collection Name:', collection.name);
    console.log('\nAttributes:');

    collection.attributes.forEach(attr => {
      console.log(`  - ${attr.key} (${attr.type})${attr.required ? ' [required]' : ''} - Size: ${attr.size || 'N/A'}`);
    });

    console.log('\n✅ Properties collection exists');

    // Check for specific attributes
    const requiredJsonFields = ['location', 'size', 'media', 'rooms', 'specs', 'neighbourhood'];
    const missingAttributes = [];

    console.log('\nChecking required JSON fields:');
    requiredJsonFields.forEach(field => {
      const exists = collection.attributes.find(attr => attr.key === field);
      if (exists) {
        console.log(`  ✅ ${field} exists (size: ${exists.size})`);
      } else {
        console.log(`  ❌ ${field} MISSING`);
        missingAttributes.push(field);
      }
    });

    if (missingAttributes.length > 0) {
      console.log('\n⚠️  Missing attributes:', missingAttributes.join(', '));
      console.log('\nRun create_json_schema.cjs to create missing attributes.');
    } else {
      console.log('\n✅ All required attributes exist!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 404) {
      console.log('\n⚠️  Properties collection does not exist. Run create_json_schema.cjs to create it.');
    }
  }
}

checkPropertiesCollection();
