import { databases, DATABASE_ID, COLLECTIONS, storage, Query, BUCKETS } from './appwrite';
import { ID } from 'appwrite';
import type { CreateSubmissionParams, FormSubmission, FormSubmissionPatch, FormStatus } from '../types';

function parseSubmissionDoc(doc: any): FormSubmission {
  return {
    id: doc.$id,
    projectId: doc.projectId,
    formKey: doc.formKey,
    title: doc.title || '',
    data: doc.data ? (typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data) : {},
    attachments: doc.attachments ? (typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : doc.attachments) : [],
    submittedByUserId: doc.submittedByUserId,
    assignedToUserId: doc.assignedToUserId || null,
    status: (doc.status || 'draft') as FormStatus,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
    meta: doc.meta ? (typeof doc.meta === 'string' ? JSON.parse(doc.meta) : doc.meta) : undefined,
  };
}

export const projectFormsService = {
  async createSubmission(params: CreateSubmissionParams) {
    const payload: any = {
      projectId: params.projectId,
      formKey: params.formKey,
      title: params.title || '',
      data: typeof params.data === 'string' ? params.data : JSON.stringify(params.data || {}),
      attachments: params.attachments ? JSON.stringify(params.attachments) : JSON.stringify([]),
      submittedByUserId: params.submittedByUserId || null,
      assignedToUserId: params.assignedToUserId || null,
      status: params.status || 'submitted'
    };

    const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.PROJECT_FORMS, ID.unique(), payload);
    return parseSubmissionDoc(doc);
  },

  async listByProject(projectId: string, options?: { limit?: number; offset?: number; status?: FormStatus | FormStatus[]; assignedTo?: string }) {
    const queries: string[] = [Query.equal('projectId', projectId)];
    
    if (options?.status && !Array.isArray(options.status)) {
      queries.push(Query.equal('status', options.status));
    }
    
    if (options?.assignedTo) {
      queries.push(Query.equal('assignedToUserId', options.assignedTo));
    }

    if (options?.limit !== undefined) queries.push(Query.limit(options.limit));
    if (options?.offset !== undefined) queries.push(Query.offset(options.offset));

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_FORMS,
      queries
    );
    
    let items = response.documents.map((d: any) => parseSubmissionDoc(d));

    if (options?.status && Array.isArray(options.status)) {
      items = items.filter(i => (options.status as string[]).includes(i.status));
    }

    return { total: response.total || items.length, items };
  },

  async getSubmission(id: string) {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROJECT_FORMS, id);
    return parseSubmissionDoc(doc);
  },

  async updateSubmission(id: string, patch: Partial<FormSubmissionPatch>) {
    const payload: any = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.data !== undefined) payload.data = typeof patch.data === 'string' ? patch.data : JSON.stringify(patch.data);
    if (patch.attachments !== undefined) payload.attachments = JSON.stringify(patch.attachments);
    if (patch.assignedToUserId !== undefined) payload.assignedToUserId = patch.assignedToUserId;
    if (patch.status !== undefined) payload.status = patch.status;

    const doc = await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECT_FORMS, id, payload);
    return parseSubmissionDoc(doc);
  },

  async deleteSubmission(id: string) {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROJECT_FORMS, id);
    const attachments = doc.attachments ? (typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : doc.attachments) : [];
    
    for (const fileId of attachments) {
      try {
        await storage.deleteFile(BUCKETS.DOCUMENTS, fileId);
      } catch (err) {
        console.warn('Failed to delete attachment', fileId, err);
      }
    }

    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_FORMS, id);
  },

  async listByUser(userId: string, options?: { limit?: number; offset?: number; projectId?: string }) {
    const queries: string[] = [Query.equal('submittedByUserId', userId)];
    
    if (options?.projectId) queries.push(Query.equal('projectId', options.projectId));
    if (options?.limit !== undefined) queries.push(Query.limit(options.limit));
    if (options?.offset !== undefined) queries.push(Query.offset(options.offset));

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_FORMS,
      queries
    );
    const items = response.documents.map((d: any) => parseSubmissionDoc(d));
    return { total: response.total || items.length, items };
  },

  async listAll(options?: { limit?: number; offset?: number; projectId?: string; status?: string | string[]; assignedTo?: string; search?: string }) {
    const queries: string[] = [];
    
    if (options?.projectId) queries.push(Query.equal('projectId', options.projectId));
    if (options?.status && !Array.isArray(options.status)) {
      queries.push(Query.equal('status', options.status));
    }
    if (options?.assignedTo) queries.push(Query.equal('assignedToUserId', options.assignedTo));
    if (options?.limit !== undefined) queries.push(Query.limit(options.limit));
    if (options?.offset !== undefined) queries.push(Query.offset(options.offset));

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_FORMS,
      queries
    );
    
    let items = response.documents.map((d: any) => parseSubmissionDoc(d));

    if (options?.status && Array.isArray(options.status)) {
      items = items.filter(i => (options.status as string[]).includes(i.status));
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      items = items.filter(i => (i.title || i.formKey || '').toLowerCase().includes(q) || JSON.stringify(i.data).toLowerCase().includes(q));
    }

    return { total: response.total || items.length, items };
  }
};

export default projectFormsService;
