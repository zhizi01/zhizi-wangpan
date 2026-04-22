import { query } from '../config/database';
import { hashPassword, comparePassword } from '../utils/crypto';
import { generateToken } from '../middleware/auth';
import { User } from '../models/types';
import { isEmailAdmin } from '../utils/adminEmails';

export async function register(email: string, password: string, nickname?: string) {
  const existing = await query<User>('SELECT * FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    throw Object.assign(new Error('该邮箱已被注册'), { statusCode: 409 });
  }
  
  const passwordHash = await hashPassword(password);
  const result = await query(
    'INSERT INTO users (email, password_hash, nickname, storage_limit) VALUES (?, ?, ?, ?)',
    [email, passwordHash, nickname || null, 10737418240]
  );
  
  const userId = (result as any).insertId;
  const isAd = await isEmailAdmin(email);
  const token = generateToken({ userId, email, isAdmin: isAd });

  return {
    token,
    user: { id: userId, email, nickname: nickname || null, is_admin: isAd },
  };
}

export async function login(email: string, password: string) {
  const users = await query<User>('SELECT * FROM users WHERE email = ? AND status = 1', [email]);
  if (users.length === 0) {
    throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401 });
  }
  
  const user = users[0];
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401 });
  }
  
  const isAd = await isEmailAdmin(user.email);
  const token = generateToken({ userId: user.id, email: user.email, isAdmin: isAd });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      storage_used: user.storage_used,
      storage_limit: user.storage_limit,
      is_admin: isAd,
    },
  };
}

export async function getUserById(userId: number) {
  const users = await query<User>(
    'SELECT id, email, nickname, avatar, storage_used, storage_limit, is_admin, status, created_at FROM users WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw Object.assign(new Error('用户不存在'), { statusCode: 404 });
  }
  
  const user = users[0];
  const isAd = await isEmailAdmin(user.email);
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    storage_used: user.storage_used,
    storage_limit: user.storage_limit,
    is_admin: isAd,
    status: user.status,
  };
}

export async function getSetting(key: string): Promise<string | null> {
  const settings = await query('SELECT value FROM settings WHERE `key` = ?', [key]);
  return settings.length > 0 ? (settings[0] as any).value : null;
}

export async function updateProfile(userId: number, nickname: string | null) {
  const name = nickname?.trim() || null;
  if (name && name.length > 64) {
    throw Object.assign(new Error('昵称最多 64 个字符'), { statusCode: 400 });
  }
  await query('UPDATE users SET nickname = ? WHERE id = ?', [name, userId]);
  return getUserById(userId);
}

export async function changePassword(userId: number, oldPassword: string, newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    throw Object.assign(new Error('新密码长度至少 6 位'), { statusCode: 400 });
  }
  const users = await query<User>('SELECT * FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    throw Object.assign(new Error('用户不存在'), { statusCode: 404 });
  }
  const user = users[0];
  const valid = await comparePassword(oldPassword, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('原密码错误'), { statusCode: 400 });
  }
  const passwordHash = await hashPassword(newPassword);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
}
