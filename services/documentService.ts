import { ID } from 'appwrite';
import type { ProjectTask, UserDocumentDefinition } from '../types';
import { COLLECTIONS, DATABASE_ID, databases, profileService, projectService } from './appwrite';
import { s3Service } from './s3Service';

export const documentService = {
  async listDefinitions() {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS);
    // Map 'name' back to 'title' for frontend compatibility
    const documents = response.documents.map((doc: any) => ({
      ...doc,
      title: doc.name || doc.title
    }));
    return { ...response, documents };
  },

  async createDefinition(data: Partial<UserDocumentDefinition>) {
    // Key is used as the document ID, not an attribute
    const { key, title, ...rest } = data;
    // Map title to name
    const payload = { ...rest, name: title };

    const id = key ? key.toLowerCase().replace(/[^a-z0-9._-]/g, '_') : ID.unique();
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, id, payload);
  },

  async updateDefinition(id: string, data: Partial<UserDocumentDefinition>) {
    // Key cannot be updated as it's the ID
    const { key, title, ...rest } = data;
    // Map title to name if present
    const payload = title ? { ...rest, name: title } : rest;

    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, id, payload);
  },

  async deleteDefinition(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, id);
  },

  async executeAssignment(def: UserDocumentDefinition, projectId: string, targetUserId: string) {
    try {
      // 1. Create a task for the user
      if (def.autoCreateTaskForAssignee) {
        const taskId = ID.unique();
        const newTask: ProjectTask = {
          id: taskId,
          title: `Upload Document: ${def.title}`,
          description: def.description || `Please upload your ${def.title}.`,
          category: 'Legal',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          completed: false,
          notifyAssignee: true,
          notifyAgentOnComplete: true
        };

        // Update project tasks
        const project = await projectService.get(projectId);
        if (project) {
          const updatedTasks = [...project.tasks, newTask];
          await projectService.update(projectId, { tasks: JSON.stringify(updatedTasks) });
        }

        // Assign to profile
        await profileService.assignTask(targetUserId, taskId, {
          title: newTask.title,
          description: newTask.description,
          dueDate: newTask.dueDate,
          projectId,
          status: 'PENDING'
        });
      }
    } catch (error) {
      console.error('Error during document assignment:', error);
      throw error;
    }
  },

  getFileView(fileId: string) {
    return s3Service.getPresignedUrl(fileId);
  },

  getFilePreview(fileId: string) {
    return s3Service.getPresignedUrl(fileId);
  },

  getFileDownload(fileId: string) {
    return s3Service.getPresignedUrl(fileId);
  },

  async getFileUrl(fileId: string) {
    try {
      // 1. Get file metadata to determine type
      const file = await this.getFile(fileId);
      const isImage = (file?.mimeType || '').startsWith('image/');

      if (isImage) return this.getFilePreview(fileId);
      return this.getFileView(fileId);
    } catch (e) {
      // Fallback
      return this.getFileView(fileId);
    }
  },

  async getFile(fileId: string) {
    try {
      const head = await s3Service.headObject(fileId);
      const name = fileId.split('/').pop() || fileId;
      return { $id: fileId, mimeType: head.ContentType, name };
    } catch (e) {
      throw e;
    }
  },

  async deleteDocument(fileId: string) {
    // 1. Delete from storage
    try {
      await s3Service.deleteObject(fileId);
    } catch (e) {
      console.error('File storage deletion failed (maybe already gone):', e);
    }

    // 2. Find which profile has this file and remove reference
    const profiles = await profileService.listAll();
    for (const doc of profiles.documents) {
        const userDocs = doc.userDocuments ? (typeof doc.userDocuments === 'string' ? JSON.parse(doc.userDocuments) : doc.userDocuments) : [];
        if (userDocs.find((u: any) => u.fileId === fileId)) {
            await profileService.deleteDocumentReference(doc.$id, fileId);
            break;
        }
    }
  },

  async autoProvisionDocuments(projectId: string, project: any) {
    try {
      const defRes = await this.listDefinitions();
      const defs = defRes.documents as any[] as UserDocumentDefinition[];
      const autoAddDefs = defs.filter(d => d.autoAddToNewProjects);

      for (const def of autoAddDefs) {
        if (def.autoAssignTo && def.autoAssignTo.length > 0) {
          for (const role of def.autoAssignTo) {
            let targetUserId = '';
            // Match role to project participants
            if (role === 'seller') targetUserId = project.sellerId;
            else if (role === 'buyer') targetUserId = project.buyerId || '';
            else if (role === 'admin') targetUserId = project.managerId;

            if (targetUserId) {
              await this.executeAssignment(def, projectId, targetUserId);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error auto-provisioning documents:', err);
    }
  },

  async uploadDocument(userId: string, definitionId: string, projectId: string, file: File) {
    const profile = await profileService.getByUserId(userId);
    if (!profile) throw new Error('User profile not found');

    let documentType = 'Personal';
    let overrideName = '';

    if (definitionId !== 'general') {
      try {
        const def = await databases.getDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, definitionId);
        documentType = def.title || 'Personal';
        overrideName = def.overrideDocumentName || '';
      } catch (e) {
        console.warn('Could not find document definition:', e);
      }
    }

    // 1. Rename file for storage: [OverrideDocumentName]_[userId].[ext]
    const extension = file.name.split('.').pop();
    const storageName = overrideName ? `${overrideName}_${userId}.${extension}` : file.name;
    const renamedFile = new File([file], storageName, { type: file.type });

    // 2. Upload to S3 under project/{projectId}/user-files
    const folder = 'user-files';
    const uploaded = await s3Service.uploadProjectFile(projectId, folder as any, renamedFile);
    const uploadedFile: any = { $id: uploaded.key, name: storageName };
    const fileUrl = uploaded.url;

    // 4. Update User Profile
    try {
      await profileService.addDocument(profile.$id, {
          fileId: uploadedFile.$id,
          name: storageName,
          userDocumentDefinitionId: definitionId,
          documentType,
          projectId,
          url: fileUrl
      });

      // 5. Try to find and complete the associated task
      const matchTitle = `Upload Document: ${documentType}`;
      const tasks = profile.assignedTasks || [];
      const taskToComplete = tasks.find((t: any) => t.title === matchTitle && t.projectId === projectId && t.status === 'PENDING');

      if (taskToComplete) {
          await profileService.updateTaskStatus(profile.$id, taskToComplete.taskId, 'COMPLETED');
      }
    } catch (profileError) {
      console.error('Could not log document in user profile:', profileError);
      throw profileError;
    }

    return { fileUrl, fileId: uploadedFile.$id };
  },

  async approveDocument(userId: string, taskId: string) {
    try {
      const profile = await profileService.getByUserId(userId);
      if (profile) {
        await profileService.updateTaskStatus(profile.$id, taskId, 'COMPLETED');
      }
    } catch (error) {
      console.error('Error approving task in profile:', error);
    }
  },

  async rejectDocument(userId: string, taskId: string) {
    try {
      const profile = await profileService.getByUserId(userId);
      if (profile) {
        await profileService.updateTaskStatus(profile.$id, taskId, 'PENDING');
      }
    } catch (error) {
      console.error('Error rejecting task in profile:', error);
    }
  }
};
