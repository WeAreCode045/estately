
export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  SELLER = 'SELLER',
  BUYER = 'BUYER'
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  UNDER_CONTRACT = 'UNDER_CONTRACT',
  SOLD = 'SOLD',
  ARCHIVED = 'ARCHIVED'
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  SIGNED = 'SIGNED',
  CANCELLED = 'CANCELLED'
}

export interface AssignedTask {
  taskId: string;
  assignedAt: string;
  completedAt?: string;
  status: 'PENDING' | 'COMPLETED';
  projectId: string;
  title?: string;
  description?: string;
  dueDate?: string;
}

export interface UploadedDocument {
  fileId: string;
  name: string; // Filename
  userDocumentDefinitionId: string; // Linking to UserDocumentDefinition's ID
  documentType: string; // e.g., "Passport", "Contract", or "Personal"
  projectId: string;
  url: string;
  uploadedAt: string;
}

export interface User {
  id: string;
  userId?: string;
  $id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  avatar?: string;
  notificationPreference?: 'EMAIL' | 'APP' | 'BOTH';
  assignedTasks?: AssignedTask[]; // JSON Array in Profile
  userDocuments?: UploadedDocument[]; // JSON Array in Profile (renamed from assignedDocuments for consistency)
  status?: 'ACTIVE' | 'PENDING_INVITE';
  projectId?: string;

  // Commercial & Legal Profile (New)
  firstName?: string;
  lastName?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  birthday?: string;
  birthPlace?: string;
  idNumber?: string;
  vatNumber?: string;
  bankAccount?: string;
  roleData?: string; // Original role string from profile
}

export interface Agency {
  id: string;
  $id?: string;
  name: string;
  logo?: string;
  address: string;
  bankAccount: string;
  vatCode: string;
  agentIds: string[];
}

export interface TaskTemplate {
  id: string; // TaskID
  title: string;
  description?: string;
  category: 'Legal' | 'Financial' | 'Inspection' | 'General';
  assigneeRoles: UserRole[];
  showTaskToUser: boolean;
  sendReminders: boolean;
  notifyAssignee: boolean;
  notifyAgentOnComplete: boolean;
  deadlineType: 'RELATIVE' | 'SPECIFIC';
  deadlineDays?: number;
  deadlineDate?: string;
  reminderIntervalDays: number;
  visibilityType?: 'ALWAYS' | 'DATE' | 'DAYS_AFTER_START' | 'AFTER_TASK';
  visibilityDate?: string;
  visibilityDays?: number;
  visibilityTaskId?: string;
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

  // Settings
  autoCreateTaskForAssignee?: boolean;
  autoAssignTo?: string[];
  autoAddToNewProjects?: boolean;
  visibility?: 'public' | 'private';
}

export interface UserDocument {
  id?: string;
  fileId: string;
  name: string;
  url: string;
  documentType: string;
  userDocumentDefinitionId: string;
  projectId: string;
  uploadedAt: string;
  status?: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  description?: string;
  providedBy?: UserRole;
  deadline?: string;
  remindersSent?: number;
}

export interface PropertyDetails {
  address: string;
  price: number;
  description: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  buildYear?: number;
  livingArea?: number;
  garages?: number;
  images: string[];
}

export interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate: string;
  category: 'Legal' | 'Financial' | 'Inspection' | 'General';
  notifyAssignee?: boolean;
  notifyAgentOnComplete?: boolean;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  date: string;
  achieved: boolean;
}

export interface AgendaEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'Meeting' | 'Viewing' | 'Signing' | 'Inspection';
  participants: string[];
}

export interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;

  // Settings (Same as forms)
  needSignatureFromSeller?: boolean;
  needSignatureFromBuyer?: boolean;
  autoCreateTaskForAssignee?: boolean;
  autoAssignTo?: string[];
  autoAddToNewProjects?: boolean;
  allowChanges?: 'always' | 'before_submission' | 'never';
  visibility?: 'public' | 'private';
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Contract {
  id: string;
  projectId: string;
  title: string;
  content: string;
  status: ContractStatus;
  assignees: string[];
  signedBy: string[];
  createdAt: string;
  signatureData?: Record<string, string>;
  isLocked?: boolean;
  visibility?: 'public' | 'private';
}

export interface Project {
  id: string;
  title: string;
  property: PropertyDetails;
  sellerId: string;
  buyerId?: string;
  managerId: string;
  status: ProjectStatus;
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
  agenda: AgendaEvent[];
  contractIds: string[];
  messages: Message[];
  coverImageId?: string;
  handover_date?: string;
  referenceNumber?: string;
  createdAt?: string;
}

// ----------------------------
// Project Forms types
// ----------------------------

export type FormStatus = 'draft' | 'submitted' | 'assigned' | 'completed' | 'closed' | 'rejected';

export interface ProjectForm {
  id: string; // document $id
  projectId: string;
  formKey: string; // e.g. 'lijst_van_zaken'
  title: string;
  createdAt: string;
  updatedAt?: string;
  meta?: Record<string, any> | string;
  isLocked?: boolean;
}

export interface FormDefinition {
  id: string;
  key: string;
  title: string;
  visibility?: 'public' | 'private';
  description?: string;
  schema?: Record<string, any>; // JSON schema or UI schema
  defaultData?: Record<string, any>;
  role?: UserRole; // Who usually fills this in

  // Settings
  needSignatureFromSeller?: boolean;
  needSignatureFromBuyer?: boolean;
  autoCreateTaskForAssignee?: boolean;
  autoAssignTo?: string[]; // e.g. ['seller', 'buyer']
  autoAddToNewProjects?: boolean;
  allowChanges?: 'always' | 'before_submission' | 'never';
}

export interface FormSubmission {
  id: string; // document $id
  projectId: string;
  formKey: string;
  title: string;
  data: Record<string, any>; // parsed from JSON stored in DB
  attachments: string[]; // array of storage fileIds
  submittedByUserId: string;
  assignedToUserId?: string | null;
  status: FormStatus;
  createdAt: string;
  updatedAt?: string;
  meta?: Record<string, any> | string;
}

export interface CreateSubmissionParams {
  projectId: string;
  formKey: string;
  title?: string;
  data: Record<string, any> | string;
  attachments?: string[];
  assignedToUserId?: string | null;
  status?: FormStatus;
  submittedByUserId?: string;
  meta?: Record<string, any> | string;
}

export interface FormSubmissionPatch {
  title?: string;
  data?: Record<string, any> | string;
  attachments?: string[];
  assignedToUserId?: string | null;
  status?: FormStatus;
  meta?: Record<string, any> | string;
}
