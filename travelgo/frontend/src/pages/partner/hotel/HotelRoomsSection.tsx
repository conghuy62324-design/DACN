import React from 'react';
import { BedDouble, ImageOff, Plus } from 'lucide-react';
import { BoButton, DataColumn, DataTable, StatusPill, fmtVnd } from '../../../components/backoffice';
import { Editor, MediaPicture, SectionProps, firstRateAmount, freshRoom, roomInput } from './shared';
import { EditDrawer, useEditParam } from './EditDrawer';
import { RoomFields, viewLabel } from './RoomForm';

export const HotelRoomsSection: React.FC<SectionProps & { compact?: boolean }> = ({ s, write, compact }) => {
  const edit = useEditParam();
  const roomId = edit.value && edit.value !== 'new' ? edit.value : '';
  const room = s.rooms.find((r: any) => r.id === roomId);
  const open = edit.value === 'new' || !!room;

  const columns: DataColumn<any>[] = [
    {
      key: 'photo',
      header: 'Ảnh',
      width: 88,
      hideBelow: 768,
      card: 'hide',
      render: (r) => {
        const media = s.media.find((m: any) => m.roomTypeId === r.id);
        return media ? (
          <MediaPicture hotelId={s.identity.id} media={media} admin={false} className="hgbo-thumb" />
        ) : (
          <span className="hgbo-thumb" role="img" aria-label="Chưa có ảnh phòng">
            <ImageOff aria-hidden="true" />
          </span>
        );
      },
    },
    { key: 'name', header: 'Hạng phòng', primary: true, render: (r) => <span className="hgbo-strong">{r.name}</span> },
    { key: 'capacity', header: 'Sức chứa', render: (r) => `${r.maxAdults ?? '?'} NL · ${r.maxChildren ?? 0} TE (tối đa ${r.maxOccupancy ?? '?'})` },
    { key: 'area', header: 'Diện tích', hideBelow: 1024, render: (r) => (r.areaM2 == null ? 'Chưa rõ' : `${r.areaM2} m²`) },
    { key: 'view', header: 'Hướng nhìn', hideBelow: 1280, render: (r) => viewLabel(r.view) },
    {
      key: 'price',
      header: 'Giá gói từ',
      align: 'right',
      render: (r) => {
        const amount = firstRateAmount(s, r.id);
        return amount == null ? <span className="hgbo-muted">Chưa có gói giá</span> : <span className="hgbo-num">{fmtVnd(amount)}<span className="hgbo-muted hgbo-small"> /phòng/đêm</span></span>;
      },
    },
    { key: 'status', header: 'Trạng thái', render: (r) => <StatusPill status={r.status} domain="room" size="sm" /> },
  ];

  return (
    <div className="hgbo-stack">
      <div className="hgbo-section-head">
        <h2 className="hgbo-section-title">{compact ? 'Hạng phòng' : `Hạng phòng (${s.rooms.length})`}</h2>
        <BoButton variant="primary" icon={Plus} onClick={() => edit.open('new')}>Thêm hạng phòng</BoButton>
      </div>
      <DataTable
        caption="Danh sách hạng phòng"
        columns={columns}
        rows={s.rooms}
        rowKey={(r) => r.id}
        onRowClick={(r) => edit.open(r.id)}
        selectedKey={roomId || null}
        rowActions={(r) => [{ label: 'Sửa', onClick: () => edit.open(r.id) }]}
        empty={{
          icon: BedDouble,
          title: 'Chưa có hạng phòng',
          description: 'Tạo ít nhất một hạng phòng để thiết lập giá và tồn phòng.',
          action: <BoButton variant="primary" icon={Plus} onClick={() => edit.open('new')}>Thêm hạng phòng</BoButton>,
        }}
      />
      <EditDrawer
        open={open}
        title={room ? room.name : 'Thêm hạng phòng'}
        subtitle={room ? 'Sửa hạng phòng' : 'Hạng phòng mới ở trạng thái bản nháp'}
        status={room?.status}
        statusDomain="room"
        onClose={edit.close}
      >
        {(setDirty) => (
          <Editor
            key={roomId || 'new'}
            initial={room ? roomInput(room) : freshRoom()}
            creating={!room}
            label={room ? 'Lưu hạng phòng' : 'Tạo hạng phòng'}
            onDirtyChange={setDirty}
            save={async (v: any) => {
              await write('rooms' + (roomId ? '/' + roomId : ''), roomId ? 'put' : 'post', v);
              setDirty(false);
              edit.close();
            }}
          >
            {(v: any, set: any) => <RoomFields v={v} set={set} />}
          </Editor>
        )}
      </EditDrawer>
    </div>
  );
};
