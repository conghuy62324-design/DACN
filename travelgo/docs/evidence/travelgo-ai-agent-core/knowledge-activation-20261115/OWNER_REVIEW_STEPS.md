# Owner review21.26-A — chỉ đề xuất kích hoạt khoản1

Không phải approval. Không tự duyệt12 khoản. Source/candidate/knowledge/retention/worker là các quyền riêng.

## Nguồn và phạm vi

[Bài Đà Lạt](https://en.wikivoyage.org/wiki/Da_Lat) · Wikivoyage contributors · [lịch sử bài](https://en.wikivoyage.org/w/index.php?title=Da_Lat&action=history) · [Copyleft](https://en.wikivoyage.org/wiki/Wikivoyage:Copyleft) · [CC BY-SA4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Snapshot lấy15/11/2026, không lưu nguyên bài. Giữ attribution tên bài/tác giả/link/lịch sử/license; nêu đã trích/cấu trúc lại và ShareAlike cho phần dẫn xuất. Chỉ text, không suy quyền ảnh/logo. Source class COMMUNITY_EXPERIENCE, không gọi nguồn chính thức. Method ARTICLE/manual URL; worker/search OFF. Permission proofs từ21.26 còn trong policy window; task này không fetch Internet mới. Owner cần đối chiếu terms/content, không coi chỉ có CC là tự hoàn tất source approval.

## Phân loại12 khoản

| Khoản | Evidence hiện có | Kết luận trước owner action |
|---|---|---|
|1 | Shuttle sân bay150.000VND **mỗi người**, quote ghiFeb2026; body:block:50:clause:0 | **READY_FOR_OWNER_REVIEW historical + STALE_FOR_CURRENT_PRICE**. Không xác nhận giá hiện nay, lịch, tuyến cụ thể, còn chỗ hoặc tổng chuyến |
|2 | Shuttle chiều về60.000VND, quoteAug2022 | NEEDS_UNIT_CORRECTION/STALE_FOR_CURRENT_PRICE; không suy per-person từ khoản1 |
|3 |5USD, quote quá ngắn | NEEDS_CONTEXT/INSUFFICIENT_EVIDENCE |
|4 |60.000VND, PalaceIII/museum trong previous sentence, Feb2025 | NEEDS_UNIT_CORRECTION/STALE_FOR_CURRENT_PRICE; không suy mỗi người hoặc giờ hiện hành |
|5 |70.000VND, không đủ chủ thể trong retained excerpt | NEEDS_CONTEXT/INSUFFICIENT_EVIDENCE |
|6 |Bus7.000VND cùng câu cáp treo | NEEDS_UNIT_CORRECTION/NEEDS_CONTEXT; không gộp với vé cáp treo |
|7 |Cable car150.000VND khứ hồi, Feb2026 | NEEDS_CONTEXT/STALE_FOR_CURRENT_PRICE. Unit khứ hồi hợp lệ; không phải bằng chứng giá mỗi người |
|8 |Cable car120.000VND một chiều, Feb2026 | NEEDS_CONTEXT/STALE_FOR_CURRENT_PRICE. Unit một chiều hợp lệ; không phải bằng chứng mỗi người |
|9 |Public bus tớiLacDuong/KhuHoaBinh,12.000VND | NEEDS_UNIT_CORRECTION/NEEDS_CONTEXT; ngày áp dụng chưa rõ |
|10 |“ride in a Jeep (360,000 dong for1Jeep)” | NEEDS_UNIT_CORRECTION +NEEDS_CATEGORY_CORRECTION. Parser tổng quát đã sửa OFFLINE thành **mỗi xe/TRANSPORT**; retained row chưa tự sửa. Chưa rõ hành trình, số người/xe, thời điểm hoặc còn chỗ |
|11 |10.000VND/person nhưng chủ thể thiếu | NEEDS_CONTEXT/NEEDS_CATEGORY_CORRECTION |
|12 |5.000VND/bike nhưng chưa xác định đây là gửi xe/vận chuyển hay phí khác | NEEDS_CONTEXT/NEEDS_CATEGORY_CORRECTION; không tự coi là giá thuê xe |

Khoản7/8 cùng retained paragraph hash6232af..., quote nhắc monastery, section chỉ “See”; không có tên điểm/station đầy đủ. Historical corpus có heading “Cable ride to Thien Vien Truc Lam Monastery” nhưng heading đó nằm trên context paragraph **khác hash**; không lấy heading lệch để khẳng định exact location. Muốn duyệt7/8 cần owner đối chiếu bài gốc hoặc một fresh bounded Internet authorization để lấy đúng context; không đoán từ trí nhớ. Không chọn7/8 trong scope kích hoạt đầu.

##7 fact candidates

1–3 là summaries của các cost observations1/2/3: không approve summaries để lách per-observation selection. Fact4 hoạt động thiên nhiên là nhận xét có tính đánh giá (“some of the best”), không guarantee. Fact5 đặc sản liệt kê jam/fruit/avocado/artichokes cần context/locator đầy đủ. Fact6 nhận xét PrennFalls đẹp/thích hiking là opinion, không điều kiện an toàn. Fact7 hiking ởVoiMountain là mô tả, không xác minh điều kiện/tuyến. **Cả4 non-cost facts NEEDS_CONTEXT**, retained format thiếu locator riêng; chưa chọn để activate. Không biến nhận xét thành sự thật chắc chắn.

## Thao tác owner sau khi scope được duyệt và profile đã sẵn sàng

1. Đăng nhập tại http://127.0.0.1:5177/login bằng credentials owner tự tạo. Mở http://127.0.0.1:5177/admin/travel-web. Không dùng tài khoản DEMO/CUSTOMER/SYNTHETIC.
2. Đọc source card `Wikivoyage contributors · en.wikivoyage.org`, bài gốc/terms. Nhập lý do ở **Lý do xét duyệt web**, tích **Tôi đã kiểm quyền, nguồn gốc, context, đơn vị chi phí và phạm vi sử dụng**. Bấm **Duyệt/bật** đúng source **một lần**. Việc này chỉ source permission, không bật worker hoặc approve mọi fact.
3. Trong bài DaLat, bấm **Sửa dữ liệu theo bài gốc**. Field **Thời điểm nguồn giá/chuyến đi**; nhập `02/2026` theo quote khoản1. Evidence giữ đúng article URL. Kiểm cảnh báo bind source revision liền kề/content hash giữ nguyên; xác nhận và bấm **Lưu bản sửa chờ duyệt**. Đây là đối chiếu retained snapshot sau lần source APPROVE, không re-import hay thay giá.
4. Tích lại xác nhận quản trị nếu UI reset sau lưu. Chọn **chỉ Chọn khoản1**:150.000VND/mỗi người. Không chọn các khoản khác hoặc fact summaries. Điền lý do rõ “historical Feb2026, chưa xác minh current fare”; expiry không vượt07:00 ICT15/12/2026 (nhập local datetime **2026-12-15T07:00** hoặc sớm hơn).
5. Bấm **Duyệt kiến thức** một lần. Kiểm snapshot đã duyệt/thời hạn. Việc gửi nút này phải do owner tự thực hiện; assistant không đăng nhập hoặc gửi approval request thay owner.
6. Báo đã hoàn tất; không gửi credentials/token. Assistant chỉ đọc fresh IDs/audit/reviewer/selection để xác nhận, rồi mới kiểm customer advisory/persistence.

Nếu scope/hash/version khác hoặc không có nút hợp lệ, dừng và báo trạng thái/mã lỗi; không tự sửaSQL/JSON, không approve thêm để thử. Retention cho snapshot mới cần approval riêng ở authorization packet; không tự kéo dài2 retained rows hiện có.
