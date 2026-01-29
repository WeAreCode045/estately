import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { ID } from 'appwrite';

export const formService = {
  async listForms(filter?: any) {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.FORMS || 'forms');
  },

  async getForm(id: string) {
    return await databases.getDocument(DATABASE_ID, COLLECTIONS.FORMS || 'forms', id);
  },

  async createForm(data: any) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.FORMS || 'forms', ID.unique(), {
      ...data,
      createdAt: new Date().toISOString(),
      isActive: data.isActive !== undefined ? data.isActive : true
    });
  },

  async updateForm(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.FORMS || 'forms', id, { ...data, updatedAt: new Date().toISOString() });
  },

  async deleteForm(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.FORMS || 'forms', id);
  },

  async listResponses(formId: string, opts: { limit?: number, offset?: number, profileId?: string } = {}) {
    const queries: any[] = [];
    if (formId) queries.push(['equal', 'formId', formId]);
    // Simple listDocuments call; caller can filter further client-side
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.FORM_RESPONSES || 'form_responses');
  },

  async getResponse(id: string) {
    return await databases.getDocument(DATABASE_ID, COLLECTIONS.FORM_RESPONSES || 'form_responses', id);
  },

  /**
   * Submit a form response.
   * Creates a full response doc in FORM_RESPONSES. A server-side function (submit-form-append)
   * is expected to append a lightweight pointer to the user's profile. Optionally, set waitForAppend
   * to poll and verify the profile was updated (bounded retries).
   */
  async submitResponse(formId: string, profileId: string, responseData: any, opts: { submittedBy?: string, clientSubmissionId?: string, metadata?: any, waitForAppend?: boolean, pollAttempts?: number } = {}) {
    if (!formId || !profileId || !responseData) throw new Error('Missing required fields for submitResponse');

    const now = new Date().toISOString();
    const payload: any = {
      formId,
      profileId,
      responseData,
      submittedBy: opts.submittedBy || profileId,
      submittedAt: now,
      summary: typeof responseData === 'object' ? JSON.stringify(Object.keys(responseData).slice(0,5)) : String(responseData).slice(0,200),
      clientSubmissionId: opts.clientSubmissionId || null,
      metadata: opts.metadata || {}
    };

    // Idempotency: if clientSubmissionId provided, try to find existing
    if (payload.clientSubmissionId) {
      try {
        const existing = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FORM_RESPONSES || 'form_responses', [
          // query support differs in SDK versions; keep conservative and fetch all then filter
        ]);
        const found = (existing.documents || []).find((d: any) => d.clientSubmissionId === payload.clientSubmissionId);
        if (found) return { responseDoc: found, profileUpdate: { success: true, attempts: 0, idempotent: true } };
      } catch (e) { /* continue to create */ }
    }

    const created = await databases.createDocument(DATABASE_ID, COLLECTIONS.FORM_RESPONSES || 'form_responses', ID.unique(), payload);

    const resId = (created as any).$id || (created as any).id || null;

    const result: any = { responseDoc: created, profileUpdate: { success: false, attempts: 0 } };

    if (opts.waitForAppend) {
      const attempts = opts.pollAttempts || 6;
      for (let i = 0; i < attempts; i++) {
        try {
          const profile = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileId);
          const formsField = profile.formResponses ? (typeof profile.formResponses === 'string' ? JSON.parse(profile.formResponses) : profile.formResponses) : [];
          const exists = (formsField || []).some((f: any) => f.responseId === resId);
          result.profileUpdate.attempts = i + 1;
          if (exists) { result.profileUpdate.success = true; break; }
        } catch (e) {
          // ignore and retry
        }
        // wait 1s between attempts
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return result;
  }
};

export default formService;
