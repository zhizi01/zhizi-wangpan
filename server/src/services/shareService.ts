import pool, { query } from '../config/database';
import { Share, FileItem } from '../models/types';
import { generateShareCode } from '../utils/crypto';
import { getFilePath } from './fileService';

export async function createShare(
  userId: number,
  fileId: number,
  requireLogin: boolean = false,
  accessPassword?: string,
  expireDays?: number
) {
  const files = await query<FileItem>('SELECT * FROM files WHERE id = ? AND user_id = ? AND is_deleted = 0', [fileId, userId]);
  if (files.length === 0) {
    throw Object.assign(new Error('文件不存在或无权限'), { statusCode: 404 });
  }
  
  const shareCode = generateShareCode();
  const expireAt = expireDays ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000) : null;
  
  const result = await query(
    'INSERT INTO shares (user_id, file_id, share_code, require_login, access_password, expire_at) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, fileId, shareCode, requireLogin ? 1 : 0, accessPassword || null, expireAt]
  );
  
  return {
    id: (result as any).insertId,
    share_code: shareCode,
    require_login: requireLogin,
    expire_at: expireAt,
  };
}

export async function getSharesByUser(userId: number) {
  return await query(
    `SELECT s.*, f.name as file_name, f.type as file_type, f.size as file_size
     FROM shares s
     JOIN files f ON s.file_id = f.id
     WHERE s.user_id = ? AND s.status = 1
     ORDER BY s.created_at DESC`,
    [userId]
  );
}

export async function deleteShare(userId: number, shareId: number) {
  const result = await query(
    'UPDATE shares SET status = 0 WHERE id = ? AND user_id = ?',
    [shareId, userId]
  );
  
  if ((result as any).affectedRows === 0) {
    throw Object.assign(new Error('分享不存在或无权限'), { statusCode: 404 });
  }
  
  return true;
}

export async function getShareByCode(shareCode: string) {
  const shares = await query<Share>(
    `SELECT s.*, f.name as file_name, f.type as file_type, f.size as file_size, f.storage_path, f.mime_type,
            u.nickname as user_nickname
     FROM shares s
     JOIN files f ON s.file_id = f.id
     JOIN users u ON s.user_id = u.id
     WHERE s.share_code = ? AND s.status = 1`,
    [shareCode]
  );
  
  if (shares.length === 0) {
    throw Object.assign(new Error('分享不存在或已失效'), { statusCode: 404 });
  }
  
  const share = shares[0];
  
  // 检查是否过期
  if (share.expire_at && new Date(share.expire_at) < new Date()) {
    await query('UPDATE shares SET status = 0 WHERE id = ?', [share.id]);
    throw Object.assign(new Error('分享已过期'), { statusCode: 410 });
  }
  
  return share;
}

export async function incrementViewCount(shareId: number) {
  await query('UPDATE shares SET view_count = view_count + 1 WHERE id = ?', [shareId]);
}

export async function incrementDownloadCount(shareId: number) {
  await query('UPDATE shares SET download_count = download_count + 1 WHERE id = ?', [shareId]);
}
