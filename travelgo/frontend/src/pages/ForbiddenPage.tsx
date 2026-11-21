import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LogIn, ShieldX } from 'lucide-react';
import '../styles/hg-catalog.css';

export const ForbiddenPage: React.FC = () => (
  <div className="hg-cat hg-cat--standalone">
    <div className="hg-container hg-cat-errorpage">
      <div className="hg-cat-errorcard">
        <Link to="/" className="hg-cat-brand">HuGo Travel</Link>
        <span className="hg-cat-errorcard__icon hg-cat-errorcard__icon--danger" aria-hidden="true">
          <ShieldX size={36} />
        </span>
        <span className="hg-cat-errorcard__code">LỖI 403 · KHÔNG CÓ QUYỀN</span>
        <h1>Bạn không có quyền truy cập</h1>
        <p>Tài khoản hiện tại chưa được cấp vai trò phù hợp cho khu vực này. Hãy đăng nhập bằng tài khoản khác hoặc quay về trang chủ.</p>
        <div className="hg-cat-errorcard__actions">
          <Link to="/" className="hg-cat-btn hg-cat-btn--cta hg-cat-btn--lg hg-cat-btn--block">
            <Home size={18} aria-hidden="true" />
            <span>Quay về HuGo Travel</span>
          </Link>
          <Link to="/login" className="hg-cat-btn hg-cat-btn--outline hg-cat-btn--lg hg-cat-btn--block">
            <LogIn size={18} aria-hidden="true" />
            <span>Đăng nhập tài khoản khác</span>
          </Link>
        </div>
      </div>
    </div>
  </div>
);
