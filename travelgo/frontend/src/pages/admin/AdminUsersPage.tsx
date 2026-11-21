import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, LockOpen, Save, ShieldAlert, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminBackofficeService } from '../../services/adminBackofficeService';
import {
  ApiPendingState,
  AuditList,
  BO_FEATURES,
  BO_FEATURE_CONTRACT,
  BoButton,
  CheckboxGroup,
  ConfirmDialog,
  ConflictBanner,
  DataColumn,
  DataTable,
  DescList,
  DetailDrawer,
  DrawerSection,
  FilterBar,
  FilterSelect,
  PageHeader,
  StatusPill,
  errorCode,
  errorMessage,
  fmtDateTime,
  fmtNumber,
  initials,
  roleLabel,
  useBackofficeBreadcrumbs,
  useQueryParams,
  useToast,
} from '../../components/backoffice';

const EDITABLE_ROLES = ['CUSTOMER', 'PARTNER'];
const ROLE_OPTIONS = ['CUSTOMER', 'PARTNER', 'SUPER_ADMIN'].map((r) => ({ value: r, label: roleLabel(r) }));
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'SUSPENDED', label: 'Tạm ngưng' },
];

const ERRORS: Record<string, string> = {
  SELF_ACTION_FORBIDDEN: 'Không thể tự thay đổi quyền hoặc trạng thái của chính mình.',
  OWNER_PROTECTED: 'Không thể khóa tài khoản quản trị viên khác.',
  ROLE_GRANT_FORBIDDEN: 'Không cấp hoặc thu quyền quản trị qua giao diện.',
  USER_VERSION_CONFLICT: 'Tài khoản đã được thay đổi ở nơi khác. Tải lại để xem bản mới nhất.',
  USER_STATUS_UNCHANGED: 'Trạng thái tài khoản không thay đổi.',
};

const SELF_TIP = 'Không thể tự thay đổi quyền hoặc trạng thái của chính mình';

const RoleChips: React.FC<{ roles: string[] }> = ({ roles }) => (
  <span className="hgbo-roles">
    {roles.map((role) => (
      <span key={role} className="hgbo-chiprole">
        {role === 'SUPER_ADMIN' && <Lock aria-hidden="true" />}
        {roleLabel(role)}
      </span>
    ))}
  </span>
);

const UsersInner: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { toast } = useToast();
  const { get, set, search: query } = useQueryParams();
  const page = Math.max(1, Number(get('page', '1')) || 1);
  const role = get('role');
  const status = get('status');
  const serverSearch = get('q');
  const [search, setSearch] = useState(serverSearch);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [dialog, setDialog] = useState<'roles' | 'status' | null>(null);
  const [conflict, setConflict] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (serverSearch) params.search = serverSearch;
      if (role) params.role = role;
      if (status) params.status = status;
      const result = await AdminBackofficeService.users(params);
      setItems(result.items || []);
      setTotal(result.total ?? 0);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải danh sách người dùng.'));
    } finally {
      setLoading(false);
    }
  }, [page, serverSearch, role, status]);

  const loadDetail = useCallback(async () => {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    setConflict(false);
    try {
      const data = await AdminBackofficeService.user(id);
      setDetail(data);
      setRoles((data.roles || []).filter((r: string) => EDITABLE_ROLES.includes(r)));
    } catch (requestError) {
      setDetail(null);
      setDetailError(errorMessage(requestError, 'Không thể tải người dùng.'));
    } finally {
      setDetailLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const isSelf = !!detail && !!me && detail.id === me.id;
  const isAdmin = !!detail && (detail.roles || []).includes('SUPER_ADMIN');
  const currentEditable = useMemo(() => (detail?.roles || []).filter((r: string) => EDITABLE_ROLES.includes(r)).sort().join(','), [detail]);
  const rolesDirty = roles.slice().sort().join(',') !== currentEditable;
  const removingPartner = !!detail && (detail.roles || []).includes('PARTNER') && !roles.includes('PARTNER');
  const nextRoles = isAdmin ? [...roles, 'SUPER_ADMIN'] : roles;

  const mapError = (requestError: unknown) => {
    const code = errorCode(requestError);
    if (code === 'USER_VERSION_CONFLICT') setConflict(true);
    return (code && ERRORS[code]) || errorMessage(requestError, 'Không thực hiện được thao tác.');
  };

  const saveRoles = async (reason?: string) => {
    if (!detail) return;
    await AdminBackofficeService.setUserRoles(detail.id, nextRoles, reason || '', detail.version);
    toast({ tone: 'success', message: 'Đã lưu vai trò.' });
    await Promise.all([loadDetail(), load()]);
  };

  const toggleStatus = async (reason?: string) => {
    if (!detail) return;
    await AdminBackofficeService.setUserStatus(detail.id, detail.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED', reason || '', detail.version);
    toast({ tone: 'success', message: detail.status === 'SUSPENDED' ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.' });
    await Promise.all([loadDetail(), load()]);
  };

  const columns: DataColumn<any>[] = [
    {
      key: 'name',
      header: 'Họ tên',
      primary: true,
      render: (row) => (
        <span className="hgbo-userhead">
          <span className="hgbo-avatar" aria-hidden="true">{initials(row.fullName)}</span>
          <span>
            {row.fullName || '—'}
            <span className="hgbo-dt__cell-sub">{row.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'phone', header: 'Điện thoại', hideBelow: 1280 },
    { key: 'roles', header: 'Vai trò', render: (row) => <RoleChips roles={row.roles || []} /> },
    { key: 'status', header: 'Trạng thái', render: (row) => <StatusPill status={row.status} domain="user" /> },
    { key: 'businessCount', header: 'Doanh nghiệp', align: 'right', hideBelow: 1024, render: (row) => <span className="hgbo-num">{fmtNumber(row.businessCount)}</span> },
    { key: 'bookingCount', header: 'Booking', align: 'right', hideBelow: 1024, render: (row) => <span className="hgbo-num">{fmtNumber(row.bookingCount)}</span> },
    { key: 'createdAt', header: 'Ngày tạo', hideBelow: 1280, render: (row) => <span className="hgbo-num">{fmtDateTime(row.createdAt)}</span> },
  ];

  const filterCount = (serverSearch ? 1 : 0) + (role ? 1 : 0) + (status ? 1 : 0);
  const statusTip = isSelf ? SELF_TIP : isAdmin ? 'Không khóa tài khoản quản trị viên qua giao diện' : undefined;

  return (
    <>
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Tên hoặc email rồi nhấn Enter', label: 'Tìm người dùng', maxLength: 120 }}
        activeCount={filterCount}
        onSubmit={() => set({ q: search.trim() || null, page: null })}
        onReset={() => {
          setSearch('');
          set({ q: null, role: null, status: null, page: null });
        }}
      >
        <FilterSelect label="Vai trò" value={role} onChange={(v) => set({ role: v || null, page: null })} options={ROLE_OPTIONS} />
        <FilterSelect label="Trạng thái" value={status} onChange={(v) => set({ status: v || null, page: null })} options={STATUS_OPTIONS} />
      </FilterBar>
      <DataTable
        caption="Danh sách người dùng"
        columns={columns}
        rows={items}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={{ icon: Users, title: filterCount ? 'Không có người dùng khớp bộ lọc' : 'Chưa có người dùng' }}
        onRowClick={(row) => navigate(`/admin/users/${row.id}${query}`)}
        selectedKey={id}
        pagination={{ page, limit: 20, total, sizes: [20], onChange: (p) => set({ page: p > 1 ? p : null }) }}
      />
      <DetailDrawer
        open={!!id}
        onClose={() => navigate(`/admin/users${query}`)}
        title={detail?.fullName || 'Người dùng'}
        subtitle={detail?.email}
        status={detail?.status}
        statusDomain="user"
        loading={detailLoading}
        error={detailError || null}
        onRetry={loadDetail}
      >
        {detail && (
          <>
            {conflict && <ConflictBanner onReload={loadDetail} busy={detailLoading} />}
            <DrawerSection title="Thông tin">
              <DescList
                items={[
                  { label: 'Họ tên', value: detail.fullName },
                  { label: 'Email', value: detail.email },
                  { label: 'Điện thoại', value: detail.phone },
                  { label: 'Doanh nghiệp', value: fmtNumber(detail.businessCount) },
                  { label: 'Booking', value: fmtNumber(detail.bookingCount) },
                  { label: 'Ngày tạo', value: fmtDateTime(detail.createdAt) },
                  { label: 'Lý do trạng thái', value: detail.statusReason, hidden: !detail.statusReason },
                ]}
              />
            </DrawerSection>
            <DrawerSection title="Vai trò">
              <div className="hgbo-stack hgbo-stack--sm">
                <CheckboxGroup
                  legend="Vai trò được cấp"
                  options={[
                    { value: 'CUSTOMER', label: roleLabel('CUSTOMER'), disabled: isSelf, title: isSelf ? SELF_TIP : undefined },
                    { value: 'PARTNER', label: roleLabel('PARTNER'), disabled: isSelf, title: isSelf ? SELF_TIP : undefined },
                  ]}
                  value={roles}
                  onChange={setRoles}
                  error={roles.length === 0 && !isAdmin ? 'Cần ít nhất một vai trò.' : null}
                />
                {isAdmin && (
                  <p className="hgbo-row">
                    <RoleChips roles={['SUPER_ADMIN']} />
                    <span className="hgbo-muted hgbo-small">Không cấp hoặc thu quyền quản trị qua giao diện.</span>
                  </p>
                )}
                <div>
                  <BoButton
                    variant="primary"
                    icon={Save}
                    disabled={isSelf || !rolesDirty || nextRoles.length === 0}
                    title={isSelf ? SELF_TIP : undefined}
                    onClick={() => setDialog('roles')}
                  >
                    Lưu vai trò
                  </BoButton>
                </div>
              </div>
            </DrawerSection>
            <DrawerSection title="Trạng thái tài khoản">
              <div className="hgbo-row">
                <StatusPill status={detail.status} domain="user" />
                {detail.status === 'SUSPENDED' ? (
                  <BoButton variant="secondary" icon={LockOpen} disabled={isSelf || isAdmin} title={statusTip} onClick={() => setDialog('status')}>Mở khóa</BoButton>
                ) : (
                  <BoButton variant="danger" icon={ShieldAlert} disabled={isSelf || isAdmin} title={statusTip} onClick={() => setDialog('status')}>Khóa tài khoản</BoButton>
                )}
              </div>
              {statusTip && <p className="hgbo-muted hgbo-small">{statusTip}.</p>}
            </DrawerSection>
            <DrawerSection title="Lịch sử">
              <AuditList
                items={(detail.audit || []).map((a: any) => ({ action: a.action, reason: a.reason, actorName: a.actorName, at: a.createdAt }))}
              />
            </DrawerSection>
          </>
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={dialog === 'roles'}
        title="Lưu vai trò?"
        description={detail ? `Tài khoản ${detail.email}: ${nextRoles.map(roleLabel).join(', ')}.` : undefined}
        impact={removingPartner ? <p>Doanh nghiệp không bị xóa; tài khoản mất quyền truy cập kênh đối tác.</p> : undefined}
        confirmLabel="Lưu vai trò"
        reason={{ required: true, label: 'Lý do đổi vai trò' }}
        onConfirm={saveRoles}
        mapError={mapError}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'status'}
        tone={detail?.status === 'SUSPENDED' ? 'default' : 'danger'}
        title={detail?.status === 'SUSPENDED' ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?'}
        description={detail?.email}
        impact={detail?.status === 'SUSPENDED' ? undefined : <p>Tài khoản không đăng nhập được; phiên hiện có bị máy chủ từ chối.</p>}
        confirmLabel={detail?.status === 'SUSPENDED' ? 'Mở khóa' : 'Khóa tài khoản'}
        reason={{ required: true, label: 'Lý do' }}
        onConfirm={toggleStatus}
        mapError={mapError}
        onClose={() => setDialog(null)}
      />
    </>
  );
};

export const AdminUsersPage: React.FC = () => {
  useBackofficeBreadcrumbs([{ label: 'Vận hành' }, { label: 'Người dùng & vai trò' }]);
  return (
    <div>
      <PageHeader
        title="Người dùng & vai trò"
        subtitle="Quản lý trạng thái và vai trò theo phân quyền hiện có. Không hiển thị mật khẩu hay token."
      />
      {BO_FEATURES.adminUsers ? (
        <UsersInner />
      ) : (
        <ApiPendingState feature="Quản lý người dùng & vai trò" contractRef={BO_FEATURE_CONTRACT.adminUsers} />
      )}
    </div>
  );
};
