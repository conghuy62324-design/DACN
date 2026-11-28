import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BlogService } from '../services/blogService';
import { BlogPost } from '../types';
import {
  Heart,
  MapPin,
  Wallet,
  Clock,
  MessageSquare,
  Send,
  Compass,
  ArrowRight,
  BookOpen,
  Info,
} from 'lucide-react';
import { formatDateVN } from '../utils/formatters';
import {CatalogBreadcrumb,CatalogState,catalogErrorText} from '../components/explore/CatalogPageFilters';
import '../styles/hg-catalog.css';

const initials = (name: string) => name.trim().split(/\s+/).slice(-1)[0]?.charAt(0).toUpperCase() || 'H';

export const BlogDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  // Bình luận chỉ lưu tạm trong trình duyệt (chưa có API); không dựng sẵn bình luận mẫu.
  const [comments, setComments] = useState<{ id: string; name: string; text: string; date: string }[]>([]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchBlog = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await BlogService.getBlogById(id || 'b-1');
        setBlog(data);
        setLikesCount(data.likesCount);
      } catch (e: any) {
        console.error(e);
        setBlog(null);
        setLoadError(/không tìm thấy|không tồn tại/i.test(String(e?.message || '')) ? 'NOT_FOUND' : catalogErrorText(e, 'Chưa tải được bài viết. Vui lòng thử lại sau ít phút.'));
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id, retry]);

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

  const crumbs = (title?: string) => <CatalogBreadcrumb items={[{label:'Trang chủ',to:'/'},{label:'Cẩm nang du lịch',to:'/blog'},{label:title||'Bài viết'}]}/>;

  if (loading || !blog) {
    return (
      <div className="hg-cat">
        <div className="hg-container hg-cat-main">
          <div className="hg-cat-article">
            {crumbs()}
            {loading ? (
              <div role="status">
                <span className="hg-cat-sr">Đang tải bài viết…</span>
                <div className="hg-cat-skelhead" aria-hidden="true">
                  <span className="hg-cat-skel" />
                  <span className="hg-cat-skel" />
                </div>
                <div className="hg-cat-cover" aria-hidden="true"><span className="hg-cat-skel hg-cat-skel--fill" /></div>
              </div>
            ) : loadError === 'NOT_FOUND' ? (
              <CatalogState
                role="status"
                icon={<BookOpen size={32} aria-hidden="true" />}
                title="Không tìm thấy bài viết"
                text="Bài viết không tồn tại hoặc chưa được duyệt hiển thị."
                actions={<Link to="/blog" className="hg-cat-btn hg-cat-btn--outline">Xem cẩm nang khác</Link>}
              />
            ) : (
              <CatalogState
                role="alert"
                tone="error"
                title="Chưa tải được bài viết"
                text={loadError}
                actions={<>
                  <button type="button" className="hg-cat-btn hg-cat-btn--outline" onClick={() => setRetry((v) => v + 1)}>Thử lại</button>
                  <Link to="/blog" className="hg-cat-btn hg-cat-btn--ghost">Về trang cẩm nang</Link>
                </>}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hg-cat">
      <div className="hg-container hg-cat-main">
        <article className="hg-cat-article">
          {crumbs(blog.title)}

          {blog.tags.length > 0 && (
            <div className="hg-cat-card__tags">
              {blog.tags.map((t, idx) => (
                <span key={idx} className="hg-cat-tag">#{t}</span>
              ))}
            </div>
          )}

          <h1 className="hg-cat-h1 hg-cat-h1--article">{blog.title}</h1>

          <div className="hg-cat-author">
            <div className="hg-cat-review__who">
              <span className="hg-cat-avatar">
                {blog.authorAvatar ? <img src={blog.authorAvatar} alt="" /> : initials(blog.authorName)}
              </span>
              <div>
                <p className="hg-cat-review__name">{blog.authorName}</p>
                <p className="hg-cat-review__sub">Ngày đăng: {formatDateVN(blog.createdAt)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLike}
              aria-pressed={liked}
              aria-label={`Thích bài viết, hiện có ${likesCount} lượt thích`}
              className="hg-cat-btn hg-cat-btn--ghost hg-cat-btn--sm hg-cat-like"
            >
              <Heart size={18} aria-hidden="true" />
              <span>{likesCount}</span>
            </button>
          </div>

          <div className="hg-cat-cover">
            <img src={blog.coverImage} alt={blog.title} onError={(e) => e.currentTarget.parentElement?.classList.add('hg-cat-imgfail')} />
          </div>

          <div className="hg-cat-facts3">
            <div className="hg-cat-fact">
              <MapPin size={18} aria-hidden="true" />
              <span>Địa điểm<b>{blog.destinationName || 'Chưa cung cấp'}</b></span>
            </div>
            <div className="hg-cat-fact">
              <Clock size={18} aria-hidden="true" />
              <span>Thời gian đề xuất<b>{blog.tripDuration || 'Chưa cung cấp'}</b></span>
            </div>
            <div className="hg-cat-fact">
              <Wallet size={18} aria-hidden="true" />
              <span>Dự trù chi phí<b>{blog.costEstimate || 'Chưa cung cấp'}</b></span>
            </div>
          </div>

          <div className="hg-cat-prose">{blog.content}</div>

          <div className="hg-cat-banner hg-cat-banner--spaced">
            <div>
              <h2><Compass size={18} aria-hidden="true" /> Bạn thích lịch trình trong bài viết này?</h2>
              <p>Đưa điểm đến sang HuGo Planner để tự chọn ngày, thêm bớt điểm và ước tính chi phí.</p>
            </div>
            <button
              type="button"
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
              className="hg-cat-btn hg-cat-btn--cta"
            >
              <span>Sao chép thành tour cá nhân</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>

          <section className="hg-cat-box hg-cat-comments" aria-labelledby="blog-comments-title">
            <h2 id="blog-comments-title" className="hg-cat-box__title">
              <MessageSquare size={18} aria-hidden="true" />
              Bình luận &amp; chia sẻ cảm nghĩ ({comments.length})
            </h2>
            <p className="hg-cat-notice hg-cat-notice--info hg-cat-notice--spaced">
              <Info size={16} aria-hidden="true" />
              <span>Bình luận hiện chỉ hiển thị trên thiết bị của bạn và chưa được lưu lên máy chủ.</span>
            </p>

            <form onSubmit={handleAddComment} className="hg-cat-form">
              <label className="hg-cat-field">
                <span>Họ tên</span>
                <input
                  type="text"
                  required
                  value={newCommentName}
                  onChange={(e) => setNewCommentName(e.target.value)}
                  placeholder="Họ tên của bạn"
                  className="hg-cat-input"
                />
              </label>
              <label className="hg-cat-field">
                <span>Nội dung</span>
                <textarea
                  rows={3}
                  required
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Viết nhận xét hoặc chia sẻ mẹo du lịch của bạn…"
                  className="hg-cat-textarea"
                />
              </label>
              <div>
                <button type="submit" className="hg-cat-btn hg-cat-btn--primary">
                  <Send size={16} aria-hidden="true" />
                  <span>Gửi bình luận</span>
                </button>
              </div>
            </form>

            {comments.length === 0 ? (
              <p className="hg-cat-note hg-cat-comments__empty">Chưa có bình luận nào.</p>
            ) : (
              <div className="hg-cat-stack hg-cat-comments__list">
                {comments.map((c) => (
                  <div key={c.id} className="hg-cat-review">
                    <div className="hg-cat-review__head">
                      <div className="hg-cat-review__who">
                        <span className="hg-cat-avatar">{initials(c.name)}</span>
                        <p className="hg-cat-review__name">{c.name}</p>
                      </div>
                      <span className="hg-cat-review__sub">{formatDateVN(c.date)}</span>
                    </div>
                    <p className="hg-cat-review__body">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </article>
      </div>
    </div>
  );
};
