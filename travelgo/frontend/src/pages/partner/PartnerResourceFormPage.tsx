// Form Dịch vụ khác: chỉ đổi giao diện. Giữ lời gọi API, payload, data-testid `partner-${resource}-form`,
// thuộc tính name của từng ô và đúng một nút (Lưu nội dung) bên trong form.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, ImageOff, Save } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, BoLinkButton, EmptyState, PageHeader, RequiredMark, StatusPill, boButtonClass, statusLabel } from '../../components/backoffice';
import '../../styles/hg-partner.css';
import { ManagementService, PartnerResource } from '../../services/managementService';
import { PlatformService } from '../../services/platformService';
import { Business } from '../../types';

type Field={key:string;label:string;type?:'text'|'number'|'textarea'|'select'|'datetime-local';options?:string[];required?:boolean;array?:boolean};
const common:Record<PartnerResource,{label:string;fields:Field[]}>= {
  places:{label:'địa điểm',fields:[{key:'accommodationType',label:'Loại hình lưu trú',type:'select',options:['hotel','resort','homestay','villa','apartment','guesthouse']},{key:'cuisines',label:'Loại ẩm thực (mỗi dòng: vietnamese, seafood, local, vegetarian, bbq_hotpot, buffet, international, family)',type:'textarea',array:true},{key:'name',label:'Tên',required:true},{key:'category',label:'Danh mục',type:'select',options:['hotel','restaurant','attraction','tour'],required:true},{key:'summary',label:'Mô tả ngắn',type:'textarea',required:true},{key:'description',label:'Mô tả chi tiết',type:'textarea',required:true},{key:'city',label:'Thành phố',required:true},{key:'province',label:'Tỉnh / thành',required:true},{key:'district',label:'Quận / huyện'},{key:'address',label:'Địa chỉ',required:true},{key:'latitude',label:'Vĩ độ',type:'number',required:true},{key:'longitude',label:'Kinh độ',type:'number',required:true},{key:'priceFrom',label:'Giá từ',type:'number'},{key:'duration',label:'Thời lượng'},{key:'heroImage',label:'URL ảnh đại diện',required:true},{key:'galleryImages',label:'URL ảnh bộ sưu tập (mỗi dòng một ảnh)',type:'textarea',array:true},{key:'highlights',label:'Điểm nổi bật (mỗi dòng)',type:'textarea',array:true},{key:'amenities',label:'Tiện ích (mỗi dòng)',type:'textarea',array:true}]},
  tours:{label:'tour',fields:[{key:'title',label:'Tên tour',required:true},{key:'category',label:'Danh mục',type:'select',options:['beach','culture','nature','resort','adventure'],required:true},{key:'departureCity',label:'Điểm đi',required:true},{key:'destinationCity',label:'Điểm đến',required:true},{key:'durationDays',label:'Số ngày',type:'number',required:true},{key:'durationNights',label:'Số đêm',type:'number',required:true},{key:'summary',label:'Mô tả ngắn',type:'textarea',required:true},{key:'description',label:'Mô tả chi tiết',type:'textarea',required:true},{key:'meetingPoint',label:'Điểm đón'},{key:'priceVND',label:'Giá',type:'number',required:true},{key:'capacity',label:'Sức chứa',type:'number',required:true},{key:'heroImage',label:'URL ảnh đại diện',required:true},{key:'galleryImages',label:'URL ảnh bộ sưu tập (mỗi dòng)',type:'textarea',array:true},{key:'highlights',label:'Điểm nổi bật',type:'textarea',array:true},{key:'inclusions',label:'Bao gồm',type:'textarea',array:true},{key:'exclusions',label:'Không bao gồm',type:'textarea',array:true}]},
  tickets:{label:'vé',fields:[{key:'title',label:'Tên vé',required:true},{key:'type',label:'Loại',type:'select',options:['flight','bus','train','tour','sightseeing'],required:true},{key:'operator',label:'Đơn vị vận hành',required:true},{key:'departureCity',label:'Điểm đi',required:true},{key:'arrivalCity',label:'Điểm đến',required:true},{key:'departureTime',label:'Thời gian khởi hành',type:'datetime-local',required:true},{key:'arrivalTime',label:'Thời gian đến',type:'datetime-local'},{key:'duration',label:'Thời lượng'},{key:'price',label:'Giá',type:'number',required:true},{key:'originalPrice',label:'Giá gốc',type:'number'},{key:'capacity',label:'Sức chứa',type:'number',required:true},{key:'status',label:'Trạng thái',type:'select',options:['ACTIVE','INACTIVE']},{key:'imageUrl',label:'URL ảnh'},{key:'features',label:'Tiện ích (mỗi dòng)',type:'textarea',array:true}]},
  blogs:{label:'bài viết',fields:[{key:'title',label:'Tiêu đề',required:true},{key:'excerpt',label:'Tóm tắt',type:'textarea',required:true},{key:'content',label:'Nội dung',type:'textarea',required:true},{key:'destinationName',label:'Điểm đến',required:true},{key:'coverImage',label:'URL ảnh bìa',required:true},{key:'costEstimate',label:'Chi phí dự kiến'},{key:'tripDuration',label:'Thời lượng chuyến đi'},{key:'tags',label:'Thẻ (mỗi dòng)',type:'textarea',array:true}]},
};

const optionText:Record<string,string>={hotel:'Khách sạn',resort:'Khu nghỉ dưỡng',homestay:'Homestay',villa:'Biệt thự',apartment:'Căn hộ',guesthouse:'Nhà khách',restaurant:'Nhà hàng',attraction:'Điểm tham quan',tour:'Tour',beach:'Biển',culture:'Văn hóa',nature:'Thiên nhiên',adventure:'Mạo hiểm',flight:'Máy bay',bus:'Xe khách',train:'Tàu hỏa',sightseeing:'Tham quan',ACTIVE:'Đang bán',INACTIVE:'Ngừng bán'};

const toLocalDateTime = (value?: string | null): string => {
  if (!value) return '';
  const utcDate = new Date(value);
  if (Number.isNaN(utcDate.getTime())) return '';
  return new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const serializeDateTime = (value: string, original?: string | null) => {
  // Retain original precision when the minute-resolution control is unchanged.
  if (value === toLocalDateTime(original)) return original;
  // Send an explicit instant for browser local edits; never rely on server timezone.
  return value ? new Date(value).toISOString() : value;
};

const normalizeForForm = (config: { fields: Field[] }, data: Record<string, any>) => {
  const normalized = { ...data, accommodationType:data.catalogMetadata?.accommodationType, cuisines:data.catalogMetadata?.cuisines||[] };
  for (const field of config.fields.filter((item) => item.type === 'datetime-local')) {
    normalized[field.key] = toLocalDateTime(data[field.key]);
  }
  return normalized;
};

export const PartnerResourceFormPage:React.FC=()=>{
  const resource=String(useParams().resource) as PartnerResource;const itemId=useParams().id;const isNew=!itemId;const navigate=useNavigate();
  const original=useRef<Record<string,any>>({});
  const config=common[resource];const [form,setForm]=useState<Record<string,any>>({});const [businesses,setBusinesses]=useState<Business[]>([]);const [error,setError]=useState('');const [saving,setSaving]=useState(false);
  useEffect(()=>{(async()=>{try{const dashboard=await PlatformService.getPartnerDashboard();setBusinesses(dashboard.businesses);if(isNew&&dashboard.selectedBusiness)setForm(v=>({...v,businessId:dashboard.selectedBusiness!.id}));if(!isNew){const data=await ManagementService.partnerGet(resource,itemId!);original.current=data;setForm(normalizeForForm(config,data));}else original.current={};}catch(e:any){setError(e?.message||'Không thể tải biểu mẫu.');}})();},[resource,itemId]);
  const image=useMemo(()=>form.heroImage||form.coverImage||form.imageUrl,[form]);
  if(!config)return <EmptyState title="Module không tồn tại."/>;
  const change=(key:string,value:any)=>setForm(v=>({...v,[key]:value}));
  const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError('');try{const payload={...form};for(const field of config.fields.filter(f=>f.type==='datetime-local')){payload[field.key]=serializeDateTime(payload[field.key]??'',original.current[field.key]);}for(const field of config.fields.filter(f=>f.array)){payload[field.key]=Array.isArray(payload[field.key])?payload[field.key]:String(payload[field.key]||'').split('\n').map((v:string)=>v.trim()).filter(Boolean);}if(resource==='places'){payload.catalogMetadata={...(payload.accommodationType?{accommodationType:payload.accommodationType}:{}),cuisines:payload.cuisines||[]};delete payload.accommodationType;delete payload.cuisines;}await ManagementService.partnerSave(resource,payload,itemId);navigate(`/partner/${resource}`);}catch(err:any){setError(err?.message||'Không thể lưu dữ liệu.');}finally{setSaving(false);}};
  const statusCode=form.status||'DRAFT';
  const statusText=resource==='tickets'?({ACTIVE:'Đang bán',INACTIVE:'Ngừng bán'} as Record<string,string>)[statusCode]||statusCode:statusLabel(statusCode,'moderation');
  const fieldId=(key:string)=>`hgp-rf-${key}`;
  return (
    <div className="hgp-page hgbo-stack">
      <PageHeader
        title={`${isNew?'Tạo':'Chỉnh sửa'} ${config.label}`}
        subtitle="Ảnh được quản lý bằng URL theo kiến trúc hiện tại. Nội dung mới được lưu ở trạng thái nháp."
        actions={(
          <BoLinkButton variant="secondary" icon={ArrowLeft} to={`/partner/${resource}`}>
            Quay lại
          </BoLinkButton>
        )}
      />
      {error&&<Alert tone="danger" role="alert">{error}</Alert>}
      <form onSubmit={save} data-testid={`partner-${resource}-form`} className="hgp-rform">
        <section className="hgbo-fs">
          <h2 className="hgbo-fs__title">Thông tin {config.label}</h2>
          <div className="hgbo-fs__body hgbo-fs__body--2">
            {isNew&&(
              <div className="hgbo-field hgbo-field--span">
                <label className="hgbo-field__label" htmlFor={fieldId('businessId')}>
                  Cơ sở kinh doanh
                  <RequiredMark/>
                </label>
                <select
                  id={fieldId('businessId')}
                  name="businessId"
                  required
                  className="hgbo-select"
                  value={form.businessId||''}
                  onChange={e=>change('businessId',e.target.value)}
                >
                  {businesses.map(b=>(
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            {config.fields.map(field=>(
              <div key={field.key} className={`hgbo-field ${field.type==='textarea'?'hgbo-field--span':''}`.trim()}>
                <label className="hgbo-field__label" htmlFor={fieldId(field.key)}>
                  {field.label}
                  {field.required&&<RequiredMark/>}
                </label>
                {field.type==='select'?(
                  <select
                    id={fieldId(field.key)}
                    name={field.key}
                    required={field.required}
                    className="hgbo-select"
                    value={form[field.key]??''}
                    onChange={e=>change(field.key,e.target.value)}
                  >
                    <option value="">Chọn…</option>
                    {field.options!.map(o=>(
                      <option key={o} value={o}>{optionText[o]||o}</option>
                    ))}
                  </select>
                ):field.type==='textarea'?(
                  <textarea
                    id={fieldId(field.key)}
                    name={field.key}
                    required={field.required}
                    rows={field.key==='content'||field.key==='description'?8:3}
                    className="hgbo-textarea"
                    value={field.array&&Array.isArray(form[field.key])?form[field.key].join('\n'):form[field.key]||''}
                    onChange={e=>change(field.key,e.target.value)}
                  />
                ):(
                  <input
                    id={fieldId(field.key)}
                    name={field.key}
                    required={field.required}
                    type={field.type||'text'}
                    step={field.type==='number'?'any':undefined}
                    className="hgbo-input"
                    value={form[field.key]??''}
                    onChange={e=>change(field.key,e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
        <aside className="hgp-rform__side">
          <div className="hgbo-card hgbo-stack hgbo-stack--sm">
            <h2 className="hgbo-section-title">Xem trước & lưu</h2>
            {image?(
              <img src={image} className="hgp-rform__img" alt=""/>
            ):(
              <span className="hgp-rform__img hgp-media__ph" role="img" aria-label="Chưa có ảnh">
                <ImageOff aria-hidden="true"/>
              </span>
            )}
            {resource==='places'&&form.latitude&&form.longitude&&(
              <a className="hgbo-link hgbo-small" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${form.latitude}&mlon=${form.longitude}#map=15/${form.latitude}/${form.longitude}`}>
                Xem tọa độ trên bản đồ <ExternalLink size={12} aria-hidden="true"/>
              </a>
            )}
            <p className="hgbo-small hgbo-muted">
              Trạng thái:
              {' '}
              <StatusPill status={statusCode} domain="moderation" size="sm" label={statusText}/>
            </p>
            <button disabled={saving} className={boButtonClass('primary','md',false,'hgp-wfull')}>
              <span className="hgbo-btn__content">
                <Save aria-hidden="true"/>
                {saving?'Đang lưu…':'Lưu nội dung'}
              </span>
            </button>
          </div>
        </aside>
      </form>
      <p className="hgbo-small hgbo-muted">
        <Link className="hgbo-link" to={`/partner/${resource}`}>Về danh sách {config.label}</Link>
      </p>
    </div>
  );
};
