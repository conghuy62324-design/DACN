// Thiết lập khách sạn nhiều bước: /partner/hotels/new, /partner/hotels/:hotelId/setup.
// Mọi bước gọi đúng endpoint của HotelManagementPage (qua useManagedHotel — không có nơi thứ hai gọi API ghi).
// Trước khi có :hotelId: bước 1–3 là một form, tự lưu vào sessionStorage; "Lưu nháp" = POST /partner/hotels.
// Sau khi tạo: tiến độ luôn tính lại từ GET /partner/hotels/:id.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, Check, CircleAlert, Save, Send, X } from 'lucide-react';
import {
  Alert,
  BoButton,
  BoLinkButton,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormSection,
  LoadingState,
  PageHeader,
  SelectField,
  StatusPill,
  errorMessage,
  useBackofficeBreadcrumbs,
} from '../../components/backoffice';
import '../../styles/hg-partner.css';
import { useManagedHotel } from './HotelManagementPage';
import { Editor, SectionProps, address, cleanAddress, profile } from './hotel/shared';
import { HotelAmenityFields, HotelProfileSection, ProfileIdentityFields } from './hotel/HotelProfileSection';
import { AddressFields, HotelAddressSection } from './hotel/HotelAddressSection';
import { auditItems } from './hotel/HotelReviewStatusSection';
import { HotelMediaSection } from './hotel/HotelMediaSection';
import { HotelRoomsSection } from './hotel/HotelRoomsSection';
import { HotelRatesSection } from './hotel/HotelRatesSection';
import { PriceInventoryCalendar } from './hotel/PriceInventoryCalendar';
import { hotelDomainEnabled } from './hotel/partnerContext';

const DRAFT_KEY = 'hg.partner.onboarding.draft';

const STEPS = [
  { n: 1, label: 'Doanh nghiệp' },
  { n: 2, label: 'Hồ sơ khách sạn' },
  { n: 3, label: 'Địa chỉ & tọa độ' },
  { n: 4, label: 'Ảnh & tiện nghi' },
  { n: 5, label: 'Phòng, giá & tồn' },
  { n: 6, label: 'Gửi duyệt' },
];

type StepState = 'todo' | 'current' | 'done' | 'fix';

const readDraft = () => {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeDraft = (value: any) => {
  try {
    if (value) window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* chỉ để tiện */
  }
};

const Stepper: React.FC<{ current: number; states: StepState[]; canOpen: (n: number) => boolean; onOpen: (n: number) => void }> = ({ current, states, canOpen, onOpen }) => {
  const done = states.filter((st) => st === 'done').length;
  return (
    <nav className="hgp-stepper" aria-label="Các bước thiết lập">
      <p className="hgp-stepper__mobile">
        Bước {current}/6 · {STEPS[current - 1].label}
      </p>
      <div className="hgp-stepper__bar" aria-hidden="true">
        <span style={{ width: `${(done / 6) * 100}%` }} />
      </div>
      <ol className="hgp-stepper__list">
        {STEPS.map((step, i) => {
          const st = i + 1 === current ? (states[i] === 'fix' ? 'fix' : 'current') : states[i];
          const label = { todo: 'Chưa làm', current: 'Đang làm', done: 'Hoàn tất', fix: 'Cần xem lại' }[st];
          return (
            <li key={step.n} className={`hgp-step is-${st}`}>
              <button
                type="button"
                className="hgp-step__btn"
                disabled={!canOpen(step.n)}
                aria-current={i + 1 === current ? 'step' : undefined}
                aria-label={`Bước ${step.n}: ${step.label} — ${label}`}
                onClick={() => onOpen(step.n)}
              >
                <span className="hgp-step__dot" aria-hidden="true">
                  {st === 'done' ? <Check /> : st === 'fix' ? <CircleAlert /> : step.n}
                </span>
                <span className="hgp-step__label">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/** Bước 1–3 khi chưa có :hotelId — tạo bản nháp (POST /partner/hotels) như form "Tạo khách sạn nháp" cũ. */
const CreateDraft: React.FC<{ m: ReturnType<typeof useManagedHotel> }> = ({ m }) => {
  const navigate = useNavigate();
  const [v, setV] = useState<any>(() => readDraft() || { businessId: '', profile: profile(null), address: address(null) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const formRef = React.useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!v.businessId && m.business[0]?.id) setV((x: any) => ({ ...x, businessId: m.business[0].id }));
  }, [m.business, v.businessId]);

  useEffect(() => {
    writeDraft(v);
  }, [v]);

  const p = v.profile;
  const a = v.address;
  const step1 = !!v.businessId;
  const step2 = !!(p.name.trim() && p.summary.trim() && p.description.trim());
  const coordsOk = a.latitude !== null && a.longitude !== null && !(Number(a.latitude) === 0 && Number(a.longitude) === 0);
  const step3 = !!(String(a.provinceOrCity).trim() && String(a.source).trim() && coordsOk);
  const states: StepState[] = [step1 ? 'done' : 'todo', step2 ? 'done' : 'todo', step3 ? 'done' : 'todo', 'todo', 'todo', 'todo'];
  const current = !step1 ? 1 : !step2 ? 2 : 3;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHint('');
    if (!coordsOk) {
      setHint('Cần vĩ độ và kinh độ thật của cơ sở trước khi lưu bản nháp (không nhận 0,0).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await m.createHotel(v, cleanAddress);
      writeDraft(null);
      navigate(`/partner/hotels/${created.identity.id}/setup?step=4`, { replace: true });
    } catch (err: any) {
      setError(err.message || err.error?.message || 'Không lưu được. Hãy kiểm tra dữ liệu hoặc tải lại khi có xung đột.');
    } finally {
      setBusy(false);
    }
  };

  if (!m.businessLoaded) return <LoadingState variant="form" rows={6} />;
  if (!m.business.length) {
    return (
      <EmptyState
        icon={Building2}
        title="Chưa có doanh nghiệp được cấp quyền"
        description="Bạn cần hồ sơ đối tác được duyệt và doanh nghiệp được cấp quyền quản lý trước khi tạo khách sạn."
        action={<BoLinkButton variant="primary" to="/become-partner">Đăng ký đối tác</BoLinkButton>}
      />
    );
  }

  const setProfile = (k: string, x: any) => setV((cur: any) => ({ ...cur, profile: { ...cur.profile, [k]: x } }));
  const setAddress = (k: string, x: any) => setV((cur: any) => ({ ...cur, address: { ...cur.address, [k]: x } }));

  return (
    <>
      <Stepper current={current} states={states} canOpen={(n) => n <= 3} onOpen={(n) => document.getElementById(`hgp-step-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
      <form ref={formRef} className="hgbo-stack" onSubmit={submit}>
        <FormSection id="hgp-step-1" title="1. Doanh nghiệp" description="Khách sạn thuộc doanh nghiệp bạn được cấp quyền quản lý.">
          <SelectField
            label="Doanh nghiệp sở hữu"
            required
            value={v.businessId}
            options={m.business.map((b: any) => ({ value: b.id, label: b.name }))}
            onChange={(x) => setV((cur: any) => ({ ...cur, businessId: x }))}
          />
        </FormSection>
        <FormSection id="hgp-step-2" title="2. Hồ sơ khách sạn" columns={2}>
          <ProfileIdentityFields v={p} set={setProfile} />
        </FormSection>
        <div id="hgp-step-3" className="hgbo-stack">
          <AddressFields v={a} set={setAddress} coordsRequired />
        </div>
        {hint && <Alert tone="warning">{hint}</Alert>}
        {error && (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        )}
        <div className="hgp-wizbar">
          <span className="hgbo-small hgbo-muted">Chưa lưu lên hệ thống. Bấm Lưu nháp để tạo bản nháp.</span>
          <div className="hgbo-row">
            <BoLinkButton variant="secondary" icon={ArrowLeft} to="/partner/hotels">Quay lại</BoLinkButton>
            <BoButton
              variant="ghost"
              icon={X}
              onClick={() => {
                writeDraft(null);
                setV({ businessId: m.business[0]?.id || '', profile: profile(null), address: address(null) });
              }}
            >
              Xóa nháp cục bộ
            </BoButton>
            <BoButton type="submit" variant="primary" icon={Save} loading={busy}>Lưu nháp</BoButton>
          </div>
        </div>
      </form>
    </>
  );
};

const ExistingSetup: React.FC<{ m: ReturnType<typeof useManagedHotel>; hotelId: string }> = ({ m, hotelId }) => {
  const [params, setParams] = useSearchParams();
  const [loadError, setLoadError] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);
  const { s, load } = m;

  useEffect(() => {
    setLoadError('');
    load(hotelId).catch((e: any) => setLoadError(errorMessage(e, 'Không tải được khách sạn.')));
  }, [hotelId, load]);

  const current = s && s.identity.id === hotelId ? s : null;

  const progress = useMemo(() => {
    if (!current) return null;
    const step2 = !!(current.identity.name && current.identity.summary && current.identity.description);
    const step3 = current.address?.latitude != null && current.address?.longitude != null;
    const hotelPhotos = current.media.filter((x: any) => !x.roomTypeId && !['ARCHIVED', 'REJECTED'].includes(x.status));
    const step4 = hotelPhotos.length > 0;
    const openInv = current.inventory.some((x: any) => !x.closed && Number(x.sellableQuantity) > 0);
    const step5 = current.rooms.length > 0 && current.rates.length > 0 && openInv;
    const status = current.authority.placeStatus;
    const step6 = ['PENDING', 'APPROVED'].includes(status);
    return { done: [true, step2, step3, step4, step5, step6], status, hotelPhotos: hotelPhotos.length, openInv };
  }, [current]);

  if (loadError && !current) return <ErrorState message={loadError} onRetry={() => load(hotelId).catch(() => {})} />;
  if (!current || !progress) return <LoadingState variant="form" rows={8} />;

  const rejected = progress.status === 'REJECTED';
  const firstOpen = progress.done.findIndex((d) => !d) + 1 || 6;
  const step = Math.min(6, Math.max(2, Number(params.get('step')) || (rejected ? 2 : firstOpen)));
  const canOpen = (n: number) => n === 1 ? false : n <= 3 || progress.done.slice(1, n - 1).every(Boolean) || rejected;
  const states: StepState[] = progress.done.map((d, i) => (rejected && i < 5 ? 'fix' : d ? 'done' : 'todo'));
  const go = (n: number) => setParams((cur) => {
    const next = new URLSearchParams(cur);
    next.set('step', String(n));
    next.delete('edit');
    return next;
  });
  const props: SectionProps = { s: current, write: m.write, act: m.act, load: m.load, admin: false, base: m.base, hotelUrl: `${m.base}/${hotelId}` };
  const lastReject = auditItems(current).find((x: any) => String(x.action).toUpperCase().includes('REJECT'));
  const checklist = [
    { n: 2, ok: progress.done[1], text: 'Hồ sơ khách sạn có tên, mô tả ngắn và mô tả chi tiết' },
    { n: 3, ok: progress.done[2], text: 'Địa chỉ có vĩ độ, kinh độ do cơ sở cung cấp' },
    { n: 4, ok: progress.done[3], text: `Có ít nhất 1 ảnh khách sạn (hiện có ${progress.hotelPhotos})` },
    { n: 5, ok: current.rooms.length > 0, text: `Có ít nhất 1 hạng phòng (hiện có ${current.rooms.length})` },
    { n: 5, ok: current.rates.length > 0, text: `Có ít nhất 1 gói giá (hiện có ${current.rates.length})` },
    { n: 5, ok: progress.openInv, text: 'Đã mở bán ít nhất 1 khoảng ngày trên lịch tồn phòng' },
  ];
  const canSubmit = ['DRAFT', 'REJECTED'].includes(progress.status) && checklist.every((c) => c.ok);

  return (
    <>
      {rejected && (
        <Alert
          tone="danger"
          action={<BoButton size="sm" variant="secondary" onClick={() => go(2)}>Sửa và gửi lại</BoButton>}
        >
          <p>
            <b>Quản trị viên yêu cầu sửa{lastReject?.reason ? `: ${lastReject.reason}` : '.'}</b>
          </p>
          <p className="hgbo-small">
            {lastReject ? '' : 'Máy chủ chưa trả lý do cho tài khoản đối tác. '}
            Xem lại các bước rồi gửi duyệt lại ở bước 6.
          </p>
        </Alert>
      )}
      <div className="hgbo-row">
        <StatusPill status={progress.status} domain="moderation" />
        <span className="hgbo-small hgbo-muted">{current.identity.name} · nội dung v{current.authority.contentVersion}</span>
      </div>
      <Stepper current={step} states={states} canOpen={canOpen} onOpen={go} />
      {m.error && <Alert tone="danger" role="alert">{m.error}</Alert>}
      <div key={`${current.identity.id}-${step}`} className="hgbo-stack">
        {step === 2 && <HotelProfileSection {...props} />}
        {step === 3 && <HotelAddressSection {...props} />}
        {step === 4 && (
          <>
            <HotelMediaSection {...props} upload={m.uploadMedia} />
            <Editor initial={profile(current)} save={(v: any) => m.write('profile', 'put', v)} label="Lưu tiện nghi">
              {(v: any, set: any) => (
                <FormSection title="Tiện nghi & dịch vụ khách sạn" columns={2}>
                  <HotelAmenityFields v={v} set={set} />
                </FormSection>
              )}
            </Editor>
          </>
        )}
        {step === 5 && (
          <>
            <HotelRoomsSection {...props} compact />
            <HotelRatesSection {...props} compact />
            <section className="hgbo-stack hgbo-stack--sm">
              <h2 className="hgbo-section-title">Mở bán trên lịch</h2>
              <PriceInventoryCalendar {...props} />
            </section>
          </>
        )}
        {step === 6 && (
          <section className="hgbo-card hgbo-stack hgbo-stack--sm">
            <h2 className="hgbo-section-title">Bảng kiểm trước khi gửi duyệt</h2>
            <ul className="hgp-checklist">
              {checklist.map((c, i) => (
                <li key={i} className={c.ok ? 'is-ok' : 'is-missing'}>
                  {c.ok ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                  <span>
                    <span className="hgbo-sr">{c.ok ? 'Đã xong: ' : 'Chưa xong: '}</span>
                    {c.text}
                  </span>
                  {!c.ok && <button type="button" className="hgbo-link" onClick={() => go(c.n)}>Tới bước {c.n}</button>}
                </li>
              ))}
            </ul>
            <p className="hgbo-small hgbo-muted">Khách sạn chỉ hiển thị công khai sau khi quản trị viên duyệt.</p>
            {progress.status === 'PENDING' && <Alert tone="info">Đã gửi duyệt, đang chờ quản trị viên.</Alert>}
            {progress.status === 'APPROVED' && <Alert tone="success">Khách sạn đã được duyệt.</Alert>}
            {['DRAFT', 'REJECTED'].includes(progress.status) && (
              <div>
                <BoButton variant="primary" icon={Send} disabled={!canSubmit} onClick={() => setSubmitOpen(true)}>
                  {rejected ? 'Gửi duyệt lại' : 'Gửi duyệt'}
                </BoButton>
              </div>
            )}
          </section>
        )}
      </div>
      <div className="hgp-wizbar">
        <span className="hgbo-small hgbo-muted">Dữ liệu đã lưu trên hệ thống; mỗi phần có nút lưu riêng.</span>
        <div className="hgbo-row">
          <BoButton variant="secondary" icon={ArrowLeft} disabled={step <= 2} onClick={() => go(step - 1)}>Quay lại</BoButton>
          {step < 6 ? (
            <BoButton variant="primary" icon={ArrowRight} disabled={!canOpen(step + 1)} onClick={() => go(step + 1)}>Tiếp tục</BoButton>
          ) : (
            <BoLinkButton variant="secondary" to={`${m.base}/${hotelId}/overview`}>Về trang khách sạn</BoLinkButton>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={submitOpen}
        title="Gửi khách sạn để duyệt"
        description={`Bản v${current.authority.contentVersion} sẽ được gửi cho quản trị viên. Khách sạn chỉ thay đổi trên trang công khai sau khi được duyệt.`}
        confirmLabel="Gửi duyệt"
        onClose={() => setSubmitOpen(false)}
        onConfirm={async () => {
          await m.write('submit', 'post', {});
        }}
      />
    </>
  );
};

export const PartnerHotelOnboardingPage: React.FC = () => {
  const { hotelId } = useParams();
  const m = useManagedHotel(false);
  useBackofficeBreadcrumbs([{ label: 'Khách sạn', to: '/partner/hotels' }, { label: hotelId ? 'Tiếp tục thiết lập' : 'Thêm khách sạn' }]);
  if (!hotelDomainEnabled()) {
    return <EmptyState icon={Building2} title="Module khách sạn chưa được bật trong môi trường này." />;
  }
  return (
    <div className="hgp-page hgbo-stack">
      <PageHeader
        title={hotelId ? 'Thiết lập khách sạn' : 'Thêm khách sạn'}
        subtitle="Hoàn tất từng bước rồi gửi duyệt. Có thể lưu dở và quay lại sau."
        actions={hotelId ? <Link className="hgbo-link" to={`/partner/hotels/${hotelId}/overview`}>Mở trang quản lý</Link> : undefined}
      />
      {hotelId ? <ExistingSetup m={m} hotelId={hotelId} /> : <CreateDraft m={m} />}
    </div>
  );
};
