import { ID } from 'appwrite';
import { ProjectTask, UserDocumentDefinition } from '../types';
import { BUCKETS, COLLECTIONS, DATABASE_ID, databases, profileService, projectService, storage } from './appwrite';

export const documentService = {
  async listDefinitions() {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS);
  },

  async createDefinition(data: Partial<UserDocumentDefinition>) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, ID.unique(), data);
  },

  async updateDefinition(id: string, data: Partial<UserDocumentDefinition>) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, id, data);
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
          projectId: projectId,
          status: 'PENDING'
        });
      }
    } catch (error) {
      console.error('Error during document assignment:', error);
      throw error;
    }
  },

  getFileView(fileId: string) {
    const url = storage.getFileView({
      bucketId: BUCKETS.DOCUMENTS,
      fileId: fileId
    });
    const finalUrl = url.toString();
    return finalUrl.includes('mode=admin') ? finalUrl : (finalUrl.includes('?') ? `${finalUrl}&mode=admin` : `${finalUrl}?mode=admin`);
  },

  getFilePreview(fileId: string) {
    const url = storage.getFilePreview({
      bucketId: BUCKETS.DOCUMENTS,
      fileId: fileId
    });
    const finalUrl = url.toString();
    return finalUrl.includes('mode=admin') ? finalUrl : (finalUrl.includes('?') ? `${finalUrl}&mode=admin` : `${finalUrl}?mode=admin`);
  },

  getFileDownload(fileId: string) {
    const url = storage.getFileDownload({
      bucketId: BUCKETS.DOCUMENTS,
      fileId: fileId
    });
    const finalUrl = url.toString();
    return finalUrl.includes('mode=admin') ? finalUrl : (finalUrl.includes('?') ? `${finalUrl}&mode=admin` : `${finalUrl}?mode=admin`);
  },

  async getFileUrl(fileId: string) {
    try {
      // 1. Get file metadata to determine type
      const file = await this.getFile(fileId);
      const isImage = file.mimeType.startsWith('image/');

      // 2. Return preview for images, view for others
      if (isImage) {
        return this.getFilePreview(fileId);
      }
      return this.getFileView(fileId);
    } catch (e) {
      // Fallback
      return this.getFileView(fileId);
    }
  },

  async getFile(fileId: string) {
    return await storage.getFile(BUCKETS.DOCUMENTS, fileId);
  },

  async deleteDocument(fileId: string) {
    // 1. Delete from storage
    try {
        await storage.deleteFile(BUCKETS.DOCUMENTS, fileId);
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

    // 2. Upload to storage
    const uploadedFile = await storage.createFile(BUCKETS.DOCUMENTS, ID.unique(), renamedFile);

    // 3. Get the file URL
    const fileUrl = this.getFileView(uploadedFile.$id);

    // 4. Update User Profile
    try {
      await profileService.addDocument(profile.$id, {
          fileId: uploadedFile.$id,
          name: storageName,
          userDocumentDefinitionId: definitionId,
          documentType,
          projectId: projectId,
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
