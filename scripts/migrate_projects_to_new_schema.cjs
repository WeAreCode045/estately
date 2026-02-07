const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Migrate existing projects to new JSON-based property schema
 *
 * This script:
 * 1. Finds all projects with legacy property structure (address, bedrooms, etc. directly in project)
 * 2. Creates a new property document with JSON fields for each
 * 3. Links the project to the new property via property_id
 * 4. Preserves all existing data
 */
async function migrateExistingProjects() {
  console.log('🔄 Starting project migration to JSON-based property schema...\n');

  try {
    // Fetch all projects
    console.log('📋 Fetching all projects...');
    const projectsRes = await databases.listDocuments(DATABASE_ID, 'projects');
    const projects = projectsRes.documents;
    console.log(`   Found ${projects.length} projects\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      const projectData = project;

      // Skip if already has property_id (already migrated)
      if (projectData.property_id) {
        console.log(`⏭️  Skipping "${projectData.title}" - already has property_id`);
        skippedCount++;
        continue;
      }

      // Skip if no legacy property data
      if (!projectData.address && !projectData.bedrooms && !projectData.description) {
        console.log(`⏭️  Skipping "${projectData.title}" - no property data to migrate`);
        skippedCount++;
        continue;
      }

      console.log(`\n🏠 Migrating project: ${projectData.title}`);
      console.log(`   ID: ${projectData.$id}`);

      try {
        // Parse address into components (basic parsing)
        const fullAddress = projectData.address || '';
        const addressParts = fullAddress.split(',').map(s => s.trim());
        const [streetPart = '', postalPart = '', cityPart = ''] = addressParts;
        const [street = '', streetNumber = ''] = streetPart.split(/\s+(\d+)/).filter(Boolean);

        // Create property document with JSON fields
        const descriptions = [];
        if (projectData.description) {
          descriptions.push({ type: 'propertydesc', content: projectData.description });
        }

        const propertyPayload = {
          description: JSON.stringify(descriptions),
          location: JSON.stringify({
            street: street || fullAddress,
            streetNumber: streetNumber || '',
            postalCode: postalPart.replace(/\s+/g, ''),
            city: cityPart || '',
            country: 'Netherlands',
            lat: 0,
            lng: 0
          }),
          size: JSON.stringify({
            lotSize: projectData.sqft || 0,
            floorSize: projectData.livingArea || 0
          }),
          media: JSON.stringify({
          images: projectData.images || (projectData.coverImageId ? [projectData.coverImageId] : []),
            floorplans: [],
            videoUrl: null,
            virtualTourUrl: null
          }),
          rooms: JSON.stringify({
            bedrooms: projectData.bedrooms || 0,
            bathrooms: projectData.bathrooms || 0,
            garages: projectData.garages || 0,
            buildYear: projectData.buildYear || null
          }),
          specs: JSON.stringify([]),
          neighbourhood: JSON.stringify({
            description: '',
            nearbyPlaces: []
          })
        };

        console.log('   📝 Creating property document...');
        const propertyDoc = await databases.createDocument(
          DATABASE_ID,
          'properties',
          sdk.ID.unique(),
          propertyPayload
        );
        console.log(`   ✓ Property created: ${propertyDoc.$id}`);

        await sleep(300);

        // Update project with property_id reference
        console.log('   🔗 Linking project to property...');
        await databases.updateDocument(
          DATABASE_ID,
          'projects',
          projectData.$id,
          { property_id: propertyDoc.$id }
        );
        console.log('   ✓ Project updated with property_id');

        migratedCount++;
        console.log(`   ✅ Migration complete for "${projectData.title}"`);

      } catch (error) {
        console.error(`   ❌ Error migrating "${projectData.title}":`, error.message);
        errorCount++;
      }

      await sleep(500); // Rate limiting
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Migrated: ${migratedCount} projects`);
    console.log(`⏭️  Skipped: ${skippedCount} projects (already migrated or no data)`);
    console.log(`❌ Errors: ${errorCount} projects`);
    console.log('='.repeat(60));

    if (migratedCount > 0) {
      console.log('\n✨ Migration successful!');
      console.log('\nNext steps:');
      console.log('1. Test property display in ProjectDetail');
      console.log('2. Verify property brochures generate correctly');
      console.log('3. Consider archiving legacy project fields once confirmed working');
    } else {
      console.log('\n✓ No projects needed migration.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateExistingProjects();
