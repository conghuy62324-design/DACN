# T-AI-04-F — Điều tra contract và nguồn gốc tham số (offline)

Ngày 09/11/2026, Asia/Ho_Chi_Minh. **Đã hoàn tất điều tra, thiết kế và kiểm thử offline; không sửa production.** Bộ test mới có **24/24 PASS**, regression liên quan **102/102 PASS**; đây là test contract/MOCK_ONLY, **0 Ollama inference, 0 PostgreSQL, 0 Catalog/Planner thật**. Một test PASS cố ý ghi lại **phản ví dụ của prototype**, nên không được hiểu 24/24 là gate đã an toàn để triển khai. P1 `TAI03B-B1-01` **OPEN**.

## 1. Evidence root cause hiện có

Đã đọc [A-FIX](HUGO_T_AI_04_A_FIX_REPORT.md), [C decoder](HUGO_T_AI_04_C_DECODER_INVESTIGATION_REPORT.md), [D safety](HUGO_T_AI_04_D_DECISION_FORMAT_SAFETY_REPORT.md), [E B/C](HUGO_T_AI_04_E_CONTROLLED_FORMAT_SAFETY_REPORT.md) và [E-FINAL](HUGO_T_AI_04_E_FINAL_REPORT.md). NLU V2 trước FIX **3/24 PASS**, probe sau FIX **2/5 PASS**; A/B format A **1/4**, B **3/4**; B/C E01–E04 B **3/4**, C **1/4**. [Combined E results](evidence/t-ai-04-e-final/run-20261109T041645807Z-ae626a88/combined-results.json) cho thấy: B chọn đúng hai tool E01/E02 và đủ required args; C tạo tool ở E01/E02/E03 nhưng thiếu `arguments` 3/3; E03-B là JSON/tool decision **hợp lệ theo schema/runtime** nhưng tự điền `transportation:"car"` khi user nói chưa chọn; E04-B/C cùng từ chối mutation/injection. Không có tool thật trong các probe E.

| Phát hiện | Mức chứng cứ | Ý nghĩa |
|---|---|---|
| `DECISION_SCHEMA` hiện có root `anyOf` bốn nhánh, `unsupported` cần ít field nhất; A trả `unsupported` 4/4 ở phép thử C và 24/24 baseline | **CONFIRMED** về source/output; cơ chế decoder **LIKELY**, chưa chứng minh duy nhất | Cần tránh kết luận prompt hoặc model là nguyên nhân đơn lẻ |
| Schema C root object chỉ yêu cầu `kind`, để `name`/`arguments` tùy chọn; ba response C thiếu `arguments` | **CONFIRMED** | C không bảo đảm contract tool dù có chọn tên tool |
| B E03 tự đưa `car`, `parseDecision()`/`validateTool()` đều nhận; server hiện không đối chiếu argument với lời user | **CONFIRMED** | Kiểm kiểu/schema không kiểm được provenance/ý nghĩa; nguy cơ gọi Planner sai ý định |
| [Orchestrator](../backend/src/services/agentService.ts) có thể thực thi fake tool với decision `car` hợp lệ dù current message nói “chưa chọn phương tiện” | **CONFIRMED offline** bằng [test mới](../backend/src/tests/agentContractSlotInvestigation.test.ts); fake tool duy nhất | Đây là lỗ hổng kiểm soát tham số hiện tại, không phải bằng chứng đã gọi Planner/DB thật |
| Model/template hoặc constrained decoder nào gây collapse; conditional schema có cải thiện không | **HYPOTHESIS** | Không chạy inference trong F, chưa có phép đo cho các phương án mới |

## 2. Source và vị trí chặn trước tool

- [liveProvider.ts](../backend/src/agent/liveProvider.ts:73) ghép `AGENT_TOOLS`/`DECISION_SCHEMA` vào system, gửi Ollama `format:DECISION_SCHEMA` ở dòng 99; sau raw JSON chỉ gọi `parseDecision()` và `validateTool()` ở dòng 110–113. Nếu chuyển B `format:"json"`, cần thêm **kiểm original `DECISION_SCHEMA` ở runtime** trước parse; JSON mode không tự bảo đảm schema.
- [decisionSchema.ts](../backend/src/agent/decisionSchema.ts) định nghĩa branch `clarify`/hai tool/`unsupported`. [tools.ts](../backend/src/agent/tools.ts:17) là nguồn duy nhất của tên tool, tham số và `required`: `search_places` cần `destinationCity`, `dailyBudgetPerPerson`; `plan_trip` cần bảy trường. `parseDecision()` từ chối tool/field ngoài allowlist; `validateTool()` chặn sai kiểu, giá trị và required thiếu. Không nới hai hàm này.
- [agentService.ts](../backend/src/services/agentService.ts:59) thực hiện auth → `readConversation()` → external consent (nếu provider ngoài) → `AgentLimits.consume()` → đọc consent → provider → parse → validate → [tool execution](../backend/src/services/agentService.ts:108). **Điểm đặt gate** là sau decision/schema/`validateTool()` hợp lệ và trước `this.tools.execute()`. Gate chỉ có quyền `ALLOW`, `CLARIFY` hoặc fail closed; không tự sửa arguments hay gọi tool thứ hai.
- [conversation.ts](../backend/src/agent/conversation.ts:27) kiểm role/order/length của history nhưng **history do client gửi, không có owner binding**. [frontend AgentConversation](../frontend/src/utils/agentConversation.ts:48) giữ history trong bộ nhớ và gửi lại ở lượt sau; [AgentService frontend](../frontend/src/services/agentService.ts) chỉ project role/content. Test cross-account hiện hành chứng minh server không chia sẻ state, **không chứng minh client history được xác thực theo account**. Không thể tin history là provenance của account nếu chưa có proof từ server.
- [plannerValidation.ts](../backend/src/utils/plannerValidation.ts) có default trực tiếp cho departure, dates, adults, totalBudget, transportation; **Agent contract vẫn yêu cầu tường minh bảy trường** qua `AGENT_TOOLS`. Không dùng Planner default `car` để hợp thức hóa E03-B.

## 3. So sánh contract B và conditional schema

| Hướng | Khả năng từ evidence | Safety yêu cầu | Rủi ro/chưa biết | Đánh giá |
|---|---|---|---|---|
| **B: `format:"json"` + strict validation + provenance gate** | E: tool đầy đủ 2/2, unsupported 1/1, nhưng clarify 0/1; B 3/4 tổng | Kiểm original `DECISION_SCHEMA` tại backend, rồi giữ `parseDecision()`/`validateTool()`; không sửa raw output. Gate required-slot trước tool để chặn `car` không có nguồn | JSON mode từng sinh `children` sai ở D03-B; E03-B sai semantic dù schema PASS. Cần extractor/canonicalizer an toàn và history có owner proof | **Ưu tiên thiết kế G**, chưa production-ready |
| **Conditional schema theo kind** (`if/then` hoặc `oneOf` có `required`/`additionalProperties:false`) | Chưa có phép đo Qwen3/Ollama cho schema này | `tool` phải có `name,arguments` đúng schema từ `AGENT_TOOLS`; clarify cần `fields` từ `FIELD_LABELS`; unsupported chỉ `kind`; runtime giữ nguyên | Constrained decoding với root union A đã collapse; conditional encoding có thể tái xuất hiện collapse hoặc không được subset decoder hỗ trợ. Cũng không phát hiện E03-B tự điền `car` | Phương án nghiên cứu phụ, cần probe riêng được duyệt |

Schema C thiếu `arguments` vì chính schema C cho phép thiếu; đây là **lỗ hổng contract của schema C**, không chứng minh mọi root object đều sai. Conditional schema có thể ràng buộc syntax nhưng không thể chứng minh một value xuất phát từ user. Không tự chuyển production sang B/conditional trong F. Bất kỳ schema generation nào cũng phải để original validator và allowlist làm lớp bắt buộc sau model; không bỏ field sai, thêm args thiếu hoặc retry để biến FAIL thành PASS.

## 4. Ma trận provenance cho mọi required argument

Nguồn tin cậy đề xuất: **current user message** đã qua auth, hoặc **history user turn được server xác thực và ràng buộc cùng account**. Assistant text, profile, catalog, dữ liệu account khác, model output và chỉ một citation tự khai đều không phải nguồn độc lập. Latest user turn `SET` thay giá trị cũ; `UNSET`/phủ định mới nhất vô hiệu hóa giá trị cũ. Nếu nguồn/giá trị không xác định chắc chắn, hỏi lại, không tool.

| Tool / required field | Bằng chứng cần có và kiểm giá trị | Khi thiếu, phủ định hoặc mâu thuẫn |
|---|---|---|
| `search_places.destinationCity` | Địa điểm user nêu rõ cho **tìm kiếm**; so tên chuẩn hóa Unicode, kiểm vai trò địa điểm trong câu | `clarify:destinationCity`; không lấy city từ Catalog hoặc assistant |
| `search_places.dailyBudgetPerPerson` | Số VND gắn rõ ngân sách **mỗi người/ngày**, gồm 0 hợp lệ theo contract | `clarify:dailyBudgetPerPerson`; không tự chia ngân sách nhóm |
| `plan_trip.departureCity` | Nơi xuất phát user nêu; latest correction thắng | `clarify:departureCity`; không dùng default Hà Nội của Planner |
| `plan_trip.destinationCity` | Điểm đến user nêu rõ; phải phân biệt với địa điểm bị phủ định/loại trừ | `clarify:destinationCity`; không lấy từ lời assistant hoặc chỉ match chuỗi |
| `plan_trip.startDate` | Ngày bắt đầu rõ **năm**, parse/validate calendar date | `clarify:startDate`; không dùng ngày hiện tại |
| `plan_trip.endDate` | Ngày kết thúc rõ năm và khoảng ngày; “3 ngày” không tự chứng minh ngày kết thúc nếu thiếu ngày bắt đầu | `clarify:endDate`; không dùng mặc định +2 ngày của Planner |
| `plan_trip.adults` | Số **người lớn** rõ; “2 người” một mình có thể mơ hồ với trẻ em | `clarify:adults`; không dùng default 1 của Planner |
| `plan_trip.totalBudget` | Ngân sách **cả nhóm** VND >0; latest sửa budget thắng | `clarify:totalBudget`; không dùng default 5 triệu của Planner |
| `plan_trip.transportation` | Lựa chọn user nêu rõ `car`/ô tô hoặc `motorbike`/xe máy, không nằm trong phủ định | `clarify:transportation`; “chưa chọn phương tiện” phải vô hiệu hóa lựa chọn cũ, không dùng default `car` của Planner |

Optional model argument cũng cần nguồn hoặc đúng default **đã được backend cho phép** (ví dụ `children=0`, `pacing=balanced`, `preferences=[]`, `mandatoryPlaceIds=[]` từ `validateTool()`/Planner). Non-default `category`, `preferences`, Place ID hay số trẻ em không được model tự thêm. Tập default phải lấy từ validator/service hiện hành, không sao chép thành tool spec thứ hai. Không suy giá, Place, cost, hoặc Planner output từ model; các kết quả đó chỉ do adapter thật trả sau gate.

Ví dụ trong yêu cầu: “Tôi muốn đi Đà Lạt 3 ngày, 2 người, ngân sách 7 triệu, nhưng chưa chọn phương tiện.” **Nếu chỉ có đúng câu đó**, ngoài transportation còn thiếu nơi xuất phát, ngày bắt đầu/kết thúc rõ năm và số người lớn rõ. Gate phải hỏi đủ các trường thiếu; chỉ hỏi riêng `transportation` khi các required còn lại đã có bằng chứng hợp lệ từ current/verified history. Unit test kiểm cả hai tình huống, giữ nguyên expected E03 từ manifest đã khóa (E03 có đủ các trường khác).

## 5. Thiết kế missing-field gate và history proof

[Prototype trong test](../backend/src/tests/agentContractSlotInvestigation.test.ts) dùng `AGENT_TOOLS.parameters.required` động, không tạo tool spec thứ hai. Nó nhận observation test-only gồm `field`, `SET/UNSET`, value, index và text span; kiểm message role=user, account khớp, serverVerified, text span thật, canonical value; lấy observation mới nhất. Chỉ `ALLOW` nếu mọi required field có nguồn và khớp argument model. Nếu thiếu/phủ định/đổi khác thì `CLARIFY`; malformed decision/unknown tool/sai kiểu/optional không có nguồn thì `REJECT`; unsupported không gọi tool. Gate thử nghiệm **không được import vào production**.

```text
auth + consent + AgentLimits (giữ thứ tự hiện hành)
messages = current user turn + verified same-account history
raw = Ollama JSON mode B (chỉ ở task G sau duyệt)
strictOriginalSchema(raw) ? parseDecision(raw) : safe provider error
if tool:
    validated = validateTool(decision)        # giữ nguyên validator/allowlist
    reject malformed/missing arguments        # không tự hoàn thiện model output
    required = AGENT_TOOLS[decision.name].parameters.required
    for field in required:
        source = latest verified user evidence for field
        if missing/UNSET/ambiguous or canonical(source) != decision.arguments[field]:
            add field to missingFields
    if missingFields: return existing needs_input; toolCalls = 0
    verify optional non-default args also have source
    execute exactly one read-only catalogPlannerTools call
if clarify: validate FIELD_LABELS; when target tool is trusted, compare requested fields to computed missing set
if unsupported: return existing unsupported; toolCalls = 0
```

**History dependency:** `readConversation()` hiện không thể biết history đến từ cùng account. Để dùng history làm provenance ở G mà không thêm DB, đề xuất `historyProof` có HMAC theo mục đích riêng, ký `userId`, hash của canonical history, `issuedAt`, `expiresAt` (TTL ngắn) và version; backend kiểm timing-safe, đúng account/hash/TTL **trước provider**, không đưa proof hoặc key vào prompt. Có thể dùng khóa tách mục đích dẫn xuất từ secret server hiện có sau review hoặc secret Agent riêng; không dùng trực tiếp JWT token làm proof. Request history không kèm/không khớp proof: không được làm nguồn slot; xử lý lỗi an toàn hoặc buộc bắt đầu hội thoại mới. Latest current user turn vẫn có thể thay đổi hoặc UNSET các slot đã xác thực. `historyProof` chỉ xác minh nguồn history, **không chứng minh nội dung assistant là fact** và không làm model citation trở thành tin cậy.

**Giới hạn extraction:** exact text span không đủ xác định nghĩa. Test cố ý cho thấy prototype **sai** nếu chỉ trích substring “Đà Lạt” trong “không đi Đà Lạt”: vẫn trả `ALLOW`. Rule negation hẹp cho “không đi ô tô” chỉ là canary, không phải NLU tiếng Việt tổng quát. Vì vậy G phải có parser/canonicalizer theo field, kiểm ngữ cảnh/phủ định và fail closed với cách diễn đạt chưa chứng minh; trường hợp mơ hồ cần user xác nhận qua luồng `needs_input` hoặc form/chip có chủ ý. Không được dùng nguyên prototype/regex trong F làm FIX. Cần test negative counterexample này thành **FAIL của production implementation**, dù test F hiện PASS vì nó ghi lại limitation.

Clarify còn thiếu `targetTool` trong decision schema hiện hành. Nếu intent tool đã có từ verified context hoặc rõ ràng theo contract thì đối chiếu toàn bộ missing set; nếu không rõ, không tự đoán tool/fields. G cần thiết kế cách xác định target tool ở lớp nội bộ, hoặc hỏi người dùng xác nhận intent; không thêm tool vào allowlist. Không đổi locked expected để hợp thức hóa fallback. Nếu B trả tool với tham số model tự điền và gate chuyển sang `needs_input`, đó là **safety recovery**, vẫn ghi NLU decision gốc là FAIL trong evaluation.

## 6. Unit/regression offline

| Suite | PASS / FAIL | Evidence |
|---|---:|---|
| T-AI-04-F candidate policy/contract | **24 / 0** | [final log](evidence/t-ai-04-f-contract-slot-filling/agentContractSlotInvestigation-final.log) |
| Decision format safety | **17 / 0** | [log](evidence/t-ai-04-f-contract-slot-filling/agentDecisionFormatSafety.log) |
| Decision routing | **10 / 0** | [log](evidence/t-ai-04-f-contract-slot-filling/agentDecisionRouting.log) |
| Agent foundation | **22 / 0** | [log](evidence/t-ai-04-f-contract-slot-filling/agentFoundation.log) |
| Agent transport | **19 / 0** | [log](evidence/t-ai-04-f-contract-slot-filling/agentTransport.log) |
| Frontend conversation | **10 / 0** | [log](evidence/t-ai-04-f-contract-slot-filling/frontend-agent-conversation.log) |
| Tổng | **102 / 0** | [summary + integrity](evidence/t-ai-04-f-contract-slot-filling/integrity-and-regression-verified.json) |
| Backend `npm run build --silent` | **PASS** | [build log](evidence/t-ai-04-f-contract-slot-filling/backend-build-final.log), exit 0 |

24 test mới dùng fixture kỹ thuật độc lập với benchmark VI01–VI24, có tình huống tổng hợp tương tự E03 để tái hiện lỗi; không gọi Ollama/DB/real tool. Chúng kiểm đủ/thiếu arguments, unknown tool, wrong type, injection, car/motorbike/UNSET, đổi phương tiện/budget/ngày/người lớn, history hợp lệ/cross-account/assistant, clarify thiếu một/nhiều field, optional default và unsupported. Một test dùng `JsonLlmProvider` và **fake tool** để quan sát hành vi orchestrator hiện có; một test khác ghi **counterexample substring phủ định**. `PASS` ở hai test đó có nghĩa quan sát/giới hạn được tái hiện, **không phải safety đã đạt**. 68 test backend và 10 frontend còn lại là regression MOCK_ONLY; không chứng minh chất lượng NLU thật.

## 7. Phương án FIX ưu tiên và file dự kiến cho task G

**Chọn hướng B để triển khai có kiểm soát ở G:** `format:"json"` riêng cho Ollama, kiểm nguyên bản decision bằng original `DECISION_SCHEMA`, giữ `parseDecision()`/`validateTool()`; thêm gate provenance trước tool. Lý do: B có **2/2 tool case E đầy đủ args** và 3/4 tổng, trong khi A collapse và C thiếu `arguments` 3/3 tool-like outputs. Đây là **lựa chọn hướng thiết kế**, không phải phê duyệt production. G phải hoàn thiện extraction/history proof và xác minh live trước khi coi FIX đạt.

| File dự kiến | Thay đổi cần review ở G |
|---|---|
| `backend/src/agent/liveProvider.ts` | Ollama JSON mode, kiểm original `DECISION_SCHEMA` tại runtime trước `parseDecision()`; giữ strict error, size/token/timeout/local-only và Gemini behavior. Validator nên compile từ chính `DECISION_SCHEMA`, có xử lý `format:date/uuid`; không viết tool spec song song. |
| `backend/src/services/agentService.ts` | Dùng verified slot state, gate sau `validateTool()` và trước `this.tools.execute()`; `needs_input` với missingFields khi provenance thiếu, không sửa args/model raw. Giữ auth/consent/rate/one-tool order. |
| `backend/src/agent/conversation.ts` và module Agent mới có phạm vi hẹp | Bind history proof với user ID/TTL/hash; tạo observation/canonicalizer theo field, latest-turn/UNSET precedence, explicit default handling. Không đưa proof/secret vào LLM. |
| `backend/src/controllers/agentController.ts`, `frontend/src/types/agent.ts`, `frontend/src/services/agentService.ts`, `frontend/src/utils/agentConversation.ts`, `frontend/src/utils/agentContract.ts` | Nếu dùng signed history: nhận/trả `historyProof`, giữ token memory-only và xóa khi reset/logout; API `status`/`missingFields` hiện hành vẫn dùng, không cần endpoint mới. |
| Test backend/frontend riêng của G | Parser/negation/ambiguity/property tests, HMAC tamper/cross-account/expiry, fake provider/tool guards, consent/rate/privacy, một tool/lượt, frontend history reset. |

**API contract:** Với signed history, cần thêm field `historyProof` vào request/response; `readConversation()` đang `onlyKeys` nên phải cập nhật rõ ràng. Response `needs_input`/`unsupported`/`completed` và tool result không cần đổi nghĩa. Nếu chủ dự án muốn giữ API tuyệt đối không đổi, G phải **không dùng client history làm provenance**; multi-turn dựa trên history sẽ cần hỏi xác nhận lại và không đạt các acceptance multi-turn hiện có. Đây là quyết định phạm vi cần review trước khi G. Không schema DB/migration cần thiết cho token stateless.

## 8. Regression và acceptance bắt buộc cho bản FIX sau này

1. Backend/frontend build, 102 offline regression F và test mới của G PASS; không thay expected V2/E. Test negative “không đi Đà Lạt” phải **không ALLOW**, khác prototype F.
2. Ollama local output phải qua original schema + `parseDecision()` + `validateTool()`. Invalid `children` trong clarify, unknown tool, missing/wrong args, extra property và injection: **0 tool**, lỗi an toàn, không tự chữa để tính PASS.
3. `search_places`/`plan_trip` chỉ chạy khi **mọi required arg** được chứng minh từ current hoặc signed same-account history, đúng value/loại ngân sách/ngày/role địa điểm; không dùng Planner defaults cho required Agent fields. Nếu thiếu/mâu thuẫn/phủ định, trả `needs_input`/error an toàn và **0 tool**.
4. Car, motorbike, thay phương tiện ở lượt sau, sửa ngân sách/ngày/số người; history A không dùng cho B, token tamper/expiry/replay cũ được xử lý theo policy; assistant text không thành nguồn slot. `AgentLimits`, auth, external consent, privacy, timeout 15 giây và một tool/lượt giữ nguyên.
5. Không lưu Trip/Booking hoặc bịa Catalog/Planner result; nếu chạy E2E ghi DB ở task khác phải có test DB guard/sentinel/fingerprint/cleanup. Không tuyên bố NLU PASS từ MOCK_ONLY.
6. Sau FIX và owner approval inference riêng, cần probe mới khóa trước để kiểm B + gate và đánh giá lại **24 case V2 APPROVED bằng model thật** theo baseline đã khóa, sau đó Browser/API/DB E2E phù hợp. P1 chỉ đóng khi acceptance live và tool fidelity thực sự đạt; diagnostic PASS đơn lẻ không đủ.

## 9. Integrity và giới hạn còn lại

[Integrity cuối](evidence/t-ai-04-f-contract-slot-filling/integrity-and-regression-verified.json): **3.960/3.960 source baseline khớp**, 0 production file đổi; V2 approved SHA-256 `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`, V2 lock `f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706`, E manifest APPROVED `ebbbb9ad59ca4f699038a38698ded1d0d9f8d3d5285fcd817a8260cc4fc2f08c`; **123/123** file evidence lịch sử trong snapshot E-FINAL được rehash ở F và bất biến. Chỉ thêm [test F](../backend/src/tests/agentContractSlotInvestigation.test.ts), [audit script](../backend/scripts/t-ai-04-f-integrity.cjs), evidence và báo cáo F. Không inference, không DB, không gọi adapter thật, không commit/push/deploy.

Rủi ro chính: lớp provenance chỉ an toàn nếu parser/canonicalizer hiểu đúng **ngữ cảnh** và history được bind account. Prototype F cố ý không đạt điều đó cho mọi câu tiếng Việt; phản ví dụ địa điểm phủ định đã ghi. Strict runtime schema không phát hiện argument có nguồn gốc sai, và signed history không chứng minh model hiểu intent. Hướng B cần thêm thử nghiệm có phê duyệt riêng; conditional schema chưa có evidence. Không sửa production trong F.

## 10. NEXT TASK PLAN

**`T-AI-04-G-IMPLEMENT-CONTRACT-FIX` — chờ chủ dự án review thiết kế:** chốt quyết định `historyProof`/API và phạm vi extractor; triển khai B + original schema validator + gate fail closed theo `AGENT_TOOLS`, với canonicalizer có test phủ định/mơ hồ và history account binding; chạy build/unit/regression offline, source integrity và báo cáo FIX. Sau đó xin quyền riêng cho inference LIVE kỹ thuật và benchmark V2; không tự dùng quota cũ hay đổi expected. Nếu không thể chứng minh provenance an toàn cho một field, task G phải báo blocker hoặc yêu cầu xác nhận từ user, **không suy đoán để cho tool chạy**.

**Dừng tại báo cáo F. P1 `TAI03B-B1-01` OPEN.**
