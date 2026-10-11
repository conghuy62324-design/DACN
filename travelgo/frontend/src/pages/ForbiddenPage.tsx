import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
export const ForbiddenPage: React.FC = () => <div className="min-h-screen grid place-items-center bg-slate-950 px-4 text-white"><div className="max-w-lg text-center"><ShieldX className="mx-auto h-16 w-16 text-rose-400" /><p className="mt-5 text-sm font-bold tracking-[0.3em] text-rose-300">403 · FORBIDDEN</p><h1 className="mt-3 text-4xl font-black">Bạn không có quyền truy cập</h1><p className="mt-4 text-slate-400">Tài khoản hiện tại chưa được cấp vai trò phù hợp cho khu vực này.</p><Link to="/" className="mt-7 inline-block rounded-xl bg-white px-5 py-3 font-bold text-slate-900">Quay về HuGo Travel</Link></div></div>;
