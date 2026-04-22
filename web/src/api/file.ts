import apiClient from './client';
import { ApiResponse, FileItem } from '../types';

export async function getFiles(parentId?: number | null): Promise<ApiResponse<FileItem[]>> {
  const params = parentId !== null && parentId !== undefined ? { parent_id: parentId } : {};
  return apiClient.get('/files', { params });
}

export async function createFolder(name: string, parentId?: number | null): Promise<ApiResponse<{ id: number; name: string }>> {
  return apiClient.post('/files/folder', { name, parent_id: parentId ?? null });
}

export async function uploadFile(file: File, parentId?: number | null, onProgress?: (progress: number) => void): Promise<ApiResponse<any>> {
  const formData = new FormData();
  formData.append('file', file);
  if (parentId !== null && parentId !== undefined) {
    formData.append('parent_id', parentId.toString());
  }
  
  return apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    },
  });
}

export async function deleteFile(fileId: number): Promise<ApiResponse> {
  return apiClient.delete(`/files/${fileId}`);
}

export async function renameFile(fileId: number, name: string): Promise<ApiResponse> {
  return apiClient.patch(`/files/${fileId}`, { name });
}

export async function moveFile(fileId: number, targetParentId: number | null): Promise<ApiResponse> {
  return apiClient.post(`/files/${fileId}/move`, { target_parent_id: targetParentId });
}

export async function togglePublic(fileId: number, isPublic: boolean): Promise<ApiResponse> {
  return apiClient.post(`/files/${fileId}/public`, { is_public: isPublic });
}

export async function getPublicSquare(page?: number, search?: string): Promise<ApiResponse<any[]>> {
  return apiClient.get('/files/public/square', { params: { page, search } });
}

export function getDownloadUrl(fileId: number): string {
  return `${import.meta.env.VITE_API_BASE_URL || '/api'}/files/download/${fileId}`;
}
