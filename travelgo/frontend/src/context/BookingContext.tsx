import React, { createContext, useContext, useState } from 'react';
import { BookingService } from '../services/bookingService';
import { Booking } from '../types';

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
}

const BookingContext = createContext<BookingContextType>({
  isOpen: false,
  modalData: null,
  openBooking: () => {},
  closeBooking: () => {},
  confirmedBooking: null,
  setConfirmedBooking: () => {},
});

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState<BookingModalData | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const openBooking = (data: BookingModalData) => {
    setModalData(data);
    setIsOpen(true);
  };

  const closeBooking = () => {
    setIsOpen(false);
    setModalData(null);
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
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);
