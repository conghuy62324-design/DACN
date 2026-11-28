import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { CatalogBreadcrumb } from '../components/explore/CatalogPageFilters';
import '../styles/hg-catalog.css';

export function IntegrationPolicyPage(){
 return <div className="hg-cat">
  <header className="hg-cat-head">
   <div className="hg-container">
    <CatalogBreadcrumb items={[{label:'Trang chủ',to:'/'},{label:'Quyền riêng tư và điều khoản'}]}/>
    <p className="hg-cat-eyebrow"><ShieldCheck size={16} aria-hidden="true"/>Chính sách</p>
    <h1 className="hg-cat-h1">Quyền riêng tư và điều khoản tích hợp</h1>
   </div>
  </header>
  <div className="hg-container hg-cat-main">
   <div className="hg-cat-box hg-cat-doc">
    <p>HuGo Travel là ứng dụng hỗ trợ lập kế hoạch du lịch. Giá Planner là dự toán, không phải báo giá hoặc xác nhận đặt dịch vụ. Luôn kiểm tra giá, giờ mở cửa và an toàn tuyến đường thực tế.</p>
    <p>Khi bạn đồng ý dùng Gemini, tin nhắn và phần hội thoại được thông báo trong hộp đồng ý được gửi tới Google. Không nhập mật khẩu hoặc thông tin riêng tư không cần thiết. G2 local giữ slots đã xác minh trong RAM tối đa 15 phút; không chuyển sang Google tự động.</p>
    <p>Định vị chỉ bắt đầu khi bạn bấm nút. Tọa độ GPS chỉ giữ trong trang hiện tại; chỉ gửi tới Google Routes khi bạn đồng ý riêng. Có thể từ chối và nhập địa chỉ. Truy vấn địa điểm/địa chỉ được gửi tới Google khi bạn đồng ý tìm kiếm. Không lưu nội dung Google Places hoặc Routes vào Trip hay database.</p>
    <p>Trip lưu qua chức năng HuGo Travel phải do bạn xác nhận và chỉ tài khoản có quyền mới đọc/chỉnh sửa được. Đăng xuất sẽ bỏ dữ liệu trang; bạn có thể kết thúc phiên Agent để xóa slots tạm. Không xem thông tin Google là dữ liệu giá catalog HuGo Travel.</p>
    <p>Khi sử dụng tính năng bản đồ, bạn cũng chịu sự điều chỉnh của <a href="https://maps.google.com/help/terms_maps/">Điều khoản Google Maps</a> và <a href="https://policies.google.com/privacy">Chính sách quyền riêng tư Google</a>. Gửi yêu cầu hỗ trợ hoặc xóa dữ liệu qua kênh liên hệ của HuGo Travel.</p>
    <Link to="/assistant" className="hg-cat-btn hg-cat-btn--outline">Trở về Trợ lý</Link>
   </div>
  </div>
 </div>;
}
