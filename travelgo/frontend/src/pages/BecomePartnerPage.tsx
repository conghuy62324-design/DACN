import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock3, Loader2, MapPin, XCircle } from 'lucide-react';
import { PlatformService } from '../services/platformService';
import { BusinessType, PartnerApplication, PartnerApplicationStatus } from '../types';
import { AccountShell } from '../components/account/AccountShell';
import { EMAIL_PATTERN, friendlyError } from '../components/account/accountErrors';
import '../styles/hg-account.css';

const businessTypes: Array<{ value: BusinessType; label: string }> = [
  { value: 'HOTEL', label: 'Khách sạn' }, { value: 'HOMESTAY', label: 'Homestay' }, { value: 'RESORT', label: 'Resort' }, { value: 'RESTAURANT', label: 'Nhà hàng' }, { value: 'TOUR_OPERATOR', label: 'Đơn vị tổ chức Tour' },
];

const statusLabels: Record<PartnerApplicationStatus, string> = {
  PENDING: 'Đang chờ xét duyệt',
  NEEDS_MORE_INFO: 'Cần bổ sung thông tin',
  APPROVED: 'Đã được phê duyệt',
  REJECTED: 'Không được phê duyệt',
  SUSPENDED: 'Tạm ngưng',
};

type TextKey = 'representativeName' | 'businessName' | 'email' | 'phone' | 'city' | 'taxCode';
type FormKey = TextKey | 'address';

const textFields: Array<{ name: TextKey; label: string; type: 'text' | 'email' | 'tel'; autoComplete?: string }> = [
  { name: 'representativeName', label: 'Họ tên người đại diện', type: 'text', autoComplete: 'name' },
  { name: 'businessName', label: 'Tên cơ sở kinh doanh', type: 'text', autoComplete: 'organization' },
  { name: 'email', label: 'Email liên hệ', type: 'email', autoComplete: 'email' },
  { name: 'phone', label: 'Số điện thoại', type: 'tel', autoComplete: 'tel' },
  { name: 'city', label: 'Tỉnh / thành phố', type: 'text', autoComplete: 'address-level1' },
  { name: 'taxCode', label: 'Mã số thuế / thông tin xác minh', type: 'text' },
];

const ORDER: FormKey[] = ['representativeName', 'businessName', 'email', 'phone', 'city', 'taxCode', 'address'];

export const BecomePartnerPage: React.FC = () => {
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [form, setForm] = useState({ representativeName: '', businessName: '', businessType: 'HOTEL' as BusinessType, email: '', phone: '', address: '', city: '', latitude: '', longitude: '', taxCode: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadError, setLoadError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const load = () => PlatformService.getMyPartnerApplications().then((rows) => { setApplications(rows); setLoadError(''); }).catch(() => setLoadError('Chưa tải được trạng thái hồ sơ đã gửi trước đó.'));
  useEffect(() => { load(); }, []);
  // Show the latest submission, so a historical decision cannot replace a newer application.
  // The API orders by createdAt DESC; keep that order for equal timestamps.
  const latest = [...applications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  const active = latest && ['PENDING', 'NEEDS_MORE_INFO', 'APPROVED'].includes(latest.status);
  const displayed = latest && (active || latest.status === 'REJECTED') ? latest : undefined;

  const validate = () => {
    const errors: Partial<Record<FormKey, string>> = {};
    for (const key of ORDER) {
      if (!form[key].trim()) errors[key] = 'Vui lòng nhập thông tin này.';
    }
    if (!errors.email && !EMAIL_PATTERN.test(form.email)) errors.email = 'Email chưa đúng định dạng, ví dụ: ten@example.com.';
    return errors;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const errors = validate();
    setFieldErrors(errors);
    setError(''); setSuccess('');
    const first = ORDER.find((key) => errors[key]);
    if (first) {
      document.getElementById('partner-' + first)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await PlatformService.submitPartnerApplication({ ...form, latitude: form.latitude ? Number(form.latitude) : undefined, longitude: form.longitude ? Number(form.longitude) : undefined, verificationDetails: { taxCode: form.taxCode } });
      setSuccess('Hồ sơ đã được gửi. HuGo Travel sẽ phản hồi sau khi xác minh.'); await load();
    } catch (requestError: any) { setError(friendlyError(requestError, 'Không thể gửi hồ sơ.')); }
    finally { setSubmitting(false); }
  };

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key as FormKey]) setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const fieldError = (key: FormKey) =>
    fieldErrors[key] && (
      <p id={'partner-' + key + '-error'} className="hg-acc-error">
        <AlertCircle size={14} aria-hidden="true" />
        <span>{fieldErrors[key]}</span>
      </p>
    );

  const tone = displayed?.status === 'APPROVED' ? 'ok' : displayed?.status === 'REJECTED' ? 'bad' : 'warn';
  const StatusIcon = tone === 'ok' ? CheckCircle2 : tone === 'bad' ? XCircle : Clock3;

  return (
    <AccountShell
      title="Trở thành đối tác"
      description="Đưa dịch vụ của bạn đến gần du khách. Quyền đối tác chỉ được cấp sau khi quản trị viên HuGo Travel xác minh và phê duyệt hồ sơ."
    >
      <ol className="hg-acc-steps">
        <li><div><b>Gửi hồ sơ</b><span>Thông tin cơ sở và người đại diện.</span></div></li>
        <li><div><b>HuGo xác minh</b><span>Quản trị viên kiểm tra và phản hồi.</span></div></li>
        <li><div><b>Nhận quyền đối tác</b><span>Quản lý cơ sở trong Kênh đối tác.</span></div></li>
      </ol>

      {loadError && (
        <p className="hg-acc-notice hg-acc-notice--warn hg-acc-gap" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{loadError}</span>
        </p>
      )}

      {displayed && (
        <section data-testid="partner-application-status" data-application-id={displayed.id} className={'hg-acc-card hg-acc-app' + (displayed.status === 'REJECTED' ? ' hg-acc-app--bad' : '')}>
          <StatusIcon size={36} className={'hg-acc-app__icon hg-acc-app__icon--' + tone} aria-hidden="true" />
          <div className="hg-acc-app__body">
            <p className="hg-acc-app__eyebrow">Trạng thái hồ sơ</p>
            <h2>{displayed.businessName}</h2>
            <div className="hg-acc-app__status">
              <span className={'hg-acc-pill hg-acc-pill--' + tone}>{statusLabels[displayed.status] || 'Đang xử lý'}</span>
              <span className="hg-acc-code" title="Mã trạng thái">{displayed.status}</span>
            </div>
            {displayed.decisionReason && <p className="hg-acc-app__reason">Phản hồi: {displayed.decisionReason}</p>}
            <p>Gửi lúc {new Date(displayed.createdAt).toLocaleString('vi-VN')}</p>
            {displayed.status === 'REJECTED' && <p>Bạn có thể gửi hồ sơ mới bằng biểu mẫu bên dưới.</p>}
          </div>
        </section>
      )}

      {!active &&
      <form onSubmit={submit} className="hg-acc-card" noValidate aria-busy={submitting}>
        <h2>Thông tin hồ sơ</h2>
        <div className="hg-acc-form__grid">
          {textFields.map(({ name, label, type, autoComplete }) => (
            <div key={name} className="hg-acc-field">
              <label htmlFor={'partner-' + name} className="hg-acc-label">{label}</label>
              <input
                id={'partner-' + name}
                name={name}
                type={type}
                required
                autoComplete={autoComplete}
                value={form[name]}
                onChange={(e) => update(name, e.target.value)}
                aria-invalid={fieldErrors[name] ? true : undefined}
                aria-describedby={fieldErrors[name] ? 'partner-' + name + '-error' : undefined}
                className="hg-acc-input"
              />
              {fieldError(name)}
            </div>
          ))}
          <div className="hg-acc-field">
            <label htmlFor="partner-businessType" className="hg-acc-label">Loại hình kinh doanh</label>
            <select id="partner-businessType" value={form.businessType} onChange={(e) => update('businessType', e.target.value)} className="hg-acc-select">
              {businessTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <div className="hg-acc-field hg-acc-field--full">
            <label htmlFor="partner-address" className="hg-acc-label">Địa chỉ cơ sở</label>
            <textarea
              id="partner-address"
              name="address"
              required
              rows={3}
              autoComplete="street-address"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              aria-invalid={fieldErrors.address ? true : undefined}
              aria-describedby={fieldErrors.address ? 'partner-address-error' : undefined}
              className="hg-acc-textarea"
            />
            {fieldError('address')}
          </div>
          <fieldset className="hg-acc-geo">
            <legend><MapPin size={16} aria-hidden="true" />Vị trí bản đồ (không bắt buộc)</legend>
            <div className="hg-acc-geo__grid">
              <input type="number" step="any" inputMode="decimal" placeholder="Vĩ độ" aria-label="Vĩ độ" value={form.latitude} onChange={(e) => update('latitude', e.target.value)} className="hg-acc-input" />
              <input type="number" step="any" inputMode="decimal" placeholder="Kinh độ" aria-label="Kinh độ" value={form.longitude} onChange={(e) => update('longitude', e.target.value)} className="hg-acc-input" />
            </div>
          </fieldset>
        </div>
        <div className="hg-acc-form__foot">
          {error && <p className="hg-acc-notice hg-acc-notice--error" role="alert"><AlertTriangle size={16} aria-hidden="true" /><span>{error}</span></p>}
          {success && <p className="hg-acc-notice hg-acc-notice--success" role="status"><CheckCircle2 size={16} aria-hidden="true" /><span>{success}</span></p>}
          <button type="submit" disabled={submitting} className="hg-acc-btn hg-acc-btn--cta hg-acc-btn--lg hg-acc-btn--block">
            {submitting && <Loader2 size={18} className="hg-acc-spin" aria-hidden="true" />}
            <span>{submitting ? 'Đang gửi hồ sơ…' : 'Gửi hồ sơ xét duyệt'}</span>
          </button>
        </div>
      </form>}
    </AccountShell>
  );
};
