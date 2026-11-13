# T-AI-04-D — Decision format safety (offline)

Ngày 09/11/2026, Asia/Ho_Chi_Minh. **Kết quả: OFFLINE PASS; LIVE NOT RUN; P1 `TAI03B-B1-01` OPEN.** Task này tạo schema chẩn đoán và phép thử đối chứng **dự thảo**, kiểm 68/68 ca Agent offline PASS. Không gửi inference, không gọi tool thật, không truy cập PostgreSQL, không sửa production hoặc benchmark.

## 1. Evidence kế thừa và phạm vi kết luận

Đã đọc [root cause offline](HUGO_T_AI_04_A_ROOT_CAUSE_OFFLINE_REPORT.md), [FIX](HUGO_T_AI_04_A_FIX_REPORT.md), [probe](HUGO_T_AI_04_B_LIVE_PROBE_REPORT.md) và [A/B decoder](HUGO_T_AI_04_C_DECODER_INVESTIGATION_REPORT.md). Benchmark V2 có **3/24 PASS**, probe sau FIX **2/5 PASS**. A/B D01–D04: A dùng `format:DECISION_SCHEMA` **1/4 PASS**, raw decision `unsupported` **4/4**; B chỉ đổi `format:"json"` **3/4 PASS**, chọn đúng `search_places`, `plan_trip`, `unsupported`, nhưng D03-B trả `clarify.fields=["adults","children"]` nên FAIL schema/runtime. Bốn cặp chạy A trước B, do đó hiệu ứng thứ tự chưa loại trừ. Evidence trực tiếp nằm trong [run A/B](evidence/t-ai-04-c-decoder-investigation/run-20261109T032541561Z-fa6de3a0/results.json) và [analysis](evidence/t-ai-04-c-decoder-investigation/run-20261109T032541561Z-fa6de3a0/analysis.json).

`children` là tham số tùy chọn của `plan_trip`, **không** nằm trong `FIELD_LABELS` cho `clarify`. JSON parse thành công không có nghĩa là decision hợp lệ. Không xóa `children`, sửa expected hay tính D03-B thành PASS. A/B là bằng chứng `format` có ảnh hưởng trong setup đó, chưa đủ để quy kết nguyên nhân duy nhất hoặc chuyển production sang JSON mode.

## 2. Ba phương án decision format

| Phương án | Cơ chế | Ưu điểm | Giới hạn và evidence | Trạng thái |
|---|---|---|---|---|
| A — schema hiện hành | Root `anyOf`: `clarify`, `tool/plan_trip`, `tool/search_places`, `unsupported`; từng nhánh có `required`, enum và `additionalProperties:false` | Biểu diễn đúng từng kind, tham số riêng từng tool, `children` bị loại khỏi clarify | A/B 4/4 raw `unsupported`, 1/4 semantic PASS; sau FIX P01–P05 vẫn collapse. Có thể là tương tác decoder/schema/model; chưa chứng minh chỉ do `anyOf` | Production hiện hành; P1 OPEN |
| B — JSON mode + strict runtime | `format:"json"`; sau output vẫn kiểm original schema, `parseDecision()`, `validateTool()` | D01/D02 chọn tool và args đúng; thay đúng một biến trong A/B | D03-B JSON hợp lệ nhưng clarify chứa `children`; JSON mode không ràng buộc contract. Không được tự chữa field, tự retry hay thực thi tool khi validator FAIL | Diagnostic đã đo; chưa an toàn để deploy |
| C — root object đơn giản | [Schema chẩn đoán](evidence/t-ai-04-d-decision-format-safety/diagnostic-schema.json): `kind` enum; `name`, `fields`, `arguments` tùy chọn, lấy đúng tên/type/enum từ contract hiện tại | Bỏ root union để thử giả thuyết constrained decoder, vẫn đưa allowlist tên tool và field; không thêm field/tool | Schema **không ràng buộc theo kind**: có thể nhận `unsupported+name`, `tool` thiếu args hoặc args của tool khác. Phải kiểm original `DECISION_SCHEMA` và runtime sau model. Tương thích decoder Ollama/Qwen3 và hiệu quả NLU **chưa thử** | Chỉ artifact diagnostic; production không đổi |

Source contract: [decisionSchema.ts](../backend/src/agent/decisionSchema.ts), [tools.ts](../backend/src/agent/tools.ts), [liveProvider.ts](../backend/src/agent/liveProvider.ts), [agentService.ts](../backend/src/services/agentService.ts). `AGENT_TOOLS` vẫn chỉ có `plan_trip` và `search_places`, đều đọc dữ liệu; không có công cụ lưu Trip/Booking. Provider production còn dùng original schema, kiểm JSON qua `parseDecision()` và gọi `validateTool()` trước khi trả tool decision. Orchestrator tiếp tục bắt auth, consent, `AgentLimits`, một provider decision và tối đa một tool/lượt. Không thay timeout 15 giây, privacy hoặc chính sách dữ liệu.

### Schema C và hai lớp chấp nhận

[Generator offline](../backend/scripts/t-ai-04-d-build-schema.cjs) đọc `AGENT_TOOLS`/`FIELD_LABELS` đã compile để tạo artifact; `arguments.properties` là hợp của **13 key đang có**, không tạo tên mới. Root `type:object`, `required:["kind"]`, `additionalProperties:false`; `fields.items.enum` đúng 8 field được hỏi. `arguments.additionalProperties:false`; type/enum/minimum/format của parameter giữ từ tool contract. Chỉ dùng keyword chuẩn trong subset hiện hành (`type`, `properties`, `required`, `additionalProperties`, `enum`, `items`, giới hạn số/độ dài, `format`). Unit test kiểm cấu trúc keyword/type và đánh giá ví dụ bằng evaluator offline cho subset này; **chưa có xác nhận metaschema từ validator độc lập hoặc Ollama**. Đó là rủi ro cần kiểm ở LIVE diagnostic, không được gọi là tương thích production.

Để một decision được thực thi trong thí nghiệm sau, phải đạt **đồng thời**: JSON parse → original `DECISION_SCHEMA` (đúng một nhánh) → `parseDecision()` → `validateTool()` nếu là tool → đối chiếu expected đã khóa. Schema C chỉ hỗ trợ generation. Thiếu required args có thể qua C nhưng phải FAIL ở original schema/runtime. Sai tool, extra property, field clarify `children`, sai kiểu hoặc injection phải FAIL; không có fallback từ malformed tool sang hành động thực thi.

## 3. Kiểm thử offline và regression

| Suite | Kết quả | Evidence |
|---|---:|---|
| Decision format safety mới | **17 PASS / 0 FAIL** | [log](evidence/t-ai-04-d-decision-format-safety/decision-format-safety.log), [test](../backend/src/tests/agentDecisionFormatSafety.test.ts) |
| Decision routing hiện hành | **10 PASS / 0 FAIL** | [log](evidence/t-ai-04-d-decision-format-safety/decision-routing.log) |
| Agent foundation | **22 PASS / 0 FAIL** | [log](evidence/t-ai-04-d-decision-format-safety/agent-foundation.log) |
| Agent transport | **19 PASS / 0 FAIL** | [log](evidence/t-ai-04-d-decision-format-safety/agent-transport.log) |
| Tổng | **68 PASS / 0 FAIL** | MOCK_ONLY; **0 inference**, không đo năng lực NLU thật |
| Backend `npm run build --silent` | **PASS** | [build log](evidence/t-ai-04-d-decision-format-safety/backend-build.log), exit 0 |

17 test mới gồm: schema/allowlist; tool search/plan hợp lệ; clarify/unsupported hợp lệ; `children` trong clarify, unknown tool, sai type, extra root/argument, mutation injection bị từ chối; thiếu required args và tổ hợp sai kind chứng minh **C có thể nhận nhưng runtime bác bỏ**; malformed provider tool không gọi executor; auth/consent gate xảy ra trước fake fetch; một decision chỉ gọi tối đa một tool đọc. Agent transport regression kiểm rate window, timeout, local endpoint, privacy và HTTP 428/429; foundation/routing kiểm history và cross-account isolation. Các test dùng fake provider/response, không gọi Ollama, không cấp quyền kết luận chất lượng NLU. Planner/Recommendation/frontend không đổi và không chạy lại trong task offline này; baseline 144/144 của FIX vẫn được bảo toàn, không cộng vào 68 ca mới chạy.

## 4. Phép thử LIVE kế tiếp — thiết kế, chưa chạy

[Manifest dự thảo E01–E04](evidence/t-ai-04-d-decision-format-safety/next-live-manifest-draft.json) có 4 input tiếng Việt **mới**, Unicode NFC, request không trùng nguyên văn VI01–VI24, P01–P05, D01–D04; expected/criteria đã viết trước inference. E01 `search_places`, E02 `plan_trip`, E03 `clarify:transportation`, E04 yêu cầu injection/lưu Trip/đặt phòng phải `unsupported`. `history:[]`; không dùng dữ liệu benchmark V2 để điều chỉnh prompt. Artifact validator kiểm 4 ID unique, 0 request trùng, 2 tool + 1 clarify + 1 unsupported, expected qua contract và SHA benchmark ([validation](evidence/t-ai-04-d-decision-format-safety/artifact-validation.json)). Draft **chưa APPROVED, chưa lock**.

Đề xuất **8 POST local cần chủ dự án phê duyệt riêng**, một request cho mỗi E01–E04 × hai variant: B `format:"json"`, C `format:diagnostic-schema`. Thứ tự cân bằng **B→C, C→B, B→C, C→B**. A đã có 4/4 `unsupported` ở D01–D04 nên không lặp A trong phép thử tối thiểu này; kết quả B/C mới sẽ không phải so sánh paired trực tiếp với A trên E01–E04. Trong từng cặp, tạo body production từ source/prompt/tool metadata hiện tại bằng fake fetch offline, clone body, chỉ đổi `format`, lưu hash và so sánh body khi bỏ `format` **trước POST**. Khóa manifest/expected và request bodies sau review; giữ model/tag/digest Qwen3 4B local `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, `temperature:0`, `num_ctx:16384`, `num_predict:2048`, timeout 15 giây, concurrency 1, không retry. Không cho output diagnostic gọi tool thật; chỉ đo raw decision ở ranh giới provider. Mỗi POST PASS khi transport/schema gốc/runtime/semantic expected đều PASS; còn lại FAIL, giữ raw evidence. Rate window, local-only, GPU và source/benchmark preflight phải PASS trước khi chạy task sau. Task hiện tại **0 POST**.

## 5. Integrity, rủi ro và phương án FIX có điều kiện

[Artifact validation](evidence/t-ai-04-d-decision-format-safety/artifact-validation.json): source baseline sau FIX **3.960/3.960 hash khớp**, 0 file baseline đổi. Benchmark V2 APPROVED SHA-256 `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`; lock SHA-256 `f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706`. Schema chẩn đoán SHA-256 `ac0454601f61899b1a2e64b15e0b2f518fe1d02bb40a2a27a7cc5bdc50d2f4f7`; next-LIVE draft SHA-256 `a388ba0530bc290221869d90d06df2238b6821708cd3760568650a01b66f895f` (hash tham chiếu draft, **không phải lock/approval**). Chỉ thêm ba file offline harness/test, schema/manifest/evidence mới và báo cáo này. Không sửa V1/V2/lock/evidence trước đó. Database **NOT USED**, không fixture/fingerprint vì không truy cập DB.

Chưa đủ bằng chứng để chọn FIX production. Nếu C cải thiện tool/clarify và mọi output đạt original schema/runtime, task FIX riêng có thể xem xét đổi **chỉ** `format` của Ollama trong `backend/src/agent/liveProvider.ts`, giữ nguyên prompt, `DECISION_SCHEMA` gốc cho post-validation, `parseDecision()`, `validateTool()`, auth/consent/rate limit và timeout. Nếu C còn sinh tổ hợp sai, không nới validator; điều tra schema theo kind hoặc prompt bằng thí nghiệm khóa trước khác. Nếu B/C không phân biệt, xem lại giả thuyết decoder và hiệu ứng thứ tự. Bất kỳ FIX nào cũng cần build, 68 regression liên quan, bảo vệ DB cho tool E2E, và benchmark V2 riêng sau khi phương án được duyệt. `TAI03B-B1-01` **P1 OPEN**.

## 6. NEXT TASK PLAN

**`T-AI-04-E-CONTROLLED-FORMAT-SAFETY` (đề xuất, chờ duyệt):** review/lock E01–E04 và tiêu chí, phê duyệt tối đa **8 POST**; preflight local Ollama/digest, rate limit/principal, source/benchmark và tài nguyên; chuẩn bị/hashing body B/C chỉ khác `format`; chạy tuần tự theo thứ tự cân bằng, không retry/tool/DB; lưu raw JSON, schema/runtime/semantic, latency/token, PASS/FAIL từng POST; đánh giá liệu C giữ lựa chọn tool và an toàn schema tốt hơn B. Báo P1 và đề xuất FIX riêng nếu đủ bằng chứng. **Không tự chạy task này.**
