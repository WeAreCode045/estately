import { databases, storage, DATABASE_ID, COLLECTIONS, Query, profileService, BUCKETS } from './appwrite';
import { ID } from 'appwrite';
import { RequiredDocument, UserRole } from '../types';

export const documentService = {
  async listRequired() {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS);
  },

  async createRequired(data: Partial<RequiredDocument>) {
    const { id, createTask, showTaskInProject, linkedTaskTemplateId, ...coreData } = data as any;
    const dataToSave = {
      ...coreData,
      taskCreationMoment: showTaskInProject || (data as any).taskCreationMoment || 'PROJECT_CREATION'
    };
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, ID.unique(), dataToSave);
  },

  async updateRequired(id: string, data: Partial<RequiredDocument>) {
    const { id: dummy, createTask, showTaskInProject, linkedTaskTemplateId, ...coreData } = data as any;
    const dataToSave = {
      ...coreData,
      taskCreationMoment: showTaskInProject || (data as any).taskCreationMoment || 'PROJECT_CREATION'
    };
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, id, dataToSave);
  },

  async deleteRequired(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, id);
  },

  getFileView(fileId: string) {
    return storage.getFileView(BUCKETS.DOCUMENTS, fileId).toString();
  },

  getFileDownload(fileId: string) {
    return storage.getFileDownload(BUCKETS.DOCUMENTS, fileId).toString();
  },

  async getFileUrl(fileId: string) {
    // Try view first, then download as fallback. Return the first usable URL string.
    try {
      const view = storage.getFileView(BUCKETS.DOCUMENTS, fileId);
      if (view) return view.toString();
    } catch (e) {
      // ignore
    }

    try {
      const dl = storage.getFileDownload(BUCKETS.DOCUMENTS, fileId);
      if (dl) return dl.toString();
    } catch (e) {
      // ignore
    }

    // No URL available
    throw new Error('File URL not available');
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

  async syncProjectRequirements(projectId: string, trigger: 'PROJECT_CREATION' | 'MANUAL') {
    // 1. Get project details to identify Seller/Buyer
    let projectDoc: any;
    try {
      projectDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId);
    } catch (e) {
      console.error('Project not found during sync:', e);
      return [];
    }

    // 2. Get all active requirements
    const requirementsRes = await this.listRequired();
    const requirements = requirementsRes.documents as any[];

    // 3. We also need task template details to check user roles
    const tasksRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TASK_TEMPLATES);
    const taskTemplates = tasksRes.documents as any[];

    const results = [];
    for (const req of requirements) {
      const template = taskTemplates.find(t => t.$id === req.taskId);
      if (!template) continue;

      const roles = template.assigneeRoles || [];
      
      for (const role of roles) {
        const userId = role === 'SELLER' ? projectDoc.sellerId : (role === 'BUYER' ? projectDoc.buyerId : null);
        if (!userId) continue;

        try {
          const profile = await profileService.getByUserId(userId);
          if (profile) {
            const userDocs = profile.userDocuments ? (typeof profile.userDocuments === 'string' ? JSON.parse(profile.userDocuments) : profile.userDocuments) : [];
            
            const alreadyHasDoc = userDocs.some((d: any) => {
              if (d.documentRequirementId !== req.$id) return false;
              if (req.isGlobal) return true;
              return d.projectId === projectId;
            });
            
            await profileService.assignTask(profile.$id, req.taskId, {
              status: alreadyHasDoc ? 'COMPLETED' : 'PENDING'
            });
            results.push({ userId, taskId: req.taskId, status: 'PROCESSED' });
          }
        } catch (profileError) {
          console.error('Error syncing requirement for profile:', profileError);
        }
      }
    }

    return results;
  },

  async uploadDocument(userId: string, requiredDocId: string, projectId: string, file: File) {
    const profile = await profileService.getByUserId(userId);
    if (!profile) throw new Error('User profile not found');

    let documentType = 'Personal';
    let taskId = null;
    let isGlobal = false;

    if (requiredDocId !== 'general') {
      try {
        const reqDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.REQUIRED_DOCUMENTS, requiredDocId);
        documentType = reqDoc.documentType;
        taskId = reqDoc.taskId;
        isGlobal = reqDoc.isGlobal;
      } catch (e) {
        console.warn('Could not find required document definition:', e);
      }
    }

    // 1. Upload to storage
    const uploadedFile = await storage.createFile(BUCKETS.DOCUMENTS, ID.unique(), file);
    
    // 2. Get the file URL
    const fileUrl = storage.getFileView(BUCKETS.DOCUMENTS, uploadedFile.$id).toString();

    // 3. Update User Profile
    try {
      await profileService.addDocument(profile.$id, {
          fileId: uploadedFile.$id,
          name: file.name,
          documentRequirementId: requiredDocId,
          documentType,
          projectId: isGlobal ? 'global' : projectId,
          url: fileUrl
      });
      
      // 4. Mark linked task as COMPLETED if it exists
      if (taskId) {
          // If global, we may want to update across all projects. 
          // profileService.updateTaskStatus currently takes profileId and taskId.
          // In the current logic, AssignedTask is in the profile but doesn't have a projectId.
          // So updateTaskStatus(profileId, taskId, 'COMPLETED') ALREADY updates it globally for that user.
          await profileService.updateTaskStatus(profile.$id, taskId, 'COMPLETED');
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
