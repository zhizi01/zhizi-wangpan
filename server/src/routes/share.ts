import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import {
  createShare,
  getMyShares,
  deleteShare,
  getShareInfo,
  verifySharePassword,
  downloadSharedFile,
} from '../controllers/shareController';

const router = Router();

// 需要登录的接口
router.post('/', authMiddleware, createShare);
router.get('/my', authMiddleware, getMyShares);
router.delete('/:id', authMiddleware, deleteShare);

// 公开接口（部分需要登录取决于分享设置；可带可选 JWT）
router.get('/:code', optionalAuthMiddleware, getShareInfo);
router.post('/:code/verify', optionalAuthMiddleware, verifySharePassword);
router.post('/:code/download', optionalAuthMiddleware, downloadSharedFile);

export default router;
