import { Router } from 'express';
import { TripController } from '../controllers/tripController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate, requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'));
router.get('/', TripController.getTrips);
router.post('/', TripController.createTrip);
router.get('/:id', TripController.getTripById);
router.put('/:id', TripController.updateTrip);
router.delete('/:id', TripController.deleteTrip);
router.post('/:id/checkin', TripController.checkinPlace);
router.post('/:id/complete', TripController.completeTrip);
router.post('/:id/convert-to-blog', TripController.convertToBlog);

export default router;
