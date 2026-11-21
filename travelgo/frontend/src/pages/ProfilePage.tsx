import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AccountShell, roleLabels } from '../components/account/AccountShell';
import {CustomerMemoryPanel} from '../components/agent/CustomerMemoryPanel';
import {ReviewModerationPanel} from '../components/common/ReviewModerationPanel';
import {OwnReviewsPanel} from '../components/common/OwnReviewsPanel';
import '../styles/hg-account.css';

export const ProfilePage: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <p role="status" className="hg-acc-status">Đang xác thực phiên đăng nhập…</p>;
  if (!user) return null;

  return (
    <AccountShell title="Hồ sơ cá nhân" description="Thông tin tài khoản dùng khi đặt chỗ và liên hệ với HuGo Travel.">
      <section aria-label="Hồ sơ cá nhân" className="hg-acc-card">
        <div className="hg-acc-profile__top">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`Ảnh đại diện của ${user.fullName}`} className="hg-acc-profile__avatar" />
          ) : (
            <div aria-label="Chưa có ảnh đại diện" role="img" className="hg-acc-profile__avatar">
              <User aria-hidden="true" size={40} />
            </div>
          )}
          <div className="hg-acc-profile__who">
            <h2>{user.fullName || 'Chưa cung cấp'}</h2>
            <p>Hồ sơ hiện chỉ hỗ trợ xem.</p>
          </div>
        </div>
        <dl className="hg-acc-dl">
          <div>
            <dt>Họ và tên</dt>
            <dd>{user.fullName || 'Chưa cung cấp'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email || 'Chưa cung cấp'}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd data-testid="profile-phone">{user.phone?.trim() || 'Chưa cung cấp'}</dd>
          </div>
          <div>
            <dt>Vai trò</dt>
            <dd data-testid="profile-roles">{user.roles.map(role => roleLabels[role]).join(', ') || 'Chưa cung cấp'}</dd>
          </div>
        </dl>
      </section>
      <div className="hg-acc-panels">
        {user.roles.includes('CUSTOMER')&&<CustomerMemoryPanel key={user.id+':'+localStorage.getItem('travelgo_token')} token={localStorage.getItem('travelgo_token')||''}/>}
        <OwnReviewsPanel key={'reviews:'+user.id+':'+localStorage.getItem('travelgo_token')} token={localStorage.getItem('travelgo_token')||''}/>
        {user.roles.includes('SUPER_ADMIN')&&<ReviewModerationPanel/>}
      </div>
    </AccountShell>
  );
};
