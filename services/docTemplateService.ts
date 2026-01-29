import { databases, storage, DATABASE_ID, COLLECTIONS, BUCKETS, account } from './appwrite';
import { ID } from 'appwrite';
import { DocTemplate } from '../types';

export const docTemplateService = {
  async list() {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.FILE_TEMPLATES || 'file_templates');
  },

  async get(id: string) {
    return await databases.getDocument(DATABASE_ID, COLLECTIONS.FILE_TEMPLATES || 'file_templates', id);
  },

  async create(adminId: string, file: File, metadata: { title?: string; description?: string; rolesAssigned?: string[] }) {
    try {
      // If server-side upload function is configured, call it (allows uploading with project API key)
      const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
      const project = import.meta.env.VITE_APPWRITE_PROJECT_ID;
      const uploadFunctionId = import.meta.env.VITE_APPWRITE_FUNCTION_UPLOAD_ID;

      let upload: any = null;
      if (endpoint && project && uploadFunctionId) {
        // send base64 payload to function
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => { resolve((reader.result as string).split(',')[1]); };
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });

        const resp = await fetch(`${endpoint}/functions/${uploadFunctionId}/executions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': project
          },
          body: JSON.stringify({ filename: file.name, base64, metadata })
        });
        upload = await resp.json();
        if (upload?.error) throw new Error(upload.error || JSON.stringify(upload));
        // Normalize wrapped responses from function execution
        // Common shapes: { success:true, file: {...}, createdDocument: {...} }
        const normalized = upload?.response || upload?.file || upload;
        upload = normalized;
      } else {
        // Ensure caller is authenticated — storage uploads require a valid user session unless bucket allows anonymous uploads
        try {
          await account.get();
        } catch (authErr) {
          throw new Error('Not authenticated: please sign in before uploading templates (client must be logged in).');
        }

        // upload to storage (browser SDK pathway)
        upload = await storage.createFile(BUCKETS.DOCUMENTS, ID.unique(), file);
      }

      // If function created a DB document, use that instead of creating client-side
      const fileId = upload?.$id || upload?.file?.$id || upload?.response?.$id || upload?.id || upload?.fileId;
      const createdDocFromServer = upload?.createdDocument || upload?._createdDocument || upload?.created || null;

      if (createdDocFromServer && (createdDocFromServer.$id || createdDocFromServer.id)) {
        const createdId = createdDocFromServer.$id || createdDocFromServer.id;
        // Kick off analysis (server-side record exists)
        try { await this.analyze(createdId); } catch (e) { console.warn('docTemplateService.create: analyze trigger failed', e); }
        return createdDocFromServer;
      }

      // Fallback: create the document client-side (legacy path)
      const doc: any = {
        title: metadata.title || file.name,
        description: metadata.description || '',
        fileId: fileId,
        analysisStatus: 'PENDING',
        rolesAssigned: metadata.rolesAssigned || ['BUYER','SELLER'],
        createdBy: adminId,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      const created = await databases.createDocument(DATABASE_ID, COLLECTIONS.FILE_TEMPLATES || 'file_templates', ID.unique(), doc);
      try { await this.analyze((created as any).$id); } catch (e) { console.warn('docTemplateService.create: analyze trigger failed', e); }
      return created;
    } catch (err: any) {
      console.error('docTemplateService.create error:', err);
      // Normalize thrown error for callers
      throw new Error(err?.message || String(err));
    }
  },

  async update(id: string, data: Partial<DocTemplate>) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.FILE_TEMPLATES || 'file_templates', id, data as any);
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.FILE_TEMPLATES || 'file_templates', id);
  },

  async analyze(id: string) {
    // Fetch template to obtain storage file id
    const tpl = await databases.getDocument(DATABASE_ID, COLLECTIONS.FILE_TEMPLATES || 'file_templates', id);
    const fileId = tpl.fileId;
    if (!fileId) throw new Error('Template has no associated fileId');

    // Mark as processing locally
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.FILE_TEMPLATES || 'file_templates', id, { analysisStatus: 'PROCESSING' } as any);

    // Invoke Appwrite Function to perform heavy processing (OCR + LLM)
    const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
    const project = import.meta.env.VITE_APPWRITE_PROJECT_ID;
    const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_PROCESS_TEMPLATE_ID;

    if (!endpoint || !project || !functionId) {
      console.warn('Missing function execution config; ensure VITE_APPWRITE_FUNCTION_PROCESS_TEMPLATE_ID is set');
      return { ok: true };
    }

    const resp = await fetch(`${endpoint}/functions/${functionId}/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': project
      },
      body: JSON.stringify({ templateId: id, fileId })
    });

    try {
      const json = await resp.json();
      return json;
    } catch (err) {
      return { ok: true };
    }
  },

  async generateFilledPdf(templateId: string, formData: any) {
    // Stub: in production this should call an Appwrite Function that merges data into PDF and returns fileId
    // For now, mark as TODO and return placeholder
    return { fileId: null, fileUrl: null };
  }
};

export default docTemplateService;
