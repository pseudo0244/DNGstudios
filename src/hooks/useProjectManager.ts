import { useState, useCallback, useEffect } from 'react';
import type { ScoreProject, ProjectSummary, ScorePage } from '../types/music';

const STORAGE_KEY = 'dng-studios-projects';

export const useProjectManager = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  // Load projects from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsedProjects = JSON.parse(stored);
        setProjects(parsedProjects.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        })));
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    }
  }, []);

  const saveProjectsToStorage = useCallback((projectList: ProjectSummary[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectList));
  }, []);

  const createProject = useCallback((title: string, composer: string, description?: string): string => {
    const projectId = `project-${Date.now()}`;
    const initialPage: ScorePage = {
      id: 'page-1',
      title: 'Page 1',
      notes: [],
      timeSignature: { numerator: 4, denominator: 4 },
      keySignature: 'C',
      tempo: 120,
      createdAt: new Date(),
      scoreInfoPosition: { x: 40, y: 40 },
      textElements: [],
    };

    const newProject: ScoreProject = {
      id: projectId,
      title,
      composer,
      description,
      pages: [initialPage],
      currentPageId: 'page-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save full project to localStorage
    localStorage.setItem(`dng-project-${projectId}`, JSON.stringify(newProject));

    const projectSummary: ProjectSummary = {
      id: projectId,
      title,
      composer,
      description,
      pageCount: 1,
      noteCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedProjects = [projectSummary, ...projects];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);

    return projectId;
  }, [projects, saveProjectsToStorage]);

  const deleteProject = useCallback((projectId: string) => {
    localStorage.removeItem(`dng-project-${projectId}`);
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
  }, [projects, saveProjectsToStorage]);

  const updateProjectSummary = useCallback((projectId: string, updates: Partial<ProjectSummary>) => {
    const updatedProjects = projects.map(p => 
      p.id === projectId 
        ? { ...p, ...updates, updatedAt: new Date() }
        : p
    );
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
  }, [projects, saveProjectsToStorage]);

  const loadProject = useCallback((projectId: string): ScoreProject | null => {
    const stored = localStorage.getItem(`dng-project-${projectId}`);
    if (stored) {
      try {
        const project = JSON.parse(stored);
        return {
          ...project,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
          pages: project.pages.map((page: any) => ({
            ...page,
            createdAt: new Date(page.createdAt),
          })),
        };
      } catch (error) {
        console.error('Failed to load project:', error);
      }
    }
    return null;
  }, []);

  const saveProject = useCallback((project: ScoreProject) => {
    localStorage.setItem(`dng-project-${project.id}`, JSON.stringify(project));
    
    // Update summary
    const noteCount = project.pages.reduce((total, page) => total + page.notes.length, 0);
    updateProjectSummary(project.id, {
      title: project.title,
      composer: project.composer,
      description: project.description,
      pageCount: project.pages.length,
      noteCount,
    });
  }, [updateProjectSummary]);

  return {
    projects,
    createProject,
    deleteProject,
    loadProject,
    saveProject,
    updateProjectSummary,
  };
};