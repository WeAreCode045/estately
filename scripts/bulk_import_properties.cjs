const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.code045.nl/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Bulk Property Import Tool
 *
 * Imports multiple properties from a JSON file with the following structure:
 * [
 *   {
 *     "description": "Modern villa in Amsterdam",
 *     "street": "Keizersgracht",
 *     "streetNumber": "123",
 *     "postalCode": "1015AB",
 *     "city": "Amsterdam",
 *     "country": "Netherlands",
 *     "lotSize": 250,
 *     "floorSize": 180,
 *     "bedrooms": 4,
 *     "bathrooms": 2,
 *     "garages": 1,
 *     "buildYear": 1920,
 *     "specs": ["Tuin", "Balkon", "Garage"],
 *     "neighbourhood": "Quiet canal-side location"
 *   }
 * ]
 */
async function bulkImportProperties() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/bulk_import_properties.cjs <json-file-path>');
    console.log('\nExample JSON format:');
    console.log(JSON.stringify([
      {
        description: "Modern villa",
        street: "Keizersgracht",
        streetNumber: "123",
        postalCode: "1015AB",
        city: "Amsterdam",
        country: "Netherlands",
        lotSize: 250,
        floorSize: 180,
        bedrooms: 4,
        bathrooms: 2,
        garages: 1,
        buildYear: 1920,
        specs: ["Tuin", "Balkon"],
        neighbourhood: "Quiet area"
      }
    ], null, 2));
    process.exit(0);
  }

  const filePath = args[0];

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('📦 Bulk Property Import Tool\n');
  console.log(`Reading from: ${filePath}\n`);

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const properties = JSON.parse(fileContent);

    if (!Array.isArray(properties)) {
      console.error('❌ JSON file must contain an array of properties');
      process.exit(1);
    }

    console.log(`📋 Found ${properties.length} properties to import\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];
      const index = i + 1;

      try {
        console.log(`\n[${index}/${properties.length}] Importing property...`);
        console.log(`   📍 ${prop.street} ${prop.streetNumber}, ${prop.city}`);

        // Validate required fields
        if (!prop.street || !prop.city) {
          throw new Error('Missing required fields: street, city');
        }

        // Create property document with description array
        const descriptions = [];
        if (prop.description) {
          descriptions.push({ type: 'propertydesc', content: prop.description });
        }
        if (prop.neighbourhood) {
          descriptions.push({ type: 'neighbourhooddesc', content: prop.neighbourhood });
        }

        const payload = {
          description: JSON.stringify(descriptions),
          location: JSON.stringify({
            street: prop.street,
            streetNumber: prop.streetNumber || '',
            postalCode: prop.postalCode || '',
            city: prop.city,
            country: prop.country || 'Netherlands',
            lat: prop.lat || 0,
            lng: prop.lng || 0
          }),
          size: JSON.stringify({
            lotSize: prop.lotSize || 0,
            floorSize: prop.floorSize || 0
          }),
          media: JSON.stringify({
            images: prop.images || [],
            floorplans: prop.floorplans || [],
            videoUrl: prop.videoUrl || null,
            virtualTourUrl: prop.virtualTourUrl || null
          }),
          rooms: JSON.stringify({
            bedrooms: prop.bedrooms || 0,
            bathrooms: prop.bathrooms || 0,
            garages: prop.garages || 0,
            buildYear: prop.buildYear || null
          }),
          specs: JSON.stringify([
            ...(prop.specs || []),
            ...(prop.nearbyPlaces || [])
          ])
        };

        const created = await databases.createDocument(
          DATABASE_ID,
          'properties',
          sdk.ID.unique(),
          payload
        );

        console.log(`   ✅ Property created: ${created.$id}`);
        successCount++;

        await sleep(300); // Rate limiting

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errors.push({ index, property: prop, error: error.message });
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${successCount} properties`);
    console.log(`❌ Failed: ${errorCount} properties`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(({ index, property, error }) => {
        console.log(`\n[${index}] ${property.street} ${property.streetNumber}, ${property.city}`);
        console.log(`    Error: ${error}`);
      });
    }

    if (successCount > 0) {
      console.log('\n✨ Import complete!');
      console.log('\nNext steps:');
      console.log('1. Verify imported properties in Appwrite console');
      console.log('2. Create projects linked to these properties');
      console.log('3. Test property display and brochure generation');
    }

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  bulkImportProperties();
}

module.exports = { bulkImportProperties };
