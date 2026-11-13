# HUGO AI Agent — Gap Analysis

**Ngày audit:** 07/11/2026, Asia/Saigon.  
**Phiên:** READ-ONLY. Không sửa source, không chạy test ghi DB, không train, không push/deploy.  
**HEAD:** `052531dfc77c4f289757794c0ee08b4d46e6af2e`

> [!IMPORTANT]
> Tất cả kết luận dựa trực tiếp vào source đọc được trong workspace. Không suy đoán tính năng chưa tìm thấy code.

---

## 1. Kiểm kê chính xác những gì đang tồn tại

### 1.1. Tour Planner — Thuật toán heuristic (KHÔNG phải AI Agent)

**File:** `backend/src/services/tourPlannerService.ts`

| Đặc điểm | Chi tiết |
|---|---|
| Input | Structured JSON: destination, dates, adults, children, budget, transportation, preferences[], pacing, mandatoryPlaceIds[] |
| Algorithm | Heuristic: slot assignment (morning/lunch/afternoon/dinner/evening), Haversine distance, budget scoring |
| Catalog source | PostgreSQL trực tiếp qua `PlaceService` |
| Output | Structured `GeneratedItinerary` JSON — deterministic, không có hội thoại |
| LLM | **Không có.** Không có OpenAI, Gemini, Claude, LangChain hay bất kỳ external LLM nào |
| Conversation | **Không có.** Input là form data, output là JSON — một lượt request/response |
| Memory | **Không có.** Không lưu ngữ cảnh hội thoại, không có session chat |

**Kết luận:** Planner là **function call thuần túy**, không phải AI Agent. Nhận form → trả itinerary. Không có vòng lặp hội thoại, không có NLU, không có multi-turn context.

---

### 1.2. Recommendation Service — Thuật toán scoring (KHÔNG phải AI)

**File:** `backend/src/services/recommendationService.ts`

| Đặc điểm | Chi tiết |
|---|---|
| Algorithm | Weighted scoring: quality (0.35) + preference (0.25) + budget (0.25) + distance (0.15) |
| Quality | Bayesian average rating |
| Preference | Keyword matching với `PREFERENCE_KEYWORDS` dictionary (tiếng Việt) |
| Budget | Rule-based: price/budget ratio → score |
| Explanation | Template string generation, không phải LLM |
| Personalization | Dựa trên preferences[] và budget từ request; không có user history learning |

**Kết luận:** Rule-based scoring engine với Bayesian rating. Không có model học từ dữ liệu, không có user behavior modeling thực sự.

---

### 1.3. Intelligence/Telemetry — Infrastructure consent & exposure

**File:** `backend/src/routes/intelligenceRoutes.ts`, `services/telemetryService.ts`

| Endpoint | Chức năng thực tế |
|---|---|
| `GET/PUT /intelligence/consent` | Lưu/đọc user consent (analytics, personalization) |
| `POST /intelligence/events` | Thu thập client events với dedupe, opt-out check |
| `POST /intelligence/recommendations` | Gọi `RecommendationService.recommendFromDatabase()` + lưu `RecommendationRequest` |
| `POST /intelligence/recommendations/visible` | Lưu `RecommendationVisibleImpression` |

**Kết luận:** Infrastructure telemetry và exposure tracking — cơ sở hạ tầng tốt cho analytics, không phải AI inference hay chat.

---

### 1.4. Sentiment Classifier — DEMO_ONLY, không tích hợp vào website

**Files:** `ai/artifacts/t09_demo_eval_v7/`

```
model_card.md: "Data mode: DEMO_ONLY. Production eligible: false."
evaluation.json: "limitations: Fixture scores and CI have no research validity"
Test support: 9 samples
```

**Kết luận:**
- Model TF-IDF + Logistic Regression đã được train trên fixture DEMO_ONLY (9 test samples).
- **Không có Python inference service** nào được kết nối với backend Node.js.
- Không có route `/api/intelligence/sentiment` hay bất kỳ API nào gọi model joblib.
- **Sentiment hoàn toàn tách biệt** khỏi website runtime.

---

### 1.5. AI Agent hội thoại — KHÔNG TỒN TẠI

```
grep kết quả trên toàn workspace:
  frontend/src/**/*.{ts,tsx}: 0 file chứa "agent|chat|llm|openai|gemini|gpt|anthropic|claude"
  backend/src/**/*.ts: 0 file chứa "agent|chat|llm|openai|gemini|gpt|langchain|stream"
  package.json (backend): cors, dotenv, express, pg, pg-hstore, sequelize ONLY
  package.json (frontend): axios, leaflet, lucide-react, react, react-dom, react-router-dom ONLY
```

**Kết luận chắc chắn: Không có AI Agent hội thoại nào trong codebase hiện tại.** Không có LLM integration, không có chat UI, không có conversation history, không có tool calling framework.

---

## 2. Phân biệt rõ ràng các thành phần "AI"

| Thành phần | Thực chất | Tích hợp website | Có thể dùng lại |
|---|---|---|---|
| **Tour Planner** | Heuristic function: form → JSON | ✅ Hoàn chỉnh, E2E PASS | ✅ Tool cho Agent |
| **Recommendation** | Weighted scoring + Bayesian | ✅ Hoàn chỉnh | ✅ Tool cho Agent |
| **Telemetry/Consent** | Infrastructure logging | ✅ Có source | ✅ Respect consent |
| **Sentiment (Kaggle)** | TF-IDF + LR, DEMO_ONLY | ❌ Không kết nối | ⚠️ Chỉ academic |
| **AI Agent chat** | **Không tồn tại** | ❌ | — |

---

## 3. Gap Analysis — Những gì còn thiếu để có AI Agent

### Gap A — Không có LLM Integration [CRITICAL]

Toàn bộ backend Node.js không có SDK nào cho LLM.

**Gap cụ thể:**
- Không có `@google/generative-ai`, `openai`, `@anthropic-ai/sdk` trong package.json
- Không có API key management trong config/env.ts
- Không có HTTP client gọi LLM endpoint

**Phương án đề xuất:** Gemini API (`@google/generative-ai`) — Google ecosystem, free tier, không cần deploy thêm service.

---

### Gap B — Không có Conversation UI [CRITICAL]

Hiện có `TourPlannerPage.tsx` là form-based, phức tạp nhưng không phải chat.

**Gap cụ thể:** Cần trang hoặc component `AgentChatPanel`:
- Input tự do (text box)
- Message history (user/assistant bubbles)
- Hiển thị itinerary đang điều chỉnh inline
- Nút "Lưu lịch trình" sau confirm

---

### Gap C — Không có Conversation Context Management [CRITICAL]

Planner không nhớ lượt trước. Mỗi call là stateless.

**Gap cụ thể:** Cần:
- Backend schema `agent_sessions` hoặc `chat_messages` (migration 13)
- **hoặc** stateless approach: client giữ `messages[]` history, gửi lên mỗi request (đơn giản hơn, đủ cho MVP)

**Có thể tái dùng:** `TripSession.days` làm initial context khi user muốn điều chỉnh trip hiện tại.

---

### Gap D — Không có Agent Orchestrator / Tool Calling [CRITICAL]

Hiện có các "tools nguyên liệu" hoàn hảo nhưng không có lớp điều phối:

```
Có sẵn:
  TourPlannerService.generatePersonalizedItinerary(PlannerInput) → GeneratedItinerary
  RecommendationService.recommendFromDatabase(query) → RecommendedPlaceResult[]
  PlaceService.getPublicPlaces() → PlaceData[]
  TripSessionService.createTripFromPlanner() / updateTrip() → TripSession
  BookingService.createBooking() → Booking

Thiếu:
  Agent route: POST /api/agent/chat
  Tool schema definitions (JSON Schema)
  LLM → structured output parser
  Tool executor (gọi đúng service)
  Result formatter (trả về LLM để synthesize)
```

---

### Gap E — Không có Backend Agent Route [CRITICAL]

Không có route xử lý chat request.

**Cần thêm:**
```typescript
// POST /api/agent/chat
interface AgentChatRequest {
  message: string;
  sessionId?: string;
  currentTripId?: string;    // context từ trip đang xem
  history?: ChatMessage[];   // stateless approach
}
interface AgentChatResponse {
  reply: string;
  action?: { type: 'show_itinerary' | 'save_trip' | 'show_places'; payload: any };
  requiresConfirm?: boolean;
}
```

---

### Gap F — Authorization trong Agent [MEDIUM]

**Hiện có:** JWT middleware hoạt động tốt với tất cả routes.

**Cần thêm:**
- Agent route sử dụng `authenticate` middleware (tái dùng hoàn toàn)
- Agent không được phép thực hiện action Partner/Admin
- Agent không được đọc data user khác (tái dùng ownership check)
- Agent cần check consent trước khi personalize

---

### Gap G — Sentiment không tích hợp [LOW PRIORITY]

**Thực trạng:** Model joblib DEMO_ONLY, không có inference service.

**Nếu cần:** FastAPI + `python-multipart`, `scikit-learn`, `joblib` → expose `/predict` → Node.js gọi HTTP.

**Khuyến nghị:** Không tích hợp trong MVP Agent. LLM (Gemini Flash) có sentiment understanding mạnh hơn TF-IDF. Giữ sentiment như nghiên cứu academic trong báo cáo.

---

## 4. Đánh giá tái sử dụng code

| Component | Tái sử dụng | Ghi chú |
|---|---|---|
| `TourPlannerService.generatePersonalizedItinerary()` | ✅ 100% | Tool chính của Agent |
| `RecommendationService.recommendFromDatabase()` | ✅ 100% | Tool tìm địa điểm |
| `TripSessionService.createTripFromPlanner()` / `updateTrip()` | ✅ 100% | Tool lưu/cập nhật trip sau confirm |
| `PlaceService`, `TourService`, `TicketService` | ✅ 100% | Catalog lookup |
| `authMiddleware.authenticate` | ✅ 100% | Tái dùng cho agent route |
| `TelemetryService` | ✅ Có thể | Ghi agent events |
| `GeneratedItinerary` type | ✅ 100% | Context injection vào LLM |
| `TripSession` model | ✅ 100% | Load trip hiện tại làm context |

**Không cần xây lại bất kỳ thứ gì đã có.** Agent layer ngồi trên tất cả services hiện tại.

---

## 5. Mối quan hệ T13-B với AI Agent Goal

### T13-B có cản trở AI Agent không?

| T13-B Task | Liên quan AI Agent | Quyết định |
|---|---|---|
| **B02-FIX (giá 0 form)** | Không trực tiếp | Vẫn cần sửa (lỗi app thực tế) |
| **B04-FIX (timestamp)** | Không trực tiếp | Vẫn cần sửa (P1 data integrity) |
| **B06-FIX (permission)** | Có — Agent gọi booking API | Vẫn cần sửa (P1 security) |
| V01–V08 (Review) | Gián tiếp | CÓ THỂ trì hoãn sau Agent MVP |
| F01–F07 (Favorite) | Có — Agent có thể manage favorite | CÓ THỂ chạy song song |
| C01–C08 (Consent) | **Quan trọng** — Agent phải respect | Nên complete trước hoặc song song |

**Kết luận:** T13-B không cản trở, nhưng không đủ để đạt AI Agent goal. Đề xuất:
- **Làm ngay:** T13-B-02-FIX (3 P1/P2 lỗi)
- **Song song:** Bắt đầu Agent development (không phụ thuộc T13-B-03/04/05)
- **Có thể cắt giảm:** T13-B-03/04/05 nếu timeline quá chặt, ghi NOT RUN có lý do

---

## 6. Tình trạng Sentiment & Mốc 10/11/2026

### Thực trạng khách quan

```
Data mode: DEMO_ONLY
Test samples: 9
Production eligible: false
Research validity: "Fixture scores and CI have no research validity"
Integration: Hoàn toàn tách rời website
```

### Khuyến nghị cho mốc 10/11/2026

**Chọn Phương án A — Research-only:**
- Sentiment classifier là thành phần nghiên cứu độc lập
- Trình bày trong báo cáo như "AI Research Pipeline" (Kaggle, Python, NLP methodology)
- **Không tích hợp vào website runtime** — không đủ thời gian và không làm tăng giá trị demo
- Nếu Agent dùng Gemini: sentiment được xử lý implicit bởi LLM, không cần model riêng

---

## 7. Tổng hợp Gap Severity

| Gap | Severity | Effort |
|---|---|---|
| LLM integration (npm install + API client) | CRITICAL | 0.5 ngày |
| Agent backend route + orchestrator | CRITICAL | 2-3 ngày |
| Tool definitions + executor | CRITICAL | 1-2 ngày |
| Conversation UI (chat component) | CRITICAL | 2-3 ngày |
| Conversation context (stateless messages[]) | HIGH | 0.5-1 ngày |
| Authorization trong Agent | MEDIUM | 0.5 ngày |
| Consent check | MEDIUM | 0.5 ngày |
| **Tổng MVP tối thiểu** | | **~7-10 ngày** |

