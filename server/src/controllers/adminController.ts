import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { getActiveReadEnvPath, getWriteEnvPath } from '../utils/envFilePath';
import {
  readEnvFileMap,
  getMergedUnmasked,
  maskForResponse,
  applyEnvUpdates,
  buildEnvFileContent,
  backupAndWrite,
  isWhitelistedKey,
} from '../utils/systemEnvFile';
import { getAdminEmailSet } from '../utils/adminEmails';

/** 允许通过管理接口写入的 settings 表键，防止任意键写库 */
const SETTINGS_UPDATE_WHITELIST = new Set([
  'allow_register',
  'admin_emails',
  'site_name',
  'max_file_size',
  'storage_limit_per_user',
]);

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await query('SELECT `key`, `value`, updated_at FROM settings');
    const settingsMap: Record<string, string> = {};
    settings.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });
    res.json({ success: true, data: settingsMap });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const updates = req.body;
    if (typeof updates !== 'object' || updates === null) {
      res.status(400).json({ success: false, message: '请求体无效' });
      return;
    }
    for (const key of Object.keys(updates)) {
      if (!SETTINGS_UPDATE_WHITELIST.has(key)) {
        res.status(400).json({ success: false, message: `不允许的设置项: ${key}` });
        return;
      }
    }
    for (const [key, value] of Object.entries(updates)) {
      const v = value == null ? '' : String(value);
      if (key === 'admin_emails' && v.length > 8000) {
        res.status(400).json({ success: false, message: 'admin_emails 内容过长' });
        return;
      }
      await query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [key, v, v]
      );
    }
    res.json({ success: true, message: '设置已更新' });
  } catch (error) {
    next(error);
  }
}

export function getSystemEnv(req: Request, res: Response, next: NextFunction) {
  try {
    const { fromFile } = readEnvFileMap();
    const merged = getMergedUnmasked(fromFile);
    const data = maskForResponse(merged);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export function putSystemEnv(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body;
    if (typeof body !== 'object' || body === null) {
      res.status(400).json({ success: false, message: '请求体无效' });
      return;
    }
    for (const key of Object.keys(body)) {
      if (!isWhitelistedKey(key)) {
        res.status(400).json({ success: false, message: `不允许的环境变量键: ${key}` });
        return;
      }
    }
    const updates: Record<string, string | undefined> = {};
    for (const k of Object.keys(body)) {
      const raw = (body as Record<string, unknown>)[k];
      if (raw === null || raw === undefined) {
        updates[k] = undefined;
      } else {
        updates[k] = String(raw);
      }
    }
    const { fromFile } = readEnvFileMap();
    const readP = getActiveReadEnvPath();
    const writeP = getWriteEnvPath();
    let original = '';
    if (readP && fs.existsSync(readP)) {
      original = fs.readFileSync(readP, 'utf-8');
    } else if (fs.existsSync(writeP)) {
      original = fs.readFileSync(writeP, 'utf-8');
    }
    const finalMap = applyEnvUpdates(fromFile, updates);
    const newContent = buildEnvFileContent(original, finalMap);
    backupAndWrite(newContent, writeP);
    res.json({
      success: true,
      needRestart: true,
      message: '环境已写入文件，请重启后端服务后新配置才会完全生效',
    });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(req.query.limit)) || 20));
    const safePage = Math.max(1, Math.floor(Number(req.query.page)) || 1);
    const offset = (safePage - 1) * safeLimit;
    const search = req.query.search as string | undefined;

    let sql = `SELECT id, email, nickname, storage_used, storage_limit, status, created_at 
               FROM users WHERE 1=1`;
    const params: any[] = [];

    if (search && String(search).trim()) {
      sql += ' AND (email LIKE ? OR nickname LIKE ?)';
      const q = `%${String(search).trim()}%`;
      params.push(q, q);
    }

    sql += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;

    const users = await query(sql, params);
    const adminSet = await getAdminEmailSet();
    const list = (users as any[]).map((u) => ({
      ...u,
      is_admin: adminSet.has(String(u.email).toLowerCase()) ? 1 : 0,
    }));

    const countResult = await query('SELECT COUNT(*) as total FROM users');
    const total = (countResult[0] as any).total;

    res.json({
      success: true,
      data: {
        list,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
