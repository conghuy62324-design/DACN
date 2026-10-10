import React, { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';

export const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      setSubscribed(true);
    }
  };

  return (
    <section className="py-16 bg-slate-100/70 border-t border-slate-200/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Đăng ký nhận ưu đãi & cẩm nang du lịch
        </h2>
        <p className="text-slate-500 text-sm mb-8 max-w-xl mx-auto">
          Nhận ngay mã giảm giá 10% cho chuyến đi đầu tiên và thông tin ưu đãi mới nhất từ HuGo Travel.
        </p>

        {subscribed ? (
          <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl flex items-center justify-center space-x-2 max-w-md mx-auto border border-emerald-200">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-sm">
              Cảm ơn bạn! HuGo Travel đã gửi mã ưu đãi 10% đến {email}.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <div className="relative w-full">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email của bạn..."
                className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-slate-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-sm rounded-full shadow-md shadow-orange-500/25 transition-all whitespace-nowrap"
            >
              Đăng ký
            </button>
          </form>
        )}
        <p className="text-[11px] text-slate-400 mt-3">
          Thông tin của bạn được bảo mật tuyệt đối theo chính sách quyền riêng tư của HuGo Travel.
        </p>
      </div>
    </section>
  );
};
