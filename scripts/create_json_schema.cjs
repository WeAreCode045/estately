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
 * 1. Create Agencies Collection
 */
async function createAgenciesCollection() {
  console.log('\n📁 Creating agencies collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      'agencies',
      'Agencies',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('✓ Collection created');
    await sleep(500);

    // name
    await databases.createStringAttribute(DATABASE_ID, 'agencies', 'name', 255, true);
    console.log('✓ name attribute created');
    await sleep(500);

    // address
    await databases.createStringAttribute(DATABASE_ID, 'agencies', 'address', 2000, false);
    console.log('✓ address attribute created');
    await sleep(500);

    // logo (file path)
    await databases.createStringAttribute(DATABASE_ID, 'agencies', 'logo', 2000, false);
    console.log('✓ logo attribute created');
    await sleep(500);

    // bankAccount
    await databases.createStringAttribute(DATABASE_ID, 'agencies', 'bankAccount', 100, false);
    console.log('✓ bankAccount attribute created');
    await sleep(500);

    // vatCode
    await databases.createStringAttribute(DATABASE_ID, 'agencies', 'vatCode', 50, false);
    console.log('✓ vatCode attribute created');
    await sleep(500);

    // agentIds (array)
    await databases.createStringAttribute(DATABASE_ID, 'agencies', 'agentIds', 255, false, null, true);
    console.log('✓ agentIds attribute created');
    await sleep(500);

    // brochure (large JSON string)
    await databases.createStringAttribute(DATABASE_ID, 'agencies', 'brochure', 1000000, false);
    console.log('✓ brochure attribute created');

  } catch (error) {
    console.error('❌ Error creating agencies:', error.message);
  }
}

/**
 * 2. Create Profiles Collection
 */
async function createProfilesCollection() {
  console.log('\n📁 Creating profiles collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      'profiles',
      'Profiles',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('✓ Collection created');
    await sleep(500);

    // first_name
    await databases.createStringAttribute(DATABASE_ID, 'profiles', 'first_name', 100, true);
    console.log('✓ first_name attribute created');
    await sleep(500);

    // last_name
    await databases.createStringAttribute(DATABASE_ID, 'profiles', 'last_name', 100, true);
    console.log('✓ last_name attribute created');
    await sleep(500);

    // email
    await databases.createEmailAttribute(DATABASE_ID, 'profiles', 'email', true);
    console.log('✓ email attribute created');
    await sleep(500);

    // role (enum)
    await databases.createEnumAttribute(
      DATABASE_ID,
      'profiles',
      'role',
      ['agent', 'buyer', 'seller'],
      true
    );
    console.log('✓ role (enum) attribute created');
    await sleep(500);

    // phone
    await databases.createStringAttribute(DATABASE_ID, 'profiles', 'phone', 50, false);
    console.log('✓ phone attribute created');
    await sleep(500);

    // address (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'profiles', 'address', 1000, false);
    console.log('✓ address (JSON) attribute created');
    await sleep(500);

    // id_number
    await databases.createStringAttribute(DATABASE_ID, 'profiles', 'id_number', 50, false);
    console.log('✓ id_number attribute created');
    await sleep(500);

    // avatar_url
    await databases.createStringAttribute(DATABASE_ID, 'profiles', 'avatar_url', 1000, false);
    console.log('✓ avatar_url attribute created');
    await sleep(500);

    // agency_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'profiles', 'agency_id', 36, false);
    console.log('✓ agency_id attribute created');

  } catch (error) {
    console.error('❌ Error creating profiles:', error.message);
  }
}

/**
 * 3. Create Properties Collection
 */
async function createPropertiesCollection() {
  console.log('\n📁 Creating properties collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      'properties',
      'Properties',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('✓ Collection created');
    await sleep(500);

    // description
    await databases.createStringAttribute(DATABASE_ID, 'properties', 'description', 5000, false);
    console.log('✓ description attribute created');
    await sleep(500);

    // location (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'properties', 'location', 2000, false);
    console.log('✓ location (JSON) attribute created');
    await sleep(500);

    // size (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'properties', 'size', 1000, false);
    console.log('✓ size (JSON) attribute created');
    await sleep(500);

    // media (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'properties', 'media', 5000, false);
    console.log('✓ media (JSON) attribute created');
    await sleep(500);

    // specs (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'properties', 'specs', 2000, false);
    console.log('✓ specs (JSON) attribute created');
    await sleep(500);

    // rooms (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'properties', 'rooms', 1000, false);
    console.log('✓ rooms (JSON) attribute created');
    await sleep(500);

    // neighbourhood (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'properties', 'neighbourhood', 2000, false);
    console.log('✓ neighbourhood (JSON) attribute created');

  } catch (error) {
    console.error('❌ Error creating properties:', error.message);
  }
}

/**
 * 4. Create Projects Collection
 */
async function createProjectsCollection() {
  console.log('\n📁 Creating projects collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      'projects',
      'Projects',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('✓ Collection created');
    await sleep(500);

    // title
    await databases.createStringAttribute(DATABASE_ID, 'projects', 'title', 255, true);
    console.log('✓ title attribute created');
    await sleep(500);

    // status (enum)
    await databases.createEnumAttribute(
      DATABASE_ID,
      'projects',
      'status',
      ['active', 'pending', 'sold', 'archived'],
      true
    );
    console.log('✓ status (enum) attribute created');
    await sleep(500);

    // price
    await databases.createFloatAttribute(DATABASE_ID, 'projects', 'price', false, 0, 999999999);
    console.log('✓ price attribute created');
    await sleep(500);

    // handover_date
    await databases.createDatetimeAttribute(DATABASE_ID, 'projects', 'handover_date', false);
    console.log('✓ handover_date attribute created');
    await sleep(500);

    // reference_nr
    await databases.createStringAttribute(DATABASE_ID, 'projects', 'reference_nr', 50, false);
    console.log('✓ reference_nr attribute created');
    await sleep(500);

    // property_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'projects', 'property_id', 36, true);
    console.log('✓ property_id attribute created');
    await sleep(500);

    // agent_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'projects', 'agent_id', 36, true);
    console.log('✓ agent_id attribute created');
    await sleep(500);

    // buyer_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'projects', 'buyer_id', 36, false);
    console.log('✓ buyer_id attribute created');
    await sleep(500);

    // seller_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'projects', 'seller_id', 36, false);
    console.log('✓ seller_id attribute created');

  } catch (error) {
    console.error('❌ Error creating projects:', error.message);
  }
}

/**
 * 5. Create Tasks Collection
 */
async function createTasksCollection() {
  console.log('\n📁 Creating tasks collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      'tasks',
      'Tasks',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('✓ Collection created');
    await sleep(500);

    // title
    await databases.createStringAttribute(DATABASE_ID, 'tasks', 'title', 255, true);
    console.log('✓ title attribute created');
    await sleep(500);

    // type
    await databases.createStringAttribute(DATABASE_ID, 'tasks', 'type', 100, false);
    console.log('✓ type attribute created');
    await sleep(500);

    // task_type (enum) - distinguishes user actions from project milestones
    await databases.createEnumAttribute(
      DATABASE_ID,
      'tasks',
      'task_type',
      ['user_action', 'project_milestone'],
      false,
      'user_action'
    );
    console.log('✓ task_type (enum) attribute created');
    await sleep(500);

    // status (enum)
    await databases.createEnumAttribute(
      DATABASE_ID,
      'tasks',
      'status',
      ['todo', 'in_progress', 'completed'],
      true
    );
    console.log('✓ status (enum) attribute created');
    await sleep(500);

    // project_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'tasks', 'project_id', 36, true);
    console.log('✓ project_id attribute created');
    await sleep(500);

    // assignee_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'tasks', 'assignee_id', 36, false);
    console.log('✓ assignee_id attribute created');
    await sleep(500);

    // required_doc_type
    await databases.createStringAttribute(DATABASE_ID, 'tasks', 'required_doc_type', 100, false);
    console.log('✓ required_doc_type attribute created');
    await sleep(500);

    // sign_request_id
    await databases.createStringAttribute(DATABASE_ID, 'tasks', 'sign_request_id', 36, false);
    console.log('✓ sign_request_id attribute created');

  } catch (error) {
    console.error('❌ Error creating tasks:', error.message);
  }
}

/**
 * 6. Create Documents Collection
 */
async function createDocumentsCollection() {
  console.log('\n📁 Creating documents collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      'documents',
      'Documents',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('✓ Collection created');
    await sleep(500);

    // type
    await databases.createStringAttribute(DATABASE_ID, 'documents', 'type', 100, true);
    console.log('✓ type attribute created');
    await sleep(500);

    // source (enum)
    await databases.createEnumAttribute(
      DATABASE_ID,
      'documents',
      'source',
      ['upload', 'generated'],
      true
    );
    console.log('✓ source (enum) attribute created');
    await sleep(500);

    // file_id
    await databases.createStringAttribute(DATABASE_ID, 'documents', 'file_id', 100, true);
    console.log('✓ file_id attribute created');
    await sleep(500);

    // verification_status (enum)
    await databases.createEnumAttribute(
      DATABASE_ID,
      'documents',
      'verification_status',
      ['pending', 'approved', 'rejected'],
      true
    );
    console.log('✓ verification_status (enum) attribute created');
    await sleep(500);

    // project_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'documents', 'project_id', 36, true);
    console.log('✓ project_id attribute created');
    await sleep(500);

    // owner_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'documents', 'owner_id', 36, true);
    console.log('✓ owner_id attribute created');

  } catch (error) {
    console.error('❌ Error creating documents:', error.message);
  }
}

/**
 * 7. Create Form Submissions Collection
 */
async function createFormSubmissionsCollection() {
  console.log('\n📁 Creating form_submissions collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      'form_submissions',
      'Form Submissions',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('✓ Collection created');
    await sleep(500);

    // form_data (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'form_submissions', 'form_data', 10000, true);
    console.log('✓ form_data (JSON) attribute created');
    await sleep(500);

    // title
    await databases.createStringAttribute(DATABASE_ID, 'form_submissions', 'title', 255, true);
    console.log('✓ title attribute created');
    await sleep(500);

    // project_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'form_submissions', 'project_id', 36, true);
    console.log('✓ project_id attribute created');
    await sleep(500);

    // submitter_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'form_submissions', 'submitter_id', 36, true);
    console.log('✓ submitter_id attribute created');

  } catch (error) {
    console.error('❌ Error creating form_submissions:', error.message);
  }
}

/**
 * 8. Create Sign Requests Collection
 */
async function createSignRequestsCollection() {
  console.log('\n📁 Creating sign_requests collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      'sign_requests',
      'Sign Requests',
      [
        sdk.Permission.read(sdk.Role.any()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]
    );
    console.log('✓ Collection created');
    await sleep(500);

    // parent_id
    await databases.createStringAttribute(DATABASE_ID, 'sign_requests', 'parent_id', 36, true);
    console.log('✓ parent_id attribute created');
    await sleep(500);

    // parent_type (enum)
    await databases.createEnumAttribute(
      DATABASE_ID,
      'sign_requests',
      'parent_type',
      ['form', 'document'],
      true
    );
    console.log('✓ parent_type (enum) attribute created');
    await sleep(500);

    // status (enum)
    await databases.createEnumAttribute(
      DATABASE_ID,
      'sign_requests',
      'status',
      ['pending', 'completed'],
      true
    );
    console.log('✓ status (enum) attribute created');
    await sleep(500);

    // required_signers (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'sign_requests', 'required_signers', 5000, true);
    console.log('✓ required_signers (JSON) attribute created');
    await sleep(500);

    // signature_data (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'sign_requests', 'signature_data', 10000, true);
    console.log('✓ signature_data (JSON) attribute created');
    await sleep(500);

    // project_id (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'sign_requests', 'project_id', 36, true);
    console.log('✓ project_id attribute created');

  } catch (error) {
    console.error('❌ Error creating sign_requests:', error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting JSON-based schema creation...\n');
  console.log(`Database: ${DATABASE_ID}`);
  console.log('This will create 9 collections with JSON field support\n');

  await createAgenciesCollection();
  await createProfilesCollection();
  await createPropertiesCollection();
  await createProjectsCollection();
  await createTasksCollection();
  await createDocumentsCollection();
  await createFormSubmissionsCollection();
  await createSignRequestsCollection();
  await createContractTemplatesCollection();

  console.log('\n✅ Schema creation complete!');
  console.log('\nNext steps:');
  console.log('1. Verify collections in Appwrite console');
  console.log('2. Update services/appwrite.ts COLLECTIONS constant');
  console.log('3. Create property service');
  console.log('4. Update components to use JSON parsing');
}

/**
 * 9. Create Contract Templates Collection
 */
async function createContractTemplatesCollection() {
  console.log('\n📁 Creating contract_templates collection...');

  try {
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

    // title
    await databases.createStringAttribute(DATABASE_ID, 'contract_templates', 'title', 255, true);
    console.log('✓ title attribute created');
    await sleep(500);

    // content (HTML/Markdown with {{placeholders}})
    await databases.createStringAttribute(DATABASE_ID, 'contract_templates', 'content', 65000, true);
    console.log('✓ content attribute created');
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

    // required_roles (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'contract_templates', 'required_roles', 1000, false);
    console.log('✓ required_roles (JSON) attribute created');
    await sleep(500);

    // schema (JSON)
    await databases.createStringAttribute(DATABASE_ID, 'contract_templates', 'schema', 5000, false);
    console.log('✓ schema (JSON) attribute created');
    await sleep(500);

    // created_by (relationship)
    await databases.createStringAttribute(DATABASE_ID, 'contract_templates', 'created_by', 36, false);
    console.log('✓ created_by attribute created');

  } catch (error) {
    console.error('❌ Error creating contract_templates:', error.message);
  }
}

main();
