import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { AdminBackofficeService } from '../../services/adminBackofficeService';
import {
  Alert,
  ApiPendingState,
  BO_FEATURES,
  BO_FEATURE_CONTRACT,
  BoButton,
  ConflictBanner,
  ErrorState,
  FormSection,
  LoadingState,
  PageHeader,
  StickySaveBar,
  Switch,
  TextField,
  TextareaField,
  errorMessage,
  fmtDateTime,
  isConflictError,
  useBackofficeBreadcrumbs,
  useToast,
} from '../../components/backoffice';

interface FooterLink {
  group: string;
  label: string;
  href: string;
}

interface SettingsForm {
  siteName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  supportHours: string;
  address: string;
  footerLinks: FooterLink[];
  seo: { defaultTitle: string; defaultDescription: string };
  notice: { enabled: boolean; message: string };
}

const SOCIAL_GROUP = 'Mạng xã hội';

const toForm = (d: any): SettingsForm => ({
  siteName: d.siteName || '',
  tagline: d.tagline || '',
  supportEmail: d.supportEmail || '',
  supportPhone: d.supportPhone || '',
  supportHours: d.supportHours || '',
  address: d.address || '',
  footerLinks: (d.footerLinks || []).map((l: any) => ({ group: l.group || '', label: l.label || '', href: l.href || '' })),
  seo: { defaultTitle: d.seo?.defaultTitle || '', defaultDescription: d.seo?.defaultDescription || '' },
  notice: { enabled: !!d.notice?.enabled, message: d.notice?.message || '' },
});

const plain = (v: string) => (/[<>]/.test(v) ? 'Chỉ nhận văn bản thuần (không có < hoặc >).' : undefined);

function linkError(link: FooterLink): string | undefined {
  const href = link.href.trim();
  if (!link.label.trim() || !href) return 'Nhập nhãn và đường dẫn.';
  if (/javascript:/i.test(href)) return 'Đường dẫn không an toàn.';
  if (link.group.trim() === SOCIAL_GROUP) return /^https:\/\/[^\s]+$/.test(href) ? undefined : 'Mạng xã hội cần đường dẫn https://';
  if (!href.startsWith('/') || href.startsWith('//')) return 'Chỉ nhận đường dẫn nội bộ bắt đầu bằng “/”. Mạng xã hội: đặt nhóm “Mạng xã hội” và dùng https://';
  return undefined;
}

const SettingsInner: React.FC = () => {
  const { toast } = useToast();
  const [server, setServer] = useState<any>(null);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [conflict, setConflict] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setConflict(false);
    setSaveError('');
    try {
      const data = await AdminBackofficeService.settings();
      setServer(data);
      setForm(toForm(data));
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải cài đặt website.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const baseline = useMemo(() => (server ? toForm(server) : null), [server]);
  const dirty = !!form && !!baseline && JSON.stringify(form) !== JSON.stringify(baseline);

  const errors = useMemo(() => {
    if (!form) return {} as Record<string, string | undefined>;
    return {
      siteName: !form.siteName.trim() ? 'Nhập tên website.' : plain(form.siteName),
      tagline: plain(form.tagline),
      supportEmail: form.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim()) ? 'Email chưa đúng định dạng.' : undefined,
      supportPhone: form.supportPhone && !/^[0-9+().\s-]{6,20}$/.test(form.supportPhone.trim()) ? 'Số điện thoại chưa đúng định dạng.' : undefined,
      supportHours: plain(form.supportHours),
      address: plain(form.address),
      seoTitle: plain(form.seo.defaultTitle),
      seoDesc: plain(form.seo.defaultDescription),
      notice: form.notice.enabled && !form.notice.message.trim() ? 'Nhập nội dung thông báo khi bật.' : plain(form.notice.message),
      links: form.footerLinks.some((l) => linkError(l)) ? 'links' : undefined,
    } as Record<string, string | undefined>;
  }, [form]);
  const valid = Object.values(errors).every((v) => !v);

  if (loading && !form) return <LoadingState variant="form" rows={8} />;
  if (error || !form) return <ErrorState message={error || 'Không có dữ liệu cài đặt.'} onRetry={load} />;

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const setLink = (index: number, patch: Partial<FooterLink>) => set('footerLinks', form.footerLinks.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const moveLink = (index: number, delta: number) => {
    const next = form.footerLinks.slice();
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set('footerLinks', next);
  };

  const save = async () => {
    if (!baseline) return;
    setSaving(true);
    setSaveError('');
    setConflict(false);
    const body: Record<string, unknown> = { version: server.version };
    const scalar: (keyof SettingsForm)[] = ['siteName', 'tagline', 'supportEmail', 'supportPhone', 'supportHours', 'address'];
    for (const key of scalar) {
      if (form[key] !== baseline[key]) {
        const v = String(form[key]).trim();
        body[key] = v || null;
      }
    }
    if (JSON.stringify(form.footerLinks) !== JSON.stringify(baseline.footerLinks)) body.footerLinks = form.footerLinks.map((l) => ({ group: l.group.trim(), label: l.label.trim(), href: l.href.trim() }));
    if (JSON.stringify(form.seo) !== JSON.stringify(baseline.seo)) body.seo = { defaultTitle: form.seo.defaultTitle.trim(), defaultDescription: form.seo.defaultDescription.trim() };
    if (JSON.stringify(form.notice) !== JSON.stringify(baseline.notice)) body.notice = { enabled: form.notice.enabled, message: form.notice.message.trim() };
    try {
      const data = await AdminBackofficeService.saveSettings(body);
      setServer(data);
      setForm(toForm(data));
      toast({ tone: 'success', message: 'Đã lưu cài đặt website.' });
    } catch (requestError) {
      if (isConflictError(requestError)) setConflict(true);
      else setSaveError(errorMessage(requestError, 'Không lưu được cài đặt.'));
    } finally {
      setSaving(false);
    }
  };

  const serpTitle = form.seo.defaultTitle.trim() || form.siteName || 'Tiêu đề mặc định';
  const serpDesc = form.seo.defaultDescription.trim() || 'Mô tả mặc định của website sẽ hiện ở đây.';

  return (
    <div className="hgbo-stack">
      {conflict && <ConflictBanner onReload={load} busy={loading} />}
      {saveError && <Alert tone="danger">{saveError}</Alert>}
      <FormSection title="Thông tin website" columns={2}>
        <TextField label="Tên website" required maxLength={80} value={form.siteName} error={errors.siteName} onChange={(v) => set('siteName', v)} />
        <TextField label="Khẩu hiệu" counter maxLength={120} value={form.tagline} error={errors.tagline} onChange={(v) => set('tagline', v)} />
        <TextField label="Email hỗ trợ" type="email" maxLength={160} value={form.supportEmail} error={errors.supportEmail} onChange={(v) => set('supportEmail', v)} />
        <TextField label="Điện thoại hỗ trợ" type="tel" maxLength={20} value={form.supportPhone} error={errors.supportPhone} onChange={(v) => set('supportPhone', v)} hint="Để trống nếu chưa có số thật. Không nhập số minh họa." />
        <TextField label="Giờ hỗ trợ" maxLength={80} value={form.supportHours} error={errors.supportHours} onChange={(v) => set('supportHours', v)} />
        <TextField label="Địa chỉ" maxLength={200} value={form.address} error={errors.address} onChange={(v) => set('address', v)} />
      </FormSection>
      <FormSection
        title="Liên kết chân trang"
        description="Chỉ nhận đường dẫn nội bộ “/…”. Liên kết mạng xã hội: đặt nhóm “Mạng xã hội” và dùng https://."
        actions={(
          <BoButton size="sm" variant="secondary" icon={Plus} onClick={() => set('footerLinks', [...form.footerLinks, { group: '', label: '', href: '/' }])}>Thêm liên kết</BoButton>
        )}
      >
        {form.footerLinks.length === 0 && <p className="hgbo-muted">Chưa có liên kết.</p>}
        <div>
          {form.footerLinks.map((link, index) => {
            const err = linkError(link);
            return (
              <div key={index} className="hgbo-linkrow">
                <TextField label="Nhóm" maxLength={40} value={link.group} onChange={(v) => setLink(index, { group: v })} />
                <TextField label="Nhãn" maxLength={60} value={link.label} onChange={(v) => setLink(index, { label: v })} />
                <TextField label="Đường dẫn" maxLength={300} value={link.href} error={err} onChange={(v) => setLink(index, { href: v })} />
                <span className="hgbo-orderbtns">
                  <BoButton size="sm" variant="secondary" icon={ArrowUp} aria-label={`Đưa ${link.label || 'liên kết'} lên`} disabled={index === 0} onClick={() => moveLink(index, -1)} />
                  <BoButton size="sm" variant="secondary" icon={ArrowDown} aria-label={`Đưa ${link.label || 'liên kết'} xuống`} disabled={index === form.footerLinks.length - 1} onClick={() => moveLink(index, 1)} />
                  <BoButton size="sm" variant="ghost-danger" icon={Trash2} aria-label={`Xóa liên kết ${link.label || index + 1}`} onClick={() => set('footerLinks', form.footerLinks.filter((_, i) => i !== index))} />
                </span>
              </div>
            );
          })}
        </div>
      </FormSection>
      <FormSection title="SEO cơ bản">
        <TextField label="Tiêu đề mặc định" counter maxLength={60} value={form.seo.defaultTitle} error={errors.seoTitle} onChange={(v) => set('seo', { ...form.seo, defaultTitle: v })} />
        <TextareaField label="Mô tả mặc định" counter maxLength={160} rows={3} value={form.seo.defaultDescription} error={errors.seoDesc} onChange={(v) => set('seo', { ...form.seo, defaultDescription: v })} />
        <div className="hgbo-serp" aria-label="Xem trước kết quả tìm kiếm">
          <p className="hgbo-serp__title">{serpTitle}</p>
          <p className="hgbo-serp__url">/</p>
          <p className="hgbo-serp__desc">{serpDesc}</p>
        </div>
      </FormSection>
      <FormSection title="Thông báo toàn site">
        <Switch checked={form.notice.enabled} onChange={(checked) => set('notice', { ...form.notice, enabled: checked })} label={form.notice.enabled ? 'Đang bật dải thông báo' : 'Đang tắt dải thông báo'} />
        <TextareaField label="Nội dung thông báo" counter maxLength={200} rows={3} value={form.notice.message} error={errors.notice} onChange={(v) => set('notice', { ...form.notice, message: v })} hint="Văn bản thuần." />
        {form.notice.message.trim() && (
          <div>
            <p className="hgbo-field__label">Xem trước dải thông báo{form.notice.enabled ? '' : ' (đang tắt)'}</p>
            <div className="hgbo-noticebar">{form.notice.message}</div>
          </div>
        )}
      </FormSection>
      <Alert tone="info">
        <p>Trang này không chứa khóa API, mật khẩu hay cấu hình máy chủ.</p>
      </Alert>
      <StickySaveBar
        dirty={dirty}
        busy={saving}
        saveDisabled={!valid}
        onSave={save}
        onReset={() => baseline && setForm(baseline)}
        saveLabel="Lưu cài đặt"
        statusText={dirty ? (valid ? 'Có thay đổi chưa lưu' : 'Có thay đổi chưa lưu · kiểm tra các ô báo lỗi') : server?.updatedAt ? `Đã đồng bộ · cập nhật ${fmtDateTime(server.updatedAt)}` : 'Đã đồng bộ'}
      />
    </div>
  );
};

export const AdminSettingsPage: React.FC = () => {
  useBackofficeBreadcrumbs([{ label: 'Hệ thống' }, { label: 'Cài đặt' }]);
  return (
    <div>
      <PageHeader title="Cài đặt website" subtitle="Cấu hình không nhạy cảm: thông tin liên hệ, chân trang, SEO, thông báo." />
      {BO_FEATURES.settings ? (
        <SettingsInner />
      ) : (
        <ApiPendingState feature="Cài đặt website" contractRef={BO_FEATURE_CONTRACT.settings} />
      )}
    </div>
  );
};
