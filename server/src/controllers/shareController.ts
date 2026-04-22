import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import * as shareService from '../services/shareService';
import * as fileService from '../services/fileService';
import { getFilePath } from '../services/fileService';
import { sendFileWithRange } from '../utils/sendFileRange';

export async function createShare(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { file_id, require_login, access_password, expire_days } = req.body;
    
    if (!file_id) {
      res.status(400).json({ success: false, message: '请选择要分享的文件' });
      return;
    }
    
    const result = await shareService.createShare(
      userId,
      parseInt(file_id),
      require_login,
      access_password,
      expire_days ? parseInt(expire_days) : undefined
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMyShares(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const shares = await shareService.getSharesByUser(userId);
    res.json({ success: true, data: shares });
  } catch (error) {
    next(error);
  }
}

export async function deleteShare(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const shareId = parseInt(req.params.id);
    
    await shareService.deleteShare(userId, shareId);
    res.json({ success: true, message: '分享已取消' });
  } catch (error) {
    next(error);
  }
}

export async function getShareInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    const share = await shareService.getShareByCode(code);
    
    // 检查是否需要登录
    if (share.require_login && !req.user) {
      res.status(401).json({ success: false, message: '需要登录才能访问此分享' });
      return;
    }
    
    // 增加浏览次数
    await shareService.incrementViewCount(share.id);
    
    // 不返回密码等敏感信息
    const { access_password, ...shareInfo } = share as any;
    res.json({
      success: true,
      data: {
        ...shareInfo,
        has_password: !!access_password,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifySharePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    const { password } = req.body;
    
    const share = await shareService.getShareByCode(code);
    
    if (share.access_password && share.access_password !== password) {
      res.status(403).json({ success: false, message: '访问密码错误' });
      return;
    }
    
    res.json({ success: true, message: '验证通过' });
  } catch (error) {
    next(error);
  }
}

export async function downloadSharedFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.params;
    const { password } = req.body || {};
    
    const share = await shareService.getShareByCode(code);
    
    // 检查是否需要登录
    if (share.require_login && !req.user) {
      res.status(401).json({ success: false, message: '需要登录才能下载' });
      return;
    }
    
    // 验证密码
    if (share.access_password && share.access_password !== password) {
      res.status(403).json({ success: false, message: '访问密码错误' });
      return;
    }
    
    const file = await fileService.getFileById(share.file_id);
    if (!file || file.is_deleted) {
      res.status(404).json({ success: false, message: '文件不存在或已被删除' });
      return;
    }
    
    if (file.type === 'folder') {
      res.status(400).json({ success: false, message: '暂不支持下载文件夹' });
      return;
    }
    
    const filePath = getFilePath(file.storage_path!);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: '文件物理路径不存在' });
      return;
    }
    
    // 增加下载次数
    await shareService.incrementDownloadCount(share.id);
    
    sendFileWithRange(filePath, file.name, file.mime_type, req, res);
  } catch (error) {
    next(error);
  }
}
