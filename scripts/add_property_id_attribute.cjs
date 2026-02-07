#!/usr/bin/env node

/**
 * Add property_id attribute to projects collection
 *
 * This script adds the property_id attribute if it doesn't exist yet.
 * Run this before migrating property data.
 */

const { Client, Databases } = require('node-appwrite');

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';
const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || '6985280e001b83954ee0';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

// Use API key for server-side operations (must have database.write permissions)
if (process.env.APPWRITE_API_KEY) {
  client.setKey(process.env.APPWRITE_API_KEY);
} else {
  console.error('❌ APPWRITE_API_KEY environment variable is required');
  console.log('   Set it in your shell or .env file');
  process.exit(1);
}

const databases = new Databases(client);

async function addPropertyIdAttribute() {
  try {
    console.log('🔧 Configuration:');
    console.log('   Endpoint:', ENDPOINT);
    console.log('   Project ID:', PROJECT_ID);
    console.log('   Database ID:', DATABASE_ID);
    console.log('');

    console.log('🔍 Checking if property_id attribute exists...\n');

    // Try to get the collection to check attributes
    try {
      const collection = await databases.getCollection(DATABASE_ID, 'projects');
      const hasPropertyId = collection.attributes.some(attr => attr.key === 'property_id');

      if (hasPropertyId) {
        console.log('✓ property_id attribute already exists!');
        console.log('   You can now run the migration script.\n');
        return;
      }
    } catch (e) {
      console.error('❌ Could not fetch collection details:', e.message);
      console.log('   Attempting to create attribute anyway...\n');
    }

    console.log('➕ Creating property_id attribute...');
    console.log('   Type: string (36 characters)');
    console.log('   Required: false (optional)');
    console.log('   This allows existing projects to not have property_id initially.\n');

    await databases.createStringAttribute(
      DATABASE_ID,
      'projects',
      'property_id',
      36,
      false  // NOT required - allows gradual migration
    );

    console.log('✓ property_id attribute created successfully!');
    console.log('\n⏳ Waiting 2 seconds for attribute to become available...\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ Setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Go to /settings in your app');
    console.log('   2. Scroll to "Data Migration Utilities"');
    console.log('   3. Click "Migrate First Project" to test');
    console.log('   4. Check browser console for detailed logs');
    console.log('   5. Use "Migrate All" for bulk migration\n');

  } catch (error) {
    console.error('❌ Failed to create attribute:', error.message);

    if (error.code === 409) {
      console.log('\n💡 Attribute might already exist. Try running the migration anyway.');
    } else if (error.code === 401) {
      console.log('\n❌ Authentication failed. Make sure:');
      console.log('   1. APPWRITE_API_KEY is set correctly');
      console.log('   2. The API key has database.write permissions');
    } else {
      console.log('\n📋 Error details:', error.response || error);
    }

    process.exit(1);
  }
}

// Run
addPropertyIdAttribute();
