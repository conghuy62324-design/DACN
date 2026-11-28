# PR draft · Consolidate HuGoTravel 21.41 release candidate

Base `main` · Head `integration/web-backend`

## Phạm vi

- Hợp nhất WEB integration, booking, catalog, HotelStay quote/confirmation và scoped reference locks.
- Hợp nhất Agent Core, grounded consultation, Review Intelligence và Review Worker theo privacy contract hiện tại.
- Đưa PostgreSQL shared quota/lease và migration 19–22 vào cùng chuỗi commit. Git checkout giữ byte SQL tương thích ledger đã nghiệm thu.
- Bổ sung Linux API/frontend/gateway, PostgreSQL 15/PostGIS 3.7 distribution, hướng dẫn restore và security boundary.
- Chỉ đưa source, config ví dụ, tài liệu và evidence đã rút gọn vào diff. Dọn bản xuất notebook Kaggle và ảnh thiết kế lịch sử khỏi cây ứng viên.

## Kết quả chấp nhận

- Sandbox HotelStay H03–H16 native/HTTP PASS, controlled rollback và lock timeout PASS. Active deadlock cycle chưa chạy. DML tích lũy 45/100 cho acceptance và 17/40 cho cleanup trong phạm vi đã duyệt.
- Linux synthetic 20/20, P15 restore 4.627 giây và availability 25.100 giây, Review Worker Linux và PostgreSQL shared quota PASS trong môi trường nghiệm thu.
- Bốn ảnh candidate có 0 critical/high trong scan RELEASE-CLOSURE. API còn 1 moderate, npm audit backend và frontend còn 2 moderate mỗi nơi.
- P12 tổng PARTIAL, `persisted:false`, một Agent backend và Qwen OFF. B04 lịch sử FAIL, B05 NOT RUN, Browser BLOCKED_POLICY và mọi legacy failure vẫn giữ theo evidence gốc. [Release matrix](HUGO_PRODUCTION_RELEASE_MATRIX.md) · [Evidence rút gọn](evidence/source-consolidation-2141-20261128/release-acceptance-summary.json)

Checkout ứng viên build Linux API/frontend PASS và component offline PASS 15/15. Bằng chứng scan ảnh bên trên thuộc pin đã nghiệm thu trong RELEASE-CLOSURE.

## Release gates còn mở

Actual Qwen GPU inference, grounded quality, GPU cancellation, authorization HotelStay Production, essential website E2E/Browser, catalog và media rights, P12 cross-process session/consent, moderate image/dependency findings, hardening host thật, public HTTPS, monitoring, backup Production và quyết định go-live. Owner duyệt merge riêng sau review.

[Source checkpoint và post-merge plan](HUGO_21_41_SOURCE_CONSOLIDATION_REPORT.md)
