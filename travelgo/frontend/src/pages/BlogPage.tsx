import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BlogService } from '../services/blogService';
import { BlogPost } from '../types';
import { BookOpen, Search, Heart, User, Calendar, Plus, ArrowRight, MapPin } from 'lucide-react';
import { formatDateVN } from '../utils/formatters';
import {CatalogBreadcrumb,CatalogSkeletonGrid,CatalogState,catalogErrorText} from '../components/explore/CatalogPageFilters';
import '../styles/hg-catalog.css';

const BLOG_TAGS = ['all', 'Mẹo du lịch', 'Ẩm thực', 'Khám phá', 'Đà Nẵng', 'Hội An', 'Phú Quốc'];

export const BlogPage: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [tag, setTag] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchBlogs = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await BlogService.getBlogs({
          tag: tag !== 'all' ? tag : undefined,
          search: search || undefined,
        });
        setBlogs(data);
      } catch (e) {
        console.error('Failed to load blogs:', e);
        setBlogs([]);
        setError(catalogErrorText(e, 'Chưa tải được bài viết. Vui lòng thử lại sau ít phút.'));
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [tag, search, retry]);

  let list: React.ReactNode;
  if (loading) {
    list = <CatalogSkeletonGrid count={3} label="Đang tải bài viết…" />;
  } else if (error) {
    list = <CatalogState role="alert" tone="error" title="Chưa tải được cẩm nang" text={error} actions={<button type="button" className="hg-cat-btn hg-cat-btn--outline" onClick={() => setRetry((v) => v + 1)}>Thử lại</button>} />;
  } else if (blogs.length === 0) {
    list = <CatalogState
      role="status"
      icon={<BookOpen size={32} aria-hidden="true" />}
      title="Chưa có bài viết phù hợp"
      text={search || tag !== 'all' ? 'Thử chủ đề khác hoặc xóa từ khóa tìm kiếm.' : 'Hãy là người đầu tiên chia sẻ trải nghiệm của bạn.'}
      actions={<Link to="/blog/create" className="hg-cat-btn hg-cat-btn--outline"><Plus size={16} aria-hidden="true" />Viết bài chia sẻ</Link>}
    />;
  } else {
    list = (
      <div className="hg-cat-grid">
        {blogs.map((b) => (
          <article key={b.id} className="hg-cat-card">
            <Link to={`/blog/${b.id}`} className="hg-cat-card__media" tabIndex={-1} aria-hidden="true">
              <img src={b.coverImage} alt="" loading="lazy" decoding="async" onError={(e) => e.currentTarget.parentElement?.classList.add('hg-cat-imgfail')} />
              {b.destinationName && (
                <span className="hg-cat-card__badges">
                  <span className="hg-cat-badge"><MapPin size={12} aria-hidden="true" />{b.destinationName}</span>
                </span>
              )}
            </Link>

            <div className="hg-cat-card__body">
              <div className="hg-cat-card__meta">
                <span>
                  <User size={14} aria-hidden="true" />
                  {b.authorName}
                </span>
                <span>
                  <Calendar size={14} aria-hidden="true" />
                  {formatDateVN(b.createdAt)}
                </span>
              </div>

              <h3 className="hg-cat-card__title">
                <Link to={`/blog/${b.id}`}>{b.title}</Link>
              </h3>

              {b.excerpt && <p className="hg-cat-card__text">{b.excerpt}</p>}

              {b.tags.length > 0 && (
                <div className="hg-cat-card__tags">
                  {b.tags.map((t, idx) => (
                    <span key={idx} className="hg-cat-tag hg-cat-tag--muted">#{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="hg-cat-card__foot hg-cat-card__foot--row">
              <span className="hg-cat-card__meta">
                <span>
                  <Heart size={14} aria-hidden="true" />
                  {b.likesCount} lượt thích
                </span>
              </span>

              <Link to={`/blog/${b.id}`} className="hg-cat-link">
                <span>Đọc bài viết</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="hg-cat">
      <header className="hg-cat-head">
        <div className="hg-container">
          <CatalogBreadcrumb items={[{label:'Trang chủ',to:'/'},{label:'Cẩm nang du lịch'}]}/>
          <div className="hg-cat-head__row">
            <div className="hg-cat-head__text">
              <p className="hg-cat-eyebrow"><BookOpen size={16} aria-hidden="true"/>Cộng đồng chia sẻ trải nghiệm</p>
              <h1 className="hg-cat-h1">Cẩm nang du lịch &amp; nhật ký hành trình</h1>
              <p className="hg-cat-lead">
                Kinh nghiệm thực tế, lịch trình và chi phí chuyến đi do cộng đồng HuGo Travel chia sẻ.
              </p>
            </div>
            <div className="hg-cat-head__actions">
              <Link to="/blog/create" className="hg-cat-btn hg-cat-btn--cta hg-cat-btn--lg">
                <Plus size={18} aria-hidden="true" />
                <span>Viết bài chia sẻ mới</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="hg-container hg-cat-main">
        <section className="hg-cat-panel hg-cat-panel--split" aria-label="Lọc bài viết">
          <div className="hg-cat-chips hg-cat-chips--scroll" role="group" aria-label="Chủ đề">
            {BLOG_TAGS.map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={tag === t}
                onClick={() => setTag(t)}
                className="hg-cat-chip"
              >
                {t === 'all' ? 'Tất cả' : t}
              </button>
            ))}
          </div>

          <label className="hg-cat-inputwrap hg-cat-panel__search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label="Tìm kiếm bài viết"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm bài viết…"
              className="hg-cat-input"
            />
          </label>
        </section>

        <section aria-label="Danh sách bài viết">
          <div className="hg-cat-resultbar">
            <h2 className="hg-cat-h2">{tag === 'all' ? 'Bài viết mới' : 'Chủ đề: ' + tag}</h2>
            <p className="hg-cat-count" role="status">{loading ? 'Đang tải…' : error ? '' : `${blogs.length} bài viết`}</p>
          </div>
          {list}
        </section>
      </div>
    </div>
  );
};
