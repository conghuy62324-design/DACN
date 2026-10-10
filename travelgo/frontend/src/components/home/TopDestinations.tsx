import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { formatCurrencyVND } from '../../utils/formatters';

interface DestinationItem {
  id: string;
  name: string;
  city: string;
  priceFrom: number;
  image: string;
  link: string;
}

export const TopDestinations: React.FC = () => {
  const destinations: DestinationItem[] = [
    {
      id: 'dest-danang',
      name: 'Đà Nẵng',
      city: 'Đà Nẵng – Cầu Rồng & Biển Mỹ Khê',
      priceFrom: 4250000,
      image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
      link: '/places/p-danang-hoian',
    },
    {
      id: 'dest-phuquoc',
      name: 'Phú Quốc',
      city: 'Phú Quốc – Đảo Ngọc Thiên Đường',
      priceFrom: 3200000,
      image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
      link: '/places/p-phuquoc-resort',
    },
    {
      id: 'dest-sapa',
      name: 'Sapa',
      city: 'Sapa – Nóc Nhà Fansipan & Bản Làng',
      priceFrom: 1850000,
      image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
      link: '/places/p-sapa-fansipan',
    },
  ];

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12">
          <div>
            <span className="text-teal-600 font-bold text-xs uppercase tracking-widest block mb-1">
              Khám phá Việt Nam
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Điểm đến hàng đầu
            </h2>
          </div>
          <Link
            to="/explore"
            className="mt-3 sm:mt-0 inline-flex items-center text-sm font-bold text-slate-700 hover:text-orange-500 transition-colors group"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Cards Grid Matching Image 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {destinations.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col"
            >
              {/* Image Container with Zoom Effect */}
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 text-white">
                  <div className="flex items-center text-xs font-semibold text-slate-200 mb-0.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 mr-1" />
                    <span>{item.city}</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-white">{item.name}</h3>
                </div>
              </div>

              {/* Bottom Info Bar */}
              <div className="p-4 flex items-center justify-between border-t border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block">Chỉ từ</span>
                  <span className="text-base font-extrabold text-slate-900">
                    {formatCurrencyVND(item.priceFrom)}
                  </span>
                </div>
                <Link
                  to={item.link}
                  className="text-sm font-bold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  Trải nghiệm ngay
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
