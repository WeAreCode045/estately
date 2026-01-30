import { databases, DATABASE_ID, COLLECTIONS, storage, Query, BUCKETS, profileService, projectService } from './appwrite';
import { ID } from 'appwrite';
import type { CreateSubmissionParams, FormSubmission, FormSubmissionPatch, FormStatus, FormDefinition, ProjectTask } from '../types';
import { formDefinitionsService } from './formDefinitionsService';

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
      submittedByUserId: params.submittedByUserId || '',
      assignedToUserId: params.assignedToUserId || '',
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
    if (patch.meta !== undefined) payload.meta = typeof patch.meta === 'string' ? patch.meta : JSON.stringify(patch.meta);

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

  async assignFormToUser(def: FormDefinition, projectId: string, targetProfileId: string) {
    // 1. Create Form Submission
    await this.createSubmission({
      projectId: projectId,
      formKey: def.key,
      title: def.title,
      data: def.defaultData || {},
      assignedToUserId: targetProfileId,
      status: 'assigned',
      meta: {
        needsSignatureFromSeller: def.needSignatureFromSeller,
        needsSignatureFromBuyer: def.needSignatureFromBuyer
      }
    });

    // 2. Handle Auto-Task Creation if enabled
    if (def.autoCreateTaskForAssignee) {
      const newTask: ProjectTask = {
        id: ID.unique(),
        title: `Fill out form: ${def.title}`,
        description: `Please complete the ${def.title} form as requested.`,
        category: 'Legal',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 3 days
        completed: false,
        notifyAssignee: true,
        notifyAgentOnComplete: true
      };

      // Get current project to update tasks
      const project = await projectService.get(projectId);
      const currentTasks = project.tasks ? (typeof project.tasks === 'string' ? JSON.parse(project.tasks) : project.tasks) : [];
      const updatedTasks = [...currentTasks, newTask];
      
      await projectService.update(projectId, { tasks: JSON.stringify(updatedTasks) });
      
      // Also assign to profile for "My Tasks" view
      await profileService.assignTask(targetProfileId, newTask.id, {
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate,
        projectId: projectId,
        status: 'PENDING'
      });
    }
  },

  async autoProvisionForms(projectId: string, project: any) {
    try {
      const defs = await formDefinitionsService.list();
      const autoAddDefs = defs.filter(d => d.autoAddToNewProjects);

      for (const def of autoAddDefs) {
        if (def.autoAssignTo && def.autoAssignTo.length > 0) {
          for (const role of def.autoAssignTo) {
            let targetUserId = '';
            if (role === 'seller') targetUserId = project.sellerId;
            else if (role === 'buyer') targetUserId = project.buyerId || '';
            else if (role === 'admin') targetUserId = project.managerId;

            if (targetUserId) {
              await this.assignFormToUser(def, projectId, targetUserId);
            }
          }
        } else {
          // Add without assignment if no auto-assign roles set but auto-add is true
          await this.createSubmission({
            projectId: projectId,
            formKey: def.key,
            title: def.title,
            data: def.defaultData || {},
            status: 'draft',
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
          console.log(`Backfilling form ${def.key} to project ${project.$id}`);
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
              title: def.title,
              data: def.defaultData || {},
              status: 'draft'
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
