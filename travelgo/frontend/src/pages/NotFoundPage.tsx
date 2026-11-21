import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, MapPin } from 'lucide-react';
import '../styles/hg-catalog.css';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="hg-cat">
      <div className="hg-container hg-cat-errorpage">
        <div className="hg-cat-errorcard">
          <span className="hg-cat-errorcard__icon" aria-hidden="true">
            <Compass size={36} />
          </span>
          <span className="hg-cat-errorcard__code">LỖI 404</span>
          <h1>Không tìm thấy trang yêu cầu</h1>
          <p>
            Đường dẫn bạn đang tìm có thể đã được thay đổi hoặc không tồn tại trên HuGo Travel.
          </p>

          <div className="hg-cat-errorcard__actions">
            <Link to="/" className="hg-cat-btn hg-cat-btn--cta hg-cat-btn--lg hg-cat-btn--block">
              <Home size={18} aria-hidden="true" />
              <span>Quay về Trang chủ</span>
            </Link>
            <Link to="/explore" className="hg-cat-btn hg-cat-btn--outline hg-cat-btn--lg hg-cat-btn--block">
              <MapPin size={18} aria-hidden="true" />
              <span>Khám phá dịch vụ du lịch</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
