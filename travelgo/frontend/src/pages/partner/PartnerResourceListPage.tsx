// Dịch vụ khác (Địa điểm/Tour/Vé/Bài viết): chỉ đổi giao diện. Giữ route :resource, lời gọi API, nút "Gửi duyệt",
// data-testid `partner-${resource}-row` và aria-label "Ngừng hiển thị …". window.confirm → ConfirmDialog.
import React, { useEffect, useState } from 'react';
import { ArrowRight, ImageOff, Inbox, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  BoButton,
  BoLinkButton,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterSelect,
  PageHeader,
  Skeleton,
  StatusPill,
  boButtonClass,
  errorMessage,
  fmtVnd,
  statusLabel,
} from '../../components/backoffice';
import { ManagementService, PartnerResource } from '../../services/managementService';
import '../../styles/hg-partner.css';

const labels: Record<PartnerResource, string> = {
  places: 'Địa điểm khác',
  tours: 'Tour du lịch',
  tickets: 'Vé & tồn kho',
  blogs: 'Bài viết',
};
const allowed = new Set(Object.keys(labels));
const titleOf = (resource: PartnerResource, item: any) => (resource === 'places' ? item.name : item.title);
const priceOf = (resource: PartnerResource, item: any) => (resource === 'places' ? item.priceFrom : resource === 'tours' ? item.priceVND : resource === 'tickets' ? item.price : null);
const TICKET_STATUS: Record<string, string> = { ACTIVE: 'Đang bán', INACTIVE: 'Ngừng bán' };
const statusText = (resource: PartnerResource, status: string) => (resource === 'tickets' ? TICKET_STATUS[status] || status : statusLabel(status, 'moderation'));

export const PartnerResourceListPage: React.FC = () => {
  const resource = String(useParams().resource) as PartnerResource;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [archiving, setArchiving] = useState<{ id: string; title: string } | null>(null);
  const [submitting, setSubmitting] = useState('');

  const load = async (nextPage = page) => {
    if (!allowed.has(resource)) return;
    setLoading(true);
    setError('');
    try {
      const result = await ManagementService.partnerList(resource, { search, status: status || undefined, page: nextPage, limit: 20 });
      setItems(result.items || []);
      setPages(result.pages || Math.max(1, Math.ceil(result.total / result.limit)));
      setTotal(typeof result.total === 'number' ? result.total : null);
      setPage(nextPage);
    } catch (requestError: any) {
      setError(requestError?.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, status]);

  const submit = async (id: string) => {
    if (resource === 'tickets') return;
    setSubmitting(id);
    setActionError('');
    try {
      await ManagementService.partnerSubmit(resource, id);
      await load();
    } catch (requestError: any) {
      setActionError(requestError?.message || 'Không thể gửi duyệt.');
    } finally {
      setSubmitting('');
    }
  };

  if (!allowed.has(resource)) {
    return <EmptyState title="Module không tồn tại." />;
  }

  const statusOptions = resource === 'tickets'
    ? ['ACTIVE', 'INACTIVE'].map((value) => ({ value, label: TICKET_STATUS[value] }))
    : ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((value) => ({ value, label: statusLabel(value, 'moderation') }));

  return (
    <div className="hgp-page hgbo-stack">
      <PageHeader
        title={labels[resource]}
        subtitle="Dữ liệu chỉ gồm các cơ sở bạn được phân quyền."
        actions={(
          <BoLinkButton variant="primary" icon={Plus} to={`/partner/${resource}/new`}>
            Tạo mới
          </BoLinkButton>
        )}
      />
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Tìm theo tên…', label: 'Tìm theo tên' }}
        activeCount={(status ? 1 : 0) + (search.trim() ? 1 : 0)}
        onSubmit={() => load(1)}
        onReset={() => {
          setSearch('');
          setStatus('');
        }}
        note="Nhấn Enter để tìm."
      >
        <FilterSelect
          label="Trạng thái"
          allLabel="Mọi trạng thái"
          value={status}
          options={statusOptions}
          onChange={setStatus}
        />
        <div className="hgp-filter-action">
          <BoButton variant="secondary" icon={RefreshCw} aria-label="Tải lại" loading={loading} onClick={() => load(1)} />
        </div>
      </FilterBar>
      {actionError && <Alert tone="danger">{actionError}</Alert>}
      {error ? (
        <ErrorState message={error} onRetry={() => load(1)} />
      ) : (
        <div className="hgbo-dt hgp-rtable">
          <div className="hgbo-dt__scroll">
            <table className="hgbo-dt__table">
              <caption className="hgbo-sr">{labels[resource]}</caption>
              <thead>
                <tr>
                  <th scope="col" className="is-primary">Nội dung</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col" className="hgbo-hide-768">Giá / Sức chứa</th>
                  <th scope="col" className="is-right"><span className="hgbo-sr">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {loading && !items.length && Array.from({ length: 5 }, (_, i) => (
                  <tr key={`s${i}`} className="hgbo-dt__skel">
                    <td><Skeleton width="70%" /></td>
                    <td><Skeleton width={80} /></td>
                    <td className="hgbo-hide-768"><Skeleton width={100} /></td>
                    <td />
                  </tr>
                ))}
                {!loading && !items.length && (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState plain icon={Inbox} title="Chưa có dữ liệu" description="Hãy tạo nội dung đầu tiên." />
                    </td>
                  </tr>
                )}
                {items.map((item) => {
                  const title = titleOf(resource, item);
                  const archived = resource === 'tickets' ? item.status === 'INACTIVE' : item.status === 'SUSPENDED';
                  const image = item.heroImage || item.coverImage || item.imageUrl;
                  const price = priceOf(resource, item);
                  return (
                    <tr key={item.id} data-testid={`partner-${resource}-row`} className="hgbo-dt__row">
                      <td className="is-primary">
                        <div className="hgp-rtable__main">
                          {image ? (
                            <img src={image} className="hgbo-thumb" alt="" />
                          ) : (
                            <span className="hgbo-thumb" aria-hidden="true"><ImageOff /></span>
                          )}
                          <div className="hgp-cellstack">
                            <span className="hgbo-strong">{title}</span>
                            <span className="hgbo-dt__cell-sub">{item.city || item.destinationCity || item.departureCity || item.destinationName}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusPill status={item.status} domain="moderation" size="sm" label={item.status ? statusText(resource, item.status) : '—'} tone={resource === 'tickets' ? (item.status === 'ACTIVE' ? 'success' : 'neutral') : undefined} />
                      </td>
                      <td className="hgbo-hide-768">
                        <span className="hgbo-num">{price !== null && price !== undefined ? fmtVnd(price) : ''}</span>
                        {resource === 'tickets' && <span className="hgbo-dt__cell-sub hgp-block">{item.availableSeats}/{item.capacity} chỗ</span>}
                        {resource === 'tours' && <span className="hgbo-dt__cell-sub hgp-block">{item.availableCapacity}/{item.capacity} chỗ</span>}
                      </td>
                      <td className="is-right">
                        <div className="hgbo-dt__actions">
                          {resource !== 'tickets' && ['DRAFT', 'REJECTED'].includes(item.status) && (
                            <BoButton variant="secondary" size="sm" icon={Send} loading={submitting === item.id} onClick={() => submit(item.id)}>Gửi duyệt</BoButton>
                          )}
                          <Link to={`/partner/${resource}/${item.id}/edit`} className={boButtonClass('ghost', 'sm')}>
                            <span className="hgbo-btn__content">
                              Chi tiết
                              <ArrowRight aria-hidden="true" />
                            </span>
                          </Link>
                          {!archived && (
                            <BoButton variant="ghost-danger" size="sm" icon={Trash2} aria-label={`Ngừng hiển thị ${title}`} onClick={() => setArchiving({ id: item.id, title })} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <nav className="hgbo-pager" aria-label="Phân trang">
        <span className="hgbo-num">{total === null ? `Trang ${page}/${pages}` : `Trang ${page}/${pages} · ${total} mục`}</span>
        <div className="hgbo-pager__pages">
          <BoButton variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>Trang trước</BoButton>
          <BoButton variant="secondary" size="sm" disabled={page >= pages || loading} onClick={() => load(page + 1)}>Trang sau</BoButton>
        </div>
      </nav>
      <ConfirmDialog
        open={!!archiving}
        title="Ngừng hiển thị"
        tone="danger"
        description={archiving ? `Ngừng hiển thị “${archiving.title}”? Dữ liệu sẽ được giữ lại để kiểm toán.` : undefined}
        confirmLabel="Ngừng hiển thị"
        onClose={() => setArchiving(null)}
        onConfirm={async () => {
          try {
            await ManagementService.partnerDelete(resource, archiving!.id);
          } catch (requestError) {
            throw new Error(errorMessage(requestError, 'Không thể ngừng hiển thị nội dung.'));
          }
          await load();
        }}
      />
    </div>
  );
};
