# TASK21.41-SOURCE-CONSOLIDATION · 28/11/2026 ICT

**Trạng thái P17: PARTIAL — chờ owner duyệt commit, push và draft PR.**

## Git và phạm vi

| Mục | Giá trị đã kiểm |
|---|---|
| Root integration | `DACN_WEB_REVIEW`, branch `integration/web-backend`, HEAD `46839ea38453d42accb040e30e1973a171638b66` |
| Root DACN chính | `DACN`, branch `main`, HEAD `e76d187e8b824ee0c688001150a36cd279074c9d` |
| Merge base và phân kỳ | `e76d187e8b824ee0c688001150a36cd279074c9d`, main/integration = 0/9 |
| Remote | `origin`, GitHub public. Remote main trùng DACN main. `feature/web-ui-admin-partner` trùng integration HEAD. Chưa có remote `integration/web-backend`. |
| Bảo vệ main | Yêu cầu Pull Request, 0 lượt review bắt buộc theo cấu hình, chưa có required check, chưa áp dụng cho admin, cấm force-push và xóa main. Owner duyệt merge riêng. |
| Index và worktree | Cả hai index thật không có staged changes. Integration từ 53 tracked đang sửa và 678 untracked lên 54 và 682 sau checkpoint, với 65 mục ignored theo nhóm. DACN chính có 2 review Markdown untracked, tracked tree sạch. |
| Phụ thuộc cục bộ | Junction `node_modules` trỏ sang DACN chính. Build kiểm tra từ checkout riêng. |

[GitHub DACN](https://github.com/conghuy62324-design/DACN)

Inventory trước có 152 path. Audit tìm thêm `travelgo/backend/src/routes/hotelRoutes.ts` thuộc A, route chứa phần quote HotelStay đã nghiệm thu. Thêm `.gitattributes` vào C để checkout giữ CRLF của migration 01–18 và LF của 19–22, đúng byte ledger đang dùng. So khớp SHA-256 cả 22 bản SQL sau checkout với `core.autocrlf=false`, 18 blob lịch sử giữ nguyên. Khi kiểm tra release, dùng Git checkout và xác nhận hash SQL trước khi dùng migration runner.

## Gói duyệt theo commit

Bản kiểm kê riêng `OWNER_APPROVAL.json` chứa 123 path nguồn, tài liệu và evidence được chọn (A 39, B 36, C 8, D 15, E 25), 23 path loại, thứ tự commit, SHA-256 working copy, Git blob ID và ID cây dự kiến ở mỗi bước. Xem `git-state.json`, `migration-verification.json` và `OWNER_APPROVAL.md` trong cùng thư mục riêng để kiểm tra phạm vi và đối chiếu.

| # | Commit message | Nội dung và thứ tự |
|---|---|---|
| 1 | `chore(release): remove legacy notebook export and design screenshots` | Loại một notebook và 22 ảnh thiết kế khỏi cây phát hành. Các file vẫn có trên đĩa. |
| 2 | `feat(db): prepare migration through schema 22 with stable checksums` | C gồm .gitattributes, runner và migration 19–22 đi trước phần runtime dùng schema. |
| 3 | `feat(integration): consolidate web, HotelStay and grounded Agent runtime` | A và B đi cùng C runtime adapter/test do API, HotelStay, Agent, quota/lease và Worker dùng chung entry points và kiểu dữ liệu. |
| 4 | `build(release): consolidate hardened Linux deployment and verification` | D gồm Docker, gateway, Compose ví dụ, backup/restore và kiểm tra boundary. |
| 5 | `docs(release): record 21.41 acceptance and GPU staging handoff` | E gồm hồ sơ, pin ảnh và evidence JSON rút gọn. Receipt nguồn thô giữ trong vùng riêng. |

Build Linux API và frontend từ checkout ứng viên PASS. Bốn bộ component offline PASS 15/15, network none. Các thống kê diff, digest và log của đúng cây ứng viên nằm trong gói duyệt. Hai image kiểm tra mới có digest và RootFS khác ảnh RELEASE-CLOSURE. Dùng pin đã nghiệm thu cho handoff và scan/pin bản build mới riêng trước khi promotion. Sau khi duyệt, kiểm lại HEAD, Git index thật, hash từng path và tree ID trước mỗi commit. Push branch `integration/web-backend` và tạo draft PR theo [PR draft](HUGO_21_41_SOURCE_CONSOLIDATION_PR_DRAFT.md). Nếu cây thay đổi, khóa lại snapshot và trình phạm vi mới. Trước merge, có thể dừng PR ở trạng thái draft và để main ở mốc hiện tại. Sau merge, cần owner duyệt revert qua PR riêng. Rollback runtime cần pin ứng dụng tương thích, backup/restore đã kiểm trên môi trường cô lập và quyết định riêng cho schema/data.

## Checkpoint và dữ liệu cần giữ

- RELEASE-CLOSURE source lock SHA-256 `118fea3e3b8942be1f13fc9e311152eff437bc77a2b014fcc5a5803504e4ffba`, đã xác minh 33 digest. Ciphertext SHA-256 `22825a8d15373093b581abe9445f4e533568b325283797c9562356d8bfc5aa94`, đã giải mã và kiểm hash đủ 32 mục.
- Snapshot source mới AES-256-GCM, khóa bảo vệ bằng Windows DPAPI theo user hiện tại. Receipt riêng ghi SHA-256 và số mục đọc lại. Giữ toàn bộ path ứng viên, kịch bản Qwen đã khóa, launcher và các script cục bộ cần dùng lại. Các backlink đến receipt lịch sử cần dùng kho riêng.
- P15 dùng bản backup synthetic schema 22. Ciphertext hiện tại khớp `499754cd80eb17a88c1e486b0d1ece6849bc5b60a8c17ff1075b5d72302e3d95`. Kết quả restore lịch sử 4.627 giây chạy restore và 25.100 giây đến availability. Dữ liệu thật, media và quyền sử dụng media cần bộ backup và đối chiếu độc lập.
- Trước khi đổi worktree, xác minh các launcher admin/customer, tên DB/role runtime, volume/container backup, trỏ media, quyền đọc/ghi media và hash manifest, khóa phục hồi `age`, references JWT/HMAC/Ollama và cấu hình ports/proxy. Chuyển bằng secret provisioning từ vault hoặc cấu hình riêng theo user. Integration có các env example, còn DACN chính có backend .env ignored. Giữ cấu hình runtime hiện hữu tại DACN chính.

## Secret và privacy

Đã quét lịch sử public `main` và 9 commit web, patch binary-aware của đúng cây dự kiến, cùng bản checkout các file untracked được chọn. Gitleaks ghi 0 phát hiện trên phần thêm và 69 file untracked được chọn. Diff main có một hit ở đoạn xóa notebook, còn cây ứng viên loại path đó. Diff không đưa binary vào PR. Kết quả phân loại ghi trong gói duyệt riêng. Bản notebook Kaggle trong lịch sử có một chuỗi khớp mẫu Google Cloud API key, còn hiện diện trên main public. Cần owner xác minh trong Google Cloud, thu hồi hoặc rotate nếu là khóa thật, kiểm tra usage và giới hạn quyền. GitHub có thể hiển thị dòng đó trong diff xóa. Evidence nghiệm thu cũ trên main cũng có trường password trong test fixture. Owner cần kiểm tra từng giá trị nếu có khả năng từng dùng ngoài test. Xử lý các bản Git history hoặc mirror đã public cần quyết định riêng.

Gói public chỉ giữ source, cấu hình mẫu, tài liệu được review và evidence rút gọn. Launchers, raw evidence, tool scratch, env/runtime secrets, DPAPI blob, identity phục hồi và dump giữ trong kho riêng đã có. Đã thay thư mục Windows cá nhân trong ba tài liệu bằng đường dẫn tương đối theo workspace. Checkpoint giữ bản gốc. Gitleaks dùng bản redacted. [Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)

## Verification sau merge

1. Ghi merge SHA và kiểm cây merged khớp tree đã duyệt. Nếu main thay đổi trong lúc review, so lại source, migration hash và diff ngoài phạm vi.
2. Kiểm `git status` trong DACN chính, giữ hai review untracked và private configs. Fetch rồi fast-forward khi cây sạch và đúng branch. Dùng checkout riêng nếu có collision path.
3. Build API/frontend và smoke HTTP qua loopback không dùng data Production. Kiểm route chính WEB/Agent theo RBAC, Fast health, Worker dry/health; Qwen giữ OFF, một Agent backend, `persisted:false`.
4. So hash tất cả migration 01–22 và đúng pin ảnh trước khi promotion. Build mới phải có scan và pin riêng nếu digest đổi. Confirm schema ledger trong môi trường được phê duyệt riêng trước khi ghi.
5. Kiểm launcher, quyền truy cập media, DB/schema/role và backup references tại DACN chính. Đọc lại manifest riêng, xác minh env/secret injection cùng owner. Chỉ đưa việc dỡ worktree ra quyết định sau khi đã kiểm tra đủ các mục.

## TASK21.42-A — bàn giao GPU staging

- Cây source và SHA phê duyệt trong `OWNER_APPROVAL.json`. Candidate `linux/amd64` API, frontend, gateway và PostgreSQL 15.20/PostGIS 3.7.0 distribution khớp [pin manifest](evidence/release-closure-2141-20261128/candidate-image-pins.json). Pin PostgreSQL đã dùng restore là OCI index đã chốt. So digest distribution, không dùng tag trôi.
- Dùng [production Compose example](../docker-compose.production.example.yml) với GPU profile, model volume private và model chỉ allowlist. Provider chia sẻ loopback/private namespace với API, PostgreSQL private, route vận hành qua VPN/private SSH, generator API không mở public. Chốt host + architecture + NVIDIA runtime sau khi được duyệt. Sizing khởi điểm 12 GiB VRAM và 24–32 GiB RAM, cộng disk cho image/model, dữ liệu, WAL và backup; xác nhận bằng số đo GPU và restore.
- Model `qwen3:4b-instruct-2507-q4_K_M`, digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, context 16384, concurrency 1. Xác nhận digest/model/endpoint bằng `verifyOllamaReady.ts`, giới hạn request/deadline/cancellation, một Agent backend, log redacted và fallback theo contract. Giữ Qwen OFF cho đến khi có gói staging duyệt riêng.
- Sealed benchmark ở `travelgo/docs/evidence/ai-qwen-d-20261127/scenarios.json`, SHA-256 `f9e123527fddda7776ec786cc0119643b2daef7ca019c89e42cb87b749d05340`. Có bản trong encrypted checkpoint, đi kèm runner local. Trên GPU cần đo grounded quality, actual live inference và cancellation, timeout/abort, VRAM/RAM, latency và fallbacks. Dùng dữ liệu synthetic/được phép.
- [Deployment và backup/restore runbook](HUGO_PRODUCTION_DEPLOYMENT_RUNBOOK.md). Theo dõi readiness, p50/p95, timeout/cancellation, VRAM/GPU, cạn quota/lease, pool DB, Worker lag/heartbeat, volume/disk, backup tuổi và kiểm restore. Lưu log đã redacted và diễn tập cảnh báo trước promotion.
- HotelStay sandbox H03–H16 và controlled rollback/lock timeout PASS. Active deadlock cycle chưa chạy. Linux synthetic 20/20, Review Worker Linux và shared quota PASS trong phạm vi đã nghiệm thu. Production HotelStay authorization, production catalog/media rights, B04 FAIL lịch sử, B05 NOT RUN, Browser BLOCKED_POLICY và essential E2E vẫn mở. P12 PARTIAL, `persisted:false`, một Agent backend. API còn 1 moderate Trivy, npm audit còn 2 moderate mỗi backend/frontend, bốn ảnh từng scan 0 critical/high. Host hardening, public HTTPS, monitoring, production backup và go-live approval vẫn mở. [Evidence rút gọn](evidence/source-consolidation-2141-20261128/release-acceptance-summary.json)

Không commit, push, tạo PR, merge, ghi DB, áp migration, bật Qwen hoặc Worker Production, hay deploy trong checkpoint này.
