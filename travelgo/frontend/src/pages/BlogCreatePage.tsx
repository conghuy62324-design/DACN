import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BlogService } from '../services/blogService';
import { useAuth } from '../context/AuthContext';
import { Image, MapPin, Wallet, Clock, Tag, AlertTriangle, PenLine } from 'lucide-react';
import {CatalogBreadcrumb,catalogErrorText} from '../components/explore/CatalogPageFilters';
import '../styles/hg-catalog.css';

export const BlogCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const prefilledDraft = (location.state as any)?.prefilledDraft;

  const [title, setTitle] = useState(prefilledDraft?.title || '');
  const [destinationName, setDestinationName] = useState(prefilledDraft?.destination || '');
  const [excerpt, setExcerpt] = useState(prefilledDraft?.summary || '');
  const [content, setContent] = useState(prefilledDraft?.content || '');
  // Không điền sẵn ảnh/chi phí/thời gian mẫu: người viết tự nhập để tránh đăng số liệu không có thật.
  const [coverImage, setCoverImage] = useState('');
  const [costEstimate, setCostEstimate] = useState(
    prefilledDraft?.totalCostVND
      ? `${new Intl.NumberFormat('vi-VN').format(prefilledDraft.totalCostVND)} VNĐ`
      : ''
  );
  const [tripDuration, setTripDuration] = useState(prefilledDraft?.durationText || '');
  const [tagInput, setTagInput] = useState(
    prefilledDraft?.suggestedTags?.join(', ') || ''
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
      const tags = tagInput.split(',').map((t: string) => t.trim()).filter(Boolean);
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

      alert('Đã gửi bài viết chia sẻ. Bài sẽ hiển thị sau khi được duyệt.');
      navigate(`/blog/${newPost.id}`);
    } catch (err) {
      console.error(err);
      setErrorMsg(catalogErrorText(err, 'Không thể đăng bài viết lúc này. Vui lòng thử lại!'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hg-cat">
      <header className="hg-cat-head">
        <div className="hg-container">
          <div className="hg-cat-narrow">
            <CatalogBreadcrumb items={[{label:'Trang chủ',to:'/'},{label:'Cẩm nang du lịch',to:'/blog'},{label:'Viết bài'}]}/>
            <p className="hg-cat-eyebrow"><PenLine size={16} aria-hidden="true"/>Góc chia sẻ cộng đồng</p>
            <h1 className="hg-cat-h1">Viết bài chia sẻ kinh nghiệm du lịch</h1>
            <p className="hg-cat-lead">
              Chia sẻ khoảnh khắc đẹp, mẹo tiết kiệm chi phí và gợi ý lịch trình cho những người yêu du lịch khác.
            </p>
          </div>
        </div>
      </header>

      <div className="hg-container hg-cat-main">
        <div className="hg-cat-narrow hg-cat-box">
          {errorMsg && (
            <p role="alert" className="hg-cat-notice hg-cat-notice--error">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>{errorMsg}</span>
            </p>
          )}

          <form onSubmit={handleSubmit} className="hg-cat-form">
            <label className="hg-cat-field">
              <span>Tiêu đề bài viết</span>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Kinh nghiệm du lịch Phú Quốc mùa đẹp nhất"
                className="hg-cat-input"
              />
            </label>

            <div className="hg-cat-form__grid">
              <label className="hg-cat-field">
                <span><MapPin size={16} aria-hidden="true" />Địa điểm du lịch</span>
                <input
                  type="text"
                  required
                  value={destinationName}
                  onChange={(e) => setDestinationName(e.target.value)}
                  placeholder="Đà Nẵng, Hội An, Sa Pa…"
                  className="hg-cat-input"
                />
              </label>

              <label className="hg-cat-field">
                <span><Clock size={16} aria-hidden="true" />Thời gian chuyến đi</span>
                <input
                  type="text"
                  value={tripDuration}
                  onChange={(e) => setTripDuration(e.target.value)}
                  placeholder="Ví dụ: 3 ngày 2 đêm"
                  className="hg-cat-input"
                />
              </label>
            </div>

            <div className="hg-cat-form__grid">
              <label className="hg-cat-field">
                <span><Wallet size={16} aria-hidden="true" />Chi phí ước tính</span>
                <input
                  type="text"
                  value={costEstimate}
                  onChange={(e) => setCostEstimate(e.target.value)}
                  placeholder="Ví dụ: 4.000.000đ / người"
                  className="hg-cat-input"
                />
              </label>

              <label className="hg-cat-field">
                <span><Tag size={16} aria-hidden="true" />Chủ đề (cách nhau bởi dấu phẩy)</span>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Mẹo du lịch, Ẩm thực, Check-in"
                  className="hg-cat-input"
                />
              </label>
            </div>

            <label className="hg-cat-field">
              <span><Image size={16} aria-hidden="true" />Đường dẫn ảnh bìa</span>
              <input
                type="url"
                required
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://…"
                className="hg-cat-input"
              />
              <span className="hg-cat-field__hint">Chỉ dùng ảnh bạn chụp hoặc có quyền sử dụng.</span>
            </label>

            <label className="hg-cat-field">
              <span>Tóm tắt ngắn (1–2 câu)</span>
              <textarea
                rows={2}
                required
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Tóm tắt những điểm hấp dẫn nhất trong bài viết của bạn…"
                className="hg-cat-textarea"
              />
            </label>

            <label className="hg-cat-field">
              <span>Nội dung chi tiết</span>
              <textarea
                rows={10}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Kể về chuyến đi của bạn: phương tiện di chuyển, nơi lưu trú, món ăn ngon và những lưu ý cần thiết…"
                className="hg-cat-textarea"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="hg-cat-btn hg-cat-btn--cta hg-cat-btn--lg hg-cat-btn--block"
            >
              {submitting ? 'Đang gửi bài viết…' : 'Gửi bài viết'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
