# Template Renderer met Dynamische Data Sources

## Overzicht

Complete implementatie voor dynamische image data-source binding tussen GrapesJS, Appwrite en S3.

## Architectuur

### 1. Frontend (GrapesJS)
**Bestand:** `views/BlockBuilder.tsx`

**Features:**
- Custom image component met `data-appwrite-src` trait
- Dropdown selector voor data bronnen
- Visual placeholder feedback in de editor
- Ondersteunde bronnen:
  - `agency.logo` - Agency logo
  - `project.coverImageId` - Project cover afbeelding
  - `user.avatar` - User avatar
  - `profiles.avatar` - Profile avatar

**Gebruik in Editor:**
1. Sleep een image component op het canvas
2. Selecteer de image
3. In de Properties panel, kies "Data Bron"
4. Selecteer de gewenste bron (bijv. "Agency Logo")
5. Editor toont een placeholder met de naam van de bron

### 2. Backend Renderer
**Bestand:** `services/templateRenderer.ts`

**Core Functies:**

```typescript
renderAppwriteContent(html, dataObject, s3BaseUrl, options)
```

**Proces:**
1. Parse HTML met jsdom
2. Zoek alle elementen met `data-appwrite-src` attribuut
3. Resolve pad in dataObject (bijv. `agency.logo` → `"agency/logo.png"`)
4. Construeer S3 URL: `${s3BaseUrl}/${resolvedPath}`
5. Set `src` attribuut met finale URL
6. Fallback handling indien data niet gevonden

**Options:**
- `fallbackImage` - Placeholder indien data missing
- `hideOnMissing` - Verberg element indien data missing
- `debug` - Console logging

### 3. Render Service
**Bestand:** `services/renderService.ts`

**API Methods:**

```typescript
// Basic rendering met Appwrite data
renderService.renderTemplate(templateHtml, {
  projectId: '123',
  agencyId: '456',
  userId: '789',
  s3BaseUrl: 'https://bucket.s3.amazonaws.com'
})

// Render saved template by ID
renderService.renderTemplateById(templateId, options)

// Preview met mock data
renderService.previewTemplate(templateHtml, mockData)

// Batch render meerdere projecten
renderService.batchRenderProjects(templateHtml, projectIds)
```

## Data Object Structuur

### Verwachte JSON van Appwrite:

```json
{
  "agency": {
    "logo": "agency/logo.png",
    "name": "Estate Agency Pro",
    "address": "123 Main Street",
    "bankAccount": "NL12BANK1234567890",
    "vatCode": "NL123456789B01"
  },
  "project": {
    "coverImageId": "projects/cover-123.jpg",
    "title": "Luxury Apartment",
    "address": "456 Park Avenue",
    "price": 450000,
    "bedrooms": 3,
    "bathrooms": 2,
    "sqft": 1500,
    "media": [
      "projects/img1.jpg",
      "projects/img2.jpg",
      "projects/img3.jpg"
    ]
  },
  "user": {
    "avatar": "profiles/user-avatar-456.jpg",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+31612345678",
    "role": "AGENT"
  },
  "profiles": {
    "avatar": "profiles/default-avatar.jpg"
  }
}
```

## HTML Template Voorbeeld

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .logo { width: 150px; height: 150px; object-fit: contain; }
    .cover { width: 100%; max-width: 600px; }
    .avatar { width: 80px; height: 80px; border-radius: 50%; }
  </style>
</head>
<body>
  <!-- Agency Logo -->
  <img
    src="https://placeholder.com/150"
    data-appwrite-src="agency.logo"
    alt="Agency Logo"
    class="logo"
  />

  <!-- Project Cover -->
  <img
    src="https://placeholder.com/600x400"
    data-appwrite-src="project.coverImageId"
    alt="Property Cover"
    class="cover"
  />

  <!-- User Avatar -->
  <img
    src="https://placeholder.com/80"
    data-appwrite-src="user.avatar"
    alt="Agent Avatar"
    class="avatar"
  />
</body>
</html>
```

## Rendering Output

Na rendering worden alle `data-appwrite-src` attributen vervangen:

```html
<img
  src="https://bucket.s3.eu-central-1.amazonaws.com/agency/logo.png"
  data-appwrite-src="agency.logo"
  alt="Agency Logo"
  class="logo"
/>
```

## Gebruik in Code

### Frontend (React Component)

```typescript
import { renderService } from '../services/renderService';

// Render template met project data
const renderedHtml = await renderService.renderTemplate(
  templateHtml,
  {
    projectId: project.$id,
    s3BaseUrl: import.meta.env.VITE_S3_BASE_URL
  }
);

// Preview met mock data
const preview = await renderService.previewTemplate(templateHtml);
```

### Backend/API

```typescript
import { renderAppwriteContent, prepareAppwriteDataForRendering } from './services/templateRenderer';

// Fetch data from Appwrite
const agency = await databases.getDocument(DATABASE_ID, 'agency', agencyId);
const project = await databases.getDocument(DATABASE_ID, 'projects', projectId);
const user = await databases.getDocument(DATABASE_ID, 'profiles', userId);

// Prepare data object
const dataObject = prepareAppwriteDataForRendering(agency, project, user);

// Render
const rendered = renderAppwriteContent(
  templateHtml,
  dataObject,
  'https://your-bucket.s3.amazonaws.com'
);
```

## Test Page

Bezoek `/admin/renderer-test` voor een interactieve test interface.

**Features:**
- Live HTML editor
- Real-time preview
- Project ID input voor echte data
- Demo mode met mock data
- Download rendered HTML
- Copy to clipboard

## Error Handling

### Missing Data
- **Default:** Fallback placeholder image
- **Optional:** `hideOnMissing: true` verbergt element

### Invalid Paths
- Console warning (debug mode)
- Fallback image gebruikt
- Original template blijft intact

### Rendering Failures
- Error thrown met details
- Original HTML geretourneerd
- Error logged voor debugging

## Environment Variables

```env
VITE_S3_BASE_URL=https://your-bucket.s3.eu-central-1.amazonaws.com
VITE_APPWRITE_ENDPOINT=https://appwrite.code045.nl/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_DATABASE_ID=estately-main
```

## Dependencies

```json
{
  "jsdom": "^24.0.0",
  "@types/jsdom": "^21.1.6",
  "grapesjs": "latest",
  "@grapesjs/studio-sdk": "latest",
  "@grapesjs/studio-sdk-plugins": "latest"
}
```

## Uitbreidingen

### Extra Data Sources Toevoegen

1. **In BlockBuilder.tsx:**
```typescript
const dataSourceOptions = [
  // ... bestaande opties
  { id: 'contract.logo', name: 'Contract Logo' },
  { id: 'template.headerImage', name: 'Template Header' }
];
```

2. **In prepareAppwriteDataForRendering:**
```typescript
return {
  // ... bestaande data
  contract: {
    logo: contract?.logo || null,
    // ...
  }
};
```

### Custom Resolvers

Voor complexe paths (arrays, nested objects):

```typescript
// In templateRenderer.ts
function resolveObjectPath(obj: any, path: string): any {
  // Voeg custom logic toe voor array indices
  // bijv. "project.media.0" voor eerste afbeelding
  if (path.includes('[')) {
    // Handle array syntax
  }
  // ... existing code
}
```

## Troubleshooting

**Template niet renderen?**
- Check console voor errors
- Verify S3 URL in .env
- Test met preview mode eerst

**Afbeeldingen niet laden?**
- Verify S3 bucket permissions (CORS)
- Check data-appwrite-src syntax
- Verify Appwrite data structure

**Placeholder blijft zichtbaar?**
- Data mogelijk niet in dataObject
- Check attribuut naam in Appwrite
- Verify S3 path correct is

## Performance

- Batch rendering voor multiple projecten
- Caching van Appwrite data mogelijk
- Lazy loading van S3 images in browser

## Security

- S3 bucket moet public-read zijn of presigned URLs gebruiken
- Sanitize HTML input before rendering
- Validate data-appwrite-src paths
- Rate limiting op render endpoint aanbevolen
