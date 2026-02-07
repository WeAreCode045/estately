/**
 * Document Service - Manages documents in the relational model
 *
 * Documents are stored as separate entities with relationships to:
 * - project_id (required)
 * - owner_id (required - the profile who uploaded/owns the document)
 * - file_id (required - S3 file reference)
 */

import type { DocumentRecord } from '../types';
import { COLLECTIONS, DATABASE_ID, databases, ID, Query } from './appwrite';

// Helper to map Appwrite response (snake_case) to DocumentRecord (camelCase)
const mapToDocumentRecord = (doc: any): DocumentRecord => ({
  $id: doc.$id,
  $createdAt: doc.$createdAt,
  $updatedAt: doc.$updatedAt,
  $permissions: doc.$permissions,
  $databaseId: doc.$databaseId,
  $collectionId: doc.$collectionId,
  title: doc.title,
  type: doc.type,
  source: doc.source,
  fileId: doc.file_id,
  verificationStatus: doc.verification_status,
  projectId: doc.project_id,
  ownerId: doc.owner_id,
});

export const documentRecordService = {
  /**
   * Create a new document record
   */
  async create(data: {
    title: string;
    type: string;
    source: 'upload' | 'generated';
    fileId: string;
    projectId: string;
    ownerId: string;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  }): Promise<DocumentRecord> {
    // Map camelCase to snake_case for Appwrite schema
    const documentData = {
      title: data.title,
      type: data.type,
      source: data.source,
      file_id: data.fileId,
      project_id: data.projectId,
      owner_id: data.ownerId,
      verification_status: data.verificationStatus || 'pending',
      uploaded_at: new Date().toISOString()
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      ID.unique(),
      documentData
    );

    return mapToDocumentRecord(response);
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
      return mapToDocumentRecord(response);
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
    // Use snake_case for Appwrite database queries
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

    return response.documents.map(mapToDocumentRecord);
  },

  /**
   * List documents by owner (profile)
   */
  async listByOwner(ownerId: string, filters?: {
    projectId?: string;
    source?: 'upload' | 'generated';
  }): Promise<DocumentRecord[]> {
    // Use snake_case for Appwrite database queries
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

    return response.documents.map(mapToDocumentRecord);
  },

  /**
   * Update document verification status
   */
  async updateVerificationStatus(
    documentId: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<DocumentRecord> {
    // Use snake_case for Appwrite database field
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      documentId,
      { verification_status: status }
    );

    return mapToDocumentRecord(response);
  },

  /**
   * Update document
   */
  async update(
    documentId: string,
    data: Partial<Omit<DocumentRecord, keyof import('../types').AppwriteDocument>>
  ): Promise<DocumentRecord> {
    // Map camelCase input to snake_case for Appwrite
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.fileId !== undefined) updateData.file_id = data.fileId;
    if (data.projectId !== undefined) updateData.project_id = data.projectId;
    if (data.ownerId !== undefined) updateData.owner_id = data.ownerId;
    if (data.verificationStatus !== undefined) updateData.verification_status = data.verificationStatus;

    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.DOCUMENTS,
      documentId,
      updateData
    );

    return mapToDocumentRecord(response);
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

    return response.documents.map(mapToDocumentRecord);
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

    return response.documents.map(mapToDocumentRecord);
  }
};
