# T-AI-03-B-LIVE-V2-B1-COMPLETE — Time gate BLOCKED

Ngày 08/11/2026 (Asia/Ho_Chi_Minh). **Trạng thái: BLOCKED do chưa hết cửa sổ rate limit.** Không có inference mới trong task này. Kết quả benchmark hiện giữ nguyên **3 PASS / 17 FAIL / 4 NOT RUN** từ đợt B1; chưa thể kết luận kết quả cuối của 24 case. Không chạy browser E2E, không tạo fixture và không sửa source ứng dụng.

## 1. Quyền thực thi và điều kiện thời gian

Chủ dự án cho phép chạy **chỉ VI21–VI24**, tối đa một inference/case, cùng principal UUID đã dùng ở B1, sau khi hết cửa sổ 20 request/user/giờ. [Rate-window evidence B1](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/rate-window.json) ghi principal `9997f6db-bfa1-4377-96f3-5b5ea19dbf34` và mốc sớm nhất **13:51:03.947 UTC = 20:51:03.947 Asia/Ho_Chi_Minh, 08/11/2026**.

[Time-gate evidence mới](evidence/t-ai-03-b-live-v2-b1-complete/time-gate.json) chụp lúc **12:59:00.566 UTC = 19:59:00.566 Asia/Ho_Chi_Minh**: còn **52 phút 03,381 giây**. Điều kiện bắt buộc chưa đạt, nên đã dừng trước preflight vận hành và trước mọi inference. Không đổi account/principal, không reset server hoặc `AgentLimits`, không gửi request thử nghiệm. Việc process B1 đã kết thúc không làm mất nghĩa vụ tôn trọng mốc `eligibleAfter` đã lưu.

## 2. Benchmark và baseline integrity đã kiểm chỉ đọc

Đã đọc [báo cáo B1](HUGO_T_AI_03_B_LIVE_V2_B1_REPORT.md), evidence run, [manifest V2 APPROVED](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json), [lock](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json) và harness B1. SHA-256 manifest **`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`** vẫn khớp lock. Kiểm nội bộ [results B1](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/results.json) với đủ **20 file VI01–VI20**: từng record trùng file case; `inferencePosts=20`, 3 PASS, 17 FAIL, VI21–VI24 NOT RUN. Không ghi đè evidence B1.

[Source-integrity evidence mới](evidence/t-ai-03-b-live-v2-b1-complete/source-integrity.json) đối chiếu SHA-256 **3.960/3.960 file** với audit B1: **0 thay đổi**. SHA-256 harness B1 hiện tại được lưu để tham chiếu. Đây là kiểm source/evidence bằng thao tác chỉ đọc; **không** thay thế DB preflight/fingerprint mới cần chạy trước inference sau mốc. B1 trước đó đã có exact `travelgo_ai_m0_test`, sentinel, 12/12 migration checksum và fingerprint **25/25 bảng trùng**; task này chưa mở kết nối DB mới vì time gate đã FAIL. Ollama tag/digest, GPU/RAM/VRAM và proxy cũng **chưa được preflight lại** trong task này.

## 3. Bảng kết quả VI01–VI24 hiện tại

| Case | Expected đã khóa | Actual từ B1 | Trạng thái |
|---|---|---|---|
| VI01 | search_places | unsupported | **FAIL** |
| VI02 | search_places | unsupported | **FAIL** |
| VI03 | search_places | unsupported | **FAIL** |
| VI04 | plan_trip | unsupported | **FAIL** |
| VI05 | clarify | unsupported | **FAIL** |
| VI06 | clarify | unsupported | **FAIL** |
| VI07 | clarify | unsupported | **FAIL** |
| VI08 | clarify | unsupported | **FAIL** |
| VI09 | plan_trip, multi-turn | unsupported | **FAIL** |
| VI10 | plan_trip, multi-turn | unsupported | **FAIL** |
| VI11 | plan_trip, multi-turn | unsupported | **FAIL** |
| VI12 | plan_trip, multi-turn | unsupported | **FAIL** |
| VI13 | plan_trip, multi-turn | unsupported | **FAIL** |
| VI14 | plan_trip | unsupported | **FAIL** |
| VI15 | plan_trip | unsupported | **FAIL** |
| VI16 | plan_trip | unsupported | **FAIL** |
| VI17 | unsupported | unsupported | **PASS** |
| VI18 | unsupported | unsupported | **PASS** |
| VI19 | unsupported | unsupported | **PASS** |
| VI20 | plan_trip | unsupported | **FAIL** |
| VI21 | clarify: adults | chưa chạy | **NOT RUN** |
| VI22 | clarify: destinationCity | chưa chạy | **NOT RUN** |
| VI23 | clarify: dailyBudgetPerPerson | chưa chạy | **NOT RUN** |
| VI24 | clarify: startDate, endDate | chưa chạy | **NOT RUN** |

## 4. Số liệu và phân loại lỗi

Số liệu **chỉ của B1 trước đó**, không phải lượt đo mới: case PASS **3/20 đã chạy = 15%**; tool **0/13**, clarify **0/4**, unsupported **3/3**, multi-turn **0/5**; JSON/schema **20/20**. Bốn clarify còn lại chưa vào mẫu số. Cả 20 decision thực tế là `unsupported`, không có tool call; fidelity Catalog/Planner **0/0 đánh giá được**, không quy thành lỗi tool. Lỗi **TAI03B-B1-01, P1** (model luôn trả unsupported cho intent hợp lệ) vẫn OPEN; nguyên nhân chưa xác định, không chỉnh prompt/schema/provider/expected để thay kết quả.

Latency/token B1: min **130 ms**, median **155,5 ms**, p95 **174 ms**, max **8.082 ms** (cold load), tổng **19.148 prompt / 120 output token**. B1 xác nhận model resident 100% GPU sau request đầu, VRAM rảnh khoảng 1.202 MiB cuối run. Đây là dữ liệu lịch sử; tài nguyên hiện tại cần kiểm lại trước VI21. Không có lỗi provider/schema/HTTP trong 20 case cũ. Không có request mới, nên không có latency/token hoặc lỗi mới.

## 5. Bảo vệ dữ liệu và NEXT TASK PLAN

Task này ghi **0 inference, 0 DB write, 0 fixture**. Không chạy migration/reset/seed/truncate, không đụng 27 Trip lịch sử, không sửa benchmark V1/V2/lock, evidence B1 hoặc application source; không commit/push/deploy. Vì dừng trước DB preflight, fingerprint mới **NOT RUN**; kết quả 25/25 trùng chỉ thuộc B1.

**Bước tiếp theo sau mốc 20:51:03.947 Asia/Ho_Chi_Minh và khi được giao tiếp tục:** kiểm lại giờ thực, cùng principal UUID, SHA manifest/lock, Ollama local đúng tag/digest `qwen3:4b-instruct-2507-q4_K_M` / `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, không proxy/cloud, GPU/RAM/VRAM, `AgentLimits`, exact DB/guard/sentinel/12 checksum và fingerprint before. Chỉ khi tất cả PASS mới chạy VI21→VI24 tuần tự, mỗi case một lần; lưu decision trước fallback, API/token/latency, fingerprint after và tổng hợp đủ 24 case. Nếu preflight FAIL thì dừng, không inference.

**NEXT TASK sau benchmark hoàn tất:** `T-AI-04-A-ROOT-CAUSE` để điều tra vì sao model trả `unsupported` cho mọi request qua prompt/schema/provider/request construction, với bằng chứng kiểm soát riêng. Không tự suy đoán nguyên nhân, sửa benchmark chính thức, làm FIX hoặc Browser E2E trong task này.

**Điểm dừng:** BLOCKED bởi rate window; VI21–VI24 giữ NOT RUN. Chờ sau mốc và chỉ đạo tiếp theo, không tự chạy tiếp.
