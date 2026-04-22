import multer from 'multer';
import path from 'path';
import { getUserDir, sanitizeFileName } from '../utils/helper';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '2147483648');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      cb(new Error('未认证'), '');
      return;
    }
    cb(null, getUserDir(userId));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    file.originalname = sanitizeFileName(file.originalname);
    cb(null, true);
  },
});
