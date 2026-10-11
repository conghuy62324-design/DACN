import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Mail, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const signedInUser = await login(email, password);
      const fallback = signedInUser.roles.includes('SUPER_ADMIN')
        ? '/admin'
        : signedInUser.roles.includes('PARTNER')
          ? '/partner'
          : '/';
      const requestedDestination = (location.state as { from?: string } | null)?.from;
      const destination = requestedDestination?.startsWith('/') && !requestedDestination.startsWith('//') && !requestedDestination.includes('\\')
        ? requestedDestination
        : fallback;
      navigate(destination, { replace: true });
    } catch (requestError: any) {
      setError(requestError?.message || 'Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-orange-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Compass className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Đăng nhập HuGo Travel</h1>
          <p className="text-xs text-slate-500">
            Truy cập để quản lý đơn đặt vé, danh sách yêu thích và điểm thưởng
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hugotravel.vn"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/25 transition-all text-sm"
          >
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập ngay'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-orange-600 font-bold hover:underline">
            Đăng ký thành viên mới
          </Link>
        </div>
      </div>
    </div>
  );
};
