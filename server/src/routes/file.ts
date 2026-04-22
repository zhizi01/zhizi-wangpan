import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  getFiles,
  createFolder,
  uploadFile,
  downloadFile,
  deleteFile,
  renameFile,
  moveFile,
  togglePublic,
  getPublicSquare,
} from '../controllers/fileController';

const router = Router();

router.use(authMiddleware);

router.get('/', getFiles);
router.post('/folder', createFolder);
router.post('/upload', upload.single('file'), uploadFile);
router.get('/download/:id', downloadFile);
router.delete('/:id', deleteFile);
router.patch('/:id', renameFile);
router.post('/:id/move', moveFile);
router.post('/:id/public', togglePublic);

// 广场接口（公开）
router.get('/public/square', getPublicSquare);

export default router;
