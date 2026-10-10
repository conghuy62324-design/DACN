import React from 'react';
import { Star, Quote, CheckCircle2 } from 'lucide-react';

export const Testimonials: React.FC = () => {
  const testimonials = [
    {
      id: 't-1',
      name: 'Nguyễn Thảo Anh',
      role: 'Travel Blogger & Nhiếp ảnh',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      comment: 'Dịch vụ của HuGo Travel trên cả tuyệt vời! Tour Đà Nẵng Hội An được sắp xếp lịch trình rất hợp lý, khách sạn 4 sao view biển tuyệt đẹp và hướng dẫn viên cực kỳ chu đáo.',
      rating: 5,
    },
    {
      id: 't-2',
      name: 'Trần Hoàng Nam',
      role: 'Kỹ sư phần mềm - TP.HCM',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      comment: 'Giao diện đặt vé rất mượt, hỗ trợ tìm kiếm và so sánh trực quan. Đặc biệt tính năng bản đồ và điểm đánh giá Bayesian giúp mình chọn được resort ưng ý ngay lập tức.',
      rating: 5,
    },
    {
      id: 't-3',
      name: 'Lê Mai Ngọc',
      role: 'Quản lý Marketing - Hà Nội',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      comment: 'Cả gia đình mình có một chuyến nghỉ dưỡng tại Phú Quốc hoàn hảo nhờ sự đồng hành của HuGo Travel. Đặt vé máy bay và tour cano 4 đảo nhanh chóng, giá cực tốt!',
      rating: 5,
    },
  ];

  return (
    <section className="py-20 bg-[#0B1A2C] text-white relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-orange-400 font-bold text-xs uppercase tracking-widest block mb-2">
            Đánh giá từ cộng đồng
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Khách hàng nói gì về chúng tôi?
          </h2>
        </div>

        {/* 3 Testimonials Grid Matching Image 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-slate-700/80 flex flex-col justify-between hover:border-slate-600 transition-all shadow-lg"
            >
              <div>
                {/* 5 Stars */}
                <div className="flex items-center space-x-1 mb-4 text-amber-400">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>

                {/* Quote Text */}
                <p className="text-slate-200 text-sm leading-relaxed mb-6 italic">
                  "{item.comment}"
                </p>
              </div>

              {/* Author info */}
              <div className="flex items-center space-x-3 pt-4 border-t border-slate-700/60">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-orange-500/30"
                />
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-bold text-sm text-white">{item.name}</h4>
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <p className="text-xs text-slate-400">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
