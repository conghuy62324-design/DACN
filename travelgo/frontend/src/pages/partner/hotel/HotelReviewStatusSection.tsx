import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { AuditList, BoButton, ConfirmDialog, StatusPill } from '../../../components/backoffice';
import { SectionProps } from './shared';

export const auditItems = (s: any) => (Array.isArray(s.audit) ? s.audit : []).map((a: any) => ({ action: a.action, at: a.created_at || a.createdAt, reason: a.reason }));

type Decision = { decision: 'APPROVED' | 'REJECTED' | 'SUSPENDED'; label: string; tone: 'default' | 'danger'; impact?: string };

const compareRows = (s: any) => {
  const p = s.publishedSnapshot || {};
  return [
    { label: 'Tên', before: p.identity?.name, after: s.identity.name },
    { label: 'Địa chỉ', before: p.address?.fullAddress, after: s.address?.fullAddress },
    { label: 'Hạng phòng', before: p.rooms?.map((r: any) => r.name).join(', '), after: s.rooms.map((r: any) => r.name).join(', ') },
    { label: 'Mô tả', before: p.identity?.description, after: s.identity.description },
  ];
};

const AdminDecision: React.FC<SectionProps> = ({ s, write }) => {
  const [open, setOpen] = useState<Decision | null>(null);
  const v = s.authority.contentVersion;
  const approved = s.authority.approvedContentVersion;
  const decisions: Decision[] = [
    { decision: 'APPROVED', label: `Duyệt nội dung v${v}`, tone: 'default', impact: 'Nội dung hiện tại được công bố trên trang công khai.' },
    { decision: 'REJECTED', label: 'Từ chối và yêu cầu sửa', tone: 'danger', impact: 'Đối tác cần sửa và gửi lại; nội dung chờ duyệt không được công bố.' },
    { decision: 'SUSPENDED', label: 'Tạm ngừng công khai', tone: 'danger', impact: 'Khách sạn bị ẩn khỏi tìm kiếm và trang công khai.' },
  ];
  return (
    <div className="hgbo-stack">
      <section className="hgbo-card">
        <h2 className="hgbo-section-title">So sánh nội dung</h2>
        {s.publishedSnapshot ? (
          <div className="hgbo-dt__scroll">
            <table className="hgbo-dt__table hgp-compare">
              <caption className="hgbo-sr">So sánh bản đã công bố và bản chờ duyệt</caption>
              <thead>
                <tr>
                  <th scope="col">Trường</th>
                  <th scope="col">Đã công bố {approved == null ? '' : `(v${approved})`}</th>
                  <th scope="col">Bản chờ duyệt (v{v})</th>
                </tr>
              </thead>
              <tbody>
                {compareRows(s).map((row) => {
                  const changed = (row.before ?? '') !== (row.after ?? '');
                  return (
                    <tr key={row.label} className={changed ? 'hgp-compare__changed' : undefined}>
                      <th scope="row">
                        {row.label}
                        {changed && <StatusPill status="PENDING" label="Đã thay đổi" size="sm" className="hgp-ml" />}
                      </th>
                      <td className="hgbo-pre">{row.before ?? '—'}</td>
                      <td className="hgbo-pre">{row.after ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hgbo-muted">Chưa có bản công bố trước để so sánh.</p>
        )}
      </section>
      <section className="hgbo-card">
        <h2 className="hgbo-section-title">Quyết định kiểm duyệt</h2>
        <p className="hgbo-small hgbo-muted">Thay đổi giá/tồn được quản lý riêng. Mỗi quyết định cần lý do và được ghi lịch sử.</p>
        <div className="hgbo-row hgp-mt">
          {decisions.map((d) => (
            <BoButton
              key={d.decision}
              variant={d.tone === 'danger' ? 'danger' : 'primary'}
              onClick={() => setOpen(d)}
            >
              {d.label}
            </BoButton>
          ))}
        </div>
      </section>
      <section className="hgbo-card">
        <h2 className="hgbo-section-title">Lịch sử quyết định</h2>
        <AuditList items={auditItems(s)} />
      </section>
      <ConfirmDialog
        open={!!open}
        title={open?.label || ''}
        tone={open?.tone}
        impact={open?.impact}
        confirmLabel={open?.label || 'Xác nhận'}
        reason={{ required: true, label: 'Lý do quyết định', max: 1000 }}
        onClose={() => setOpen(null)}
        onConfirm={async (reason) => {
          await write('moderate', 'post', { decision: open!.decision, reason });
        }}
      />
    </div>
  );
};

const PartnerSubmit: React.FC<SectionProps> = ({ s, write }) => {
  const [open, setOpen] = useState(false);
  const status = s.authority.placeStatus;
  const v = s.authority.contentVersion;
  const approved = s.authority.approvedContentVersion;
  const canSubmit = ['DRAFT', 'REJECTED'].includes(status);
  const sentText = status === 'PENDING'
    ? `Nội dung v${v} đã gửi, đang chờ quản trị viên duyệt.`
    : status === 'APPROVED' && approved === v
      ? `Nội dung v${v} đã được duyệt và đang công bố.`
      : canSubmit
        ? `Nội dung v${v} chưa gửi duyệt.`
        : `Nội dung v${v}.`;
  return (
    <div className="hgbo-stack">
      <section className="hgbo-card">
        <div className="hgbo-section-head">
          <h2 className="hgbo-section-title">Tình trạng duyệt</h2>
          <StatusPill status={status} domain="moderation" />
        </div>
        <p>{sentText}</p>
        <p className="hgbo-small hgbo-muted">
          {approved == null ? 'Chưa có phiên bản nào được duyệt.' : `Phiên bản đang công bố: v${approved}.`}
          {' '}
          Thay đổi giá/tồn được quản lý riêng và không cần gửi duyệt.
        </p>
        {canSubmit && (
          <div className="hgp-mt">
            <BoButton variant="primary" icon={Send} onClick={() => setOpen(true)}>
              Gửi nội dung hiện tại để duyệt
            </BoButton>
          </div>
        )}
      </section>
      <section className="hgbo-card">
        <h2 className="hgbo-section-title">Lịch sử quyết định</h2>
        <AuditList items={auditItems(s)} emptyText="Máy chủ chưa trả lịch sử quyết định cho đối tác." />
      </section>
      <ConfirmDialog
        open={open}
        title="Gửi nội dung để duyệt"
        description={`Bản v${v} sẽ được gửi cho quản trị viên. Khách sạn chỉ thay đổi trên trang công khai sau khi được duyệt.`}
        confirmLabel="Gửi duyệt"
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          await write('submit', 'post', {});
        }}
      />
    </div>
  );
};

export const HotelReviewStatusSection: React.FC<SectionProps> = (props) => (props.admin ? <AdminDecision {...props} /> : <PartnerSubmit {...props} />);
