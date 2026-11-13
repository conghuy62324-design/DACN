# T-AI-04 — Planner LIVE Harness Reliability Fix

Ngày 11/11/2026, Asia/Saigon. Kết luận **HARNESS_RELIABILITY_FIX_PASS_OFFLINE**.

H02/H03/H04 đã được sửa trong harness mới và kiểm tra offline: **68 kiểm tra độc lập PASS**, **4 mocked browser checks PASS** trên desktop/mobile, frontend unit **49 PASS**, browser regression hiện có **74 PASS**, backend liên quan **302 PASS**, hai build PASS. Không chạy Planner LIVE, không gọi Ollama, không kết nối PostgreSQL hoặc tạo fixture. Kết quả LIVE lịch sử giữ nguyên; **P1 NLU/P2 runtime OPEN**.

[Exit gate cuối](evidence/t-ai-04-planner-live-harness-reliability-fix/acceptance-gate-final.json), [owner task](evidence/t-ai-04-planner-live-harness-reliability-fix/owner-task.txt), [artifact checksums](evidence/t-ai-04-planner-live-harness-reliability-fix/artifact-checksums.json).

## 1. Baseline

Đã đọc đầy đủ [run2 report](HUGO_T_AI_04_PLANNER_REAL_TOOL_LIVE_E2E_RESUME_RUN2_REPORT.md), [Planner LIVE report](HUGO_T_AI_04_PLANNER_REAL_TOOL_LIVE_E2E_REPORT.md), [data readiness](HUGO_T_AI_04_PLANNER_TEST_DATA_READINESS_REPORT.md), [search harness fix/resume](HUGO_T_AI_04_G2_E2E_HARNESS_FIX_RESUME_REPORT.md), executed run2 harness, diagnosis/proposed helper/checks, raw results và public HTTP bodies, direct oracles, native ledger, manifest/lock/source hashes. [Read/hash index](evidence/t-ai-04-planner-live-harness-reliability-fix/baseline-review.json).

| Historical baseline | Giữ nguyên, không chạy lại LIVE |
| --- | --- |
| Direct Planner | PASS |
| Original raw NLU | 3 PASS / 1 FAIL |
| L01–L03 original fidelity assertions | 0 PASS / 3 FAIL |
| Independent saved public JSON comparison | 3 PASS |
| Desktop completed UI assertions | 0 PASS / 3 FAIL |
| L05/L06 | NOT RUN |
| Global stop harness | FAIL |
| Native POST | 5/7, không retry |
| DB restoration / Trip | 25/25 / 27/27, phép đo lịch sử của run2 |
| P1/P2 | OPEN / OPEN |

[Historical baseline snapshot](evidence/t-ai-04-planner-live-harness-reliability-fix/historical-baseline.json). Task hiện tại không đọc lại DB để biến số restoration lịch sử thành phép đo mới.

## 2. H02 — Public JSON fidelity

Contract production: `catalogPlannerTools` trả public tool result; `agentChatController` bọc response qua Express `res.json`; frontend nhận JSON và đọc `AgentResult`. Hotel suggestion đã được adapter production chiếu sang publicPlace. Không so raw private Planner object, không gọi Planner để tạo expected mới.

[public-json.cjs](evidence/t-ai-04-planner-live-harness-reliability-fix/public-json.cjs) serialize/parse cả actual public result và independent oracle về cùng dạng JSON. Optional object property có giá trị undefined được xử lý đúng như HTTP JSON. Không loại null hoặc thêm business projection. Chỉ normalize **itinerary.id** và **itinerary.createdAt**; toàn bộ field còn lại so deepStrictEqual, gồm extras, selected IDs, dates, costs, ETA, warnings và provenance.

Actual HTTP result vẫn phải có hai volatile fields hợp kiểu. Oracle run2 vốn đã normalize hai field đó được chấp nhận nguyên bản, không sửa file expected. Completed result thiếu independent oracle gây global FAIL. Nonfinite numbers và non-JSON values bị từ chối.

Saved public JSON **L01/L02/L03 đều PASS** với independent direct oracles P-COMPLETE/P-BUDGET/P-DATE. Wrong group/item/day total, place ID, selected order, date, mode, ETA/distance, missing/extra fields, source/costSource/warnings, null và NaN đều bị từ chối. Đây là acceptance mới của comparator; không thay original LIVE fidelity FAIL.

## 3. H03 — UTF-8 và Unicode

[ui-strings.json](evidence/t-ai-04-planner-live-harness-reliability-fix/ui-strings.json) được tạo bằng UTF-8 file edit, đọc bằng Node với TextDecoder fatal; không dùng PowerShell ASCII pipeline ghi literal. Canonical escaped codepoints được đối chiếu độc lập trước locator: **Xe máy**, **Ô tô**, **₫ U+20AB**, end/reference labels. [Browser helpers](evidence/t-ai-04-planner-live-harness-reliability-fix/browser-checks.cjs).

Chuỗi “Xe m?y” bị từ chối trước cả việc tạo locator. Với label hợp lệ nhưng button không tồn tại, count check trả lỗi rõ ràng ngay, không đợi timeout 30 giây. Cả hai controls thực tế được click trên desktop/mobile, gửi đúng “Phương tiện: motorbike” và “Phương tiện: car”, không auto-resend. Tiền hiển thị đúng **3.500.000 ₫** bằng Intl vi-VN.

Test strict UTF-8 parsing, bytes của ₫, malformed UTF-8 và corrupted motorbike/car/currency đều PASS. Final browser negative timings được lưu riêng trong [desktop](evidence/t-ai-04-planner-live-harness-reliability-fix/mock-browser-10/desktop/locator-negative.json) và [mobile](evidence/t-ai-04-planner-live-harness-reliability-fix/mock-browser-10/mobile/locator-negative.json); đều dưới 1 giây, 0 Agent request.

## 4. H04 — Global fail-fast

[run-live.corrected.cjs](evidence/t-ai-04-planner-live-harness-reliability-fix/run-live.corrected.cjs) là orchestration module mới, import-only, không auto-run historical monolith. [fail-fast.cjs](evidence/t-ai-04-planner-live-harness-reliability-fix/fail-fast.cjs) giữ một stop latch chung và AbortSignal; mọi Agent/native/tool dispatch phải đi qua cùng fence.

Mỗi case bắt buộc qua manifest/hash, request, session, auth/ownership, tool safety, cap, quota/TTL, isolation/runtime guards; sau execute kiểm response, raw expected, revision, tool execution, DB mutation, runtime, fidelity và UI. Guard thiếu implementation, trả false/undefined/FAIL, exception, timeout hoặc lỗi ghi evidence đều FAIL. Không có nhánh catch-and-continue theo loại assertion.

Khi FAIL: latch đóng trước evidence I/O; case hiện tại FAIL, case sau NOT RUN; không dispatch tiếp, không retry; abort pending work. Finally đóng các channel trước cleanup. Cleanup precondition không đạt thì action BLOCKED, vẫn gọi resource dispose. Lỗi cleanup/evidence thứ cấp không ghi đè lỗi đầu tiên. `runPlannerHarnessProcess` tự đặt process exit nonzero khi fail; independent child không phải tự giả exit code.

## 5. Source diff và phạm vi implementation

[Source diff index](evidence/t-ai-04-planner-live-harness-reliability-fix/source-diff-final.json), [orchestration diff](evidence/t-ai-04-planner-live-harness-reliability-fix/orchestration-source-final.diff), [adapter contract](evidence/t-ai-04-planner-live-harness-reliability-fix/ADAPTER_CONTRACT.md).

Thay orchestration độc lập khỏi runtime adapters để có thể chạy cùng code bằng process injection và actual frontend mocks. JSON comparator, Unicode helpers và dispatch fence được dùng thật bởi các test mới. Historical run2 harness giữ nguyên để bảo toàn chứng cứ, không còn được coi là entry point đã sửa.

Không thay AgentService, SYSTEM/proof/history/schema/gate/Planner/Catalog/Repository, auth/consent/limits, frontend UI/CSS, database schema hoặc benchmark. Tất cả file sửa/tạo thuộc task mới và report này. Module mới không tự nối DB/provider hay cấp quyền LIVE; các real adapters phải được bind/review trong task revalidation mới, không mang mock guards `async () => true` sang LIVE.

## 6. Independent positive/negative acceptance

[Independent suite](evidence/t-ai-04-planner-live-harness-reliability-fix/independent-acceptance.cjs), [final main result](evidence/t-ai-04-planner-live-harness-reliability-fix/independent-acceptance-06.json): **62 PASS / 0 FAIL**. [Extra fence suite](evidence/t-ai-04-planner-live-harness-reliability-fix/fence-extra-acceptance.cjs), [result](evidence/t-ai-04-planner-live-harness-reliability-fix/fence-extra-acceptance.json): **6 PASS / 0 FAIL**. Tổng **68**, không cộng lặp các lần chạy cùng test.

Suite dùng saved HTTP JSON và independent direct oracle có hash từ run2; tự tạo mutations ngoài implementation comparator. Failure driver nằm ở file/process riêng, counter dispatch độc lập, parent kiểm actual process status. Đây là tính độc lập của oracle/driver và process isolation, không tuyên bố có human reviewer hoặc agent thứ hai.

Các lỗi preparation mới được giữ lại: lượt main đầu 53/6 do validation áp yêu cầu volatile IDs lên oracle đã normalize; các negative checks của lượt lỗi đó không được dùng để nghiệm thu. Đã sửa đúng phân biệt actual wire contract và normalized oracle, giữ nguyên expected lịch sử, chạy lại toàn suite. Final 62/0 mới là kết quả nghiệm thu main.

## 7. Global-stop injection results

**27 failure scenarios** và một success path được kiểm bằng child process. Mỗi failure đều: exit **1**, global stop true, L01 FAIL, L02/L03/L04 NOT RUN, không later dispatch/retry, first error preserved và dispose gọi một lần.

| Injected failure | Kết quả bắt buộc đã xác minh |
| --- | --- |
| Fidelity tại L01 | L01 có một simulated Agent/native/tool intent; L02–L04 không có intent |
| UI tại L01 | Dừng sau L01, không gửi case mới |
| Raw expected mismatch | Giữ mismatch, không repair arguments |
| Manifest hash / request / session / revision | Dừng đúng guard, không tiến case kế |
| Auth/ownership / tool safety/execution | Dừng, không thực thi trái quyền |
| Native cap / quota/TTL / isolation / DB mutation / runtime | Dừng toàn cục |
| Simulated provider timeout / unexpected error | Nonzero, finally chạy |
| Swallowed inner error / duplicate dispatch / delayed callback | Sticky stop vẫn chặn callback và retry |
| Cleanup precondition | Cleanup action BLOCKED, dispose vẫn chạy, fidelity error đầu tiên giữ nguyên |
| Cleanup secondary / evidence writer / CASE_START writer / guard writer | Lỗi đầu tiên giữ nguyên; current FAIL và later NOT RUN |
| Missing independent oracle | Completed result không được bỏ qua fidelity |
| Success path | L01–L04 đều PASS, chạy đủ bốn mock cases, exit 0 |

[Exact run2 failure reproduction](evidence/t-ai-04-planner-live-harness-reliability-fix/injections-06/fidelity.json), [UI injection](evidence/t-ai-04-planner-live-harness-reliability-fix/injections-06/ui.json), [cleanup precondition](evidence/t-ai-04-planner-live-harness-reliability-fix/injections-06/cleanupPrecondition.json), [success path](evidence/t-ai-04-planner-live-harness-reliability-fix/injections-06/success.json). Native counters trong các file này là **simulated function calls**, không phải HTTP Ollama POST hoặc quota turns.

## 8. Actual frontend — MOCK_ONLY_BROWSER

Final [Playwright results](evidence/t-ai-04-planner-live-harness-reliability-fix/mock-browser-10/results.json): **4 PASS**, desktop 1440×900 hai tests, mobile 390×844 hai tests; 0 skip/flaky/retry. Mỗi viewport chạy năm case liên tiếp: completed base → clarification → manual motorbike → clarification → manual car. Cùng corrected orchestrator/helper thực thi chuỗi này; tổng mỗi viewport năm Agent API responses bị intercept.

Actual React/Auth/Axios/controllers/AgentResultCard được chạy qua Vite, tất cả API trả mocked response đã khóa. [Offline input lock cuối](evidence/t-ai-04-planner-live-harness-reliability-fix/offline-input-lock-08.json), [mock manifest](evidence/t-ai-04-planner-live-harness-reliability-fix/mock-browser-manifest.json). Không chạy backend Planner, provider hoặc PostgreSQL.

Kiểm dates, title **2N1Đ** và JSON day/night 2/1, cả A01/A02 synthetic labels, mỗi item/day/lodging/group cost, tổng **3.500.000 ₫**, budget **6.400.000 ₫**, within-budget/advice/warnings/source text, transportation trong result và exact confirmation request, controls, không horizontal overflow. DOM của từng case được lưu UTF-8.

Đã xem ảnh thực tế và bổ sung ảnh từng phần bằng cuộn đúng nested chat container, không đổi CSS/DOM. Dùng ordinary instant scroll để tránh CSS smooth animation khi chụp; tổng tiền được assert nằm dưới fixed header. [Desktop total](evidence/t-ai-04-planner-live-harness-reliability-fix/mock-browser-10/desktop/completed-viewport.png), [mobile total](evidence/t-ai-04-planner-live-harness-reliability-fix/mock-browser-10/mobile/completed-viewport.png), [mobile A01/day2](evidence/t-ai-04-planner-live-harness-reliability-fix/mock-browser-10/mobile/day-2.png), [mobile confirmation](evidence/t-ai-04-planner-live-harness-reliability-fix/mock-browser-10/mobile/confirmation-viewport.png). Một full-page screenshot không hiển thị toàn bộ nội dung bên trong panel cuộn; ảnh từng phần và saved DOM là chứng cứ bổ sung.

Giữ các lượt mock preparation lỗi: 01 bị sandbox chặn esbuild, chưa có app assertions; 02 thiếu GET /favorites mock của app shell; 03 locator bữa tối trùng giữa hai ngày; 06/07 cuộn outer/inner chưa đúng khiến mobile viewport assertion FAIL. Đã sửa setup/scope/scroll, không nới expected hoặc đổi production. Final 10 mới là browser acceptance; không lấy các lần lỗi làm PASS hay coi chạy lại mock là retry LIVE.

## 9. Regression và build mới thực thi

[Regression results](evidence/t-ai-04-planner-live-harness-reliability-fix/regression-results.json), [existing browser results](evidence/t-ai-04-planner-live-harness-reliability-fix/browser-regression-01/results.json).

| Kiểm tra mới | Kết quả |
| --- | --- |
| Frontend G1/G2 unit | **10 + 39 = 49 PASS** |
| Existing mocked browser desktop/mobile | **74 PASS**, 37 mỗi viewport, 0 skip/flaky/retry |
| Backend G2 | **68 PASS** |
| Natural Proof | **79 PASS** |
| Compatibility | **61 PASS** |
| Correction | **42 PASS** |
| Completeness | **52 PASS** |
| Backend build / frontend typecheck + Vite build | **PASS / PASS** |

Backend tổng 302 case, không sửa original assertions. Existing browser runner được copy nguyên byte sang task mới, dùng config/mock suite hiện có. Legacy181 **không rerun** trong task này: historical145 PASS/36 FAIL giữ riêng; downstream176/5, readiness actual32/1 và diagnostics8/5 cũng là historical, không tính newly executed PASS.

## 10. Source/benchmark integrity và network audit

[Final integrity](evidence/t-ai-04-planner-live-harness-reliability-fix/integrity-after-final.json): **7.502 protected files unchanged**, changed=[], **84 compiled production files hash-match**; toàn bộ **412 sealed run2 artifacts** và report run2 nguyên vẹn. Snapshot gồm production sources/tests/configs, database, docs/historical evidence, benchmark V2 và lock files. Chỉ loại trừ thư mục task mới và report hiện tại.

[Final network audit](evidence/t-ai-04-planner-live-harness-reliability-fix/network-audit-summary-final.json): **263 process audit files**, PostgreSQL connect attempts **0**, forbidden network attempts **0**, Ollama GET/POST **0**, fixture writes **0**. Node preload chặn pg.connect và socket/fetch; chỉ cho Vite loopback3352/3354 và các ephemeral loopback test servers do chính process tạo. Browser API bị intercept, proxy dead; external Leaflet CSS/Google Fonts requests bị abort trước network response. Không claim OS-wide packet capture.

Không INSERT/UPDATE/DELETE, DB probe, model metadata GET/load-only/inference, deploy/commit/push. Không bật LIVE qua import: chạy module corrected trực tiếp trả exit2 do thiếu approved adapter.

## 11. Historical LIVE results preserved

Không đổi bất kỳ historical raw response, verdict, expected/oracle, manifest, fixture ledger, cleanup/fingerprint, report hoặc native attempt nào. Saved JSON comparator PASS mới không nâng original fidelity FAIL; mocked UI PASS mới không nâng original completed UI 0/3 hoặc L05/L06 NOT RUN.

Historical native ledger vẫn **5/7**, không dùng hai slot dư. DB restored25/25 và Trip27/27 vẫn là bằng chứng run2; task offline này không đo lại hoặc viết DB. H04 historical vẫn FAIL, còn bản orchestration mới đạt fail-fast acceptance offline.

## 12. P1/P2 status

**P1 raw NLU OPEN**: historical L04 redundant transportation clarification vẫn FAIL. Không gọi model để kiểm lại hoặc sửa verdict. **P2 runtime OPEN**: task không có runtime inference sample mới, không đổi deadline/context/model/options. Offline harness reliability PASS không đóng hai lỗi production/model lịch sử.

## 13. Remaining limitations

Đây là acceptance của corrected orchestration/helpers và actual frontend với mock responses. Runtime DB/quota/TTL/ownership/provider guard adapters trong mocked browser là mock ports, không phải chứng cứ real guard PASS. Future LIVE phải review việc bind các real guards và shared load-only/native cap accounting theo adapter contract; không reuse mock guards hoặc historical auto-running script.

Production ResultCard không hiển thị ETA/mode như một bảng riêng; fidelity so full JSON gồm ETA/mode, browser kiểm confirmation strings/requests và nội dung component đang render. Không thêm UI fields để lấy PASS. Mobile là emulation, không physical device. Synthetic records/prices vẫn là test data, không báo giá hoặc production catalog readiness.

## 14. NEXT TASK PLAN — chỉ đề xuất

Đề xuất **T-AI-04-PLANNER-LIVE-TARGETED-REVALIDATION** sau khi review bind corrected orchestration với real runtime adapters và fail-fast integration. Task mới phải xác nhận tại thời điểm chạy: approved principal, fresh quota scan cả at/createdAt đủ reservation, DB identity/sentinel/schema/checksum/fingerprint/isolation, exact PROFILE 2 fixture creation/cleanup approval, independent oracle, locked manifest/native bodies, POST budget và security guards.

Không lấy hai unused POST run2 làm quyền mới; không tự retry historical L04, sửa expected, hoặc nâng verdict cũ. Tách scoring của lượt targeted mới và giữ historical FAIL. Không chạy LIVE, V2 hoặc deploy trong task hiện tại.

**Dừng sau báo cáo và niêm phong evidence.**
