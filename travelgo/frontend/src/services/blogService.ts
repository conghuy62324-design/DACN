import { api } from './api';
import { BlogPost } from '../types';

export const BlogService = {
  async getBlogs(params?: { tag?: string; search?: string }): Promise<BlogPost[]> {
    const res: any = await api.get('/blogs', { params });
    return res.data || [];
  },

  async getBlogById(id: string): Promise<BlogPost> {
    const res: any = await api.get(`/blogs/${id}`);
    return res.data;
  },

  async createBlog(payload: {
    title: string;
    excerpt: string;
    content: string;
    destinationName: string;
    authorName: string;
    authorAvatar?: string;
    coverImage: string;
    costEstimate?: string;
    tripDuration?: string;
    tags?: string[];
  }): Promise<BlogPost> {
    const res: any = await api.post('/blogs', payload);
    return res.data;
  },

  async likeBlog(id: string): Promise<number> {
    const res: any = await api.post(`/blogs/${id}/like`);
    return res.data.likesCount;
  },
};

export const StatsService = {
  async getDashboard(): Promise<any> {
    const res: any = await api.get('/stats/dashboard');
    return res.data;
  },
};
