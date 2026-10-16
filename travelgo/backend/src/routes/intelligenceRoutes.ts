import { Router } from 'express';
import { IntelligenceController } from '../controllers/intelligenceController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/consent', authenticate, IntelligenceController.getConsent);
router.put('/consent', authenticate, IntelligenceController.updateConsent);
router.post('/recommendations', authenticate, IntelligenceController.recommend);
router.post('/recommendations/visible', authenticate, IntelligenceController.acknowledgeVisible);
router.post('/events', authenticate, IntelligenceController.collectEvent);

export default router;
