import { Router } from 'express';
import { StatsController } from '../controllers/statsController.js';

const router = Router();

router.get('/dashboard', StatsController.getDashboardStats);

export default router;
