const sdk = require('node-appwrite');
require('dotenv').config();

async function testCreate() {
  const client = new sdk.Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const DATABASE_ID = 'estately-main';

  try {
    console.log('Attempting to create test property...\n');

    const result = await databases.createDocument(
      DATABASE_ID,
      'properties',
      sdk.ID.unique(),
      {
        description: JSON.stringify([{ type: 'propertydesc', content: 'Test property' }]),
        location: JSON.stringify({ street: 'Test', city: 'Amsterdam' }),
        size: JSON.stringify({ lotSize: 100, floorSize: 80 }),
        media: JSON.stringify({ images: [] }),
        rooms: JSON.stringify({ bedrooms: 2, bathrooms: 1 }),
        specs: JSON.stringify([])
      }
    );

    console.log('✅ Success! Property created:', result.$id);

    // Clean up
    await databases.deleteDocument(DATABASE_ID, 'properties', result.$id);
    console.log('🗑️  Test property deleted');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTrying with string types...\n');

    try {
      const result = await databases.createDocument(
        DATABASE_ID,
        'properties',
        sdk.ID.unique(),
        {
          description: 'Test description',
          location: 'Test location',
          size: 'Test size',
          media: 'Test media',
          rooms: 'Test rooms',
          specs: 'Test specs'
        }
      );
      console.log('✅ Success with string types! Property:', result.$id);
      await databases.deleteDocument(DATABASE_ID, 'properties', result.$id);
    } catch (e) {
      console.error('❌ Also failed:', e.message);
    }
  }
}

testCreate();
