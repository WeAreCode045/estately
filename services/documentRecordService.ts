/**
 * Document Service - Manages documents in the relational model
 *
 * Documents are stored as separate entities with relationships to:
 * - project_id (required)
 * - owner_id (required - the profile who uploaded/owns the document)
 * - file_id (required - S3 file reference)
 */

import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from './appwrite';
import type { DocumentRecord } from '../types';

export const documentRecordService = {
  /**
   * Create a new document record
   */
  async create(data: {
    title: string;
    type: string;
    source: 'upload' | 'generated';
    file_id: string;
    project_id: string;
    owner_id: string;
    verification_status?: 'pending' | 'approved' | 'rejected';
  }): Promise<DocumentRecord> {
    const documentData = {
      ...data,
      verification_status: data.verification_status || 'pending',
      uploaded_at: new Date().toISOString()
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      ID.unique(),
      documentData
    );

    return response as DocumentRecord;
  },

  /**
   * Get document by ID
   */
  async get(documentId: string): Promise<DocumentRecord | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.DOCUMENTS,
        documentId
      );
      return response as DocumentRecord;
    } catch (error) {
      console.error('documentRecordService.get error:', error);
      return null;
    }
  },

  /**
   * List documents by project
   */
  async listByProject(projectId: string, filters?: {
    ownerId?: string;
    source?: 'upload' | 'generated';
    type?: string;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  }): Promise<DocumentRecord[]> {
    const queries = [Query.equal('project_id', projectId)];

    if (filters?.ownerId) {
      queries.push(Query.equal('owner_id', filters.ownerId));
    }
    if (filters?.source) {
      queries.push(Query.equal('source', filters.source));
    }
    if (filters?.type) {
      queries.push(Query.equal('type', filters.type));
    }
    if (filters?.verificationStatus) {
      queries.push(Query.equal('verification_status', filters.verificationStatus));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      queries
    );

    return response.documents as DocumentRecord[];
  },

  /**
   * List documents by owner (profile)
   */
  async listByOwner(ownerId: string, filters?: {
    projectId?: string;
    source?: 'upload' | 'generated';
  }): Promise<DocumentRecord[]> {
    const queries = [Query.equal('owner_id', ownerId)];

    if (filters?.projectId) {
      queries.push(Query.equal('project_id', filters.projectId));
    }
    if (filters?.source) {
      queries.push(Query.equal('source', filters.source));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      queries
    );

    return response.documents as DocumentRecord[];
  },

  /**
   * Update document verification status
   */
  async updateVerificationStatus(
    documentId: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<DocumentRecord> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      documentId,
      { verification_status: status }
    );

    return response as DocumentRecord;
  },

  /**
   * Update document
   */
  async update(
    documentId: string,
    data: Partial<Omit<DocumentRecord, keyof import('../types').AppwriteDocument>>
  ): Promise<DocumentRecord> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      documentId,
      data
    );

    return response as DocumentRecord;
  },

  /**
   * Delete document record
   */
  async delete(documentId: string): Promise<void> {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      documentId
    );
  },

  /**
   * List all uploaded documents (vs generated)
   */
  async listUploaded(projectId?: string): Promise<DocumentRecord[]> {
    const queries = [Query.equal('source', 'upload')];

    if (projectId) {
      queries.push(Query.equal('project_id', projectId));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      queries
    );

    return response.documents as DocumentRecord[];
  },

  /**
   * List all generated documents
   */
  async listGenerated(projectId?: string): Promise<DocumentRecord[]> {
    const queries = [Query.equal('source', 'generated')];

    if (projectId) {
      queries.push(Query.equal('project_id', projectId));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      queries
    );

    return response.documents as DocumentRecord[];
  }
};
