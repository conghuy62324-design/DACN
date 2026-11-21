import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, Eye, ImageOff, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { ManagementService, ModeratedResource } from '../../services/managementService';
import {
  BoButton,
  ConfirmDialog,
  ConfirmDialogProps,
  DataColumn,
  DataTable,
  DescList,
  DetailDrawer,
  DrawerSection,
  EmptyState,
  FilterBar,
  PageHeader,
  StatusPill,
  errorMessage,
  fmtDateTime,
  useBackofficeBreadcrumbs,
  useQueryParams,
  useToast,
} from '../../components/backoffice';

const LABELS: Record<ModeratedResource, { one: string; title: string }> = {
  places: { one: 'địa điểm', title: 'Duyệt địa điểm' },
  tours: { one: 'tour', title: 'Duyệt tour' },
  blogs: { one: 'bài viết', title: 'Duyệt bài viết' },
};
const MENU_LABEL: Record<ModeratedResource, string> = { places: 'Địa điểm', tours: 'Tour', blogs: 'Bài viết' };

const TABS = [
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Bị từ chối' },
  { key: 'SUSPENDED', label: 'Tạm ngưng' },
  { key: 'DRAFT', label: 'Bản nháp' },
];

type Decision = 'APPROVED' | 'REJECTED' | 'SUSPENDED';

const imageOf = (item: any): string | undefined => item?.heroImage || item?.coverImage || item?.images?.[0] || undefined;
const nameOf = (item: any): string => item?.name || item?.title || '—';
const ownerOf = (item: any, resource: ModeratedResource): string => {
  if (resource === 'blogs') return item?.business?.name || item?.authorName || 'Nội dung khách hàng';
  return item?.business?.name || item?.businessName || '—';
};

const Thumb: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="hgbo-thumb" aria-hidden="true">
        <ImageOff />
      </span>
    );
  }
  return <img className="hgbo-thumb" src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
};

function actionsFor(status: string): Decision[] {
  if (status === 'APPROVED') return ['SUSPENDED'];
  if (status === 'SUSPENDED') return ['APPROVED'];
  if (status === 'REJECTED') return ['SUSPENDED', 'APPROVED'];
  return ['SUSPENDED', 'REJECTED', 'APPROVED'];
}

export const AdminModerationPage: React.FC = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const resource = (location.pathname.split('/')[2] || '') as ModeratedResource;
  const label = LABELS[resource];
  const { get, set, search: query } = useQueryParams();
  const status = TABS.some((t) => t.key === get('status')) ? get('status') : 'PENDING';
  const page = Math.max(1, Number(get('page', '1')) || 1);
  const limit = [20, 50, 100].includes(Number(get('limit'))) ? Number(get('limit')) : 20;
  const serverSearch = get('q');
  const [search, setSearch] = useState(serverSearch);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [dialog, setDialog] = useState<Decision | null>(null);

  useBackofficeBreadcrumbs(label ? [{ label: 'Kiểm duyệt' }, { label: MENU_LABEL[resource] }] : null);

  useEffect(() => {
    setSearch(serverSearch);
  }, [serverSearch, resource]);

  const load = useCallback(async () => {
    if (!label) return;
    setLoading(true);
    setError('');
    try {
      const result = await ManagementService.adminList(resource, { status, page, limit, ...(serverSearch ? { search: serverSearch } : {}) });
      setItems(result.items || []);
      setTotal(result.total ?? (result.items || []).length);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải hàng chờ duyệt.'));
    } finally {
      setLoading(false);
    }
  }, [resource, label, status, page, limit, serverSearch]);

  const loadDetail = useCallback(async () => {
    if (!label || !params.id) {
      setSelected(null);
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    try {
      setSelected(await ManagementService.adminGet(resource, params.id));
    } catch (requestError) {
      setSelected(null);
      setDetailError(errorMessage(requestError, 'Không thể tải nội dung.'));
    } finally {
      setDetailLoading(false);
    }
  }, [resource, label, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (!label) {
    return <EmptyState title="Module không tồn tại." />;
  }

  const close = () => navigate(`/admin/${resource}${query}`);

  const decide = async (reason?: string) => {
    if (!selected || !dialog) return;
    await ManagementService.moderate(resource, selected.id, dialog, reason);
    toast({ tone: 'success', message: `Đã cập nhật “${nameOf(selected)}”.` });
    await Promise.all([load(), loadDetail()]);
  };

  const dialogConfig: Record<Decision, Pick<ConfirmDialogProps, 'title' | 'confirmLabel' | 'tone' | 'reason' | 'impact'>> = {
    APPROVED: {
      title: selected?.status === 'SUSPENDED' ? `Phê duyệt lại ${label.one}?` : `Phê duyệt ${label.one}?`,
      confirmLabel: 'Phê duyệt',
      tone: 'default',
      reason: { required: false, label: 'Ghi chú (không bắt buộc)' },
      impact: <p>Nội dung được hiển thị công khai theo quy tắc của máy chủ.</p>,
    },
    REJECTED: {
      title: `Từ chối ${label.one}?`,
      confirmLabel: 'Từ chối',
      tone: 'danger',
      reason: { required: true, label: 'Lý do từ chối', placeholder: 'Bắt buộc khi từ chối' },
    },
    SUSPENDED: {
      title: `Tạm ngưng ${label.one}?`,
      confirmLabel: 'Tạm ngưng',
      tone: 'danger',
      reason: { required: true, label: 'Lý do tạm ngưng' },
      impact: <p>Nội dung bị ẩn khỏi trang công khai cho đến khi được phê duyệt lại.</p>,
    },
  };

  const columns: DataColumn<any>[] = [
    { key: 'image', header: 'Ảnh', width: 88, card: 'hide', render: (row) => <Thumb src={imageOf(row)} alt="" /> },
    {
      key: 'name',
      header: resource === 'blogs' ? 'Tiêu đề' : 'Tên',
      primary: true,
      render: (row) => (
        <>
          <span className="hgbo-clamp2">{nameOf(row)}</span>
          {(row.summary || row.excerpt) && <span className="hgbo-dt__cell-sub hgbo-clamp2 hgbo-hide-1024">{row.summary || row.excerpt}</span>}
        </>
      ),
    },
    { key: 'owner', header: resource === 'blogs' ? 'Tác giả' : 'Doanh nghiệp', hideBelow: 1024, render: (row) => ownerOf(row, resource) },
    { key: 'updatedAt', header: 'Cập nhật', render: (row) => <span className="hgbo-num">{fmtDateTime(row.updatedAt || row.createdAt)}</span> },
    { key: 'status', header: 'Trạng thái', render: (row) => <StatusPill status={row.status} domain="moderation" /> },
  ];

  const footerButtons = selected ? actionsFor(String(selected.status)).map((decision) => {
    if (decision === 'SUSPENDED') return <BoButton key={decision} variant="danger" icon={ShieldAlert} onClick={() => setDialog('SUSPENDED')}>Tạm ngưng</BoButton>;
    if (decision === 'REJECTED') return <BoButton key={decision} variant="danger" icon={X} onClick={() => setDialog('REJECTED')}>Từ chối</BoButton>;
    return (
      <BoButton key={decision} variant="primary" icon={Check} onClick={() => setDialog('APPROVED')}>
        {selected.status === 'SUSPENDED' ? 'Phê duyệt lại' : 'Phê duyệt'}
      </BoButton>
    );
  }) : null;

  return (
    <div>
      <PageHeader
        title={label.title}
        actions={<BoButton icon={RefreshCw} loading={loading} onClick={load}>Làm mới</BoButton>}
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, to: `/admin/${resource}?status=${t.key}` }))}
        tabValue={status}
        tabsLabel="Lọc theo trạng thái kiểm duyệt"
      />
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: `Tìm ${label.one} rồi nhấn Enter`, label: `Tìm ${label.one}`, maxLength: 120 }}
        activeCount={serverSearch ? 1 : 0}
        onSubmit={() => set({ q: search.trim() || null, page: null })}
        onReset={() => {
          setSearch('');
          set({ q: null, page: null });
        }}
      />
      <DataTable
        caption={`Hàng chờ duyệt ${label.one}`}
        columns={columns}
        rows={items}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={{ title: `Không có ${label.one} ở trạng thái “${TABS.find((t) => t.key === status)?.label}”.` }}
        onRowClick={(row) => navigate(`/admin/${resource}/${row.id}${query}`)}
        selectedKey={params.id}
        rowActions={(row) => [{ label: 'Xem', icon: Eye, to: `/admin/${resource}/${row.id}${query}` }]}
        pagination={{ page, limit, total, onChange: (p, l) => set({ page: p > 1 ? p : null, limit: l !== 20 ? l : null }) }}
      />
      <DetailDrawer
        open={!!params.id}
        onClose={close}
        width="lg"
        title={selected ? nameOf(selected) : `Chi tiết ${label.one}`}
        subtitle={selected ? `${resource === 'blogs' ? 'Tác giả' : 'Doanh nghiệp'}: ${ownerOf(selected, resource)}` : undefined}
        status={selected?.status}
        statusDomain="moderation"
        loading={detailLoading}
        error={detailError || null}
        onRetry={loadDetail}
        footer={footerButtons}
      >
        {selected && (
          <>
            {imageOf(selected) && <img className="hgbo-hero-img" src={imageOf(selected)} alt="" />}
            <DrawerSection title={resource === 'blogs' ? 'Nội dung' : 'Mô tả'}>
              <p className="hgbo-pre">{selected.description || selected.content || selected.summary || selected.excerpt || 'Chưa có nội dung.'}</p>
            </DrawerSection>
            <DrawerSection title="Thông tin">
              <DescList
                items={[
                  { label: resource === 'blogs' ? 'Tác giả' : 'Doanh nghiệp', value: ownerOf(selected, resource) },
                  { label: 'Thành phố', value: selected.city || selected.destinationCity, hidden: resource === 'blogs' },
                  { label: 'Địa chỉ', value: selected.address, hidden: resource !== 'places' },
                  { label: 'Thời lượng', value: selected.durationDays ? `${selected.durationDays} ngày ${selected.durationNights ?? 0} đêm` : null, hidden: resource !== 'tours' },
                  { label: 'Cập nhật', value: fmtDateTime(selected.updatedAt || selected.createdAt) },
                  { label: 'Lý do gần nhất', value: selected.moderationReason || selected.statusReason },
                ]}
              />
            </DrawerSection>
          </>
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={!!dialog}
        {...dialogConfig[dialog || 'APPROVED']}
        description={selected ? `“${nameOf(selected)}”` : undefined}
        onConfirm={decide}
        onClose={() => setDialog(null)}
      />
    </div>
  );
};
