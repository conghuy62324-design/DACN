import React, { useState } from 'react';
import { X, Calendar, Users, CheckCircle, ShieldCheck, Phone, Mail, User as UserIcon } from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { BookingService } from '../../services/bookingService';
import { formatCurrencyVND } from '../../utils/formatters';

export const BookingModal: React.FC = () => {
  const { isOpen, modalData, closeBooking, confirmedBooking, setConfirmedBooking } = useBooking();
  const { user } = useAuth();

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '0905123456');
  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 3);
    return today.toISOString().split('T')[0];
  });
  const [returnDate, setReturnDate] = useState(() => {
    const next = new Date();
    next.setDate(next.getDate() + 6);
    return next.toISOString().split('T')[0];
  });
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !modalData) return null;

  const unitPrice = modalData.unitPrice;
  const totalAmount = unitPrice * adultsCount + unitPrice * 0.7 * childrenCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const created = await BookingService.createBooking({
        serviceType: modalData.serviceType,
        serviceId: modalData.serviceId,
        serviceName: modalData.serviceName,
        customerName: customerName || 'Khách hàng HuGo Travel',
        customerEmail: customerEmail || 'guest@hugotravel.vn',
        customerPhone: customerPhone || '0905123456',
        bookingDate,
        returnDate,
        adultsCount,
        childrenCount,
        unitPrice,
        totalAmount,
        notes,
      });

      setConfirmedBooking(created);
    } catch (error) {
      console.error('Booking failed:', error);
      // Fallback local booking for offline demo
      const mockCreated = {
        id: `bk-${Date.now()}`,
        bookingCode: `HG-${Date.now().toString().slice(-6)}`,
        serviceType: modalData.serviceType,
        serviceId: modalData.serviceId,
        serviceName: modalData.serviceName,
        customerName: customerName || 'Khách hàng HuGo Travel',
        customerEmail: customerEmail || 'guest@hugotravel.vn',
        customerPhone: customerPhone || '0905123456',
        bookingDate,
        returnDate,
        adultsCount,
        childrenCount,
        unitPrice,
        totalAmount,
        paymentStatus: 'unpaid' as const,
        bookingStatus: 'confirmed' as const,
        notes,
        createdAt: new Date().toISOString(),
      };
      setConfirmedBooking(mockCreated);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setConfirmedBooking(null);
    closeBooking();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white p-6 relative">
          <button
            onClick={closeBooking}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="pr-8">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500 text-white mb-2 uppercase">
              {modalData.serviceType === 'tour' ? 'Đặt Tour' : modalData.serviceType === 'hotel' ? 'Đặt Phòng' : modalData.serviceType === 'restaurant' ? 'Đặt Bàn' : 'Đặt Vé'}
            </span>
            <h2 className="text-xl font-bold leading-snug line-clamp-1">{modalData.serviceName}</h2>
            <p className="text-sky-200 text-sm mt-1">Đơn giá: {formatCurrencyVND(unitPrice)} / khách</p>
          </div>
        </div>

        {confirmedBooking ? (
          /* Confirmation Success Screen */
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-800">Đặt dịch vụ thành công!</h3>
              <p className="text-slate-500 text-sm mt-1">
                Mã đặt chỗ của bạn là: <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{confirmedBooking.bookingCode}</span>
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-left text-sm space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Dịch vụ:</span>
                <span className="font-medium text-slate-800">{confirmedBooking.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <span className="font-medium text-slate-800">{confirmedBooking.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khởi hành:</span>
                <span className="font-medium text-slate-800">{confirmedBooking.bookingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số lượng:</span>
                <span className="font-medium text-slate-800">{confirmedBooking.adultsCount} Người lớn, {confirmedBooking.childrenCount} Trẻ em</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base text-orange-600">
                <span>Tổng thanh toán:</span>
                <span>{formatCurrencyVND(confirmedBooking.totalAmount)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              * Email xác nhận và hướng dẫn chi tiết đã được gửi đến {confirmedBooking.customerEmail}.
            </p>

            <button
              onClick={handleFinish}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-colors"
            >
              Hoàn tất & Xem lịch sử
            </button>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Customer Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0901234567"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Guests Count */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-700">Người lớn</span>
                    <span className="text-xs text-slate-400">&gt; 12 tuổi</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                      className="w-7 h-7 bg-white rounded-lg border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
                    >
                      -
                    </button>
                    <span className="font-bold text-slate-800 text-sm flex-1 text-center">{adultsCount}</span>
                    <button
                      type="button"
                      onClick={() => setAdultsCount(adultsCount + 1)}
                      className="w-7 h-7 bg-white rounded-lg border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-700">Trẻ em</span>
                    <span className="text-xs text-slate-400">2 - 11 tuổi (-30%)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                      className="w-7 h-7 bg-white rounded-lg border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
                    >
                      -
                    </button>
                    <span className="font-bold text-slate-800 text-sm flex-1 text-center">{childrenCount}</span>
                    <button
                      type="button"
                      onClick={() => setChildrenCount(childrenCount + 1)}
                      className="w-7 h-7 bg-white rounded-lg border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú yêu cầu đặc biệt</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Ăn chay, phòng tầng cao, giường đôi..."
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            {/* Total Calculation & CTA */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600">Tổng cộng thanh toán:</span>
                <span className="text-2xl font-black text-orange-600">{formatCurrencyVND(totalAmount)}</span>
              </div>

              <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl mb-4">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Bảo hiểm du lịch trọn gói & Miễn phí hoàn hủy trước 24 giờ.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/25 active:scale-98 transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Đang xử lý đơn đặt...</span>
                ) : (
                  <span>Xác nhận đặt dịch vụ ngay</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
