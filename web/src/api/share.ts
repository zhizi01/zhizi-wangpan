import apiClient from './client';
import { ApiResponse, Share } from '../types';

export async function createShare(
  fileId: number,
  requireLogin: boolean = false,
  accessPassword?: string,
  expireDays?: number
): Promise<ApiResponse<{ id: number; share_code: string; require_login: boolean; expire_at: string | null }>> {
  return apiClient.post('/shares', {
    file_id: fileId,
    require_login: requireLogin,
    access_password: accessPassword,
    expire_days: expireDays,
  });
}

export async function getMyShares(): Promise<ApiResponse<Share[]>> {
  return apiClient.get('/shares/my');
}

export async function deleteShare(shareId: number): Promise<ApiResponse> {
  return apiClient.delete(`/shares/${shareId}`);
}

export async function getShareInfo(code: string): Promise<ApiResponse<Share & { has_password: boolean }>> {
  return apiClient.get(`/shares/${code}`);
}

export async function verifySharePassword(code: string, password: string): Promise<ApiResponse> {
  return apiClient.post(`/shares/${code}/verify`, { password });
}

export function getShareDownloadUrl(code: string): string {
  return `${import.meta.env.VITE_API_BASE_URL || '/api'}/shares/${code}/download`;
}
