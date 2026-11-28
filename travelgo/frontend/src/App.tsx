import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { BookingProvider } from './context/BookingContext';
import { AppRouter } from './router/AppRouter';
import { TelemetryProvider } from './context/TelemetryContext';

export function App() {
  return (
    <BrowserRouter>
      {import.meta.env.VITE_ISOLATED_WEB_PREVIEW === 'true' && <div role="status" style={{background:'#fff4d6',color:'#594419',padding:'8px 16px',textAlign:'center',fontSize:14}}>SYNTHETIC · Bản xem thử cô lập · Chỉ đọc · Không nhận đặt phòng hoặc thanh toán thật.</div>}
      <AuthProvider>
        <TelemetryProvider>
          <FavoritesProvider>
            <BookingProvider>
              <AppRouter />
            </BookingProvider>
          </FavoritesProvider>
        </TelemetryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
