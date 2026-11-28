import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { BookingModal } from '../components/common/BookingModal';
import { TelemetryConsent } from '../components/common/TelemetryConsent';
import '../styles/hg-shell.css';

export const MainLayout: React.FC = () => {
  return (
    <div className="hg-scope hg-app">
      <Navbar />
      <main className="hg-main">
        <Outlet />
      </main>
      <Footer />
      {/* Global Booking Modal */}
      <BookingModal />
      <TelemetryConsent />
    </div>
  );
};
