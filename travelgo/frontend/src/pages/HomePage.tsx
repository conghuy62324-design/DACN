import React, { useEffect, useState } from 'react';
import { HeroBanner } from '../components/home/HeroBanner';
import { FeatureBadges } from '../components/home/FeatureBadges';
import { TopDestinations } from '../components/home/TopDestinations';
import { ValueProps } from '../components/home/ValueProps';
import { FeaturedTours } from '../components/home/FeaturedTours';
import { Testimonials } from '../components/home/Testimonials';
import { BlogSection } from '../components/home/BlogSection';
import { Newsletter } from '../components/home/Newsletter';
import { PlaceService } from '../services/placeService';
import { BlogService } from '../services/blogService';
import { Place, BlogPost } from '../types';

export const HomePage: React.FC = () => {
  const [tours, setTours] = useState<Place[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadHomeData = async () => {
      try {
        const [placesData, blogsData] = await Promise.all([
          PlaceService.getPlaces(),
          BlogService.getBlogs(),
        ]);
        setTours(placesData);
        setBlogs(blogsData);
      } catch (error) {
        console.error('Failed to load home page data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* 1. Hero with Banner & Floating Search */}
      <HeroBanner />

      {/* 2. Trust Metrics / Value Badges */}
      <FeatureBadges />

      {/* 3. Khám Phá Việt Nam - Điểm Đến Hàng Đầu */}
      <TopDestinations />

      {/* 4. Lý Do Chọn TravelGo & Hotline Banner */}
      <ValueProps />

      {/* 5. Tour Nổi Bật / Vé & Dịch Vụ Trải Nghiệm */}
      <FeaturedTours tours={tours} />

      {/* 6. Khách Hàng Nói Gì Về Chúng Tôi (Navy Section) */}
      <Testimonials />

      {/* 7. Cẩm Nang Du Lịch (Blog) */}
      <BlogSection blogs={blogs} />

      {/* 8. Newsletter Subscription */}
      <Newsletter />
    </div>
  );
};
