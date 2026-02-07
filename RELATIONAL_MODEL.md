# Estately Relational Database Model

## Overzicht

Estately gebruikt een volledig relationeel model in Appwrite waarin alle data wordt opgeslagen in gespecialiseerde collecties met onderlinge relaties. Dit document beschrijft de nieuwe architectuur en workflows.

## Database Collecties

### Core Collecties

1. **projects** - Commerciële project-entiteiten
   - Minimale fields: `title`, `price`, `sellerId`, `managerId`, `status`, `buyerId`, `handover_date`, `property_id`
   - Relaties: → `properties` (via `property_id`)

2. **properties** - Fysieke vastgoed data
   - JSON fields: `description`, `location`, `size`, `media`, `rooms`, `specs`
   - Parse met `JSON.parse()` bij ophalen, `JSON.stringify()` bij opslaan

3. **tasks** - Alle taken in het systeem
   - Relaties: `project_id`, `assignee_id` (Profile ID)
   - Types: `document_upload`, `form_submission`, `general`, `signature_required`
   - Status: `todo`, `in_progress`, `completed`, `cancelled`
   - Special fields: `required_doc_type`, `sign_request_id`, `due_date`

4. **documents** - Document metadata en records
   - Fields: `title`, `type`, `source`, `file_id`, `project_id`, `owner_id`, `verification_status`
   - Source types: `upload`, `generated`, `template`
   - Relaties: → S3 storage (via `file_id`)

5. **sign_requests** - Handtekening verzoeken
   - Fields: `parent_id`, `parent_type`, `status`, `required_signers`, `signature_data`, `projectId`
   - Parent types: `document`, `form`
   - JSON fields: `required_signers` (array), `signature_data` (object)

6. **form_submissions** - Formulier inzendingen
   - Fields: `projectId`, `formKey`, `title`, `data`, `attachments`, `submittedByUserId`, `assignedToUserId`, `status`
   - Relaties: → `projects`, → `profiles`

7. **contract_templates** - Contract sjablonen
   - Fields: `title`, `content`, `category`, `required_roles`, `schema`, `created_by`
   - Content: HTML/Markdown met `{{placeholder}}` syntax

## Workflows

### 1. Requirement Workflow (Document Upload)

**Doel:** Gebruiker moet een document uploaden (bijv. paspoort)

**Stappen:**

```typescript
// 1. Create Task with required_doc_type
await taskService.create({
  title: 'Upload Passport',
  taskType: 'document_upload',
  projectId: projectId,
  assignee_id: userId,
  required_doc_type: 'passport',
  status: 'todo'
});

// 2. User uploads document
await documentService.uploadDocument(userId, 'passport', projectId, file);
// → Creates document record
// → Finds task with matching required_doc_type
// → Updates task status to 'completed'
```

**Implementatie:** Zie `documentService.executeAssignment()` en `documentService.uploadDocument()`

### 2. Template to Contract Workflow

**Doel:** Genereer contract vanuit sjabloon en start handtekeningstroom

**Stappen:**

```typescript
// 1. Generate contract from template
const { documentId, signRequestId } = await documentService.generateContractFromTemplate(
  templateId,
  projectId,
  { custom_field: 'value' } // Optional custom placeholders
);

// Template content with placeholders:
// "{{project_title}} for {{property_address}} at {{project_price}}"
// → Replaced with actual project data

// 2. Document is created in documents collection (source: 'generated')
// 3. Sign request is created with required signers from template
// 4. Signers can now sign via signRequestService
```

**Placeholder Data:**
- `project_title`, `project_price`, `project_id`
- `property_address`, `property_size`
- `seller_id`, `buyer_id`
- `date` (current date)
- + custom data passed in

**Implementatie:** Zie `documentService.generateContractFromTemplate()`

### 3. Form Submission Workflow

**Doel:** Gebruiker vult formulier in

```typescript
// 1. Assign form to user (creates submission + optional task)
await projectFormsService.assignFormToUser(formDef, projectId, userId);
// → Creates form_submission with status 'assigned'
// → If autoCreateTaskForAssignee: creates task in tasks collection

// 2. User submits form
await projectFormsService.updateSubmission(submissionId, {
  data: formData,
  status: 'submitted'
});

// 3. If signature required → create sign_request
if (formDef.needSignatureFromBuyer || formDef.needSignatureFromSeller) {
  await createSignRequest({
    parent_id: submissionId,
    parent_type: 'form',
    projectId: projectId,
    required_signers: [buyerId, sellerId]
  });
}
```

## Service API's

### taskService

```typescript
// Create task
await taskService.create({
  title: string,
  description?: string,
  taskType: 'document_upload' | 'form_submission' | 'general' | 'signature_required',
  status: 'todo' | 'in_progress' | 'completed',
  projectId: string,
  assignee_id?: string,
  due_date?: string,
  required_doc_type?: string,
  category?: string
});

// List tasks
const tasks = await taskService.listByProject(projectId, {
  assigneeId?: string,
  status?: string,
  taskType?: string
});

// Update status
await taskService.updateStatus(taskId, 'completed');
```

### documentService

```typescript
// Upload document (auto-completes related task)
const { fileUrl, fileId } = await documentService.uploadDocument(
  userId,
  definitionId,
  projectId,
  file
);

// Generate contract from template
const { documentId, signRequestId } = await documentService.generateContractFromTemplate(
  templateId,
  projectId,
  customData?
);

// Approve/Reject document (updates task)
await documentService.approveDocument(userId, taskId);
await documentService.rejectDocument(userId, taskId);
```

### projectFormsService

```typescript
// Create submission
await projectFormsService.createSubmission({
  projectId: string,
  formKey: string,
  title: string,
  data: object,
  assignedToUserId?: string,
  status: 'draft' | 'assigned' | 'submitted',
  meta?: object
});

// Assign form (creates submission + optional task)
await projectFormsService.assignFormToUser(formDef, projectId, userId);
```

### signRequestService

```typescript
// Create sign request
await createSignRequest({
  parent_id: string,
  parent_type: 'document' | 'form',
  projectId: string,
  required_signers: string[] // Profile IDs
});

// Add signature
await addSignature(signRequestId, profileId, signatureUrl);

// Check completion
const request = await getSignRequest(signRequestId);
const isComplete = request.status === 'completed';
```

## Data Fetching Patterns

### Property Data

```typescript
// Get property data
const property = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROPERTIES, propertyId);

// Parse JSON fields
const locationData = JSON.parse(property.location);
const sizeData = JSON.parse(property.size);
const mediaData = JSON.parse(property.media);
const roomsData = JSON.parse(property.rooms);
const specsData = JSON.parse(property.specs);

// Or use helper
import { getPropertyParsed } from './api/propertyService';
const propertyData = await getPropertyParsed(propertyId);
```

### Tasks for Project

```typescript
// Get all tasks for project
const tasks = await taskService.listByProject(projectId);

// Filter by assignee
const userTasks = await taskService.listByProject(projectId, {
  assigneeId: userId
});

// Filter by status and type
const pendingUploads = await taskService.listByProject(projectId, {
  status: 'todo',
  taskType: 'document_upload'
});
```

### Documents for Project

```typescript
// Get all documents via documentRecordService
const documents = await documentRecordService.listByProject(projectId);

// Filter by type
const contracts = documents.filter(d => d.type === 'Contract');

// Get file URL
const fileUrl = await s3Service.getPresignedUrl(document.fileId);
```

## Migration Checklist

- [x] Projects/Properties split met relaties
- [x] Tasks in aparte collectie
- [x] Documents in aparte collectie
- [x] Sign requests relationeel
- [x] Form submissions relationeel
- [x] Contract templates met placeholder systeem
- [x] Requirement Workflow geïmplementeerd
- [x] Template to Contract Workflow geïmplementeerd
- [ ] Remove legacy `project.tasks` JSON arrays
- [ ] Remove legacy `profile.assignedTasks` JSON arrays
- [ ] Update all views to use relational queries
- [ ] Add proper permissions per collection

## TypeScript Interfaces

Zie `/types.ts` voor alle interface definities:
- `Task`, `TaskStatus`, `TaskType`
- `DocumentRecord`, `DocumentSource`
- `SignRequest`, `SignatureData`
- `FormSubmission`, `FormStatus`
- `ContractTemplate`
- `Project`, `Property`

## Permissions & Security

Elke collectie heeft eigen permissions:
- **projects**: Read/Write based on sellerId, buyerId, managerId
- **tasks**: Read/Write based on projectId + assignee_id
- **documents**: Read based on projectId, Write based on owner_id
- **sign_requests**: Read based on projectId, Write based on required_signers

Configureer permissions in Appwrite console per collectie.
