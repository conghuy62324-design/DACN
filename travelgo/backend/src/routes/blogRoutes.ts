import { Router } from 'express';
import { BlogController } from '../controllers/blogController.js';
import { validateBlogRequest } from '../validators/validators.js';

const router = Router();

router.get('/', BlogController.getBlogs);
router.get('/:id', BlogController.getBlogById);
router.post('/', validateBlogRequest, BlogController.createBlog);
router.post('/:id/like', BlogController.likeBlog);

export default router;
