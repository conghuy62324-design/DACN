# T-AI-03-B-V2-FINALIZE — Rà soát NLU candidate trước LIVE

Ngày 08/11/2026 (Asia/Saigon). **Kết luận: READY_FOR_OWNER_APPROVAL.** Đây là kết luận về tính nhất quán của **artifact candidate**, chưa phải phê duyệt nội dung V2 hoặc nghiệm thu NLU. `approvalStatus=PENDING_OWNER_REVIEW`; **LIVE_LLM: NOT RUN**. Không cài Ollama, tải model, gọi provider, API hay PostgreSQL.

## 1. Kết quả và thay đổi VI16

[V2 draft lịch sử](evidence/t-ai-03-b-unblock/nlu-manifest-v2-draft.json) có **VI04 và VI16 request giống hệt từng ký tự**. [V2 candidate mới](evidence/t-ai-03-b-v2-finalize/nlu-manifest-v2-candidate.json) giữ nguyên 23 case khác và toàn bộ expected/toolOutcome của VI16; chỉ thay `VI16.request.message` đúng câu được giao:

> Nhóm tôi có khoảng 5 triệu để đi Đà Nẵng từ Hà Nội, gồm 2 người lớn, đi ô tô từ ngày 15 đến 17 tháng 6 năm 2030. Lập lịch trình giúp tôi.

Expected VI16 vẫn là `kind=tool`, `name=plan_trip`, `departureCity=Hà Nội`, `destinationCity=Đà Nẵng`, `startDate=2030-06-15`, `endDate=2030-06-17`, `adults=2`, `totalBudget=5000000`, `transportation=car`. Candidate có **0 cặp request trùng** sau chuẩn hóa NFC/trim/khoảng trắng/chữ thường; draft có đúng cặp VI04–VI16. Câu VI16 mới được ghi trong [provenance candidate](evidence/t-ai-03-b-v2-finalize/nlu-v2-candidate-provenance.json) là `PROPOSED_RECONSTRUCTION`, nguồn là yêu cầu task này, **không phải nguyên văn phục hồi từ V1**.

[Diff draft→candidate](evidence/t-ai-03-b-v2-finalize/draft-to-candidate-diff.json) ghi hai path trong manifest: metadata `version` đổi từ `T_AI_03_B_VI_V2_DRAFT` sang `T_AI_03_B_VI_V2_CANDIDATE`; `cases[15].request.message` đổi đúng câu trên. Provenance chỉ thêm trạng thái candidate, checksum draft và ghi chú revision VI16. `approvalStatus` không đổi. Không tạo lock/hash chính thức cho candidate.

## 2. Validation, checksum và nguồn gốc

Chạy `node backend/scripts/t-ai-03-b-v2-finalize-build.cjs` và `node backend/scripts/t-ai-03-b-v2-finalize-validate.cjs`. [Validation JSON](evidence/t-ai-03-b-v2-finalize/candidate-validation.json) **8/8 kiểm PASS**:

| Kiểm | Kết quả |
|---|---|
| JSON UTF-8 strict, toàn bộ string NFC, không `?`/U+FFFD thay chữ | PASS |
| Đúng 24 ID VI01–VI24, unique, thứ tự và `LIVE_LLM` | PASS |
| Schema case/request/history/expected; `readConversation()` hiện hành chấp nhận tất cả request | PASS |
| VI16 đúng câu mới, expected/toolOutcome nguyên draft; 23 case khác deep-equal | PASS |
| Không có duplicate request trong candidate | PASS |
| `parseDecision()` và `validateTool()` hiện hành chấp nhận mọi expected tool; clarify/unsupported đúng nhánh | PASS |
| Provenance phủ từng field của 24 case; VI16 ghi rõ đề xuất, không phải V1 verbatim | PASS |
| Diff manifest chỉ gồm `version` và VI16 request | PASS |

Hash SHA-256 **để đối chiếu, không phải manifest lock mới**:

| Artifact | SHA-256 |
|---|---|
| [V1 manifest](evidence/t-ai-01-b/nlu-manifest.json) | `e4369315ef9f0ded9943614438116bb897364593899e787cbc256b60f966e081` |
| [V1 lock](evidence/t-ai-01-b/nlu-manifest-lock.json) | `929e048bfd53dde85b1346c5a8ecab76a3d67e92ff630078d9e4b5059d515763` |
| [V2 draft](evidence/t-ai-03-b-unblock/nlu-manifest-v2-draft.json) | `6bc1afaae17d9ecb973aab9c6331faa7beace7b09035d8a4bbec20e4ef82f5fb` |
| [Draft provenance](evidence/t-ai-03-b-unblock/nlu-v2-provenance.json) | `0443931296e026802ee1d3b8266ef4dac168f0076bdf728a322136652ec55f74` |
| [V2 candidate](evidence/t-ai-03-b-v2-finalize/nlu-manifest-v2-candidate.json) | `5f5a037239a5ddc7bee7b9c3a7f918c404b9a350a142698ed2d79a2ae553f33c` |
| [Candidate provenance](evidence/t-ai-03-b-v2-finalize/nlu-v2-candidate-provenance.json) | `8aca8ff4bf76efe3744de1493b99b0ec007d0466af424166bf49c29b747284cb` |

V1 manifest hash vẫn khớp nội dung V1 lock (`sha256` trong lock). V1, lock, V2 draft, draft provenance và evidence cũ không bị sửa. Theo [báo cáo UNBLOCK](HUGO_T_AI_03_B_UNBLOCK_REPORT.md), V2 dựa trên 56 field câu/title/history `PROPOSED_RECONSTRUCTION`, 22 giá trị city `SUMMARY_SUPPORTED_VALUE`; VI15 request không dấu giữ nguyên V1. Candidate chỉ thay câu đề xuất của VI16 trong cùng nhóm 56 field này. Không có bản Unicode V1 nguyên văn để xác nhận các câu dựng lại.

## 3. Đối chiếu acceptance với Agent hiện hành

Đã đọc `backend/src/agent/{tools,conversation,decisionSchema,liveProvider}.ts`, `backend/src/services/agentService.ts`, Planner validator, báo cáo [T-AI-01-B](HUGO_T_AI_01_B_LIVE_PROVIDER_REPORT.md) và V1/lock. Kiểm validator chạy trên bản `dist` được build sau source tương ứng; không gọi tool executor/DB. **Không phát hiện expected mâu thuẫn trực tiếp với contract Agent hiện hành; không sửa expected.** `plan_trip` yêu cầu đủ 7 field, budget > 0, adults ≥ 1, car/motorbike, lịch tối đa 10 ngày; `search_places` yêu cầu city và daily budget ≥ 0. VI16 nêu rõ mọi field, “khoảng 5 triệu” được đánh giá là giá trị ngân sách danh nghĩa 5.000.000 VND theo acceptance đã giao. `clarify` chỉ dùng field trong `FIELD_LABELS`; `unsupported` không có tool mutation.

| Nhóm acceptance | Case áp dụng | Có tiêu chí trong candidate? | Điều chưa chứng minh |
|---|---:|---|---|
| Tool selection | 24: 13 tool, 8 clarify, 3 unsupported | Có exact kind/tool | Model thật chưa chạy |
| Arguments | 13 tool | Có exact số/ngày/enum; city theo chuẩn V1 | Model extraction chưa chạy |
| Missing fields | 8 clarify | Có exact tập field; zero tools theo criteria | Provider response chưa chạy |
| Multi-turn | VI09–VI13 (5) | Có history và expected giữ/đổi field | History là fixture dựng lại, chưa phải browser conversation thật |
| Unsupported | VI17–VI19 (3) | Có `unsupported`, zero tools | Model security behavior chưa chạy |
| Tool fidelity | 13 tool | Có `toolOutcome` và criteria đối chiếu service/DB thật | Catalog/Planner/PostgreSQL chưa chạy trong task này |

Điểm cần chủ dự án xem khi duyệt: **toàn bộ câu reconstructed**, nhất là VI09–VI13 history và VI16 mới. History hiện hợp lệ với `readConversation()` nhưng assistant text được dựng lại; LIVE browser nhiều lượt phải kiểm riêng với lịch sử do API thật trả. VI20 yêu cầu `tool_unavailable` cho destination sentinel; trước LIVE phải xác nhận sentinel không có catalog trong đúng test DB và Planner trả lỗi 422 như contract, không biến dữ liệu nền thành fixture. Các case tìm kiếm có thể trả danh sách rỗng kèm cảnh báo catalog, vẫn phải đối chiếu service thật; không giả kết quả. Đây là điều kiện thực thi, **không phải lý do sửa expected trong task này**.

Harness `backend/scripts/t-ai-01-b-evaluate.cjs` vẫn hard-code V1/lock. Không được dùng nguyên trạng để chấm candidate. Sau khi chủ dự án duyệt, task LIVE cần harness revision riêng đọc candidate đã khóa, giữ các assertion nghiệp vụ và không chỉnh expected theo output model. F01–F04 `MOCK_ONLY` vẫn tách khỏi mẫu số 24 LIVE NLU.

## 4. Integrity, giới hạn và kết luận

[Baseline integrity](evidence/t-ai-03-b-v2-finalize/baseline.json) ghi **3.893 file trước candidate**. [Audit cuối](evidence/t-ai-03-b-v2-finalize/integrity-after.json) xác nhận file baseline không đổi; chỉ thêm artifact/harness/báo cáo task này. Script mới chỉ đọc JSON, source/compiled validator và ghi candidate/evidence. Không sửa app source, Planner, Booking, Trip; không model inference, DB write, migration, seed, commit, push hoặc deploy.

**READY_FOR_OWNER_APPROVAL:** candidate hợp lệ về cấu trúc và khớp contract đã kiểm; VI04/VI16 hết trùng. Chủ dự án vẫn phải duyệt nội dung reconstructed. Chưa có `APPROVED`, hash lock V2 chính thức hoặc kết quả LIVE_LLM.

## 5. NEXT TASK PLAN — chờ duyệt, chưa thực hiện

**T-AI-03-B-OLLAMA-LIVE-V2**, dependency theo thứ tự:

1. Chủ dự án duyệt toàn bộ candidate/provenance, đặc biệt VI16 và history VI09–VI13; nếu chỉnh, tạo revision khác và rà lại expected trước khi khóa hash. Sau duyệt tạo manifest immutable + lock riêng; giữ V1/draft/candidate lịch sử.
2. Operator cài Ollama Windows theo [hướng dẫn chính thức](https://docs.ollama.com/windows), phê duyệt/tải tag local cụ thể, kiểm loopback `127.0.0.1:11434`, GPU/RAM/VRAM, JSON schema, context 16k và timeout 15 giây. Không dùng `:cloud`, Gemini hoặc billing. Bật các cờ LIVE/usage/local-only/evaluation chỉ sau khi mọi gate đạt.
3. Tạo evaluator V2 riêng với expected đã khóa. Preflight đúng `travelgo_ai_m0_test`, sentinel, 12 migration checksum, fingerprint; nếu cần fixture thì ledger và cleanup exact ID. Xác nhận catalog cho VI20.
4. Chạy 24 NLU với model thật, ghi PASS/FAIL/NOT RUN, quyết định/arguments đã redact, tool/service/DB fidelity, latency/token/VRAM. Browser desktop 1440×900 và mobile 390×844 dùng auth/API thật; multi-turn dùng history thực. Giữ F01–F04 mock riêng.
5. Cleanup, fingerprint compare, source audit và báo cáo LIVE. Dừng; không tự sửa expected theo model, không mở Trip/Booking mutation hay task ngoài phạm vi.
