# 🚀 Quick Start: New Architecture

## For Developers

### Creating a New View

```tsx
// views/MyNewView.tsx
import React from 'react';
import { useMyData } from '../hooks/useMyData';
import MyFeatureComponent from '../features/myfeature/components/MyFeatureComponent';

const MyNewView: React.FC = () => {
  // 1. Use custom hook for data
  const { data, loading, error } = useMyData();

  // 2. Handle loading/error states
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  // 3. Render feature components
  return (
    <div>
      <MyFeatureComponent data={data} />
    </div>
  );
};

export default MyNewView;
```

### Creating a Custom Hook

```tsx
// hooks/useMyData.ts
import { useState, useEffect } from 'react';
import { myService } from '../api/appwrite';

export function useMyData(id: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await myService.get(id);
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
    await myService.update(id, updates);
    setData(prev => ({ ...prev, ...updates }));
  };

  return { data, loading, error, update };
}
```

### Creating a Feature Component

```tsx
// features/myfeature/components/MyComponent.tsx
import React from 'react';
import { Button, Card } from '../../../components/ui';

interface MyComponentProps {
  data: MyData;
  onAction: () => void;
}

/**
 * MyComponent - Brief description
 *
 * Pure component - receives all data via props
 */
const MyComponent: React.FC<MyComponentProps> = ({ data, onAction }) => {
  return (
    <Card>
      <h2>{data.title}</h2>
      <Button onClick={onAction}>Action</Button>
    </Card>
  );
};

export default MyComponent;
```

### Creating a UI Component

```tsx
// components/ui/MyUIComponent.tsx
import React from 'react';

interface MyUIComponentProps {
  variant?: 'default' | 'primary';
  children: React.ReactNode;
}

/**
 * MyUIComponent - Reusable atomic component
 *
 * No business logic - pure presentation
 */
const MyUIComponent: React.FC<MyUIComponentProps> = ({
  variant = 'default',
  children
}) => {
  const styles = {
    default: 'bg-slate-100',
    primary: 'bg-blue-600'
  };

  return (
    <div className={styles[variant]}>
      {children}
    </div>
  );
};

export default MyUIComponent;
```

## Common Import Patterns

```tsx
// Hooks
import { useProject, useProjectTasks } from '../hooks';

// Feature Components
import ProjectHeader from '../features/projects/components/ProjectHeader';

// UI Components
import { Button, Card, Badge } from '../components/ui';

// API Services
import { taskService, projectService } from '../api/appwrite';

// Types
import type { Project, Task } from '../types';
```

## File Naming Conventions

```
✅ Good:
- ProjectHeader.tsx (Component)
- useProject.ts (Hook)
- taskService.ts (Service)
- Button.tsx (UI Component)

❌ Bad:
- project-header.tsx
- UseProject.ts
- TaskService.ts
- button.tsx
```

## Directory Rules

### `/views` - Views MUST:
- ✅ Use custom hooks for data
- ✅ Pass data to feature components
- ❌ NO direct API calls
- ❌ NO business logic

### `/features` - Feature Components MUST:
- ✅ Receive data via props
- ✅ Handle domain-specific logic
- ❌ NO direct API calls (use callbacks)

### `/components/ui` - UI Components MUST:
- ✅ Be pure presentational
- ✅ Be highly reusable
- ❌ NO business logic
- ❌ NO API calls

### `/hooks` - Hooks MUST:
- ✅ Handle data fetching
- ✅ Manage related state
- ✅ Return consistent interface
- ❌ NO UI rendering

### `/api` - Services MUST:
- ✅ Handle all backend communication
- ✅ Return typed data
- ❌ NO UI logic

## Testing Checklist

Before committing:
- [ ] TypeScript compiles without errors
- [ ] No console warnings
- [ ] All imports resolve correctly
- [ ] Data loads and displays
- [ ] Actions work (create/update/delete)
- [ ] Error states handled
- [ ] Loading states shown

## Getting Help

1. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for full documentation
2. Check [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for examples
3. Look at existing implementations:
   - `views/Tasks.new.tsx` - Clean view example
   - `hooks/useUserTasks.ts` - Hook pattern
   - `features/tasks/components/TaskListItem.tsx` - Feature component
   - `components/ui/Button.tsx` - UI component

## Quick Commands

```bash
# Create new feature
mkdir -p features/myfeature/components
touch features/myfeature/components/MyComponent.tsx
touch features/myfeature/index.ts

# Create new hook
touch hooks/useMyData.ts

# Update imports (after moving services)
node scripts/update-imports.js

# Type check
npm run type-check

# Lint
npm run lint
```

---

Happy coding! 🎉
