const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';
const COLLECTION_ID = 'properties';

async function createPropertiesCollection() {
  try {
    console.log('Creating properties collection...');

    // Create collection
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

    console.log('✓ Collection created');

    // Size attributes
    await databases.createIntegerAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'lotSize',
      false, // not required
      0,
      999999,
      0
    );
    console.log('✓ lotSize attribute created');

    await databases.createIntegerAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'floorSize',
      false,
      0,
      999999,
      0
    );
    console.log('✓ floorSize attribute created');

    // Location attributes (as separate fields for better querying)
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'street',
      255,
      false
    );
    console.log('✓ street attribute created');

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'streetNumber',
      50,
      false
    );
    console.log('✓ streetNumber attribute created');

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'postalCode',
      20,
      false
    );
    console.log('✓ postalCode attribute created');

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'city',
      100,
      false
    );
    console.log('✓ city attribute created');

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'country',
      100,
      false,
      'Nederland'
    );
    console.log('✓ country attribute created');

    await databases.createFloatAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'latitude',
      false,
      -90,
      90
    );
    console.log('✓ latitude attribute created');

    await databases.createFloatAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'longitude',
      false,
      -180,
      180
    );
    console.log('✓ longitude attribute created');

    // Media - images array
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'images',
      1000,
      false,
      undefined,
      true // array
    );
    console.log('✓ images attribute created');

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'floorplans',
      1000,
      false,
      undefined,
      true // array
    );
    console.log('✓ floorplans attribute created');

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'videoUrl',
      500,
      false
    );
    console.log('✓ videoUrl attribute created');

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'virtualTourUrl',
      500,
      false
    );
    console.log('✓ virtualTourUrl attribute created');

    // Specs - array of specifications
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'specs',
      500,
      false,
      undefined,
      true // array
    );
    console.log('✓ specs attribute created');

    // Rooms
    await databases.createIntegerAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'bathrooms',
      false,
      0,
      50,
      0
    );
    console.log('✓ bathrooms attribute created');

    await databases.createIntegerAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'bedrooms',
      false,
      0,
      50,
      0
    );
    console.log('✓ bedrooms attribute created');

    await databases.createIntegerAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'garages',
      false,
      0,
      20,
      0
    );
    console.log('✓ garages attribute created');

    // Description
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'description',
      10000,
      false
    );
    console.log('✓ description attribute created');

    // Neighbourhood
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'neighbourhoodDescription',
      5000,
      false
    );
    console.log('✓ neighbourhoodDescription attribute created');

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'nearbyPlaces',
      1000,
      false,
      undefined,
      true // array
    );
    console.log('✓ nearbyPlaces attribute created');

    // Build year (useful for properties)
    await databases.createIntegerAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'buildYear',
      false,
      1800,
      2100,
      0
    );
    console.log('✓ buildYear attribute created');

    console.log('\n✅ Properties collection created successfully!');
    console.log('Note: Attributes may take a few moments to become available.');
  } catch (error) {
    console.error('Error creating properties collection:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

createPropertiesCollection();
