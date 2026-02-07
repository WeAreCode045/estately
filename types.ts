/**
 * Base Appwrite Document
 */
export interface AppwriteDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $databaseId: string;
  $collectionId: string;
}

/**
 * JSON Helper Utilities
 */
export const parseJsonField = <T>(jsonString: string | undefined, defaultValue: T): T => {
  try {
    return jsonString ? JSON.parse(jsonString) : defaultValue;
  } catch (e) {
    console.error("Error parsing JSON field", e);
    return defaultValue;
  }
};

export const stringifyJsonField = <T>(data: T): string => {
  try {
    return JSON.stringify(data);
  } catch (e) {
    console.error("Error stringifying JSON field", e);
    return '{}';
  }
};

/**
 * Generic Appwrite document parser
 * Automatically parses JSON string fields into objects
 */
export function parseAppwriteDoc<T extends AppwriteDocument, P = T>(
  doc: T,
  jsonFields: (keyof T)[] = []
): P {
  const parsed = { ...doc } as any;

  for (const field of jsonFields) {
    if (typeof parsed[field] === 'string') {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch (e) {
        console.warn(`Failed to parse JSON field ${String(field)}`, e);
      }
    }
  }

  return parsed as P;
}

/**
 * 1. Profiles & Agencies
 */
export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  BUYER = 'buyer',
  SELLER = 'seller'
}

export interface Agency extends AppwriteDocument {
  name: string;
  address: string;
  logo?: string;
  bankAccount?: string;
  vatCode?: string;
  agentIds?: string[];
  brochure?: string; // JSON string for brochure configuration
}

export interface Profile extends AppwriteDocument {
  userId: string;      // Link to Appwrite Auth User
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;    // JSON string
  id_number?: string;
  avatar_url?: string;
  agency_id?: string;  // Relationship to Agency
  bankAccount?: string;
}

// Parsed address type
export interface ProfileAddress {
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

// Profile with parsed JSON fields
export interface ParsedProfile extends Omit<Profile, 'address'> {
  address?: ProfileAddress;
}

// Legacy User interface for backwards compatibility
export type UserStatus = 'PENDING_INVITE' | 'ACTIVE';

export interface User {
  status: UserStatus;
  assignedTasks: never[];
  id: string;
  $id?: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  profileId?: string;
}

/**
 * 2. Property & Project
 */
export enum ProjectStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  UNDER_CONTRACT = 'under_contract',
  SOLD = 'sold',
  ARCHIVED = 'archived'
}

// Property JSON field types
export interface PropertyLocation {
  street?: string;
  streetNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertySize {
  lotSize?: number;
  floorSize?: number;
}

export interface PropertyMedia {
  images?: string[];
  floorplans?: string[];
  videoUrl?: string;
  virtualTourUrl?: string;
}

export interface PropertyRooms {
  bedrooms?: number;
  bathrooms?: number;
  garages?: number;
  buildYear?: number;
}

export enum PropertyDescriptionType {
  PROPERTY = 'propertydesc',
  NEIGHBOURHOOD = 'neighbourhooddesc'
}

export interface PropertyDescription {
  type: PropertyDescriptionType;
  content: string;
}

export interface Property extends AppwriteDocument {
  description: string; // JSON string: array of PropertyDescription objects
  location: string;    // JSON string: PropertyLocation
  size: string;        // JSON string: PropertySize
  media: string;       // JSON string: PropertyMedia
  specs: string;       // JSON string: string[]
  rooms: string;       // JSON string: PropertyRooms
}

// Property with parsed JSON fields
export interface ParsedProperty extends Omit<Property, 'description' | 'location' | 'size' | 'media' | 'specs' | 'rooms'> {
  description: PropertyDescription[];
  location: PropertyLocation;
  size: PropertySize;
  media: PropertyMedia;
  specs: string[];
  rooms: PropertyRooms;
}

export interface Project extends AppwriteDocument {
  title: string;
  price: number;
  sellerId: string;
  managerId: string;
  status: ProjectStatus;
  buyerId?: string;
  handover_date?: string;
  property_id?: string;

  // Computed aliases for compatibility
  propertyId?: string;    // Alias for property_id
  agentId?: string;       // Alias for managerId
  handoverDate?: string;  // Alias for handover_date
  id?: string;           // Alias for $id
}

/**
 * 3. Workflow & Tasks
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TaskType {
  USER_ACTION = 'user_action',
  PROJECT_MILESTONE = 'project_milestone',
  DOCUMENT_UPLOAD = 'document_upload',
  FORM_SUBMISSION = 'form_submission',
  GENERAL = 'general',
  SIGNATURE_REQUIRED = 'signature_required'
}

export interface Task extends AppwriteDocument {
  title: string;
  description?: string;
  taskType: TaskType;
  status: TaskStatus;
  projectId: string;       // Relationship to Project
  assigneeId?: string;     // Relationship to Profile (Optional: empty = Agent-managed)
  dueDate?: string;
  requiredDocType?: string;
  signRequestId?: string; // Relationship to SignRequest
  category?: string;
}

/**
 * 4. Documents & Forms
 */
export interface DocumentRecord extends AppwriteDocument {
  title: string;
  type: string;
  source: 'upload' | 'generated';
  fileId: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  projectId: string;       // Relationship to Project
  ownerId: string;         // Relationship to Profile
  uploaded_at?: string;
}

export type FormStatus = 'draft' | 'submitted' | 'assigned' | 'completed' | 'closed' | 'rejected';

export interface FormSubmission extends AppwriteDocument {
  title: string;
  formKey: string;
  formData: string;        // JSON string
  status: FormStatus;
  projectId: string;       // Relationship to Project
  submitterId: string;     // Relationship to Profile
  assigneeId?: string;     // Relationship to Profile
  attachments?: string;     // JSON string: string[]
  meta?: string;            // JSON string: metadata
}

// FormSubmission with parsed JSON fields
export interface ParsedFormSubmission extends Omit<FormSubmission, 'formData' | 'attachments' | 'meta'> {
  formData: Record<string, unknown>;
  attachments?: string[];
  meta?: Record<string, unknown>;
}

/**
 * 5. Signatures
 */
export enum SignRequestStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export interface SignRequest extends AppwriteDocument {
  parentId: string;         // ID of form_submission or document
  parentType: 'form' | 'document';
  status: SignRequestStatus;
  requiredSigners: string;  // JSON Array of Profile IDs
  signatureData: string;    // JSON Object: { [profileId]: signatureBase64 }
  projectId: string;        // Relationship to Project
  expiresAt?: string;
}

// SignRequest with parsed JSON fields
export interface ParsedSignRequest extends Omit<SignRequest, 'requiredSigners' | 'signatureData'> {
  requiredSigners: string[];
  signatureData: Record<string, string>;
}

/**
 * 6. Contract Templates
 */
export enum ContractStatus {
  DRAFT = 'draft',
  PENDING_SIGNATURE = 'pending_signature',
  SIGNED = 'signed',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled'
}

export interface ContractTemplateExt extends AppwriteDocument {
  title: string;
  content: string;          // Markdown or HTML with {{placeholders}}
  category?: 'residential' | 'commercial' | 'rental';
  required_roles: string;   // JSON Array of roles, e.g., ["buyer", "seller"]
  schema?: string;          // JSON validation schema for placeholders
  created_by?: string;      // Profile ID
}

// ContractTemplate with parsed JSON fields
export interface ParsedContractTemplate extends Omit<ContractTemplateExt, 'required_roles' | 'schema'> {
  required_roles: UserRole[];
  schema?: Record<string, unknown>;
}

/**
 * 7. Helper Functions for Services
 */

// Convert parsed object back to database format
export function prepareForDatabase<T extends Partial<AppwriteDocument>>(
  data: T,
  jsonFields: (keyof T)[] = []
): Record<string, unknown> {
  const prepared: Record<string, unknown> = { ...data };

  // Remove Appwrite meta fields
  delete prepared.$id;
  delete prepared.$createdAt;
  delete prepared.$updatedAt;
  delete prepared.$permissions;
  delete prepared.$databaseId;
  delete prepared.$collectionId;

  // Stringify JSON fields
  for (const field of jsonFields) {
    if (prepared[field as string] && typeof prepared[field as string] !== 'string') {
      prepared[field as string] = stringifyJsonField(prepared[field as string]);
    }
  }

  return prepared;
}

// Type-safe query builder helpers
export const QueryBuilder = {
  equal: (field: string, value: string | string[]) => `equal("${field}", ${JSON.stringify(value)})`,
  notEqual: (field: string, value: string) => `notEqual("${field}", "${value}")`,
  lessThan: (field: string, value: number) => `lessThan("${field}", ${value})`,
  greaterThan: (field: string, value: number) => `greaterThan("${field}", ${value})`,
  search: (field: string, query: string) => `search("${field}", "${query}")`,
  orderAsc: (field: string) => `orderAsc("${field}")`,
  orderDesc: (field: string) => `orderDesc("${field}")`,
  limit: (count: number) => `limit(${count})`,
  offset: (count: number) => `offset(${count})`
};

/**
 * 8. Legacy Interfaces (Backwards Compatibility)
 */

// Legacy Project interface (still used in many components)
// NOTE: The 'property' field is DEPRECATED and maintained only for backward compatibility.
// New code should use property_id to fetch property data from the properties collection.
// Use getPropertyParsed(project.property_id) from propertyService.ts for new implementations.
export interface LegacyProject {
  id: string;
  $id?: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  managerId: string;
  buyerIds?: string[];
  sellerIds?: string[];
  handover_date?: string;
  $createdAt?: string;
  $updatedAt?: string;
  coverImageId?: string;
  images?: string[];
  reference_nr?: string;
  propertyId: string; // NEW: Link to properties collection (made required to fix error)
  agent_id?: string;     // NEW: Agent reference
  buyer_id?: string;     // NEW: Buyer reference
  seller_id?: string;    // NEW: Seller reference
  // @deprecated Use property_id and propertyService.getPropertyParsed() instead
  property: {
    address: string;
    price: number;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    livingArea?: number;
    garages?: number;
    buildYear?: number | null;
    description?: string;
  };
  tasks?: any[];
}

// Legacy ProjectTask interface (matches current tasks collection)
export interface ProjectTask extends AppwriteDocument {
  projectId: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  category?: string;
  documentLink?: string;
  notifyAssignee?: boolean;
  notifyAgentOnComplete?: boolean;
  taskType: TaskType; // NEW: distinguishes user actions from project milestones
}

export interface BrochureSettings {
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  showAgentInfo: boolean;
  showAgencyLogo: boolean;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  category: 'Legal' | 'Financial' | 'Inspection' | 'General';
  assigneeRoles?: UserRole[];
  showTaskToUser?: boolean;
  sendReminders?: boolean;
  notifyAssignee?: boolean;
  notifyAgentOnComplete?: boolean;
  deadlineType?: 'RELATIVE' | 'SPECIFIC';
  deadlineDays?: number;
  deadlineDate?: string;
  reminderIntervalDays?: number;
}

export interface UserDocumentDefinition {
  id: string;
  $id?: string;
  key: string;
  title: string;
  description?: string;
  allowedFileTypes?: string[];
  overrideDocumentName?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  autoCreateTaskForAssignee?: boolean;
  autoAssignTo?: string[];
  autoAddToNewProjects?: boolean;
  visibility?: 'public' | 'private';
}

export interface FormDefinition {
  id: string;
  key: string;
  title: string;
  visibility?: 'public' | 'private';
  description?: string;
  schema?: Record<string, any>;
  defaultData?: Record<string, any>;
  role?: UserRole;
  needSignatureFromSeller?: boolean;
  needSignatureFromBuyer?: boolean;
  autoCreateTaskForAssignee?: boolean;
  autoAssignTo?: string[];
  autoAddToNewProjects?: boolean;
  allowChanges?: 'always' | 'before_submission' | 'never';
}

export interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  needSignatureFromSeller?: boolean;
  needSignatureFromBuyer?: boolean;
  autoCreateTaskForAssignee?: boolean;
  autoAssignTo?: string[];
  autoAddToNewProjects?: boolean;
  allowChanges?: 'always' | 'before_submission' | 'never';
  visibility?: 'public' | 'private';
}

export interface Contract {
  id: string;
  projectId: string;
  title: string;
  content: string;
  status: string;
  assignees?: string[];
  signedBy?: string[];
  createdAt?: string;
  signatureData?: Record<string, string>;
  isLocked?: boolean;
  visibility?: 'public' | 'private';
}

/**
 * 9. Form & Submission Helper Types
 */
export interface CreateSubmissionParams {
  projectId: string;
  formKey: string;
  title?: string;
  formData: Record<string, unknown> | string;
  attachments?: string[];
  assigneeId?: string | null;
  status?: FormStatus;
  submitterId: string;
  meta?: Record<string, unknown> | string;
}

export interface FormSubmissionPatch {
  title?: string;
  formData?: Record<string, unknown> | string;
  attachments?: string[];
  assigneeId?: string | null;
  status?: FormStatus;
  meta?: Record<string, unknown> | string;
}
