import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import * as fileService from '../services/fileService';
import { getUserDir, formatFileSize } from '../utils/helper';
import { sendFileWithRange } from '../utils/sendFileRange';

export async function getFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const parentId = req.query.parent_id ? parseInt(req.query.parent_id as string) : null;
    
    const files = await fileService.getFiles(userId, parentId);
    res.json({ success: true, data: files });
  } catch (error) {
    next(error);
  }
}

export async function createFolder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { name, parent_id } = req.body;
    
    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, message: '文件夹名称不能为空' });
      return;
    }
    
    const folderId = await fileService.createFolder(userId, name.trim(), parent_id || null);
    res.json({ success: true, data: { id: folderId, name: name.trim() } });
  } catch (error) {
    next(error);
  }
}

export async function uploadFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const file = req.file;
    const parentId = req.body.parent_id ? parseInt(req.body.parent_id) : null;
    
    if (!file) {
      res.status(400).json({ success: false, message: '未选择文件' });
      return;
    }
    
    // 计算相对路径
    const relativePath = path.join('private', userId.toString(), file.filename);
    
    const fileId = await fileService.saveFileInfo(
      userId,
      parentId,
      file.originalname,
      file.mimetype,
      file.size,
      relativePath,
      null
    );
    
    res.json({
      success: true,
      data: {
        id: fileId,
        name: file.originalname,
        size: file.size,
        mime_type: file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const fileId = parseInt(req.params.id);
    
    const file = await fileService.getFileById(fileId, userId);
    if (!file) {
      res.status(404).json({ success: false, message: '文件不存在' });
      return;
    }
    
    if (file.type === 'folder') {
      res.status(400).json({ success: false, message: '暂不支持下载文件夹' });
      return;
    }
    
    const filePath = fileService.getFilePath(file.storage_path!);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: '文件物理路径不存在' });
      return;
    }
    
    sendFileWithRange(filePath, file.name, file.mime_type, req, res);
  } catch (error) {
    next(error);
  }
}

export async function deleteFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const fileId = parseInt(req.params.id);
    
    await fileService.deleteFile(userId, fileId);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
}

export async function renameFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const fileId = parseInt(req.params.id);
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, message: '名称不能为空' });
      return;
    }
    
    await fileService.renameFile(userId, fileId, name.trim());
    res.json({ success: true, message: '重命名成功' });
  } catch (error) {
    next(error);
  }
}

export async function moveFile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const fileId = parseInt(req.params.id);
    const { target_parent_id } = req.body;
    
    await fileService.moveFile(userId, fileId, target_parent_id || null);
    res.json({ success: true, message: '移动成功' });
  } catch (error) {
    next(error);
  }
}

export async function togglePublic(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const fileId = parseInt(req.params.id);
    const { is_public } = req.body;
    
    await fileService.togglePublic(userId, fileId, is_public);
    res.json({ success: true, message: is_public ? '已发布到广场' : '已从广场下架' });
  } catch (error) {
    next(error);
  }
}

export async function getPublicSquare(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    
    const files = await fileService.getPublicFiles(page, limit, search);
    res.json({ success: true, data: files });
  } catch (error) {
    next(error);
  }
}
