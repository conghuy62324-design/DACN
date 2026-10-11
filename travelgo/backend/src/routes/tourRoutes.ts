import { Router } from 'express';
import { TourController } from '../controllers/tourController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', TourController.getTours);
router.post('/plan', TourController.planItinerary);
router.get('/:id', TourController.getTourById);
router.post('/', authenticate, requireRoles('SUPER_ADMIN'), TourController.createTour);
router.put('/:id', authenticate, requireRoles('SUPER_ADMIN'), TourController.updateTour);
router.delete('/:id', authenticate, requireRoles('SUPER_ADMIN'), TourController.deleteTour);

export default router;
