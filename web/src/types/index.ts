export interface User {
  id: number;
  email: string;
  nickname: string | null;
  avatar: string | null;
  storage_used: number;
  storage_limit: number;
  is_admin: boolean;
  status?: number;
  created_at?: string;
}

export interface FileItem {
  id: number;
  user_id: number;
  parent_id: number | null;
  name: string;
  type: 'folder' | 'file';
  mime_type: string | null;
  size: number;
  storage_path: string | null;
  md5: string | null;
  is_public: number;
  created_at: string;
  updated_at: string;
}

export interface Share {
  id: number;
  user_id: number;
  file_id: number;
  share_code: string;
  require_login: number;
  access_password: string | null;
  expire_at: string | null;
  download_count: number;
  view_count: number;
  status: number;
  created_at: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  user_nickname?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface BreadcrumbItem {
  id: number | null;
  name: string;
}
