# Relationeel Database Model - Implementation Guide

## Overzicht

De Estately applicatie gebruikt nu een volledig relationeel model in Appwrite waarbij de `projects` collectie de centrale spil vormt.

## Database Schema

### Core Entities

#### 1. **agencies**
Makelaarkantoren
```typescript
{
  $id: string
  name: string
  address: string
  logo?: string
  bankAccount?: string
  vatCode?: string
  agentIds?: string[]
  brochure?: string  // JSON
}
```

#### 2. **profiles**
Gebruikersprofielen (Agents, Buyers, Sellers)
```typescript
{
  $id: string
  userId: string         // Link naar Appwrite Auth User
  first_name: string
  last_name: string
  email: string
  role: UserRole         // 'admin' | 'agent' | 'buyer' | 'seller'
  phone?: string
  address?: string       // JSON: {street, city, postalCode, etc}
  id_number?: string
  avatar_url?: string
  agency_id?: string     // Relatie naar Agency
  bankAccount?: string
}
```

#### 3. **properties**
Vastgoed entiteiten
```typescript
{
  $id: string
  description: string    // JSON: PropertyDescription[]
  location: string       // JSON: {street, city, coordinates, etc}
  size: string          // JSON: {lotSize, floorSize}
  media: string         // JSON: {images[], videos, etc}
  specs: string         // JSON: string[]
  rooms: string         // JSON: {bedrooms, bathrooms, etc}
}
```

#### 4. **projects** (CENTRALE SPIL)
Projecten/transacties
```typescript
{
  $id: string
  title: string
  status: ProjectStatus
  price: number
  handover_date?: string
  reference_nr?: string
  property_id: string    // Relatie naar Property (1:1)
  agent_id: string       // Relatie naar Profile
  buyer_id?: string      // Relatie naar Profile
  seller_id?: string     // Relatie naar Profile
}
```

#### 5. **tasks**
Taken en mijlpalen
```typescript
{
  $id: string
  title: string
  description?: string
  task_type: TaskType            // 'user_action' | 'project_milestone'
  status: TaskStatus             // 'todo' | 'in_progress' | 'completed'
  project_id: string             // Relatie naar Project (REQUIRED)
  assignee_id?: string           // Relatie naar Profile (optional)
  due_date?: string
  required_doc_type?: string
  sign_request_id?: string       // Relatie naar SignRequest
  category?: string
}
```

**Belangrijke logica:**
- Als `assignee_id` leeg is → Agent-managed task
- Als `assignee_id` gevuld is → Task toegewezen aan specifieke gebruiker

#### 6. **documents**
Documenten (uploads & gegenereerd)
```typescript
{
  $id: string
  title: string
  type: string
  source: 'upload' | 'generated'
  file_id: string                // S3 reference
  verification_status: 'pending' | 'approved' | 'rejected'
  project_id: string             // Relatie naar Project
  owner_id: string               // Relatie naar Profile
  uploaded_at?: string
}
```

#### 7. **form_submissions**
Formulier inzendingen
```typescript
{
  $id: string
  title: string
  form_key: string
  form_data: string              // JSON
  status: FormStatus
  project_id: string             // Relatie naar Project
  submitter_id: string           // Relatie naar Profile
  assignee_id?: string           // Relatie naar Profile
  attachments?: string           // JSON: string[]
  meta?: string                  // JSON: metadata
}
```

#### 8. **sign_requests**
Handtekening verzoeken
```typescript
{
  $id: string
  parent_id: string              // ID van form_submission OF document
  parent_type: 'form' | 'document'
  status: SignRequestStatus      // 'pending' | 'completed' | 'rejected' | 'expired'
  required_signers: string       // JSON: Profile IDs[]
  signature_data: string         // JSON: {[profileId]: signatureBase64}
  project_id: string             // Relatie naar Project
  expires_at?: string
}
```

#### 9. **contract_templates**
Contract templates met placeholders
```typescript
{
  $id: string
  title: string
  content: string                // HTML/Markdown met {{placeholders}}
  category?: 'residential' | 'commercial' | 'rental'
  required_roles: string         // JSON: UserRole[]
  schema?: string                // JSON: validation schema
  created_by?: string            // Profile ID
}
```

## Data Mapping & Parsing

### Utility Functions

Gebruik de `dataMappers.ts` utilities voor conversie tussen database en applicatie formaten:

```typescript
import { PropertyMapper, ProfileMapper, FormSubmissionMapper } from '@/utils/dataMappers';

// Parse van database naar applicatie
const parsedProperty = PropertyMapper.parse(propertyDoc);

// Prepare voor opslag in database
const preparedData = PropertyMapper.prepare(propertyData);
```

### Available Mappers

- `PropertyMapper` - Voor Property documenten
- `ProfileMapper` - Voor Profile documenten
- `FormSubmissionMapper` - Voor FormSubmission documenten
- `SignRequestMapper` - Voor SignRequest documenten
- `ContractTemplateMapper` - Voor ContractTemplate documenten

## Services

### Nieuwe Relationele Services

#### TaskService (`services/taskService.ts`)
```typescript
import { taskService } from '@/services/taskService';

// Maak nieuwe task
const task = await taskService.create({
  title: 'Upload ID Document',
  task_type: 'user_action',
  project_id: projectId,
  assignee_id: buyerProfileId,
  due_date: '2026-03-01'
});

// Haal tasks op voor project
const projectTasks = await taskService.listByProject(projectId, {
  status: 'todo',
  taskType: 'user_action'
});

// Haal tasks op voor gebruiker
const userTasks = await taskService.listByAssignee(profileId);

// Update status
await taskService.updateStatus(taskId, 'completed');
```

#### DocumentRecordService (`services/documentRecordService.ts`)
```typescript
import { documentRecordService } from '@/services/documentRecordService';

// Maak nieuwe document record
const doc = await documentRecordService.create({
  title: 'ID Document',
  type: 'identification',
  source: 'upload',
  file_id: s3FileId,
  project_id: projectId,
  owner_id: profileId
});

// Haal documenten op van project
const projectDocs = await documentRecordService.listByProject(projectId, {
  source: 'upload',
  verificationStatus: 'pending'
});

// Filter op uploaded vs generated
const uploads = await documentRecordService.listUploaded(projectId);
const generated = await documentRecordService.listGenerated(projectId);
```

#### SignRequestService (`services/signRequestService.ts`)
```typescript
import { signRequestService } from '@/services/signRequestService';

// Maak nieuwe sign request
const signReq = await signRequestService.create({
  parent_id: formSubmissionId,
  parent_type: 'form',
  required_signers: [buyerProfileId, sellerProfileId],
  project_id: projectId
});

// Voeg handtekening toe
await signRequestService.addSignature(
  signReqId,
  profileId,
  signatureBase64
);

// Check status
const hasSigned = await signRequestService.hasSigned(signReqId, profileId);
const missingSigners = await signRequestService.getMissingSigners(signReqId);
```

### Property Service (`services/propertyService.ts`)

Bestaand, maar gebruik nu de PropertyMapper:
```typescript
import { getPropertyParsed } from '@/services/propertyService';

const parsedProperty = await getPropertyParsed(propertyId);
console.log(parsedProperty.location.city);
console.log(parsedProperty.rooms.bedrooms);
```

## Querying met Appwrite

### Type-safe Query Builder

```typescript
import { Query } from 'appwrite';

// Equal
Query.equal('project_id', projectId)
Query.equal('status', ['pending', 'approved'])

// Relational filtering
Query.equal('assignee_id', profileId)
Query.equal('owner_id', profileId)

// Status filtering
Query.equal('status', 'completed')
Query.notEqual('status', 'cancelled')

// Date filtering
Query.greaterThan('due_date', new Date().toISOString())
Query.lessThan('expires_at', futureDateISO)

// Sorting
Query.orderDesc('$createdAt')
Query.orderAsc('title')

// Pagination
Query.limit(25)
Query.offset(50)
```

## Migration Path

### Van Legacy naar Relationeel Model

1. **Tasks**: Van `assignedTasks` JSON in Profile → `tasks` collectie
2. **Documents**: Van `userDocuments` JSON in Profile → `documents` collectie
3. **Properties**: Van embedded `property` object in Project → `properties` collectie

### Backwards Compatibility

Legacy interfaces zijn beschikbaar voor geleidelijke migratie:
- `LegacyProject` - Oude project structuur met embedded property
- Oude `profileService` methods blijven werken maar zijn deprecated

## Best Practices

1. **Gebruik altijd de Mappers** voor JSON conversie
2. **Query op relaties** met `equal('..._id', value)`
3. **Filter server-side** met Appwrite Queries waar mogelijk
4. **Parse JSON fields** met `parseAppwriteDoc<T>()` of specifieke Mapper
5. **Valideer relaties** voordat je documenten aanmaakt

## TypeScript Types

Alle types zijn gedefinieerdGebruik in `types.ts`:
- Base interfaces (met JSON strings)
- `Parsed*` interfaces (met geparsete objecten)
- Enums voor status fields
- Helper utilities (`parseJsonField`, `stringifyJsonField`)

```typescript
import type {
  Project,
  Property,
  ParsedProperty,
  Task,
  DocumentRecord,
  SignRequest,
  ParsedSignRequest
} from '@/types';
```
