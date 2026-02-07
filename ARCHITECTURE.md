# Estately - Codebase Architecture

## 📁 Directory Structure

```
estately/
├── api/                      # Backend services & API integrations
│   ├── appwrite.ts          # Core Appwrite configuration
│   ├── taskService.ts       # Tasks CRUD operations
│   ├── documentRecordService.ts
│   ├── projectService.ts
│   └── ...
│
├── hooks/                    # Custom React hooks for data fetching
│   ├── useProject.ts        # Fetch & manage single project + property
│   ├── useProjectTasks.ts   # Tasks for a specific project
│   ├── useUserTasks.ts      # Current user's tasks
│   └── useProjectDocuments.ts
│
├── features/                 # Feature-based components (domain-driven)
│   ├── projects/
│   │   └── components/
│   │       ├── ProjectHeader.tsx
│   │       ├── ProjectOverview.tsx
│   │       ├── ProjectProperty.tsx
│   │       └── ...
│   ├── tasks/
│   │   └── components/
│   │       ├── TaskListItem.tsx
│   │       ├── TaskStatsCards.tsx
│   │       └── CreateTaskModal.tsx
│   └── documents/
│       └── components/
│
├── components/               # Shared components
│   ├── ui/                  # Atomic UI components (Button, Card, Badge)
│   ├── DocumentViewer.tsx   # Business-logic components
│   ├── FormRenderer.tsx
│   └── ...
│
├── views/                    # Page-level components (routes)
│   ├── Dashboard.tsx
│   ├── ProjectDetail.tsx    # ✨ Uses hooks + feature components
│   ├── Tasks.tsx            # ✨ Uses hooks + feature components
│   └── ...
│
├── contexts/                 # React Context providers
│   └── AuthContext.tsx
│
├── utils/                    # Utility functions & helpers
└── types.ts                  # TypeScript type definitions
```

## 🏗️ Architecture Principles

### 1. **Separation of Concerns**
- **Views** (pages): Only orchestrate data fetching and pass props to feature components
- **Feature Components**: Domain-specific UI logic (projects, tasks, documents)
- **UI Components**: Pure presentational atomic components (buttons, cards, badges)
- **Hooks**: Encapsulate data fetching & state management
- **API Services**: Direct database/API communication

### 2. **Data Flow**
```
View → Hook → API Service → Appwrite Database
  ↓
Feature Component → UI Component
```

**Example:**
```tsx
// ❌ OLD WAY (Fat View with direct API calls)
const Tasks = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    databases.listDocuments(...).then(setTasks); // Direct API call
  }, []);

  return <div>{/* 300 lines of JSX */}</div>
}

// ✅ NEW WAY (Thin View with hooks)
const Tasks = () => {
  const { pendingTasks, completeTask } = useUserTasks(user.id);

  return (
    <TaskStatsCards />
    <TaskListItem onComplete={completeTask} />
  );
}
```

### 3. **Component Hierarchy**

#### **Views** (`/views`)
- Route-level components
- Use custom hooks for data
- Minimal local state (only UI state like modals)
- Pass data down to feature components
- **No direct API calls**

#### **Feature Components** (`/features/[domain]/components`)
- Domain-specific business logic
- Can have local UI state
- Receive data via props from hooks
- Can import UI components
- Examples: `ProjectHeader`, `TaskListItem`, `DocumentUploadForm`

#### **UI Components** (`/components/ui`)
- Pure presentational
- No business logic or API calls
- Highly reusable
- Examples: `Button`, `Card`, `Badge`, `Input`

### 4. **Custom Hooks Pattern**

All custom hooks follow this structure:

```tsx
export function useProject(projectId: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data via API service
  }, [projectId]);

  const updateProject = async (updates) => {
    // Update via API service
  };

  return { data, loading, error, updateProject, refetch };
}
```

**Benefits:**
- ✅ Reusable data fetching logic
- ✅ Consistent error handling
- ✅ Easy to test
- ✅ Keeps views clean

## 🔄 Migration Status

### ✅ Completed
- [x] New directory structure created
- [x] Services moved to `/api`
- [x] Custom hooks created (`useProject`, `useProjectTasks`, `useUserTasks`)
- [x] UI components extracted (`Button`, `Card`, `Badge`)
- [x] Tasks view refactored (clean, hook-based)
- [x] Task feature components created

### 🚧 In Progress
- [ ] Update all import paths to use new `/api` directory
- [ ] Refactor ProjectDetail view completely
- [ ] Move all project components to features
- [ ] Create document feature components

### 📋 TODO
- [ ] Refactor remaining views (Dashboard, Profile, etc.)
- [ ] Remove old `/services` directory after migration
- [ ] Remove old `/components/project` after migration
- [ ] Add comprehensive tests for hooks
- [ ] Create Storybook for UI components

## 📝 Code Style Guidelines

### Imports Order
```tsx
// 1. External libraries
import React from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Hooks
import { useProject, useProjectTasks } from '../hooks';

// 3. Components
import ProjectHeader from '../features/projects/components/ProjectHeader';
import { Button, Card } from '../components/ui';

// 4. Types & Utils
import type { Project } from '../types';
import { formatDate } from '../utils/dateHelpers';
```

### Component Structure
```tsx
/**
 * ComponentName - Brief description
 *
 * Architecture notes:
 * - Uses [hookName] for data
 * - Pure/stateful component
 * - No/Some business logic
 */
interface ComponentProps {
  // Props with JSDoc comments
}

const Component: React.FC<ComponentProps> = (props) => {
  // 1. Hooks
  // 2. Local state
  // 3. Effects
  // 4. Event handlers
  // 5. Computed values
  // 6. Return JSX
};

export default Component;
```

### Naming Conventions
- **Components**: PascalCase (`ProjectHeader.tsx`)
- **Hooks**: camelCase with `use` prefix (`useProject.ts`)
- **Services**: camelCase with `Service` suffix (`taskService.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Types**: PascalCase for interfaces (`Project`, `Task`)

## 🧪 Testing Strategy

### Hooks Testing
```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useProject } from './useProject';

test('fetches project data', async () => {
  const { result } = renderHook(() => useProject('project-id'));

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.project).toBeDefined();
});
```

### Component Testing
```tsx
import { render, screen } from '@testing-library/react';
import TaskListItem from './TaskListItem';

test('renders task title', () => {
  render(<TaskListItem task={mockTask} />);
  expect(screen.getByText('Task Title')).toBeInTheDocument();
});
```

## 🚀 Performance Considerations

1. **Memoization**: Use `React.memo` for expensive feature components
2. **Lazy Loading**: Code-split large features with `React.lazy`
3. **Hook Dependencies**: Carefully manage useEffect dependencies
4. **Avoid Prop Drilling**: Use Context only for truly global state

## 📚 Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)

---

**Last Updated**: February 7, 2026
**Architecture Version**: 2.0 (Relational Model)
