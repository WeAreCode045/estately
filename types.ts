
export enum UserRole {
  ADMIN = 'ADMIN',
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  avatar?: string;
  documents?: Document[];
  status?: 'ACTIVE' | 'PENDING_INVITE';
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
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
  completed: boolean;
  dueDate: string;
  category: 'Legal' | 'Financial' | 'Inspection' | 'General';
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
}
