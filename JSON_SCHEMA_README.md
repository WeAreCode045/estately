# JSON-Based Property Schema Migration

## Overview

The application now uses a **JSON-based schema** for flexible property and project data management instead of individual Appwrite attributes.

## Architecture

### Collections Created

1. **agencies** - Real estate agencies
2. **profiles** - User profiles
3. **properties** - Property data with JSON fields ✨
4. **projects** - Project management linked to properties
5. **tasks** - Project tasks
6. **documents** - Document management
7. **form_submissions** - Form submissions
8. **sign_requests** - Signature workflows
9. **contract_templates** - Contract templates with placeholders

### Property Schema

Properties store nested data as JSON strings:

```typescript
interface Property {
  description: string;
  location: string;      // JSON: {street, streetNumber, postalCode, city, country, lat, lng}
  size: string;          // JSON: {lotSize, floorSize}
  media: string;         // JSON: {images[], floorplans[], videoUrl, virtualTourUrl}
  rooms: string;         // JSON: {bedrooms, bathrooms, garages, buildYear}
  specs: string;         // JSON: string[] amenities
  neighbourhood: string; // JSON: {description, nearbyPlaces[]}
}
```

### Project-Property Relationship

Projects link to properties via `property_id`:

```typescript
interface Project {
  title: string;
  status: ProjectStatus;
  price: number;
  handover_date?: string;
  reference_nr: string;
  property_id: string;  // References Property.$id
  agent_id: string;
  buyer_id?: string;
  seller_id?: string;
}
```

## Usage

### Creating Properties

```typescript
import { createProperty } from './services/propertyService';

const property = await createProperty({
  description: 'Modern villa in Amsterdam',
  location: {
    street: 'Keizersgracht',
    streetNumber: '123',
    postalCode: '1015AB',
    city: 'Amsterdam',
    country: 'Netherlands',
    lat: 52.3676,
    lng: 4.9041
  },
  size: {
    lotSize: 250,
    floorSize: 180
  },
  media: {
    images: ['img1.jpg', 'img2.jpg'],
    floorplans: ['floor.pdf'],
    videoUrl: 'https://youtube.com/watch?v=example',
    virtualTourUrl: null
  },
  rooms: {
    bedrooms: 4,
    bathrooms: 2,
    garages: 1,
    buildYear: 1920
  },
  specs: ['Tuin', 'Balkon', 'Garage'],
  neighbourhood: {
    description: 'Quiet canal-side location',
    nearbyPlaces: ['Albert Heijn (200m)', 'Dam Square (500m)']
  }
});
```

### Reading Properties with Parsed Data

```typescript
import { getPropertyParsed } from './services/propertyService';

const parsed = await getPropertyParsed(property.$id);

console.log(parsed.formattedAddress);  // "Keizersgracht 123, 1015AB Amsterdam"
console.log(parsed.roomsData.bedrooms); // 4
console.log(parsed.sizeData.floorSize); // 180
console.log(parsed.specsData);          // ['Tuin', 'Balkon', 'Garage']
```

### Creating Projects

Projects now create a property first, then link to it:

```typescript
// 1. Create property
const property = await createProperty({ ...propertyData });

// 2. Create project with property_id
const project = await projectService.create({
  title: 'Villa Keizersgracht',
  status: ProjectStatus.ACTIVE,
  price: 750000,
  handover_date: '2026-06-01T00:00:00Z',
  reference_nr: 'REF-123456',
  property_id: property.$id,  // Link to property
  agent_id: currentUser.id,
  buyer_id: '',
  seller_id: ''
});
```

## Services

### propertyService.ts

- `createProperty(data)` - Create property with JSON fields
- `getProperty(id)` - Get raw property document
- `getPropertyParsed(id)` - Get property with parsed JSON fields
- `updateProperty(id, data)` - Update property
- `deleteProperty(id)` - Delete property
- `listProperties(queries)` - List all properties

### propertyHelpers.ts

Parse/stringify utilities for JSON fields:
- `parseLocation()` / `stringifyLocation()`
- `parseSize()` / `stringifySize()`
- `parseMedia()` / `stringifyMedia()`
- `parseRooms()` / `stringifyRooms()`
- `parseSpecs()` / `stringifySpecs()`
- `parseNeighbourhood()` / `stringifyNeighbourhood()`
- `formatAddress()` - Builds formatted address string

## Migration

### For New Projects

✅ **AdminDashboard.tsx** already updated to create properties using new schema

### For Existing Projects

Existing projects may have property data stored directly in the project document (legacy structure). Components maintain backwards compatibility:

```typescript
// PropertyBrochure.tsx example
if (projectDoc.property_id) {
  // New schema: fetch property from properties collection
  const propertyData = await getPropertyParsed(projectDoc.property_id);
  // Use propertyData.locationData, propertyData.roomsData, etc.
} else {
  // Legacy: use project.bedrooms, project.address, etc.
}
```

### Migration Script (Optional)

To migrate existing projects to new schema:

```bash
node scripts/migrate_existing_properties.cjs  # TODO: Create this script
```

## Benefits

✅ **Flexible Schema** - Add/remove fields without Appwrite attribute changes
✅ **Nested Data** - Store complex structures (arrays, objects)
✅ **Type Safety** - TypeScript interfaces with parseJsonField helper
✅ **Backwards Compatible** - Old projects continue working
✅ **Scalable** - Reduce attribute count per collection
✅ **Maintainable** - Centralized parsing logic in helpers

## Contract Templates

Templates support {{placeholder}} substitution:

```typescript
import { contractTemplatesService } from './services/contractTemplatesService';

// Create template
const template = await contractTemplatesService.createContractTemplate({
  title: 'Koopovereenkomst',
  content: 'Verkoper: {{seller_name}}, Adres: {{property_address}}',
  category: 'residential',
  required_roles: ['buyer', 'seller'],
  schema: null,
  created_by: userId
});

// Generate contract from template
const contract = await contractTemplatesService.generateContractFromTemplate(
  template.$id,
  {
    seller_name: 'John Doe',
    property_address: 'Keizersgracht 123, Amsterdam'
  }
);
```

## Files

**Types:** `types.ts` - All interface definitions
**Services:**
- `services/propertyService.ts` - Property CRUD with JSON parsing
- `services/signRequestService.ts` - Signature management
- `services/contractTemplatesService.ts` - Template management

**Helpers:**
- `utils/propertyHelpers.ts` - Property JSON utilities
- `utils/agencyHelpers.ts` - Agency JSON utilities

**Scripts:**
- `scripts/create_json_schema.cjs` - Create all 9 collections
- `scripts/verify_schema.cjs` - Verify collections exist
- `scripts/test_property_service.cjs` - Test property CRUD

**Components:**
- `views/AdminDashboard.tsx` - ✅ Updated to use propertyService
- `views/PropertyBrochure.tsx` - ✅ Updated to use getPropertyParsed
- `components/PropertyTemplate.tsx` - Property display template

## Testing

```bash
# Verify collections exist
node scripts/verify_schema.cjs

# Test property CRUD operations
node scripts/test_property_service.cjs

# Lint TypeScript
npm run lint
```

## Next Steps

- [ ] Update AdminDashboard property edit modal
- [ ] Update ProjectDetail to display property data
- [ ] Update brochureService to use propertyService
- [ ] Update geminiService to use property data
- [ ] Create migration script for existing projects
- [ ] Add property search/filter UI
- [ ] Add bulk property import tool
