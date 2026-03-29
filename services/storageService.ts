
import { SavedProject, FlowNode, FlowEdge, GeneratedFile } from '../types';

const STORAGE_KEY = 'flow_architect_projects_v1';

export const storageService = {
  getProjects: (): SavedProject[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Erro ao ler projetos:", e);
      return [];
    }
  },

  saveProject: (name: string, nodes: FlowNode[], edges: FlowEdge[], files: GeneratedFile[]): SavedProject => {
    const projects = storageService.getProjects();
    
    // Fallback para crypto.randomUUID
    const id = typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const newProject: SavedProject = {
      id,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes,
      edges,
      files
    };

    const updatedProjects = [newProject, ...projects];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects));
    return newProject;
  },

  deleteProject: (id: string): void => {
    const projects = storageService.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  updateProject: (id: string, nodes: FlowNode[], edges: FlowEdge[], files: GeneratedFile[]): void => {
    const projects = storageService.getProjects();
    const index = projects.findIndex(p => p.id === id);
    
    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        nodes,
        edges,
        files,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  }
};
