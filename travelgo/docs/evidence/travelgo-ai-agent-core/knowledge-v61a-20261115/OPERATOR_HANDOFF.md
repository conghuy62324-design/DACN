# TravelGo21.26 — local operation, Qwen OFF

Thực hiện từ thư mục `travelgo`. Không chỉnh `.env`; không bật model/search/worker mặc định. Website dùng127.0.0.1:5177, API5057, DB15452 đúng sentinel. Không dùng DB gốc.

## Các chế độ riêng

| Mục đích | Profile của launcher hiện có | Quyền |
|---|---|---|
| Bảo vệ | `protected` | PostgreSQL READ ONLY; web/cost/adaptive flags OFF; Qwen OFF |
| Tư vấn dữ liệu có sẵn | `integrated-review` | Web/cost/adaptive/advisory ON nhưng PostgreSQL READ ONLY; không auto-save memory/language |
| Nghiệm thu fixture | `scoped-knowledge-write <manifest đã duyệt>` | Chỉ cohort SYNTHETIC cụ thể; personal test writes chỉ nếu được cấp riêng; cấm real knowledge approval |
| Owner duyệt thật | `scoped-owner-review <manifest mới>` | Đúng existing REAL SUPER_ADMIN, source/candidate/contentHash/version/selected fact IDs, retention approval, expiry; không personal writes/Internet/jobs/model/worker |
| Xử lý candidate có giới hạn | `worker-once scoped-worker <manifest đã duyệt>` | Existing worker, bounded cycle; không tự approve; launcher hiện chỉ local network. Không gọi mode này là Internet worker đã sẵn sàng |

Commands đọc đã kiểm:

```powershell
node backend/scripts/agent-staging-profile.cjs status
node backend/scripts/agent-staging-profile.cjs describe integrated-review
node backend/scripts/agent-staging-profile.cjs describe scoped-owner-review
node backend/scripts/agent-staging-profile.cjs worker-status
```

Chuyển profile chỉ với API thuộc launcher và approval của đợt tương ứng:

```powershell
node backend/scripts/agent-staging-profile.cjs stop
node backend/scripts/agent-staging-profile.cjs start integrated-review
node backend/scripts/agent-staging-profile.cjs status
```

`stop` đối chiếu PID/owner/command và từ chối process khác. `start` từ chối nếu5057 đã có listener, không tự handoff. Kiểm API health và trạng thái model OFF trước khi dùng. Source đã được đổi sau21.25 nên API cũ phải được reload trong scope trước khi gán nghiệm thu final-source.

## Owner duyệt dữ liệu thật

Đọc [OWNER_REVIEW](OWNER_REVIEW.md) hoặc mở trực tiếp `/admin/travel-web`: chọn nhóm “Dữ liệu thật”, mở bài gốc/giấy phép, kiểm từng quote/locator/đơn vị và thông tin còn thiếu. Không phải sửa JSON hoặc SQL. Chọn khoản/fact, chỉnh theo đúng evidence nếu có locator, nhập reason/expiry rồi duyệt bằng tài khoản SUPER_ADMIN thật trong `scoped-owner-review` đã được duyệt riêng.

Operator chuẩn bị manifest từ exact current IDs/content hashes/versions/allowed selections và quyết định retention của owner; owner chỉ xác nhận packet cụ thể và thao tác UI. Không chuyển approval từ cleaned K1/K2/K3 hoặc tài khoản SYNTHETIC. Nếu source/candidate đổi version/contentHash, scope cũ không hợp lệ và cần đối chiếu lại. Startup kiểm existing reviewer thật trong DB; không tạo/thăng quyền/impersonate owner. Source permission approval, fact approval và retention là ba quyết định riêng.

Review sửa source/candidate tạo revision cần duyệt lại; snapshot cũ giữ để audit. `Kiến thức đang lưu và thời hạn` hiển thị snapshot/revision/source/expiry. Lưu trong DB không tự có nghĩa còn eligible: retrieval vẫn kiểm public-use, source version, candidate hiện tại, expiry/revoke. Personal mappings không dùng để diễn giải bài nguồn.

## Worker, cập nhật và giới hạn chưa vượt

Worker dùng existing job table, rate limit/source, tối đa2 active leases, attempt cap12, exponential backoff≤24h, ETag/Last-Modified, content hash/near duplicate, versioned candidates, graceful stop. Source thay đổi tạo candidate/revision chờ duyệt, không tự sửa approved snapshot. Recovery suite21.23 không chạy lại chỉ để tăng số PASS.

`worker-status` cho biết due/attempts/lease/error/last success. `worker-once` là một cycle foreground; Ctrl+C gọi stop/abort, không dừng API/Docker/Ollama. Chưa có approval worker daemon lâu dài, chưa có nghiệm thu24/7. Real Internet worker trong launcher còn cần scoped network authorization/runtime riêng; việc collector của task lấy được bài Internet không chứng minh worker daemon đã tích hợp Internet. Không bỏ local boundary để vượt blocker này.

Sau acceptance, khôi phục:

```powershell
node backend/scripts/agent-staging-profile.cjs stop
node backend/scripts/agent-staging-profile.cjs start protected
node backend/scripts/agent-staging-profile.cjs status
```

Chỉ cleanup đúng SYNTHETIC/test rows trong committed ledger. Nếu owner cho giữ source/candidate thật, giữ đúng IDs và báo intentional table deltas; không gọi40/40unchanged. Nếu chưa có retention approval thì cleanup real pending rows. Không tự bật worker hoặc tự duyệt fact thật.
