// Chọn khách sạn đang quản lý (topbar Partner). Đổi khách sạn giữ nguyên mục đang xem.
// Ghi chú: spec đặt file ở components/partner/; Gói F chỉ được tạo file trong pages/partner/* nên đặt tại đây.
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, Plus, Search } from 'lucide-react';
import { Portal, StatusPill, useFocusTrap } from '../../../components/backoffice';
import { contentPending } from './shared';
import { usePartnerHotels } from './partnerContext';

export const PropertySwitcher: React.FC = () => {
  const ctx = usePartnerHotels();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 360 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  useFocusTrap(open, popRef, () => setOpen(false), { returnFocus: buttonRef });

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(360, window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setPos({ top: rect.bottom + 6, left, width });
    };
    place();
    const onDown = (event: MouseEvent) => {
      if (popRef.current?.contains(event.target as Node) || buttonRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const groups = useMemo(() => {
    const text = q.trim().toLowerCase();
    const map = new Map<string, any[]>();
    for (const h of ctx?.hotels || []) {
      if (text && !String(h.name).toLowerCase().includes(text)) continue;
      const key = h.businessName || 'Doanh nghiệp';
      map.set(key, [...(map.get(key) || []), h]);
    }
    return Array.from(map.entries());
  }, [ctx?.hotels, q]);

  if (!ctx || !ctx.enabled) return null;
  const current = ctx.current;

  const choose = (id: string) => {
    ctx.remember(id);
    const onHotelPage = matchPath({ path: '/partner/hotels/:hotelId/*' }, location.pathname);
    const hit = matchPath({ path: '/partner/hotels/:hotelId/:section/*' }, location.pathname);
    // Đang ở trang khách sạn: giữ mục, thay :hotelId. Query (?edit, ?room, ?rate) gắn với khách sạn cũ nên bỏ.
    // Trang khác (Tổng quan, Đơn đặt…): chỉ ghi nhớ lựa chọn, trang tự đổi ngữ cảnh.
    if (onHotelPage && onHotelPage.params.hotelId !== 'new') navigate(`/partner/hotels/${id}/${hit?.params.section || 'overview'}`);
    else if (location.pathname === '/partner/hotels') navigate(`/partner/hotels/${id}/overview`);
    setOpen(false);
  };

  return (
    <div className="hgp-switch">
      <button
        ref={buttonRef}
        type="button"
        className="hgp-switch__btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={current ? `Khách sạn đang chọn: ${current.name}. Đổi khách sạn` : 'Chọn khách sạn'}
        onClick={() => setOpen((v) => !v)}
      >
        <Building2 aria-hidden="true" />
        <span className="hgp-switch__name">{current ? current.name : ctx.loading ? 'Đang tải…' : 'Chọn khách sạn'}</span>
        {current && <StatusPill status={current.status} domain="moderation" size="sm" className="hgp-switch__pill" />}
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <Portal>
          <div className="hgp-switch__scrim" aria-hidden="true" />
          <div
            ref={popRef}
            id={listId}
            className="hgp-switch__pop"
            role="dialog"
            aria-label="Chọn khách sạn"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {(ctx.hotels.length > 6 || q) && (
              <div className="hgp-switch__search">
                <Search aria-hidden="true" />
                <input
                  className="hgbo-input"
                  type="search"
                  aria-label="Tìm khách sạn"
                  placeholder="Tìm khách sạn"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                />
              </div>
            )}
            {ctx.error && <p className="hgbo-field__error hgp-switch__msg">{ctx.error}</p>}
            {!ctx.error && !ctx.loading && !ctx.hotels.length && <p className="hgp-switch__msg hgbo-muted">Chưa có khách sạn.</p>}
            <div className="hgp-switch__list">
              {groups.map(([business, hotels]) => (
                <div key={business} role="group" aria-label={business}>
                  <p className="hgp-switch__group">{business}</p>
                  <ul>
                    {hotels.map((h) => {
                      const active = h.id === current?.id;
                      return (
                        <li key={h.id}>
                          <button
                            type="button"
                            className={`hgp-switch__item ${active ? 'is-active' : ''}`.trim()}
                            aria-current={active ? 'true' : undefined}
                            onClick={() => choose(h.id)}
                          >
                            <span className="hgp-switch__check" aria-hidden="true">{active && <Check />}</span>
                            <span className="hgp-switch__itemtext">
                              <span className="hgp-switch__itemname">{h.name}</span>
                              {contentPending(h) && <span className="hgp-switch__warn">Có thay đổi chưa gửi duyệt</span>}
                            </span>
                            <StatusPill status={h.status} domain="moderation" size="sm" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <Link className="hgp-switch__add" to="/partner/hotels/new" onClick={() => setOpen(false)}>
              <Plus aria-hidden="true" />
              Thêm khách sạn
            </Link>
          </div>
        </Portal>
      )}
    </div>
  );
};
