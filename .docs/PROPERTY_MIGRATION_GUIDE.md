# Property Schema Migration Guide

## Overview

Properties have been migrated from embedded objects within projects to a separate `properties` collection. This provides better data separation, JSON field support, and follows relational database best practices.

## Schema Changes

### Old Structure (Legacy)
```typescript
project: {
  id: string;
  title: string;
  property: {
    address: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    description: string;
    // ... other fields directly embedded
  }
}
```

### New Structure
```typescript
// Projects Collection
project: {
  id: string;
  title: string;
  property_id: string;  // ← Links to properties collection
  agent_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  status: ProjectStatus;
  reference_nr: string;
}

// Properties Collection
property: {
  id: string;
  description: string;  // JSON array: [{type: 'propertydesc', content: '...'}, {type: 'neighbourhooddesc', content: '...'}]
  location: string;      // JSON: {street, streetNumber, postalCode, city, country, lat, lng}
  size: string;          // JSON: {lotSize, floorSize}
  media: string;         // JSON: {images[], floorplans[], videoUrl, virtualTourUrl}
  rooms: string;         // JSON: {bedrooms, bathrooms, garages, buildYear}
  specs: string;         // JSON: string[]
}
```

## Migration Status

✅ **Completed:**
- Types updated with PropertyDescription interface
- propertyService.ts with CRUD + parsing
- propertyHelpers.ts with JSON parse/stringify functions
- AdminDashboard.tsx - Property creation uses new schema
- PropertySearch.tsx - Searches and displays from properties collection
- projectDetail.tsx - Loads property via property_id
- Bulk import tool for properties
- Migration script (scripts/migrate_projects_to_new_schema.cjs)

⚠️ **Backward Compatible:**
- App.tsx - Creates legacy `property` object for compatibility
- All existing components continue to work with `project.property.*`

🔄 **To Be Updated (Future):**
- pdfGenerator.ts - Should use getPropertyParsed()
- brochureService.ts - Should use parsed property data
- geminiService.ts - Should use property_id
- Various view components

## How to Use New Schema

### Fetching Property Data
```typescript
import { getPropertyParsed } from '../services/propertyService';

// In your component
const [propertyData, setPropertyData] = useState<ParsedPropertyData | null>(null);

useEffect(() => {
  if (project.property_id) {
    getPropertyParsed(project.property_id).then(setPropertyData);
  }
}, [project.property_id]);

// Access parsed data
if (propertyData) {
  const address = propertyData.formattedAddress;  // "Street 123, 1234AB City"
  const bedrooms = propertyData.roomsData.bedrooms;
  const descriptions = propertyData.descriptions;  // Array of PropertyDescription
  const propertyDesc = descriptions.find(d => d.type === 'propertydesc')?.content;
  const neighbourhoodDesc = descriptions.find(d => d.type === 'neighbourhooddesc')?.content;
}
```

### Creating New Properties
```typescript
import { createProperty } from '../services/propertyService';

const property = await createProperty({
  descriptions: [
    { type: 'propertydesc', content: 'Modern villa with...' },
    { type: 'neighbourhooddesc', content: 'Quiet residential area...' }
  ],
  location: {
    street: 'Keizersgracht',
    streetNumber: '123',
    postalCode: '1015AB',
    city: 'Amsterdam',
    country: 'Netherlands'
  },
  size: {
    lotSize: 250,
    floorSize: 180
  },
  media: {
    images: ['image-id-1', 'image-id-2'],
    floorplans: [],
    videoUrl: null,
    virtualTourUrl: null
  },
  rooms: {
    bedrooms: 4,
    bathrooms: 2,
    garages: 1,
    buildYear: 1920
  },
  specs: ['Garden', 'Balcony', 'Roof terrace']
});

// Then link to project
await projectService.create({
  title: 'Canal House Amsterdam',
  property_id: property.$id,
  agent_id: agentId,
  price: 850000,
  status: 'active',
  reference_nr: 'AMS-2024-001'
});
```

## Backward Compatibility

The legacy `project.property` object is still populated in App.tsx for backward compatibility:

```typescript
// App.tsx creates this for legacy components
const legacyProperty = {
  address: d.address || 'Address not available',
  price: d.price || 0,
  description: d.description || '',
  bedrooms: d.bedrooms || 0,
  bathrooms: d.bathrooms || 0,
  sqft: d.sqft || 0,
  buildYear: d.buildYear || null,
  livingArea: d.livingArea || 0,
  garages: d.garages || 0,
  images: d.media || [],
};
```

This means existing code using `project.property.address` continues to work, but new code should migrate to using `property_id`.

## Migration Steps for Existing Projects

1. **Run Migration Script:**
   ```bash
   node scripts/migrate_projects_to_new_schema.cjs
   ```
   This converts existing projects to link to the properties collection.

2. **Import Sample Properties:**
   ```bash
   node scripts/bulk_import_properties.cjs scripts/sample_properties.json
   ```

3. **Update Components Gradually:**
   - Check if `project.property_id` exists
   - Load property via `getPropertyParsed(project.property_id)`
   - Use parsed data instead of `project.property.*`
   - Fallback to legacy structure if needed

## Best Practices

1. **Always check for property_id first:**
   ```typescript
   if (project.property_id) {
     // Use new schema
     const property = await getPropertyParsed(project.property_id);
   } else {
     // Fallback to legacy
     const address = project.property.address;
   }
   ```

2. **Use formatted helpers:**
   ```typescript
   const { formattedAddress } = await getPropertyParsed(property_id);
   // Returns: "Street 123, 1234AB City"
   ```

3. **Parse descriptions correctly:**
   ```typescript
   const descriptions = parseDescription(property.description);
   const mainDesc = descriptions.find(d => d.type === 'propertydesc')?.content;
   const neighbourhood = descriptions.find(d => d.type === 'neighbourhooddesc')?.content;
   ```

## Troubleshooting

**Q: I see "Address not available" in my UI**
A: The project hasn't been migrated yet. Run the migration script or manually update the project to include property_id.

**Q: Property data isn't loading**
A: Check that:
- Property exists in properties collection
- project.property_id is set correctly
- You're using `getPropertyParsed()` not just `getProperty()`

**Q: JSON parse errors**
A: Use the helper functions from propertyHelpers.ts instead of JSON.parse() directly. They include error handling and defaults.

## Files Reference

- **types.ts** - Interfaces (Property, PropertyDescription, etc.)
- **services/propertyService.ts** - CRUD operations
- **utils/propertyHelpers.ts** - JSON parsing utilities
- **scripts/migrate_projects_to_new_schema.cjs** - One-time migration
- **scripts/bulk_import_properties.cjs** - Bulk import tool
- **components/PropertySearch.tsx** - Property search example
- **views/ProjectDetail.tsx** - Property loading example
