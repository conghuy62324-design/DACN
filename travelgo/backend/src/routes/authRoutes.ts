import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateLogin, validateRegistration } from '../validators/validators.js';

const router = Router();

router.post('/login', validateLogin, AuthController.login);
router.post('/register', validateRegistration, AuthController.register);
router.get('/me', authenticate, AuthController.getProfile);
router.get('/profile', authenticate, AuthController.getProfile);

export default router;
