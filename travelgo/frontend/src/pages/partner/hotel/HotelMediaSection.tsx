// Hình ảnh khách sạn: hàng chờ tải nhiều ảnh (tải lần lượt, mỗi ảnh xong mới lấy revision mới),
// thư viện lọc theo khách sạn / từng hạng phòng, đặt ảnh bìa, sửa alt, sắp xếp, lưu trữ.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Images, Trash2, Upload, X } from 'lucide-react';
import {
  Alert,
  BoButton,
  BoMenu,
  BoTabs,
  ConfirmDialog,
  EmptyState,
  ImageDropzone,
  StatusPill,
  TextField,
  errorMessage,
} from '../../../components/backoffice';
import { MediaPicture, SectionProps } from './shared';

const RIGHTS: Record<string, string> = {
  PARTNER_CONFIRMED: 'Tôi có quyền sử dụng',
  OWNED: 'Ảnh do tôi sở hữu',
  UNVERIFIED: 'Chưa xác minh quyền',
};

type QueueItem = {
  id: string;
  file: File;
  url: string;
  roomTypeId: string;
  altText: string;
  rights: string;
  state: 'waiting' | 'uploading' | 'done' | 'error';
  message?: string;
};

type UploadFn = (file: File, meta: { rights: string; altText: string; roomTypeId?: string }) => Promise<void>;

const STATE_LABEL: Record<QueueItem['state'], string> = { waiting: 'Chờ tải', uploading: 'Đang tải…', done: 'Xong', error: 'Lỗi' };

let seq = 0;

/** Hàng chờ tải lên (partner). */
const UploadQueue: React.FC<{ s: any; upload: UploadFn }> = ({ s, upload }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const patch = (id: string, value: Partial<QueueItem>) => setQueue((list) => list.map((item) => (item.id === id ? { ...item, ...value } : item)));
  const pending = queue.filter((item) => item.state === 'waiting' || item.state === 'error');
  const ready = pending.length > 0 && pending.every((item) => item.altText.trim());

  const add = (files: File[]) => {
    const items = files.map<QueueItem>((file) => {
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      seq += 1;
      return { id: `q${seq}`, file, url, roomTypeId: '', altText: '', rights: 'PARTNER_CONFIRMED', state: 'waiting' };
    });
    setQueue((list) => [...list, ...items]);
  };

  const run = async () => {
    setRunning(true);
    for (const item of pending) {
      patch(item.id, { state: 'uploading', message: undefined });
      try {
        await upload(item.file, { rights: item.rights, altText: item.altText.trim(), roomTypeId: item.roomTypeId || undefined });
        patch(item.id, { state: 'done' });
      } catch (e: any) {
        patch(item.id, { state: 'error', message: e?.message || e?.error?.message || 'Không tải được ảnh.' });
      }
    }
    setRunning(false);
  };

  return (
    <section className="hgbo-card hgbo-stack hgbo-stack--sm">
      <h2 className="hgbo-section-title">Tải ảnh lên</h2>
      <ImageDropzone
        accept="image/jpeg,image/png,image/webp"
        maxBytes={10 * 1024 * 1024}
        multiple
        disabled={running}
        hint="JPEG, PNG hoặc WebP, tối đa 10 MiB mỗi ảnh. Chỉ tải ảnh bạn có quyền sử dụng."
        onFiles={add}
      />
      {queue.length > 0 && (
        <>
          <ul className="hgp-queue" aria-label="Hàng chờ tải lên">
            {queue.map((item) => (
              <li key={item.id} className={`hgp-queue__row is-${item.state}`}>
                <img src={item.url} alt="" className="hgp-queue__thumb" />
                <div className="hgp-queue__fields">
                  <p className="hgp-queue__name" title={item.file.name}>{item.file.name}</p>
                  <div className="hgp-queue__grid">
                    <div className="hgbo-field">
                      <label className="hgbo-field__label" htmlFor={`${item.id}-room`}>Ảnh thuộc</label>
                      <select
                        id={`${item.id}-room`}
                        className="hgbo-select"
                        value={item.roomTypeId}
                        disabled={item.state === 'uploading' || item.state === 'done'}
                        onChange={(event) => patch(item.id, { roomTypeId: event.target.value })}
                      >
                        <option value="">Khách sạn</option>
                        {s.rooms.map((r: any) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <TextField
                      label="Mô tả ảnh (alt)"
                      required
                      maxLength={500}
                      value={item.altText}
                      disabled={item.state === 'uploading' || item.state === 'done'}
                      onChange={(x) => patch(item.id, { altText: x })}
                    />
                    <div className="hgbo-field">
                      <label className="hgbo-field__label" htmlFor={`${item.id}-rights`}>Quyền sử dụng</label>
                      <select
                        id={`${item.id}-rights`}
                        className="hgbo-select"
                        value={item.rights}
                        disabled={item.state === 'uploading' || item.state === 'done'}
                        onChange={(event) => patch(item.id, { rights: event.target.value })}
                      >
                        <option value="PARTNER_CONFIRMED">Tôi có quyền sử dụng</option>
                        <option value="OWNED">Ảnh do tôi sở hữu</option>
                      </select>
                    </div>
                  </div>
                  {item.message && <p className="hgbo-field__error" role="alert">{item.message}</p>}
                </div>
                <div className="hgp-queue__side">
                  <span className={`hgp-queue__state is-${item.state}`}>
                    {item.state === 'done' && <Check aria-hidden="true" />}
                    {STATE_LABEL[item.state]}
                  </span>
                  {item.state !== 'uploading' && (
                    <BoButton
                      variant="ghost"
                      size="sm"
                      icon={X}
                      aria-label={`Bỏ ${item.file.name} khỏi hàng chờ`}
                      disabled={running}
                      onClick={() => setQueue((list) => list.filter((x) => x.id !== item.id))}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="hgbo-row">
            <BoButton variant="primary" icon={Upload} loading={running} disabled={!ready} onClick={run}>
              Tải lên {pending.length} ảnh
            </BoButton>
            {!ready && pending.length > 0 && <span className="hgbo-small hgbo-muted">Nhập mô tả ảnh (alt) cho mọi ảnh trước khi tải.</span>}
            {queue.some((x) => x.state === 'done') && !running && (
              <BoButton variant="ghost" size="sm" onClick={() => setQueue((list) => list.filter((x) => x.state !== 'done'))}>
                Xóa các ảnh đã xong khỏi hàng chờ
              </BoButton>
            )}
          </div>
        </>
      )}
    </section>
  );
};

type Dialog =
  | { kind: 'alt'; media: any }
  | { kind: 'archive'; media: any }
  | { kind: 'review'; media: any; decision: 'APPROVED' | 'REJECTED' }
  | null;

export const HotelMediaSection: React.FC<SectionProps & { upload?: UploadFn }> = ({ s, write, admin, upload }) => {
  const [filter, setFilter] = useState('all');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [alt, setAlt] = useState('');
  const [moving, setMoving] = useState('');
  const [moveError, setMoveError] = useState('');

  const groupOf = (m: any) => m.roomTypeId || '';
  const shown = useMemo(() => {
    const list = s.media.filter((m: any) => filter === 'all' || (filter === 'hotel' ? !m.roomTypeId : m.roomTypeId === filter));
    return [...list].sort((a: any, b: any) => (groupOf(a) === groupOf(b) ? a.position - b.position : 0));
  }, [s.media, filter]);

  const coverIds = useMemo(() => {
    const best: Record<string, any> = {};
    for (const m of s.media) {
      const g = groupOf(m);
      if (!best[g] || m.position < best[g].position) best[g] = m;
    }
    return new Set(Object.values(best).map((m: any) => m.id));
  }, [s.media]);

  const sameGroup = (m: any) => [...s.media].filter((x: any) => groupOf(x) === groupOf(m)).sort((a: any, b: any) => a.position - b.position);

  /** Đổi chỗ với ảnh liền kề trong cùng nhóm: 2 lần PUT {position}, mỗi lần dùng revision mới. */
  const move = async (m: any, dir: -1 | 1) => {
    const list = sameGroup(m);
    const index = list.findIndex((x: any) => x.id === m.id);
    const other = list[index + dir];
    if (!other) return;
    setMoving(m.id);
    setMoveError('');
    try {
      if (other.position === m.position) {
        await write('media/' + m.id, 'put', { position: Math.min(29, Math.max(0, m.position + dir)) });
      } else {
        await write('media/' + m.id, 'put', { position: other.position });
        await write('media/' + other.id, 'put', { position: m.position });
      }
    } catch (e) {
      setMoveError(errorMessage(e, 'Không đổi được thứ tự ảnh.'));
    } finally {
      setMoving('');
    }
  };

  const tabs = [
    { key: 'all', label: 'Tất cả', badge: s.media.length },
    { key: 'hotel', label: 'Khách sạn', badge: s.media.filter((m: any) => !m.roomTypeId).length },
    ...s.rooms.map((r: any) => ({ key: r.id, label: r.name, badge: s.media.filter((m: any) => m.roomTypeId === r.id).length })),
  ];

  const roomName = (id: string | null) => (id ? s.rooms.find((r: any) => r.id === id)?.name || 'Hạng phòng' : 'Khách sạn');

  return (
    <div className="hgbo-stack">
      {!admin && upload && <UploadQueue s={s} upload={upload} />}
      <section className="hgbo-stack hgbo-stack--sm">
        <div className="hgbo-section-head">
          <h2 className="hgbo-section-title">Thư viện ảnh</h2>
          {!admin && <span className="hgbo-small hgbo-muted">Ảnh đầu tiên của mỗi nhóm là ảnh bìa. Ảnh phòng không trộn với ảnh khách sạn.</span>}
        </div>
        <BoTabs items={tabs} value={filter} onChange={setFilter} label="Lọc ảnh theo nhóm" />
        {moveError && <Alert tone="danger">{moveError}</Alert>}
        {shown.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Chưa có ảnh"
            description="Ảnh rõ nét giúp khách quyết định nhanh hơn. Chỉ tải ảnh bạn có quyền sử dụng."
          />
        ) : (
          <ul className="hgp-media" aria-label="Ảnh khách sạn">
            {shown.map((m: any) => {
              const group = sameGroup(m);
              const index = group.findIndex((x: any) => x.id === m.id);
              const name = m.altText || 'ảnh';
              return (
                <li key={m.id} className="hgp-media__card">
                  <div className="hgp-media__frame">
                    <MediaPicture hotelId={s.identity.id} media={m} admin={admin} />
                    {coverIds.has(m.id) && <span className="hgp-media__cover">Ảnh bìa</span>}
                  </div>
                  <div className="hgp-media__body">
                    <div className="hgp-media__top">
                      <StatusPill status={m.status} domain="media" size="sm" />
                      {!admin && (
                        <BoMenu
                          label={`Thao tác cho ${name}`}
                          items={[
                            { label: 'Đặt làm ảnh bìa', disabled: coverIds.has(m.id), onClick: () => write('media/' + m.id, 'put', { position: 0 }).catch(() => {}) },
                            { label: 'Sửa mô tả', onClick: () => { setAlt(m.altText || ''); setDialog({ kind: 'alt', media: m }); } },
                            { label: 'Lưu trữ ảnh', icon: Trash2, tone: 'danger', onClick: () => setDialog({ kind: 'archive', media: m }) },
                          ]}
                        />
                      )}
                    </div>
                    <p className="hgp-media__alt hgbo-clamp2">{m.altText || 'Chưa có mô tả ảnh'}</p>
                    <p className="hgp-media__meta">{roomName(m.roomTypeId)} · Quyền: {RIGHTS[m.rights] || m.rights}</p>
                    {admin ? (
                      <div className="hgbo-row">
                        <BoButton size="sm" variant="primary" onClick={() => setDialog({ kind: 'review', media: m, decision: 'APPROVED' })}>Duyệt ảnh</BoButton>
                        <BoButton size="sm" variant="secondary" onClick={() => setDialog({ kind: 'review', media: m, decision: 'REJECTED' })}>Từ chối ảnh</BoButton>
                      </div>
                    ) : (
                      <div className="hgbo-row hgp-media__order">
                        <BoButton
                          size="sm"
                          variant="ghost"
                          icon={ArrowLeft}
                          aria-label={`Đưa ${name} lên trước`}
                          disabled={index <= 0 || !!moving}
                          loading={moving === m.id}
                          onClick={() => move(m, -1)}
                        />
                        <BoButton
                          size="sm"
                          variant="ghost"
                          icon={ArrowRight}
                          aria-label={`Đưa ${name} ra sau`}
                          disabled={index >= group.length - 1 || !!moving}
                          onClick={() => move(m, 1)}
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <ConfirmDialog
        open={dialog?.kind === 'alt'}
        title="Sửa mô tả ảnh"
        confirmLabel="Lưu mô tả"
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          if (!alt.trim()) throw new Error('Nhập mô tả ảnh.');
          await write('media/' + dialog!.media.id, 'put', { altText: alt.trim() });
        }}
      >
        <TextField label="Mô tả ảnh (alt)" required maxLength={500} counter value={alt} onChange={setAlt} />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog?.kind === 'archive'}
        title="Lưu trữ ảnh"
        tone="danger"
        description="Ảnh sẽ không còn hiển thị. Ảnh không bị xóa khỏi hệ thống."
        confirmLabel="Lưu trữ ảnh"
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          await write('media/' + dialog!.media.id, 'put', { archive: true });
        }}
      />
      <ConfirmDialog
        open={dialog?.kind === 'review'}
        title={dialog?.kind === 'review' && dialog.decision === 'APPROVED' ? 'Duyệt ảnh' : 'Từ chối ảnh'}
        tone={dialog?.kind === 'review' && dialog.decision === 'REJECTED' ? 'danger' : 'default'}
        confirmLabel={dialog?.kind === 'review' && dialog.decision === 'APPROVED' ? 'Duyệt ảnh' : 'Từ chối ảnh'}
        reason={{ required: true, label: 'Lý do kiểm duyệt ảnh', max: 1000 }}
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          if (dialog?.kind !== 'review') return;
          await write('media/' + dialog.media.id + '/review', 'post', { decision: dialog.decision, reason });
        }}
      />
    </div>
  );
};
