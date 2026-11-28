# Review Worker V5 — runbook hiện trạng

## Kiến trúc

ReviewService ghi revision/outbox trong transaction. Worker riêng đọc `review_ai_inputs` đã lọc, không có quyền SELECT raw `reviews`, `users` hoặc `bookings`; claim lease, heartbeat, retry/backoff, dead-letter và daily reconcile. ReviewInsightService chỉ công bố insight khi version/source revision/source stamp đúng. HotelReadService giữ quyền giá, tồn phòng và khuyến mại; review chỉ là ý kiến có provenance, không phải đảm bảo chất lượng. Exact-room insight cần verified completed Booking item link; hotel-only không được quy về phòng.

## Trạng thái sau TASK21.40-B-RESUME

Isolated15457: migration20, V5 persisted, 4 review SYNTHETIC/2 Booking historical SYNTHETIC được giữ cho preview; 59/59 outside cohort và public READ ONLY. Temporary writer/worker roles, SQL fence/counter đã xóa. Dedicated worker **OFF**; không tự bật lại trong website hoặc chạy lịch lâu dài. API5064/frontend5182 là preview model OFF và batch POST đã đóng. Không dùng các fixture này làm dữ liệu khách sạn/review thật. Receipt: [report](HUGO_AI_21_40_B_REVIEW_INTELLIGENCE_WORKER_REPORT.md), [cleanup](evidence/review-worker-b-20261126/resume-cleanup-result.json).

## Vận hành production còn cần nghiệm thu

Tách worker thành process/container riêng trên Linux với DB role tối thiểu; chỉ cấp view sanitized, queue/insight tables và function cần thiết. Health probe cần heartbeat mới và không được có quyền raw review. `--once` có thể dùng cho bounded job; long-running schedule cần policy nguồn, bounded concurrency, retry và dead-letter alert. Windows SIGTERM không chứng minh graceful shutdown: kiểm trên Linux bằng signal thật, đóng DB pool và không mất lease/đúp insight. Reconcile 03:00 ICT phải dùng thời gian cấu hình và không tự duyệt fact. Backup/restore giữ review provenance, version và privacy; kiểm xóa/ẩn/consent revoke làm stale insight mất hiệu lực ngay.

Không tái sử dụng approval hoặc role của task B cho production. Muốn chạy lại browser B04/B05 hoặc worker, cần source lock, manifest, quota và authorization mới. Không tăng cap hoặc reset ledger để lấy PASS.

Preview task-owned 5064/5182 được watchdog tự dừng lúc `2026-11-27T02:46:28Z`; không dùng URL đó làm endpoint production.


## TASK21.40-B-FINAL Linux release gate — 27/11/2026

Static audit only: entrypoint registers SIGTERM/SIGINT, sets worker stop flag and aborts timer; finally closes Sequelize. The worker claim method checks stop before opening its transaction, so a signal arriving between that check and the claim SQL needs an actual Linux test. Earlier isolated R12 proves lease recovery after a crash, not Linux graceful shutdown. Daily reconciliation uses the persisted cursor/next_due and 03:00 ICT calculation. Health checks heartbeat age and rejects a raw-review-privileged role. Logs contain event/counters/place IDs rather than review text, but production rotation/redaction has not been measured. Migration20 comments require processed tombstones at most90 days; no pruning executor was found. No dedicated worker Docker image is available locally. Keep worker OFF and the release gate BLOCKED until a bounded Linux container signal/retention test is approved. Source audit receipt: [linux-worker-audit](evidence/review-worker-b-20261126/final-20261127/linux-worker-audit.json).
