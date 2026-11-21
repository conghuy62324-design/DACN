import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Hạ tầng cho lớp phủ (drawer, dialog, sheet, menu): portal, focus trap theo ngăn xếp, khóa cuộn trang.

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const trapStack: symbol[] = [];

export function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0 || el === document.activeElement);
}

/**
 * Giữ focus trong `ref` khi `active`. Esc gọi `onEscape` (chỉ lớp trên cùng xử lý).
 * Khi tắt: trả focus về phần tử đã có focus trước đó (hoặc `returnFocus`).
 */
export function useFocusTrap(
  active: boolean,
  ref: React.RefObject<HTMLElement>,
  onEscape?: () => void,
  options: { initialFocus?: React.RefObject<HTMLElement>; returnFocus?: React.RefObject<HTMLElement> } = {},
) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;
  const { initialFocus, returnFocus } = options;

  useEffect(() => {
    if (!active) return;
    const id = Symbol('trap');
    trapStack.push(id);
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusFirst = () => {
      if (!node) return;
      const target = initialFocus?.current || focusables(node)[0] || node;
      target.focus({ preventScroll: true });
    };
    const timer = window.setTimeout(focusFirst, 0);
    const onKey = (event: KeyboardEvent) => {
      if (trapStack[trapStack.length - 1] !== id || !node) return;
      if (event.key === 'Escape') {
        if (escapeRef.current) {
          event.stopPropagation();
          escapeRef.current();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables(node);
      if (!items.length) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (current === first || !node.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !node.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      const index = trapStack.indexOf(id);
      if (index >= 0) trapStack.splice(index, 1);
      const back = returnFocus?.current || previous;
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

let lockCount = 0;
let savedOverflow = '';

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = savedOverflow;
    };
  }, [active]);
}

export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="hgbo-portal">
      {children}
    </div>,
    document.body,
  );
};
