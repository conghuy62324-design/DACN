import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BlogService } from '../services/blogService';
import { BlogPost } from '../types';
import { 
  Heart, 
  Share2, 
  Calendar, 
  User, 
  MapPin, 
  DollarSign, 
  Clock, 
  MessageSquare, 
  ChevronRight,
  Send,
  Compass,
  ArrowRight
} from 'lucide-react';
import { formatDateVN } from '../utils/formatters';

export const BlogDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<{ id: string; name: string; text: string; date: string }[]>([
    {
      id: 'c-1',
      name: 'Nguyễn Văn Minh',
      text: 'Bài viết rất chi tiết và hữu ích! Mình sắp đi Hội An tuần tới, cảm ơn bạn đã chia sẻ lịch trình này.',
      date: '2026-10-09',
    },
    {
      id: 'c-2',
      name: 'Trần Thị Lan',
      text: 'Món cao lầu Hội An thực sự gây thương nhớ, ảnh bạn chụp Cầu Vàng cũng siêu đẹp!',
      date: '2026-10-10',
    },
  ]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchBlog = async () => {
      setLoading(true);
      try {
        const data = await BlogService.getBlogById(id || 'b-1');
        setBlog(data);
        setLikesCount(data.likesCount);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  const handleLike = async () => {
    if (!blog || liked) return;
    setLiked(true);
    setLikesCount(likesCount + 1);
    try {
      await BlogService.likeBlog(blog.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentName || !newCommentText) return;

    setComments([
      {
        id: `c-${Date.now()}`,
        name: newCommentName,
        text: newCommentText,
        date: new Date().toISOString().split('T')[0],
      },
      ...comments,
    ]);
    setNewCommentName('');
    setNewCommentText('');
  };

  if (loading || !blog) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Đang tải bài viết...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-20 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-xs text-slate-500 py-4">
          <Link to="/" className="hover:text-orange-500">Trang chủ</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/blog" className="hover:text-orange-500">Cẩm nang du lịch</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-800 font-semibold truncate max-w-xs">{blog.title}</span>
        </nav>

        {/* Article Container */}
        <article className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((t, idx) => (
                <span key={idx} className="text-xs font-bold px-3 py-1 bg-orange-50 text-orange-600 rounded-full">
                  #{t}
                </span>
              ))}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              {blog.title}
            </h1>

            {/* Author bar */}
            <div className="flex items-center justify-between border-y border-slate-100 py-3 text-xs text-slate-500">
              <div className="flex items-center space-x-3">
                <img
                  src={blog.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                  alt={blog.authorName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{blog.authorName}</h4>
                  <p>Ngày đăng: {formatDateVN(blog.createdAt)}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all ${
                    liked
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{likesCount}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cover Photo */}
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100">
            <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" />
          </div>

          {/* Highlights Box (Cost & Duration) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center space-x-2.5">
              <MapPin className="w-4 h-4 text-orange-500" />
              <div>
                <span className="text-slate-400 block">Địa điểm</span>
                <span className="font-bold text-slate-800">{blog.destinationName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2.5">
              <Clock className="w-4 h-4 text-teal-600" />
              <div>
                <span className="text-slate-400 block">Thời gian đề xuất</span>
                <span className="font-bold text-slate-800">{blog.tripDuration || '3 Ngày 2 Đêm'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2.5">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-slate-400 block">Dự trù chi phí</span>
                <span className="font-bold text-slate-800">{blog.costEstimate || 'Khoảng 4.000.000đ'}</span>
              </div>
            </div>
          </div>

          {/* Copy Itinerary Action Banner */}
          <div className="bg-gradient-to-r from-sky-900 to-indigo-950 p-5 rounded-2xl text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Compass className="w-4 h-4 text-orange-400" />
                Bạn thích lịch trình trong bài viết này?
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Sao chép các địa điểm trên sang HuGo Planner để tự do tùy biến ngày, thêm bớt điểm và tối ưu chi phí!
              </p>
            </div>
            <button
              onClick={() =>
                navigate('/tour-planner', {
                  state: {
                    templateTour: {
                      destinationCity: blog.destinationName,
                      departureCity: 'Hà Nội',
                      priceVND: 4000000,
                    },
                  },
                })
              }
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 flex-shrink-0 shadow-md group"
            >
              <span>Sao chép thành tour cá nhân</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>


          {/* Body Content */}
          <div className="text-slate-700 text-base leading-relaxed whitespace-pre-line space-y-4 font-normal">
            {blog.content}
          </div>

          {/* Comments Section */}
          <div className="pt-8 border-t border-slate-200 space-y-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center">
              <MessageSquare className="w-5 h-5 text-orange-500 mr-2" />
              Bình luận & Chia sẻ cảm nghĩ ({comments.length})
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <input
                type="text"
                required
                value={newCommentName}
                onChange={(e) => setNewCommentName(e.target.value)}
                placeholder="Họ tên của bạn..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
              />
              <textarea
                rows={2}
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Viết nhận xét hoặc chia sẻ mẹo du lịch của bạn..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi bình luận</span>
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{c.name}</span>
                    <span className="text-slate-400">{c.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
