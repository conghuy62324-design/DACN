import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  Star, 
  ShieldCheck, 
  Heart, 
  Share2, 
  Check, 
  Calendar, 
  Users, 
  MessageSquare, 
  Info,
  ChevronRight,
  Flame,
  Plus
} from 'lucide-react';
import { Place, Review } from '../types';
import { PlaceService } from '../services/placeService';
import { RatingBadge } from '../components/common/RatingBadge';
import { formatCurrencyVND } from '../utils/formatters';
import { useFavorites } from '../context/FavoritesContext';
import { useBooking } from '../context/BookingContext';

export const PlaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [place, setPlace] = useState<Place | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarPlaces, setSimilarPlaces] = useState<Place[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'inclusions' | 'policies' | 'reviews'>('overview');
  const [loading, setLoading] = useState(true);

  // Booking Card State
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // New Review Form State
  const [newReviewerName, setNewReviewerName] = useState('');
  const [newReviewScore, setNewReviewScore] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

  const { toggleFavorite, isFavorite } = useFavorites();
  const { openBooking } = useBooking();

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPlaceData = async () => {
      setLoading(true);
      try {
        const placeData = await PlaceService.getPlaceById(id || 'p-danang-hoian');
        setPlace(placeData);

        const revData = await PlaceService.getReviews(placeData.id);
        setReviews(revData);

        const allPlaces = await PlaceService.getPlaces();
        setSimilarPlaces(allPlaces.filter((p) => p.id !== placeData.id).slice(0, 3));
      } catch (err) {
        console.error('Failed to load place:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaceData();
  }, [id]);

  if (loading || !place) {
    return (
      <div className="min-h-screen pt-28 pb-16 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-medium">Đang tải thông tin hành trình...</p>
        </div>
      </div>
    );
  }

  const unitPrice = place.priceFrom;
  const totalPrice = unitPrice * adults + unitPrice * 0.7 * children;
  const favorited = isFavorite(place.id);

  const handleBookingClick = () => {
    openBooking({
      serviceType: place.category as any,
      serviceId: place.id,
      serviceName: place.name,
      unitPrice: place.priceFrom,
      initialDate: selectedDate,
      imageUrl: place.heroImage,
    });
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewerName || !newReviewComment) return;

    setSubmittingReview(true);
    try {
      const added = await PlaceService.addReview(place.id, {
        userName: newReviewerName,
        rating: newReviewScore,
        comment: newReviewComment,
      });

      setReviews([added, ...reviews]);
      setReviewSuccessMsg('Cảm ơn bạn! Đánh giá đã được ghi nhận và cập nhật vào thuật toán Bayesian Average của địa điểm.');
      setNewReviewComment('');
      setNewReviewerName('');

      // Refresh place stats
      const updated = await PlaceService.getPlaceById(place.id);
      setPlace(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-xs text-slate-500 py-4">
          <Link to="/" className="hover:text-orange-500 transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/explore" className="hover:text-orange-500 transition-colors">Tour du lịch</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-800 font-semibold truncate max-w-xs">{place.name}</span>
        </nav>

        {/* Gallery Grid Matching Image 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Main Large Photo */}
          <div className="lg:col-span-2 aspect-[16/10] rounded-3xl overflow-hidden bg-slate-200 shadow-md">
            <img
              src={place.heroImage}
              alt={place.name}
              className="w-full h-full object-cover hover:scale-103 transition-transform duration-500"
            />
          </div>

          {/* 3 Smaller Right Photos Matching Image 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            {place.galleryImages.slice(1, 3).map((img, idx) => (
              <div key={idx} className="aspect-[16/9] rounded-2xl overflow-hidden bg-slate-200 shadow-sm">
                <img
                  src={img}
                  alt={`${place.name} preview ${idx}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
            {place.galleryImages[3] && (
              <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-slate-200 shadow-sm hidden lg:block">
                <img
                  src={place.galleryImages[3]}
                  alt={`${place.name} preview 3`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
          </div>
        </div>

        {/* Header Title & Badges Matching Image 2 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
              {place.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <RatingBadge
                rating={place.rating}
                reviewCount={place.reviewCount}
                showBayesianDetail={true}
                size="md"
              />
              <div className="flex items-center text-slate-500">
                <MapPin className="w-4 h-4 text-orange-500 mr-1" />
                <span>{place.province}</span>
              </div>
              <div className="flex items-center text-slate-500">
                <Clock className="w-4 h-4 text-slate-400 mr-1" />
                <span>{place.duration || '3 Ngày 2 Đêm'}</span>
              </div>
            </div>
          </div>

          {/* Action buttons (Share & Favorite) */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => toggleFavorite(place)}
              className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-full border text-sm font-semibold transition-colors ${
                favorited
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{favorited ? 'Đã lưu' : 'Lưu lại'}</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Đã sao chép liên kết chia sẻ vào khay nhớ tạm!');
              }}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Chia sẻ</span>
            </button>
          </div>
        </div>

        {/* Content Layout (Left Details + Right Sticky Booking Box) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column (Tabs & Details) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tabs Navigation Matching Image 2 */}
            <div className="flex items-center space-x-4 border-b border-slate-200 pb-2 overflow-x-auto text-sm font-bold">
              {[
                { id: 'overview', label: 'Tổng quan' },
                { id: 'itinerary', label: 'Lịch trình chi tiết' },
                { id: 'inclusions', label: 'Dịch vụ bao gồm' },
                { id: 'policies', label: 'Chính sách & huỷ' },
                { id: 'reviews', label: `Đánh giá (${reviews.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-2 whitespace-nowrap transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-orange-600 border-b-2 border-orange-500'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: Tổng quan (Overview) */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Tổng quan hành trình</h3>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                    {place.description || place.summary}
                  </p>
                </div>

                {/* Highlights */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Điểm nhấn nổi bật</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {place.highlights.map((h, i) => (
                      <div key={i} className="flex items-start space-x-2.5 p-3 rounded-xl bg-orange-50/60 border border-orange-100">
                        <Check className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-800">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Lịch trình (Itinerary with numbered milestone icons) */}
            {activeTab === 'itinerary' && (
              <div className="space-y-8">
                <h3 className="text-xl font-bold text-slate-900">Lịch trình chi tiết</h3>
                <div className="space-y-8 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200">
                  {place.itinerary && place.itinerary.length > 0 ? (
                    place.itinerary.map((step) => (
                      <div key={step.day} className="relative flex items-start space-x-6 pl-2">
                        {/* Number Badge */}
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 ring-4 ring-white z-10">
                          {step.day}
                        </div>
                        {/* Step Details */}
                        <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                          <h4 className="text-base font-bold text-slate-900">{step.title}</h4>
                          <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                          {step.image && (
                            <div className="aspect-[16/9] rounded-xl overflow-hidden mt-3 max-h-56">
                              <img src={step.image} alt={step.title} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm pl-8">Lịch trình chi tiết sẽ được gửi kèm hợp đồng du lịch.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Dịch vụ bao gồm (Inclusions) */}
            {activeTab === 'inclusions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Dịch vụ đã bao gồm</h3>
                  <div className="space-y-2.5">
                    {place.amenities.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3 text-sm text-slate-700">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Dịch vụ chưa bao gồm</h3>
                  <ul className="list-disc list-inside text-sm text-slate-500 space-y-1.5">
                    <li>Chi phí cá nhân ngoài chương trình (giặt là, đồ uống mini bar)</li>
                    <li>Tiền bồi dưỡng (tip) cho tài xế và hướng dẫn viên (tùy tâm)</li>
                    <li>Thuế VAT (nếu xuất hóa đơn đỏ công ty)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 4: Chính sách & huỷ (Policies) */}
            {activeTab === 'policies' && (
              <div className="space-y-6 text-sm text-slate-600 leading-relaxed">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Chính sách đặt & hủy tour</h3>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800">Quy định hoàn hủy:</h4>
                  <p>• Hủy trước 24 giờ so với ngày khởi hành: Miễn phí hoàn 100% tiền cọc.</p>
                  <p>• Hủy từ 12 đến 24 giờ trước khởi hành: Phí hoàn hủy 30% giá trị dịch vụ.</p>
                  <p>• Hủy dưới 12 giờ hoặc vắng mặt (No-show): Không hoàn tiền.</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800">Chính sách trẻ em:</h4>
                  <p>• Trẻ em dưới 2 tuổi: Miễn phí hoàn toàn.</p>
                  <p>• Trẻ em từ 2 - 11 tuổi: Tính 70% giá người lớn (ngủ chung phòng bố mẹ).</p>
                  <p>• Trẻ em từ 12 tuổi trở lên: Tính giá như người lớn.</p>
                </div>
              </div>
            )}

            {/* TAB 5: Đánh giá & Viết đánh giá (Reviews & Bayesian calculation) */}
            {activeTab === 'reviews' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Đánh giá từ khách hàng</h3>
                  <RatingBadge
                    rating={place.rating}
                    reviewCount={place.reviewCount}
                    showBayesianDetail={true}
                    size="md"
                  />
                </div>

                {reviewSuccessMsg && (
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm border border-emerald-200">
                    {reviewSuccessMsg}
                  </div>
                )}

                {/* New Review Form */}
                <form onSubmit={handleAddReview} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center">
                    <MessageSquare className="w-4 h-4 text-orange-500 mr-2" />
                    Để lại trải nghiệm thực tế của bạn
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Họ tên bạn</label>
                      <input
                        type="text"
                        required
                        value={newReviewerName}
                        onChange={(e) => setNewReviewerName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Đánh giá số sao</label>
                      <select
                        value={newReviewScore}
                        onChange={(e) => setNewReviewScore(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      >
                        <option value={5}>★★★★★ 5 Sao (Tuyệt vời)</option>
                        <option value={4}>★★★★☆ 4 Sao (Rất tốt)</option>
                        <option value={3}>★★★☆☆ 3 Sao (Bình thường)</option>
                        <option value={2}>★★☆☆☆ 2 Sao (Kém)</option>
                        <option value={1}>★☆☆☆☆ 1 Sao (Rất tệ)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nội dung đánh giá</label>
                    <textarea
                      rows={3}
                      required
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder="Chia sẻ cảm nhận về hướng dẫn viên, khách sạn, chất lượng phục vụ..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow transition-colors"
                  >
                    {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá & Cập nhật Bayesian'}
                  </button>
                </form>

                {/* Review List */}
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={rev.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                            alt={rev.userName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <h5 className="font-bold text-sm text-slate-900">{rev.userName}</h5>
                            <span className="text-[11px] text-slate-400">{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                        <div className="flex text-amber-400">
                          {[...Array(Math.round(rev.rating))].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Booking Sidebar Matching Image 2 */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
              {/* Unit Price */}
              <div>
                <span className="text-xs text-slate-400 block font-medium">Giá áp dụng</span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-black text-orange-600">
                    {formatCurrencyVND(unitPrice)}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">/ khách</span>
                </div>
              </div>

              {/* Booking Options */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center">
                    <Calendar className="w-3.5 h-3.5 text-orange-500 mr-1.5" />
                    Ngày khởi hành
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                {/* Counters for Adults & Children Matching Image 2 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-600 block mb-1">Người lớn</span>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="w-7 h-7 bg-white rounded-lg border border-slate-300 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-slate-800 text-sm">{adults}</span>
                      <button
                        type="button"
                        onClick={() => setAdults(adults + 1)}
                        className="w-7 h-7 bg-white rounded-lg border border-slate-300 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-600 block mb-1">Trẻ em (-30%)</span>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        className="w-7 h-7 bg-white rounded-lg border border-slate-300 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-slate-800 text-sm">{children}</span>
                      <button
                        type="button"
                        onClick={() => setChildren(children + 1)}
                        className="w-7 h-7 bg-white rounded-lg border border-slate-300 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Total Price Calculation Matching Image 2 */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Tổng cộng:</span>
                  <span className="text-2xl font-black text-slate-900">
                    {formatCurrencyVND(totalPrice)}
                  </span>
                </div>

                {/* Primary CTA Button (Vibrant Orange Matching Image 2) */}
                <button
                  onClick={handleBookingClick}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:scale-98 text-white font-extrabold rounded-2xl shadow-xl shadow-orange-500/25 transition-all duration-150 text-base flex items-center justify-center"
                >
                  Đặt tour ngay
                </button>

                {/* Guarantees Matching Image 2 */}
                <div className="space-y-2 text-xs text-slate-600 pt-2">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Bảo hiểm du lịch trọn gói 100.000.000đ</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Hủy miễn phí trước 24 giờ khởi hành</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tour tương tự (Similar Tours Grid Matching Image 2) */}
        <div className="mt-20 pt-12 border-t border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Tour & Trải nghiệm tương tự</h2>
              <p className="text-sm text-slate-500 mt-1">Khám phá thêm các hành trình hấp dẫn với mức giá ưu đãi</p>
            </div>
            <Link to="/explore" className="text-sm font-bold text-orange-600 hover:text-orange-700">
              Xem tất cả ➔
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {similarPlaces.map((sim, index) => (
              <Link
                key={sim.id}
                to={`/places/${sim.id}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-slate-100 flex flex-col"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={sim.heroImage}
                    alt={sim.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-teal-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase">
                    {index === 0 ? 'Trending' : 'Bán chạy'}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center text-xs text-amber-500 font-bold mb-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                      <span>{sim.rating.toFixed(1)}</span>
                      <span className="text-slate-400 font-normal ml-1">({sim.reviewCount})</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-orange-600 transition-colors">
                      {sim.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {sim.duration || '3 Ngày 2 Đêm'}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                    <span className="text-base font-black text-slate-900">{formatCurrencyVND(sim.priceFrom)}</span>
                    <span className="text-xs font-bold text-orange-600">Xem ngay ➔</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
