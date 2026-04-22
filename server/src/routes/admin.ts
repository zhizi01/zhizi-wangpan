import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { getSettings, updateSettings, getUsers, getSystemEnv, putSystemEnv } from '../controllers/adminController';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/system-env', getSystemEnv);
router.put('/system-env', putSystemEnv);
router.get('/users', getUsers);

export default router;
