import { Request, Response, NextFunction } from 'express';
import { BlogService } from '../services/blogService.js';

export class BlogController {
  public static async getBlogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tag, search } = req.query;
      const blogs = await BlogService.getAllBlogs({
        tag: tag as string,
        search: search as string,
      });

      res.json({
        success: true,
        count: blogs.length,
        data: blogs,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getBlogById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const blog = await BlogService.getBlogByIdOrSlug(id as string);

      if (!blog) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài viết chia sẻ kinh nghiệm du lịch',
        });
        return;
      }

      res.json({
        success: true,
        data: blog,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, excerpt, content, destinationName, authorName, authorAvatar, coverImage, costEstimate, tripDuration, tags } = req.body;

      if (!title || !excerpt || !content || !destinationName) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng điền tiêu đề, tóm tắt, nội dung và địa điểm du lịch',
        });
        return;
      }

      const newBlog = await BlogService.createBlog({
        title,
        excerpt,
        content,
        destinationName,
        authorName,
        authorAvatar,
        coverImage,
        costEstimate,
        tripDuration,
        tags,
      });

      res.status(201).json({
        success: true,
        message: 'Đăng bài viết chia sẻ thành công!',
        data: newBlog,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async likeBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const likes = await BlogService.likeBlog(id as string);

      res.json({
        success: true,
        data: { likesCount: likes },
      });
    } catch (error) {
      next(error);
    }
  }
}
