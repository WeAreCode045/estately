const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';

async function testPropertyService() {
  console.log('🧪 Testing Property Service with JSON Schema...\n');

  const testProperty = {
    description: 'Prachtige moderne villa in het hart van Amsterdam',
    location: JSON.stringify({
      street: 'Keizersgracht',
      streetNumber: '123',
      postalCode: '1015AB',
      city: 'Amsterdam',
      country: 'Netherlands',
      lat: 52.3676,
      lng: 4.9041
    }),
    size: JSON.stringify({
      lotSize: 250,
      floorSize: 180
    }),
    media: JSON.stringify({
      images: ['property1.jpg', 'property2.jpg'],
      floorplans: ['floorplan.pdf'],
      videoUrl: 'https://youtube.com/watch?v=example',
      virtualTourUrl: null
    }),
    rooms: JSON.stringify({
      bedrooms: 4,
      bathrooms: 2,
      garages: 1,
      buildYear: 1920
    }),
    specs: JSON.stringify(['Tuin', 'Balkon', 'Garage', 'Lift']),
    neighbourhood: JSON.stringify({
      description: 'Rustige buurt aan de gracht',
      nearbyPlaces: ['Albert Heijn (200m)', 'Dam Square (500m)']
    })
  };

  try {
    // Test: Create property
    console.log('📝 Creating test property...');
    const created = await databases.createDocument(
      DATABASE_ID,
      'properties',
      sdk.ID.unique(),
      testProperty
    );
    console.log(`✅ Property created: ${created.$id}`);

    // Test: Read property
    console.log('\n📖 Reading property...');
    const fetched = await databases.getDocument(
      DATABASE_ID,
      'properties',
      created.$id
    );
    console.log(`✅ Property fetched: ${fetched.description.substring(0, 30)}...`);

    // Test: Parse JSON fields
    console.log('\n🔍 Parsing JSON fields...');
    const location = JSON.parse(fetched.location);
    const size = JSON.parse(fetched.size);
    const media = JSON.parse(fetched.media);
    const rooms = JSON.parse(fetched.rooms);
    const specs = JSON.parse(fetched.specs);
    const neighbourhood = JSON.parse(fetched.neighbourhood);

    console.log(`   📍 Location: ${location.street} ${location.streetNumber}, ${location.city}`);
    console.log(`   📏 Size: ${size.floorSize}m² (lot: ${size.lotSize}m²)`);
    console.log(`   🖼️  Media: ${media.images.length} images, ${media.floorplans.length} floorplans`);
    console.log(`   🛏️  Rooms: ${rooms.bedrooms} bedrooms, ${rooms.bathrooms} bathrooms`);
    console.log(`   ✨ Specs: ${specs.length} amenities`);
    console.log(`   🏘️  Neighbourhood: ${neighbourhood.nearbyPlaces.length} nearby places`);

    // Test: Update property
    console.log('\n✏️  Updating property...');
    await databases.updateDocument(
      DATABASE_ID,
      'properties',
      created.$id,
      { description: 'Updated: ' + testProperty.description }
    );
    console.log('✅ Property updated');

    // Test: Delete property
    console.log('\n🗑️  Deleting test property...');
    await databases.deleteDocument(
      DATABASE_ID,
      'properties',
      created.$id
    );
    console.log('✅ Property deleted');

    console.log('\n✅ All tests passed! Property service is working correctly.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPropertyService();
