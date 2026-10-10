import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Mail, Phone, MapPin, Facebook, Youtube, Instagram, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B1A2C] text-slate-300 pt-16 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-orange-500 flex items-center justify-center text-white shadow-md">
                <Compass className="w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                HuGo<span className="text-orange-500"> Travel</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Hệ thống đặt vé và dịch vụ du lịch uy tín hàng đầu Việt Nam. Khám phá những chân trời mới và chia sẻ những khoảnh khắc đáng nhớ nhất cùng chúng tôi.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <a href="#" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-orange-500 hover:text-white flex items-center justify-center text-slate-400 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-orange-500 hover:text-white flex items-center justify-center text-slate-400 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-orange-500 hover:text-white flex items-center justify-center text-slate-400 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-base font-bold mb-4 tracking-wide uppercase text-sm">Liên kết nhanh</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/explore" className="text-slate-400 hover:text-orange-400 transition-colors">
                  Bản đồ khám phá
                </Link>
              </li>
              <li>
                <Link to="/tickets" className="text-slate-400 hover:text-orange-400 transition-colors">
                  Đặt vé máy bay & tour
                </Link>
              </li>
              <li>
                <Link to="/hotels" className="text-slate-400 hover:text-orange-400 transition-colors">
                  Khách sạn & Resort
                </Link>
              </li>
              <li>
                <Link to="/restaurants" className="text-slate-400 hover:text-orange-400 transition-colors">
                  Nhà hàng & Ẩm thực
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-slate-400 hover:text-orange-400 transition-colors">
                  Cẩm nang du lịch
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white text-base font-bold mb-4 tracking-wide uppercase text-sm">Dịch vụ & Hỗ trợ</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#" className="text-slate-400 hover:text-orange-400 transition-colors">
                  Điều khoản dịch vụ
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-orange-400 transition-colors">
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-orange-400 transition-colors">
                  Chính sách hoàn huỷ vé
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-orange-400 transition-colors">
                  Câu hỏi thường gặp (FAQ)
                </a>
              </li>
              <li>
                <Link to="/admin" className="text-slate-400 hover:text-orange-400 transition-colors">
                  Cổng đối tác & Quản trị
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-white text-base font-bold mb-4 tracking-wide uppercase text-sm">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">contact@hugotravel.com</span>
              </li>
              <li className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400 font-semibold text-white">1900 1234 (24/7)</span>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400 leading-relaxed">
                  Tòa nhà Landmark 81, Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 HuGo Travel. All rights reserved.</p>
          <p className="flex items-center mt-2 sm:mt-0">
            Xây dựng với mô hình MVC & Thuật toán Bayesian Average
          </p>
        </div>
      </div>
    </footer>
  );
};
