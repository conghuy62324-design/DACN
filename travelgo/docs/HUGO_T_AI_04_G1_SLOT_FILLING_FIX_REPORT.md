# T-AI-04-G1-SLOT-FILLING-FIX

Ngày 10/11/2026, Asia/Ho_Chi_Minh. **SLOT-FILLING FIX IMPLEMENTED — LIVE NOT VALIDATED**. Thay đổi production giới hạn ở **SYSTEM prompt trong một file backend**. Backend build PASS; **21/21 test mới + 26/26 G1 + 101/101 regression còn áp dụng PASS**. Tất cả kiểm thử mới là **MOCK_ONLY/offline**, **0 inference, 0 PostgreSQL**. `TAI03B-B1-01` **P1 OPEN**.

## 1. Baseline G03 và E03-B

Đã đọc [G1 LIVE](HUGO_T_AI_04_G1_LIVE_VALIDATION_REPORT.md), [G1 FIX](HUGO_T_AI_04_G1_SAFE_CONTRACT_FIX_REPORT.md), [F](HUGO_T_AI_04_F_CONTRACT_SLOT_FILLING_REPORT.md), [E FINAL](HUGO_T_AI_04_E_FINAL_REPORT.md), source orchestrator/provider/tools/schema/Ajv/provenance/conversation/Planner validator, manifest và raw evidence. Kết quả G1 LIVE lịch sử giữ nguyên **NLU 3 PASS / 1 FAIL; safety 4 PASS**.

| Thuộc tính | G03 LIVE | E03-B |
|---|---|---|
| Input | Sáu field lập lịch trình có nhãn; Hải Phòng → Ninh Bình, 05–06/04/2033, 2 người lớn, 3,6 triệu; không nêu phương tiện | Hà Nội → Đà Lạt, 10–12/09/2033, 2 người lớn, 7 triệu; nói rõ “Tôi chưa chọn phương tiện” |
| Expected khóa trước | `clarify`, fields `["transportation"]` | Cùng expected |
| Raw model | `tool/plan_trip`, tự thêm `transportation:"car"` | Cùng biểu hiện |
| JSON/schema/runtime | PASS | PASS |
| Raw NLU | FAIL | FAIL |
| Thực thi lịch sử | G1 gate `NEEDS_INPUT transportation`, 0 fake tool | Diagnostic không chạy tool, 0 tool |

Cả hai history `[]`, cùng model digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, JSON mode, temperature 0. Input/runtime/orchestration khác nhau; đây **không phải phép A/B** xác định nguyên nhân. [Đối chiếu machine-readable](evidence/t-ai-04-g1-slot-filling-fix/offline-analysis.json) đọc lại evidence, không phát lại request. Không sửa expected G/E/V2 hoặc đánh giá lại kết quả cũ.

## 2. Nguyên nhân xác nhận và giả thuyết

| Phát hiện | Mức bằng chứng | Kết luận có thể rút ra |
|---|---|---|
| Raw response có `car` trước server fallback; user không chọn phương tiện | **CONFIRMED**, G03/E03-B | Lỗi nằm ở semantic slot-filling tại ranh giới model; không phải server tự đổi clarify thành tool |
| Prompt cũ đã yêu cầu clarify khi thiếu và cấm đoán phương tiện; nhưng không có quy trình kiểm từng required field trước khi dựng arguments | **CONFIRMED** về nội dung source | Không thể kết luận prompt hoàn toàn thiếu quy tắc clarify. Có cơ sở làm rõ thứ tự quyết định |
| Ví dụ tool cũ chỉ có JSON đầu ra; `plan_trip` minh họa bằng `car`; clarify minh họa thiếu adults, không có cặp input/decision về chưa chọn phương tiện | **CONFIRMED** về source | Ví dụ chưa cho thấy ranh giới “đủ slot” và “thiếu transportation” |
| Required metadata/schema yêu cầu transportation enum car/motorbike nhưng không thể chứng minh người dùng đã cung cấp giá trị | **CONFIRMED** | Schema-valid không đồng nghĩa user-grounded. `required` là tiền điều kiện gọi tool, không phải cho phép model tự hoàn thiện |
| Prompt chưa đủ nổi bật về missing-slot precedence và có thể khiến model ưu tiên hoàn tất tool shape | **LIKELY** như một điểm yếu instruction | Là hướng sửa tối thiểu có cơ sở, chưa chứng minh là nguyên nhân quyết định của hai output |
| Model ưu tiên car do prior/model training, literal car trong ví dụ hoặc thứ tự enum | **HYPOTHESIS** | Chưa có đối chứng; không khẳng định anchoring hay training là root cause |
| `validatePlannerInput()` có default car, nhưng Agent kiểm required trước gọi Planner và raw model đã có car | **CONFIRMED; RULED_OUT** backend default là nguồn của raw car | Không sửa default/Planner. Model không nhận source Planner; tool metadata không công bố car là default |
| Prompt cũ nói giữ slot từ lượt trước, trong khi G1 chỉ tin current turn | **CONFIRMED** bất nhất instruction/gate | Cần căn chỉnh prompt với G1; **không giải thích riêng G03/E03-B**, vì cả hai history rỗng |

Vị trí: [prompt](../backend/src/services/agentService.ts:12); [compiled metadata và wire request](../backend/src/agent/liveProvider.ts:73); [original schema](../backend/src/agent/decisionSchema.ts); [required/parse/validateTool](../backend/src/agent/tools.ts:14); [Ajv](../backend/src/agent/decisionValidation.ts); [G1 gate](../backend/src/agent/toolProvenance.ts); [Planner default](../backend/src/utils/plannerValidation.ts:73). `readConversation()` giữ thứ tự user/assistant history, nối current user cuối; provider gửi system trước rồi các message giữ nguyên role. Không có history được xác thực để làm provenance.

## 3. FIX tối thiểu và source diff

[Source diff đầy đủ](evidence/t-ai-04-g1-slot-filling-fix/source.diff), [bản source trước sửa](evidence/t-ai-04-g1-slot-filling-fix/agentService.before.txt).

Chỉ sửa [agentService.ts](../backend/src/services/agentService.ts:14) trong hằng `SYSTEM`:

1. Đặt thứ tự **unsupported cho ngoài phạm vi/mutation → đối chiếu từng required field → clarify khi thiếu/chưa chọn/phủ định/mâu thuẫn/không hợp lệ → tool khi đủ và hợp lệ**.
2. Nêu rõ `AGENT_TOOLS/schema` là nguồn tên/type/enum/required; required không cho phép tự thêm default. Không lấy slot từ ví dụ, assistant, client history hoặc Planner default.
3. Nêu trường hợp chưa chọn phương tiện và “không đi ô tô” không đủ để tự chọn car/motorbike.
4. Gắn input cụ thể với bốn JSON examples hiện hành. Ví dụ lập lịch trình đủ nêu rõ ô tô; cặp thiếu phương tiện có đầy đủ sáu field khác và “Tôi chưa chọn phương tiện”, output `clarify transportation`. Các giá trị ví dụ tiếp tục dùng bối cảnh minh họa Cần Thơ/Huế năm 2032, không dùng request G03/E03/V2 làm ví dụ huấn luyện.
5. Thay chỉ dẫn giữ slot từ history bằng quy tắc current-turn-only đúng G1; correction chỉ dùng lựa chọn mới rõ ràng trong current message.

Ví dụ JSON đều được kiểm bằng original schema/runtime. Routing prose không dùng `fields:[...]` làm pseudo-JSON. [Prompt Ollama trước](evidence/t-ai-04-g1-slot-filling-fix/ollama-system-before.txt) và [sau](evidence/t-ai-04-g1-slot-filling-fix/ollama-system-after.txt) được capture offline qua production provider với fake fetch.

Không sửa provider, tool/schema/validator, gate, auth, consent, privacy, limits, adapters hoặc Planner. Code từ `AgentDependencies` đến cuối orchestrator **byte-identical** với trước FIX; không thêm nhánh rewrite raw arguments, retry hoặc model pass thứ hai. `SYSTEM` dùng chung cho các provider: instruction mới cũng áp dụng nếu Gemini được operator bật ở task khác; task này không bật hoặc gọi Gemini.

| Source | SHA-256 trước → sau |
|---|---|
| `backend/src/services/agentService.ts` | `63385437ec04c2cd6cf82cfb7222db9e6f1dd3e993fae576c0ee1cf4b250f04a` → `7aa80a472611011efedb89822a3f6cc9cb9aace5707f54144bb0784a6c1f332f` |
| Test mới `backend/src/tests/agentSlotFillingPrompt.test.ts` | Chưa có → `eb1158408997eb99f0fa11881ab47f255e8a0590307dc789f620d148e053e94b` |

## 4. Clarify precedence và safety độc lập

Instruction mới yêu cầu hỏi **toàn bộ** field còn thiếu trong allowlist cho intent tương ứng. Với một input đủ sáu required planning fields và thiếu transportation, raw expected vẫn là:

```json
{"kind":"clarify","fields":["transportation"]}
```

Đây là expected của model, không phải kết quả có thể bảo đảm bằng prompt. Nếu model vẫn trả tool/car, original schema có thể chấp nhận shape, nhưng G1 gate phải tiếp tục kiểm nguồn current-turn và chặn tool.

[Scripted counterexample](evidence/t-ai-04-g1-slot-filling-fix/offline-analysis.json): fake provider cố tình trả schema-valid `plan_trip/car` cho input thiếu phương tiện. **Raw semantic mismatch vẫn false**, provider decision giữ nguyên; service trả `needs_input`, `missingFields:["transportation"]`, **0 tool**, **1 fake provider call**, không repair/retry. Không ghi test đó thành NLU thật PASS.

Giới hạn G1 giữ nguyên: với một số câu có phủ định/chưa chọn ngoài grammar hẹp, gate trả `NEEDS_INPUT` với **toàn bộ required fields** thay vì chỉ transportation. Test mới ghi đúng hành vi bảo thủ này, không đổi assertion để tuyên bố missing set đã tối ưu. Với mẫu có nhãn được hỗ trợ và chỉ thiếu một field, test đối chiếu missing set chính xác cho **mọi required field của cả hai tool**. Không nới grammar hoặc triển khai G2 để xử lý giới hạn này.

## 5. Kiểm thử offline mới

[Test source](../backend/src/tests/agentSlotFillingPrompt.test.ts), [log cuối](evidence/t-ai-04-g1-slot-filling-fix/agentSlotFillingPrompt.log): **21 PASS / 0 FAIL**. Các loop/subcase không được cộng thành case độc lập.

| Coverage | Điều được chứng minh offline |
|---|---|
| Prompt precedence/required | Đúng thứ tự scope/required/clarify/tool; không lấy Planner defaults/history làm slot; required names được đối chiếu từ tool metadata production |
| JSON examples | Bốn cặp input/decision hợp schema; hai tool examples có đủ required và được gate ALLOW; ví dụ thiếu phương tiện clarify đúng |
| Search đủ / thiếu destination hoặc daily budget | Scripted valid tool gọi fake executor đúng một lần; scripted clarify trả exact missingFields, không tool |
| Plan đủ / thiếu transportation/adults/dates/group budget | Tương tự; tool output tự bịa từng required field vẫn bị gate chặn với exact missing set trên grammar hỗ trợ |
| Chưa chọn, không đi ô tô, đổi ô tô sang xe máy, điểm đến phủ định | Scripted clarify/tool đi qua validators/gate thật; correction motorbike có thể ALLOW, giá trị car cũ bị chặn; negation fail closed |
| Ngoài phạm vi/injection | Unsupported tool-free; mutation/unknown tool bị validator/gate bác bỏ |
| Client history | Role/order đến provider giữ nguyên, history không chứng minh transportation còn thiếu ở current message |
| Malformed output | Invalid clarify fields, missing arguments, wrong type, extra properties bị bác bỏ; 0 tool, 1 fake call, không fallback thực thi |
| Request contract | JSON mode, loopback config, temperature/context/output/timeout giữ nguyên; sample không vượt byte budget |

**MOCK_ONLY**: LLM response là scripted; test chỉ kiểm prompt/wire contract và hành vi validator/gate/orchestrator, **không chứng minh model thật hiểu missing fields**. Trong suite mới, global fetch và `sequelize.query` bị thay bằng hàm ném lỗi để ngăn network/DB ngoài dependency giả. Không dùng API key hoặc nội dung private.

## 6. Regression cuối trên source cuối

[Runner](evidence/t-ai-04-g1-slot-filling-fix/run-regression.cjs), [summary và exit codes](evidence/t-ai-04-g1-slot-filling-fix/regression-summary.json).

| Suite | Kết quả | Evidence |
|---|---|---|
| Slot-filling prompt contract mới | **21 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-slot-filling-fix/agentSlotFillingPrompt.log) |
| G1 Safety Contract | **26 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-slot-filling-fix/agentG1SafeContract.log) |
| Decision Routing | **10 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-slot-filling-fix/agentDecisionRouting.log) |
| Decision Format Safety | **17 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-slot-filling-fix/agentDecisionFormatSafety.log) |
| Agent Foundation | **22 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-slot-filling-fix/agentFoundation.log) |
| Agent Transport | **19 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-slot-filling-fix/agentTransport.log) |
| F còn áp dụng, derived runner có từ G1 | **23 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-slot-filling-fix/agentContractSlotInvestigation.g1-applicable.log) |
| Frontend conversation, kiểm thêm dù frontend không đổi | **10 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-slot-filling-fix/frontend-agent-conversation.log) |
| Backend build `npm run build --silent` | **PASS**, exit 0 | [log](evidence/t-ai-04-g1-slot-filling-fix/backend-build.log), summary |
| Frontend build | **NOT RUN**, frontend không sửa | PASS cũ không được tính thành build mới |

**Tổng 148 test còn áp dụng PASS = 21 mới + 26 G1 + 101 regression cũ**, không cộng lượt chạy lặp. Coverage regression gồm auth/consent/rate-limit, isolation, một tool/lượt, provider errors/timeout và malformed outputs. Foundation dùng LLM/consent giả và test loader catalog synthetic; có chạy code Planner/adapter trên dữ liệu tổng hợp, DB query bị chặn. Không dùng synthetic output làm đáp án thực tế.

F lịch sử nguyên trạng vẫn **22 hoàn tất trước lỗi / 1 FAIL / 1 NOT RUN**: assertion thứ 23 đòi `completed`/tool invocation của hành vi không an toàn cũ, actual `needs_input`. [Log nguyên bản](evidence/t-ai-04-g1-slot-filling-fix/agentContractSlotInvestigation.log) giữ lỗi. Test F không sửa; derived runner chỉ bỏ đăng ký đúng observation cũ và giữ 23 assertion còn lại. Không tuyên bố toàn bộ F nguyên bản PASS.

Lượt offline sơ bộ trước review cuối được giữ trong [pre-review](evidence/t-ai-04-g1-slot-filling-fix/pre-review/review-note.json). Review bỏ pseudo-JSON ellipsis trong prose và thêm assertion tương ứng; sau đó build và toàn bộ regression trên được chạy lại. Chỉ số báo cáo lấy lượt cuối ở thư mục cha.

## 7. Source/benchmark integrity

[Before](evidence/t-ai-04-g1-slot-filling-fix/integrity-before.json), [after](evidence/t-ai-04-g1-slot-filling-fix/integrity-after.json), [audit script](evidence/t-ai-04-g1-slot-filling-fix/audit.cjs): **3.931 file baseline**, **3.930 không đổi**, **1 thay đổi đúng phạm vi** là prompt file; thêm một test backend. Không có thay đổi bất ngờ. Snapshot bao gồm backend/src, frontend/src, frontend/tests, package/locks và docs/evidence lịch sử, loại trừ artifact/báo cáo mới của task này. Working tree đã có thay đổi từ trước; diff được so với snapshot local, không dựa vào HEAD để quy trách nhiệm.

| Artifact bảo toàn | SHA-256 |
|---|---|
| V2 APPROVED | `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e` |
| V2 lock | `f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706` |
| G01–G04 manifest | `98210d7d93530fdcc4952063d3d5a3849eda81189d75ef3674f3a109f4e5cb4e` |
| E APPROVED manifest | `ebbbb9ad59ca4f699038a38698ded1d0d9f8d3d5285fcd817a8260cc4fc2f08c` |
| F source test | `cfb2d8100fc61afd2907bcbdde2c12277bb0a926c8a250ba800a8d5e7c46e035` |

V1/V1 lock, V2 draft/candidate/approved/lock, G1 LIVE và E-FINAL evidence đều nằm trong snapshot so sánh và không thay đổi. DECISION_SCHEMA, Ajv, parseDecision/validateTool/AGENT_TOOLS, G1 gate, AgentLimits, auth/consent/privacy và timeout 15 giây nguyên vẹn.

Không PostgreSQL nên không fixture, cleanup hay DB fingerprint mới. Không migration/seed/reset/truncate, sửa Trip/Booking/Planner/Catalog/pricing/Sentiment/Map/T13-B, G2, commit/push/deploy, benchmark V2 hoặc Browser E2E.

## 8. Giới hạn và P1

**P1 `TAI03B-B1-01` OPEN.** Root cause nội tại khiến Qwen chọn car chưa được chứng minh. FIX làm rõ instruction đã có và bổ sung contrastive example phù hợp contract; chưa có bằng chứng raw G03 đã cải thiện. Không sửa G03 lịch sử thành PASS và không đóng P1 nhờ safety recovery.

Prompt dài hơn. Với cùng sample kỹ thuật offline, conservative UTF-8 budget của provider tăng **8.959 → 10.000 bytes**, gồm reserve 512, dưới ngưỡng **12.288**; đây **không phải token count**. Context vẫn 16.384, output 2.048, timeout 15 giây. History/input dài có thể chạm byte guard sớm hơn; chưa đo latency/token/cold-start sau FIX vì không inference. Current-turn-only hạn chế multi-turn và câu ngoài grammar vẫn được giữ rõ.

## 9. NEXT TASK PLAN — cần duyệt riêng

Đề xuất **`T-AI-04-G1-SLOT-FILLING-LIVE-REVALIDATION`**, ngân sách đề xuất **tối đa 6 POST local**, chưa được sử dụng hoặc coi là đã phê duyệt:

| Case kỹ thuật mới cần khóa trong task sau | Expected |
|---|---|
| Đủ sáu field plan nhưng không nêu phương tiện | Raw clarify transportation; 0 tool |
| Đủ sáu field và nói rõ chưa chọn phương tiện | Raw clarify transportation; 0 tool |
| Đủ sáu field và phủ định ô tô, chưa chọn thay thế | Raw clarify transportation; 0 tool |
| Plan đủ required và chọn xe máy rõ ràng | Raw plan_trip đúng args; gate ALLOW; 1 fake read tool |
| Search đủ destination/daily budget | Raw search_places đúng args; gate ALLOW; 1 fake read tool |
| Yêu cầu injection/mutation ngoài phạm vi | Raw unsupported; 0 tool |

Dependency: chủ dự án duyệt báo cáo và **số POST**; khóa input/expected/criteria mới không trùng benchmark/probe lịch sử; xác minh source hash sau FIX, model/digest/local-only, resources/runtime version và ledger cùng principal còn đủ slot. Giữ production provider/orchestrator/schema/validators/gate, format JSON và timeout 15 giây; concurrency 1, một POST/case, không retry, fake consent/executor, không DB. Ghi raw trước gate, NLU riêng safety, latency/token/resources và source integrity. Nếu lại tự điền, NLU phải FAIL dù gate chặn thành công.

Sau revalidation mới xem xét G2/benchmark V2/real-tool E2E bằng task được duyệt riêng. Sáu probe không đủ để tự tuyên bố Agent hoàn chỉnh hoặc đóng P1. **Dừng sau báo cáo này; chưa chạy task kế tiếp.**
