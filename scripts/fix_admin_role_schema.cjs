#!/usr/bin/env node
/**
 * Script to update profiles.role attribute to support 'admin' value
 *
 * This script will:
 * 1. Check if 'admin' is already in the role enum
 * 2. If not, delete the old role attribute
 * 3. Create a new role enum attribute with all 4 values
 *
 * IMPORTANT: This will temporarily break the application until complete!
 * Make sure to run during maintenance window.
 */

const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https:/fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT || '')
  .setKey(process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY || '');

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🔧 Updating profiles.role attribute');
  console.log('=' .repeat(50));

  try {
    // Step 1: Check current schema
    console.log('\n📋 Checking current schema...');
    const collection = await databases.getCollection(DATABASE_ID, 'profiles');
    const roleAttr = collection.attributes.find(attr => attr.key === 'role');

    if (!roleAttr) {
      console.log('\n❌ Role attribute not found!');
      console.log('   Creating it from scratch...\n');
    } else {
      console.log(`   Type: ${roleAttr.type}`);
      console.log(`   Elements: ${JSON.stringify(roleAttr.elements || 'N/A')}`);

      if (roleAttr.elements && roleAttr.elements.includes('admin')) {
        console.log('\n✅ Schema already includes "admin" role!');
        console.log('   No changes needed.');
        return;
      }
    }

    // Step 2: Confirm deletion
    console.log('\n⚠️  WARNING: This will delete and recreate the role attribute!');
    console.log('   Current profiles will keep their role values if they match the new enum.');
    console.log('   Profiles with invalid role values will cause errors!\n');

    // In a script, we'll just proceed (for CLI use, add prompt here)
    console.log('💡 To run this safely:');
    console.log('   1. Backup your database first');
    console.log('   2. Ensure no users are currently logging in');
    console.log('   3. The app will be unavailable during this update\n');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question('Do you want to proceed? (type "yes" to continue): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Aborted by user');
      return;
    }

    // Step 3: Delete old attribute if it exists
    if (roleAttr) {
      console.log('\n🗑️  Deleting old role attribute...');
      try {
        await databases.deleteAttribute(DATABASE_ID, 'profiles', 'role');
        console.log('   ✓ Deleted');
        await sleep(2000); // Wait for deletion to propagate
      } catch (error) {
        console.error('   ❌ Error deleting:', error.message);
        throw error;
      }
    }

    // Step 4: Create new enum attribute
    console.log('\n➕ Creating new role enum attribute...');
    try {
      await databases.createEnumAttribute(
        DATABASE_ID,
        'profiles',
        'role',
        ['admin', 'agent', 'buyer', 'seller'],
        true // required
      );
      console.log('   ✓ Created with values: admin, agent, buyer, seller');
      await sleep(2000);
    } catch (error) {
      console.error('   ❌ Error creating:', error.message);
      console.log('\n💡 You may need to manually create the attribute via Appwrite Console');
      throw error;
    }

    // Step 5: Verify
    console.log('\n✅ Verifying new schema...');
    await sleep(1000);
    const updatedCollection = await databases.getCollection(DATABASE_ID, 'profiles');
    const newRoleAttr = updatedCollection.attributes.find(attr => attr.key === 'role');

    if (newRoleAttr && newRoleAttr.elements) {
      console.log('   ✓ Role attribute updated successfully!');
      console.log('   ✓ Supported values:', newRoleAttr.elements.join(', '));
      console.log('\n🎉 Update complete! The admin menu should now work correctly.\n');
    } else {
      console.log('   ⚠️  Could not verify the update. Please check Appwrite Console.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Manual steps to fix:');
    console.log('   1. Open Appwrite Console:', process.env.VITE_APPWRITE_ENDPOINT?.replace('/v1', ''));
    console.log('   2. Go to: Databases > estately-main > profiles > Attributes');
    console.log('   3. Delete "role" attribute');
    console.log('   4. Create new enum attribute:');
    console.log('      - Key: role');
    console.log('      - Elements: admin, agent, buyer, seller');
    console.log('      - Required: Yes');
    console.log('      - Array: No\n');
  }
}

main().catch(console.error);
