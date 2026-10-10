import { MOCK_BLOGS } from '../utils/mockData.js';

let blogsDb = [...MOCK_BLOGS];

export interface CreateBlogPayload {
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
}

export class BlogService {
  public static async getAllBlogs(params?: { tag?: string; search?: string }) {
    let result = [...blogsDb];

    if (params?.tag && params.tag !== 'all') {
      result = result.filter((b) => b.tags.some((t) => t.toLowerCase() === params.tag!.toLowerCase()));
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.excerpt.toLowerCase().includes(q) ||
          b.destinationName.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static async getBlogByIdOrSlug(idOrSlug: string) {
    return blogsDb.find((b) => b.id === idOrSlug || b.slug === idOrSlug) || null;
  }

  public static async createBlog(payload: CreateBlogPayload) {
    const slug = payload.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const newBlog = {
      id: `b-${Date.now()}`,
      title: payload.title,
      slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
      excerpt: payload.excerpt,
      content: payload.content,
      destinationName: payload.destinationName,
      authorName: payload.authorName || 'Người dùng HuGo Travel',
      authorAvatar: payload.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      coverImage: payload.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      costEstimate: payload.costEstimate || 'Khoảng 3.000.000đ',
      tripDuration: payload.tripDuration || '3 Ngày 2 Đêm',
      tags: payload.tags && payload.tags.length > 0 ? payload.tags : ['Kinh nghiệm', 'Check-in'],
      likesCount: 1,
      isFeatured: false,
      createdAt: new Date().toISOString(),
    };

    blogsDb.unshift(newBlog);
    return newBlog;
  }

  public static async likeBlog(id: string) {
    const blog = blogsDb.find((b) => b.id === id);
    if (blog) {
      blog.likesCount += 1;
      return blog.likesCount;
    }
    return 0;
  }
}
