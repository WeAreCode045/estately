/**
 * Relational Model Helper Utilities
 *
 * Common patterns and helper functions for working with the relational database model
 */

import { COLLECTIONS, DATABASE_ID, databases, projectService } from './api/appwrite';
import { documentService } from './api/documentService';
import { taskService } from './api/taskService';
import type { Project, Task } from './types';

/**
 * Get all incomplete tasks for a project grouped by type
 */
export async function getProjectTasksSummary(projectId: string) {
  const allTasks = await taskService.listByProject(projectId);

  const summary = {
    total: allTasks.length,
    completed: allTasks.filter((t: Task) => t.status === 'completed').length,
    byType: {
      document_upload: allTasks.filter((t: Task) => t.taskType === 'document_upload'),
      form_submission: allTasks.filter((t: Task) => t.taskType === 'form_submission'),
      signature_required: allTasks.filter((t: Task) => t.taskType === 'signature_required'),
      general: allTasks.filter((t: Task) => t.taskType === 'general')
    },
    pending: allTasks.filter((t: Task) => t.status === 'todo' || t.status === 'in_progress')
  };

  return summary;
}

/**
 * Get all tasks for a user across all their projects
 */
export async function getUserTasksAcrossProjects(userId: string) {
  const tasks = await taskService.listByAssignee(userId);
  return tasks;
}

/**
 * Create a document requirement task
 * Returns the task ID for tracking
 */
export async function createDocumentRequirement(
  projectId: string,
  assigneeId: string,
  documentType: string,
  title: string,
  dueDate?: string
): Promise<string> {
  const task = await taskService.create({
    title: title || `Upload ${documentType}`,
    description: `Please upload your ${documentType} document.`,
    taskType: 'document_upload',
    status: 'todo',
    projectId,
    assignee_id: assigneeId,
    required_doc_type: documentType,
    due_date: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    category: 'Legal'
  });

  return task.$id;
}

/**
 * Check if all required documents are uploaded for a project
 */
export async function checkProjectDocumentCompletion(projectId: string): Promise<{
  complete: boolean;
  missing: string[];
  uploaded: string[];
}> {
  const tasks = await taskService.listByProject(projectId, {
    taskType: 'document_upload'
  });

  const completed = tasks.filter((t: Task) => t.status === 'completed');
  const pending = tasks.filter((t: Task) => t.status !== 'completed');

  return {
    complete: pending.length === 0,
    missing: pending.map((t: Task) => t.required_doc_type || t.title).filter(Boolean),
    uploaded: completed.map((t: Task) => t.required_doc_type || t.title).filter(Boolean)
  };
}

/**
 * Get project completion percentage based on tasks
 */
export async function getProjectCompletionPercentage(projectId: string): Promise<number> {
  const tasks = await taskService.listByProject(projectId);

  if (tasks.length === 0) return 0;

  const completed = tasks.filter((t: Task) => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
}

/**
 * Get all documents for a project with their sign request status
 */
export async function getProjectDocumentsWithSignatures(projectId: string) {
  // Get documents via documentRecordService
  const documentsResponse = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.DOCUMENT_RECORDS,
    [`projectId=${projectId}`]
  );

  const documents = documentsResponse.documents;

  // Get all sign requests for this project
  const signRequestsResponse = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SIGN_REQUESTS,
    [`projectId=${projectId}`]
  );

  const signRequests = signRequestsResponse.documents;

  // Match documents with their sign requests
  const enrichedDocuments = documents.map((doc: any) => {
    const signRequest = signRequests.find((sr: any) =>
      sr.parent_type === 'document' && sr.parent_id === doc.$id
    );

    return {
      ...doc,
      signRequest: signRequest || null,
      requiresSignature: !!signRequest,
      signatureComplete: signRequest?.status === 'completed'
    };
  });

  return enrichedDocuments;
}

/**
 * Generate contract and start signature workflow in one call
 */
export async function generateAndInitiateContract(
  templateId: string,
  projectId: string,
  customData: Record<string, any> = {}
): Promise<{
  documentId: string;
  signRequestId: string;
  signersCount: number;
}> {
  const result = await documentService.generateContractFromTemplate(
    templateId,
    projectId,
    customData
  );

  // Get sign request to count signers
  const signRequest = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.SIGN_REQUESTS,
    result.signRequestId
  );

  const requiredSigners = signRequest.required_signers
    ? JSON.parse(signRequest.required_signers as string)
    : [];

  return {
    ...result,
    signersCount: requiredSigners.length
  };
}

/**
 * Get project with all related data (property, tasks, documents)
 */
export async function getProjectWithRelations(projectId: string) {
  const project = await projectService.get(projectId) as Project;

  // Get property if exists
  let property = null;
  if (project.propertyId) {
    property = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PROPERTIES,
      project.propertyId
    );
  }

  // Get tasks
  const tasks = await taskService.listByProject(projectId);

  // Get documents
  const documentsResponse = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.DOCUMENT_RECORDS,
    [`projectId=${projectId}`]
  );

  // Get forms
  const formsResponse = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECT_FORMS,
    [`projectId=${projectId}`]
  );

  return {
    project,
    property,
    tasks,
    documents: documentsResponse.documents,
    forms: formsResponse.documents,
    completion: await getProjectCompletionPercentage(projectId)
  };
}

/**
 * Bulk assign multiple document requirements
 */
export async function assignMultipleDocumentRequirements(
  projectId: string,
  requirements: Array<{
    assigneeId: string;
    documentType: string;
    title: string;
    dueDate?: string;
  }>
): Promise<string[]> {
  const taskIds: string[] = [];

  for (const req of requirements) {
    const taskId = await createDocumentRequirement(
      projectId,
      req.assigneeId,
      req.documentType,
      req.title,
      req.dueDate
    );
    taskIds.push(taskId);
  }

  return taskIds;
}

/**
 * Check if a user has pending tasks for a project
 */
export async function userHasPendingTasks(
  userId: string,
  projectId: string
): Promise<boolean> {
  const tasks = await taskService.listByProject(projectId, {
    assigneeId: userId,
    status: 'todo'
  });

  return tasks.length > 0;
}

/**
 * Get overdue tasks for a project
 */
export async function getOverdueTasks(projectId: string): Promise<Task[]> {
  const tasks = await taskService.listByProject(projectId);
  const today = new Date().toISOString().slice(0, 10);

  return tasks.filter((t: Task) =>
    t.status !== 'completed' &&
    t.due_date &&
    t.due_date < today
  );
}
