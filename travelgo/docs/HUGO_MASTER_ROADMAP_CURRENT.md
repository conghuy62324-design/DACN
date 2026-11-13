# HUGO MASTER ROADMAP — Trạng thái hiện tại

**Ngày lập:** 07/11/2026, Asia/Saigon.  
**Người lập:** Technical Lead Audit (READ-ONLY).  
**HEAD:** `052531dfc77c4f289757794c0ee08b4d46e6af2e` (3 commits, working tree dirty: 47 modified + ~50 untracked).  
**Mốc chốt:** Feature freeze dự kiến 24/11/2026 · Nộp báo cáo dự kiến 08/12/2026.

> [!IMPORTANT]
> File này là **kế hoạch quản lý**, không phải bằng chứng PASS E2E. Mọi kết quả test phải có evidence riêng. Không tự động thực hiện bất kỳ task nào khi chưa được duyệt.

---

## 1. Tổng quan kiến trúc hệ thống

| Layer | Công nghệ | Trạng thái |
|---|---|---|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind | Có build, có E2E Playwright |
| **Backend** | Node.js + Express + TypeScript + Sequelize | Có build, 12 migrations |
| **Database** | PostgreSQL (Docker) | `travelgo_ai_m0_test` (test) + `travelgo_dev` (dev) |
| **Auth** | JWT Bearer, role-based (`CUSTOMER`, `PARTNER`, `SUPER_ADMIN`) | Triển khai đầy đủ |
| **AI/Research** | Kaggle CPU sentiment pipeline (Python) | Có artifact demo v7 |
| **E2E Testing** | Playwright (Edge Chromium headless) | 15 spec files, harness riêng mỗi task |

**Flow chính:** Browser → Vite (port 3316) → Proxy `/api` → Express (port 5316) → PostgreSQL

---

## 2. Trạng thái T13-B theo bằng chứng mới nhất

### 2.1. Kết quả lũy kế T13-B (cập nhật 07/11/2026)

| Nhóm | CORE | PASS (kết quả lịch sử) | FAIL OPEN | NOT RUN |
|---|---|---|---|---|
| **Role** | R01–R06 (6) | R01✅ R02✅ R03✅ R04✅ R05✅ | — | R06 |
| **Admin/Onboarding** | A01–A06 (6) | A02✅ A03✅ A04✅ A05✅ | — | A01, A06 |
| **Business/Partner** | B01–B08 (8) | B01✅ B05✅ | B02❌ B03❌ B04❌ B06❌ | B07, B08 |
| **Review** | V01–V08 (8) | — | — | V01–V08 (tất cả) |
| **Favorite** | F01–F07 (7) | — | — | F01–F07 (tất cả) |
| **Consent** | C01–C08 (8) | — | — | C01–C08 (tất cả) |
| **TỔNG** | **43** | **11 PASS** | **4 FAIL** | **28 NOT RUN** |

> [!NOTE]
> PASS: R01–R05 (T13-B-01-FIX), A02–A05 (T13-B-01 + T13-B-02), B01, B05 (T13-B-02). Không chạy lại để xác nhận lại.

### 2.2. 4 FAIL đang mở (từ T13-B-02)

| ID | Lỗi | Severity | Root cause đã xác định |
|---|---|---|---|
| **T13B02-01** B06 | Booking alias `/partner/businesses/:id/bookings` trả 200 khi member chỉ có `MANAGE_BUSINESS`, lộ dữ liệu Booking | **P1** | `PartnerService.getBookings` chỉ kiểm membership, không kiểm `MANAGE_BOOKINGS`. Contract Phase 3 bị vi phạm |
| **T13B02-02** B02 | Giá 0 (`priceFrom=0`) hiển thị rỗng sau reload form | **P2** | `value={form[field.key] \|\| ''}` → falsy, `0` trở thành `''` |
| **T13B02-03** B03 | Tour 0 đêm (`durationNights=0`) thành required field rỗng sau reload | **P2** | Cùng biểu thức falsy + field có `required` |
| **T13B02-04** B04 | Save Ticket không sửa gì nhưng timestamp trôi −7 giờ | **P1** | `normalizeForForm` cắt ISO `.slice(0,16)` → không có offset, `new Date(str)` parse theo local TZ backend (Asia/Ho_Chi_Minh), gây mất 7h |

### 2.3. Observation còn mở

| OBS | Mô tả | Severity |
|---|---|---|
| **Map P2** | `Invalid LatLng object: (NaN, NaN)` trên mobile | P2 |
| **Ticket UI label** | Hiển thị "Nội dung mới được lưu ở trạng thái nháp" dù Ticket là ACTIVE | P2 |

---

## 3. Trạng thái toàn module theo bằng chứng

### 3.1. Customer flows

| Module | Triển khai | Bằng chứng kiểm thử | Trạng thái |
|---|---|---|---|
| Auth (register/login/logout/me/reload) | ✅ Đầy đủ | T13-A-FIX 14/14 PASS | ✅ PASS |
| TourPlanner (generate/edit/save/reload) | ✅ Đầy đủ | T13-A-FIX 14/14 PASS | ✅ PASS |
| TripLifecycle (start/checkin/complete) | ✅ Đầy đủ | T13-A-FIX 14/14 PASS | ✅ PASS |
| Booking Customer (create/retry/snapshot) | ✅ Đầy đủ | T13-A-FIX 14/14 PASS | ✅ PASS |
| Ownership isolation (Trip/Booking) | ✅ Đầy đủ | T13-A-FIX 14/14 PASS | ✅ PASS |
| **Favorite** | ✅ Triển khai đầy đủ | ❌ 7 CORE NOT RUN | 🔵 NOT RUN |
| **Review** | ✅ Triển khai đầy đủ | ❌ 8 CORE NOT RUN | 🔵 NOT RUN |
| **Consent/Telemetry** | ✅ Triển khai đầy đủ | ❌ 8 CORE NOT RUN | 🔵 NOT RUN |
| Map popup | ✅ Có source | T05 PASS + P2 NaN mobile OPEN | ⚠️ P2 |
| Profile (read-only) | ✅ Có source | T07 PASS | ✅ PASS |

### 3.2. Partner/Admin flows

| Module | Triển khai | Bằng chứng kiểm thử | Trạng thái |
|---|---|---|---|
| RBAC/Role routing | ✅ Đầy đủ | T13-B-01-FIX 7/7 PASS | ✅ PASS |
| Partner onboarding/application | ✅ Có; vòng bổ sung NEEDS_MORE_INFO còn GAP-02 | T13-B-01-FIX 7/7 PASS | ✅ PASS (giới hạn GAP-02) |
| Admin moderation (Place/Tour/Blog) | ✅ Đầy đủ | A05 T13-B-02 PASS | ✅ PASS |
| Admin businesses/bookings (API-only) | ✅ API có; UI placeholder | A06 NOT RUN | 🔵 NOT RUN |
| Admin dashboard | ✅ Có source | A01 NOT RUN | 🔵 NOT RUN |
| Partner resource isolation | ✅ Đầy đủ | R03 T13-B-02 PASS | ✅ PASS |
| Partner dashboard/selector | ✅ Đầy đủ | B01 T13-B-02 PASS | ✅ PASS |
| Partner Place CRUD | ✅ Có; giá 0 hiển thị sai | B02 FAIL | ❌ FAIL (P2) |
| Partner Tour CRUD | ✅ Có; 0 đêm sau reload invalid | B03 FAIL | ❌ FAIL (P2) |
| Partner Ticket CRUD | ✅ Có; timestamp trôi −7h | B04 FAIL | ❌ FAIL (P1) |
| Partner Blog CRUD | ✅ Đầy đủ | B05 T13-B-02 PASS | ✅ PASS |
| Partner Booking (alias) | ⚠️ MANAGE_BOOKINGS thiếu | B06 FAIL | ❌ FAIL (P1) |
| Partner Booking (endpoint mới) | ✅ Đúng permission | B07/B08 NOT RUN | 🔵 NOT RUN |

### 3.3. AI/Intelligence

| Module | Trạng thái |
|---|---|
| Recommendation/Planner | ✅ Triển khai; T11-B PASS; không cần chạy lại |
| Consent/Telemetry backend | ✅ Triển khai; chờ C01–C08 |
| Sentiment pipeline (Kaggle) | ✅ Demo artifact v7 có; DEMO_ONLY không tuyên bố production quality |
| Export AI dataset | ✅ Script có; chạy cần duyệt |

---

## 4. GAP còn mở (từ PREP)

| GAP | Quyết định / trạng thái |
|---|---|
| **GAP-01** UI placeholder Admin | Giữ NOT RUN/limitation; không xây trong T13-B |
| **GAP-02** NEEDS_MORE_INFO vòng bổ sung | Chưa có; giữ characterization |
| **GAP-03** Permission alias Booking | **T13B02-01 đã xác nhận vi phạm** → cần sửa |
| **GAP-04** Business suspended/public | Chưa chốt policy; giữ NOT RUN |
| **GAP-05** Dashboard "doanh thu" | Ghi hạn chế; không tự sửa |
| **GAP-06** Consent error/race | Chờ C07/C08 |
| **GAP-07** Fixture COMPLETED Booking | B07/V01 cần duyệt fixture unpaid trước chạy |
| **GAP-08** Runner/acceptance freeze | Duyệt sau FIX task |
| **GAP-09** Form reload/timestamp | **T13B02-02/03/04 đã xác nhận** → cần sửa |

---

## 5. Roadmap có thứ tự ưu tiên

### Phase A — FIX T13-B-02 (Ưu tiên P1 trước)

```
T13-B-02-FIX (task tiếp theo đề xuất)
│
├── Fix P1-A: PartnerService.getBookings thiếu MANAGE_BOOKINGS (B06)
├── Fix P1-B: PartnerResourceFormPage timestamp Ticket trôi −7h (B04)
├── Fix P2-A: Form value falsy — giá 0 / số đêm 0 (B02/B03)
└── Re-run focused B06+B04 → full regression 8 CORE
```

**Điều kiện:** Không sửa expected; sửa đúng root cause đã xác định; regression đủ 8 CORE.

### Phase B — T13-B-03: Booking Partner lifecycle + Review

```
T13-B-03
│
├── B07: Partner confirm→complete; SA status API; direct Booking URL
├── B08: Partner reject/cancel; inventory hoàn một lần
├── V01: Verified Review (cần B07 COMPLETED Booking)
├── V02: Unverified Review / opt-out
├── V03: Review DTO validation
├── V04: Review booking provenance
├── V05: Review duplicate/race
├── V06: Review owner update (API-only, không có UI)
├── V07: Review moderation SA + public UI
└── V08: Review owner delete
```

**Prerequisite:** T13-B-02-FIX PASS; duyệt fixture COMPLETED Booking (GAP-07).

### Phase C — T13-B-04: Favorite + Admin reads

```
T13-B-04
│
├── F01–F07: Favorite CRUD, isolation, attribution, opt-out
├── A01: Admin dashboard metrics
└── A06: Admin businesses/bookings API read + authorization
```

**Prerequisite:** T13-B-03 xong hoặc chạy độc lập (Favorite không phụ thuộc Review).

### Phase D — T13-B-05: Consent + account switch

```
T13-B-05
│
├── C01–C08: Consent banner, opt-in/out, delete, event/ack, race
├── R06: Logout→switch account, trả trễ
└── R03 nhánh Booking (đã PASS isolation, chỉ cần consent context)
```

**Prerequisite:** T13-B-04 xong.

### Phase E — T14: Demo Readiness & Documentation

```
T14
│
├── Runbook: startup local (Docker → backend → frontend)
├── Demo script: Customer → Partner → Admin flows
├── Seed data kiểm chứng (không là test fixture)
├── Hướng dẫn reset demo state
├── Slide báo cáo đồ án
├── Tài liệu kiến trúc cập nhật (SYSTEM_ARCHITECTURE)
└── Kịch bản bảo vệ đồ án Q&A
```

**Prerequisite:** Tất cả CORE PASS hoặc limitation được ghi rõ.

---

## 6. Timeline ước tính

| Mốc | Ngày dự kiến | Ngày thực tế hiện tại | Tình trạng |
|---|---|---|---|
| Sentiment A/B chốt phương án | 10/11/2026 | 07/11/2026 | ⚠️ **3 ngày tới** — cần quyết định |
| T13-B-02-FIX hoàn thành | 08-09/11/2026 | — | Chưa bắt đầu |
| T13-B-03 (Booking + Review) | 10-13/11/2026 | — | Chưa bắt đầu |
| T13-B-04 (Favorite + Admin) | 13-16/11/2026 | — | Chưa bắt đầu |
| T13-B-05 (Consent + switch) | 16-19/11/2026 | — | Chưa bắt đầu |
| Feature freeze | 24/11/2026 | — | **17 ngày** |
| T14 Demo + Docs | 20-07/12/2026 | — | Chưa bắt đầu |
| Nộp báo cáo | 08/12/2026 | — | **31 ngày** |

> [!WARNING]
> 28 CORE NOT RUN + 4 FAIL phải được xử lý trong ~17 ngày trước feature freeze. Nếu có thêm FAIL khác trong B07–C08, cần FIX thêm → áp lực timeline tăng.

---

## 7. Danh sách rủi ro

| Rủi ro | Khả năng | Ảnh hưởng | Biện pháp |
|---|---|---|---|
| B07 (Booking transition Partner) có source risk từ GAP-09 | Trung bình | FAIL thêm, cần FIX | Witness kỹ selector businessId trước mutation |
| Consent C04 (privacy delete) làm lệch fingerprint | Thấp | Cleanup phức tạp | Ledger ID cẩn thận; snapshot ngay trước delete |
| Timeline 28 NOT RUN + potential FIX tasks | Cao | Không kịp 24/11 | Chạy song song Review+Favorite nếu không phụ thuộc nhau |
| Sentiment B chưa có phê duyệt chính thức | Trung bình | Rủi ro học thuật | Làm rõ với giảng viên trước 10/11 |
| Map NaN mobile chưa sửa | Thấp | Demo bị lỗi trực quan | FIX nhỏ trong T14 nếu không làm ở T13-B |

---

## 8. Checklist tới demo/bảo vệ

- [ ] Tất cả 43 CORE: PASS hoặc ghi rõ NOT RUN + lý do chấp nhận
- [ ] 4 FAIL hiện tại được sửa và re-run
- [ ] Demo local chạy được (Docker + backend + frontend)
- [ ] Seed data demo nhất quán, không phụ thuộc test fixture
- [ ] Slide báo cáo đồ án
- [ ] Kịch bản demo 10–15 phút
- [ ] Tài liệu kiến trúc, DB ERD, API doc cập nhật
- [ ] Sentiment A/B — quyết định rõ ràng và document
- [ ] Runbook startup/reset

