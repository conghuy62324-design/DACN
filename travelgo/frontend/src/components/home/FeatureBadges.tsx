import React from 'react';
import { Users, Compass, Headphones } from 'lucide-react';

export const FeatureBadges: React.FC = () => {
  return (
    <section className="bg-white py-8 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Badge 1 */}
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50/60 border border-slate-100/80 hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-slate-900">10,000+</p>
              <p className="text-sm text-slate-500 font-medium">Khách hàng tin dùng</p>
            </div>
          </div>

          {/* Badge 2 */}
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50/60 border border-slate-100/80 hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-slate-900">500+</p>
              <p className="text-sm text-slate-500 font-medium">Tour & dịch vụ phong phú</p>
            </div>
          </div>

          {/* Badge 3 */}
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-50/60 border border-slate-100/80 hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-slate-900">Hỗ trợ 24/7</p>
              <p className="text-sm text-slate-500 font-medium">Luôn sẵn sàng hỗ trợ bạn</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
