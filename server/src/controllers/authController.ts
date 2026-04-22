import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import * as mailService from '../services/mailService';

export async function sendVerifyCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, type = 'register' } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, message: '请输入有效的邮箱地址' });
      return;
    }
    
    if (type === 'register') {
      const allowRegister = await authService.getSetting('allow_register');
      if (allowRegister !== 'true') {
        res.status(403).json({ success: false, message: '当前未开放注册' });
        return;
      }
    }
    
    await mailService.createVerificationCode(email, type);
    res.json({ success: true, message: '验证码已发送' });
  } catch (error) {
    next(error);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, code, nickname } = req.body;
    
    if (!email || !password || !code) {
      res.status(400).json({ success: false, message: '请填写完整信息' });
      return;
    }
    
    if (password.length < 6) {
      res.status(400).json({ success: false, message: '密码长度至少6位' });
      return;
    }
    
    const allowRegister = await authService.getSetting('allow_register');
    if (allowRegister !== 'true') {
      res.status(403).json({ success: false, message: '当前未开放注册' });
      return;
    }
    
    const validCode = await mailService.verifyCode(email, code, 'register');
    if (!validCode) {
      res.status(400).json({ success: false, message: '验证码错误或已过期' });
      return;
    }
    
    const result = await authService.register(email, password, nickname);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ success: false, message: '请填写邮箱和密码' });
      return;
    }
    
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未认证' });
      return;
    }
    
    const user = await authService.getUserById(req.user.userId);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未认证' });
      return;
    }
    const { nickname } = req.body;
    const user = await authService.updateProfile(
      req.user.userId,
      typeof nickname === 'string' ? nickname : null
    );
    res.json({ success: true, data: user, message: '已保存' });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未认证' });
      return;
    }
    const { old_password, new_password } = req.body;
    if (typeof old_password !== 'string' || typeof new_password !== 'string') {
      res.status(400).json({ success: false, message: '请填写原密码和新密码' });
      return;
    }
    await authService.changePassword(req.user.userId, old_password, new_password);
    res.json({ success: true, message: '密码已更新' });
  } catch (error) {
    next(error);
  }
}
