// Drawer sửa thực thể gắn với URL (?edit=<id>|new). Đóng khi còn thay đổi chưa lưu thì hỏi lại.
import React, { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog, DetailDrawer, StatusDomain } from '../../../components/backoffice';

export function useEditParam(key = 'edit') {
  const [params, setParams] = useSearchParams();
  const value = params.get(key);
  const open = useCallback((id: string) => setParams((current) => {
    const next = new URLSearchParams(current);
    next.set(key, id);
    return next;
  }), [key, setParams]);
  const close = useCallback(() => setParams((current) => {
    const next = new URLSearchParams(current);
    next.delete(key);
    return next;
  }), [key, setParams]);
  return { value, open, close };
}

interface Props {
  open: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: string;
  statusDomain?: StatusDomain;
  width?: 'sm' | 'md' | 'lg';
  onClose: () => void;
  /** children nhận hàm báo dirty để chặn đóng nhầm. */
  children: (setDirty: (dirty: boolean) => void) => React.ReactNode;
}

export const EditDrawer: React.FC<Props> = ({ open, title, subtitle, status, statusDomain, width = 'lg', onClose, children }) => {
  const dirty = useRef(false);
  const [asking, setAsking] = useState(false);
  const setDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);
  const tryClose = () => {
    if (dirty.current) setAsking(true);
    else onClose();
  };
  return (
    <>
      <DetailDrawer
        open={open}
        title={title}
        subtitle={subtitle}
        status={status}
        statusDomain={statusDomain}
        width={width}
        onClose={tryClose}
      >
        {open && children(setDirty)}
      </DetailDrawer>
      <ConfirmDialog
        open={asking}
        title="Bỏ thay đổi chưa lưu?"
        description="Các thay đổi trong biểu mẫu này sẽ mất."
        tone="danger"
        confirmLabel="Bỏ thay đổi"
        cancelLabel="Tiếp tục sửa"
        onClose={() => setAsking(false)}
        onConfirm={() => {
          dirty.current = false;
          onClose();
        }}
      />
    </>
  );
};
