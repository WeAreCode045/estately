import { ID } from 'appwrite';
import type { CreateSubmissionParams, FormDefinition, FormStatus, FormSubmission, FormSubmissionPatch, Project } from '../types';
import { TaskStatus, TaskType } from '../types';
import { COLLECTIONS, DATABASE_ID, databases, projectService, Query } from './appwrite';
import { formDefinitionsService } from './formDefinitionsService';
import { s3Service } from './s3Service';
import { taskService } from './taskService';

function parseSubmissionDoc(doc: Record<string, unknown>): FormSubmission {
  return doc as unknown as FormSubmission;
}

export const projectFormsService = {
  async createSubmission(params: CreateSubmissionParams) {
    const payload: Record<string, unknown> = {
      projectId: params.projectId,
      formKey: params.formKey,
      title: params.title || '',
      formData: typeof params.formData === 'string' ? params.formData : JSON.stringify(params.formData || {}),
      attachments: params.attachments ? JSON.stringify(params.attachments) : JSON.stringify([]),
      submitterId: params.submitterId || '',
      assigneeId: params.assigneeId || '',
      status: params.status || 'submitted',
      meta: typeof params.meta === 'string' ? params.meta : JSON.stringify(params.meta || {})
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
      queries.push(Query.equal('assigneeId', options.assignedTo));
    }

    if (options?.limit !== undefined) queries.push(Query.limit(options.limit));
    if (options?.offset !== undefined) queries.push(Query.offset(options.offset));

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_FORMS,
      queries
    );

    let items = response.documents.map((d) => parseSubmissionDoc(d as Record<string, unknown>));

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
    const payload: Record<string, unknown> = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.formData !== undefined) payload.formData = typeof patch.formData === 'string' ? patch.formData : JSON.stringify(patch.formData);
    if (patch.attachments !== undefined) payload.attachments = JSON.stringify(patch.attachments);
    if (patch.assigneeId !== undefined) payload.assigneeId = patch.assigneeId;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.meta !== undefined) payload.meta = typeof patch.meta === 'string' ? patch.meta : JSON.stringify(patch.meta);

    const doc = await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECT_FORMS, id, payload);
    return parseSubmissionDoc(doc);
  },

  async deleteSubmission(id: string) {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROJECT_FORMS, id);
    const attachments = doc.attachments ? (typeof doc.attachments === 'string' ? JSON.parse(doc.attachments) : doc.attachments) : [];

    for (const fileId of attachments) {
      try {
        await s3Service.deleteObject(fileId);
      } catch (err) {
        console.warn('Failed to delete attachment', fileId, err);
      }
    }

    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECT_FORMS, id);
  },

  async assignFormToUser(def: FormDefinition, projectId: string, targetProfileId: string) {
    // 1. Create Form Submission
    await this.createSubmission({
      projectId,
      formKey: def.key,
      title: def.title || '',
      formData: def.defaultData || {},
      assigneeId: targetProfileId,
      status: 'assigned' as FormStatus,
      submitterId: targetProfileId,
      meta: {
        needsSignatureFromSeller: def.needSignatureFromSeller,
        needsSignatureFromBuyer: def.needSignatureFromBuyer
      }
    });

    // 2. Handle Auto-Task Creation if enabled - RELATIONAL MODEL
    if (def.autoCreateTaskForAssignee) {
      const dueDateIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10); // YYYY-MM-DD

      // Create task in tasks collection
      await taskService.create({
        title: `Fill out form: ${def.title}`,
        description: `Please complete the ${def.title} form as requested.`,
        taskType: TaskType.FORM_SUBMISSION,
        status: TaskStatus.TODO,
        projectId,
        assignee_id: targetProfileId,
        due_date: dueDateIso,
        category: 'Legal'
      });
    }
  },

  async autoProvisionForms(projectId: string, project: Record<string, unknown>) {
    try {
      const defs = await formDefinitionsService.list();
      const autoAddDefs = defs.filter(d => d.autoAddToNewProjects);

      for (const def of autoAddDefs) {
        if (def.autoAssignTo && def.autoAssignTo.length > 0) {
          for (const role of def.autoAssignTo) {
            let targetUserId = '';
            const proj = project as unknown as Project;
            if (role === 'seller') targetUserId = proj.sellerId;
            else if (role === 'buyer') targetUserId = proj.buyerId || '';
            else if (role === 'admin') targetUserId = proj.managerId;

            if (targetUserId) {
              await this.assignFormToUser(def, projectId, targetUserId);
            }
          }
        } else {
          // Add without assignment if no auto-assign roles set but auto-add is true
          await this.createSubmission({
            projectId,
            formKey: def.key,
            title: def.title,
            formData: def.defaultData || {},
            status: 'draft' as FormStatus,
            submitterId: '',
            meta: {
              needsSignatureFromSeller: def.needSignatureFromSeller,
              needsSignatureFromBuyer: def.needSignatureFromBuyer
            }
          });
        }
      }
    } catch (err) {
      console.error('Error auto-provisioning forms:', err);
    }
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
    const items = response.documents.map((d) => parseSubmissionDoc(d as Record<string, unknown>));
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

    let items = response.documents.map((d) => parseSubmissionDoc(d as Record<string, unknown>));

    if (options?.status && Array.isArray(options.status)) {
      items = items.filter(i => (options.status as string[]).includes(i.status));
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      items = items.filter(i => (i.title || i.formKey || '').toLowerCase().includes(q) || JSON.stringify(i.formData || '').toLowerCase().includes(q));
    }

    return { total: response.total || items.length, items };
  },

  async backfillFormToProjects(def: FormDefinition) {
    try {
      const projectsRes = await projectService.list();
      const projects = projectsRes.documents;

      for (const project of projects) {
        // Check if this specific form key already exists in this project
        const { items: existingForms } = await this.listByProject(project.$id);
        const alreadyHasForm = existingForms.some(f => f.formKey === def.key);

        if (!alreadyHasForm) {
          // Backfilling form to project
          if (def.autoAssignTo && def.autoAssignTo.length > 0) {
            for (const role of def.autoAssignTo) {
              let targetUserId = '';
              if (role === 'seller') targetUserId = project.sellerId;
              else if (role === 'buyer') targetUserId = project.buyerId || '';
              else if (role === 'admin') targetUserId = project.managerId;

              if (targetUserId) {
                await this.assignFormToUser(def, project.$id, targetUserId);
              }
            }
          } else if (def.autoAddToNewProjects) {
          await this.createSubmission({
            projectId: project.$id,
            formKey: def.key,
            title: def.title || '',
            formData: def.defaultData || {},
            status: 'draft' as FormStatus,
            submitterId: ''
          });
          }
        }
      }
    } catch (err) {
      console.error('Error backfilling forms:', err);
    }
  }
};

export default projectFormsService;
