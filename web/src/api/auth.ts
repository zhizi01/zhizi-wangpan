import apiClient from './client';
import { ApiResponse, User } from '../types';

export interface LoginData {
  token: string;
  user: User;
}

export async function sendVerifyCode(email: string, type: 'register' | 'reset_password' = 'register'): Promise<ApiResponse> {
  return apiClient.post('/auth/verify-email', { email, type });
}

export async function register(email: string, password: string, code: string, nickname?: string): Promise<ApiResponse<LoginData>> {
  return apiClient.post('/auth/register', { email, password, code, nickname });
}

export async function login(email: string, password: string): Promise<ApiResponse<LoginData>> {
  return apiClient.post('/auth/login', { email, password });
}

export async function getMe(): Promise<ApiResponse<User>> {
  return apiClient.get('/auth/me');
}

export async function updateProfile(nickname: string | null): Promise<ApiResponse<User>> {
  return apiClient.patch('/auth/me', { nickname });
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse> {
  return apiClient.post('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  });
}
