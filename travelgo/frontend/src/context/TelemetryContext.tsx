import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { TelemetryApi, TelemetryConsentState, TelemetryEventInput } from '../services/telemetryService';

interface TelemetryContextValue {
  consent: TelemetryConsentState;
  loading: boolean;
  track: (input: TelemetryEventInput) => Promise<void>;
  updateConsent: (analyticsEnabled: boolean, personalizationEnabled: boolean, deleteExistingEvents?: boolean) => Promise<void>;
}

const defaultConsent: TelemetryConsentState = {
  hasDecision: false, analyticsEnabled: false, personalizationEnabled: false, policyVersion: '1.0', retentionDays: 90,
};
const TelemetryContext = createContext<TelemetryContextValue | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [consent, setConsent] = useState(defaultConsent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setConsent(defaultConsent);
      setLoading(false);
      return;
    }
    setLoading(true);
    TelemetryApi.getConsent().then(setConsent).catch(() => setConsent(defaultConsent)).finally(() => setLoading(false));
  }, [user?.id, authLoading]);

  const updateConsent = useCallback(async (analyticsEnabled: boolean, personalizationEnabled: boolean, deleteExistingEvents = false) => {
    const next = await TelemetryApi.updateConsent({ analyticsEnabled, personalizationEnabled, deleteExistingEvents });
    setConsent(next);
  }, []);

  const track = useCallback(async (input: TelemetryEventInput) => {
    if (!user || !consent.analyticsEnabled) return;
    try { await TelemetryApi.track(input); } catch (error) { console.warn('Telemetry event was not recorded', error); }
  }, [user, consent.analyticsEnabled]);

  const value = useMemo(() => ({ consent, loading, track, updateConsent }), [consent, loading, track, updateConsent]);
  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
};

export function useTelemetry(): TelemetryContextValue {
  const value = useContext(TelemetryContext);
  if (!value) throw new Error('useTelemetry phải nằm trong TelemetryProvider');
  return value;
}
