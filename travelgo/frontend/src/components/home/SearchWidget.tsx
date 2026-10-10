import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, Compass, ChevronDown } from 'lucide-react';

export const SearchWidget: React.FC = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('2 người');
  const [category, setCategory] = useState('tour');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (destination) query.set('search', destination);
    if (category && category !== 'all') query.set('category', category);
    navigate(`/explore?${query.toString()}`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Search Container Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-4 sm:p-6 border border-white/40">
        {/* Category Tabs & Smart Planner CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto">
            {[
              { id: 'tour', label: 'Tour trọn gói' },
              { id: 'attraction', label: 'Vé tham quan' },
              { id: 'hotel', label: 'Khách sạn' },
              { id: 'restaurant', label: 'Nhà hàng ẩm thực' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  category === tab.id
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/tour-planner')}
            className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Tạo lịch trình AI (Planner)</span>
          </button>
        </div>


        {/* Inputs Grid */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Destination */}
          <div className="relative border border-slate-200 rounded-2xl p-3 hover:border-orange-400 focus-within:border-orange-500 transition-colors bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Điểm đến
            </label>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Đà Nẵng, Phú Quốc, Sapa..."
                className="w-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Departure Date */}
          <div className="relative border border-slate-200 rounded-2xl p-3 hover:border-orange-400 focus-within:border-orange-500 transition-colors bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Ngày khởi hành
            </label>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm font-semibold text-slate-800 outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Guests */}
          <div className="relative border border-slate-200 rounded-2xl p-3 hover:border-orange-400 focus-within:border-orange-500 transition-colors bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Số người
            </label>
            <div className="flex items-center">
              <Users className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
              <select
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full text-sm font-semibold text-slate-800 outline-none bg-transparent cursor-pointer"
              >
                <option value="1 người">1 Người lớn</option>
                <option value="2 người">2 Người lớn (1 phòng)</option>
                <option value="3 người">3 Người lớn</option>
                <option value="4+ người">Gia đình (4+ người)</option>
              </select>
            </div>
          </div>

          {/* Search Button */}
          <div>
            <button
              type="submit"
              className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-white font-extrabold rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-center space-x-2 transition-all duration-200 text-base"
            >
              <Search className="w-5 h-5" />
              <span>Tìm kiếm</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
