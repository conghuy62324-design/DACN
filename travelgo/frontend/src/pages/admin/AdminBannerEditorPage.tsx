import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Archive, Eye, History, Save, Send, Undo2 } from 'lucide-react';
import { AdminBackofficeService } from '../../services/adminBackofficeService';
import {
  Alert,
  ApiPendingState,
  BO_FEATURES,
  BO_FEATURE_CONTRACT,
  BoButton,
  BoTabs,
  ConfirmDialog,
  ConflictBanner,
  ErrorState,
  FormSection,
  LoadingState,
  PageHeader,
  SelectField,
  StatusPill,
  TextField,
  errorMessage,
  fmtDateTime,
  fmtTime,
  isConflictError,
  statusLabel,
  useBackofficeBreadcrumbs,
  useToast,
} from '../../components/backoffice';
import { BannerPreview } from './cms/BannerPreview';
import type { Banner } from './cms/BannerList';

type CtaKind = 'hotels' | 'destination' | 'path';

interface Form {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaKind: CtaKind;
  ctaHref: string;
  imageDesktop: string;
  imageMobile: string;
  altText: string;
  imageCredit: string;
  startsAt: string;
  endsAt: string;
}

const EMPTY: Form = { title: '', subtitle: '', ctaLabel: '', ctaKind: 'hotels', ctaHref: '/hotels/search', imageDesktop: '', imageMobile: '', altText: '', imageCredit: '', startsAt: '', endsAt: '' };

const CTA_PREFIX: Record<CtaKind, string> = { hotels: '/hotels/search', destination: '/explore', path: '/' };
const CTA_OPTIONS = [
  { value: 'hotels', label: 'Tìm khách sạn' },
  { value: 'destination', label: 'Trang điểm đến' },
  { value: 'path', label: 'Đường dẫn nội bộ' },
];
const IMAGE_PREFIXES = ['/images/', '/api/hotel-media/', '/media/cms/'];

const TZ_PARTS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** ISO (UTC) → "YYYY-MM-DDTHH:mm" theo giờ Việt Nam cho ô datetime-local. */
function isoToLocal(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p: Record<string, string> = {};
  for (const part of TZ_PARTS.formatToParts(date)) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** "YYYY-MM-DDTHH:mm" giờ Việt Nam → ISO UTC. */
function localToIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(`${local}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const kindOf = (href?: string | null): CtaKind => {
  if (!href || href.startsWith('/hotels/search')) return 'hotels';
  if (href.startsWith('/explore') || href.startsWith('/places')) return 'destination';
  return 'path';
};

const fromBanner = (b: Banner): Form => ({
  title: b.title || '',
  subtitle: b.subtitle || '',
  ctaLabel: b.ctaLabel || '',
  ctaKind: kindOf(b.ctaHref),
  ctaHref: b.ctaHref || '',
  imageDesktop: b.imageDesktop || '',
  imageMobile: b.imageMobile || '',
  altText: b.altText || '',
  imageCredit: b.imageCredit || '',
  startsAt: isoToLocal(b.startsAt),
  endsAt: isoToLocal(b.endsAt),
});

const toPayload = (f: Form) => ({
  title: f.title.trim(),
  subtitle: f.subtitle.trim() || null,
  ctaLabel: f.ctaLabel.trim() || null,
  ctaHref: f.ctaLabel.trim() ? f.ctaHref.trim() || null : null,
  imageDesktop: f.imageDesktop.trim(),
  imageMobile: f.imageMobile.trim(),
  altText: f.altText.trim(),
  imageCredit: f.imageCredit.trim(),
  startsAt: localToIso(f.startsAt),
  endsAt: localToIso(f.endsAt),
});

const plain = (value: string) => (/[<>]/.test(value) ? 'Không nhận ký tự < hoặc > (chỉ văn bản thuần).' : null);

function validate(f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  if (!f.title.trim()) e.title = 'Nhập tiêu đề.';
  else e.title = plain(f.title) || undefined;
  e.subtitle = plain(f.subtitle) || undefined;
  e.ctaLabel = plain(f.ctaLabel) || undefined;
  const href = f.ctaHref.trim();
  if (f.ctaLabel.trim()) {
    if (!href) e.ctaHref = 'Nhập đường dẫn cho nút.';
    else if (!href.startsWith('/') || href.startsWith('//')) e.ctaHref = 'Chỉ nhận đường dẫn nội bộ bắt đầu bằng “/” (không “//”).';
    else if (/javascript:/i.test(href)) e.ctaHref = 'Đường dẫn không an toàn.';
    else if (href.length > 300) e.ctaHref = 'Tối đa 300 ký tự.';
  }
  for (const key of ['imageDesktop', 'imageMobile'] as const) {
    const v = f[key].trim();
    if (!v) e[key] = 'Chọn ảnh.';
    else if (!IMAGE_PREFIXES.some((p) => v.startsWith(p))) e[key] = 'Chỉ nhận ảnh có sẵn trên hệ thống: /images/…, /api/hotel-media/… hoặc /media/cms/…';
  }
  if (!f.altText.trim()) e.altText = 'Nhập mô tả ảnh.';
  else e.altText = plain(f.altText) || undefined;
  if (!f.imageCredit.trim()) e.imageCredit = 'Nhập nguồn và giấy phép ảnh.';
  else e.imageCredit = plain(f.imageCredit) || undefined;
  if (f.startsAt && f.endsAt && localToIso(f.endsAt)! <= localToIso(f.startsAt)!) e.endsAt = 'Thời điểm kết thúc phải sau thời điểm bắt đầu.';
  for (const key of Object.keys(e) as (keyof Form)[]) if (!e[key]) delete e[key];
  return e;
}

/** Ảnh preview đúng tỉ lệ + vùng an toàn chữ, cảnh báo khi nhỏ hơn mức tối thiểu. */
const ImageSlot: React.FC<{ label: string; ratio: '3x1' | '3x2'; src: string; minWidth: number; recommend: string; value: string; error?: string; onChange: (v: string) => void }> = ({ label, ratio, src, minWidth, recommend, value, error, onChange }) => {
  const [width, setWidth] = useState<number | null>(null);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setWidth(null);
    setBroken(false);
  }, [src]);
  const valid = src && !error;
  return (
    <div className="hgbo-stack hgbo-stack--sm">
      <TextField label={label} required value={value} onChange={onChange} placeholder="/images/travel/…" maxLength={300} error={error} hint={`Khuyến nghị ${recommend}.`} />
      <div className={`hgbo-imgslot__frame hgbo-imgslot__frame--${ratio}`}>
        {valid && !broken && (
          <img
            src={src}
            alt=""
            onLoad={(event) => setWidth((event.target as HTMLImageElement).naturalWidth)}
            onError={() => setBroken(true)}
          />
        )}
        {valid && !broken && <span className="hgbo-imgslot__safe" aria-hidden="true" />}
      </div>
      {broken && <Alert tone="danger">Không tải được ảnh từ đường dẫn này.</Alert>}
      {width !== null && width < minWidth && <Alert tone="warning">Ảnh rộng {width}px, nhỏ hơn mức tối thiểu {minWidth}px — có thể bị mờ.</Alert>}
    </div>
  );
};

const EditorInner: React.FC = () => {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [banner, setBanner] = useState<(Banner & { revisions?: any[] }) | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [baseline, setBaseline] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<'' | 'save' | 'publish'>('');
  const [actionError, setActionError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [touched, setTouched] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [tab, setTab] = useState(params.get('tab') === 'preview' ? 'preview' : 'content');
  const [dialog, setDialog] = useState<'publish' | 'unpublish' | 'archive' | { restore: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useBackofficeBreadcrumbs([{ label: 'Nội dung website' }, { label: 'CMS trang chủ', to: '/admin/cms' }, { label: isNew ? 'Thêm banner' : 'Sửa banner' }]);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setLoadError('');
    setConflict(false);
    try {
      const data = await AdminBackofficeService.banner(id!);
      setBanner(data);
      const f = fromBanner(data);
      setForm(f);
      setBaseline(f);
    } catch (requestError) {
      setLoadError(errorMessage(requestError, 'Không thể tải banner.'));
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.get('tab') === 'preview' && window.matchMedia('(min-width:1024px)').matches) {
      window.setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  }, [params, loading]);

  const errors = useMemo(() => validate(form), [form]);
  const valid = Object.keys(errors).length === 0;
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const live = banner?.status === 'PUBLISHED' || banner?.status === 'SCHEDULED';
  const archived = banner?.status === 'ARCHIVED';
  const shownErrors = touched ? errors : {};

  const setField = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const setKind = (kind: CtaKind) => setForm((f) => {
    const keep = f.ctaHref && f.ctaHref !== CTA_PREFIX[f.ctaKind] && kindOf(f.ctaHref) === kind;
    return { ...f, ctaKind: kind, ctaHref: keep ? f.ctaHref : CTA_PREFIX[kind] };
  });

  const handleError = (requestError: unknown, fallback: string) => {
    if (isConflictError(requestError)) setConflict(true);
    setActionError(errorMessage(requestError, fallback));
  };

  /** Lưu nháp. Trả về banner đã lưu (để xuất bản tiếp). */
  const saveDraft = async (): Promise<Banner | null> => {
    setTouched(true);
    if (!valid) {
      setActionError('Kiểm tra lại các ô đang báo lỗi.');
      return null;
    }
    setActionError('');
    const payload = toPayload(form);
    const saved: Banner = isNew
      ? await AdminBackofficeService.createBanner(payload)
      : await AdminBackofficeService.updateBanner(id!, { ...payload, version: banner!.version });
    setBanner((b) => ({ ...(b || {}), ...saved }));
    const f = fromBanner(saved);
    setForm(f);
    setBaseline(f);
    if (isNew) navigate(`/admin/cms/banners/${saved.id}`, { replace: true });
    return saved;
  };

  const onSave = async () => {
    setBusy('save');
    try {
      const saved = await saveDraft();
      if (saved) {
        toast({ tone: 'success', message: 'Đã lưu bản nháp.' });
        if (!isNew) await load();
      }
    } catch (requestError) {
      handleError(requestError, 'Không lưu được banner.');
    } finally {
      setBusy('');
    }
  };

  const onPublish = async () => {
    let target: Banner | null = banner;
    if (dirty || isNew) target = await saveDraft();
    if (!target) throw new Error('Kiểm tra lại các ô đang báo lỗi trước khi xuất bản.');
    const result = await AdminBackofficeService.publishBanner(target.id, target.version, localToIso(form.startsAt), localToIso(form.endsAt));
    toast({ tone: 'success', message: result?.status === 'SCHEDULED' ? 'Đã lên lịch hiển thị banner.' : 'Đã xuất bản banner.' });
    if (isNew) navigate(`/admin/cms/banners/${target.id}`, { replace: true });
    else await load();
  };

  const onUnpublish = async (reason?: string) => {
    await AdminBackofficeService.unpublishBanner(banner!.id, banner!.version, reason);
    toast({ tone: 'success', message: 'Đã gỡ banner xuống, trở về bản nháp.' });
    await load();
  };

  const onArchive = async (reason?: string) => {
    await AdminBackofficeService.archiveBanner(banner!.id, reason);
    toast({ tone: 'success', message: 'Đã lưu trữ banner.' });
    navigate('/admin/cms');
  };

  const onRestore = async (revision: number) => {
    await AdminBackofficeService.restoreBanner(banner!.id, revision, banner!.version);
    toast({ tone: 'success', message: `Đã tạo bản nháp từ phiên bản ${revision}. Chưa xuất bản.` });
    await load();
  };

  const wrapDialog = (fn: (reason?: string) => Promise<void>) => async (reason?: string) => {
    try {
      await fn(reason);
    } catch (requestError) {
      if (isConflictError(requestError)) setConflict(true);
      throw requestError;
    }
  };

  if (loading) return <LoadingState variant="form" rows={8} />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  const previewData = { title: form.title, subtitle: form.subtitle, ctaLabel: form.ctaLabel, imageDesktop: errors.imageDesktop ? '' : form.imageDesktop, imageMobile: errors.imageMobile ? '' : form.imageMobile, altText: form.altText };
  const revisions: any[] = banner?.revisions || [];

  const statusText = (() => {
    if (isNew) return dirty ? 'Bản nháp mới · chưa lưu' : 'Bản nháp mới';
    if (live && dirty) return `Đang sửa bản mới · trang chủ vẫn hiện phiên bản ${banner!.version} cho đến khi xuất bản lại`;
    if (dirty) return 'Có thay đổi chưa lưu';
    return `${statusLabel(banner!.status, 'cms')} · phiên bản ${banner!.version}${banner!.updatedAt ? ` · lưu ${fmtTime(banner!.updatedAt)}` : ''}`;
  })();

  const scheduleImpact = `Banner hiển thị từ ${form.startsAt ? fmtDateTime(localToIso(form.startsAt)) : 'ngay bây giờ'} đến ${form.endsAt ? fmtDateTime(localToIso(form.endsAt)) : 'không giới hạn'}.`;

  return (
    <div>
      <PageHeader
        title={isNew ? 'Thêm banner' : banner?.title || 'Sửa banner'}
        subtitle="Banner/hero trang chủ. Chỉ nhận văn bản thuần, không nhận HTML."
        actions={(
          <>
            {banner && <StatusPill status={banner.status} domain="cms" />}
            <BoButton
              variant="secondary"
              icon={Eye}
              className="hgbo-hide-768"
              onClick={() => {
                setTab('preview');
                previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Xem trước
            </BoButton>
            {banner && !archived && <BoButton variant="ghost-danger" icon={Archive} onClick={() => setDialog('archive')}>Lưu trữ</BoButton>}
          </>
        )}
      />
      {archived && <Alert tone="warning"><p>Banner đã lưu trữ, không sửa hay xuất bản được.</p></Alert>}
      {conflict && <ConflictBanner onReload={load} />}
      <BoTabs
        className="hgbo-editor__tabs"
        items={[
          { key: 'content', label: 'Nội dung' },
          { key: 'preview', label: 'Xem trước' },
          { key: 'history', label: 'Lịch sử phiên bản', disabled: isNew },
        ]}
        value={tab}
        onChange={setTab}
        label="Phần của trình sửa banner"
      />
      <div className="hgbo-editor" data-tab={tab}>
        <div className="hgbo-editor__form hgbo-stack">
          <FormSection title="Nội dung" description="Chỉ nhận văn bản thuần, không nhận HTML.">
            <TextField label="Tiêu đề" required counter maxLength={60} value={form.title} disabled={archived} error={shownErrors.title || plain(form.title)} onChange={(v) => setField('title', v)} hint="Tối đa 60 ký tự để vừa 2 dòng ở hero desktop." />
            <TextField label="Phụ đề" counter maxLength={120} value={form.subtitle} disabled={archived} error={plain(form.subtitle)} onChange={(v) => setField('subtitle', v)} />
          </FormSection>
          <FormSection title="Ảnh" description="Tải ảnh lên chưa được hỗ trợ (chờ API). Nhập đường dẫn ảnh đã có trên hệ thống.">
            <div className="hgbo-imgpair">
              <ImageSlot label="Ảnh desktop" ratio="3x1" recommend="1920×640 (3:1), tối thiểu 1600 ngang" minWidth={1600} src={form.imageDesktop.trim()} value={form.imageDesktop} error={shownErrors.imageDesktop || (form.imageDesktop && errors.imageDesktop) || undefined} onChange={(v) => setField('imageDesktop', v)} />
              <ImageSlot label="Ảnh mobile" ratio="3x2" recommend="1170×780 (3:2)" minWidth={1170} src={form.imageMobile.trim()} value={form.imageMobile} error={shownErrors.imageMobile || (form.imageMobile && errors.imageMobile) || undefined} onChange={(v) => setField('imageMobile', v)} />
            </div>
            <p className="hgbo-muted hgbo-small">Khung nét đứt là vùng an toàn cho chữ (60% trái/dưới).</p>
            <TextField label="Mô tả ảnh (alt)" required counter maxLength={160} value={form.altText} disabled={archived} error={shownErrors.altText || plain(form.altText)} onChange={(v) => setField('altText', v)} hint="Dùng chung cho ảnh desktop và mobile." />
            <TextField label="Nguồn & giấy phép ảnh" required counter maxLength={160} value={form.imageCredit} disabled={archived} error={shownErrors.imageCredit || plain(form.imageCredit)} onChange={(v) => setField('imageCredit', v)} placeholder="Tác giả / Nguồn / Giấy phép" />
          </FormSection>
          <FormSection title="Nút hành động (CTA)" columns={2}>
            <TextField label="Nhãn nút" counter maxLength={24} value={form.ctaLabel} disabled={archived} error={plain(form.ctaLabel)} onChange={(v) => setField('ctaLabel', v)} hint="Để trống nếu không cần nút." />
            <SelectField label="Đích" value={form.ctaKind} options={CTA_OPTIONS} disabled={archived || !form.ctaLabel.trim()} onChange={(v) => setKind(v as CtaKind)} />
            <TextField
              span
              label="Đường dẫn"
              value={form.ctaHref}
              maxLength={300}
              disabled={archived || !form.ctaLabel.trim()}
              error={form.ctaLabel.trim() ? errors.ctaHref : undefined}
              onChange={(v) => setField('ctaHref', v)}
              hint={form.ctaLabel.trim() && !errors.ctaHref ? `Sẽ mở: ${form.ctaHref.trim()}` : 'Chỉ nhận đường dẫn nội bộ bắt đầu bằng “/”. Không nhận URL ngoài.'}
            />
          </FormSection>
          <FormSection title="Lịch hiển thị" columns={2} description="Giờ Việt Nam; máy chủ quyết định thời điểm hiển thị.">
            <TextField type="datetime-local" label="Bắt đầu" value={form.startsAt} disabled={archived} onChange={(v) => setField('startsAt', v)} hint="Trống = ngay khi xuất bản." />
            <TextField type="datetime-local" label="Kết thúc" value={form.endsAt} disabled={archived} error={errors.endsAt} onChange={(v) => setField('endsAt', v)} hint="Trống = không giới hạn." />
          </FormSection>
        </div>
        <div className="hgbo-editor__side">
          <section className="hgbo-card hgbo-preview-card" ref={previewRef} aria-labelledby="banner-preview-title">
            <div className="hgbo-section-head">
              <h2 className="hgbo-section-title" id="banner-preview-title">Xem trước</h2>
              <div className="hgbo-segmented" role="radiogroup" aria-label="Thiết bị xem trước">
                <button type="button" role="radio" aria-checked={device === 'desktop'} onClick={() => setDevice('desktop')}>Desktop</button>
                <button type="button" role="radio" aria-checked={device === 'mobile'} onClick={() => setDevice('mobile')}>Mobile</button>
              </div>
            </div>
            <BannerPreview banner={previewData} mode={device} />
          </section>
          {!isNew && (
            <section className="hgbo-card hgbo-revisions" aria-labelledby="banner-rev-title">
              <h2 className="hgbo-section-title" id="banner-rev-title">
                <History size={16} aria-hidden="true" />
                {' '}
                Lịch sử phiên bản
              </h2>
              {revisions.length ? (
                <ol className="hgbo-revlist">
                  {[...revisions].reverse().map((r) => (
                    <li key={r.revision}>
                      <div className="hgbo-revlist__main">
                        <span className="hgbo-strong">Phiên bản {r.revision}</span>
                        {' · '}
                        <span>{r.title}</span>
                        <span className="hgbo-dt__cell-sub">{[r.updatedBy, fmtDateTime(r.updatedAt)].filter(Boolean).join(' · ')}</span>
                      </div>
                      <StatusPill status={r.status} domain="cms" size="sm" />
                      {!archived && <BoButton size="sm" variant="ghost" icon={Undo2} onClick={() => setDialog({ restore: r.revision })}>Khôi phục thành bản nháp</BoButton>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="hgbo-muted">Máy chủ chưa trả lịch sử cho banner này.</p>
              )}
            </section>
          )}
        </div>
      </div>
      {actionError && <Alert tone="danger">{actionError}</Alert>}
      {!archived && (
        <div className="hgbo-savebar" role="region" aria-label="Thanh lưu banner">
          <span className={`hgbo-savebar__status ${dirty ? 'is-dirty' : ''}`.trim()} aria-live="polite">{statusText}</span>
          <div className="hgbo-savebar__actions">
            <BoButton variant="secondary" icon={Save} loading={busy === 'save'} disabled={!!busy || (!dirty && !isNew)} onClick={onSave}>Lưu nháp</BoButton>
            {live && !dirty ? (
              <BoButton variant="danger" icon={Undo2} disabled={!!busy} onClick={() => setDialog('unpublish')}>Gỡ xuống</BoButton>
            ) : (
              <BoButton
                variant="primary"
                icon={Send}
                disabled={!!busy}
                onClick={() => {
                  setTouched(true);
                  if (!valid) {
                    setActionError('Kiểm tra lại các ô đang báo lỗi trước khi xuất bản.');
                    return;
                  }
                  setActionError('');
                  setDialog('publish');
                }}
              >
                Xuất bản
              </BoButton>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={dialog === 'publish'}
        title="Xuất bản banner?"
        description={dirty || isNew ? 'Thay đổi chưa lưu sẽ được lưu trước khi xuất bản.' : undefined}
        impact={<p>{scheduleImpact}</p>}
        confirmLabel="Xuất bản"
        onConfirm={wrapDialog(onPublish)}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'unpublish'}
        tone="danger"
        title="Gỡ banner xuống?"
        impact={<p>Banner chuyển về Bản nháp và không còn hiện trên trang chủ.</p>}
        confirmLabel="Gỡ xuống"
        reason={{ required: true, label: 'Lý do gỡ xuống' }}
        onConfirm={wrapDialog(onUnpublish)}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'archive'}
        tone="danger"
        title="Lưu trữ banner?"
        impact={<p>Banner bị ẩn khỏi danh sách và trang chủ (xóa mềm).</p>}
        confirmLabel="Lưu trữ"
        reason={{ required: true, label: 'Lý do lưu trữ' }}
        onConfirm={wrapDialog(onArchive)}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={typeof dialog === 'object' && dialog !== null}
        title="Khôi phục phiên bản?"
        impact={<p>Tạo bản nháp từ phiên bản {typeof dialog === 'object' && dialog ? dialog.restore : ''}. Không tự xuất bản.</p>}
        confirmLabel="Khôi phục thành bản nháp"
        onConfirm={wrapDialog(async () => {
          if (typeof dialog === 'object' && dialog) await onRestore(dialog.restore);
        })}
        onClose={() => setDialog(null)}
      />
    </div>
  );
};

export const AdminBannerEditorPage: React.FC = () => {
  if (!BO_FEATURES.cms) {
    return (
      <div>
        <PageHeader title="Banner trang chủ" />
        <ApiPendingState feature="Trình sửa banner" contractRef={BO_FEATURE_CONTRACT.cms} />
      </div>
    );
  }
  return <EditorInner />;
};
