import React, { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const CustomerLayout=React.lazy(()=>import('../layouts/CustomerLayout').then(m=>({default:m.CustomerLayout})));
const AdminLayout=React.lazy(()=>import('../layouts/AdminLayout').then(m=>({default:m.AdminLayout})));
const PartnerLayout=React.lazy(()=>import('../layouts/PartnerLayout').then(m=>({default:m.PartnerLayout})));
const HomePage=React.lazy(()=>import('../pages/HomePage').then(m=>({default:m.HomePage})));
const ExplorePage=React.lazy(()=>import('../pages/ExplorePage').then(m=>({default:m.ExplorePage})));
const TicketsPage=React.lazy(()=>import('../pages/TicketsPage').then(m=>({default:m.TicketsPage})));
const HotelsPage=React.lazy(()=>import('../pages/HotelsPage').then(m=>({default:m.HotelsPage})));
const RestaurantsPage=React.lazy(()=>import('../pages/RestaurantsPage').then(m=>({default:m.RestaurantsPage})));
const PlaceDetailPage=React.lazy(()=>import('../pages/PlaceDetailPage').then(m=>({default:m.PlaceDetailPage})));
const ToursPage=React.lazy(()=>import('../pages/ToursPage').then(m=>({default:m.ToursPage})));
const TourDetailPage=React.lazy(()=>import('../pages/TourDetailPage').then(m=>({default:m.TourDetailPage})));
const TourPlannerPage=React.lazy(()=>import('../pages/TourPlannerPage').then(m=>({default:m.TourPlannerPage})));
const MyTripsPage=React.lazy(()=>import('../pages/MyTripsPage').then(m=>({default:m.MyTripsPage})));
const TripDetailPage=React.lazy(()=>import('../pages/TripDetailPage').then(m=>({default:m.TripDetailPage})));
const BlogPage=React.lazy(()=>import('../pages/BlogPage').then(m=>({default:m.BlogPage})));
const BlogDetailPage=React.lazy(()=>import('../pages/BlogDetailPage').then(m=>({default:m.BlogDetailPage})));
const BlogCreatePage=React.lazy(()=>import('../pages/BlogCreatePage').then(m=>({default:m.BlogCreatePage})));
const LoginPage=React.lazy(()=>import('../pages/LoginPage').then(m=>({default:m.LoginPage})));
const RegisterPage=React.lazy(()=>import('../pages/RegisterPage').then(m=>({default:m.RegisterPage})));
const ProfilePage=React.lazy(()=>import('../pages/ProfilePage').then(m=>({default:m.ProfilePage})));
const FavoritesPage=React.lazy(()=>import('../pages/FavoritesPage').then(m=>({default:m.FavoritesPage})));
const BookingsPage=React.lazy(()=>import('../pages/BookingsPage').then(m=>({default:m.BookingsPage})));
const BecomePartnerPage=React.lazy(()=>import('../pages/BecomePartnerPage').then(m=>({default:m.BecomePartnerPage})));
const ForbiddenPage=React.lazy(()=>import('../pages/ForbiddenPage').then(m=>({default:m.ForbiddenPage})));
const NotFoundPage=React.lazy(()=>import('../pages/NotFoundPage').then(m=>({default:m.NotFoundPage})));
const AdminDashboardPage=React.lazy(()=>import('../pages/admin/AdminDashboardPage').then(m=>({default:m.AdminDashboardPage})));
const PartnerApplicationsPage=React.lazy(()=>import('../pages/admin/PartnerApplicationsPage').then(m=>({default:m.PartnerApplicationsPage})));
const AdminSectionPage=React.lazy(()=>import('../pages/admin/AdminSectionPage').then(m=>({default:m.AdminSectionPage})));
const AdminModerationPage=React.lazy(()=>import('../pages/admin/AdminModerationPage').then(m=>({default:m.AdminModerationPage})));
const PartnerDashboardPage=React.lazy(()=>import('../pages/partner/PartnerDashboardPage').then(m=>({default:m.PartnerDashboardPage})));
const PartnerSectionPage=React.lazy(()=>import('../pages/partner/PartnerSectionPage').then(m=>({default:m.PartnerSectionPage})));
const PartnerResourceListPage=React.lazy(()=>import('../pages/partner/PartnerResourceListPage').then(m=>({default:m.PartnerResourceListPage})));
const PartnerResourceFormPage=React.lazy(()=>import('../pages/partner/PartnerResourceFormPage').then(m=>({default:m.PartnerResourceFormPage})));
const PartnerBookingsPage=React.lazy(()=>import('../pages/partner/PartnerBookingsPage').then(m=>({default:m.PartnerBookingsPage})));

const Loading=()=> <div className="grid min-h-[45vh] place-items-center text-sm font-bold text-slate-500">Đang tải module…</div>;

export const AppRouter:React.FC=()=> <Suspense fallback={<Loading/>}><Routes>
  <Route path="/" element={<CustomerLayout/>}>
    <Route index element={<HomePage/>}/><Route path="explore" element={<ExplorePage/>}/><Route path="tours" element={<ToursPage/>}/><Route path="tours/:id" element={<TourDetailPage/>}/><Route path="tour-planner" element={<TourPlannerPage/>}/><Route path="tickets" element={<TicketsPage/>}/><Route path="hotels" element={<HotelsPage/>}/><Route path="hotels/:id" element={<PlaceDetailPage/>}/><Route path="restaurants" element={<RestaurantsPage/>}/><Route path="restaurants/:id" element={<PlaceDetailPage/>}/><Route path="places/:id" element={<PlaceDetailPage/>}/><Route path="blog" element={<BlogPage/>}/><Route path="blog/create" element={<BlogCreatePage/>}/><Route path="blog/:id" element={<BlogDetailPage/>}/><Route path="login" element={<LoginPage/>}/><Route path="register" element={<RegisterPage/>}/><Route path="favorites" element={<FavoritesPage/>}/>
    <Route element={<ProtectedRoute roles={['CUSTOMER','PARTNER','SUPER_ADMIN']}/>}><Route path="my-trips" element={<MyTripsPage/>}/><Route path="my-trips/:id" element={<TripDetailPage/>}/><Route path="profile" element={<ProfilePage/>}/><Route path="bookings" element={<BookingsPage/>}/><Route path="become-partner" element={<BecomePartnerPage/>}/></Route>
    <Route path="*" element={<NotFoundPage/>}/>
  </Route>
  <Route element={<ProtectedRoute roles={['SUPER_ADMIN']}/>}><Route path="/admin" element={<AdminLayout/>}><Route index element={<AdminDashboardPage/>}/><Route path="partner-applications" element={<PartnerApplicationsPage/>}/><Route path="places" element={<AdminModerationPage/>}/><Route path="places/:id" element={<AdminModerationPage/>}/><Route path="tours" element={<AdminModerationPage/>}/><Route path="tours/:id" element={<AdminModerationPage/>}/><Route path="blogs" element={<AdminModerationPage/>}/><Route path="blogs/:id" element={<AdminModerationPage/>}/><Route path=":section" element={<AdminSectionPage/>}/></Route></Route>
  <Route element={<ProtectedRoute roles={['PARTNER']}/>}><Route path="/partner" element={<PartnerLayout/>}><Route index element={<PartnerDashboardPage/>}/><Route path="bookings" element={<PartnerBookingsPage/>}/><Route path="bookings/:id" element={<PartnerBookingsPage/>}/><Route path=":resource/new" element={<PartnerResourceFormPage/>}/><Route path=":resource/:id/edit" element={<PartnerResourceFormPage/>}/><Route path=":resource/:id" element={<PartnerResourceFormPage/>}/><Route path=":resource" element={<PartnerResourceListPage/>}/><Route path="workspace/:section" element={<PartnerSectionPage/>}/></Route></Route>
  <Route path="/403" element={<ForbiddenPage/>}/>
</Routes></Suspense>;
