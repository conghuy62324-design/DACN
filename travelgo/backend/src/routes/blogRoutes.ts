import { Router } from 'express';
import { BlogController } from '../controllers/blogController.js';
import { validateBlogRequest } from '../validators/validators.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', BlogController.getBlogs);
router.get('/:id', BlogController.getBlogById);
router.post('/', authenticate, requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), validateBlogRequest, BlogController.createBlog);
router.post('/:id/like', authenticate, requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), BlogController.likeBlog);

export default router;
