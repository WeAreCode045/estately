/**
 * Task Service - Manages tasks in the relational model
 *
 * Tasks are stored as separate entities with relationships to:
 * - project_id (required)
 * - assignee_id (optional - if empty, it's an agent-managed task)
 * - sign_request_id (optional)
 */

import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from './appwrite';
import type { Task, TaskStatus, TaskType } from '../types';

export const taskService = {
  /**
   * Create a new task
   */
  async create(data: {
    title: string;
    description?: string;
    task_type: TaskType;
    status?: TaskStatus;
    project_id: string;
    assignee_id?: string;
    due_date?: string;
    required_doc_type?: string;
    category?: string;
  }): Promise<Task> {
    const taskData = {
      ...data,
      status: data.status || 'todo'
    };

    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      ID.unique(),
      taskData
    );

    return response as Task;
  },

  /**
   * Get task by ID
   */
  async get(taskId: string): Promise<Task | null> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.TASKS,
        taskId
      );
      return response as Task;
    } catch (error) {
      console.error('taskService.get error:', error);
      return null;
    }
  },

  /**
   * List all tasks for a project
   */
  async listByProject(projectId: string, filters?: {
    assigneeId?: string;
    status?: TaskStatus;
    taskType?: TaskType;
  }): Promise<Task[]> {
    const queries = [Query.equal('project_id', projectId)];

    if (filters?.assigneeId) {
      queries.push(Query.equal('assignee_id', filters.assigneeId));
    }
    if (filters?.status) {
      queries.push(Query.equal('status', filters.status));
    }
    if (filters?.taskType) {
      queries.push(Query.equal('task_type', filters.taskType));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      queries
    );

    return response.documents as Task[];
  },

  /**
   * List all tasks assigned to a specific user (by profile ID)
   */
  async listByAssignee(assigneeId: string, filters?: {
    status?: TaskStatus;
    projectId?: string;
  }): Promise<Task[]> {
    const queries = [Query.equal('assignee_id', assigneeId)];

    if (filters?.status) {
      queries.push(Query.equal('status', filters.status));
    }
    if (filters?.projectId) {
      queries.push(Query.equal('project_id', filters.projectId));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      queries
    );

    return response.documents as Task[];
  },

  /**
   * Update task status
   */
  async updateStatus(taskId: string, status: TaskStatus): Promise<Task> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      taskId,
      { status }
    );

    return response as Task;
  },

  /**
   * Update task
   */
  async update(taskId: string, data: Partial<Omit<Task, keyof import('../types').AppwriteDocument>>): Promise<Task> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      taskId,
      data
    );

    return response as Task;
  },

  /**
   * Delete task
   */
  async delete(taskId: string): Promise<void> {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      taskId
    );
  },

  /**
   * Assign task to a user
   */
  async assign(taskId: string, assigneeId: string): Promise<Task> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      taskId,
      { assignee_id: assigneeId }
    );

    return response as Task;
  },

  /**
   * Unassign task (make it agent-managed)
   */
  async unassign(taskId: string): Promise<Task> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      taskId,
      { assignee_id: null }
    );

    return response as Task;
  },

  /**
   * Link task to sign request
   */
  async linkSignRequest(taskId: string, signRequestId: string): Promise<Task> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.TASKS,
      taskId,
      { sign_request_id: signRequestId }
    );

    return response as Task;
  }
};
