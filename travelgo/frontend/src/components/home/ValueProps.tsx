import React from 'react';
import { ShieldCheck, Headphones, Percent, Sparkles, Phone, MessageSquare } from 'lucide-react';

export const ValueProps: React.FC = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title Matching Image 1 */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-teal-600 font-bold text-xs uppercase tracking-widest block mb-2">
            Tại sao chọn chúng tôi?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
            Chúng tôi mang đến những trải nghiệm du lịch hoàn hảo với dịch vụ chuyên nghiệp hàng đầu.
          </h2>
        </div>

        {/* 3 Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
          {/* Card 1 */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-card transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Dịch vụ uy tín 100%</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Mọi tour và đối tác khách sạn đều được thẩm định chất lượng nghiêm ngặt, cam kết bồi thường thỏa đáng nếu dịch vụ không như mô tả.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-card transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-5">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Chuyên viên hỗ trợ 24/7</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Đội ngũ chăm sóc khách hàng nhiệt tình, am hiểu từng cung đường và sẵn sàng giải đáp mọi thắc mắc của bạn bất kể ngày đêm.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-card transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
              <Percent className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Giá tốt & Nhiều ưu đãi</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Mức giá niêm yết minh bạch, không phí ẩn kèm chính sách tích điểm thưởng và voucher giảm giá đến 30% cho khách hàng thân thiết.
            </p>
          </div>
        </div>

        {/* Navy Support Banner Matching Image 1 */}
        <div className="bg-gradient-to-r from-[#0F294A] to-[#0A1E36] rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-xl">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Bạn cần hỗ trợ tư vấn chuyến đi?</h3>
            <p className="text-sky-200 text-sm max-w-xl">
              Đội ngũ chuyên viên của chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7 qua Hotline hoặc Live Chat.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
            <a
              href="tel:19001234"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white text-slate-900 hover:bg-slate-100 px-6 py-3 rounded-full font-bold text-sm transition-colors shadow"
            >
              <Phone className="w-4 h-4 text-orange-500" />
              <span>Hotline: 1900 1234</span>
            </a>
            <button
              onClick={() => alert('Đội ngũ tư vấn viên HuGo Travel sẵn sàng phục vụ quý khách qua Hotline 1900 1234!')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors shadow"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat ngay</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
