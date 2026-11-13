import React, { createContext, useContext, useState } from 'react';
import { Booking } from '../types';
import { useAuth } from './AuthContext';
import { clearBookingIntent, readBookingIntent } from '../utils/bookingIntentStorage';

export interface BookingModalData {
  serviceType: 'tour' | 'hotel' | 'restaurant' | 'ticket';
  serviceId: string;
  serviceName: string;
  unitPrice: number;
  initialDate?: string;
  imageUrl?: string;
  recommendationRequestId?: string;
}

interface BookingContextType {
  isOpen: boolean;
  modalData: BookingModalData | null;
  openBooking: (data: BookingModalData) => void;
  closeBooking: () => void;
  confirmedBooking: Booking | null;
  setConfirmedBooking: (b: Booking | null) => void;
  intentVersion: number;
  setPendingAttempt: (pending: boolean) => void;
  startNewBooking: () => void;
}

const BookingContext = createContext<BookingContextType>({
  isOpen: false,
  modalData: null,
  openBooking: () => {},
  closeBooking: () => {},
  confirmedBooking: null,
  setConfirmedBooking: () => {},
  intentVersion: 0,
  setPendingAttempt: () => {},
  startNewBooking: () => {},
});

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState<BookingModalData | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [intentVersion, setIntentVersion] = useState(0);
  const pendingAttempt = React.useRef(false);
  const setPendingAttempt = (pending: boolean) => {
    pendingAttempt.current = pending;
    if (!pending) clearBookingIntent(user?.id);
  };
  React.useEffect(() => {
    const stored = readBookingIntent(user?.id);
    pendingAttempt.current = !!stored;
    setIsOpen(false); setConfirmedBooking(null); setModalData(stored?.modalData ?? null);
    setIntentVersion(v => v + 1);
  }, [user?.id]);

  const openBooking = (data: BookingModalData) => {
    // An unresolved request belongs to the existing intent, even if another
    // catalog card is clicked while the modal is hidden.
    if (pendingAttempt.current && !confirmedBooking) { setIsOpen(true); return; }
    setConfirmedBooking(null);
    pendingAttempt.current = false;
    setIntentVersion(v => v + 1);
    setModalData(data);
    setIsOpen(true);
  };

  const closeBooking = () => {
    setIsOpen(false);
  };

  const startNewBooking = () => {
    pendingAttempt.current = false;
    clearBookingIntent(user?.id);
    setConfirmedBooking(null);
    setIntentVersion(v => v + 1);
  };

  return (
    <BookingContext.Provider
      value={{
        isOpen,
        modalData,
        openBooking,
        closeBooking,
        confirmedBooking,
        setConfirmedBooking,
        intentVersion,
        setPendingAttempt,
        startNewBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);
