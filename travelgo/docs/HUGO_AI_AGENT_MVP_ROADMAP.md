# HUGO AI Agent MVP — Roadmap

**Ngày lập:** 07/11/2026, Asia/Saigon.  
**Căn cứ:** READ-ONLY audit source workspace (`HEAD 052531d`).  
**Feature freeze:** 24/11/2026 (17 ngày). Nộp báo cáo: 08/12/2026.

> [!IMPORTANT]
> Mọi mô tả kiến trúc và task đều dựa trực tiếp vào API, service và model có thật trong workspace. Không đề xuất xây lại component đã PASS E2E.

> [!WARNING]
> AI Agent là **hướng phát triển mới**, không thay thế T13-B. Các lỗi P1 (B06, B04) phải được sửa trước khi Agent sử dụng cùng các API đó.

---

## 1. Kiến trúc AI Agent đề xuất (dựa trên source thực tế)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (React Frontend)                     │
│                                                                 │
│  ┌──────────────┐    ┌─────────────────────────────────────┐   │
│  │ Existing UI  │    │      AgentChatPanel (MỚI)           │   │
│  │ TourPlanner  │    │  ┌─────────────────────────────┐   │   │
│  │ MyTrips      │    │  │ MessageHistory (user/asst)  │   │   │
│  │ Explore      │    │  │ TextInput                   │   │   │
│  │ PlaceDetail  │    │  │ ItineraryPreview (inline)   │   │   │
│  └──────────────┘    │  │ ConfirmSaveButton            │   │   │
│                       │  └─────────────────────────────┘   │   │
│                       └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │ POST /api/agent/chat
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXPRESS BACKEND (Node.js)                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  AgentRoute  POST /api/agent/chat  [authenticate]        │   │
│  │  AgentController → AgentService (MỚI)                    │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                            │                                     │
│  ┌─────────────────────────▼────────────────────────────────┐  │
│  │              AgentOrchestrator (MỚI)                      │  │
│  │                                                            │  │
│  │  1. Load context (TripSession nếu currentTripId có)       │  │
│  │  2. Build prompt (system + history + user message)         │  │
│  │  3. Call Gemini API (generateContent)                      │  │
│  │  4. Parse LLM response → intent + tool calls              │  │
│  │  5. Execute tools (nếu có)                                │  │
│  │  6. Return final response                                  │  │
│  └───────────┬──────────────────────────────────────────────┘  │
│               │ Tool calls                                       │
│    ┌──────────▼─────────────────────────────────────────────┐  │
│    │            TOOLS (tái dùng services hiện có)            │  │
│    │                                                          │  │
│    │  plan_trip(PlannerInput) → GeneratedItinerary            │  │
│    │    → TourPlannerService.generatePersonalizedItinerary()  │  │
│    │                                                          │  │
│    │  search_places(query, city) → PlaceData[]               │  │
│    │    → RecommendationService.recommendFromDatabase()       │  │
│    │                                                          │  │
│    │  save_trip(itinerary, userId) → TripSession             │  │
│    │    → TripSessionService.createTripFromPlanner()          │  │
│    │                                                          │  │
│    │  update_trip(tripId, updates) → TripSession             │  │
│    │    → TripSessionService.updateTrip()                     │  │
│    │                                                          │  │
│    │  get_trip(tripId, userId) → TripSession                 │  │
│    │    → TripSessionService.getTripById()                    │  │
│    └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Gemini API (External)                          │  │
│  │  Model: gemini-1.5-flash (nhanh, free tier)                │  │
│  │  Mode: generateContent với function_declarations           │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │    PostgreSQL       │
                    │  (không đổi schema) │
                    │  trip_sessions      │
                    │  places, tours      │
                    │  recommendation_*   │
                    └────────────────────┘
```

---

## 2. Phân biệt MVP bắt buộc và nâng cao

### MVP bắt buộc (phải có để demo "AI Agent")

| # | Tính năng | Mô tả |
|---|---|---|
| M1 | **Chat UI** | Trang `/assistant` hoặc floating panel: text input, message bubbles user/assistant |
| M2 | **LLM backbone** | Gemini API (`@google/generative-ai`) trong backend; không mock |
| M3 | **Tool: plan_trip** | Agent gọi `TourPlannerService` khi user nói muốn lập lịch trình |
| M4 | **Tool: search_places** | Agent gọi `RecommendationService` khi user hỏi địa điểm |
| M5 | **Tool: save_trip** | Agent gọi `TripSessionService.createTripFromPlanner()` sau khi user confirm |
| M6 | **Multi-turn context** | Stateless: client gửi `messages[]` history; agent nhớ trong conversation |
| M7 | **Auth** | Agent route yêu cầu JWT token; tái dùng `authenticate` middleware |
| M8 | **Consent check** | Trước khi personalize, kiểm tra `userConsent.personalizationAllowed` |

### Nâng cao (nice-to-have nếu còn thời gian)

| # | Tính năng | Phụ thuộc |
|---|---|---|
| E1 | **Tool: update_trip** | Agent sửa trip hiện tại khi user nói "bỏ ngày 2 khách sạn A" |
| E2 | **Context từ trip hiện tại** | Agent load `TripSession` khi mở chat từ `/my-trips/:id` |
| E3 | **Tool: add_favorite** | Agent gọi `FavoriteService` |
| E4 | **Streaming response** | Gemini streaming API → SSE → React streaming display |
| E5 | **Sentiment trong agent** | Phân tích review với model joblib hoặc Gemini built-in |
| E6 | **DB session persistence** | Lưu chat history vào PostgreSQL (migration 13) |

---

## 3. System Prompt và Tool Schema (concept)

### System Prompt

```
Bạn là HuGo Assistant, trợ lý du lịch AI của nền tảng HuGo Travel.
Nhiệm vụ: Giúp người dùng lập lịch trình du lịch, tìm địa điểm phù hợp và lưu kế hoạch.

Nguyên tắc:
- Luôn hỏi thêm thông tin nếu thiếu (điểm đến, ngày, ngân sách, số người)
- Trả lời bằng tiếng Việt
- Khi tạo lịch trình, luôn hỏi xác nhận trước khi lưu
- Không hứa hẹn giá chính xác — đây là ước tính từ hệ thống
- Không thực hiện booking mà không có xác nhận rõ ràng

Thông tin user: {userId}, {userName}, consent: {personalizationAllowed}
Trip hiện tại (nếu có): {currentTripSummary}
```

### Tool Definitions (JSON Schema cho Gemini Function Calling)

```typescript
const tools = [
  {
    name: "plan_trip",
    description: "Tạo lịch trình du lịch chi tiết theo yêu cầu người dùng",
    parameters: {
      type: "object",
      properties: {
        destinationCity: { type: "string", description: "Thành phố đến" },
        startDate: { type: "string", description: "Ngày bắt đầu (YYYY-MM-DD)" },
        endDate: { type: "string", description: "Ngày kết thúc (YYYY-MM-DD)" },
        adults: { type: "number" },
        children: { type: "number" },
        totalBudget: { type: "number", description: "Ngân sách VNĐ cho cả nhóm" },
        transportation: { type: "string", enum: ["car", "motorbike"] },
        preferences: { type: "array", items: { type: "string" } },
      },
      required: ["destinationCity", "startDate", "endDate", "adults", "totalBudget"]
    }
  },
  {
    name: "search_places",
    description: "Tìm địa điểm phù hợp với sở thích và ngân sách",
    parameters: {
      type: "object",
      properties: {
        destinationCity: { type: "string" },
        preferences: { type: "array", items: { type: "string" } },
        dailyBudgetPerPerson: { type: "number" },
        category: { type: "string", enum: ["hotel", "restaurant", "attraction", "tour"] }
      },
      required: ["destinationCity"]
    }
  },
  {
    name: "save_trip",
    description: "Lưu lịch trình đã được người dùng xác nhận vào tài khoản",
    parameters: {
      type: "object",
      properties: {
        itinerary: { type: "object", description: "GeneratedItinerary object từ plan_trip" }
      },
      required: ["itinerary"]
    }
  }
];
```

---

## 4. Roadmap có dependency đến demo

```
Ngày hiện tại: 07/11/2026 (Thứ 7)
Feature freeze: 24/11/2026 (Thứ 2) — 17 ngày
Nộp báo cáo:   08/12/2026 — 31 ngày
```

### Phase 0 — Sửa lỗi P1 trước (2-3 ngày: 08-10/11)

```
T13-B-02-FIX
├── B06: PartnerService.getBookings thiếu MANAGE_BOOKINGS (P1 security)
├── B04: PartnerResourceFormPage timestamp trôi -7h (P1 data integrity)
├── B02/B03: form value falsy 0 (P2 UX)
└── Re-run full 8 CORE → báo cáo T13-B-02-FIX
```

**Lý do làm trước:** B06 là security issue — Agent cũng sẽ gọi booking API; không thể để lỗi permission tồn tại.

---

### Phase 1 — AI Agent Backend MVP (3-4 ngày: 10-14/11)

```
T-AI-01: Agent Backend Foundation
├── Cài đặt: npm install @google/generative-ai (backend)
├── Config: GEMINI_API_KEY trong .env (không commit)
├── Mới: backend/src/services/agentService.ts
│   ├── AgentOrchestrator class
│   ├── Tool definitions (plan_trip, search_places, save_trip)
│   ├── Tool executor → gọi TourPlannerService, RecommendationService, TripSessionService
│   ├── Prompt builder (system + history + current trip context)
│   └── Gemini API client (generateContent với function_declarations)
├── Mới: backend/src/controllers/agentController.ts
├── Mới: backend/src/routes/agentRoutes.ts → POST /api/agent/chat
│   └── middleware: authenticate, consent check
└── backend/src/routes/api.ts → thêm /agent route
```

**Acceptance:** `POST /api/agent/chat { message: "Lập lịch Đà Nẵng 3 ngày" }` → gọi `plan_trip` tool → trả itinerary JSON + text response.

---

### Phase 2 — AI Agent Frontend MVP (3-4 ngày: 14-18/11)

```
T-AI-02: Agent Chat UI
├── Mới: frontend/src/pages/AgentPage.tsx (/assistant route)
│   ├── MessageList component (user/assistant bubbles)
│   ├── ChatInput component (text + send button)
│   ├── ItineraryPreview (render GeneratedItinerary inline)
│   └── ConfirmSaveTrip button (gọi save_trip sau confirm)
├── Mới: frontend/src/services/agentService.ts
│   └── postChat(message, history, currentTripId) → AgentResponse
├── frontend/src/router/AppRouter.tsx
│   └── Thêm route /assistant (protected: CUSTOMER)
└── frontend/src/layouts/CustomerLayout.tsx
    └── Thêm link "AI Assistant" vào nav
```

**Acceptance:** User gõ "Tôi muốn đi Hội An 4 ngày ngân sách 10 triệu" → agent hỏi thêm → user cung cấp → agent tạo lịch trình → user confirm → trip được lưu → redirect `/my-trips/:id`.

---

### Phase 3 — Integration & Polish (2-3 ngày: 18-21/11)

```
T-AI-03: Context Integration
├── Load TripSession khi mở chat từ /my-trips/:id
│   → "Tôi muốn thay khách sạn ngày 2" — agent biết đang nói về trip nào
├── Tool update_trip → TripSessionService.updateTrip()
├── Error handling: LLM timeout, API quota, invalid tool params
├── Rate limiting: max 20 requests/user/hour (simple in-memory)
└── Logging agent requests cho debug (không log message content nếu sensitive)
```

---

### Phase 4 — T13-B còn lại (nếu còn thời gian: 21-24/11)

```
T13-B-03 (B07/B08 + V01-V08) — Optional, có thể ghi NOT RUN với lý do
T13-B-04 (F01-F07 + A01/A06) — Favorite có thể thêm như Agent tool
T13-B-05 (C01-C08 + R06) — Consent đã được handle trong Agent
```

> [!NOTE]
> Nếu không đủ thời gian, V01–V08 (Review E2E) và F01–F07 (Favorite E2E) ít ảnh hưởng đến AI Agent demo nhất. Có thể ghi NOT RUN với ghi chú "API đã có, chưa có E2E bằng chứng".

---

### Phase 5 — T14 Demo & Documentation (24/11 - 07/12)

```
T14-01: Demo Readiness
├── Seed data demo (không phụ thuộc test fixture)
├── Kịch bản demo 10-15 phút: Customer → AI Agent → Trip → Partner → Admin
├── Runbook: startup local (Docker + backend + frontend)
├── Reset demo state script

T14-02: Documentation
├── SYSTEM_ARCHITECTURE.md cập nhật (thêm Agent layer)
├── DATABASE_ERD.md nếu có migration 13
├── API_DOCUMENTATION.md thêm /api/agent/chat
├── Slide báo cáo đồ án
│   ├── Kiến trúc tổng thể
│   ├── AI components (Planner, Recommendation, Agent, Sentiment research)
│   └── Demo screenshots

T14-03: Defense Preparation
├── Q&A common questions về AI Agent
├── Phân biệt rõ: rule-based vs LLM-based vs research
└── Trình bày sentiment như R&D pipeline (không claim production quality)
```

---

## 5. Timeline tổng hợp

| Giai đoạn | Ngày | Task | Deliverable |
|---|---|---|---|
| **Phase 0** | 08-10/11 | T13-B-02-FIX | 4 FAIL sửa xong, 11 CORE PASS |
| **Phase 1** | 10-14/11 | T-AI-01 Backend | `/api/agent/chat` hoạt động |
| **Phase 2** | 14-18/11 | T-AI-02 Frontend | `/assistant` page với chat UI |
| **Phase 3** | 18-21/11 | T-AI-03 Integration | Context, error handling, rate limit |
| **Phase 4** | 21-24/11 | T13-B còn lại (nếu kịp) | Thêm PASS hoặc ghi NOT RUN |
| **Feature Freeze** | **24/11** | — | Toàn bộ feature đóng băng |
| **Phase 5** | 24/11-07/12 | T14 Demo + Docs + Slide | Sẵn sàng bảo vệ |

---

## 6. Quyết định cần duyệt trước triển khai

| # | Quyết định | Deadline | Tác động |
|---|---|---|---|
| **D1** | Dùng Gemini API (cần API key) hay Ollama local (không cần key)? | 08/11 | Quyết định stack trước khi code Phase 1 |
| **D2** | Sentiment Phương án A (research-only) hay tích hợp? | **10/11** | Nếu tích hợp: thêm 3-5 ngày effort |
| **D3** | Agent route stateless (client giữ history) hay persistent (migration 13)? | 10/11 | Stateless đơn giản hơn, đủ cho MVP |
| **D4** | Agent page là trang riêng `/assistant` hay floating panel? | 11/11 | Trang riêng đơn giản hơn, dễ route guard |
| **D5** | Có muốn T13-B-03/04/05 trước Agent hay song song? | 10/11 | Ảnh hưởng timeline Phase 1 |

---

## 7. Rủi ro và biện pháp

| Rủi ro | Khả năng | Ảnh hưởng | Biện pháp |
|---|---|---|---|
| Gemini API quota hết trong demo | Trung bình | Demo bị lỗi | Chuẩn bị mock response fallback cho demo |
| LLM không gọi đúng tool | Cao lần đầu | Agent không hoạt động | Viết system prompt rõ ràng; test nhiều scenario trước demo |
| Planner trả 422 khi catalog thiếu | Trung bình | Agent crash | Catch error, trả message thân thiện "Không đủ địa điểm trong catalog" |
| Timeline Phase 4 (T13-B còn lại) quá chặt | Cao | Không hoàn thành | Chấp nhận NOT RUN có lý do; ưu tiên demo AI Agent |
| API key lộ trong commit | Thấp | Security issue | .env không commit, check .gitignore |

---

## 8. Điểm khác biệt so với Planner hiện tại (để trình bày)

| | Tour Planner (hiện có) | AI Agent (đề xuất) |
|---|---|---|
| **Input** | Structured form (dropdown, number) | Ngôn ngữ tự nhiên tiếng Việt |
| **UX** | Form → Submit → Result | Hội thoại nhiều lượt |
| **Điều chỉnh** | Submit lại form từ đầu | "Thay khách sạn ngày 2" → agent hiểu và update |
| **Giải thích** | Static template string | LLM synthesize explanation từ tool results |
| **Memory** | Không có | Giữ context trong conversation |
| **Planner engine** | Chạy trực tiếp từ form | Chạy qua agent khi LLM quyết định cần |

**Điểm mạnh của đề xuất:** Tái dụng 100% planner algorithm và catalog đã có. Agent chỉ là lớp NLU + orchestration ngồi trên.

---

## 9. NEXT TASK PLAN — T13-B-02-FIX

### Task ID: `T13-B-02-FIX`
### Mô tả: Sửa 4 lỗi từ T13-B-02 và re-run full regression 8 CORE

**Lý do phải làm trước AI Agent:**
- T13B02-01 (B06) là **P1 security** — permission bypass trên booking API — Agent cũng sẽ gọi API này.
- T13B02-04 (B04) là **P1 data integrity** — timestamp trôi −7h — Ticket là resource trong catalog Agent sử dụng.
- Sửa xong mới có baseline app sạch để bắt đầu Agent development.

**Phạm vi được phép:** Sửa đúng 3 file. Không sửa file khác. Không migrate DB. Không push/deploy.

**File cần sửa:**

| File | Sửa gì |
|---|---|
| `backend/src/services/partnerService.ts` | `getBookings`: sau `getBusiness()`, kiểm `membership.permissions` có `MANAGE_BOOKINGS`; không có → throw 403 |
| `frontend/src/pages/partner/PartnerResourceFormPage.tsx` | 1. `value={form[field.key] ?? ''}` cho number fields (B02/B03); 2. `normalizeForForm`: convert ISO UTC → local datetime string đúng timezone (B04 frontend) |
| `backend/src/services/ticketService.ts` | Parse `departureTime`/`arrivalTime`: nếu string không có `Z`, thêm `Z` trước `new Date()` — treat as UTC |

**Phương án timestamp nhất quán:**
- Frontend `normalizeForForm`: khi mở form edit, convert `2030-06-15T03:30:00.000Z` → `2030-06-15T10:30` (UTC+7) để hiển thị đúng local time
- Frontend khi submit: giữ nguyên string từ input datetime-local, không convert
- Backend: `new Date(str + 'Z')` nếu string không có offset → luôn UTC

**Acceptance criteria:**
1. `GET /api/partner/businesses/:id/bookings` với `MANAGE_BUSINESS` only → 403
2. Place/Tour form: `priceFrom=0` hoặc `durationNights=0` → reload → input hiển thị `0`, valid
3. Ticket save không sửa → departure/arrival không đổi instant (delta = 0ms)
4. Full 8 CORE: B02/B03/B04/B06 PASS; R03/A05/B01/B05 vẫn PASS

**Kiểm thử:** Focused B06+B04 → PASS → Full 8 CORE. Harness riêng `t13b02-fix-{run,audit}.cjs`.

**Bằng chứng:** `docs/evidence/t13b-02-fix/<runId>/`, fingerprint before/after, source hash 3 file trước/sau.

**Báo cáo:** `docs/HUGO_T13_B_02_FIX_REPORT.md`

**Điểm dừng:** Sau full regression và báo cáo. Không tự bắt đầu T-AI-01.

---

## 10. AFTER NEXT TASK — Dự kiến

Sau T13-B-02-FIX PASS:
1. **Duyệt D1/D2/D3** (Gemini vs Ollama, Sentiment A/B, Stateless vs Persistent)
2. **T-AI-01** — Agent Backend (Phase 1): `agentService.ts`, tool definitions, Gemini integration, route `/api/agent/chat`
3. **T-AI-02** — Agent Frontend (Phase 2): `/assistant` page, chat UI, `agentService.ts` frontend

