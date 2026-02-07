import { useCallback, useEffect, useState } from 'react';
import { documentRecordService } from '../api/appwrite';
import type { DocumentRecord } from '../types';

interface UseProjectDocumentsOptions {
  projectId: string;
  ownerId?: string;
  source?: 'upload' | 'generated';
  type?: string;
}

/**
 * Hook to fetch and manage documents for a specific project
 * Uses the relational documents collection with project_id relationship
 */
export function useProjectDocuments(options: UseProjectDocumentsOptions) {
  const { projectId, ownerId, source, type } = options;

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const filters = {
        ownerId,
        source,
        type
      };

      const docs = await documentRecordService.listByProject(projectId, filters);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
      console.error('Error fetching project documents:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, ownerId, source, type]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const createDocument = async (docData: {
    title: string;
    type: string;
    source: 'upload' | 'generated';
    fileId: string;
    ownerId: string;
  }) => {
    try {
      const newDoc = await documentRecordService.create({
        ...docData,
        projectId: projectId,
        verificationStatus: 'pending'
      });

      setDocuments(prev => [...prev, newDoc]);
      return newDoc;
    } catch (err: any) {
      setError(err.message || 'Failed to create document');
      throw err;
    }
  };

  const updateVerificationStatus = async (
    documentId: string,
    status: 'pending' | 'approved' | 'rejected'
  ) => {
    try {
      await documentRecordService.updateVerificationStatus(documentId, status);
      setDocuments(prev =>
        prev.map(doc =>
          doc.$id === documentId
            ? { ...doc, verificationStatus: status }
            : doc
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update document');
      throw err;
    }
  };

  const uploadedDocs = documents.filter(d => d.source === 'upload');
  const generatedDocs = documents.filter(d => d.source === 'generated');
  const pendingDocs = documents.filter(d => d.verificationStatus === 'pending');

  return {
    documents,
    uploadedDocs,
    generatedDocs,
    pendingDocs,
    loading,
    error,
    createDocument,
    updateVerificationStatus,
    refetch: fetchDocuments
  };
}
