# T-AI-04-G1 — Safe contract FIX (offline)

Ngày 09/11/2026, Asia/Ho_Chi_Minh. **G1 FIX IMPLEMENTED — LIVE NOT VALIDATED.** Đã sửa source backend và chạy kiểm thử offline. **P1 `TAI03B-B1-01` vẫn OPEN.** Không gửi Ollama/Gemini inference, không truy cập PostgreSQL hoặc gọi Catalog/Planner nối dữ liệu thật, không chạy benchmark V2/Browser E2E.

## 1. Baseline và quyết định phạm vi

[E-FINAL](HUGO_T_AI_04_E_FINAL_REPORT.md) ghi B `format:"json"` đạt 3/4, C đạt 1/4. E03-B sinh tool `plan_trip` với `transportation:"car"` dù user chưa chọn. [F](HUGO_T_AI_04_F_CONTRACT_SLOT_FILLING_REPORT.md) kết luận schema/runtime không chứng minh được nguồn gốc tham số và prototype F có phản ví dụ phủ định địa điểm. G1 áp dụng **current authenticated user message only** cho provenance; `history` do client gửi vẫn là ngữ cảnh hội thoại nhưng không chứng minh bất kỳ tool argument nào. API không thêm `historyProof`; G2 sẽ xử lý verified multi-turn riêng.

G1 không thay `SYSTEM` prompt, `DECISION_SCHEMA`, `parseDecision()`, `validateTool()`, `AGENT_TOOLS`, `AgentLimits`, auth/consent/privacy, timeout 15 giây, Gemini branch, tool adapter hoặc Planner. Không cho native `tool_calls`, không thêm mutation Trip/Booking.

## 2. Source diff và contract sau sửa

| File | Thay đổi G1 |
|---|---|
| [liveProvider.ts](../backend/src/agent/liveProvider.ts) | Riêng Ollama gửi `format:"json"`; parse raw JSON, kiểm **original `DECISION_SCHEMA`** trước `parseDecision()`, rồi giữ `validateTool()`. Output sai bị `AGENT_INVALID_PROVIDER_OUTPUT`, không sửa/retry. Gemini request giữ nguyên. |
| [decisionValidation.ts](../backend/src/agent/decisionValidation.ts) | Compile schema production bằng Ajv 8 + `ajv-formats` (`date`, `uuid`) một lần; runtime dùng đúng object `DECISION_SCHEMA`, không có schema mô phỏng thứ hai. |
| [toolProvenance.ts](../backend/src/agent/toolProvenance.ts) | Gate fail-closed: intent, required names lấy động từ `AGENT_TOOLS`, vai trò field, giá trị current-turn, phủ định, chưa quyết định, mâu thuẫn, optional không có nguồn. Trả `ALLOW`, `NEEDS_INPUT` hoặc `REJECT`; không mutate model arguments. |
| [agentService.ts](../backend/src/services/agentService.ts) | Sau `validateTool()` và trước `tools.execute()`, dùng **chỉ** `messages[last].content` cho gate. `NEEDS_INPUT` trả API `needs_input/missingFields`; `REJECT` trả `AGENT_UNVERIFIED_TOOL_INPUT`; cả hai có **0 tool call**. |
| [package.json](../backend/package.json), [package-lock.json](../backend/package-lock.json) | Thêm runtime dependencies `ajv@^8.20.0` và `ajv-formats@^3.0.1`. |
| [G1 test](../backend/src/tests/agentG1SafeContract.test.ts), [Foundation](../backend/src/tests/agentFoundation.test.ts), [Transport](../backend/src/tests/agentTransport.test.ts), [Routing](../backend/src/tests/agentDecisionRouting.test.ts), [Format Safety](../backend/src/tests/agentDecisionFormatSafety.test.ts) | Thêm test G1; chỉ cập nhật fixture current-turn có đủ chứng cứ và transport assertion sang JSON mode theo contract G1. Không đổi expected nghiệp vụ hoặc test F lịch sử. |

Luồng Ollama: `format:"json"` → parse JSON → original schema (Ajv) → `parseDecision()` → `validateTool()` → **current-turn provenance gate** → tối đa một read-only tool. JSON hợp lệ nhưng sai `clarify.fields`, extra key, sai type hoặc thiếu `arguments` vẫn bị bác bỏ. `children` không được tự xóa khỏi clarify. Model-generated `car` không thể trở thành tool call khi current message nói chưa chọn phương tiện; safety response `needs_input` **không được tính là NLU PASS**.

SHA-256 runtime source trước → sau: `liveProvider.ts` `c08358256aadea6975647960579c435c1b65f9a892158d39a3236dea7ac9bb82` → `0c50a0b8c1878e6c9c4c1429afb4d0dbb885058ea2b50f30e5dabc7252fed53c`; `agentService.ts` `418f6b3b11b68d19a7c391c8156dfe311da65f3f691d2b45eaa798a41a5577c2` → `63385437ec04c2cd6cf82cfb7222db9e6f1dd3e993fae576c0ee1cf4b250f04a`. Hash đầy đủ của package, regression files và module mới ở [source-integrity.json](evidence/t-ai-04-g1-safe-contract-fix/source-integrity.json).

## 3. Quy tắc provenance và giới hạn có chủ ý

`ALLOW` chỉ khi intent phù hợp tool đọc, **mọi required arg** đúng giá trị và vai trò trong tin nhắn hiện tại, đồng thời optional non-default có nguồn. Parser nhận một tập hẹp gồm các segment có nhãn như `Điểm đến: Nha Trang`, `Ngân sách cả nhóm: 7 triệu`, `Ngày bắt đầu: 2032-04-10`, `Phương tiện: xe máy` và một số câu sửa lựa chọn được kiểm cụ thể. Hai loại ngân sách không hoán đổi. `NEEDS_INPUT` dùng khi thiếu/chưa chọn/phủ định/mâu thuẫn hoặc câu ngoài grammar hẹp; `missingFields` lấy từ required của `AGENT_TOOLS`, không từ Planner defaults. `REJECT` dùng cho intent mutation/injection, tool sai hoặc optional non-default do model thêm. Validator cũ xử lý malformed/tool type trước gate.

Các ví dụ bắt buộc đã kiểm trong [G1 log](evidence/t-ai-04-g1-safe-contract-fix/agentG1SafeContract.final.log): “Tôi muốn đi Đà Lạt” thiếu các slot còn lại; “không đi Đà Lạt” **không ALLOW**; “không đi Đà Lạt, tôi muốn đi Nha Trang” chỉ có thể chứng minh Nha Trang, không chứng minh Đà Lạt; “chưa chọn phương tiện”/“không đi ô tô” không chứng minh car; “Tôi chọn xe máy” và “à đổi sang xe máy” chứng minh motorbike trong câu đầy đủ; “có 7 triệu nhưng chưa xác định ngân sách chuyến đi” không chứng minh group budget. Test còn kiểm phủ định sau nhãn, ngữ cảnh assistant giả, hai giá trị trái nhau và optional tự bịa. Một mẫu chưa hỗ trợ sẽ hỏi xác nhận lại, không được coi là parser hiểu mọi tiếng Việt.

**Giới hạn G1:** Người dùng thường phải gửi đủ tham số và intent trong **cùng một tin nhắn** theo dạng rõ ràng; lịch sử nhiều lượt chưa verified không lấp slot. Cách diễn đạt ngoài grammar, ngày không có ISO/năm, số tiền chưa được gắn đúng loại, quote/điều kiện/mơ hồ đều fail closed. `mandatoryPlaceIds` non-default hiện không có extractor được duyệt nên bị từ chối ở gate. Điều này giảm khả năng hoàn thành yêu cầu tự nhiên; cần G2 và LIVE validation, không được tự nới gate bằng substring matching. Bất kỳ model tool decision nào bị chặn vẫn phải ghi NLU semantic FAIL nếu expected yêu cầu clarify.

## 4. Offline unit/integration và regression

| Nhóm | Kết quả thực tế | Evidence |
|---|---:|---|
| G1 safety test, fake Ollama response/tool executor | **26 PASS / 0 FAIL** | [G1 log](evidence/t-ai-04-g1-safe-contract-fix/agentG1SafeContract.final.log) |
| F prototype: 23 ca còn áp dụng, chạy từ bản copy compiled chỉ bỏ đăng ký một diagnostic cũ | **23 PASS / 0 FAIL** | [derived runner](evidence/t-ai-04-g1-safe-contract-fix/agentContractSlotInvestigation.g1-applicable.js), [log](evidence/t-ai-04-g1-safe-contract-fix/agentContractSlotInvestigation.g1-applicable.final.log) |
| Decision Format Safety | **17 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-safe-contract-fix/agentDecisionFormatSafety.final.log) |
| Decision Routing | **10 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-safe-contract-fix/agentDecisionRouting.final.log) |
| Agent Foundation | **22 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-safe-contract-fix/agentFoundation.final.log) |
| LLM Transport | **19 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-safe-contract-fix/agentTransport.final.log) |
| Frontend conversation unit | **10 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-safe-contract-fix/frontend-agent-conversation.log) |
| Backend build | **PASS** | [build log](evidence/t-ai-04-g1-safe-contract-fix/backend-build.final.log) |
| Frontend build (source không đổi) | **PASS** | [build log](evidence/t-ai-04-g1-safe-contract-fix/frontend-build.log) |

**101/101 regression còn áp dụng PASS**, cộng **26 test G1 riêng**; không cộng test chạy lặp. [Summary](evidence/t-ai-04-g1-safe-contract-fix/regression-summary.json) ghi số liệu. Bản F nguyên trạng có **24 test**, trong đó test “current orchestrator observation: schema-valid hallucinated car reaches only fake tool” cố ý đòi `completed` và một fake tool call để ghi nhận lỗ hổng **trước FIX**. Chạy nguyên bản trên source G1 cho **22 PASS, 1 FAIL tại assertion cũ (`needs_input` thực tế thay vì `completed`), 1 NOT RUN do harness dừng**; [log gốc](evidence/t-ai-04-g1-safe-contract-fix/agentContractSlotInvestigation.final.log). Không sửa assertion hoặc evidence F. Bản derived chỉ bỏ **đăng ký** test lịch sử đó, giữ nguyên 23 assertion còn lại; không dùng nó để tuyên bố “102/102” sau FIX. Đây là thay đổi hành vi an toàn đã dự kiến, không phải FAIL của gate G1.

Toàn bộ test là **MOCK_ONLY/offline**. Fake fetch xác nhận provider request/validator; fake executor chứng minh 0 hoặc 1 invocation theo gate. Không có bằng chứng chất lượng NLU tiếng Việt của Qwen3 từ các test này. Frontend build lần đầu trong sandbox gặp lỗi đọc config của esbuild; chạy lại ngoài sandbox đã **exit 0**, không sửa frontend source.

## 5. Integrity và dữ liệu

[Audit và hash đầy đủ](evidence/t-ai-04-g1-safe-contract-fix/source-integrity.json): so với baseline 3.960 file và FIX A, **7 file baseline thay đổi đúng phạm vi, 0 file bất ngờ**; thêm hai module Agent và test G1 mới. `agentDecisionFormatSafety.test.ts` tạo sau snapshot baseline nên audit ghi hash sau, không suy đoán hash trước. `DECISION_SCHEMA`, `AGENT_TOOLS`, `parseDecision`, `validateTool`, AgentLimits và prompt không đổi. Benchmark V2 APPROVED SHA-256 `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`, V2 lock `f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706`, E manifest APPROVED `ebbbb9ad59ca4f699038a38698ded1d0d9f8d3d5285fcd817a8260cc4fc2f08c`, F diagnostic test hash đều khớp. **123/123 evidence lịch sử trong snapshot E-FINAL bất biến.**

Không truy cập DB nên không có fixture, DB write, cleanup/fingerprint mới; không reset, seed, migration, truncate. Không sửa Planner, pricing, Catalog, Trip, Booking, Sentiment, Map; không commit/push/deploy. Không có inference POST.

## 6. Kết luận và NEXT TASK PLAN

**G1 FIX IMPLEMENTED — LIVE NOT VALIDATED.** Kết quả offline chứng minh gate chặn các phản ví dụ đã kiểm, nhưng chưa chứng minh Qwen3 chọn đúng tool/clarify hoặc người dùng hoàn thành luồng tự nhiên. **`TAI03B-B1-01` P1 OPEN.** Hạn chế current-turn-only và diagnostic F cũ được giữ rõ ràng để không lẫn safety enforcement với NLU accuracy.

1. **`T-AI-04-G1-LIVE-VALIDATION` — cần phê duyệt riêng:** khóa input kỹ thuật mới và expected trước inference; preflight Ollama local/model digest, giới hạn rate và source/benchmark; đo số POST được duyệt cho tool, clarify, unsupported, phủ định/đổi lựa chọn. Chấm riêng raw NLU decision, original schema/runtime và gate, 0 sửa expected; không dùng V2 để tinh chỉnh. Nếu cần tool/DB thật, chuẩn bị guard `travelgo_ai_m0_test`, sentinel, 12 checksum, fingerprint và cleanup trước write. Chỉ sau kết quả live mới xem xét benchmark V2 và Browser E2E ở task khác.
2. **`T-AI-04-G2-VERIFIED-HISTORY` — task riêng:** thiết kế provenance multi-turn do backend xác minh, bind user/account và thời hạn, chống replay/tamper. Không ký lại transcript tùy ý do client tự gửi. Kiểm API/frontend reset/logout và nguồn slot trước khi cho history lấp required args.

**Dừng tại báo cáo G1; chưa thực hiện hai task kế tiếp.**
