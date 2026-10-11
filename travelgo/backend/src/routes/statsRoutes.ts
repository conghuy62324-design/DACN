import { Router } from 'express';
import { StatsController } from '../controllers/statsController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/dashboard', authenticate, requireRoles('SUPER_ADMIN'), StatsController.getDashboardStats);

export default router;
