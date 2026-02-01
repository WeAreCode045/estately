# Contributing to EstateFlow Pro

Thank you for your interest in contributing to EstateFlow Pro! This document provides guidelines and best practices for development.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Git Workflow](#git-workflow)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git
- VSCode (recommended)

### Initial Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd estately
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your environment variables in `.env.local`

5. Install recommended VSCode extensions when prompted

6. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run validate` - Run all checks (type-check, lint, format)
- `npm run analyze` - Analyze bundle size

### Before Committing

Always run validation before committing:

```bash
npm run validate
```

This will:
1. Check TypeScript types
2. Run ESLint
3. Check code formatting

## Code Standards

### TypeScript

- **Strict Mode**: Always use strict TypeScript
- **No `any`**: Avoid using `any` type unless absolutely necessary
- **Type Imports**: Use `import type` for type-only imports
- **Explicit Types**: Define explicit return types for functions

```typescript
// ✅ Good
import type { User } from '@types';

function getUser(id: string): Promise<User> {
  // implementation
}

// ❌ Bad
import { User } from '@types';

function getUser(id) {
  // implementation
}
```

### React Components

- **Functional Components**: Use functional components with hooks
- **Props Interface**: Always define props interface
- **Naming**: Use PascalCase for components, camelCase for instances
- **File Structure**: One component per file

```typescript
// ✅ Good
import type { FC } from 'react';

interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
}

export const UserCard: FC<UserCardProps> = ({ user, onEdit }) => {
  return (
    <div>
      <h3>{user.name}</h3>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  );
};

// ❌ Bad
export default function UserCard(props) {
  return <div>{props.user.name}</div>;
}
```

### Hooks

- **Custom Hooks**: Extract reusable logic into custom hooks
- **Dependencies**: Always specify hook dependencies correctly
- **Naming**: Prefix custom hooks with `use`

```typescript
// ✅ Good
function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  return { user, loading };
}
```

### State Management

- **Local State**: Use `useState` for component-local state
- **Context**: Use Context API for shared state
- **Derived State**: Compute derived state with `useMemo`

### Styling

- **Tailwind CSS**: Use Tailwind utility classes
- **Consistent Spacing**: Follow spacing scale (4, 8, 12, 16, etc.)
- **Responsive**: Mobile-first responsive design
- **Dark Mode**: Consider dark mode support

### File Organization

```
src/
├── components/       # Reusable UI components
├── views/           # Page-level components
├── contexts/        # React contexts
├── services/        # API and external services
├── utils/           # Utility functions
├── types.ts         # TypeScript type definitions
└── constants.tsx    # Application constants
```

### Naming Conventions

- **Files**: kebab-case for files (`user-card.tsx`)
- **Components**: PascalCase (`UserCard`)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINT`)
- **Types/Interfaces**: PascalCase (`UserProfile`)

### Code Comments

- **JSDoc**: Use JSDoc for public APIs
- **Inline Comments**: Explain "why", not "what"
- **TODO Comments**: Use `// TODO:` for future improvements

```typescript
/**
 * Fetches user profile from Appwrite database
 * @param userId - The unique identifier of the user
 * @returns Promise resolving to user profile
 */
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  // Use cache if available to reduce API calls
  const cached = cache.get(userId);
  if (cached) return cached;

  // TODO: Add retry logic for failed requests
  return await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId);
}
```

### Error Handling

- **Try-Catch**: Always wrap async operations
- **User Feedback**: Provide clear error messages
- **Logging**: Log errors for debugging

```typescript
try {
  const user = await fetchUser(userId);
  setUser(user);
} catch (error) {
  console.error('Failed to fetch user:', error);
  toast.error('Unable to load user profile. Please try again.');
}
```

### Performance

- **Memoization**: Use `React.memo`, `useMemo`, `useCallback` appropriately
- **Lazy Loading**: Lazy load routes and heavy components
- **Code Splitting**: Split large bundles
- **Image Optimization**: Optimize images before upload

### Accessibility

- **Semantic HTML**: Use semantic HTML elements
- **ARIA Labels**: Add ARIA labels where needed
- **Keyboard Navigation**: Ensure keyboard accessibility
- **Color Contrast**: Maintain WCAG AA contrast ratios

## Git Workflow

### Branch Naming

- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Urgent production fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

Example: `feature/user-authentication`

### Commit Messages

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(auth): add user registration flow
fix(dashboard): resolve project loading issue
docs(readme): update installation instructions
```

### Pre-commit Hooks

Husky and lint-staged will automatically:
- Run ESLint and fix issues
- Format code with Prettier
- Validate TypeScript types

## Testing

### Unit Tests

```typescript
describe('UserCard', () => {
  it('should render user name', () => {
    const user = { id: '1', name: 'John Doe' };
    render(<UserCard user={user} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### Integration Tests

Test component interactions and data flow.

### E2E Tests

Test complete user workflows.

## Pull Request Process

1. **Create Branch**: Create a feature branch from `main`
2. **Develop**: Implement your changes following code standards
3. **Validate**: Run `npm run validate` to ensure quality
4. **Commit**: Make clear, atomic commits
5. **Push**: Push your branch to remote
6. **PR**: Create a pull request with:
   - Clear title and description
   - Screenshots/videos for UI changes
   - Testing instructions
   - Related issue references
7. **Review**: Address review feedback
8. **Merge**: Squash and merge when approved

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Screenshots
If applicable

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
```

## Questions?

If you have questions, please:
1. Check existing documentation
2. Search closed issues
3. Open a new issue with the `question` label

Thank you for contributing! 🎉
