import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, User, Heart } from 'lucide-react';
import { BlogPost } from '../../types';
import { formatDateVN } from '../../utils/formatters';

interface BlogSectionProps {
  blogs: BlogPost[];
}

export const BlogSection: React.FC<BlogSectionProps> = ({ blogs }) => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <span className="text-teal-600 font-bold text-xs uppercase tracking-widest block mb-2">
              Chia sẻ trải nghiệm
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Cẩm nang du lịch
            </h2>
          </div>
          <Link
            to="/blog"
            className="mt-4 sm:mt-0 inline-flex items-center text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors group"
          >
            <span>Xem tất cả bài viết</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 3 Blog Cards Grid Matching Image 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogs.slice(0, 3).map((item, index) => {
            const categoryBadge =
              index === 0 ? 'MẸO DU LỊCH' : index === 1 ? 'ẨM THỰC' : 'KHÁM PHÁ';
            const badgeColor =
              index === 0
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : index === 1
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'bg-teal-50 text-teal-700 border-teal-200';

            return (
              <article
                key={item.id}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-card-hover transition-all duration-300 flex flex-col border border-slate-100"
              >
                {/* Image */}
                <Link to={`/blog/${item.id}`} className="relative aspect-[16/10] overflow-hidden bg-slate-100 block">
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                  <span
                    className={`absolute top-3 left-3 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border backdrop-blur-md shadow-sm ${badgeColor}`}
                  >
                    {categoryBadge}
                  </span>
                </Link>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Meta */}
                    <div className="flex items-center space-x-4 text-xs text-slate-400 mb-3">
                      <div className="flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.authorName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateVN(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <Link to={`/blog/${item.id}`}>
                      <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors mb-2">
                        {item.title}
                      </h3>
                    </Link>

                    {/* Excerpt */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.excerpt}
                    </p>
                  </div>

                  {/* Link read more */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center">
                      <Heart className="w-3.5 h-3.5 text-rose-500 mr-1 fill-rose-500/20" />
                      {item.likesCount} lượt thích
                    </span>
                    <Link
                      to={`/blog/${item.id}`}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center group-hover:translate-x-1 transition-transform"
                    >
                      <span>Đọc tiếp</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
