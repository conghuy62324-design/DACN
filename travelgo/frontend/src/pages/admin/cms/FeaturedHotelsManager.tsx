import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Hotel, ImageOff, Plus, X } from 'lucide-react';
import { AdminBackofficeService } from '../../../services/adminBackofficeService';
import {
  Alert,
  BoButton,
  ConflictBanner,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusPill,
  errorCode,
  errorMessage,
  isConflictError,
  useToast,
} from '../../../components/backoffice';
import { HotelPickerDialog, PickedHotel } from './HotelPickerDialog';

interface Featured {
  placeId: string;
  name: string | null;
  status?: string | null;
  eligible?: boolean;
  image?: string;
}

const MAX = 12;

export const FeaturedHotelsManager: React.FC = () => {
  const { toast } = useToast();
  const [server, setServer] = useState<Featured[]>([]);
  const [list, setList] = useState<Featured[]>([]);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [rejected, setRejected] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [picker, setPicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setConflict(false);
    try {
      const result = await AdminBackofficeService.featuredHotels();
      const items = [...(result.items || [])].sort((a: any, b: any) => a.position - b.position);
      setServer(items);
      setList(items);
      setVersion(result.version);
      setRejected([]);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải khách sạn nổi bật.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = list.map((h) => h.placeId).join(',') !== server.map((h) => h.placeId).join(',');

  const move = (index: number, delta: number) => setList((items) => {
    const next = items.slice();
    const target = index + delta;
    if (target < 0 || target >= next.length) return items;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const add = (hotels: PickedHotel[]) => setList((items) => [
    ...items,
    ...hotels.filter((h) => !items.some((x) => x.placeId === h.placeId)).map((h) => ({ placeId: h.placeId, name: h.name, image: h.image, status: null })),
  ].slice(0, MAX));

  const save = async () => {
    setSaving(true);
    setSaveError('');
    setRejected([]);
    try {
      await AdminBackofficeService.saveFeaturedHotels(list.map((h) => h.placeId), version);
      toast({ tone: 'success', message: 'Đã lưu danh sách khách sạn nổi bật.' });
      await load();
    } catch (requestError) {
      if (errorCode(requestError) === 'CMS_FEATURED_NOT_ELIGIBLE') {
        const ids: string[] = (requestError as any)?.ids || [];
        setRejected(ids);
        setSaveError('Có khách sạn chưa đủ điều kiện nổi bật (đánh dấu đỏ). Bỏ chọn rồi lưu lại.');
      } else if (isConflictError(requestError)) {
        setConflict(true);
      } else {
        setSaveError(errorMessage(requestError, 'Không lưu được danh sách.'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !list.length) return <LoadingState rows={4} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="hgbo-stack">
      <div className="hgbo-section-head">
        <p className="hgbo-muted">Đã chọn {list.length}/{MAX}. Khách sạn không còn đủ điều kiện sẽ tự ẩn khỏi trang chủ.</p>
        <BoButton variant="primary" icon={Plus} disabled={list.length >= MAX} onClick={() => setPicker(true)}>Thêm khách sạn</BoButton>
      </div>
      {conflict && <ConflictBanner onReload={load} busy={loading} />}
      {saveError && <Alert tone="danger">{saveError}</Alert>}
      {list.length ? (
        <ol className="hgbo-featlist" aria-label="Khách sạn nổi bật theo thứ tự">
          {list.map((h, index) => (
            <li key={h.placeId} className={`hgbo-featrow ${rejected.includes(h.placeId) ? 'is-bad' : ''}`.trim()}>
              <span className="hgbo-secrow__pos" aria-hidden="true">{index + 1}</span>
              {h.image ? <img className="hgbo-thumb" src={h.image} alt="" loading="lazy" /> : <span className="hgbo-thumb" aria-hidden="true"><ImageOff /></span>}
              <span className="hgbo-featrow__name">{h.name || 'Không còn dữ liệu khách sạn'}</span>
              {h.status && <StatusPill status={h.status} domain="moderation" size="sm" />}
              {h.eligible === false && <StatusPill status="NOT_ELIGIBLE" tone="warning" label="Không còn đủ điều kiện, sẽ tự ẩn" size="sm" />}
              {rejected.includes(h.placeId) && <StatusPill status="REJECTED" tone="danger" label="Máy chủ từ chối" size="sm" />}
              <span className="hgbo-orderbtns">
                <BoButton size="sm" variant="secondary" icon={ArrowUp} aria-label={`Đưa ${h.name || 'khách sạn'} lên`} disabled={index === 0 || saving} onClick={() => move(index, -1)} />
                <BoButton size="sm" variant="secondary" icon={ArrowDown} aria-label={`Đưa ${h.name || 'khách sạn'} xuống`} disabled={index === list.length - 1 || saving} onClick={() => move(index, 1)} />
              </span>
              <BoButton size="sm" variant="ghost-danger" icon={X} disabled={saving} onClick={() => setList((items) => items.filter((x) => x.placeId !== h.placeId))}>Bỏ chọn</BoButton>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState icon={Hotel} title="Chưa chọn khách sạn nổi bật" description="Thêm khách sạn đang công khai để hiện ở mục “Khách sạn nổi bật” trên trang chủ." />
      )}
      {dirty && (
        <div className="hgbo-changebar is-sticky" role="status">
          <span>Danh sách đã thay đổi</span>
          <span className="hgbo-row">
            <BoButton size="sm" variant="secondary" disabled={saving} onClick={() => { setList(server); setRejected([]); setSaveError(''); }}>Hủy</BoButton>
            <BoButton size="sm" variant="primary" loading={saving} onClick={save}>Lưu danh sách</BoButton>
          </span>
        </div>
      )}
      <HotelPickerDialog open={picker} onClose={() => setPicker(false)} existing={list.map((h) => h.placeId)} max={MAX} onPick={add} />
    </div>
  );
};
