import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { HuGoLogo } from './Navbar';
import '../../styles/hg-shell.css';

const exploreLinks = [
  ['Khách sạn', '/hotels'],
  ['Nhà hàng', '/restaurants'],
  ['Điểm đến & trải nghiệm', '/explore'],
  ['Tour du lịch', '/tours'],
  ['Vé tham quan', '/tickets'],
];

const tripLinks = [
  ['Lập lịch trình', '/tour-planner'],
  ['Trợ lý AI', '/assistant'],
  ['Chuyến đi của tôi', '/my-trips'],
  ['Cẩm nang', '/blog'],
];

export const Footer = () => {
  const email = import.meta.env.VITE_PUBLIC_CONTACT_EMAIL;
  const phone = import.meta.env.VITE_PUBLIC_CONTACT_PHONE;
  return (
    <footer className="hg-footer">
      <div className="hg-container">
        <div className="hg-footer-grid">
          <div className="hg-footer-brand">
            <HuGoLogo />
            <p className="hg-footer-intro">Từ một nơi muốn đến, đến một hành trình của riêng bạn. Khám phá Việt Nam cùng HuGo Travel.</p>
          </div>
          <nav className="hg-footer-col hg-footer-col--explore" aria-labelledby="hg-footer-explore">
            <h2 id="hg-footer-explore">Khám phá</h2>
            <ul>
              {exploreLinks.map(([label, to]) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="hg-footer-col hg-footer-col--trip" aria-labelledby="hg-footer-trip">
            <h2 id="hg-footer-trip">Chuyến đi của bạn</h2>
            <ul>
              {tripLinks.map(([label, to]) => (
                <li key={to}>
                  <Link to={to}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="hg-footer-col hg-footer-col--support">
            <h2>Hỗ trợ &amp; chính sách</h2>
            <ul>
              <li>
                <Link to="/become-partner">
                  Trở thành đối tác
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link to="/terms">Điều khoản sử dụng</Link>
              </li>
              <li>
                <Link to="/privacy">Quyền riêng tư</Link>
              </li>
              <li>
                <Link to="/photo-credits">Nguồn ảnh &amp; bản quyền</Link>
              </li>
              {email && (
                <li>
                  <a href={'mailto:' + email}>{email}</a>
                </li>
              )}
              {phone && (
                <li>
                  <a href={'tel:' + phone}>{phone}</a>
                </li>
              )}
              {!email && !phone && (
                <li>
                  <p className="hg-footer-note">Thông tin liên hệ đang được cập nhật.</p>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="hg-footer-bottom">
          <span>© {new Date().getFullYear()} HuGo Travel</span>
          <span>Thông tin dịch vụ cần được kiểm tra trước khi đặt.</span>
        </div>
      </div>
    </footer>
  );
};
