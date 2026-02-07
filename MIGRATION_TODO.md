# Property Schema Migration - Files Requiring Updates

## ✅ Status: Code Fixed for Backward Compatibility

All code continues to work because App.tsx creates a legacy `property` object populated from available data. No breaking changes.

## Files Using `project.property.*` (Legacy Access Pattern)

### High Priority - Core Services
These should be updated to use `property_id` and `getPropertyParsed()` for better data access:

1. **services/brochureService.ts**
   - Lines: 124-131
   - Uses: `project.property.address`, `price`, `description`, `bedrooms`, `bathrooms`, `sqft`
   - Action: Load property via `getPropertyParsed(project.property_id)` if available

2. **services/geminiService.ts**
   - Lines: 40-41
   - Uses: `project.property.address`, `price`
   - Action: Load property data for AI context

3. **utils/pdfGenerator.ts**
   - Lines: 49, 148, 220, 240, 244, 351-353, 370
   - Uses: Multiple property fields for PDF generation
   - Action: Accept ParsedPropertyData parameter or load internally

### Medium Priority - View Components

4. **views/ProjectDetail.tsx**
   - Line: 594
   - Uses: `project.property.address` for location insights
   - Status: Already has propertyData loading, just needs to use it
   - Action: Replace `project.property.address` with `propertyData?.formattedAddress`

5. **views/UserDashboard.tsx**
   - Lines: 249, 255, 1550, 1569
   - Uses: `project.property.address`, `price`
   - Action: Load property via property_id when available

6. **views/Contracts.tsx**
   - Lines: 499, 690
   - Uses: `project.property.address`, `price`
   - Action: Display from loaded property or legacy fallback

7. **views/UsersManagement.tsx**
   - Line: 380
   - Uses: `project.property.address` in select options
   - Action: Format address from property_id or legacy

8. **views/AdminDashboard.tsx**
   - Lines: 339, 340, 450, 455
   - Uses: `project.property.address`, `price` for editing/display
   - Status: Create flow already updated, edit flow needs update
   - Action: Load property for editing existing projects

### Low Priority - UI Components

9. **components/project/ProjectHeader.tsx**
   - Lines: 100, 108
   - Uses: `project.property.address`, `price` for header display
   - Action: Use loaded property data in parent (ProjectDetail)

10. **components/project/ProjectProperty.tsx**
    - Lines: 99, 114, 118, 378, 386-387
    - Uses: Multiple property fields for property details display
    - Action: Already receives property data, may just need type updates

11. **components/project/modals/GeneralInfoModal.tsx**
    - Line: 61
    - Uses: `project.property.price` for form default
    - Action: Load property for accurate data

12. **services/contractTemplatesService.ts**
    - Lines: 147, 148, 284, 285
    - Uses: `property.address`, `property.price` for placeholder replacement
    - Action: Load property data when processing templates

13. **components/pdf/pages/CoverPage.tsx**
    - Line: 89
    - Uses: `property.price` (already from parsed property)
    - Status: ✅ Already using correct structure

## Migration Strategy

### Phase 1: Non-Breaking Updates (Current)
✅ App.tsx maintains legacy compatibility
✅ Types documented with deprecation warnings
✅ PropertyService ready for use
✅ Migration guide created

### Phase 2: Service Layer (Recommended Next)
1. Update brochureService to use getPropertyParsed()
2. Update geminiService to use property data
3. Update pdfGenerator to accept ParsedPropertyData

### Phase 3: View Components
1. Update ProjectDetail to use propertyData everywhere
2. Update UserDashboard with property loading
3. Update AdminDashboard edit flow
4. Update remaining views

### Phase 4: Cleanup (Future)
1. Remove legacy `property` object from Project interface
2. Remove backward compatibility code from App.tsx
3. Update all components to require property_id

## Testing Checklist

For each updated file:
- [ ] Works with new projects (property_id set)
- [ ] Works with legacy projects (embedded property)
- [ ] Gracefully handles missing data
- [ ] TypeScript types are correct
- [ ] No console errors in browser

## Quick Reference: Replacing Legacy Access

**Before:**
```typescript
const address = project.property.address;
const bedrooms = project.property.bedrooms;
```

**After:**
```typescript
// Option 1: Load in component
const [propertyData, setPropertyData] = useState<ParsedPropertyData | null>(null);
useEffect(() => {
  if (project.property_id) {
    getPropertyParsed(project.property_id).then(setPropertyData);
  }
}, [project.property_id]);

const address = propertyData?.formattedAddress || project.property.address;
const bedrooms = propertyData?.roomsData.bedrooms || project.property.bedrooms;

// Option 2: Pass down from parent
// If parent (like ProjectDetail) already loads propertyData, pass it as prop
```

## Impact Assessment

**Breaking Changes:** None - All code continues to work
**Performance:** Slightly improved - Separate collections, better caching potential
**Data Quality:** Significantly improved - Structured JSON fields, validation
**Maintainability:** Improved - Clear separation of concerns
**Future-proof:** Yes - Easier to extend property data without project schema changes
