import React, { useState, useEffect } from 'react';
import { PlaceService } from '../services/placeService';
import { BookingService } from '../services/bookingService';
import { StatsService } from '../services/blogService';
import { Place, Booking } from '../types';
import { 
  ShieldCheck, 
  DollarSign, 
  Bookmark, 
  MapPin, 
  FileText, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  XCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { formatCurrencyVND } from '../utils/formatters';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'places' | 'bookings'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // New Place Form state
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceCategory, setNewPlaceCategory] = useState<'tour' | 'hotel' | 'restaurant'>('tour');
  const [newPlaceCity, setNewPlaceCity] = useState('Đà Nẵng');
  const [newPlacePrice, setNewPlacePrice] = useState(2500000);
  const [newPlaceImage, setNewPlaceImage] = useState('https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, placesRes, bookingsRes] = await Promise.all([
        StatsService.getDashboard(),
        PlaceService.getPlaces(),
        BookingService.getBookings(),
      ]);
      setStats(statsRes?.overview || {
        totalRevenue: 15700000,
        totalBookings: 2,
        totalPlaces: placesRes.length,
        totalBlogs: 3,
      });
      setPlaces(placesRes);
      setBookings(bookingsRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadData();
  }, []);

  const handleDeletePlace = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa địa điểm này?')) return;
    try {
      await PlaceService.deletePlace(id);
      setPlaces(places.filter((p) => p.id !== id));
      alert('Đã xóa địa điểm thành công!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      await BookingService.updateBookingStatus(id, status);
      setBookings(
        bookings.map((b) => (b.id === id ? { ...b, bookingStatus: status as any } : b))
      );
      alert('Cập nhật trạng thái đơn đặt thành công!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await PlaceService.createPlace({
        name: newPlaceName,
        category: newPlaceCategory,
        city: newPlaceCity,
        priceFrom: newPlacePrice,
        heroImage: newPlaceImage,
        summary: `Điểm đến nổi tiếng tại ${newPlaceCity} mang lại trải nghiệm đáng nhớ cho du khách.`,
      });
      setPlaces([created, ...places]);
      setShowAddPlaceModal(false);
      setNewPlaceName('');
      alert('Thêm địa điểm du lịch mới thành công!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-100/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-slate-200 gap-4">
          <div>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>HuGo Travel Management Portal</span>
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Bảng điều khiển Quản trị viên (Admin)
            </h1>
          </div>

          <button
            onClick={loadData}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-3 mb-8">
          {[
            { id: 'overview', label: 'Tổng quan báo cáo' },
            { id: 'places', label: `Quản lý địa điểm (${places.length})` },
            { id: 'bookings', label: `Quản lý đơn đặt (${bookings.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">Tổng doanh thu</span>
                  <span className="text-2xl font-black text-slate-900">
                    {formatCurrencyVND(stats?.totalRevenue || 15700000)}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">Tổng lượt đặt</span>
                  <span className="text-2xl font-black text-slate-900">{bookings.length}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Bookmark className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">Địa điểm & Tour</span>
                  <span className="text-2xl font-black text-slate-900">{places.length}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">Bài viết chia sẻ</span>
                  <span className="text-2xl font-black text-slate-900">{stats?.totalBlogs || 3}</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick overview table */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 text-lg mb-4">Đơn đặt dịch vụ mới nhất</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Mã đơn</th>
                      <th className="p-3">Khách hàng</th>
                      <th className="p-3">Dịch vụ</th>
                      <th className="p-3">Ngày khởi hành</th>
                      <th className="p-3">Tổng tiền</th>
                      <th className="p-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.slice(0, 5).map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">{b.bookingCode}</td>
                        <td className="p-3 font-medium text-slate-800">{b.customerName}</td>
                        <td className="p-3 text-slate-600">{b.serviceName}</td>
                        <td className="p-3 text-slate-600">{b.bookingDate}</td>
                        <td className="p-3 font-bold text-orange-600">{formatCurrencyVND(b.totalAmount)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            b.bookingStatus === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {b.bookingStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLACES MANAGEMENT */}
        {activeTab === 'places' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg">Danh sách Tour & Điểm đến</h3>
              <button
                onClick={() => setShowAddPlaceModal(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm địa điểm mới</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Tên địa điểm</th>
                    <th className="p-3">Phân loại</th>
                    <th className="p-3">Khu vực</th>
                    <th className="p-3">Đơn giá từ</th>
                    <th className="p-3">Điểm Bayesian</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {places.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800 flex items-center space-x-2">
                        <img src={p.heroImage} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        <span>{p.name}</span>
                      </td>
                      <td className="p-3 capitalize">{p.category}</td>
                      <td className="p-3">{p.city}</td>
                      <td className="p-3 font-bold text-slate-900">{formatCurrencyVND(p.priceFrom)}</td>
                      <td className="p-3 font-semibold text-emerald-600">★ {p.bayesianRating.toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeletePlace(p.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa địa điểm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: BOOKINGS MANAGEMENT */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 text-lg">Quản lý duyệt đơn đặt vé & dịch vụ</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Mã đơn</th>
                    <th className="p-3">Khách hàng</th>
                    <th className="p-3">Dịch vụ</th>
                    <th className="p-3">Ngày dùng</th>
                    <th className="p-3">Số khách</th>
                    <th className="p-3">Tổng thanh toán</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Chuyển trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{b.bookingCode}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{b.customerName}</div>
                        <div className="text-slate-400 text-[10px]">{b.customerPhone}</div>
                      </td>
                      <td className="p-3 text-slate-700 font-medium">{b.serviceName}</td>
                      <td className="p-3 text-slate-600">{b.bookingDate}</td>
                      <td className="p-3">{b.adultsCount} NL, {b.childrenCount} TE</td>
                      <td className="p-3 font-bold text-orange-600">{formatCurrencyVND(b.totalAmount)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          b.bookingStatus === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.bookingStatus === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.bookingStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'confirmed')}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-bold"
                        >
                          Xác nhận
                        </button>
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'cancelled')}
                          className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[11px] font-bold"
                        >
                          Hủy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Place */}
        {showAddPlaceModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Thêm điểm đến du lịch mới</h3>
              <form onSubmit={handleCreatePlace} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên địa điểm / Tour</label>
                  <input
                    type="text"
                    required
                    value={newPlaceName}
                    onChange={(e) => setNewPlaceName(e.target.value)}
                    placeholder="Tour tham quan Ninh Bình 2N1Đ"
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phân loại</label>
                    <select
                      value={newPlaceCategory}
                      onChange={(e) => setNewPlaceCategory(e.target.value as any)}
                      className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                    >
                      <option value="tour">Tour</option>
                      <option value="hotel">Khách sạn</option>
                      <option value="restaurant">Nhà hàng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Thành phố</label>
                    <input
                      type="text"
                      required
                      value={newPlaceCity}
                      onChange={(e) => setNewPlaceCity(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức giá khởi điểm</label>
                  <input
                    type="number"
                    required
                    value={newPlacePrice}
                    onChange={(e) => setNewPlacePrice(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">URL Hình ảnh</label>
                  <input
                    type="url"
                    required
                    value={newPlaceImage}
                    onChange={(e) => setNewPlaceImage(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPlaceModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow"
                  >
                    Tạo địa điểm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
