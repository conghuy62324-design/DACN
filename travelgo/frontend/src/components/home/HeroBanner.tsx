import React from 'react';
import { SearchWidget } from './SearchWidget';

export const HeroBanner: React.FC = () => {
  return (
    <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 overflow-hidden min-h-[580px] sm:min-h-[640px] flex items-center justify-center">
      {/* Background Hero Image with Natural Halong Bay Scenery */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=2000&q=85"
          alt="Hạ Long Bay Cruise"
          className="w-full h-full object-cover object-center filter brightness-[0.88]"
        />
        {/* Soft Vignette / Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-slate-900/70" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        {/* Hero Title & Subtitle Matching Image 1 */}
        <div className="max-w-3xl mx-auto mb-8 sm:mb-12 space-y-4">
          <span className="inline-block py-1 px-4 rounded-full bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-semibold tracking-wider uppercase border border-white/30">
            Nền tảng du lịch thông minh Việt Nam
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
            Khám phá thế giới theo cách của bạn
          </h1>
          <p className="text-base sm:text-lg text-slate-100 font-normal drop-shadow max-w-2xl mx-auto">
            Đặt tour, vé máy bay và trải nghiệm du lịch dễ dàng, an toàn
          </p>
        </div>

        {/* Floating Search Widget */}
        <SearchWidget />
      </div>
    </section>
  );
};
