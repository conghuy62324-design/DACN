import React, { useState, useEffect } from 'react';
import { BookingService } from '../services/bookingService';
import { Booking } from '../types';
import { Bookmark, Calendar, Users, CheckCircle2, Clock, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatCurrencyVND } from '../utils/formatters';

export const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const data = await BookingService.getBookings();
        setBookings(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn đặt này không?')) return;

    try {
      await BookingService.cancelBooking(id);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, bookingStatus: 'CANCELLED' } : b))
      );
      alert('Đã hủy đơn đặt dịch vụ thành công!');
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã xác nhận</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ thanh toán</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="text-orange-600 font-bold text-xs uppercase tracking-wider block mb-1">
            Quản lý hành trình
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Lịch sử đặt vé & dịch vụ
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi tình trạng đơn đặt tour, khách sạn, nhà hàng và vé phương tiện.
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">Chưa có đơn đặt nào</h3>
            <p className="text-slate-500 text-sm">Hãy khám phá các tour du lịch và đặt dịch vụ ngay hôm nay!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                  <div>
                    <span className="text-xs text-slate-400 block">Mã đơn đặt</span>
                    <span className="text-base font-mono font-bold text-slate-900">{b.bookingCode}</span>
                  </div>
                  <div>{getStatusBadge(b.bookingStatus)}</div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Dịch vụ</span>
                    <span className="font-bold text-slate-800 text-sm line-clamp-1">{b.serviceName}</span>
                    <span className="text-slate-400 block capitalize mt-0.5">Loại: {b.serviceType}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Thời gian khởi hành</span>
                    <span className="font-bold text-slate-800 text-sm">{b.bookingDate}</span>
                    {b.returnDate && <span className="text-slate-500 block">Đến: {b.returnDate}</span>}
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Số lượng khách</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {b.adultsCount} Người lớn, {b.childrenCount} Trẻ em
                    </span>
                    <span className="text-slate-500 block mt-0.5">Khách: {b.customerName}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Tổng tiền thanh toán</span>
                    <span className="font-black text-orange-600 text-base">
                      {formatCurrencyVND(b.totalAmount)}
                    </span>
                    <span className="text-slate-400 block uppercase text-[10px]">
                      {b.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Ngày đặt: {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                  </span>

                  {!['CANCELLED', 'COMPLETED', 'REJECTED'].includes(b.bookingStatus) && (
                    <button
                      onClick={() => handleCancelBooking(b.id)}
                      className="px-4 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      Hủy dịch vụ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
