import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Portal } from './overlay';

export interface BoMenuItem {
  label: string;
  onClick?: () => void;
  to?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: 'danger';
  disabled?: boolean;
  title?: string;
}

export interface BoMenuProps {
  /** aria-label của nút mở menu */
  label: string;
  items: BoMenuItem[];
  /** Nội dung nút (mặc định icon ⋯). */
  buttonContent?: React.ReactNode;
  buttonClassName?: string;
  header?: React.ReactNode;
  wide?: boolean;
}

/** Menu nổi (position: fixed theo nút) để không bị cắt trong khung bảng cuộn ngang. */
export const BoMenu: React.FC<BoMenuProps> = ({ label, items, buttonContent, buttonClassName, header, wide }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number; up: boolean }>({ top: 0, right: 0, up: false });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const up = rect.bottom + 260 > window.innerHeight && rect.top > 260;
    setPos({ top: up ? rect.top - 4 : rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right), up });
  }, []);

  const close = useCallback((focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const onMenuKey = (event: React.KeyboardEvent) => {
    const list = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') || []);
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      list[(index + 1) % list.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      list[(index - 1 + list.length) % list.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      list[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      list[list.length - 1]?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const run = (item: BoMenuItem) => {
    if (item.disabled) return;
    close(!item.to && !item.href);
    item.onClick?.();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName || 'hgbo-btn hgbo-btn--ghost hgbo-btn--sm hgbo-btn--icon'}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {buttonContent || <MoreHorizontal aria-hidden="true" />}
      </button>
      {open && (
        <Portal>
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            className={`hgbo-menu ${wide ? 'hgbo-menu--wide' : ''}`.trim()}
            style={pos.up ? { bottom: window.innerHeight - pos.top, right: pos.right } : { top: pos.top, right: pos.right }}
            onKeyDown={onMenuKey}
            onClick={(event) => event.stopPropagation()}
          >
            {header}
            {items.map((item) => {
              const Icon = item.icon;
              const className = `hgbo-menu__item ${item.tone === 'danger' ? 'hgbo-menu__item--danger' : ''}`.trim();
              const content = (
                <>
                  {Icon && <Icon aria-hidden="true" />}
                  {item.label}
                </>
              );
              if (item.to && !item.disabled) {
                return (
                  <Link key={item.label} role="menuitem" className={className} to={item.to} title={item.title} onClick={() => run(item)}>
                    {content}
                  </Link>
                );
              }
              if (item.href && !item.disabled) {
                return (
                  <a key={item.label} role="menuitem" className={className} href={item.href} target="_blank" rel="noopener" title={item.title} onClick={() => run(item)}>
                    {content}
                  </a>
                );
              }
              return (
                <button key={item.label} type="button" role="menuitem" className={className} disabled={item.disabled} title={item.title} onClick={() => run(item)}>
                  {content}
                </button>
              );
            })}
          </div>
        </Portal>
      )}
    </>
  );
};
