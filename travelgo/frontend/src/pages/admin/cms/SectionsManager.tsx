import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Settings2 } from 'lucide-react';
import { AdminBackofficeService } from '../../../services/adminBackofficeService';
import {
  Alert,
  BoButton,
  ConflictBanner,
  DetailDrawer,
  ErrorState,
  LoadingState,
  NumberField,
  Switch,
  errorMessage,
  isConflictError,
  useToast,
} from '../../../components/backoffice';

interface Section {
  id: string;
  key: string;
  title: string;
  enabled: boolean;
  position: number;
  config: Record<string, unknown> | null;
  version: number;
  updatedAt?: string;
}

const REQUIRED = ['hero', 'search'];

const KEY_LABEL: Record<string, string> = {
  hero: 'Banner đầu trang',
  search: 'Ô tìm kiếm',
  destinations: 'Điểm đến',
  offers: 'Ưu đãi',
  featured_hotels: 'Khách sạn nổi bật',
  stay_types: 'Loại hình lưu trú',
  tours: 'Tour',
  blogs: 'Bài viết',
  ai_banner: 'Trợ lý du lịch',
  newsletter: 'Đăng ký nhận tin',
};

const CONFIG_LABEL: Record<string, string> = { limit: 'Số mục hiển thị' };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export const SectionsManager: React.FC = () => {
  const { toast } = useToast();
  const [server, setServer] = useState<Section[]>([]);
  const [draft, setDraft] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [configKey, setConfigKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await AdminBackofficeService.sections();
      const list = [...(result.items || [])].sort((a: Section, b: Section) => a.position - b.position);
      setServer(list);
      setDraft(list.map((s) => ({ ...s, config: s.config ? { ...s.config } : s.config })));
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải các khối trang chủ.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byKey = useMemo(() => new Map(server.map((s) => [s.key, s])), [server]);
  const changedKeys = draft.filter((s) => {
    const original = byKey.get(s.key);
    return original && (original.enabled !== s.enabled || original.title !== s.title || !same(original.config, s.config));
  }).map((s) => s.key);
  const orderChanged = draft.map((s) => s.key).join(',') !== server.map((s) => s.key).join(',');
  const changeCount = changedKeys.length + (orderChanged ? 1 : 0);
  const titleErrors = draft.filter((s) => !s.title.trim() || s.title.length > 60 || /[<>]/.test(s.title)).map((s) => s.key);

  const update = (key: string, patch: Partial<Section>) => setDraft((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const move = (index: number, delta: number) => setDraft((list) => {
    const next = list.slice();
    const target = index + delta;
    if (target < 0 || target >= next.length) return list;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const save = async () => {
    setSaving(true);
    setSaveError('');
    setConflict(false);
    try {
      const revisions = new Map(server.map(s => [s.key, s.version]));
      for (const key of changedKeys) {
        const s = draft.find((x) => x.key === key)!;
        const original = byKey.get(key)!;
        const body: Record<string, unknown> = { version: original.version };
        if (original.enabled !== s.enabled) body.enabled = s.enabled;
        if (original.title !== s.title) body.title = s.title.trim();
        if (!same(original.config, s.config)) body.config = s.config;
        const saved = await AdminBackofficeService.patchSection(key, body);
        revisions.set(key, saved.version);
      }
      if (orderChanged) await AdminBackofficeService.orderSections(draft.map(s => ({ id: s.id, version: revisions.get(s.key)! })));
      toast({ tone: 'success', message: 'Đã lưu bố cục trang chủ.' });
      await load();
    } catch (requestError) {
      if (isConflictError(requestError)) setConflict(true);
      setSaveError(`${errorMessage(requestError, 'Không lưu được bố cục.')} Đã dừng lưu và tải lại dữ liệu mới nhất.`);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading && !draft.length) return <LoadingState rows={6} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const configSection = draft.find((s) => s.key === configKey) || null;

  return (
    <div className="hgbo-cms-grid">
      <div className="hgbo-stack">
        {conflict && <ConflictBanner onReload={load} busy={loading} />}
        {saveError && <Alert tone="danger">{saveError}</Alert>}
        <ol className="hgbo-seclist" aria-label="Các khối trang chủ theo thứ tự">
          {draft.map((s, index) => {
            const required = REQUIRED.includes(s.key);
            const dirty = changedKeys.includes(s.key);
            const hasConfig = !!s.config && Object.keys(s.config).length > 0;
            const invalid = titleErrors.includes(s.key);
            return (
              <li key={s.key} className={`hgbo-secrow ${dirty ? 'is-dirty' : ''}`.trim()}>
                <span className="hgbo-secrow__pos" aria-hidden="true">{index + 1}</span>
                <div className="hgbo-secrow__name">
                  <label className="hgbo-sr" htmlFor={`sec-${s.key}`}>Tiêu đề khối {KEY_LABEL[s.key] || s.key}</label>
                  <input
                    id={`sec-${s.key}`}
                    className="hgbo-input"
                    value={s.title}
                    maxLength={60}
                    aria-invalid={invalid || undefined}
                    onChange={(event) => update(s.key, { title: event.target.value })}
                  />
                  <span className="hgbo-secrow__key">{KEY_LABEL[s.key] || s.key} · {s.key}</span>
                  {invalid && <span className="hgbo-field__error">Tiêu đề 1–60 ký tự, văn bản thuần.</span>}
                </div>
                <div className="hgbo-secrow__ctrl">
                  <Switch
                    checked={required ? true : s.enabled}
                    disabled={required || saving}
                    title={required ? 'Khối bắt buộc' : undefined}
                    label={required ? 'Bật (khối bắt buộc)' : s.enabled ? 'Đang bật' : 'Đang tắt'}
                    onChange={(checked) => update(s.key, { enabled: checked })}
                  />
                  <span className="hgbo-orderbtns">
                    <BoButton size="sm" variant="secondary" icon={ArrowUp} aria-label={`Đưa ${s.title} lên`} disabled={index === 0 || saving} onClick={() => move(index, -1)} />
                    <BoButton size="sm" variant="secondary" icon={ArrowDown} aria-label={`Đưa ${s.title} xuống`} disabled={index === draft.length - 1 || saving} onClick={() => move(index, 1)} />
                  </span>
                  {hasConfig && (
                    <BoButton size="sm" variant="ghost" icon={Settings2} disabled={saving} onClick={() => setConfigKey(s.key)}>Cấu hình</BoButton>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {changeCount > 0 && (
          <div className="hgbo-changebar is-sticky" role="status">
            <span>Có {changeCount} thay đổi chưa lưu</span>
            <span className="hgbo-row">
              <BoButton size="sm" variant="secondary" disabled={saving} onClick={() => setDraft(server.map((s) => ({ ...s, config: s.config ? { ...s.config } : s.config })))}>Hủy</BoButton>
              <BoButton size="sm" variant="primary" loading={saving} disabled={titleErrors.length > 0} onClick={save}>Lưu bố cục</BoButton>
            </span>
          </div>
        )}
      </div>
      <aside className="hgbo-card hgbo-cms-map" aria-label="Sơ đồ trang chủ">
        <h2 className="hgbo-section-title">Sơ đồ trang chủ</h2>
        <p className="hgbo-muted hgbo-small">Chỉ minh họa thứ tự, không phải bản xem trước thật.</p>
        <ol>
          {draft.map((s) => (
            <li key={s.key} className={s.enabled || REQUIRED.includes(s.key) ? '' : 'is-off'}>
              {s.title || KEY_LABEL[s.key] || s.key}
            </li>
          ))}
        </ol>
      </aside>
      <DetailDrawer
        open={!!configSection}
        onClose={() => setConfigKey(null)}
        width="sm"
        title={`Cấu hình: ${configSection?.title || ''}`}
        footer={<BoButton variant="primary" onClick={() => setConfigKey(null)}>Xong</BoButton>}
      >
        {configSection && (
          <div className="hgbo-stack hgbo-stack--sm">
            {Object.entries(configSection.config || {}).map(([key, value]) => (typeof value === 'number' ? (
              <NumberField
                key={key}
                label={CONFIG_LABEL[key] || key}
                value={value}
                min={1}
                max={key === 'limit' ? 12 : undefined}
                hint={key === 'limit' ? 'Từ 1 đến 12.' : undefined}
                onChange={(next) => {
                  const bounded = next === null ? 1 : key === 'limit' ? Math.min(12, Math.max(1, next)) : next;
                  update(configSection.key, { config: { ...(configSection.config || {}), [key]: bounded } });
                }}
              />
            ) : null))}
            <p className="hgbo-muted hgbo-small">Thay đổi được gom vào thanh “Lưu bố cục”.</p>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
