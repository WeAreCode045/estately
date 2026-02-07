# Estately Data Architecture Refactoring

## Overview
The application has been refactored to separate property data from project data, creating a more flexible and scalable architecture.

## New Structure

### Collections

#### 1. **properties** (NEW)
Stores all property-related information:
- **Size**: `lotSize`, `floorSize`
- **Location**: `street`, `streetNumber`, `postalCode`, `city`, `country`, `latitude`, `longitude`
- **Media**: `images[]`, `floorplans[]`, `videoUrl`, `virtualTourUrl`
- **Specs**: `specs[]` (array of property specifications)
- **Rooms**: `bathrooms`, `bedrooms`, `garages`
- **Description**: `description`
- **Neighbourhood**: `neighbourhoodDescription`, `nearbyPlaces[]`
- **Additional**: `buildYear`

#### 2. **projects** (UPDATED)
Core project/transaction data:
- `agencyId` - Link to agency
- `agentId` - Assigned agent
- `sellerId` - Property seller
- `buyerId` - Property buyer (optional)
- **`propertyId`** - NEW: Link to properties collection
- `price` - Transaction price
- `title` - Project title
- `handoverDate` - Planned handover
- `status` - Project status
- `referenceNr` - Reference number
- `brochure` - Brochure settings

**Legacy fields maintained for backwards compatibility**:
- `address`, `description`, `bedrooms`, `bathrooms`, `sqft`, `livingArea`, `buildYear`, `garages`, `coverImageId`, `gallery`

## Migration Steps

### 1. Create Properties Collection
```bash
node scripts/create_properties_collection.cjs
```

This creates the `properties` collection with all required attributes.

### 2. Add propertyId to Projects
```bash
node scripts/add_propertyId_to_projects.cjs
```

This adds the `propertyId` attribute to the `projects` collection.

### 3. Data Migration (Optional)
If you have existing projects with property data embedded, you'll need to:
1. Create property documents in the `properties` collection
2. Update project documents with the corresponding `propertyId`

Example migration script:
```javascript
// Pseudo-code
for each project:
  - Extract property data (address, rooms, etc.)
  - Create property document
  - Update project with propertyId
```

## TypeScript Types

### Property Interface
```typescript
interface Property {
  $id: string;
  lotSize?: number;
  floorSize?: number;
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  floorplans?: string[];
  videoUrl?: string;
  virtualTourUrl?: string;
  specs?: string[];
  bathrooms?: number;
  bedrooms?: number;
  garages?: number;
  description?: string;
  neighbourhoodDescription?: string;
  nearbyPlaces?: string[];
  buildYear?: number;
}
```

### Updated Project Interface
```typescript
interface Project {
  $id: string;
  id: string;
  agencyId: string;
  agentId: string;
  sellerId: string;
  buyerId?: string;
  propertyId?: string; // NEW
  price: number;
  title: string;
  handoverDate?: string;
  status: ProjectStatus;
  referenceNr?: string;
  brochure?: any;
  // ... legacy fields
}
```

## Component Updates

### PropertyBrochure
The `PropertyBrochure` component now:
1. Fetches project data (always)
2. Fetches property data IF `project.propertyId` exists
3. Merges data with fallback to legacy project fields

```typescript
// Priority: property data > project legacy fields
bedrooms: property?.bedrooms || project.bedrooms
```

### PropertyTemplate
No breaking changes - still accepts the same props, but the data source is now more flexible.

## Benefits

### 1. Separation of Concerns
- Properties can exist independently of projects
- Multiple projects can reference the same property (e.g., rental + sale)

### 2. Data Integrity
- Property information is centralized
- Updates to property details don't require updating multiple projects

### 3. Scalability
- Easily add property-specific features (virtual tours, floorplans)
- Better structure for property search/filtering

### 4. Backwards Compatibility
- Existing projects continue to work
- Gradual migration possible

## Environment Variables

Add to your `.env`:
```env
VITE_APPWRITE_COLLECTION_PROPERTIES=properties
```

## Testing

After migration, verify:
1. ✅ Existing projects still display correctly (legacy data)
2. ✅ New projects with `propertyId` fetch and display property data
3. ✅ PropertyBrochure component works for both cases
4. ✅ All property fields display correctly

## Future Enhancements

With this structure, you can now:
- Add property listings page (independent of projects)
- Implement property search/filters
- Create property CMS
- Add property history/analytics
- Support multiple transactions per property

## Support

For questions or issues with the migration, check:
- TypeScript types in `types.ts`
- Collection structure in `services/appwrite.ts`
- Component implementation in `views/PropertyBrochure.tsx`
