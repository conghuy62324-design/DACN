import React, { useEffect, useRef, useState } from 'react';

// Bản xem trước hero banner do Gói E tự dựng theo kích thước design spec 4.4 (không sửa HomeHero của Gói A).
// Desktop: khung 1440×440 thu nhỏ bằng transform: scale(); Mobile: 390×260.

export interface BannerPreviewData {
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  imageDesktop?: string | null;
  imageMobile?: string | null;
  altText?: string | null;
}

const SIZE = {
  desktop: { width: 1440, height: 440 },
  mobile: { width: 390, height: 260 },
} as const;

export const BannerPreview: React.FC<{ banner: BannerPreviewData; mode: 'desktop' | 'mobile' }> = ({ banner, mode }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const size = SIZE[mode];

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const update = () => setFrameWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const maxWidth = mode === 'mobile' ? Math.min(frameWidth, size.width) : frameWidth;
  const scale = maxWidth > 0 ? maxWidth / size.width : 0;
  const image = mode === 'mobile' ? banner.imageMobile || banner.imageDesktop : banner.imageDesktop;

  return (
    <div ref={frameRef}>
      <div
        className="hgbo-preview"
        style={{ width: maxWidth || '100%', height: scale ? size.height * scale : undefined, aspectRatio: scale ? undefined : `${size.width}/${size.height}` }}
        role="img"
        aria-label={`Bản xem trước ${mode === 'mobile' ? 'mobile' : 'desktop'}: ${banner.title || 'chưa có tiêu đề'}`}
      >
        <span className="hgbo-preview__tag">Bản xem trước — chưa công khai</span>
        {scale > 0 && (
          <div
            className={`hgbo-preview__stage hgbo-preview__stage--${mode}`}
            style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}
            aria-hidden="true"
          >
            {image ? <img src={image} alt="" /> : <span className="hgbo-preview__noimg">Chưa chọn ảnh</span>}
            <div className="hgbo-preview__scrim" />
            <div className="hgbo-preview__copy">
              <p className="hgbo-preview__h1">{banner.title || 'Tiêu đề banner'}</p>
              {banner.subtitle && <p className="hgbo-preview__sub">{banner.subtitle}</p>}
              {banner.ctaLabel && <span className="hgbo-preview__cta">{banner.ctaLabel}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
