import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, FileCheck2, MessageSquarePlus, RefreshCw, X } from 'lucide-react';
import { PlatformService } from '../../services/platformService';
import { AdminBackofficeService } from '../../services/adminBackofficeService';
import { PartnerApplication } from '../../types';
import {
  BoButton,
  ConfirmDialog,
  ConfirmDialogProps,
  DataColumn,
  DataTable,
  DescList,
  DetailDrawer,
  DrawerSection,
  FilterBar,
  PageHeader,
  StatusPill,
  businessTypeLabel,
  errorMessage,
  fmtDateTime,
  useDebounced,
  useQueryParams,
  useToast,
} from '../../components/backoffice';

type Decision = 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO';

const TABS: { key: string; label: string; status?: string }[] = [
  { key: 'PENDING', label: 'Chờ duyệt', status: 'PENDING' },
  { key: 'NEEDS_MORE_INFO', label: 'Cần bổ sung', status: 'NEEDS_MORE_INFO' },
  { key: 'APPROVED', label: 'Đã duyệt', status: 'APPROVED' },
  { key: 'REJECTED', label: 'Bị từ chối', status: 'REJECTED' },
  { key: 'ALL', label: 'Tất cả' },
];

const DETAIL_LABEL: Record<string, string> = { taxCode: 'Mã số thuế', businessLicense: 'Giấy phép kinh doanh', website: 'Website' };

const decidable = (status: string) => status === 'PENDING' || status === 'NEEDS_MORE_INFO';

const DIALOG: Record<Decision, Pick<ConfirmDialogProps, 'title' | 'confirmLabel' | 'tone' | 'reason' | 'impact'>> = {
  APPROVED: {
    title: 'Phê duyệt hồ sơ đối tác?',
    confirmLabel: 'Phê duyệt',
    tone: 'default',
    reason: { required: false, label: 'Ghi chú (không bắt buộc)' },
    impact: <p>Hồ sơ chuyển sang Đã duyệt. Quyền đối tác và Business được cấp theo quy trình hiện có của máy chủ.</p>,
  },
  NEEDS_MORE_INFO: {
    title: 'Yêu cầu bổ sung hồ sơ?',
    confirmLabel: 'Gửi yêu cầu bổ sung',
    tone: 'default',
    reason: { required: true, label: 'Thông tin cần bổ sung', presets: ['Thiếu giấy phép kinh doanh', 'Địa chỉ chưa rõ'] },
  },
  REJECTED: {
    title: 'Từ chối hồ sơ đối tác?',
    confirmLabel: 'Từ chối',
    tone: 'danger',
    reason: { required: true, label: 'Lý do từ chối', placeholder: 'Bắt buộc khi từ chối' },
  },
};

export const PartnerApplicationsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, set, search: query } = useQueryParams();
  const { toast } = useToast();
  const tab = TABS.some((t) => t.key === get('status')) ? get('status') : 'PENDING';
  const page = Math.max(1, Number(get('page', '1')) || 1);
  const limit = [20, 50, 100].includes(Number(get('limit'))) ? Number(get('limit')) : 20;
  const [search, setSearch] = useState(get('q'));
  const q = useDebounced(search).trim().toLowerCase();
  const [items, setItems] = useState<PartnerApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [extra, setExtra] = useState<PartnerApplication | null>(null);
  const [extraError, setExtraError] = useState('');
  const [dialog, setDialog] = useState<{ app: PartnerApplication; decision: Decision } | null>(null);

  useEffect(() => {
    set({ q: q || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = TABS.find((t) => t.key === tab)?.status;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await AdminBackofficeService.partnerApplications(status, page, limit);
      setItems(result.items || []);
      setTotal(result.total ?? (result.items || []).length);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải hồ sơ.'));
    } finally {
      setLoading(false);
    }
  }, [status, page, limit]);

  const loadCounts = useCallback(async () => {
    const entries = await Promise.all(TABS.map(async (t) => {
      try {
        const result = await AdminBackofficeService.partnerApplications(t.status, 1, 1);
        return [t.key, result.total] as const;
      } catch {
        return [t.key, undefined] as const;
      }
    }));
    setCounts(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((item) => [item.businessName, item.email, item.representativeName].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [items, q]);

  const selected = useMemo(() => items.find((item) => item.id === id) || (extra?.id === id ? extra : null), [items, id, extra]);

  // Mở bằng link trực tiếp mà hồ sơ không nằm trong trang đang xem: tìm trong 100 hồ sơ mới nhất.
  useEffect(() => {
    if (!id || loading || items.some((item) => item.id === id) || extra?.id === id) return;
    let live = true;
    setExtraError('');
    AdminBackofficeService.partnerApplications(undefined, 1, 100)
      .then((result) => {
        if (!live) return;
        const found = (result.items || []).find((item: PartnerApplication) => item.id === id);
        if (found) setExtra(found);
        else setExtraError('Không tìm thấy hồ sơ này trong 100 hồ sơ mới nhất.');
      })
      .catch((requestError) => live && setExtraError(errorMessage(requestError, 'Không thể tải hồ sơ.')));
    return () => {
      live = false;
    };
  }, [id, loading, items, extra]);

  const openRow = (app: PartnerApplication) => navigate(`/admin/partner-applications/${app.id}${query}`);
  const close = () => navigate(`/admin/partner-applications${query}`);

  const decide = async (reason?: string) => {
    if (!dialog) return;
    await PlatformService.decidePartnerApplication(dialog.app.id, dialog.decision, reason || undefined);
    toast({ tone: 'success', message: `Đã cập nhật hồ sơ “${dialog.app.businessName}”.` });
    setExtra(null);
    await Promise.all([load(), loadCounts()]);
  };

  const actionsFor = (app: PartnerApplication) => {
    if (!decidable(app.status)) return [];
    return [
      { label: 'Phê duyệt', icon: Check, tone: 'primary' as const, title: 'Phê duyệt', onClick: () => setDialog({ app, decision: 'APPROVED' }) },
      { label: 'Bổ sung', icon: MessageSquarePlus, title: 'Yêu cầu bổ sung', onClick: () => setDialog({ app, decision: 'NEEDS_MORE_INFO' }) },
      { label: 'Từ chối', icon: X, tone: 'danger' as const, title: 'Từ chối', onClick: () => setDialog({ app, decision: 'REJECTED' }) },
    ];
  };

  const columns: DataColumn<PartnerApplication>[] = [
    {
      key: 'businessName',
      header: 'Doanh nghiệp',
      primary: true,
      render: (row) => (
        <>
          {row.businessName}
          <span className="hgbo-dt__cell-sub">{businessTypeLabel(row.businessType)}</span>
        </>
      ),
    },
    { key: 'representativeName', header: 'Người đại diện' },
    {
      key: 'contact',
      header: 'Liên hệ',
      hideBelow: 1024,
      render: (row) => (
        <>
          {row.email}
          <span className="hgbo-dt__cell-sub">{row.phone}</span>
        </>
      ),
    },
    { key: 'address', header: 'Địa chỉ', hideBelow: 1280, render: (row) => <span className="hgbo-clamp2">{[row.address, row.city].filter(Boolean).join(', ') || '—'}</span> },
    { key: 'createdAt', header: 'Ngày nộp', render: (row) => <span className="hgbo-num">{fmtDateTime(row.createdAt)}</span> },
    { key: 'status', header: 'Trạng thái', render: (row) => <StatusPill status={row.status} domain="partnerApp" /> },
  ];

  const details = selected ? Object.entries(selected.verificationDetails || {}).filter(([, v]) => v !== null && v !== undefined && v !== '') : [];
  const documents = selected?.imageUrls?.filter(Boolean) || [];

  return (
    <div>
      <PageHeader
        title="Duyệt hồ sơ đối tác"
        subtitle="Mỗi quyết định được máy chủ lưu vào nhật ký quản trị."
        actions={(
          <BoButton icon={RefreshCw} loading={loading} aria-label="Làm mới" onClick={() => { load(); loadCounts(); }}>Làm mới</BoButton>
        )}
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, badge: counts[t.key], to: `/admin/partner-applications?status=${t.key}` }))}
        tabValue={tab}
        tabsLabel="Lọc theo trạng thái hồ sơ"
      />
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Tên doanh nghiệp, email, người đại diện', label: 'Tìm hồ sơ đối tác', maxLength: 120 }}
        activeCount={search.trim() ? 1 : 0}
        onReset={() => setSearch('')}
        note={q ? 'Tìm trong trang hiện tại (máy chủ chưa hỗ trợ tìm kiếm hồ sơ).' : undefined}
      />
      <DataTable
        caption="Danh sách hồ sơ đối tác"
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={{ icon: FileCheck2, title: q ? 'Không có hồ sơ khớp tìm kiếm' : 'Chưa có hồ sơ ở trạng thái này' }}
        onRowClick={openRow}
        selectedKey={id}
        rowActions={actionsFor}
        pagination={{ page, limit, total, onChange: (p, l) => set({ page: p > 1 ? p : null, limit: l !== 20 ? l : null }) }}
      />
      <DetailDrawer
        open={!!id}
        onClose={close}
        title={selected?.businessName || 'Hồ sơ đối tác'}
        subtitle={selected ? businessTypeLabel(selected.businessType) : undefined}
        status={selected?.status}
        statusDomain="partnerApp"
        loading={!!id && !selected && !extraError && (loading || !extraError)}
        error={!selected ? extraError || null : null}
        footer={selected && decidable(selected.status) ? (
          <>
            <BoButton variant="secondary" icon={MessageSquarePlus} onClick={() => setDialog({ app: selected, decision: 'NEEDS_MORE_INFO' })}>Yêu cầu bổ sung</BoButton>
            <BoButton variant="danger" icon={X} onClick={() => setDialog({ app: selected, decision: 'REJECTED' })}>Từ chối</BoButton>
            <BoButton variant="primary" icon={Check} onClick={() => setDialog({ app: selected, decision: 'APPROVED' })}>Phê duyệt</BoButton>
          </>
        ) : undefined}
      >
        {selected && (
          <>
            <DrawerSection title="Thông tin doanh nghiệp">
              <DescList
                items={[
                  { label: 'Tên doanh nghiệp', value: selected.businessName },
                  { label: 'Loại hình', value: businessTypeLabel(selected.businessType) },
                  { label: 'Địa chỉ', value: selected.address },
                  { label: 'Tỉnh/thành', value: selected.city },
                  { label: 'Ngày nộp', value: fmtDateTime(selected.createdAt) },
                  ...details.map(([key, value]) => ({ label: DETAIL_LABEL[key] || key, value: String(value) })),
                ]}
              />
            </DrawerSection>
            <DrawerSection title="Người đại diện & liên hệ">
              <DescList
                items={[
                  { label: 'Người đại diện', value: selected.representativeName },
                  { label: 'Email', value: selected.email },
                  { label: 'Điện thoại', value: selected.phone },
                ]}
              />
            </DrawerSection>
            <DrawerSection title="Tài liệu">
              {documents.length ? (
                <ul className="hgbo-stack hgbo-stack--sm">
                  {documents.map((url, index) => (
                    <li key={url}>
                      <a className="hgbo-link" href={url} target="_blank" rel="noopener noreferrer">Tài liệu {index + 1}</a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hgbo-muted">Hồ sơ không kèm tài liệu.</p>
              )}
            </DrawerSection>
            <DrawerSection title="Quyết định gần nhất">
              {selected.decisionReason || selected.reviewedAt ? (
                <DescList
                  items={[
                    { label: 'Trạng thái', value: <StatusPill status={selected.status} domain="partnerApp" size="sm" /> },
                    { label: 'Lý do', value: selected.decisionReason },
                    { label: 'Thời điểm', value: selected.reviewedAt ? fmtDateTime(selected.reviewedAt) : null },
                  ]}
                />
              ) : (
                <p className="hgbo-muted">Chưa có quyết định cho hồ sơ này.</p>
              )}
            </DrawerSection>
          </>
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={!!dialog}
        {...(dialog ? DIALOG[dialog.decision] : DIALOG.APPROVED)}
        description={dialog ? `Hồ sơ “${dialog.app.businessName}”.` : undefined}
        onConfirm={decide}
        onClose={() => setDialog(null)}
      />
    </div>
  );
};
