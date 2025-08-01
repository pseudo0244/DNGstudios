import { useState, useCallback } from 'react';
import type { ScoreProject, ScorePage, PlacedNote } from '../types/music';

export const useScoreProject = () => {
  const [project, setProject] = useState<ScoreProject | null>(null);

  const setCurrentProject = useCallback((newProject: ScoreProject) => {
    setProject(newProject);
  }, []);

  const updateProjectTitle = useCallback((title: string) => {
    if (!project) return;
    setProject(prev => ({
      ...prev!,
      title,
      updatedAt: new Date(),
    }));
  }, [project]);

  const addPage = useCallback(() => {
    if (!project) return;
    const newPage: ScorePage = {
      id: `page-${Date.now()}`,
      title: `Page ${project.pages.length + 1}`,
      notes: [],
      timeSignature: { numerator: 4, denominator: 4 },
      keySignature: 'C',
      tempo: 120,
      createdAt: new Date(),
      scoreInfoPosition: { x: 40, y: 40 },
      textElements: [],
    };

    setProject(prev => ({
      ...prev!,
      pages: [...prev!.pages, newPage],
      currentPageId: newPage.id,
      updatedAt: new Date(),
    }));
  }, [project]);

  const deletePage = useCallback((pageId: string) => {
    if (!project || project.pages.length <= 1) return;

    setProject(prev => {
      const newPages = prev!.pages.filter(page => page.id !== pageId);
      const newCurrentPageId = prev!.currentPageId === pageId 
        ? newPages[0].id 
        : prev!.currentPageId;

      return {
        ...prev!,
        pages: newPages,
        currentPageId: newCurrentPageId,
        updatedAt: new Date(),
      };
    });
  }, [project]);

  const setCurrentPage = useCallback((pageId: string) => {
    if (!project) return;
    setProject(prev => ({
      ...prev!,
      currentPageId: pageId,
    }));
  }, [project]);

  const addNoteToCurrentPage = useCallback((note: PlacedNote) => {
    if (!project) return;
    setProject(prev => ({
      ...prev!,
      pages: prev!.pages.map(page => 
        page.id === prev!.currentPageId
          ? { ...page, notes: [...page.notes, note] }
          : page
      ),
      updatedAt: new Date(),
    }));
  }, [project]);

  const removeNoteFromCurrentPage = useCallback((noteId: string) => {
    if (!project) return;
    setProject(prev => ({
      ...prev!,
      pages: prev!.pages.map(page => 
        page.id === prev!.currentPageId
          ? { ...page, notes: page.notes.filter(note => note.id !== noteId) }
          : page
      ),
      updatedAt: new Date(),
    }));
  }, [project]);

  const clearCurrentPage = useCallback(() => {
    if (!project) return;
    setProject(prev => ({
      ...prev!,
      pages: prev!.pages.map(page => 
        page.id === prev!.currentPageId
          ? { ...page, notes: [] }
          : page
      ),
      updatedAt: new Date(),
    }));
  }, [project]);

  const updatePageSettings = useCallback((settings: Partial<ScorePage>) => {
    if (!project) return;
    setProject(prev => ({
      ...prev!,
      pages: prev!.pages.map(page => 
        page.id === prev!.currentPageId
          ? { ...page, ...settings }
          : page
      ),
      updatedAt: new Date(),
    }));
  }, [project]);

  // Get current page safely
  const currentPage = project?.pages?.find(page => page.id === project.currentPageId) || project?.pages?.[0] || null;

  return {
    project,
    currentPage,
    setCurrentProject,
    updateProjectTitle,
    addPage,
    deletePage,
    setCurrentPage,
    addNoteToCurrentPage,
    removeNoteFromCurrentPage,
    clearCurrentPage,
    updatePageSettings,
  };
};