import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { TravelPhoto, travelPhotos } from '../hotels/TravelPhoto';
import '../../styles/hg-account.css';

interface AuthLayoutProps {
  title: string;
  lead: string;
  photoId: string;
  photoTitle: string;
  photoText: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}

// Khung chung cho Đăng nhập / Đăng ký: thẻ 440px giữa trang, ảnh minh họa bên phải từ 1024px.
export function AuthLayout({ title, lead, photoId, photoTitle, photoText, footer, children }: AuthLayoutProps) {
  const photo = travelPhotos.find((asset) => asset.id === photoId);
  return (
    <div className="hg-auth">
      <div className="hg-auth__frame">
        <section className="hg-auth__card">
          <Link to="/" className="hg-auth__brand">
            <span aria-hidden="true">
              <Compass size={18} />
            </span>
            <span>HuGo Travel</span>
          </Link>
          <h1>{title}</h1>
          <p className="hg-auth__lead">{lead}</p>
          {children}
          <p className="hg-auth__alt">{footer}</p>
        </section>
        {photo && (
          <aside className="hg-auth__media" aria-label="Ảnh điểm đến">
            <TravelPhoto assetId={photo.id} sizes="480px" />
            <div className="hg-auth__caption">
              <p className="hg-auth__caption-title">{photoTitle}</p>
              <p className="hg-auth__caption-text">{photoText}</p>
              <p className="hg-auth__credit">
                {photo.actualLocation} · Ảnh: {photo.author} · {photo.license} ·{' '}
                <Link to="/photo-credits">Nguồn ảnh</Link>
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
