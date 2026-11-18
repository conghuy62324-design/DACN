

### 21.25 — V6.0-C REAL QWEN SEMANTIC REASONING ACCEPTANCE

**BLOCKED_RESOURCES — REAL QWEN SEMANTIC NOT RUN.** Task21.25 cấp approval mới cho một fresh preflight, tối đa1 conditional warm-load/4 inference/5 native POST, không retry. Đã đối chiếu source/compiled artifacts/production serializer rồi thực hiện đúng một resource snapshot; RAM FAIL nên dừng trước ownership/runtime/quota/metadata/model calls. Không lấy OFFLINE hoặc browser model OFF làm REAL MODEL PASS.

#### 21.25.1. Source, manifest và historical integrity

Đã đọc mục20.8,21.10,21.11,21.13,21.24, toàn bộ B1–B4 inputs/expected/scoring trong proposed final-v3 manifest và các serialized templates. [Source verification](evidence/travelgo-ai-agent-core/qwen-v60c-real-20261115/source-verification.json): **496 source hashes khớp finalv3, source drift0**; bao gồm ModelPrivacy, personalized/natural grounding, natural contract, structured output, cost intelligence, Core provider và AgentCoreService. Không sửa source/prompt/schema/validators/expected.

Đối chiếu **245 compiled backend artifacts** với output của cùng TypeScript compiler/tsconfig được emit trong RAM: **drift0**, không ghi đè dist hoặc chạy tests/regression. Production `serializeCoreRequest` từ compiled backend tái tạo byte-identical cả4 proposed bodies; schema identity/format đúng current contract. Historical evidence/FAIL được kiểm hash và giữ nguyên; [baseline mới](evidence/travelgo-ai-agent-core/qwen-v60c-real-20261115/baseline.json) khóa source/dist/scripts/frontend/database/evidence trước resource preflight.

| Proposed case không thay đổi | Native body bytes | Context bytes | Facts bytes | Trạng thái |
|---|---:|---:|---:|---|
| B1 — `Tui tính lên đờ lạt nghỉ ngơi vài bữa, chưa chốt ngày.` | 10563 | 1232 | 0 | NOT RUN |
| B2 — `Cái mức tiền nãy nhích lên nhẹ xíu nha, còn đi xe gì thì để mình tính sau.` | 10502 | 1187 | 0 | NOT RUN |
| B3 — `Chi phí vé vào này tính mỗi vé hay mỗi người; có cộng thành tiền cả chuyến được không?` | 5635 | 1413 | 2732 | NOT RUN |
| B4 — `Theo ưu tiên đã lưu, so sánh hai chỗ ở và lưu ý tại Đà Lạt; còn điều gì chưa rõ?` | 6749 | 1599 | 3617 | NOT RUN |

Mọi template nằm trong context3000/facts7500/native12288bytes. Đây là kiểm proposed templates, **không phải fresh LIVE manifest hoặc actual native requests**. Không fresh-bind/reimport SYNTHETIC fixtures sau resource FAIL; không dùng cleaned row IDs làm PostgreSQL assertions. B3/B4 nếu chạy sau này chỉ có thể chứng minh REAL MODEL + SYNTHETIC FACTS trong scope đã khóa, không real review DB integration.

#### 21.25.2. Actual resource snapshot và điểm dừng

[Fresh preflight](evidence/travelgo-ai-agent-core/qwen-v60c-real-20261115/preflight.json): **03:40:26.855UTC =10:40:26 ngày15/11/2026, Asia/Saigon**. Tái sử dụng `resources()` trong existing common helper và các ngưỡng đã duyệt; không polling hoặc đo lại để tìm snapshot thuận lợi.

| Guard | Thực tế | Đánh giá |
|---|---|---|
| Windows RAM | Total16202MiB; available **5014MiB**; minimum6144MiB | **FAIL**, thiếu **1130MiB** — đủ để STOP |
| GPU | NVIDIA GeForce RTX4060, driver560.94, utilization **34%** | Vượt cold-load maximum10%; chỉ áp dụng nếu thực sự cần cold-load |
| VRAM | Total8188MiB, used2321MiB, free **5637MiB** | Cold allocation4865.94 +reserve512 =5377.94MiB; đủ, dư259.06MiB, deficit0 |
| Resident headroom | Free VRAM vượt reserve512MiB | Chưa chứng minh readiness: model residency/digest/context/expiry chưa được kiểm |

**BLOCKED_RESOURCES, không phải model semantic FAIL.** Không suy model resident từ VRAM/process. Không giảm context, reserve, RAM/GPU guard, deadline hoặc concurrency; không kill/stop/restart/unload/đóng ứng dụng. Owner có thể tự đóng ứng dụng không cần cho Qwen-only để giải phóng tối thiểu1130MiB RAM theo snapshot này; số đó không bảo đảm readiness tương lai. Nếu cold-load cần thiết, GPU cũng phải về≤10%; nếu đã resident phải xác minh bằng metadata và đúng existing resident guards trong một đợt được phép tiếp theo.

#### 21.25.3. Runtime, quota, manifest lock và native usage

- **Runtime ownership/owned runner/competing clients/local listener: NOT CHECKED FRESH**, dừng tại RAM gate. Không tuyên bố đúng owner/readiness chỉ từ các lần lịch sử.
- **Model quota trước/sau: NOT SCANNED FRESH; Agent quota trước/sau: NOT SCANNED FRESH.** Không dùng quota14/20 của21.24 hoặc số20/20 lịch sử làm quota hiện tại. Planned normal Agent consumption0; model planned maximum5 conservative entries nếu warm-load cần, cap20/hour/reserve10/required≥15; Agent required reserve10 cho planned0. Chưa xác minh capacity, không reserve/tiêu thụ attempt nào.
- **Actual tag/digest/context/version/expiry: NOT CHECKED FRESH.** Contract bắt buộc giữ `qwen3:4b-instruct-2507-q4_K_M`, digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, num_ctx16384/temperature0/num_predict2048/streamfalse/productionJSONSchema/deadline15s/concurrency1. Đây là required configuration, không phải actual runtime verification.
- **Fresh LIVE manifest lock: NOT CREATED** vì chưa qua gates; [proposed final-v3 manifest](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/qwen-live-proposed-manifest-v3.json) giữ nguyên, không chuyển thành execution lock hoặc thay expected để chạy dễ hơn.
- **Warm-load NOT RUN0/1; inference0/4; native metadata GET0; native POST0/5; retry0; normal Agent turns0; PostgreSQL/API staging connections0; Browser runs0.** Không có raw native response, operation đề xuất, token usage, done reason hoặc model latency mới. Metadata/warm-load/inference/validation/render latency đều N/A, không đo bằng doubles hoặc suy từ lịch sử.

#### 21.25.4. Per-case verdicts và model suitability

| Case | Raw output/schema | Semantic | Grounding/server validation | Renderer | Native POST |
|---|---|---|---|---|---:|
| B1 — typo/địa danh/typed quote proposal | NOT RUN | NOT RUN | NOT RUN | NOT RUN | 0 |
| B2 — verified context/vague budget/transport | NOT RUN | NOT RUN | NOT RUN | NOT RUN | 0 |
| B3 — typed cost units/provenance/selection | NOT RUN | NOT RUN | NOT RUN | NOT RUN | 0 |
| B4 — knowledge/review/allowed memory | NOT RUN | NOT RUN | NOT RUN | NOT RUN | 0 |

Historical20.8 vẫn L1/L2/L3FAIL: mất địa danh/typed fields, tự cập nhật budget/transport, và grounded presentation thiếu giá. Historical21.10 vẫn raw L1schemaPASS nhưng semanticFAIL do chat+hotel_cheaper không có evidence; server chặn.21.11 và21.24 OFFLINE fixes không được chuyển thành bằng chứng model đã khắc phục.21.13 là resourceBLOCKED. Đợt21.25 không có raw output mới nên **chưa thể đánh giá lại instruction following, language/context comprehension, schema compliance hoặc fact selection của Qwen4B**; không quy resourceFAIL cho prompt/model, không kết luận model yếu hoặc không phù hợp.

| Verdict riêng | Kết quả |
|---|---|
| RESOURCE READINESS | **BLOCKED_RESOURCES** |
| MODEL RUNTIME READINESS | NOT CHECKED — stopped at RAM guard |
| MODEL QUOTA | NOT SCANNED FRESH — stopped at RAM guard |
| RAW NLU SEMANTICS | NOT RUN |
| CONTEXTUAL REASONING | NOT RUN |
| TYPED COST FACT SELECTION | NOT RUN |
| KNOWLEDGE/REVIEW/MEMORY FACT SELECTION | NOT RUN |
| SERVER GROUNDING | NOT RUN |
| MODEL PRIVACY | NOT EVALUATED by real model; native disclosure0 |
| RUNTIME LATENCY | N/A — no native request |
| REAL QWEN SEMANTIC ACCEPTANCE | **NOT RUN — BLOCKED_RESOURCES** |
| MODEL WEIGHT TRAINING | NOT PERFORMED |
| FULL BROWSER QWEN E2E | NOT RUN |
| REAL KNOWLEDGE ACTIVATION | PENDING owner approval/retention; no new activation |
| LIVE READY | **NO** |

#### 21.25.5. Integrity, remaining blockers và điểm dừng

PostgreSQL connections0, unauthorized mutation0, tool calls0; không fresh-check40/40 tables hoặc130Place/20Business/27Trip trong task này và không dùng historical fingerprint như kiểm mới. Không thay AgentCoreService/ModelPrivacy/prompt/schema/validators/Planner/Recommendation/GROUP_VND_V1/geography/auth/consent/TTL/replay/revocation/runtime/quota guards,17migrations, source/dist hoặc default `.env`. Không bật Qwen website, worker/search; không DB fixture/Trip/Booking/payment write, knowledge approval, Internet collection/paidAI/Maps/GPS/VPS/commit/push/deploy.

Remaining blockers: available RAM thiếu1130MiB tại snapshot; cold-load GPU34% nếu cần load; actual ownership/runtime/residency/quota/fresh fact binding/LIVE lock vẫn chưa xác minh. Bước tiếp theo chỉ là một đợt preflight được owner cho phép sau khi tự giải phóng tài nguyên; nếu tất cả guards đạt mới khóa manifest và chạy B1→B4 theo strict stop. Chưa đủ bằng chứng đề xuất thực thi V6.0-D hoặc claim bounded semantic acceptance PASS.

Đã dừng sau một preflight và báo cáo. Không tự chạy lại21.25 hoặc mở rộng sang V6.0-D. [Acceptance record](evidence/travelgo-ai-agent-core/qwen-v60c-real-20261115/acceptance.json) và [final integrity](evidence/travelgo-ai-agent-core/qwen-v60c-real-20261115/integrity-final.json) phân biệt sourcePASS với resourceBLOCKED và toàn bộ caseNOTRUN.
