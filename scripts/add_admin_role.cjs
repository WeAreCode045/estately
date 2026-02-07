#!/usr/bin/env node
/**
 * Script to add 'admin' to the role enum in profiles collection
 *
 * NOTE: Appwrite doesn't support updating enum values directly.
 * You have two options:
 * 1. Delete and recreate the attribute (DESTRUCTIVE - loses data)
 * 2. Manually update via Appwrite Console
 *
 * This script will guide you through the manual process.
 */

const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'http://localhost/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT || '')
  .setKey(process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY || '');

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-db';

async function main() {
  console.log('\n🔧 Admin Role Schema Update');
  console.log('=' .repeat(50));

  try {
    // Check current schema
    const collection = await databases.getCollection(DATABASE_ID, 'profiles');
    const roleAttr = collection.attributes.find(attr => attr.key === 'role');

    if (roleAttr) {
      console.log('\n📋 Current role attribute:');
      console.log(`   Type: ${roleAttr.type}`);
      console.log(`   Values: ${JSON.stringify(roleAttr.elements || [])}`);

      if (roleAttr.elements && roleAttr.elements.includes('admin')) {
        console.log('\n✅ Schema already includes "admin" role!');
        console.log('   No changes needed.');
        return;
      }

      console.log('\n⚠️  The role enum does NOT include "admin"');
      console.log('   Current values:', roleAttr.elements);
      console.log('   Should include: [\'admin\', \'agent\', \'buyer\', \'seller\']');

      console.log('\n📝 To fix this issue:');
      console.log('   1. Open Appwrite Console: ' + process.env.VITE_APPWRITE_ENDPOINT);
      console.log('   2. Navigate to: Databases > estately-db > profiles > Attributes');
      console.log('   3. Find the "role" attribute');
      console.log('   4. Delete the "role" attribute (backup your data first!)');
      console.log('   5. Create a new enum attribute named "role" with values:');
      console.log('      [\'admin\', \'agent\', \'buyer\', \'seller\']');
      console.log('   6. Set it as required');
      console.log('   7. Run this script again to verify\n');

      console.log('\n⚠️  WARNING: Deleting the attribute will cause errors until recreated!');
      console.log('   Make sure to recreate it immediately after deletion.\n');

    } else {
      console.log('\n❌ Could not find "role" attribute in profiles collection');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 404) {
      console.log('\n💡 Make sure:');
      console.log('   - VITE_APPWRITE_ENDPOINT is correct');
      console.log('   - VITE_APPWRITE_PROJECT is correct');
      console.log('   - APPWRITE_API_KEY or VITE_APPWRITE_API_KEY is set');
      console.log('   - Database ID is correct (currently: ' + DATABASE_ID + ')');
    }
  }
}

main().catch(console.error);
