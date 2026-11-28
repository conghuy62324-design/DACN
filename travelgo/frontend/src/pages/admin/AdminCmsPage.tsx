import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ApiPendingState, BO_FEATURES, BO_FEATURE_CONTRACT, PageHeader, useBackofficeBreadcrumbs } from '../../components/backoffice';
import { BannerList } from './cms/BannerList';
import { SectionsManager } from './cms/SectionsManager';
import { FeaturedHotelsManager } from './cms/FeaturedHotelsManager';

const TABS = [
  { key: 'banners', label: 'Banner', to: '/admin/cms' },
  { key: 'sections', label: 'Các khối trang chủ', to: '/admin/cms/sections' },
  { key: 'featured', label: 'Khách sạn nổi bật', to: '/admin/cms/featured' },
];

const TAB_LABEL: Record<string, string> = { banners: 'Banner', sections: 'Các khối trang chủ', featured: 'Khách sạn nổi bật' };

export const AdminCmsPage: React.FC = () => {
  const { tab = 'banners' } = useParams();
  useBackofficeBreadcrumbs([{ label: 'Nội dung website' }, { label: 'CMS trang chủ', to: '/admin/cms' }, { label: TAB_LABEL[tab] || 'Banner' }]);
  if (!TAB_LABEL[tab]) return <Navigate to="/admin/cms" replace />;
  return (
    <div>
      <PageHeader
        title="CMS trang chủ"
        subtitle="Banner, thứ tự các khối và khách sạn nổi bật. Footer và SEO nằm ở Cài đặt."
        tabs={BO_FEATURES.cms ? TABS : undefined}
        tabValue={tab}
        tabsLabel="Mục CMS"
      />
      {!BO_FEATURES.cms ? (
        <ApiPendingState feature="CMS trang chủ" contractRef={BO_FEATURE_CONTRACT.cms} description="Cần migration 19 và API CMS được duyệt." />
      ) : tab === 'sections' ? (
        <SectionsManager />
      ) : tab === 'featured' ? (
        <FeaturedHotelsManager />
      ) : (
        <BannerList />
      )}
    </div>
  );
};
