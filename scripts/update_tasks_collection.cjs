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
 * Update Tasks Collection
 * Adds task_type enum to support both user actions and project milestones
 */
async function updateTasksCollection() {
  console.log('🔧 Updating tasks collection...\n');

  try {
    // Check if task_type already exists
    const collection = await databases.getCollection(DATABASE_ID, 'tasks');
    const existingAttrs = collection.attributes || [];
    const hasTaskType = existingAttrs.some(attr => attr.key === 'task_type');

    if (hasTaskType) {
      console.log('✓ task_type attribute already exists');
      console.log('\n✅ Tasks collection already up to date!');
      return;
    }

    // Add task_type enum attribute
    console.log('📝 Adding task_type enum attribute...');
    await databases.createEnumAttribute(
      DATABASE_ID,
      'tasks',
      'task_type',
      ['user_action', 'project_milestone'],
      false,
      'user_action'
    );
    console.log('✓ task_type enum attribute created with default "user_action"');
    await sleep(500);

    console.log('\n✅ Tasks collection updated successfully!');
    console.log('\nChanges:');
    console.log('• task_type: enum ["user_action", "project_milestone"] (default: "user_action")');
    console.log('• assignee_id: already optional ✓');
    console.log('\nUsage:');
    console.log('• task_type="user_action" + assignee_id → Individual user task');
    console.log('• task_type="project_milestone" + no assignee_id → General project task (Agent managed)');

  } catch (error) {
    console.error('❌ Error updating tasks collection:', error.message);
    process.exit(1);
  }
}

updateTasksCollection();
