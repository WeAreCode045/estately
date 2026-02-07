# 🚀 Architecture Migration Checklist

## Phase 1: Update Import Paths ✅ Ready

### Automated Migration
```bash
# Run the automated import updater
cd /Volumes/Code045Disk/Projects/estately
node scripts/update-imports.js
```

**What it does:**
- ✅ Updates all `from 'services/` → `from 'api/`
- ✅ Updates all `from 'components/project/` → `from 'features/projects/components/`
- ✅ Normalizes hook imports to `from 'hooks'`
- ✅ Reports statistics on files processed

**Expected output:**
```
✅ Processed 87 files
✅ Updated 243 imports
✅ services/ → api/: 156 changes
✅ components/project/ → features/projects/: 87 changes
```

### Manual Verification Required
After running the script, verify these files manually:
- [ ] `App.tsx` - Check all imports compile
- [ ] `views/Tasks.tsx` - Verify no broken imports
- [ ] `views/ProjectDetail.tsx` - Verify no broken imports
- [ ] Any file with dynamic imports or require()

**Test command:**
```bash
npm run build
```

---

## Phase 2: Test New Views 🧪

### Tasks View Testing

1. **Replace old view (backup first)**
   ```bash
   mv views/Tasks.tsx views/Tasks.old.tsx
   mv views/Tasks.new.tsx views/Tasks.tsx
   ```

2. **Test checklist:**
   - [ ] Page loads without errors
   - [ ] User tasks display correctly
   - [ ] Task statistics cards show correct counts
   - [ ] Task completion works
   - [ ] Document upload works for upload tasks
   - [ ] Create task modal opens and works
   - [ ] Task filtering works (pending, completed)
   - [ ] Overdue/due soon indicators correct
   - [ ] Loading states display properly
   - [ ] Error handling works

3. **Rollback if needed:**
   ```bash
   mv views/Tasks.tsx views/Tasks.new.tsx
   mv views/Tasks.old.tsx views/Tasks.tsx
   ```

### ProjectDetail View Testing

1. **Replace old view (backup first)**
   ```bash
   mv views/ProjectDetail.tsx views/ProjectDetail.old.tsx
   mv views/ProjectDetail.new.tsx views/ProjectDetail.tsx
   ```

2. **Test checklist:**
   - [ ] Project loads correctly
   - [ ] Property details display (via property_id relation)
   - [ ] Project header with status/navigation
   - [ ] Tab navigation works
   - [ ] Overview tab shows correct info
   - [ ] Property tab displays property details
   - [ ] Team tab lists team members
   - [ ] Documents tab shows project documents
   - [ ] Task creation works
   - [ ] Tag assignment works
   - [ ] Project updates save correctly
   - [ ] Related property updates correctly

3. **Rollback if needed:**
   ```bash
   mv views/ProjectDetail.tsx views/ProjectDetail.new.tsx
   mv views/ProjectDetail.old.tsx views/ProjectDetail.tsx
   ```

---

## Phase 3: Migrate Remaining Views 📝

### Priority Order

#### 1. Dashboard View (HIGH PRIORITY)
- [ ] Create `hooks/useDashboardStats.ts`
- [ ] Create `features/dashboard/components/StatsOverview.tsx`
- [ ] Create `features/dashboard/components/RecentActivity.tsx`
- [ ] Refactor `views/Dashboard.tsx`
- [ ] Test thoroughly
- [ ] Replace old version

**Estimated effort:** 3-4 hours

#### 2. Profile View (MEDIUM PRIORITY)
- [ ] Create `hooks/useProfile.ts`
- [ ] Create `features/profile/components/ProfileForm.tsx`
- [ ] Create `features/profile/components/ProfileAvatar.tsx`
- [ ] Refactor `views/Profile.tsx`
- [ ] Test thoroughly
- [ ] Replace old version

**Estimated effort:** 2-3 hours

#### 3. Documents View (MEDIUM PRIORITY)
- [ ] Enhance `hooks/useProjectDocuments.ts` for global view
- [ ] Create `features/documents/components/DocumentList.tsx`
- [ ] Create `features/documents/components/DocumentFilters.tsx`
- [ ] Refactor `views/Documents.tsx`
- [ ] Test thoroughly
- [ ] Replace old version

**Estimated effort:** 3-4 hours

#### 4. Any Additional Views (LOW PRIORITY)
- [ ] List remaining views
- [ ] Prioritize by usage
- [ ] Apply same pattern
- [ ] Test and replace

---

## Phase 4: Update Feature Components 🔧

### Projects Feature Components

Files in `features/projects/components/`:
- [ ] Update `ProjectHeader.tsx` - Use hooks instead of prop drilling
- [ ] Update `ProjectOverview.tsx` - Direct API calls → hooks
- [ ] Update `ProjectProperty.tsx` - Direct API calls → hooks
- [ ] Update `ProjectTeam.tsx` - Direct API calls → hooks
- [ ] Update `ProjectDocuments.tsx` - Use `useProjectDocuments` hook
- [ ] Update modals: `CreateProjectModal.tsx`, etc.

**Pattern to apply:**
```tsx
// ❌ OLD: Direct API call in component
const [data, setData] = useState([]);
useEffect(() => {
  const fetch = async () => {
    const result = await service.get();
    setData(result);
  };
  fetch();
}, []);

// ✅ NEW: Use hook
const { data, loading, error } = useCustomHook();
```

### Documents Feature Components

- [ ] Create `features/documents/components/DocumentList.tsx`
- [ ] Create `features/documents/components/DocumentCard.tsx`
- [ ] Create `features/documents/components/DocumentFilters.tsx`
- [ ] Create `features/documents/components/VerificationPanel.tsx`

---

## Phase 5: Cleanup 🧹

### Remove Old Files

**⚠️ ONLY after all views tested and working!**

1. **Backup first:**
   ```bash
   mkdir backup_pre_cleanup
   cp -r services/ backup_pre_cleanup/
   cp -r components/project/ backup_pre_cleanup/
   ```

2. **Remove old directories:**
   ```bash
   # Remove old services (now in /api)
   rm -rf services/

   # Remove old project components (now in /features/projects)
   rm -rf components/project/
   ```

3. **Clean up old view backups:**
   ```bash
   rm views/*.old.tsx
   ```

4. **Verify no broken imports:**
   ```bash
   npm run build
   npm run lint
   ```

### Update Documentation

- [ ] Update README.md with new structure
- [ ] Add link to ARCHITECTURE.md in main docs
- [ ] Update CONTRIBUTING.md with new patterns
- [ ] Add architecture diagrams to docs

---

## Phase 6: Testing & Validation ✅

### Comprehensive Testing

#### Unit Tests
- [ ] Create tests for `hooks/useProject.ts`
- [ ] Create tests for `hooks/useProjectTasks.ts`
- [ ] Create tests for `hooks/useUserTasks.ts`
- [ ] Create tests for `hooks/useProjectDocuments.ts`

#### Component Tests
- [ ] Test `features/tasks/TaskListItem.tsx`
- [ ] Test `features/tasks/CreateTaskModal.tsx`
- [ ] Test `components/ui/Button.tsx`
- [ ] Test `components/ui/Card.tsx`
- [ ] Test `components/ui/Badge.tsx`

#### Integration Tests
- [ ] Full task workflow (create → assign → complete)
- [ ] Full project workflow (create → add property → add team → complete)
- [ ] Document upload and verification flow
- [ ] Navigation between views

#### E2E Tests (if applicable)
- [ ] User login → view tasks → complete task
- [ ] User creates project → views details → uploads document
- [ ] Admin assigns task → user completes → admin verifies

### Performance Testing
- [ ] Measure initial load time
- [ ] Check hook re-render counts
- [ ] Verify no unnecessary API calls
- [ ] Test with large datasets (100+ tasks, projects)

---

## Success Criteria ✅

### Code Quality
- ✅ No views with direct API calls
- ✅ All data fetching through hooks
- ✅ Components < 200 lines each
- ✅ Clear separation of concerns
- ✅ Consistent naming conventions

### Functionality
- ✅ All existing features work
- ✅ No regressions introduced
- ✅ Loading states display properly
- ✅ Error handling works consistently

### Developer Experience
- ✅ Clear project structure
- ✅ Easy to find code
- ✅ Patterns are consistent
- ✅ Documentation is comprehensive
- ✅ New developers onboard quickly

### Performance
- ✅ Page load times acceptable
- ✅ No excessive re-renders
- ✅ API calls are optimized
- ✅ UI feels responsive

---

## Quick Commands Reference

```bash
# 1. Update imports
node scripts/update-imports.js

# 2. Build and verify
npm run build

# 3. Lint check
npm run lint

# 4. Run dev server
npm run dev

# 5. View specific file changes (if using git)
git diff views/Tasks.tsx

# 6. Create backup before major changes
cp views/Tasks.tsx views/Tasks.backup.$(date +%Y%m%d).tsx
```

---

## Rollback Plan

### If Things Go Wrong

1. **Stop immediately** - Don't continue if errors appear
2. **Check git status** - See what changed
3. **Restore from backup** - Use .old.tsx files
4. **Report issue** - Document what went wrong
5. **Debug before retrying** - Fix root cause

### Emergency Rollback Commands

```bash
# Restore all old views
mv views/Tasks.old.tsx views/Tasks.tsx
mv views/ProjectDetail.old.tsx views/ProjectDetail.tsx

# Rebuild
npm run build

# Verify working
npm run dev
```

---

## Progress Tracking

**Started:** [Date]
**Completed Phases:** 0/6
**Current Phase:** Phase 1 - Import Updates
**Next Milestone:** Import migration complete
**Estimated Completion:** [Date + 2 weeks]

### Phase Completion Log

| Phase | Status | Date Completed | Notes |
|-------|--------|----------------|-------|
| 1. Import Updates | ⏳ Pending | - | Run scripts/update-imports.js |
| 2. Test New Views | ⏳ Pending | - | Tasks + ProjectDetail |
| 3. Migrate Remaining | ⏳ Pending | - | Dashboard, Profile, Documents |
| 4. Update Features | ⏳ Pending | - | Refactor feature components |
| 5. Cleanup | ⏳ Pending | - | Remove old directories |
| 6. Testing | ⏳ Pending | - | Full test suite |

---

**Last Updated:** 2026-02-07
**Next Review:** After Phase 1 completion
