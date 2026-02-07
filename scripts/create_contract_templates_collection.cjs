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
 * Create Contract Templates Collection
 */
async function createContractTemplatesCollection() {
  console.log('\n📁 Creating contract_templates collection...');

  try {
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      'contract_templates',
      'Contract Templates',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('✓ Collection created');
    await sleep(500);

    // title (required)
    await databases.createStringAttribute(
      DATABASE_ID,
      'contract_templates',
      'title',
      255,
      true
    );
    console.log('✓ title attribute created');
    await sleep(500);

    // content (required, large for HTML/Markdown with placeholders)
    await databases.createStringAttribute(
      DATABASE_ID,
      'contract_templates',
      'content',
      65000,
      true
    );
    console.log('✓ content attribute created (Markdown/HTML with {{placeholders}})');
    await sleep(500);

    // category (enum)
    await databases.createEnumAttribute(
      DATABASE_ID,
      'contract_templates',
      'category',
      ['residential', 'commercial', 'rental'],
      false
    );
    console.log('✓ category (enum) attribute created');
    await sleep(500);

    // required_roles (JSON array - e.g., ["buyer", "seller"])
    await databases.createStringAttribute(
      DATABASE_ID,
      'contract_templates',
      'required_roles',
      1000,
      false
    );
    console.log('✓ required_roles (JSON) attribute created');
    await sleep(500);

    // schema (JSON - validation schema for placeholders)
    await databases.createStringAttribute(
      DATABASE_ID,
      'contract_templates',
      'schema',
      5000,
      false
    );
    console.log('✓ schema (JSON) attribute created');
    await sleep(500);

    // created_by (relationship to profiles - manyToOne)
    await databases.createStringAttribute(
      DATABASE_ID,
      'contract_templates',
      'created_by',
      36,
      false
    );
    console.log('✓ created_by (relationship) attribute created');

    console.log('\n✅ contract_templates collection created successfully!');

  } catch (error) {
    console.error('❌ Error creating contract_templates:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Creating contract_templates collection...\n');
  console.log(`Database: ${DATABASE_ID}`);
  console.log('Collection: contract_templates\n');

  await createContractTemplatesCollection();

  console.log('\nNext steps:');
  console.log('1. Verify collection in Appwrite console');
  console.log('2. Update services/appwrite.ts COLLECTIONS constant');
  console.log('3. Create contractTemplateService.ts if needed');
  console.log('4. Add ContractTemplate interface to types.ts');
}

main();
