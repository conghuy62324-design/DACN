import React, { useState, useEffect } from 'react';
import { TicketService } from '../services/ticketService';
import { Ticket } from '../types';
import { Plane, Bus, Train, Ticket as TicketIcon, Clock, CheckCircle2, Search, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { formatCurrencyVND } from '../utils/formatters';
import { useBooking } from '../context/BookingContext';

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [type, setType] = useState('all');
  const [fromCity, setFromCity] = useState('all');
  const [toCity, setToCity] = useState('all');
  const [maxPrice, setMaxPrice] = useState(5000000);
  const [loading, setLoading] = useState(true);

  const { openBooking } = useBooking();

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchTickets = async () => {
      setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [type, fromCity, toCity, maxPrice]);

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

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-[#0B1F3A] to-[#0F355C] rounded-3xl p-8 sm:p-12 text-white shadow-xl mb-10 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              Đặt vé & Phương tiện di chuyển
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Vé máy bay, tàu hỏa, xe khách & vé tham quan
            </h1>
            <p className="text-sky-200 text-sm sm:text-base leading-relaxed">
              Dễ dàng so sánh giá vé, chọn lịch trình linh hoạt và thanh toán an toàn với xác nhận tức thì.
            </p>
          </div>
        </div>

        {/* Filters Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 space-y-5">
          {/* Service Types */}
          <div className="flex items-center space-x-3 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'Tất cả vé', icon: TicketIcon },
              { id: 'flight', label: 'Vé máy bay', icon: Plane },
              { id: 'bus', label: 'Xe Limousine', icon: Bus },
              { id: 'train', label: 'Tàu hỏa du lịch', icon: Train },
              { id: 'sightseeing', label: 'Vé cáp treo & Điểm tham quan', icon: TicketIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setType(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                    type === tab.id
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Điểm đi</label>
              <select
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none"
              >
                <option value="all">Tất cả điểm đi</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="Huế">Huế</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Điểm đến</label>
              <select
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none"
              >
                <option value="all">Tất cả điểm đến</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="Phú Quốc">Phú Quốc</option>
                <option value="Sapa">Sapa</option>
                <option value="Bà Nà Hills">Bà Nà Hills</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-500">Mức giá tối đa</label>
                <span className="text-xs font-extrabold text-orange-600">{formatCurrencyVND(maxPrice)}</span>
              </div>
              <input
                type="range"
                min={200000}
                max={5000000}
                step={100000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer mt-2"
              />
            </div>
          </div>
        </div>

        {/* Ticket Results List */}
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <p className="text-slate-500 text-base">Không tìm thấy vé phù hợp với tiêu chí lọc.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-card transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                {/* Left details */}
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                    {t.type === 'flight' ? (
                      <Plane className="w-7 h-7" />
                    ) : t.type === 'bus' ? (
                      <Bus className="w-7 h-7" />
                    ) : t.type === 'train' ? (
                      <Train className="w-7 h-7" />
                    ) : (
                      <TicketIcon className="w-7 h-7" />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {t.operator}
                      </span>
                      <span className="text-xs text-slate-400">
                        • Còn {t.availableSeats} chỗ
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {t.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Thời gian: {t.duration}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-orange-500" />
                        {t.departureCity} ➔ {t.arrivalCity}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {t.features.map((feat, i) => (
                        <span key={i} className="text-[11px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-100">
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Price & Booking CTA */}
                <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    {t.originalPrice && (
                      <span className="text-xs text-slate-400 line-through block">
                        {formatCurrencyVND(t.originalPrice)}
                      </span>
                    )}
                    <span className="text-xl sm:text-2xl font-black text-orange-600 block">
                      {formatCurrencyVND(t.price)}
                    </span>
                    <span className="text-[11px] text-slate-400">/ vé khứ hồi</span>
                  </div>

                  <button
                    onClick={() => handleBookTicket(t)}
                    className="mt-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-xl shadow-md text-sm transition-all"
                  >
                    Đặt vé ngay
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
