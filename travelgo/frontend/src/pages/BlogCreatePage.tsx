import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BlogService } from '../services/blogService';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Image, MapPin, DollarSign, Clock, Tag, CheckCircle2, Sparkles } from 'lucide-react';

export const BlogCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const prefilledDraft = (location.state as any)?.prefilledDraft;

  const [title, setTitle] = useState(prefilledDraft?.title || '');
  const [destinationName, setDestinationName] = useState(prefilledDraft?.destination || 'Đà Nẵng');
  const [excerpt, setExcerpt] = useState(prefilledDraft?.summary || '');
  const [content, setContent] = useState(prefilledDraft?.content || '');
  const [coverImage, setCoverImage] = useState(
    'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80'
  );
  const [costEstimate, setCostEstimate] = useState(
    prefilledDraft?.totalCostVND
      ? `${new Intl.NumberFormat('vi-VN').format(prefilledDraft.totalCostVND)} VNĐ`
      : '4.000.000đ / người'
  );
  const [tripDuration, setTripDuration] = useState(prefilledDraft?.durationText || '3 Ngày 2 Đêm');
  const [tagInput, setTagInput] = useState(
    prefilledDraft?.suggestedTags?.join(', ') || 'Mẹo du lịch, Check-in'
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !excerpt || !content) {
      setErrorMsg('Vui lòng điền đầy đủ tiêu đề, tóm tắt và nội dung bài viết.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
      const newPost = await BlogService.createBlog({
        title,
        excerpt,
        content,
        destinationName,
        authorName: user?.fullName || 'Lữ khách HuGo Travel',
        authorAvatar: user?.avatarUrl,
        coverImage,
        costEstimate,
        tripDuration,
        tags,
      });

      alert('Đăng bài viết chia sẻ thành công!');
      navigate(`/blog/${newPost.id}`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Không thể đăng bài viết lúc này. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-teal-600 font-bold text-xs uppercase tracking-wider block mb-1">
              Góc chia sẻ cộng đồng
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Viết bài chia sẻ kinh nghiệm du lịch
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Chia sẻ những khoảnh khắc đẹp, mẹo tiết kiệm chi phí và gợi ý lịch trình cho những người yêu du lịch khác.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs border border-rose-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề bài viết</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Bí kíp du lịch Phú Quốc mùa đẹp nhất không cháy túi..."
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* Destination & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 mr-1" />
                  Địa điểm du lịch
                </label>
                <input
                  type="text"
                  required
                  value={destinationName}
                  onChange={(e) => setDestinationName(e.target.value)}
                  placeholder="Đà Nẵng, Hội An, Sapa..."
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                  <Clock className="w-3.5 h-3.5 text-teal-600 mr-1" />
                  Thời gian chuyến đi
                </label>
                <input
                  type="text"
                  value={tripDuration}
                  onChange={(e) => setTripDuration(e.target.value)}
                  placeholder="3 Ngày 2 Đêm"
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            {/* Cost & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500 mr-1" />
                  Chi phí ước tính
                </label>
                <input
                  type="text"
                  value={costEstimate}
                  onChange={(e) => setCostEstimate(e.target.value)}
                  placeholder="4.000.000đ / người"
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                  <Tag className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  Chủ đề / Tags (cách nhau bởi dấu phẩy)
                </label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Mẹo du lịch, Ẩm thực, Check-in"
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            {/* Cover Image URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                <Image className="w-3.5 h-3.5 text-slate-400 mr-1" />
                Đường dẫn ảnh bìa (Image URL)
              </label>
              <input
                type="url"
                required
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tóm tắt ngắn (1-2 câu)</label>
              <textarea
                rows={2}
                required
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Tóm tắt những điểm hấp dẫn nhất trong bài viết của bạn..."
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* Full Content */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung chi tiết bài viết</label>
              <textarea
                rows={8}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Kể về chuyến đi của bạn: Phương tiện di chuyển, khách sạn lưu trú, món ăn ngon và những lưu ý cần thiết..."
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-normal"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/25 transition-all text-sm"
            >
              {submitting ? 'Đang xuất bản bài viết...' : 'Xuất bản bài viết ngay'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
