import './config/loadEnv';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import fileRoutes from './routes/file';
import shareRoutes from './routes/share';
import adminRoutes from './routes/admin';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ensureDir, getUploadDir } from './utils/helper';
import { getSetting } from './services/authService';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// 确保上传目录存在
ensureDir(getUploadDir());

// 中间件
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? '*' : undefined,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 全局速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: '请求过于频繁' },
});
app.use(limiter);

// 静态文件服务（用于上传的文件）
app.use('/uploads', express.static(getUploadDir()));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务正常运行' });
});

/** 公开站点名（与 settings 表 site_name 同步，无鉴权） */
app.get('/api/public/site-name', async (req, res, next) => {
  try {
    const name = await getSetting('site_name');
    res.json({ success: true, data: { siteName: (name && name.trim()) || '云端文件管理' } });
  } catch (e) {
    next(e);
  }
});

// 404
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`📁 上传目录: ${getUploadDir()}`);
});
