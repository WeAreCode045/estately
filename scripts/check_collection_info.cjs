const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = 'estately-main';

async function getInfo() {
  try {
    const collection = await databases.getCollection(DATABASE_ID, 'properties');

    console.log('\n📁 Properties Collection\n');
    console.log('ID:', collection.$id);
    console.log('Attributes:', collection.attributes.length);
    console.log('\nAttribute Details:\n');

    collection.attributes.forEach(attr => {
      console.log(`${attr.key}:`);
      console.log(`  Type: ${attr.type}`);
      console.log(`  Array: ${attr.array || false}`);
      console.log(`  Required: ${attr.required}`);
      if (attr.size) console.log(`  Size: ${attr.size}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

getInfo();
