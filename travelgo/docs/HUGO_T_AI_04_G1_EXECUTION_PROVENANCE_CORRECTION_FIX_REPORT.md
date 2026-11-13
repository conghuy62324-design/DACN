# T-AI-04-G1-EXECUTION-PROVENANCE-CORRECTION-FIX

Ngày 10/11/2026, Asia/Ho_Chi_Minh. **FIX offline PASS, với compatibility được báo riêng.** OBS-COMP-01 không còn ALLOW car cũ; model args giữ nguyên, không Planner execution ở phản ví dụ. **42/42 test FIX + 52/52 server completeness PASS**, backend build PASS. **0 Ollama inference/load/GET thật, 0 PostgreSQL.** LIVE NOT VALIDATED; P1 raw NLU và P2 runtime stability vẫn OPEN.

Không tuyên bố toàn bộ legacy PASS: actual original 181 là **145 PASS / 36 FAIL / 0 NOT RUN**; unchanged downstream controls **176 PASS / 5 FAIL**. 31 conflicts kế thừa server-first và 5 conflicts Foundation fixture được phân loại đầy đủ. Foundation control với một intent đạt **22/22**, không assessor/gate stub; kết quả đó không ghi đè FAIL gốc.

## 1. Baseline và root cause

Đã đọc [Server Completeness FIX](HUGO_T_AI_04_G1_SERVER_COMPLETENESS_POLICY_FIX_REPORT.md), [G1 Safe Contract](HUGO_T_AI_04_G1_SAFE_CONTRACT_FIX_REPORT.md), [F Contract/Slot Investigation](HUGO_T_AI_04_F_CONTRACT_SLOT_FILLING_REPORT.md), [Missing-Slot FIX](HUGO_T_AI_04_G1_MISSING_SLOT_DECISION_FIX_REPORT.md), source toolProvenance/currentCompleteness/missingSlotRecovery/AgentService/tools và evidence OBS-COMP-01.

**CONFIRMED:** `transportation()` ưu tiên explicit label cũ. `inspectCurrentRequiredSlots()` đã đánh dấu UNPROVEN khi label cũ mâu thuẫn positive correction, nên assessor trả UNDETERMINED. Execution gate lại gọi trực tiếp `observed()` và so `car` với label cũ, bỏ qua state UNPROVEN. Hai tầng dùng proof khác nhau; original schema chỉ chứng minh car là enum hợp lệ, không chứng minh user hiện chọn car.

Hai đường khác được test mới xác nhận trong cùng phạm vi correction:

- Khi có một `đổi sang` ở bất cứ đâu, helper cũ dùng `phrases.slice(-1)`, kể cả transport mention cuối không phải verified correction.
- `unique()` có thể bỏ mention chứa dấu hỏi rồi giữ value cũ. Nếu execution bỏ qua uncertainty, label/value cũ có thể được tái sử dụng sai.

Đây là lỗi **execution provenance/canonicalization**, không phải provider sửa raw, Planner default car, schema thay enum hoặc giá/pricing. Task không điều tra model inference mới.

## 2. Source diff tối thiểu

Chỉ sửa production [toolProvenance.ts](../backend/src/agent/toolProvenance.ts), thêm [agentExecutionCorrection.test.ts](../backend/src/tests/agentExecutionCorrection.test.ts). [Diff cuối](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-review/source-diff.patch), [hashes](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-review/source-hashes.json).

1. Gate dùng chung `inspectCurrentRequiredSlots()` với assessor. Required proof chỉ được dùng nếu đúng tool intent, state **SET**, value có mặt và khớp model arg; OMITTED/UNPROVEN hoặc mismatch trả NEEDS_INPUT, không execute.
2. Multiple transport choices không dùng “last string wins”. Chỉ nhận nhánh correction cũ khi **mệnh đề mang lựa chọn phương tiện cuối** chính là mẫu G1 `à đổi sang ô tô/xe máy`. Mention khác sau correction làm proof không chắc chắn; fail closed. Không mở thêm grammar.
3. Inspector giữ uncertainty của labeled/positive mentions, không biến việc extractor loại bỏ một mention mơ hồ thành bằng chứng giữ value cũ. Dấu hỏi ở correction được nhận diện để **từ chối proof**, không dùng để tạo facts.
4. Gate direct-call dùng lại `parseDecision()`/`validateTool()` gốc; malformed/full invalid input trả REJECT. Không dùng normalized/defaulted validator input làm provenance. Partial diagnostic vẫn trả missing proof, không execute; original Ajv/recovery vẫn kiểm missing-required-only như trước.

Không sửa currentCompleteness, missingSlotRecovery, AgentService, original schema/Ajv/validators/tools, SYSTEM, provider/readiness/abort, timeout/context/model, limits, auth/consent/privacy, Planner/pricing/Catalog/Trip/Booking/frontend. Không tạo tool spec thứ hai hoặc public bypass.

## 3. Correction/negation policy và execution behavior

| Trường hợp | Proof / execution sau FIX |
|---|---|
| Clear current car/motorbike, đủ required | SET đúng value; chỉ model args khớp mới ALLOW |
| Supported `Tôi muốn đi bằng ô tô, à đổi sang xe máy` hoặc chiều ngược lại | Latest verified correction được dùng; old value không ALLOW; new value có thể ALLOW khi mọi field khác hợp lệ |
| Label cũ vẫn tồn tại cộng positive correction mâu thuẫn | UNPROVEN; cả old/new args đều cần xác nhận lại; **không tự quyết định đổi label thành value mới** |
| Correction literal có dấu chấm/phẩy/comma ngoài grammar, ambiguous/unset/negation/quote/assistant/condition | Fail closed NEEDS_INPUT hoặc REJECT theo gate hiện có; không đoán lựa chọn cuối |
| Một correction trước đó nhưng sau còn lựa chọn chưa được chứng minh là correction | Không dùng `.slice(-1)` để hợp thức hóa mention cuối |
| Label/positive replacement có dấu hỏi | Không bỏ mention mơ hồ để dùng lại value cũ |
| Destination negative + positive correction G1 đã hỗ trợ, không label cũ che | Chỉ new destination có proof; old destination không ALLOW |
| Destination label cũ mâu thuẫn positive destination mới | UNPROVEN; cần hỏi lại, không tự chọn chuỗi cuối |
| Budget/adults/start/end hiện tại được thay bằng một label canonical rõ ràng | Model args khớp current value mới có thể ALLOW; old args không có proof |
| Hai label budget/adults/date khác nhau, hoặc correction prose ngoài grammar | Không mặc định label cuối thắng; fail closed cho cả hai value |
| Client/assistant/cross-account history chứa lựa chọn khác | Không tạo hoặc xóa current-turn proof |

Task không triển khai parser sửa mọi field bằng ngôn ngữ tự nhiên. Unknown không trở thành COMPLETE. Departure/destination và budget nhóm/daily-per-person vẫn phân vai; không chia tiền hoặc dùng Planner defaults để lấp required fields. Optional proof/default policy giữ nguyên.

Literal yêu cầu `Phương tiện: ô tô. À, đổi sang xe máy.` được kiểm cùng đầy đủ các required khác: grammar có thể chưa nhận đúng punctuation này, nhưng **không ALLOW car hoặc motorbike khi chưa chứng minh được**, không tool. Historical OBS đã xác nhận ALLOW nằm ở biến thể đầy đủ `Phương tiện: ô tô; à đổi sang xe máy`; không nhận mọi biến thể punctuation đều từng ALLOW trước FIX.

## 4. Chứng minh trực tiếp OBS-COMP-01

[Before/after pure-function replay](evidence/t-ai-04-g1-execution-provenance-correction-fix/proof-before-after.json) transpile snapshot source trước task và so với source mới, không gọi provider/DB/tool:

| Case | Trước | Sau |
|---|---|---|
| Old labeled car + later motorbike correction, model car | **ALLOW** | **NEEDS_INPUT transportation** |
| Cùng input, model motorbike nhưng proof vẫn UNPROVEN | NEEDS_INPUT | NEEDS_INPUT |
| Supported unlabelled correction car → motorbike, model motorbike | ALLOW | ALLOW |
| Supported correction, model vẫn car cũ | NEEDS_INPUT | NEEDS_INPUT |
| Correction rồi một positive mention khác chưa được verified | **ALLOW car** | NEEDS_INPUT |
| Old label car + questioned new label | **ALLOW car** | NEEDS_INPUT |

Test orchestrator thật với production provider/fake fetch cho model car cũ: raw/schema-valid decision vẫn là car; service trả `needs_input:[transportation]`; **0 executor invocation**. Không sửa car thành motorbike, không gọi Planner rồi sửa output, không tool thứ hai. Origin vẫn MODEL khi model được gọi; đây là execution safety, không phải raw NLU correctness PASS. Known omitted input vẫn SERVER_COMPLETENESS/NOT_EVALUATED trước provider như task trước.

## 5. Unit/integration FIX và build

Source cuối: [42 test FIX](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-execution-correction.log), [52 server completeness](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-server-completeness.log), [build](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-backend-build.log), [final source check](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-source-check.json).

**42/42 PASS** bao phủ car/motorbike rõ, hai chiều supported correction, old label còn tồn tại, exact punctuation từ yêu cầu, negation/unset/conflict, quote/assistant/conditional, invalid/questioned latest mention, destination/role/correction, budget/adults/date canonical replacement và contradiction, wrong budget role, invalid date/count/value, unknown/malformed/multi-tool/extra keys, partial schema/recovery, fake/cross-account history, injection/mutation/mixed intents, no second tool và frozen raw args không đổi.

**52/52 server completeness PASS**, giữ nguyên test source/expected. Supported incomplete vẫn 0 provider/GET/POST/tool; COMPLETE vẫn cần model/readiness/schema/gate; unknown không tự tạo fields; typed recovery raw FAIL không thành PASS; auth/consent/rate/API shape/log privacy vẫn được kiểm.

Mọi test mới chạy lại sau chỉnh comment cuối cùng. Full regression chạy trên cùng behavior cuối; [emitted-code check](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-source-check.json) xác minh chỉ có comment thay sau full run, TypeScript output khi bỏ comments byte-identical, rồi backend build + 42/52 được chạy lại. Không thay implementation sau các checks này.

Iteration evidence giữ nguyên: lượt 39 tests đầu **38 PASS/1 FAIL** phát hiện helper last-wins; sau bổ sung uncertainty coverage có lượt **41 PASS/1 FAIL** ở correction dấu hỏi; sửa proof, không sửa expected để tạo PASS. [First iteration](evidence/t-ai-04-g1-execution-provenance-correction-fix/first-iteration.log), [uncertainty iteration](evidence/t-ai-04-g1-execution-provenance-correction-fix/uncertainty-focused.log). Lượt cuối **42/42**, không cộng lượt lặp thành case mới.

Tất cả MOCK_ONLY. Native LLM/external fetch và DB bị chặn; fake consent/fetch/executor chỉ dùng fixture kỹ thuật. Không điểm NLU Qwen3 hoặc evidence LIVE mới.

## 6. Original regression, isolated control và compatibility

[Full runner execution](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-verified/execution.json), [review từng conflict](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-review/compatibility-review.json). Chạy đủ mọi registered case, không chọn subset thuận lợi. Runner tiếp tục sau case failure để thu kết quả; assertion/case body cũ không sửa. Một assertion fail vẫn có thể dừng phần còn lại trong chính case/subcase group; không đếm chúng thành test đã PASS.

| Suite | Actual production policy PASS / FAIL / NOT RUN | Unchanged downstream isolation PASS / FAIL |
|---|---:|---:|
| Server completeness | **52 / 0 / 0** | Không cần stub |
| New execution correction | **42 / 0 / 0** | Không dùng stub |
| Readiness/abort | 32 / 1 / 0 | **33 / 0** |
| Diagnostic | 8 / 5 / 0 | **13 / 0** |
| Missing-slot recovery | 13 / 20 / 0 | 33 / 0 |
| Slot-filling prompt | 11 / 10 / 0 | 21 / 0 |
| G1 safe contract | 26 / 0 / 0 | 26 / 0 |
| Decision routing | 10 / 0 / 0 | 10 / 0 |
| Decision format safety | 17 / 0 / 0 | 17 / 0 |
| Foundation, unchanged mixed-intent fixture | **17 / 5 / 0** | **17 / 5** |
| Transport/controls | 18 / 1 / 0 | 19 / 0 |
| F applicable | 23 / 0 / 0 | 23 / 0 |
| Frontend conversation | 10 / 0 / 0 | 10 / 0 |
| **Original 181 total** | **145 / 36 / 0** | **176 / 5** |
| Foundation single-intent fixture control, riêng | **22 / 0 / 0** | **Không assessor/gate stub** |
| Backend build | **PASS**, exit 0 | — |
| Frontend build / LIVE / DB / V2 / G2 / Browser | **NOT RUN** | Ngoài scope/source frontend không đổi |

**31 legacy FAIL baseline + 1 readiness conflict + 5 diagnostic conflicts kế thừa** server-first, cùng tên/cause như report trước: provider chưa được gọi ở known incomplete, nên raw capture/fault injection/mock clarification cũ không xảy ra. Không gọi đó là lỗi network đã xảy ra rồi bị che. Actual provider-path errors và abort vẫn kiểm ở COMPLETE/UNDETERMINED, new suites và isolated controls. FAIL gốc được giữ, không chuyển status thành PASS.

**5 Foundation conflicts thêm ở task này:** fixture `chat.message` cũ chứa cả `Tìm địa điểm; Lập lịch trình; ...`. Gate mới dùng independent shared proof nên không có đúng một read intent → NEEDS_INPUT, không tool. Đây là fail-closed tightening đã ghi nhận khi dùng common observations, không sửa Planner/backend để làm test PASS. Năm case cần executor/adapter nên không đạt expectation cũ:

- explicit preferences/opt-out execution count;
- tool backend failure/deadline;
- real Planner adapter với synthetic catalog;
- empty catalog/no-result/unavailable;
- malformed Planner result.

Assessor stub không thể bypass execution gate, nên năm case này **vẫn FAIL trong unchanged downstream controls**. Không tuyên bố 181/181 downstream PASS.

Để kiểm đúng adapter contract, [Foundation fixture control](evidence/t-ai-04-g1-execution-provenance-correction-fix/foundation-single-intent-control.log) chỉ loại intent không liên quan khỏi request test tương ứng scripted plan/search, giữ mọi value/model args/case body/expected assertion: **22/22 PASS** trên actual assessor/gate. [Exact fixture diff](evidence/t-ai-04-g1-execution-provenance-correction-fix/foundation-fixture-diff.json). Đây là control bổ sung; không ghi đè original 17/5 hoặc cộng thành 181 PASS. Planner code có chạy trên synthetic/test catalog ở control này, không dữ liệu PostgreSQL/Catalog thật.

Legacy layer controls chỉ stub assessor trong child test process để đi tới provider. Không production/client bypass và **không stub inspection/gate mới**; vì vậy không dùng chúng làm chứng cứ end-to-end production PASS. [Harness adaptation](evidence/t-ai-04-g1-execution-provenance-correction-fix/harness-adaptation.json) lưu source hash và thay đổi runner; actual runs có trước/riêng control.

[Historical F nguyên bản](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-verified/historical-F-unchanged.log) giữ **22 PASS trước stop / 1 FAIL / 1 NOT RUN**, expected unsafe completed, actual needs_input, ngoài 181 applicable. Không sửa assertion/evidence F. Không phát hiện failure chưa phân loại sau review; không khẳng định original assertions đều PASS.

## 7. Security acceptance

| Acceptance | Kết quả / giới hạn |
|---|---|
| OBS-COMP-01 car cũ không ALLOW | **PASS offline**, direct before/after và orchestrator, 0 tool |
| Supported verified correction chỉ dùng new value | **PASS**, car↔motorbike và supported negative/positive destination; new args có thể ALLOW, old args không |
| Ambiguous/latest unverified không dùng lại old value | **PASS**, label/correction/conflict/question/quote/unset cases; không general parser |
| Original schema/runtime strict | **PASS**, source không đổi, malformed/unknown/partial vẫn kiểm đúng; không repair raw |
| Server completeness/recovery | **52/52 PASS**, typed missing-only raw rejection giữ nguyên; compatibility riêng ở bảng trên |
| Auth/consent/rate/privacy/readiness/abort | Source giữ nguyên, applicable tests/controls như bảng; không bỏ qua gate để có success |
| No unauthorized/mutation/second tool | **PASS trong offline cases**; readonly fake executor đúng 0 hoặc 1 |
| Build/integrity | **PASS**; không LIVE quality claim |

Source gate không có executor: ALLOW chỉ là permission check, AgentOrchestrator vẫn giữ one-read-tool call site hiện hành. Không lấy model args/default/history làm independent proof, không thêm fields hoặc thay car thành motorbike.

## 8. Source và historical integrity

[Before](evidence/t-ai-04-g1-execution-provenance-correction-fix/integrity-before.json) / [after-final](evidence/t-ai-04-g1-execution-provenance-correction-fix/integrity-after-final.json): **4.433 baseline files, 4.432 không đổi**, đúng một production source file sửa, thêm một test source, **0 thay đổi bất ngờ**. **4.070 historical evidence files nguyên vẹn**; report/evidence task trước được đối chiếu checksum riêng. Snapshot gồm backend/src, frontend/src/tests, docs và package/locks; dist rebuild và derived runners là generated artifacts.

| Artifact/source | SHA-256 |
|---|---|
| toolProvenance.ts trước | `b59832d0ac1c3973609c098a5375f95360ef1bbf198a8557b6719cea8d859a8d` |
| toolProvenance.ts cuối | `95fb900e1471d8b18a7f869dea842fae97f19e3e7e9c128ff24d5e86177591a7` |
| Test mới | `7ce730276b3e21d694421d036d11999d1079df11fca04916a17123278a54ba40` |
| V2 APPROVED — không đổi | `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e` |
| V2 lock — không đổi | `f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706` |

[Protected source hashes](evidence/t-ai-04-g1-execution-provenance-correction-fix/final-review/source-hashes.json) xác minh currentCompleteness, missingSlotRecovery, AgentService/SYSTEM, original schema/Ajv/tools/parseDecision/validateTool, liveProvider/readiness/deadline, limits/privacy/conversation và 52-test source không đổi. Không sửa thuật toán Planner/pricing/Catalog/Trip/Booking, frontend, sentiment/ranking, model/tag/quant/context/temperature/JSON mode hoặc timeout 15s.

Không Ollama/Gemini inference, operator load-only, native readiness GET, PostgreSQL/fixture/DB fingerprint mới (**N/A**), migration/reset/seed/truncate, G2/V2/Browser E2E, commit/push/deploy. Không thay working tree ngoài source/evidence/report đã nêu.

## 9. P1/P2/OBS status

- **OBS-COMP-01: FIXED/OFFLINE VERIFIED; LIVE NOT VALIDATED.** Phản ví dụ không còn ALLOW car cũ, không execute; không đồng nghĩa mọi tiếng Việt correction đã được hỗ trợ.
- **TAI03B-B1-01 P1 raw NLU: OPEN.** Không có model decision mới; backend safety/clarification không tăng điểm raw NLU.
- **P2 Ollama runtime stability: OPEN.** Không đo GPU watchdog/load/cleanup mới; không đóng từ mock regression.
- **Map P2: OPEN**, không điều tra/sửa.

Task FIX offline hoàn tất với compatibility minh bạch; không cần mở rộng parser để đóng riêng OBS trong phạm vi đã kiểm. Input ngoài proof grammar tiếp tục fail closed.

## 10. NEXT TASK PLAN — chưa thực hiện

Đề xuất **`T-AI-04-G1-SERVER-COMPLETENESS-LIVE-VALIDATION`** sau owner duyệt source diff, proof policy và năm Foundation fixture conflicts:

1. Khóa input/expected/criteria/body hashes mới, principal/rate ledger và số POST riêng trước chạy. Không VI01–VI24 hoặc replay G/S/M; không sửa locked benchmark.
2. Nhóm known incomplete dùng production server-first: exact missing fields, **0 provider/GET/POST/tool**, origin SERVER_COMPLETENESS, raw NOT EVALUATED. Không dùng deterministic UX làm điểm model.
3. Nhóm cần model có thể đề xuất **tối đa 4 inference**: hai chiều supported transportation correction, supported destination correction và một ambiguous old-label/correction safety case. Chốt raw expected riêng trước inference; execution chỉ ALLOW new proven args, ambiguous proof phải 0 tool. NLU/schema/gate/UX/origin đánh riêng, không sửa output hoặc retry.
4. Model nonresident cần preparation theo procedure đã duyệt, body/deadline/keep-alive/attempt ledger riêng. Nếu owner duyệt một load-only thì **tổng cap đề xuất tối đa 5 POST gồm 4 inference + 1 conditional preparation**; đây chưa phải quyền thực thi. Đã resident thì bỏ load. Model/digest pin/16k/temperature0/output2048/JSON/15s application giữ nguyên; no cloud/proxy.
5. Cùng principal, không reset/bypass limits. Preflight/readiness không đạt → BLOCKED/NOT RUN, không cold-load bằng chat hoặc thêm probe. Fake consent/read-only executor nếu tránh DB; source/integrity/regression và báo cáo sau run. Không tự đóng P1/P2 từ probe nhỏ.

G2 Verified History, V2 benchmark, Browser/API/PostgreSQL E2E và runtime profiling vẫn là task riêng. **Dừng sau báo cáo FIX; không chạy LIVE hoặc NEXT TASK.**
