import { Router } from 'express';
import { FavoriteController } from '../controllers/favoriteController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);
router.get('/', FavoriteController.list);
router.post('/:placeId', FavoriteController.add);
router.delete('/:placeId', FavoriteController.remove);

export default router;
