import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BlogService } from '../services/blogService';
import { BlogPost } from '../types';
import { BookOpen, Search, Heart, User, Calendar, Plus, ArrowRight, Tag } from 'lucide-react';
import { formatDateVN } from '../utils/formatters';

export const BlogPage: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [tag, setTag] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchBlogs = async () => {
      setLoading(true);
      try {
        const data = await BlogService.getBlogs({
          tag: tag !== 'all' ? tag : undefined,
          search: search || undefined,
        });
        setBlogs(data);
      } catch (e) {
        console.error('Failed to load blogs:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [tag, search]);

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner with CTA Create Post */}
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 bg-teal-500 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              Cộng đồng chia sẻ trải nghiệm
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Cẩm nang du lịch & Nhật ký hành trình
            </h1>
            <p className="text-teal-200 text-sm sm:text-base leading-relaxed">
              Khám phá những kinh nghiệm thực tế, lịch trình chi tiết và chi phí chuyến đi được chia sẻ bởi cộng đồng du lịch HuGo Travel.
            </p>
          </div>

          <Link
            to="/blog/create"
            className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/25 flex items-center space-x-2 transition-all flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Viết bài chia sẻ mới</span>
          </Link>
        </div>

        {/* Search & Tag Filter Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Tags */}
          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1">
            {['all', 'Mẹo du lịch', 'Ẩm thực', 'Khám phá', 'Đà Nẵng', 'Hội An', 'Phú Quốc'].map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  tag === t
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'all' ? 'Tất cả' : t}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm bài viết..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogs.map((b) => (
            <article
              key={b.id}
              className="bg-white rounded-3xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-slate-100 flex flex-col justify-between group"
            >
              <div>
                <Link to={`/blog/${b.id}`} className="relative aspect-[16/10] overflow-hidden bg-slate-100 block">
                  <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                    {b.destinationName}
                  </span>
                </Link>

                <div className="p-6 space-y-3">
                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <span className="flex items-center">
                      <User className="w-3.5 h-3.5 mr-1" />
                      {b.authorName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      {formatDateVN(b.createdAt)}
                    </span>
                  </div>

                  <Link to={`/blog/${b.id}`}>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {b.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {b.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {b.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-slate-100 flex items-center justify-between mt-4">
                <span className="text-xs text-slate-400 flex items-center">
                  <Heart className="w-3.5 h-3.5 text-rose-500 mr-1 fill-rose-500/20" />
                  {b.likesCount} lượt thích
                </span>

                <Link
                  to={`/blog/${b.id}`}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center group-hover:translate-x-1 transition-transform"
                >
                  <span>Đọc bài viết</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
