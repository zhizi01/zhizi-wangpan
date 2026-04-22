export interface User {
  id: number;
  email: string;
  password_hash: string;
  nickname: string | null;
  avatar: string | null;
  storage_used: number;
  storage_limit: number;
  is_admin: number;
  status: number;
  created_at: Date;
  updated_at: Date;
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
  is_deleted: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Share {
  id: number;
  user_id: number;
  file_id: number;
  share_code: string;
  require_login: number;
  access_password: string | null;
  expire_at: Date | null;
  download_count: number;
  view_count: number;
  status: number;
  created_at: Date;
}

export interface VerificationCode {
  id: number;
  email: string;
  code: string;
  type: 'register' | 'reset_password';
  expire_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface Setting {
  id: number;
  key: string;
  value: string | null;
  updated_at: Date;
}

export interface AuthPayload {
  userId: number;
  email: string;
  isAdmin: boolean;
}

export interface FileTreeNode extends FileItem {
  children?: FileTreeNode[];
}
