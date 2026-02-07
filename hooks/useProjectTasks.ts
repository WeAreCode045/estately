import { useCallback, useEffect, useState } from 'react';
import { taskService } from '../api/appwrite';
import type { Task, TaskStatus, TaskType } from '../types';

interface UseProjectTasksOptions {
  projectId: string;
  assigneeId?: string;
  status?: TaskStatus;
  taskType?: TaskType;
}

/**
 * Hook to fetch and manage tasks for a specific project
 * Uses the relational tasks collection with project_id relationship
 */
export function useProjectTasks(options: UseProjectTasksOptions) {
  const { projectId, assigneeId, status, taskType } = options;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const filters = {
        assigneeId,
        status,
        taskType
      };

      const tasksData = await taskService.listByProject(projectId, filters);
      setTasks(tasksData);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
      console.error('Error fetching project tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, assigneeId, status, taskType]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (taskData: {
    title: string;
    description?: string;
    taskType: TaskType;
    assignee_id?: string;
    due_date?: string;
    required_doc_type?: string;
    category?: string;
  }) => {
    try {
      const newTask = await taskService.create({
        ...taskData,
        projectId: projectId,
        status: 'todo'
      });

      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
      throw err;
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await taskService.updateStatus(taskId, newStatus);
      setTasks(prev =>
        prev.map(task =>
          task.$id === taskId
            ? { ...task, status: newStatus }
            : task
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
      throw err;
    }
  };

  const assignTask = async (taskId: string, assigneeId: string) => {
    try {
      await taskService.assign(taskId, assigneeId);
      setTasks(prev =>
        prev.map(task =>
          task.$id === taskId
            ? { ...task, assigneeId: assigneeId }
            : task
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to assign task');
      throw err;
    }
  };

  const pendingCount = tasks.filter(t => t.status !== 'completed').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return {
    tasks,
    loading,
    error,
    pendingCount,
    completedCount,
    createTask,
    updateTaskStatus,
    assignTask,
    refetch: fetchTasks
  };
}
