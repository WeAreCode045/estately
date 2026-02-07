#!/usr/bin/env node

/**
 * Migration Script: Move Property Data from Project to Property Collection
 *
 * This script:
 * 1. Fetches the first project from the projects collection
 * 2. Extracts property-related fields
 * 3. Creates a new property record in the properties collection
 * 4. Updates the project to reference the new property via property_id
 */

const { Client, Databases, ID } = require('node-appwrite');

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';
const COLLECTIONS = {
  PROJECTS: 'projects',
  PROPERTIES: 'properties'
};

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || '6985280e001b83954ee0';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

// Use API key for server-side operations
if (process.env.APPWRITE_API_KEY) {
  client.setKey(process.env.APPWRITE_API_KEY);
}

console.log('🔧 Configuration:');
console.log('   Endpoint:', ENDPOINT);
console.log('   Project ID:', PROJECT_ID);
console.log('   Database ID:', DATABASE_ID);
console.log('');

const databases = new Databases(client);

/**
 * Map legacy project fields to Property collection structure
 */
function mapProjectToProperty(project) {
  // Extract location data
  const location = {
    street: project.address || '',
    streetNumber: '',
    postalCode: '',
    city: '',
    country: ''
  };

  // Try to parse address if it's a string
  if (project.address && typeof project.address === 'string') {
    // Simple address parsing (can be improved)
    const addressParts = project.address.split(',').map(p => p.trim());
    if (addressParts.length >= 1) location.street = addressParts[0];
    if (addressParts.length >= 2) location.city = addressParts[1];
    if (addressParts.length >= 3) location.country = addressParts[2];
  }

  // Extract size data
  const size = {
    lotSize: project.sqft || project.plotSize || 0,
    floorSize: project.livingArea || project.floorArea || 0
  };

  // Extract media data
  const media = {
    images: project.media || project.images || [],
    floorplans: [],
    videoUrl: '',
    virtualTourUrl: ''
  };

  // Extract rooms data
  const rooms = {
    bedrooms: project.bedrooms || 0,
    bathrooms: project.bathrooms || 0,
    garages: project.garages || 0,
    buildYear: project.buildYear || project.build_year || null
  };

  // Extract description
  const descriptions = [];
  if (project.description) {
    descriptions.push({
      type: 'propertydesc',
      content: project.description
    });
  }

  // Extract specs (features)
  const specs = [];
  if (project.features) {
    if (Array.isArray(project.features)) {
      specs.push(...project.features);
    } else if (typeof project.features === 'string') {
      try {
        const parsed = JSON.parse(project.features);
        if (Array.isArray(parsed)) specs.push(...parsed);
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  return {
    description: JSON.stringify(descriptions),
    location: JSON.stringify(location),
    size: JSON.stringify(size),
    media: JSON.stringify(media),
    rooms: JSON.stringify(rooms),
    specs: JSON.stringify(specs)
  };
}

async function migrateFirstProject() {
  try {
    console.log('🔍 Fetching first project from projects collection...\n');

    // Fetch the first project
    const projectsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      []
    );

    if (projectsResponse.documents.length === 0) {
      console.log('❌ No projects found in the collection.');
      return;
    }

    const project = projectsResponse.documents[0];
    console.log(`📋 Found project: ${project.title || project.$id}`);
    console.log(`   Project ID: ${project.$id}`);
    console.log(`   Property ID: ${project.property_id || 'not set'}\n`);

    // Check if project already has a property_id
    if (project.property_id) {
      console.log('⚠️  Project already has a property_id. Checking if property exists...');

      try {
        const existingProperty = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROPERTIES,
          project.property_id
        );
        console.log(`✓ Property ${project.property_id} exists.`);
        console.log('\n📊 Current property data:');
        console.log(JSON.stringify(existingProperty, null, 2));
        return;
      } catch (e) {
        console.log(`⚠️  Property ${project.property_id} not found. Creating new one...`);
      }
    }

    // Display current project data
    console.log('📊 Current project data:');
    console.log('   Address:', project.address || 'N/A');
    console.log('   Price:', project.price || 'N/A');
    console.log('   Living Area:', project.livingArea || 'N/A');
    console.log('   Plot Size:', project.sqft || 'N/A');
    console.log('   Bedrooms:', project.bedrooms || 'N/A');
    console.log('   Bathrooms:', project.bathrooms || 'N/A');
    console.log('   Garages:', project.garages || 'N/A');
    console.log('   Build Year:', project.buildYear || 'N/A');
    console.log('   Description:', project.description ? `${project.description.substring(0, 50)}...` : 'N/A');
    console.log('   Media:', (project.media || []).length, 'items\n');

    // Map project data to property structure
    console.log('🔄 Mapping project data to property structure...\n');
    const propertyData = mapProjectToProperty(project);

    console.log('📦 Property data to be created:');
    console.log(JSON.stringify(JSON.parse(propertyData.location), null, 2));
    console.log('Size:', JSON.parse(propertyData.size));
    console.log('Rooms:', JSON.parse(propertyData.rooms));
    console.log('Media images:', JSON.parse(propertyData.media).images?.length || 0);
    console.log('Descriptions:', JSON.parse(propertyData.description).length, 'items\n');

    // Create property in properties collection
    console.log('✨ Creating property in properties collection...\n');
    const newProperty = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROPERTIES,
      ID.unique(),
      propertyData
    );

    console.log(`✓ Property created with ID: ${newProperty.$id}\n`);

    // Update project to reference the new property
    console.log('🔗 Updating project to reference new property...\n');
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      project.$id,
      {
        property_id: newProperty.$id
      }
    );

    console.log('✓ Project updated successfully!\n');
    console.log('✅ Migration completed successfully!');
    console.log(`\n📝 Summary:`);
    console.log(`   Project ID: ${project.$id}`);
    console.log(`   New Property ID: ${newProperty.$id}`);
    console.log(`   Project now references the property via property_id\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Run migration
migrateFirstProject();
