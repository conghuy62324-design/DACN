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
