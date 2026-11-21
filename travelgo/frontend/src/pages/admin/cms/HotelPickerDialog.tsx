import React, { useEffect, useId, useRef, useState } from 'react';
import { ImageOff, Search } from 'lucide-react';
import { AdminBackofficeService } from '../../../services/adminBackofficeService';
import { Alert, BoButton, Portal, Skeleton, errorMessage, useFocusTrap, useScrollLock } from '../../../components/backoffice';

export interface PickedHotel {
  placeId: string;
  name: string;
  image?: string;
  location?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Đã chọn (để khóa trùng) */
  existing: string[];
  max: number;
  onPick: (hotels: PickedHotel[]) => void;
}

/** Chọn khách sạn từ API công khai GET /hotels (chỉ khách sạn đủ điều kiện công khai). Không tạo/sao chép dữ liệu. */
export const HotelPickerDialog: React.FC<Props> = ({ open, onClose, existing, max, onPick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const inputId = useId();
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedHotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chosen, setChosen] = useState<PickedHotel[]>([]);
  useFocusTrap(open, ref, onClose, { initialFocus: inputRef });
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setChosen([]);
    setTerm('');
    setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    setError('');
    AdminBackofficeService.publicHotels(query, 20)
      .then((items) => {
        if (!live) return;
        setResults(items.map((h: any) => ({
          placeId: h.identity?.id || h.id,
          name: h.identity?.name || h.name || '—',
          image: h.hotelMedia?.[0]?.url,
          location: [h.destination?.name, h.address?.fullAddress].filter(Boolean).join(' · '),
        })).filter((h) => h.placeId));
      })
      .catch((requestError) => live && setError(errorMessage(requestError, 'Không tìm được khách sạn.')))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [open, query]);

  if (!open) return null;
  const room = max - existing.length;
  const full = chosen.length >= room;

  const toggle = (hotel: PickedHotel, checked: boolean) => setChosen((list) => (checked ? [...list, hotel] : list.filter((h) => h.placeId !== hotel.placeId)));

  return (
    <Portal>
      <div className="hgbo-overlay hgbo-overlay--modal" aria-hidden="true" onClick={onClose} />
      <div ref={ref} className="hgbo-dialog hgbo-dialog--md" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 className="hgbo-dialog__title" id={titleId}>Thêm khách sạn nổi bật</h2>
        <p className="hgbo-dialog__desc">Chỉ hiện khách sạn đang công khai. Còn chọn được {Math.max(0, room - chosen.length)} / {max}.</p>
        <div className="hgbo-dialog__body">
          <form
            className="hgbo-filter__search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(term.trim());
            }}
          >
            <label className="hgbo-sr" htmlFor={inputId}>Tìm khách sạn theo tên hoặc địa chỉ</label>
            <Search aria-hidden="true" />
            <input ref={inputRef} id={inputId} className="hgbo-input" type="search" value={term} maxLength={120} placeholder="Tên hoặc địa chỉ, nhấn Enter" onChange={(event) => setTerm(event.target.value)} />
          </form>
          {error && <Alert tone="danger">{error}</Alert>}
          {loading ? (
            <div className="hgbo-stack hgbo-stack--sm">
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </div>
          ) : results.length ? (
            <ul className="hgbo-pick">
              {results.map((hotel) => {
                const already = existing.includes(hotel.placeId);
                const checked = already || chosen.some((h) => h.placeId === hotel.placeId);
                const disabled = already || (!checked && full);
                return (
                  <li key={hotel.placeId}>
                    <label className={disabled ? 'is-disabled' : undefined}>
                      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => toggle(hotel, event.target.checked)} />
                      {hotel.image ? <img className="hgbo-thumb" src={hotel.image} alt="" loading="lazy" /> : <span className="hgbo-thumb" aria-hidden="true"><ImageOff /></span>}
                      <span>
                        <span className="hgbo-strong">{hotel.name}</span>
                        {hotel.location && <span className="hgbo-dt__cell-sub">{hotel.location}</span>}
                        {already && <span className="hgbo-dt__cell-sub">Đã có trong danh sách</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            !error && <p className="hgbo-muted">Không tìm thấy khách sạn công khai phù hợp.</p>
          )}
        </div>
        <div className="hgbo-dialog__foot">
          <BoButton variant="secondary" onClick={onClose}>Hủy bỏ</BoButton>
          <BoButton
            variant="primary"
            disabled={!chosen.length}
            onClick={() => {
              onPick(chosen);
              onClose();
            }}
          >
            {chosen.length ? `Thêm ${chosen.length} khách sạn` : 'Thêm khách sạn'}
          </BoButton>
        </div>
      </div>
    </Portal>
  );
};
