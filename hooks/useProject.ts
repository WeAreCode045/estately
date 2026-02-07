import { useEffect, useState } from 'react';
import { projectService } from '../api/appwrite';
import type { ParsedPropertyData } from '../api/propertyService';
import { getPropertyParsed } from '../api/propertyService';
import type { Project } from '../types';

/**
 * Hook to fetch and manage a single project by ID
 * Includes related property data via property_id relationship
 */
export function useProject(projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [propertyData, setPropertyData] = useState<ParsedPropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);

        const projectData = await projectService.get(projectId);
        setProject(projectData);

        // Load related property data if property_id exists
        const projectDoc = projectData as any;
        if (projectDoc.property_id) {
          try {
            const parsed = await getPropertyParsed(projectDoc.property_id);
            setPropertyData(parsed);
          } catch (propError) {
            console.error('Error loading property:', propError);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load project');
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const updateProject = async (updates: Partial<Project>) => {
    if (!projectId) return;

    try {
      await projectService.update(projectId, updates);
      setProject(prev => prev ? { ...prev, ...updates } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
      throw err;
    }
  };

  return {
    project,
    propertyData,
    loading,
    error,
    updateProject,
    refetch: () => {
      if (projectId) {
        setLoading(true);
        projectService.get(projectId).then(setProject).finally(() => setLoading(false));
      }
    }
  };
}
