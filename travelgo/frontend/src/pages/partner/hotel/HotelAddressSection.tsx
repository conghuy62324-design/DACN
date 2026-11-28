import React from 'react';
import { Alert, FormSection, NumberField, TextField } from '../../../components/backoffice';
import { Editor, SectionProps, address, cleanAddress } from './shared';

type SetFn = (key: string, value: any) => void;

const TEXT_FIELDS: [string, string, string?][] = [
  ['houseNumber', 'Số nhà'],
  ['streetName', 'Tên đường'],
  ['wardOrCommune', 'Phường/xã'],
  ['administrativeArea', 'Khu vực hành chính'],
  ['provinceOrCity', 'Tỉnh/thành', 'Tỉnh/thành hành chính theo danh mục 34 tỉnh/thành.'],
  ['tourismDestination', 'Địa danh du lịch (tên hoặc mã)', 'Không bắt buộc; phải khớp tỉnh/thành đã chọn.'],
];

const inVietnam = (lat: number, lng: number) => lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;

/** Địa chỉ + tọa độ. Dùng ở trang Địa chỉ và bước 3 onboarding. */
export const AddressFields: React.FC<{ v: any; set: SetFn; coordsRequired?: boolean }> = ({ v, set, coordsRequired }) => {
  const hasLat = v.latitude !== null && v.latitude !== undefined;
  const hasLng = v.longitude !== null && v.longitude !== undefined;
  const zero = hasLat && hasLng && Number(v.latitude) === 0 && Number(v.longitude) === 0;
  const outside = hasLat && hasLng && !zero && !inVietnam(Number(v.latitude), Number(v.longitude));
  const pairError = hasLat !== hasLng ? 'Cần cung cấp cả vĩ độ và kinh độ.' : null;
  return (
    <>
      <FormSection title="Địa chỉ" columns={2}>
        {TEXT_FIELDS.map(([k, l, hint]) => (
          <TextField
            key={k}
            label={l}
            hint={hint}
            required={k === 'provinceOrCity'}
            value={v[k] ?? ''}
            onChange={(x) => set(k, x)}
          />
        ))}
      </FormSection>
      <FormSection
        title="Tọa độ"
        description={coordsRequired ? 'Lấy tọa độ từ giấy tờ hoặc bản đồ của cơ sở. Không nhập 0,0 hay số ước lượng.' : undefined}
        columns={2}
      >
        <NumberField
          label="Vĩ độ đối tác cung cấp"
          step="any"
          required={coordsRequired}
          value={v.latitude}
          error={pairError}
          onChange={(x) => set('latitude', x)}
        />
        <NumberField
          label="Kinh độ đối tác cung cấp"
          step="any"
          required={coordsRequired}
          value={v.longitude}
          onChange={(x) => set('longitude', x)}
        />
        <TextField
          label="Nguồn địa chỉ"
          required
          span
          value={v.source ?? ''}
          onChange={(x) => set('source', x)}
        />
        <p className="hgbo-small hgbo-muted hgbo-field--span">
          Không tự điền tọa độ. Tọa độ cung cấp chưa được hệ thống xác minh; khách sạn thiếu tọa độ chưa thể công bố.
        </p>
        {zero && (
          <div className="hgbo-field--span">
            <Alert tone="danger">
              <p>Tọa độ 0,0 không phải vị trí thật. Hãy nhập tọa độ đúng của cơ sở.</p>
            </Alert>
          </div>
        )}
        {outside && (
          <div className="hgbo-field--span">
            <Alert tone="warning">
              <p>Tọa độ nằm ngoài khoảng Việt Nam (vĩ độ 8–24, kinh độ 102–110). Kiểm tra lại trước khi lưu.</p>
            </Alert>
          </div>
        )}
      </FormSection>
    </>
  );
};

export const HotelAddressSection: React.FC<SectionProps> = ({ s, write }) => (
  <Editor
    initial={address(s)}
    save={(v: any) => write('address', 'put', cleanAddress(v))}
  >
    {(v: any, set: SetFn) => (
      <div className="hgbo-stack">
        <AddressFields v={v} set={set} />
        <p className="hgbo-small hgbo-muted">Bản đồ chọn vị trí chưa có trong đợt này.</p>
      </div>
    )}
  </Editor>
);
