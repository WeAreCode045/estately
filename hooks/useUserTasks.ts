import { useCallback, useEffect, useState } from 'react';
import { documentRecordService, profileService, taskService } from '../api/appwrite';
import type { DocumentRecord, Task, TaskStatus } from '../types';

/**
 * Hook to fetch and manage tasks assigned to the current user
 * Includes their uploaded documents for task completion tracking
 */
export function useUserTasks(userId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userDocuments, setUserDocuments] = useState<DocumentRecord[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user profile to find their profile ID
      const profile = await profileService.getByUserId(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      setUserProfile(profile);

      // Fetch tasks assigned to this profile
      const userTasks = await taskService.listByAssignee(profile.$id);
      setTasks(userTasks);

      // Fetch user's documents
      const docs = await documentRecordService.listByOwner(profile.$id);
      setUserDocuments(docs);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
      console.error('Error fetching user tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createPersonalTask = async (taskData: {
    title: string;
    description?: string;
    projectId: string;
    dueDate?: string;
  }) => {
    if (!userProfile) {
      throw new Error('User profile not loaded');
    }

    try {
      const newTask = await taskService.create({
        title: taskData.title,
        description: taskData.description,
        taskType: 'personal',
        status: 'todo',
        projectId: taskData.projectId,
        assigneeId: userProfile.$id,
        dueDate: taskData.dueDate
      });

      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
      throw err;
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      await taskService.updateStatus(taskId, 'completed');
      setTasks(prev =>
        prev.map(task =>
          task.$id === taskId
            ? { ...task, status: 'completed' as TaskStatus }
            : task
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to complete task');
      throw err;
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const overdueTasks = pendingTasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date()
  );
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;

  return {
    tasks,
    pendingTasks,
    overdueTasks,
    completedTasksCount,
    userDocuments,
    userProfile,
    loading,
    error,
    createPersonalTask,
    completeTask,
    refetch: fetchTasks
  };
}
