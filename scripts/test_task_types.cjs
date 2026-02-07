const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'estately-main';

async function testTaskTypes() {
  console.log('🧪 Testing Task Types...\n');

  try {
    // Test 1: Create user action task (assigned to specific user)
    console.log('1️⃣  Creating user action task...');
    const userTask = await databases.createDocument(
      DATABASE_ID,
      'tasks',
      sdk.ID.unique(),
      {
        projectId: 'test-project-123',
        title: 'Upload identity document',
        completed: false,
        task_type: 'user_action',
        description: 'Please upload your passport or ID card',
        category: 'document'
      }
    );
    console.log(`   ✓ User task created: ${userTask.$id}`);
    console.log(`   📋 Type: ${userTask.task_type}, Project: ${userTask.projectId}`);

    // Test 2: Create project milestone task (no assignee, Agent managed)
    console.log('\n2️⃣  Creating project milestone task...');
    const milestoneTask = await databases.createDocument(
      DATABASE_ID,
      'tasks',
      sdk.ID.unique(),
      {
        projectId: 'test-project-123',
        title: 'Handtekeningen verzamelen',
        completed: false,
        task_type: 'project_milestone',
        description: 'Verzamel alle benodigde handtekeningen van betrokken partijen',
        category: 'milestone'
      }
    );
    console.log(`   ✓ Milestone task created: ${milestoneTask.$id}`);
    console.log(`   📋 Type: ${milestoneTask.task_type}, Managed by: Agent`);

    // Test 3: Query user action tasks
    console.log('\n3️⃣  Querying user action tasks...');
    const userTasks = await databases.listDocuments(
      DATABASE_ID,
      'tasks',
      [sdk.Query.equal('task_type', 'user_action')]
    );
    console.log(`   ✓ Found ${userTasks.documents.length} user action tasks`);

    // Test 4: Query project milestone tasks
    console.log('\n4️⃣  Querying project milestone tasks...');
    const milestoneTasks = await databases.listDocuments(
      DATABASE_ID,
      'tasks',
      [sdk.Query.equal('task_type', 'project_milestone')]
    );
    console.log(`   ✓ Found ${milestoneTasks.documents.length} project milestone tasks`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await databases.deleteDocument(DATABASE_ID, 'tasks', userTask.$id);
    await databases.deleteDocument(DATABASE_ID, 'tasks', milestoneTask.$id);
    console.log('   ✓ Test tasks deleted');

    console.log('\n✅ All task type tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testTaskTypes();
