import { Router } from 'express';
import { sendVerifyCode, register, login, getMe, updateProfile, changePassword } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
});

const codeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { success: false, message: '验证码发送过于频繁，请稍后再试' },
});

router.post('/verify-email', codeLimiter, sendVerifyCode);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateProfile);
router.post('/change-password', authMiddleware, changePassword);

export default router;
