import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../models/types';
import { isEmailAdmin } from '../utils/adminEmails';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'zhizi-files-secret-key';

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: '未提供认证令牌' });
    return;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: '令牌无效或已过期' });
  }
}

/** 有 Bearer 且合法则附加 req.user，否则等同未登录（用于分享等需兼容匿名+已登录 的路由） */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.substring(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    // 无效/过期 token：按匿名处理，不阻断公开分享
  }
  next();
}

/**
 * 管理员以 settings 表 `admin_emails` 为准，与 `users.is_admin` 及 JWT 内 isAdmin 无关，避免改配置后需重新登录才生效
 */
export async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: '未认证' });
    return;
  }
  try {
    const ok = await isEmailAdmin(req.user.email);
    if (!ok) {
      res.status(403).json({ success: false, message: '需要管理员权限' });
      return;
    }
    next();
  } catch (e) {
    next(e);
  }
}
