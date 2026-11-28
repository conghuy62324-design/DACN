import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { Portal } from './overlay';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastInput {
  id: number;
}

type ToastFn = (input: ToastInput) => void;

const ToastContext = createContext<ToastFn | null>(null);

const ICON = { success: CircleCheck, error: CircleAlert, info: Info } as const;

const ToastView: React.FC<{ item: ToastItem; onClose: (id: number) => void }> = ({ item, onClose }) => {
  const Icon = ICON[item.tone];
  useEffect(() => {
    if (item.tone === 'error') return;
    const timer = window.setTimeout(() => onClose(item.id), 5000);
    return () => window.clearTimeout(timer);
  }, [item, onClose]);
  return (
    <div className={`hgbo-toast hgbo-toast--${item.tone}`}>
      <Icon aria-hidden="true" />
      <div className="hgbo-toast__msg">
        {item.message}
        {item.action && (
          <>
            {' '}
            <button type="button" className="hgbo-link" onClick={() => { item.action?.onClick(); onClose(item.id); }}>
              {item.action.label}
            </button>
          </>
        )}
      </div>
      <button type="button" className="hgbo-toast__close" aria-label="Đóng thông báo" onClick={() => onClose(item.id)}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const close = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastFn>((input) => {
    seq.current += 1;
    const id = seq.current;
    setItems((list) => [...list, { ...input, id }].slice(-3));
  }, []);
  const polite = useMemo(() => items.filter((t) => t.tone !== 'error'), [items]);
  const assertive = useMemo(() => items.filter((t) => t.tone === 'error'), [items]);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Portal>
        <div className="hgbo-toasts">
          <div aria-live="assertive" role="alert" className="hgbo-contents">
            {assertive.map((item) => (
              <ToastView key={item.id} item={item} onClose={close} />
            ))}
          </div>
          <div aria-live="polite" role="status" className="hgbo-contents">
            {polite.map((item) => (
              <ToastView key={item.id} item={item} onClose={close} />
            ))}
          </div>
        </div>
      </Portal>
    </ToastContext.Provider>
  );
};

/** toast({tone, message, action?}). Ngoài provider: chỉ ghi console, không lỗi. */
export function useToast(): { toast: ToastFn } {
  const ctx = useContext(ToastContext);
  return useMemo(() => ({ toast: ctx || ((input: ToastInput) => console.info('[toast]', input.tone, input.message)) }), [ctx]);
}
