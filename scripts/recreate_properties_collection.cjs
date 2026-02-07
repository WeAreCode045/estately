const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = 'estately-main';
const COLLECTION_ID = 'properties';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function recreatePropertiesCollection() {
  console.log('🔧 Recreating Properties Collection\n');

  try {
    // Step 1: Check if collection exists
    console.log('1️⃣  Checking existing collection...');
    try {
      const existing = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
      console.log(`   Found collection: ${existing.name}`);
      console.log(`   Attributes: ${existing.attributes.length}`);

      // Step 2: Delete existing collection
      console.log('\n2️⃣  Deleting existing collection...');
      await databases.deleteCollection(DATABASE_ID, COLLECTION_ID);
      console.log('   ✅ Collection deleted');
      await sleep(2000);
    } catch (error) {
      if (error.code === 404) {
        console.log('   Collection does not exist, will create fresh');
      } else {
        throw error;
      }
    }

    // Step 3: Create new collection
    console.log('\n3️⃣  Creating new properties collection...');
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_ID,
      'Properties',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('   ✅ Collection created');
    await sleep(1000);

    // Step 4: Create attributes (all as STRING, not array)
    console.log('\n4️⃣  Creating attributes...\n');

    // description (JSON array of PropertyDescription objects)
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'description', 5000, false);
    console.log('   ✅ description (string, 5000)');
    await sleep(1000);

    // location (JSON)
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'location', 2000, false);
    console.log('   ✅ location (string, 2000)');
    await sleep(1000);

    // size (JSON)
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'size', 1000, false);
    console.log('   ✅ size (string, 1000)');
    await sleep(1000);

    // media (JSON)
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'media', 5000, false);
    console.log('   ✅ media (string, 5000)');
    await sleep(1000);

    // rooms (JSON)
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'rooms', 1000, false);
    console.log('   ✅ rooms (string, 1000)');
    await sleep(1000);

    // specs (JSON)
    await databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'specs', 2000, false);
    console.log('   ✅ specs (string, 2000)');

    console.log('\n✨ Properties collection successfully recreated!\n');
    console.log('Schema:');
    console.log('  - description: string (5000) - JSON array of {type, content}');
    console.log('  - location: string (2000) - JSON object');
    console.log('  - size: string (1000) - JSON object');
    console.log('  - media: string (5000) - JSON object');
    console.log('  - rooms: string (1000) - JSON object');
    console.log('  - specs: string (2000) - JSON array');
    console.log('\nReady to import properties!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

recreatePropertiesCollection();
