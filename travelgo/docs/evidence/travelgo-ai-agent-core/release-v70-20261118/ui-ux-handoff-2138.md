# TASK21.38 preparation — existing UI inventory

Static inventory: 48 page route patterns, 3 layout containers, 34 shared TSX components. No routes created.
Only /assistant has current desktop/mobile browser acceptance in TASK21.37. Other UI issues remain unverified unless marked as source-confirmed placeholders.

| Route | Component | Role | Status / UI priority | API modules |
|---|---|---|---|---|
| / | HomePage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, blogService.ts, bookingService.ts, favoriteService.ts, placeService.ts, telemetryService.ts |
| /explore | ExplorePage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, favoriteService.ts, placeService.ts, recommendationService.ts, telemetryService.ts |
| /tours | ToursPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, telemetryService.ts, tourService.ts |
| /tours/:id | TourDetailPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, bookingService.ts, telemetryService.ts, tourService.ts |
| /tour-planner | TourPlannerPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, placeService.ts, tourService.ts, tripService.ts |
| /tickets | TicketsPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, bookingService.ts, ticketService.ts |
| /hotels | HotelsPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, bookingService.ts, favoriteService.ts, placeService.ts, telemetryService.ts |
| /hotels/:id | PlaceDetailPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, bookingService.ts, favoriteService.ts, placeService.ts, telemetryService.ts |
| /restaurants | RestaurantsPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, bookingService.ts, favoriteService.ts, placeService.ts, telemetryService.ts |
| /restaurants/:id | PlaceDetailPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, bookingService.ts, favoriteService.ts, placeService.ts, telemetryService.ts |
| /places/:id | PlaceDetailPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, bookingService.ts, favoriteService.ts, placeService.ts, telemetryService.ts |
| /blog | BlogPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | api.ts, blogService.ts |
| /blog/create | BlogCreatePage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, blogService.ts |
| /blog/:id | BlogDetailPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | api.ts, blogService.ts |
| /login | LoginPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts |
| /register | RegisterPage | PUBLIC | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts |
| /favorites | FavoritesPage | CUSTOMER/PARTNER/SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, favoriteService.ts, telemetryService.ts |
| /my-trips | MyTripsPage | CUSTOMER/PARTNER/SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | api.ts, tripService.ts |
| /my-trips/:id | TripDetailPage | CUSTOMER/PARTNER/SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | api.ts, tripService.ts |
| /profile | ProfilePage | CUSTOMER/PARTNER/SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts |
| /bookings | BookingsPage | CUSTOMER/PARTNER/SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | api.ts, bookingService.ts |
| /become-partner | BecomePartnerPage | CUSTOMER/PARTNER/SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | api.ts, platformService.ts |
| /assistant | AssistantPage | CUSTOMER | CURRENT_MODEL_OFF_CONSENT_CHAT_PREVIEW_ACCEPTED; P1_CHAT_LAYOUT_CONTINUITY | agentCoreClient.ts, agentService.ts, api.ts, authService.ts, bookingService.ts, placeService.ts, tripService.ts |
| /google-explore | GoogleExplorePage | CUSTOMER | EXISTING_MAP_ROUTE_FEATURE_OFF_NOT_TESTED; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | api.ts |
| /assistant-public | PublicAssistantPage | CUSTOMER | EXISTING_PUBLIC_PROVIDER_ROUTE_DISABLED_IN_THIS_ACCEPTANCE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | agentService.ts, api.ts, authService.ts, publicAgentService.ts |
| /privacy | IntegrationPolicyPage | PUBLIC | EXISTING_POLICY_PAGE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | None found |
| /terms | IntegrationPolicyPage | PUBLIC | EXISTING_POLICY_PAGE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | None found |
| /* | NotFoundPage | PUBLIC | EXISTING_ERROR_ROUTE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | None found |
| /admin | AdminDashboardPage | SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, platformService.ts |
| /admin/travel-web | TravelWebPage | SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts |
| /admin/language-lexicon | LanguageLexiconPage | SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts |
| /admin/partner-applications | PartnerApplicationsPage | SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, platformService.ts |
| /admin/places | AdminModerationPage | SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts |
| /admin/places/:id | AdminModerationPage | SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts |
| /admin/tours | AdminModerationPage | SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts |
| /admin/tours/:id | AdminModerationPage | SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts |
| /admin/blogs | AdminModerationPage | SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts |
| /admin/blogs/:id | AdminModerationPage | SUPER_ADMIN | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts |
| /admin/:section | AdminSectionPage | SUPER_ADMIN | PLACEHOLDER_ONLY_NO_OPERATIONAL_UI; P1_SCOPE_MISSING_BUSINESS_UI_SEPARATELY | None found |
| /partner | PartnerDashboardPage | PARTNER | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, platformService.ts |
| /partner/bookings | PartnerBookingsPage | PARTNER | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts, platformService.ts |
| /partner/bookings/:id | PartnerBookingsPage | PARTNER | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts, platformService.ts |
| /partner/:resource/new | PartnerResourceFormPage | PARTNER | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts, platformService.ts |
| /partner/:resource/:id/edit | PartnerResourceFormPage | PARTNER | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts, platformService.ts |
| /partner/:resource/:id | PartnerResourceFormPage | PARTNER | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts, platformService.ts |
| /partner/:resource | PartnerResourceListPage | PARTNER | EXISTING_COMPONENT_STATIC_AUDIT_NOT_FRESH_FUNCTIONAL_ACCEPTANCE; P1_ROLE_WORKSPACE_CONSISTENCY | api.ts, managementService.ts |
| /partner/workspace/:section | PartnerSectionPage | PARTNER | PLACEHOLDER_ONLY_NO_OPERATIONAL_UI; P1_SCOPE_MISSING_BUSINESS_UI_SEPARATELY | None found |
| /403 | ForbiddenPage | PUBLIC | EXISTING_ERROR_ROUTE; P1_CUSTOMER_JOURNEY_DESIGN_SYSTEM | None found |

Dynamic variants and each route’s API templates, evidence, desktop/mobile issues and public eligibility are in ui-route-inventory.json. Placeholder pages are not completed features.

TASK21.38 scope: audit naming/brand; inventory current design tokens/layouts; unify typography/color/spacing/forms/cards/navigation; responsive customer journeys first, then PARTNER/ADMIN; accessible loading/empty/error/disabled states; preserve API contracts, RBAC, consent, preview confirmation and DEMO labels.
Do not redesign business logic, change frontend framework, add missing business features merely because a placeholder label exists, enable Maps/model/worker, deploy or start21.38 under this task.
No default model activation and no persistent test fixtures as a condition of visual polish.
