import { Router } from 'express';
import { PartnerApplicationController } from '../controllers/partnerApplicationController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';
import { validatePartnerApplication } from '../validators/validators.js';

const router = Router();
router.use(authenticate, requireRoles('CUSTOMER', 'PARTNER'));
router.post('/', validatePartnerApplication, PartnerApplicationController.submit);
router.get('/me', PartnerApplicationController.getMine);
export default router;
