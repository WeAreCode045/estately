# Migration Guide: Legacy → New Architecture

## Overview
Dit document beschrijft hoe je bestaande code migreert naar de nieuwe feature-based architectuur.

## Quick Reference: File Locations

### Services (API)
```
OLD: services/taskService.ts
NEW: api/taskService.ts

OLD: services/appwrite.ts
NEW: api/appwrite.ts
```

### Import Updates
```tsx
// ❌ OLD
import { taskService } from '../services/appwrite';

// ✅ NEW
import { taskService } from '../api/appwrite';
```

## Step-by-Step Migration

### 1. Migrate a View Component

#### Before (Fat View)
```tsx
// views/Tasks.tsx - OLD
const Tasks = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      const profile = await profileService.getByUserId(user.id);
      const tasks = await taskService.listByAssignee(profile.$id);
      setTasks(tasks);
      setLoading(false);
    };
    fetchTasks();
  }, [user.id]);

  const completeTask = async (taskId) => {
    await taskService.updateStatus(taskId, 'completed');
    // Re-fetch or update local state
  };

  return (
    <div>
      {tasks.map(task => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <button onClick={() => completeTask(task.id)}>Complete</button>
        </div>
      ))}
    </div>
  );
};
```

#### After (Clean View with Hook)
```tsx
// views/Tasks.tsx - NEW
import { useUserTasks } from '../hooks';
import TaskListItem from '../features/tasks/components/TaskListItem';

const Tasks = () => {
  const { user } = useAuth();
  const { pendingTasks, completeTask, loading } = useUserTasks(user.id);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {pendingTasks.map(task => (
        <TaskListItem
          key={task.$id}
          task={task}
          onComplete={() => completeTask(task.$id)}
        />
      ))}
    </div>
  );
};
```

### 2. Extract Feature Components

#### Before (Everything in View)
```tsx
// views/ProjectDetail.tsx - 1200 lines
const ProjectDetail = () => {
  // 100 lines of state
  // 500 lines of logic
  // 600 lines of JSX
};
```

#### After (Separated)
```tsx
// views/ProjectDetail.tsx - 150 lines
const ProjectDetail = () => {
  const { project } = useProject(id);
  return <ProjectHeader project={project} />;
};

// features/projects/components/ProjectHeader.tsx - 100 lines
const ProjectHeader = ({ project }) => {
  // Only header logic and JSX
};
```

### 3. Create Custom Hooks

#### Pattern
```tsx
// hooks/useResourceName.ts
export function useResourceName(id: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiService.get(id);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const update = async (updates) => {
    await apiService.update(id, updates);
    setData(prev => ({ ...prev, ...updates }));
  };

  return { data, loading, error, update, refetch: () => fetchData() };
}
```

### 4. Extract UI Components

#### Identify Reusable Patterns
Look for repeated JSX patterns like buttons, cards, badges:

```tsx
// ❌ Repeated everywhere
<button className="bg-blue-600 text-white px-4 py-2 rounded-xl">
  Click me
</button>

// ✅ Extract to component
<Button variant="primary">Click me</Button>
```

#### Create Atomic Component
```tsx
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children }) => {
  const styles = {
    primary: 'bg-blue-600 text-white',
    secondary: 'bg-slate-100 text-slate-900'
  };

  return (
    <button className={`px-4 py-2 rounded-xl ${styles[variant]}`}>
      {children}
    </button>
  );
};
```

## Migration Checklist

### Per View Component
- [ ] Identify all API calls
- [ ] Create or use existing custom hook
- [ ] Extract large JSX blocks to feature components
- [ ] Move business logic to hooks or services
- [ ] Update imports to use `/api` and `/hooks`
- [ ] Test thoroughly

### Per Feature Domain
- [ ] Create `/features/[domain]/components` folder
- [ ] Move domain-specific components
- [ ] Create index.ts for exports
- [ ] Update imports in views

### Global
- [ ] Update all service imports (`services/` → `api/`)
- [ ] Test all existing functionality
- [ ] Remove old directories after full migration
- [ ] Update documentation

## Common Pitfalls

### ❌ Don't: Create God Hooks
```tsx
// Bad - hook does too much
const useEverything = () => {
  const projects = useProjects();
  const tasks = useTasks();
  const documents = useDocuments();
  const users = useUsers();
  // ...
};
```

### ✅ Do: Granular Hooks
```tsx
// Good - specific, focused hooks
const { project } = useProject(id);
const { tasks } = useProjectTasks({ projectId: id });
```

### ❌ Don't: Mix Concerns in Components
```tsx
// Bad - feature component doing API calls
const ProjectHeader = ({ projectId }) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    databases.getDocument(...).then(setData); // Direct API call
  }, []);
};
```

### ✅ Do: Separate Data from UI
```tsx
// Good - view fetches, component receives
const ProjectDetail = () => {
  const { project } = useProject(id); // Hook handles API
  return <ProjectHeader project={project} />; // Component receives data
};
```

## Testing After Migration

### 1. Smoke Test
Run the app and verify:
- [ ] All routes load
- [ ] No console errors
- [ ] Data displays correctly

### 2. Feature Test
For each migrated view:
- [ ] List/fetch operations work
- [ ] Create operations work
- [ ] Update operations work
- [ ] Delete operations work
- [ ] Error states display correctly
- [ ] Loading states work

### 3. Regression Test
- [ ] Old functionality still works
- [ ] No broken imports
- [ ] TypeScript compiles without errors

## Rollback Plan

If migration causes issues:

1. Keep old files alongside new ones (e.g., `Tasks.tsx` and `Tasks.new.tsx`)
2. Switch imports in routing
3. Fix issues in new implementation
4. Remove old files only when confident

## Questions?

Refer to:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Full architecture documentation
- [RELATIONAL_MODEL_GUIDE.md](./RELATIONAL_MODEL_GUIDE.md) - Database structure

---

**Migration Started**: February 7, 2026
**Estimated Completion**: TBD
