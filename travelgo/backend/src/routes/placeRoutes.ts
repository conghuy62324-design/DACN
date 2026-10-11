import { Router } from 'express';
import { PlaceController } from '../controllers/placeController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', PlaceController.getPlaces);
router.get('/:id', PlaceController.getPlaceById);
router.get('/:id/reviews', PlaceController.getPlaceReviews);
router.post('/:id/reviews', authenticate, requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), PlaceController.addReview);
router.post('/', authenticate, requireRoles('SUPER_ADMIN'), PlaceController.createPlace);
router.delete('/:id', authenticate, requireRoles('SUPER_ADMIN'), PlaceController.deletePlace);

export default router;
