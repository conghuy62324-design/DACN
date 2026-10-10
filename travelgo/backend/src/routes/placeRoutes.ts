import { Router } from 'express';
import { PlaceController } from '../controllers/placeController.js';

const router = Router();

router.get('/', PlaceController.getPlaces);
router.get('/:id', PlaceController.getPlaceById);
router.get('/:id/reviews', PlaceController.getPlaceReviews);
router.post('/:id/reviews', PlaceController.addReview);
router.post('/', PlaceController.createPlace);
router.delete('/:id', PlaceController.deletePlace);

export default router;
