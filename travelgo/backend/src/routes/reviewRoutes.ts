import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authenticate);
router.get('/me', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), ReviewController.mine);
router.patch('/:id', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), ReviewController.update);
router.delete('/:id', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), ReviewController.remove);
router.patch('/:id/moderation', requireRoles('SUPER_ADMIN'), ReviewController.moderate);

export default router;
