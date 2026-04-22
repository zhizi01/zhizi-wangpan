import apiClient from './client';
import { ApiResponse } from '../types';

export type SystemEnvKeyMeta = {
  display: string;
  isSet: boolean;
  isSecret: boolean;
};

export type SystemEnvResponse = {
  filePath: string;
  readPath: string | null;
  values: Record<string, SystemEnvKeyMeta>;
};

/** 与后端 `ENV_WHITELIST` 一致，保证表单与保存顺序稳定 */
export const SYSTEM_ENV_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'PORT',
  'NODE_ENV',
  'UPLOAD_DIR',
  'MAX_FILE_SIZE',
  'VITE_API_BASE_URL',
] as const;

export async function getSettings(): Promise<ApiResponse<Record<string, string>>> {
  return apiClient.get('/admin/settings');
}

export async function updateSettings(settings: Record<string, string>): Promise<ApiResponse> {
  return apiClient.put('/admin/settings', settings);
}

export async function getSystemEnv(): Promise<ApiResponse<SystemEnvResponse>> {
  return apiClient.get('/admin/system-env');
}

export async function updateSystemEnv(
  body: Record<string, string>
): Promise<ApiResponse & { needRestart?: boolean }> {
  return apiClient.put('/admin/system-env', body);
}
