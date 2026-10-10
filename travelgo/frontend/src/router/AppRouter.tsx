import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { HomePage } from '../pages/HomePage';
import { ExplorePage } from '../pages/ExplorePage';
import { TicketsPage } from '../pages/TicketsPage';
import { HotelsPage } from '../pages/HotelsPage';
import { RestaurantsPage } from '../pages/RestaurantsPage';
import { PlaceDetailPage } from '../pages/PlaceDetailPage';
import { ToursPage } from '../pages/ToursPage';
import { TourDetailPage } from '../pages/TourDetailPage';
import { TourPlannerPage } from '../pages/TourPlannerPage';
import { MyTripsPage } from '../pages/MyTripsPage';
import { TripDetailPage } from '../pages/TripDetailPage';
import { BlogPage } from '../pages/BlogPage';
import { BlogDetailPage } from '../pages/BlogDetailPage';
import { BlogCreatePage } from '../pages/BlogCreatePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ProfilePage } from '../pages/ProfilePage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { BookingsPage } from '../pages/BookingsPage';
import { AdminPage } from '../pages/AdminPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="tours" element={<ToursPage />} />
        <Route path="tours/:id" element={<TourDetailPage />} />
        <Route path="tour-planner" element={<TourPlannerPage />} />
        <Route path="my-trips" element={<MyTripsPage />} />
        <Route path="my-trips/:id" element={<TripDetailPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="hotels" element={<HotelsPage />} />
        <Route path="hotels/:id" element={<PlaceDetailPage />} />
        <Route path="restaurants" element={<RestaurantsPage />} />
        <Route path="restaurants/:id" element={<PlaceDetailPage />} />
        <Route path="places/:id" element={<PlaceDetailPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="blog/:id" element={<BlogDetailPage />} />
        <Route path="blog/create" element={<BlogCreatePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

