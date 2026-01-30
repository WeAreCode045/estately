
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
  documentRequirementId: string; // Linking to RequiredDocument's ID
  documentType: string; // e.g., "Passport", "Contract", or "Personal"
  projectId: string; // "global" or specific projectId
  url: string;
  uploadedAt: string;
}

export interface User {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  avatar?: string;
  bio?: string;
  notificationPreference?: 'EMAIL' | 'APP' | 'BOTH';
  assignedTasks?: AssignedTask[]; // JSON Array in Profile
  userDocuments?: UploadedDocument[]; // JSON Array in Profile (renamed from assignedDocuments for consistency)
  status?: 'ACTIVE' | 'PENDING_INVITE';
  projectId?: string;
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

export interface RequiredDocument {
  id: string;
  name: string;
  taskId: string; 
  allowedFileTypes?: string[];
  isGlobal?: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  requiredDocumentId?: string;
  name: string;
  description: string;
  providedBy: UserRole;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  fileId?: string;
  fileUrl?: string;
  uploadedAt?: string;
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
}

// ----------------------------
// Project Forms types
// ----------------------------

export type FormStatus = 'draft' | 'submitted' | 'assigned' | 'closed' | 'rejected';

export interface ProjectForm {
  id: string; // document $id
  projectId: string;
  formKey: string; // e.g. 'lijst_van_zaken'
  title: string;
  createdAt: string;
  updatedAt?: string;
  meta?: Record<string, any> | string;
}

export interface FormDefinition {
  id: string;
  key: string;
  title: string;
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
