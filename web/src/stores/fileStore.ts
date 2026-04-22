import { create } from 'zustand';
import { FileItem, BreadcrumbItem } from '../types';

interface FileState {
  files: FileItem[];
  currentFolder: number | null;
  breadcrumbs: BreadcrumbItem[];
  isLoading: boolean;
  selectedFiles: number[];
  setFiles: (files: FileItem[]) => void;
  setCurrentFolder: (folderId: number | null) => void;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  addBreadcrumb: (item: BreadcrumbItem) => void;
  popBreadcrumb: (index: number) => void;
  setLoading: (loading: boolean) => void;
  setSelectedFiles: (ids: number[]) => void;
  toggleSelectedFile: (id: number) => void;
  clearSelection: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: [],
  currentFolder: null,
  breadcrumbs: [{ id: null, name: '全部文件' }],
  isLoading: false,
  selectedFiles: [],
  
  setFiles: (files) => set({ files }),
  setCurrentFolder: (folderId) => set({ currentFolder: folderId }),
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
  addBreadcrumb: (item) => set((state) => ({ breadcrumbs: [...state.breadcrumbs, item] })),
  popBreadcrumb: (index) => set((state) => ({
    breadcrumbs: state.breadcrumbs.slice(0, index + 1),
    currentFolder: state.breadcrumbs[index].id,
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  setSelectedFiles: (ids) => set({ selectedFiles: ids }),
  toggleSelectedFile: (id) => set((state) => ({
    selectedFiles: state.selectedFiles.includes(id)
      ? state.selectedFiles.filter((fid) => fid !== id)
      : [...state.selectedFiles, id],
  })),
  clearSelection: () => set({ selectedFiles: [] }),
}));
