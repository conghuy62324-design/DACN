import {LocationCombobox} from '../components/common/LocationCombobox';
import React, { useState, useEffect } from 'react';
import { TicketService } from '../services/ticketService';
import { Ticket } from '../types';
import { Plane, Bus, Train, Ticket as TicketIcon, Clock, Check, MapPin, ArrowRight, Info } from 'lucide-react';
import { formatCurrencyVND } from '../utils/formatters';
import { useBooking } from '../context/BookingContext';
import {CatalogBreadcrumb,CatalogState,catalogErrorText} from '../components/explore/CatalogPageFilters';
import '../styles/hg-catalog.css';

const TICKET_TYPES = [
  { id: 'all', label: 'Tất cả vé', icon: TicketIcon },
  { id: 'flight', label: 'Vé máy bay', icon: Plane },
  { id: 'bus', label: 'Xe limousine', icon: Bus },
  { id: 'train', label: 'Tàu hỏa du lịch', icon: Train },
  { id: 'sightseeing', label: 'Cáp treo & điểm tham quan', icon: TicketIcon },
];

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [type, setType] = useState('all');
  const [fromCity, setFromCity] = useState('all');
  const [toCity, setToCity] = useState('all');
  const [maxPrice, setMaxPrice] = useState(5000000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const { openBooking } = useBooking();

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchTickets = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await TicketService.getTickets({
          type: type !== 'all' ? type : undefined,
          fromCity: fromCity !== 'all' ? fromCity : undefined,
          toCity: toCity !== 'all' ? toCity : undefined,
          maxPrice: maxPrice,
        });
        setTickets(data);
      } catch (e) {
        console.error('Failed to load tickets:', e);
        setTickets([]);
        setError(catalogErrorText(e, 'Chưa tải được danh sách vé. Vui lòng thử lại sau ít phút.'));
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [type, fromCity, toCity, maxPrice, retry]);

  const handleBookTicket = (ticket: Ticket) => {
    openBooking({
      serviceType: 'ticket',
      serviceId: ticket.id,
      serviceName: ticket.title,
      unitPrice: ticket.price,
      initialDate: ticket.departureTime.slice(0, 10),
      imageUrl: ticket.imageUrl,
    });
  };

  const typeIcon = (t: Ticket['type']) => t === 'flight' ? <Plane size={26} aria-hidden="true" /> : t === 'bus' ? <Bus size={26} aria-hidden="true" /> : t === 'train' ? <Train size={26} aria-hidden="true" /> : <TicketIcon size={26} aria-hidden="true" />;

  let list: React.ReactNode;
  if (loading) {
    list = (
      <div className="hg-cat-rows" role="status">
        <span className="hg-cat-sr">Đang tải vé…</span>
        {[1, 2, 3].map((n) => (
          <div key={n} className="hg-cat-skelrow" aria-hidden="true">
            <span className="hg-cat-skel" />
            <span>
              <span className="hg-cat-skel hg-cat-skel--w40" />
              <span className="hg-cat-skel hg-cat-skel--w75" />
              <span className="hg-cat-skel hg-cat-skel--w60" />
            </span>
            <span className="hg-cat-skel" />
          </div>
        ))}
      </div>
    );
  } else if (error) {
    list = <CatalogState role="alert" tone="error" title="Chưa tải được vé" text={error} actions={<button type="button" className="hg-cat-btn hg-cat-btn--outline" onClick={() => setRetry((v) => v + 1)}>Thử lại</button>} />;
  } else if (tickets.length === 0) {
    list = <CatalogState role="status" icon={<TicketIcon size={32} aria-hidden="true" />} title="Không tìm thấy vé phù hợp" text="Không tìm thấy vé phù hợp với tiêu chí lọc. Thử đổi điểm đi, điểm đến hoặc tăng mức giá tối đa." />;
  } else {
    list = (
      <div className="hg-cat-rows">
        {tickets.map((t) => (
          <article key={t.id} data-testid={`ticket-${t.id}`} className="hg-cat-row">
            <span className="hg-cat-row__icon">{typeIcon(t.type)}</span>

            <div className="hg-cat-row__info">
              <div className="hg-cat-card__meta">
                <span className="hg-cat-tag hg-cat-tag--muted">{t.operator}</span>
                <span>Còn {t.availableSeats} chỗ (theo nhà cung cấp)</span>
              </div>
              <h3 className="hg-cat-row__title">{t.title}</h3>
              <div className="hg-cat-card__meta">
                <span>
                  <MapPin size={14} aria-hidden="true" />
                  {t.departureCity}
                  <ArrowRight size={14} aria-label="đến" />
                  {t.arrivalCity}
                </span>
                {t.duration && (
                  <span>
                    <Clock size={14} aria-hidden="true" />
                    Thời gian: {t.duration}
                  </span>
                )}
              </div>
              {t.features.length > 0 && (
                <div className="hg-cat-card__tags">
                  {t.features.map((feat, i) => (
                    <span key={i} className="hg-cat-tag hg-cat-tag--muted">
                      <Check size={12} aria-hidden="true" />
                      {feat}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="hg-cat-row__side">
              <div className="hg-cat-price">
                <span className="hg-cat-price__label">Giá vé từ</span>
                <span className="hg-cat-price__value">{formatCurrencyVND(t.price)}</span>
                <span className="hg-cat-price__note">/ vé</span>
              </div>

              <button
                type="button"
                onClick={() => handleBookTicket(t)}
                className="hg-cat-btn hg-cat-btn--cta"
              >
                Đặt vé ngay
              </button>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="hg-cat">
      <header className="hg-cat-head">
        <div className="hg-container">
          <CatalogBreadcrumb items={[{label:'Trang chủ',to:'/'},{label:'Vé & di chuyển'}]}/>
          <p className="hg-cat-eyebrow"><TicketIcon size={16} aria-hidden="true"/>Đặt vé &amp; phương tiện di chuyển</p>
          <h1 className="hg-cat-h1">Vé máy bay, tàu hỏa, xe khách &amp; vé tham quan</h1>
          <p className="hg-cat-lead">
            So sánh giá vé và lịch trình giữa các nhà cung cấp. Giá và số chỗ do nhà cung cấp công bố; đơn đặt được xác nhận lại trong lịch sử tài khoản.
          </p>
        </div>
      </header>

      <div className="hg-container hg-cat-main">
        <nav aria-label="Loại vé" className="hg-cat-tabs">
          {TICKET_TYPES.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                type="button"
                key={tab.id}
                aria-pressed={type === tab.id}
                onClick={() => setType(tab.id)}
                className="hg-cat-tab"
              >
                <Icon aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="hg-cat-panel" aria-label="Lọc vé">
          <div className="hg-cat-searchrow hg-cat-searchrow--3">
            <LocationCombobox label="Điểm đi" value={fromCity} onChange={setFromCity}/>
            <LocationCombobox label="Điểm đến" value={toCity} onChange={setToCity}/>
            <label className="hg-cat-field">
              <span className="hg-cat-field__row">
                <span>Mức giá tối đa</span>
                <b>{formatCurrencyVND(maxPrice)}</b>
              </span>
              <input
                type="range"
                aria-label="Mức giá tối đa"
                min={200000}
                max={5000000}
                step={100000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="hg-cat-range"
              />
            </label>
          </div>
        </section>

        <section aria-label="Danh sách vé">
          <div className="hg-cat-resultbar">
            <h2 className="hg-cat-h2">Vé phù hợp</h2>
            <p className="hg-cat-count" role="status">{loading ? 'Đang tải…' : error ? '' : `${tickets.length} lựa chọn`}</p>
          </div>
          {!loading && !error && tickets.length > 0 && (
            <p className="hg-cat-notice hg-cat-notice--info">
              <Info size={16} aria-hidden="true" />
              <span>Số chỗ còn lại và giá do nhà cung cấp cập nhật, có thể thay đổi khi xác nhận đơn. Hệ thống chưa xử lý thanh toán.</span>
            </p>
          )}
          {list}
        </section>
      </div>
    </div>
  );
};
