import { Router } from 'express';
import { TourController } from '../controllers/tourController.js';

const router = Router();

router.get('/', TourController.getTours);
router.post('/plan', TourController.planItinerary);
router.get('/:id', TourController.getTourById);
router.post('/', TourController.createTour);
router.put('/:id', TourController.updateTour);
router.delete('/:id', TourController.deleteTour);

export default router;
