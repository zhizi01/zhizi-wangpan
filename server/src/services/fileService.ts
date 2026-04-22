import fs from 'fs';
import path from 'path';
import pool, { query, transaction } from '../config/database';
import { FileItem } from '../models/types';
import { getUserDir, formatFileSize } from '../utils/helper';

export async function getFiles(userId: number, parentId: number | null = null) {
  const files = await query<FileItem>(
    `SELECT id, user_id, parent_id, name, type, mime_type, size, storage_path, md5, is_public, created_at, updated_at
     FROM files WHERE user_id = ? AND parent_id ${parentId === null ? 'IS NULL' : '= ?'} AND is_deleted = 0
     ORDER BY type DESC, name ASC`,
    parentId === null ? [userId] : [userId, parentId]
  );
  return files;
}

export async function createFolder(userId: number, name: string, parentId: number | null = null) {
  const result = await query(
    'INSERT INTO files (user_id, parent_id, name, type, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, parentId, name, 'folder', 'inode/directory', 0]
  );
  return (result as any).insertId;
}

export async function saveFileInfo(
  userId: number,
  parentId: number | null,
  name: string,
  mimeType: string,
  size: number,
  storagePath: string,
  md5: string | null = null
) {
  const result = await query(
    'INSERT INTO files (user_id, parent_id, name, type, mime_type, size, storage_path, md5) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, parentId, name, 'file', mimeType, size, storagePath, md5]
  );
  
  // 更新用户已用空间
  await query('UPDATE users SET storage_used = storage_used + ? WHERE id = ?', [size, userId]);
  
  return (result as any).insertId;
}

export async function deleteFile(userId: number, fileId: number) {
  const files = await query<FileItem>('SELECT * FROM files WHERE id = ? AND user_id = ? AND is_deleted = 0', [fileId, userId]);
  if (files.length === 0) {
    throw Object.assign(new Error('文件不存在或无权限'), { statusCode: 404 });
  }
  
  const file = files[0];
  
  if (file.type === 'folder') {
    // 递归删除文件夹内所有内容
    await deleteFolderContents(userId, fileId);
  }
  
  await query('UPDATE files SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [fileId]);
  
  if (file.type === 'file' && file.size > 0) {
    await query('UPDATE users SET storage_used = GREATEST(storage_used - ?, 0) WHERE id = ?', [file.size, userId]);
  }
  
  return true;
}

async function deleteFolderContents(userId: number, folderId: number) {
  const children = await query<FileItem>('SELECT * FROM files WHERE parent_id = ? AND user_id = ? AND is_deleted = 0', [folderId, userId]);
  
  for (const child of children) {
    if (child.type === 'folder') {
      await deleteFolderContents(userId, child.id);
    }
    await query('UPDATE files SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [child.id]);
    if (child.type === 'file' && child.size > 0) {
      await query('UPDATE users SET storage_used = GREATEST(storage_used - ?, 0) WHERE id = ?', [child.size, userId]);
    }
  }
}

export async function renameFile(userId: number, fileId: number, newName: string) {
  const result = await query(
    'UPDATE files SET name = ? WHERE id = ? AND user_id = ? AND is_deleted = 0',
    [newName, fileId, userId]
  );
  
  if ((result as any).affectedRows === 0) {
    throw Object.assign(new Error('文件不存在或无权限'), { statusCode: 404 });
  }
  
  return true;
}

export async function moveFile(userId: number, fileId: number, targetParentId: number | null) {
  // 检查目标文件夹是否存在且属于该用户
  if (targetParentId !== null) {
    const folders = await query<FileItem>('SELECT * FROM files WHERE id = ? AND user_id = ? AND type = ? AND is_deleted = 0', 
      [targetParentId, userId, 'folder']);
    if (folders.length === 0) {
      throw Object.assign(new Error('目标文件夹不存在'), { statusCode: 400 });
    }
  }
  
  const result = await query(
    'UPDATE files SET parent_id = ? WHERE id = ? AND user_id = ? AND is_deleted = 0',
    [targetParentId, fileId, userId]
  );
  
  if ((result as any).affectedRows === 0) {
    throw Object.assign(new Error('文件不存在或无权限'), { statusCode: 404 });
  }
  
  return true;
}

export async function getFileById(fileId: number, userId?: number) {
  let sql = 'SELECT * FROM files WHERE id = ? AND is_deleted = 0';
  const params: any[] = [fileId];
  
  if (userId !== undefined) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }
  
  const files = await query<FileItem>(sql, params);
  return files.length > 0 ? files[0] : null;
}

export async function togglePublic(userId: number, fileId: number, isPublic: boolean) {
  const result = await query(
    'UPDATE files SET is_public = ? WHERE id = ? AND user_id = ? AND is_deleted = 0',
    [isPublic ? 1 : 0, fileId, userId]
  );
  
  if ((result as any).affectedRows === 0) {
    throw Object.assign(new Error('文件不存在或无权限'), { statusCode: 404 });
  }
  
  return true;
}

export async function getPublicFiles(page: number = 1, limit: number = 20, search?: string) {
  // LIMIT/OFFSET 使用 ? 占位符在部分 MySQL 驱动上会报 mysqld_stmt_execute 参数错误，这里改为经校验的整数字面量
  const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit)) || 20));
  const safePage = Math.max(1, Math.floor(Number(page)) || 1);
  const offset = (safePage - 1) * safeLimit;

  let sql = `SELECT f.*, u.nickname as user_nickname 
             FROM files f 
             JOIN users u ON f.user_id = u.id 
             WHERE f.is_public = 1 AND f.is_deleted = 0 AND f.type = 'file'`;
  const params: any[] = [];

  if (search && String(search).trim()) {
    sql += ' AND f.name LIKE ?';
    params.push(`%${String(search).trim()}%`);
  }

  sql += ` ORDER BY f.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;

  return await query(sql, params);
}

export function getFilePath(storagePath: string): string {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  return path.isAbsolute(uploadDir) 
    ? path.join(uploadDir, storagePath)
    : path.resolve(process.cwd(), uploadDir, storagePath);
}
