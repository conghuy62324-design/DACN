import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Calendar, Users, CheckCircle, ShieldCheck, Phone, Mail, User as UserIcon } from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { BookingService } from '../../services/bookingService';
import { formatCurrencyVND } from '../../utils/formatters';
import { getTelemetrySessionId } from '../../services/telemetryService';
import { readBookingIntent, rememberBookingIntent } from '../../utils/bookingIntentStorage';
import { bookingSnapshotMoney } from '../../utils/bookingSnapshotMoney';

export const BookingModal: React.FC = () => {
  const { isOpen, modalData, closeBooking, confirmedBooking, setConfirmedBooking, intentVersion, setPendingAttempt, startNewBooking } = useBooking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 3);
    return today.toISOString().split('T')[0];
  });
  const [returnDate, setReturnDate] = useState('');
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const sending = useRef(false);
  const attempts = useRef(new Map<string, string>());
  const attributionSession = useRef<string | undefined>();
  const currentUserId = useRef(user?.id);
  currentUserId.current = user?.id;

  useEffect(() => {
    attempts.current.clear();
    attributionSession.current = modalData?.recommendationRequestId ? getTelemetrySessionId() : undefined;
    setCustomerPhone(user?.phone ?? '');
    const start = modalData?.initialDate ?? new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    setBookingDate(start); setReturnDate('');
    setAdultsCount(2); setChildrenCount(0); setNotes(''); setSubmitError('');
    const stored = readBookingIntent(user?.id);
    if (stored && stored.modalData.serviceId === modalData?.serviceId) {
      attempts.current = new Map(stored.keys);
      attributionSession.current = stored.payload.recommendationSessionId;
      setCustomerPhone(stored.payload.customerPhone); setBookingDate(stored.payload.bookingDate); setReturnDate(stored.payload.returnDate ?? '');
      setAdultsCount(stored.payload.adultsCount); setChildrenCount(stored.payload.childrenCount); setNotes(stored.payload.notes ?? '');
      setSubmitError('Lần đặt trước chưa có kết quả xác nhận trên thiết bị này. Bạn có thể thử lại cùng nội dung hoặc xem lịch sử.');
    }
    // The provider changes the version only for a new, explicit intent.
  }, [intentVersion, user?.id]);

  if (!isOpen || !modalData) return null;

  const unitPrice = modalData.unitPrice;
  const totalAmount = unitPrice * adultsCount + unitPrice * 0.7 * childrenCount;
  const confirmedUnitPrice = bookingSnapshotMoney(confirmedBooking?.unitPrice);
  const confirmedTotal = bookingSnapshotMoney(confirmedBooking?.totalAmount);
  const confirmedDiscount = bookingSnapshotMoney(confirmedBooking?.discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        serviceType: modalData.serviceType,
        serviceId: modalData.serviceId,
        customerPhone: customerPhone.trim(),
        bookingDate,
        returnDate: returnDate === '' ? undefined : returnDate,
        adultsCount,
        childrenCount,
        notes: notes.trim() === '' ? undefined : notes.trim(),
        recommendationRequestId: modalData.recommendationRequestId,
        recommendationSessionId: attributionSession.current,
      };
      // Retain every attempted payload's key until this intent is completed or
      // explicitly replaced. Editing back after an uncertain response is safe.
      const identity = JSON.stringify({ userId: user?.id, ...payload });
      let key = attempts.current.get(identity);
      if (!key) { key = crypto.randomUUID(); attempts.current.set(identity, key); }
      if (user) rememberBookingIntent({ userId: user.id, modalData, payload, keys: [...attempts.current] });
      setPendingAttempt(true);
      const created = await BookingService.createBooking(payload, key);
      if (currentUserId.current !== user?.id) return;
      setConfirmedBooking(created);
      setPendingAttempt(false);
    } catch (error) {
      if (currentUserId.current !== user?.id) return;
      console.error('Booking failed:', error);
      setSubmitError((error as any)?.message || 'Không thể tạo booking. Vui lòng thử lại.');
    } finally {
      sending.current = false;
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setConfirmedBooking(null);
    closeBooking();
    navigate('/bookings');
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Đặt dịch vụ" className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] bg-white rounded-3xl shadow-2xl overflow-y-auto border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white p-6 relative">
          <button
            aria-label="Đóng đặt dịch vụ"
            onClick={closeBooking}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="pr-8">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500 text-white mb-2 uppercase">
              {modalData.serviceType === 'tour' ? 'Đặt Tour' : modalData.serviceType === 'hotel' ? 'Đặt Phòng' : modalData.serviceType === 'restaurant' ? 'Đặt Bàn' : 'Đặt Vé'}
            </span>
            <h2 className="text-xl font-bold leading-snug line-clamp-1">{confirmedBooking?.serviceName ?? modalData.serviceName}</h2>
            <p className="text-sky-200 text-sm mt-1">{confirmedBooking
              ? `Đơn giá: ${confirmedUnitPrice === undefined ? 'Chưa có trong dữ liệu xác nhận' : formatCurrencyVND(confirmedUnitPrice) + ' / đơn vị tính giá'}`
              : `Đơn giá ước tính: ${formatCurrencyVND(unitPrice)} / khách`}</p>
          </div>
        </div>

        {!user ? (
          <div className="p-8 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-orange-500" />
            <h3 className="mt-4 text-xl font-extrabold text-slate-900">Đăng nhập để đặt dịch vụ</h3>
            <p className="mt-2 text-sm text-slate-500">Booking phải được liên kết với tài khoản để bạn và đối tác cùng theo dõi trạng thái.</p>
            <Link to="/login" onClick={closeBooking} className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white">Đăng nhập ngay</Link>
          </div>
        ) : confirmedBooking ? (
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
                <span>{confirmedTotal === undefined ? 'Chưa có trong dữ liệu xác nhận' : formatCurrencyVND(confirmedTotal)}</span>
              </div>
              {confirmedDiscount !== undefined && <div className="flex justify-between text-slate-600"><span>Giảm giá theo đơn:</span><span>{formatCurrencyVND(confirmedDiscount)}</span></div>}
              {Number.isSafeInteger(confirmedBooking.quantity) && <p className="text-slate-600">Số đơn vị tính giá: {confirmedBooking.quantity}</p>}
            </div>

            <p className="text-xs text-slate-400">
              Đơn đang chờ đối tác xác nhận. Bạn có thể theo dõi trong lịch sử đặt dịch vụ.
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
            <fieldset disabled={isSubmitting} className="space-y-4">
            {submitError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{submitError}</div>}
            {submitError && <div className="text-xs text-slate-600 space-y-2">
              <p>Nếu kết nối bị gián đoạn, thử lại cùng nội dung để nhận lại đơn. Đóng rồi mở lại vẫn giữ lần đặt này. Sửa nội dung tạo ý định khác; hãy kiểm tra lịch sử nếu chưa rõ đơn trước đã được tạo hay chưa.</p>
              <Link to="/bookings" onClick={closeBooking} className="underline">Xem lịch sử</Link>
              <button type="button" onClick={startNewBooking} className="block underline">Bắt đầu đơn mới (đơn trước có thể đã được tạo)</button>
            </div>}
            {/* Customer Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    name="customerName"
                    type="text"
                    required
                    value={user.fullName}
                    readOnly
                    aria-label="Họ và tên từ tài khoản"
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
                      name="customerPhone"
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
                      name="customerEmail"
                      type="email"
                      required
                      value={user.email}
                      readOnly
                      aria-label="Email từ tài khoản"
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
                    name="bookingDate"
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
                    name="returnDate"
                    type="date"
                    value={returnDate}
                    min={bookingDate}
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
                      onClick={() => setAdultsCount(Math.min(100 - childrenCount, adultsCount + 1))}
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
                      onClick={() => setChildrenCount(Math.min(100 - adultsCount, childrenCount + 1))}
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
                  name="notes"
                  rows={2}
                  maxLength={5000}
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
                <span className="text-sm text-slate-600">Tổng tiền dự kiến:</span>
                <span className="text-2xl font-black text-orange-600">{formatCurrencyVND(totalAmount)}</span>
              </div>

              <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl mb-4">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Giá xác nhận lấy từ hệ thống. Ngày kết thúc là thông tin yêu cầu; giá MVP tính theo khách, chưa tính phòng theo đêm. Họ tên và email dùng từ tài khoản.</span>
              </div>

              <button
                data-testid="booking-submit"
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
            </fieldset>
          </form>
        )}
      </div>
    </div>
  );
};
