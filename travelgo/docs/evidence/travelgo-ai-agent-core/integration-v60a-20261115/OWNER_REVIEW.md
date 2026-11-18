# Owner review — V6.0-A

Các rows cũ đã cleanup. Đây là đề xuất, không phải approval hay knowledge active. Không yêu cầu đọc JSON/SQL.

| Nhóm | Claim cần owner kiểm | Link | Đề xuất |
|---|---|---|---|
| K1 | 150.000 VND · PER_PERSON · Or catch the airport shuttle for 150,000 dong per person (Feb 2026) | [Bài gốc](https://en.wikivoyage.org/wiki/Da_Lat) | APPROVE_HISTORICAL_ONLY_IF_OWNER_VERIFIES |
| K2 | 150.000 VND · PER_ROUND_TRIP · Bus: 7,000 dong, cable car: 150,000 dong both ways, 120,000 dong one way (Feb 2026) | [Bài gốc](https://en.wikivoyage.org/wiki/Da_Lat) | APPROVE_HISTORICAL_ONLY_IF_OWNER_VERIFIES |
| K2 | 120.000 VND · PER_ONE_WAY · Bus: 7,000 dong, cable car: 150,000 dong both ways, 120,000 dong one way (Feb 2026) | [Bài gốc](https://en.wikivoyage.org/wiki/Da_Lat) | APPROVE_HISTORICAL_ONLY_IF_OWNER_VERIFIES |
| K3 | 40.000 VND · PER_TICKET · Vé xe bus có giá 40.000 đồng/vé | [Bài gốc](https://vi.wikivoyage.org/wiki/%C4%90%C3%A0_L%E1%BA%A1t) | PENDING_OR_CORRECT_DATE |

K1: shuttle sân bay,150.000VND/person,nguồn ghiFeb2026. K2: vé cáp treo150.000khứ hồi/120.000một chiều,nguồn ghiFeb2026. Đây chỉ là ghi nhận lịch sử, không báo giá hiện nay. K3: bus40.000VND/vé nhưng không rõ ngày áp dụng; ưu tiên xác minh/correct trước duyệt. Cả hai bài cùng publisher Wikivoyage; không dùng làm corroboration độc lập.

## Context và phần còn UNKNOWN

### K1 — b3d1c91aa10db71369cc6168e41abf5a

Da Lat – Travel guide at Wikivoyage · Wikivoyage contributors

> Or catch the airport shuttle for 150,000 dong per person (Feb 2026)

Locator: body:block:50:clause:0. Ngày bài: UNKNOWN. Lấy lúc: 2026-11-14T17:51:42.685Z. Included: UNKNOWN. Excluded: UNKNOWN. Category: TRANSPORT. Các mục phải kiểm: Publication date; Current availability/current fare; Party/whole-trip scope.

### K2 — 67af9ee9c640df40b4671d0caad0b21c

Da Lat – Travel guide at Wikivoyage · Wikivoyage contributors

> Bus: 7,000 dong, cable car: 150,000 dong both ways, 120,000 dong one way (Feb 2026)

Locator: body:block:79:clause:5. Ngày bài: UNKNOWN. Lấy lúc: 2026-11-14T17:51:42.685Z. Included: UNKNOWN. Excluded: UNKNOWN. Category: TRANSPORT. Các mục phải kiểm: Publication date; Current availability/current fare; Party/whole-trip scope.

### K2 — 96e67f63382b29a71f62b9a0a4bb2337

Da Lat – Travel guide at Wikivoyage · Wikivoyage contributors

> Bus: 7,000 dong, cable car: 150,000 dong both ways, 120,000 dong one way (Feb 2026)

Locator: body:block:79:clause:5. Ngày bài: UNKNOWN. Lấy lúc: 2026-11-14T17:51:42.685Z. Included: UNKNOWN. Excluded: UNKNOWN. Category: TRANSPORT. Các mục phải kiểm: Publication date; Current availability/current fare; Party/whole-trip scope.

### K3 — edd24e0fc3f9596bcbb0c6a830813aff

Đà Lạt – Wikivoyage, cẩm nang du lịch mở · Wikivoyage contributors

> Vé xe bus có giá 40.000 đồng/vé

Locator: body:block:46:clause:2. Ngày bài: UNKNOWN. Lấy lúc: 2026-11-14T17:51:43.203Z. Included: UNKNOWN. Excluded: UNKNOWN. Category: TRANSPORT. Các mục phải kiểm: Publication date; Current availability/current fare; Party/whole-trip scope; Travel/effective period.

## Thao tác khi workflow đã sẵn sàng

1. Mở http://127.0.0.1:5177/admin/travel-web, đăng nhập bằng SUPER_ADMIN thật của owner. Không dùng test actor thay reviewer.
2. Đối chiếu bài gốc, chọn từng observation, loại các rows chưa đủ evidence; nhập reason và expiry≤90ngày.
3. Chỉ approve selection đã kiểm. Ghi rõ có cho phép giữ source/candidate/knowledge và audit reviewer sau task hay không.
4. Nếu chưa quyết định, các rows acceptance sẽ cleanup; packet này được giữ ngoài DB.

Attribution: Wikivoyage contributors, từng article và page history; [CC BY-SA4.0](https://creativecommons.org/licenses/by-sa/4.0/). Bản này chọn excerpt và cấu trúc lại facts; ghi thay đổi và ShareAlike4.0. Không lưu nguyên bài.

## Trạng thái cuối task21.23

REAL KNOWLEDGE APPROVAL PENDING. Task/Internet/staging approval không phải fact approval hoặc retention approval. Sáu attempts lấy bài mới đều WEB_CONNECTION_FAILED, không retry; chưa có fresh extraction phù hợp source mới để bind các ID bên trên. Các ID trên thuộc snapshot lịch sử hợp lệ cho người đọc đối chiếu, không phải rows active. Sau thay đổi HTML/category parser, không chuyển approval cũ sang observation IDs mới tự động.

Owner cần quyết định riêng từng K1, từng mức giá K2 và K3: approve historical/reject/correct/pending; xác nhận rõ có cho giữ lại trong staging và ngày hết hạn. Khi có fresh import và manifest quyền ghi phù hợp, owner tự đăng nhập SUPER_ADMIN thật tại `/admin/travel-web`, mở bài gốc, kiểm từng checkbox observation/fact, reason và expiry rồi mới duyệt. Không dùng tài khoản SYNTHETIC của nghiệm thu; tài khoản đó đã cleanup. Profile cuối task READ ONLY; không có knowledge thật hoặc pending candidate được giữ lại trong DB. Không cần đọc JSON hay sửa SQL để xem packet này.
