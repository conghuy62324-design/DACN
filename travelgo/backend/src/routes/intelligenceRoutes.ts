import { Router } from 'express';
import { IntelligenceController } from '../controllers/intelligenceController.js';
import { optionalAuthenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/events', optionalAuthenticate, IntelligenceController.collectEvent);

export default router;
