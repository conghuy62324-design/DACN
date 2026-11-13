# T-AI-04 — Planner Adapter Binding Acceptance Fix

Ngày 11/11/2026, Asia/Saigon. Kết luận **ADAPTER_BINDING_ACCEPTANCE_PASS_OFFLINE**.

**21/21 original adapter-binding checks**, **33/33 lifecycle/cleanup checks** và **10/10 shared cap/quota checks** PASS, tổng **64 checks mới**. Không kết nối PostgreSQL, gọi Ollama, tạo fixture, chạy direct Planner hoặc browser LIVE. Source/benchmark/historical evidence giữ nguyên. **P1/P2 OPEN**; đây không phải real adapter LIVE PASS.

[Exit gate](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/acceptance-gate.json), [owner task](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/owner-task.txt), [artifact checksums](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/artifact-checksums.json).

## 1. Root cause đã xác minh

Đã đọc [targeted revalidation report](HUGO_T_AI_04_PLANNER_LIVE_TARGETED_REVALIDATION_REPORT.md), [harness reliability report](HUGO_T_AI_04_PLANNER_LIVE_HARNESS_RELIABILITY_FIX_REPORT.md), [run2 report](HUGO_T_AI_04_PLANNER_REAL_TOOL_LIVE_E2E_RESUME_RUN2_REPORT.md), Phase A results, binding-manifest, test source, candidate runtime/real guards/corrected orchestrator/fence và adapter contract. [Baseline index](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/baseline-review.json).

Historical **20 PASS/1 FAIL** là lỗi parent assertion, không phải lỗi global stop. `RealGuards.manifest` gọi verify trước runtime.stage; injected verify error khiến active runtime case chưa tồn tại. Cleanup precondition của test cũ lại assert active case; action bị chặn hợp lệ, dispose vẫn gọi1, nhưng parent mặc định đòi action1 cho mọi failure.

Original manifest error được giữ, synthetic R02/R03 NOT RUN, Agent/native/tool0, child exit1. Không có fixture/ownership ledger trong tình huống đó nên không có căn cứ gọi fixture delete. Historical report/results vẫn giữ **20/1**, không ghi đè thành21/0.

## 2. Assertion change và phạm vi source

[Original-suite diff](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/adapter-binding.test.cjs.diff), [orchestrator diff](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/run-live.corrected.cjs.diff), [runtime wiring diff](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/runtime-adapters.cjs.diff).

Manifest injection mới kiểm **finally invoked**, precondition đánh giá, action **NOT_APPLICABLE/count0**, dispose1, lỗi đầu tiên đúng và không có cleanup error giả. Khi committed fixture hợp lệ, assertion vẫn yêu cầu action1; khi guard cleanup thất bại, yêu cầu BLOCKED/count0. Không đổi các assertions về stop, original error, later NOT RUN, dispatch counters hoặc process exit.

Mọi thay đổi nằm trong thư mục evidence task mới và báo cáo này. Thêm [cleanup-lifecycle.cjs](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/cleanup-lifecycle.cjs); corrected orchestrator hiểu typed cleanup decision, candidate runtime và sensor tests cùng gọi module đó. Không sửa SQL/maintenance hoặc production safety guard để ép PASS.

## 3. Cleanup lifecycle A/B/C

| State | Evidence/precondition | Fixture action | Resource dispose |
| --- | --- | --- | --- |
| A: manifest fail trước runtime stage | Commit false, ambiguous false, createdRows0, ledger absent | NOT_APPLICABLE, count0 | Đúng1 |
| B: fail sau stage, trước fixture creation | Stage có, nhưng chưa commit/ledger/rows | NOT_APPLICABLE, count0; không tự tạo ledger | Đúng1 |
| C: fail sau committed fixture creation | Task ownership, exact IDs/slugs/full row hashes, refs và isolation đều hợp lệ | READY rồi action đúng1 | Đúng1 |
| C thiếu bất kỳ guard nào | Missing ownership/ledger, hash/ID/slug drift, FK/Trip ref, isolation invalid hoặc ambiguous commit | BLOCKED, count0 | Đúng1 |

**Stage presence không chứng minh fixture ownership.** Có thêm kiểm tra committed fixture tồn tại trước case stage: manifest fail vẫn phải cleanup đúng1 nếu đủ guards. Điều kiện quyết định là lifecycle/ownership, không phải biến active case.

Module chỉ trả NOT_APPLICABLE khi toàn bộ no-commit/no-row/no-ledger witnesses hợp lệ. READY yêu cầu đúng hai approved IDs, ledger acknowledged/read-back/affected2, full JSON SHA-256/MD5 và slug khớp committed rows, đủ năm incoming FK tables count0, Trip JSON refs0, all25 SHARE-lock/isolation proof và pre-existing counts đúng baseline.

Trước callback, module kiểm lại các guard và ticket hash để chặn thay đổi giữa check và action. Ticket chỉ dùng một lần. Sau callback phải có affected2, exact deleted IDs, restored25/25/Trip27, changed=[] và residual IDs0. Callback không xóa nhưng giả báo restored cũng FAIL. Fake DB chỉ là arrays trong bộ nhớ, không SQL.

[Updated adapter contract](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/ADAPTER_CONTRACT.md). Finally đóng/abort dispatch channels trước cleanup; lỗi đầu tiên không bị cleanup/dispose error ghi đè. Dispose được kiểm độc lập với fixture action.

## 4. Original 21 checks — chạy lại mới

[Suite](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/adapter-binding.test.cjs), [result](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/phase-a-adapter-acceptance.json): **21 PASS/0 FAIL**. Tên và số check khớp nguyên baseline21; không bỏ test manifest.

Gồm sáu source syntax checks, missing binding registration, success path, manifest/fidelity/UI/response/revision/tool safety/cap/isolation/timeout/cleanup/missing-adapter injections, candidate source boundary assertions và production completeness/proof/provider serialization với fake in-memory provider/fetcher. Serialization này không gọi Ollama hoặc Planner và không tạo LIVE quota attempts.

[Manifest result mới](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/binding-manifest.json): global stop true, R01 FAIL, R02/R03 NOT RUN, callback Agent/native/tool0, cleanup finally true, NOT_APPLICABLE action0, dispose1, child exit1. Không còn cleanup error secondary giả.

## 5. Independent lifecycle/cleanup negatives

[Parent suite](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/lifecycle-acceptance.cjs), [child driver](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/lifecycle-child.cjs), [synthetic DB](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/synthetic-db.cjs), [final results](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/lifecycle-acceptance-02.json): **33 PASS/0 FAIL**.

Parent không import cleanup implementation; tự khai báo expected stage/action/count/residual/exit và đọc child evidence. Separate processes chạy shared lifecycle/corrected orchestration với synthetic ledger/rows và sensor doubles.

Coverage gồm State A/B/C, committed-before-stage, missing ownership/ledger, row hash/ID/slug mismatch, incoming FK/Trip JSON reference, thiếu FK coverage/isolation evidence, ambiguous commit, ledger không có commit, cleanup callback error, dispose error, cả hai secondary errors, callback trả thiếu result, cleanup bị skip, giả restored nhưng còn rows, repeated action, guard bypass và missing runtime adapter.

Các fresh guards còn bắt foreign reference hoặc row mutation phát sinh giữa precheck và action; callback không được gọi. Dispatch trong cleanup/dispose và late Agent/native/tool/operator callbacks đều bị chặn. Từng failure injection kiểm child exit1 và dispatch counters; success path exit0. Hai test cleanup/dispose-only error sau success vẫn exit1 dù business cases đã PASS; không tự đổi các completed cases thành NOT RUN.

Evidence tiêu biểu: [A trước stage](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/lifecycle-02/beforeStage.json), [B chưa có fixture](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/lifecycle-02/afterStageNoFixture.json), [C cleanup hợp lệ](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/lifecycle-02/validCommitted.json), [committed trước stage](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/lifecycle-02/committedBeforeStage.json), [cleanup bị skip](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/lifecycle-02/cleanupSkipped.json), [secondary errors](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/lifecycle-02/secondaryCleanupAndDispose.json).

Lượt mới lifecycle-01 ban đầu31/2 được giữ nguyên: parent đã tính bốn intentional late-dispatch rejection vào secondary errors của thời điểm trước probe. Đã thêm snapshot trước probe và kiểm riêng bốn rejection; không đổi cleanup/fence implementation hoặc bỏ các lỗi thật. Lượt02 mới là nghiệm thu33/0. Không cộng hai lượt vào tổng64.

## 6. Shared native cap và Agent quota

[Cap suite](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/cap-acceptance.cjs), [results](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/cap-acceptance-01.json): **10 PASS/0 FAIL**. Shared fence giữ nguyên byte so với candidate targeted task trước.

| Scenario | Simulated callbacks | Process |
| --- | --- | --- |
| Operator1 + inference3, cả hai thứ tự | Tổng4, mỗi class đúng cap | Exit0 |
| Inference thứ tư sau operator | Chặn trước callback thứ5 | Exit1 |
| Inference thứ tư khi không load | Vẫn chặn tại inference cap3 | Exit1 |
| Operator thứ hai | Chặn dù tổng còn dưới4 | Exit1 |
| Bảy Agent turns không native | Native0, Agent quota riêng | Exit0 |
| Agent quota hết khi native cap còn | Chặn tại quota guard | Exit1 |
| Operator không tiêu Agent quota sensor; turn sau hết quota | Không bypass quota | Exit1 |
| Duplicate native hoặc Agent dispatch | Callback không được gọi lần2 | Exit1 |

Tất cả failure giữ later cases NOT RUN, no subsequent dispatch và retry0. Native/operator counts trong bảng là **sensor counters**, actual HTTP/native POST0. Không đo/reset fresh quota hoặc đổi approved principal để chạy LIVE.

## 7. Real adapter contract review

[Review](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/real-adapter-review.json): **PASS_OFFLINE_CONTRACT_REVIEW_ONLY**, không real adapter LIVE PASS.

Candidate LIVE ports không có guard giả `async () => true`; RealGuards gọi required runtime methods và missing adapter không có default PASS. Native/inference/operator đều qua shared fence, AgentLimits20 và rolling quota riêng. Manifest/hash/request binding, native body exact bytes, fresh request UUID, production auth/ownership/gate/Planner boundaries giữ nguyên.

Đã đối chiếu byte: candidate prefix trước cleanup wiring, execute/UI và dispose không đổi; chỉ thêm shared cleanup contract và bind precondition/action vào assess/perform. Real maintenance, readonly DB, request binding, H02 comparator, UTF-8 helpers, direct Planner harness, RealGuards và fence đều nguyên byte so với bản candidate được review. Existing maintenance vẫn tự kiểm identity/ownership/row hashes/FK/Trip/isolation/fingerprint trước exact DELETE; không thay bằng sensor guards.

Candidate factory không được instantiate. Chưa kiểm real browser/provider/DB cleanup hoặc runtime resources ngoài đời; offline mocks/static review không đủ để công bố LIVE PASS. Future manifest phải bind cả dependency mới cleanup-lifecycle và các harness modules.

## 8. Fail-fast và cleanup failures không bị che

Fidelity/UI/response/revision/safety/timeout/missing-adapter FAIL tại R01 chặn R02/R03; không catch-and-continue. Core giữ original error, current case FAIL, later NOT RUN, finally/dispose và nonzero process exit.

Với fixture cần cleanup mà callback bị bỏ qua, trả undefined, báo giả restoration hoặc còn residual, action phải FAIL và process nonzero. Nếu guards chưa đạt thì BLOCKED là kết quả hợp lệ, không gọi callback để ép count1. Cleanup/dispose errors nằm ở secondaryFailures khi đã có primary failure; source không ghi đè primary để che nguyên nhân.

Không có retry API; cleanup authorization ticket cũng không cho thực thi lần2. Cả Agent/native/tool/operator fence đều đã đóng trước finally cleanup.

## 9. Network/DB audit và execution boundary

[Audit](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/network-db-audit.json): **99 process audit files**, pg client/pool connect attempts0, network attempts0, PostgreSQL connections0, Ollama GET/POST0, fixture writes0, actual direct Planner0, actual browser0.

[Offline preload](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/offline-boundary.cjs) chặn toàn bộ fetch/HTTP/HTTPS/socket, kể cả loopback, và PostgreSQL connect; được kế thừa bởi child processes. Không OS-wide packet capture. Synthetic cleanup chỉ sửa array-backed test data; không INSERT/DELETE vào database. Không load/unload model, `.env`/global G2 change, LIVE, V2, commit/push/deploy.

Không chạy broad frontend/backend/browser regression hoặc hai build vì task chỉ thay offline harness/tests; các suite lịch sử không được tính newly executed. Node syntax checks và production proof serialization thuộc21 checks mới đã ghi riêng.

## 10. Source integrity

[Integrity](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/integrity-after.json): **8.580 protected files unchanged**, changed=[]; **54 sealed artifacts** và report targeted task trước giữ hash, cùng **84 compiled modules**. Snapshot bảo vệ source/config/database/docs/benchmark/historical evidence; các file mới của task này và report hiện tại được niêm phong riêng.

[Implementation lock](evidence/t-ai-04-planner-adapter-binding-acceptance-fix/implementation-lock.json) ghi hashes của harness/tests và kết quả mới; artifact checksum bao phủ cả evidence lồng trong lifecycle/cap directories. Không sửa production Agent/Planner/Auth, SYSTEM/schema/gate, approved benchmark hoặc expected lịch sử.

## 11. Historical results preserved

Historical Phase A vẫn **20 PASS/1 FAIL**, R01–R03 LIVE **NOT RUN**, native0/4 của targeted task cũ không bị sửa. Bản21/21 hiện tại là kết quả mới trong thư mục mới.

Run2 raw Planner3 PASS/1 FAIL, original fidelity/UI failures, original H04 FAIL, native5/7 và DB restored25/25/Trip27/27 vẫn nguyên evidence. Không đo lại DB trong task này hoặc nâng historical failures bằng sensor acceptance. Baseline reliability68/mock4/frontend49/browser74/backend302 giữ là historical, không rerun mới.

## 12. P1/P2 và giới hạn kết luận

**P1 NLU OPEN; P2 runtime OPEN.** Không có raw model/runtime sample mới, không đổi model/options/timeout hoặc chạy lại historical L04. Exit gate chỉ là **ADAPTER_BINDING_ACCEPTANCE_PASS_OFFLINE** với64 checks mới, không NLU PASS hoặc demo readiness LIVE.

Tính independent đến từ expected assertions/oracles ở parent riêng, separate child processes và sensor doubles; không tuyên bố human reviewer hay agent thứ hai. Real factory startup, actual maintenance/cleanup và shutdown resource behavior còn cần acceptance của task LIVE được phê duyệt mới.

## 13. NEXT TASK PLAN — chỉ đề xuất

**T-AI-04-PLANNER-LIVE-TARGETED-REVALIDATION-RESUME**. Lượt tiếp theo phải có fresh owner approval/scope confirmation, quota scan cả at/createdAt, DB identity/schema/checksum/fingerprint/isolation, exact fixture ownership/cleanup guards, independent oracle, manifest/dependency/native-body hashes và POST budget riêng tại thời điểm chạy.

Không kế thừa bốn POST chưa dùng của task bị chặn như quyền tự thực thi. Không retry historical L04 để thay verdict cũ. Task này không chuyển sang LIVE/V2 hoặc deploy.

**Dừng sau báo cáo và niêm phong evidence.**
