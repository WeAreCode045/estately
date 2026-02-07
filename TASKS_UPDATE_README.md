# Tasks Collection Update

## Overview

De `tasks` collectie is uitgebreid met een `task_type` enum attribuut om onderscheid te maken tussen:
- **Individuele gebruikerstaken** (`user_action`) - Taken toegewezen aan specifieke gebruikers
- **Algemene projecttaken** (`project_milestone`) - Taken beheerd door de Agent zonder specifieke toewijzing

## Schema

### New Attribute

```typescript
task_type: enum ['user_action', 'project_milestone']
- Default: 'user_action'
- Optional: true
```

### Collection Structure

De legacy `tasks` collectie bevat:

```typescript
interface ProjectTask {
  $id: string;
  projectId: string;          // ✓ required
  title: string;              // ✓ required
  description?: string;       // optional
  completed: boolean;         // ✓ required
  dueDate?: string;           // optional
  category?: string;          // optional
  documentLink?: string;      // optional
  notifyAssignee?: boolean;   // optional (default: false)
  notifyAgentOnComplete?: boolean; // optional (default: false)
  task_type: 'user_action' | 'project_milestone'; // NEW ✨
}
```

## Gebruik

### User Action Tasks (Gebruikerstaken)

Taken die door specifieke gebruikers moeten worden voltooid:

```typescript
const userTask = await databases.createDocument(
  DATABASE_ID,
  'tasks',
  ID.unique(),
  {
    projectId: project.$id,
    title: 'Upload identity document',
    description: 'Upload your passport or ID card',
    completed: false,
    task_type: 'user_action',
    category: 'document',
    notifyAssignee: true
  }
);
```

**Use cases:**
- Document uploads (passport, ID, bank statements)
- Form submissions (buyer intake, seller questionnaire)
- Digital signatures
- Viewing property information
- Scheduling viewings

### Project Milestone Tasks (Projecttaken)

Algemene projecttaken beheerd door de Agent:

```typescript
const milestoneTask = await databases.createDocument(
  DATABASE_ID,
  'tasks',
  ID.unique(),
  {
    projectId: project.$id,
    title: 'Handtekeningen verzamelen',
    description: 'Verzamel alle benodigde handtekeningen',
    completed: false,
    task_type: 'project_milestone',
    category: 'milestone',
    notifyAgentOnComplete: true
  }
);
```

**Use cases:**
- Collecting all signatures
- Financial checks
- Property inspection coordination
- Notary appointment scheduling
- Key handover
- Project completion

## Queries

### Filter by Task Type

```typescript
// Get all user action tasks
const userTasks = await databases.listDocuments(
  DATABASE_ID,
  'tasks',
  [Query.equal('task_type', 'user_action')]
);

// Get all project milestones
const milestones = await databases.listDocuments(
  DATABASE_ID,
  'tasks',
  [Query.equal('task_type', 'project_milestone')]
);

// Get incomplete user tasks for a project
const pendingUserTasks = await databases.listDocuments(
  DATABASE_ID,
  'tasks',
  [
    Query.equal('projectId', projectId),
    Query.equal('task_type', 'user_action'),
    Query.equal('completed', false)
  ]
);
```

## TypeScript Support

```typescript
import { TaskType, ProjectTask } from './types';

// Type-safe task creation
const task: Partial<ProjectTask> = {
  projectId: project.$id,
  title: 'Task title',
  completed: false,
  task_type: TaskType.USER_ACTION
};

// Enum values
TaskType.USER_ACTION          // 'user_action'
TaskType.PROJECT_MILESTONE    // 'project_milestone'
```

## Migration

Bestaande taken zonder `task_type` krijgen automatisch de default waarde `'user_action'`.

### Update Existing Tasks

```typescript
// Update a task to be a project milestone
await databases.updateDocument(
  DATABASE_ID,
  'tasks',
  taskId,
  { task_type: 'project_milestone' }
);
```

## UI Considerations

### Dashboard Views

**Agent Dashboard:**
- Show both user tasks AND project milestones
- Filter option to toggle between task types
- Visual distinction (icons, colors)

**User Dashboard:**
- Show only `task_type: 'user_action'` tasks
- Hide project milestones (managed by Agent)

### Task Creation

```tsx
// Task creation form
<select name="task_type">
  <option value="user_action">User Action (assigned to user)</option>
  <option value="project_milestone">Project Milestone (Agent managed)</option>
</select>
```

### Display

```tsx
// Visual indicator
{task.task_type === 'project_milestone' ? (
  <Badge variant="purple">Milestone</Badge>
) : (
  <Badge variant="blue">User Task</Badge>
)}
```

## Scripts

### Update Collection
```bash
node scripts/update_tasks_collection.cjs
```

### Test Task Types
```bash
node scripts/test_task_types.cjs
```

### Inspect Collection
```bash
node scripts/inspect_tasks.cjs
```

## Backwards Compatibility

✅ Bestaande tasks blijven werken
✅ Default waarde: `'user_action'`
✅ No breaking changes
✅ TypeScript interfaces updated

## Files Updated

- ✅ `/types.ts` - Added `TaskType` enum and updated `ProjectTask` interface
- ✅ `/scripts/update_tasks_collection.cjs` - Collection update script
- ✅ `/scripts/test_task_types.cjs` - Test suite
- ✅ `/scripts/inspect_tasks.cjs` - Collection inspector
- ✅ `/scripts/create_json_schema.cjs` - Updated for future deployments
