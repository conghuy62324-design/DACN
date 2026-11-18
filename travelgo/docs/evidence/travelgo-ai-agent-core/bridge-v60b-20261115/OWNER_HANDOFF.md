# Owner handoff — 21.24 (no real knowledge activated)

REAL KNOWLEDGE APPROVAL PENDING. Không có Internet collection mới hoặc fact approval trong task này. Xem [packet K1/K2/K3 đã có](../integration-v60a-20261115/OWNER_REVIEW.md); các rows cũ đã cleanup và IDs/locators thuộc snapshot lịch sử, không phải active DB rows.

| Candidate lịch sử | Source URL | Đơn vị/thời điểm | Cần quyết định |
|---|---|---|---|
| K1 shuttle150.000VND | https://en.wikivoyage.org/wiki/Da_Lat | mỗi người, nguồn ghiFeb2026; publication dateUNKNOWN | approve historical / reject / correct / pending |
| K2 cable-car150.000/120.000VND | https://en.wikivoyage.org/wiki/Da_Lat | khứ hồi/một chiều, nguồn ghiFeb2026; không tự đổi thành per-person | quyết định riêng từng mức giá |
| K3 bus40.000VND | https://vi.wikivoyage.org/wiki/%C4%90%C3%A0_L%E1%BA%A1t | mỗi vé, ngày áp dụngUNKNOWN | ưu tiên xác minh/correct ngày trước duyệt |

Evidence locators/quotes, publisher Wikivoyage contributors, CC BY-SA4.0 và attribution/history/change/ShareAlike obligations giữ tại packet gốc. Included/excluded, current fare, availability và publication date chưa xác minh. EN/VI cùng publisher family, không phải hai nguồn độc lập. Giá trên không phải current tariff, đại diện thị trường hoặc Booking price.

Quy trình sau khi có authorization mới:

1. Owner ghi riêng quyết định từng fact và có/không cho giữ lại staging, expiry. Implementation approval không phải fact/retention approval.
2. Fresh bounded Internet authorization nếu cần lấy lại bài; kiểm permission/robots/redirect, source hash/locator và bind IDs mới. Task21.24 không được cấp mới phần collection này.
3. Fresh DB identity/sentinel/role/schema/fingerprint và scoped write manifest cho đúng source/candidate IDs. Không dùng manifest SYNTHETIC đã cleanup hoặc mượn test reviewer.
4. Owner tự đăng nhập SUPER_ADMIN thật tại http://127.0.0.1:5177/admin/travel-web; mở bài gốc, chọn từng observation/fact đã kiểm, reason và expiry, rồi approve. Source approval khác fact approval.
5. Kiểm eligible retrieval và API restart persistence; chỉ giữ exact rows có retention approval, ghi reviewer identity/reviewedAt/version/license/evidence locator và intentional fingerprint differences.
6. Revoke fact/source bằng workflow moderation; fresh retrieval không còn eligible. Cleanup test fixtures riêng và restore READ ONLY, worker OFF. Không tự giữ lại dữ liệu pending hoặc bật worker lâu dài.

Runtime cuối task vẫn protected READ ONLY, Qwen/search/worker OFF. Ghi chú này không cấp quyền ghi thật, inference hoặc retention.
