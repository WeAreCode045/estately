import { ID } from 'appwrite';
import type { UserDocumentDefinition } from '../types';
import { TaskStatus, TaskType } from '../types';
import { COLLECTIONS, DATABASE_ID, databases, documentRecordService, profileService, projectService, taskService } from './appwrite';
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

  /**
   * Execute Assignment - RELATIONAL MODEL
   * Creates a task in the tasks collection with required_doc_type
   * This implements the "Requirement Workflow":
   * 1. Task is created with required_doc_type
   * 2. User uploads document
   * 3. completeDocumentTask() finds and completes the task
   */
  async executeAssignment(def: UserDocumentDefinition, projectId: string, targetUserId: string) {
    try {
      if (def.autoCreateTaskForAssignee) {
        // Create task in tasks collection (relational model)
        await taskService.create({
          title: `Upload Document: ${def.title}`,
          description: def.description || `Please upload your ${def.title}.`,
          taskType: TaskType.DOCUMENT_UPLOAD,
          status: TaskStatus.TODO,
          projectId: projectId,
          assignee_id: targetUserId,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          required_doc_type: def.key || def.title,
          category: 'Legal'
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

    // 3. Create record in documents collection
    try {
      await documentRecordService.create({
        title: storageName,
        type: documentType,
        source: 'upload',
        fileId: uploadedFile.$id,
        projectId: projectId,
        ownerId: profile.$id,
        verificationStatus: 'pending'
      });

      // 4. Also update user profile for backwards compatibility (legacy)
      await profileService.addDocument(profile.$id, {
          fileId: uploadedFile.$id,
          name: storageName,
          userDocumentDefinitionId: definitionId,
          documentType,
          projectId,
          url: fileUrl
      });

      // 5. Find and complete the associated task (Requirement Workflow completion)
      const tasks = await taskService.listByProject(projectId, {
        assigneeId: profile.$id,
        status: TaskStatus.TODO,
        taskType: TaskType.DOCUMENT_UPLOAD
      });

      const taskToComplete = tasks.find((t: any) =>
        t.required_doc_type === definitionId ||
        t.title?.includes(documentType)
      );

      if (taskToComplete) {
        await taskService.updateStatus(taskToComplete.$id, TaskStatus.COMPLETED);
      }
    } catch (error) {
      console.error('Could not log document or complete task:', error);
      throw error;
    }

    return { fileUrl, fileId: uploadedFile.$id };
  },

  /**
   * Approve Document - RELATIONAL MODEL
   * Updates task status directly in tasks collection
   */
  async approveDocument(userId: string, taskId: string) {
    try {
      await taskService.updateStatus(taskId, TaskStatus.COMPLETED);
    } catch (error) {
      console.error('Error approving task:', error);
      throw error;
    }
  },

  /**
   * Reject Document - RELATIONAL MODEL
   * Resets task status in tasks collection
   */
  async rejectDocument(userId: string, taskId: string) {
    try {
      await taskService.updateStatus(taskId, TaskStatus.TODO);
    } catch (error) {
      console.error('Error rejecting task:', error);
      throw error;
    }
  },

  /**
   * Generate Contract from Template - "Template to Contract" Workflow
   *
   * Workflow:
   * 1. Get template from contract_templates collection
   * 2. Replace placeholders with Project + Property + User data
   * 3. Store result in documents collection (source: 'generated')
   * 4. Create sign_request for required signers
   *
   * @param templateId - ID from contract_templates collection
   * @param projectId - Project ID
   * @param customData - Additional data for placeholder replacement
   * @returns Document ID and sign request ID
   */
  async generateContractFromTemplate(
    templateId: string,
    projectId: string,
    customData: Record<string, any> = {}
  ): Promise<{ documentId: string; signRequestId: string }> {
    try {
      // 1. Get template
      const template = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.CONTRACT_TEMPLATES,
        templateId
      );

      // 2. Get project and property data for placeholders
      const project = await projectService.get(projectId);
      const property = project.propertyId
        ? await databases.getDocument(DATABASE_ID, COLLECTIONS.PROPERTIES, project.propertyId)
        : null;

      // Parse property JSON fields
      const locationData = property?.location ? JSON.parse(property.location) : {};
      const sizeData = property?.size ? JSON.parse(property.size) : {};

      // 3. Build placeholder data
      const placeholderData = {
        project_title: project.title || '',
        project_price: project.price || 0,
        project_id: project.$id,
        property_address: locationData.street && locationData.city
          ? `${locationData.street} ${locationData.streetNumber || ''}, ${locationData.postalCode || ''} ${locationData.city}`
          : 'N/A',
        property_size: sizeData.floorSize || 'N/A',
        seller_id: project.sellerId || '',
        buyer_id: project.buyerId || '',
        date: new Date().toLocaleDateString('nl-NL'),
        ...customData
      };

      // 4. Replace placeholders in template content
      let content = template.content || '';
      for (const [key, value] of Object.entries(placeholderData)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        content = content.replace(regex, String(value ?? ''));
      }

      // 5. Store generated document in documents collection
      const documentRecord = await documentRecordService.create({
        title: template.title || 'Generated Contract',
        type: 'Contract',
        source: 'generated',
        fileId: '', // Will be filled when PDF is generated
        projectId: projectId,
        ownerId: project.managerId,
        verificationStatus: 'pending',
        metadata: JSON.stringify({
          templateId: templateId,
          generatedAt: new Date().toISOString(),
          content: content // Store HTML/text content
        })
      });

      // 6. Parse required signers from template
      const requiredRoles = template.required_roles
        ? (typeof template.required_roles === 'string' ? JSON.parse(template.required_roles) : template.required_roles)
        : ['buyer', 'seller'];

      // Map roles to profile IDs
      const signerIds: string[] = [];
      if (requiredRoles.includes('seller') && project.sellerId) signerIds.push(project.sellerId);
      if (requiredRoles.includes('buyer') && project.buyerId) signerIds.push(project.buyerId);
      if (requiredRoles.includes('agent') && project.managerId) signerIds.push(project.managerId);

      // 7. Create sign request
      const signRequest = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.SIGN_REQUESTS,
        ID.unique(),
        {
          parent_id: documentRecord.$id,
          parent_type: 'document',
          status: 'pending',
          required_signers: JSON.stringify(signerIds.map(id => ({ profileId: id, signed: false }))),
          signature_data: JSON.stringify({}),
          projectId: projectId
        }
      );

      return {
        documentId: documentRecord.$id,
        signRequestId: signRequest.$id
      };
    } catch (error) {
      console.error('Error generating contract from template:', error);
      throw error;
    }
  }
};
