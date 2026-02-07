import type { SignRequest } from '../types';
import { parseJsonField } from '../types';
import { COLLECTIONS, DATABASE_ID, databases, ID } from './appwrite';

/**
 * Required Signer Interface
 */
export interface RequiredSigner {
  profileId: string;
  signed: boolean;
  signedAt?: string;
}

/**
 * Signature Data Interface
 */
export interface SignatureData {
  [profileId: string]: {
    url: string;
    timestamp: string;
    ipAddress?: string;
  };
}

/**
 * Create Sign Request Data Interface
 */
export interface CreateSignRequestData {
  parent_id: string;
  parent_type: 'form' | 'document';
  project_id: string;
  required_signers: string[]; // Array of profile IDs
}

/**
 * Create a new sign request
 */
export const createSignRequest = async (data: CreateSignRequestData): Promise<SignRequest> => {
  const requiredSigners: RequiredSigner[] = data.required_signers.map(profileId => ({
    profileId,
    signed: false
  }));

  const payload = {
    parent_id: data.parent_id,
    parent_type: data.parent_type,
    status: 'pending' as const,
    required_signers: JSON.stringify(requiredSigners),
    signature_data: JSON.stringify({}),
    project_id: data.project_id
  };

  const result = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.SIGN_REQUESTS,
    ID.unique(),
    payload
  );

  return result as SignRequest;
};

/**
 * Get sign request by ID
 */
export const getSignRequest = async (id: string): Promise<SignRequest> => {
  const doc = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.SIGN_REQUESTS,
    id
  );
  return doc as SignRequest;
};

/**
 * Get sign request with parsed JSON fields
 */
export const getSignRequestParsed = async (id: string) => {
  const signRequest = await getSignRequest(id);

  const requiredSigners = parseJsonField<RequiredSigner[]>(
    signRequest.required_signers,
    []
  );
  const signatureData = parseJsonField<SignatureData>(
    signRequest.signature_data,
    {}
  );

  return {
    signRequest,
    requiredSigners,
    signatureData,
    allSigned: requiredSigners.every(s => s.signed),
    totalSigners: requiredSigners.length,
    signedCount: requiredSigners.filter(s => s.signed).length
  };
};

/**
 * Add signature to sign request
 */
export const addSignature = async (
  signRequestId: string,
  profileId: string,
  signatureUrl: string,
  ipAddress?: string
): Promise<SignRequest> => {
  // Get current sign request
  const doc = await getSignRequest(signRequestId);

  const requiredSigners = parseJsonField<RequiredSigner[]>(doc.required_signers, []);
  const signatures = parseJsonField<SignatureData>(doc.signature_data, {});

  // Update signer status
  const updatedSigners = requiredSigners.map(signer =>
    signer.profileId === profileId
      ? { ...signer, signed: true, signedAt: new Date().toISOString() }
      : signer
  );

  // Add signature data
  signatures[profileId] = {
    url: signatureUrl,
    timestamp: new Date().toISOString(),
    ipAddress
  };

  // Check if all signed
  const allSigned = updatedSigners.every(s => s.signed);

  // Update document
  const result = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SIGN_REQUESTS,
    signRequestId,
    {
      required_signers: JSON.stringify(updatedSigners),
      signature_data: JSON.stringify(signatures),
      status: allSigned ? 'completed' : 'pending'
    }
  );

  return result as SignRequest;
};

/**
 * Remove signature from sign request
 */
export const removeSignature = async (
  signRequestId: string,
  profileId: string
): Promise<SignRequest> => {
  // Get current sign request
  const doc = await getSignRequest(signRequestId);

  const requiredSigners = parseJsonField<RequiredSigner[]>(doc.required_signers, []);
  const signatures = parseJsonField<SignatureData>(doc.signature_data, {});

  // Update signer status
  const updatedSigners = requiredSigners.map(signer =>
    signer.profileId === profileId
      ? { profileId: signer.profileId, signed: false }
      : signer
  );

  // Remove signature data
  delete signatures[profileId];

  // Update document
  const result = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SIGN_REQUESTS,
    signRequestId,
    {
      required_signers: JSON.stringify(updatedSigners),
      signature_data: JSON.stringify(signatures),
      status: 'pending'
    }
  );

  return result as SignRequest;
};

/**
 * Get all sign requests for a project
 */
export const getProjectSignRequests = async (projectId: string) => {
  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SIGN_REQUESTS,
    [`project_id=${projectId}`]
  );
  return result;
};

/**
 * Get all sign requests for a specific document/form
 */
export const getParentSignRequests = async (parentId: string, parentType: 'form' | 'document') => {
  const result = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SIGN_REQUESTS,
    [
      `parent_id=${parentId}`,
      `parent_type=${parentType}`
    ]
  );
  return result;
};

/**
 * Delete sign request
 */
export const deleteSignRequest = async (id: string): Promise<void> => {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.SIGN_REQUESTS,
    id
  );
};
