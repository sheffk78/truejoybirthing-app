# True Joy Birthing - Product Requirements Document

## Original Problem Statement
Build a full-stack application named "True Joy Birthing" for web, iOS, and Android. The app serves four main user roles: MOM, DOULA, MIDWIFE, and ADMIN.

## Core Requirements

### Authentication
- [x] Role-based signup (MOM, DOULA, MIDWIFE)
- [x] Email/password login
- [x] **Google Social Login** (via Emergent-managed OAuth)
- [x] JWT/session-based authentication

### MOM Experience
- [x] Onboarding flow
- [x] Home dashboard with quick actions (Timeline, Wellness, Postpartum, My Team)
- [x] **Birth Plan - All 9 Sections** per PDF specification (50+ fields)
- [x] **Share Birth Plan** - Search providers, send requests, manage access
- [x] **Timeline** - Week-by-week pregnancy milestones + custom events/appointments
- [x] **Wellness Journal** - Mood, energy, sleep, symptoms tracking + journal notes
- [x] **Postpartum Plan** - Support network, meal prep, recovery goals, warning signs
- [x] **My Team** - View connected providers, manage invitations

### Notifications
- [x] **In-app Notifications** - Created when birth plan is shared
- [x] **Email Notifications** - Resend integration (requires domain verification)
- [x] **Polling** - GET /api/notifications returns unread count

### DOULA Experience (COMPLETED Feb 16, 2025)
- [x] Onboarding flow
- [x] **Dashboard** - Stats (active clients, total clients, pending contracts, pending invoices)
- [x] **Client Management** - Add, list, view clients with status tracking
- [x] **Contract Management** - Create, send, track contracts
- [x] **Invoice Management** - Create, send, mark paid
- [x] **Client Birth Plans** - View shared birth plans
- [x] **Provider Notes** - Add professional notes to sections
- [x] **Profile** - Edit practice info, services, logout

### MIDWIFE Experience
- [x] Onboarding flow
- [x] Dashboard
- [x] Client management
- [ ] Visit logging (UI exists, needs testing)
- [ ] Birth summary creation

### ADMIN Experience (Future)
- [ ] Content management
- [ ] User management

### Phase 3 (Future)
- [ ] Provider marketplace

## Technical Architecture

### Frontend
- **Framework**: React Native with Expo SDK 51
- **Routing**: Expo Router v3
- **State Management**: Zustand
- **Icons**: lucide-react-native

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **Email**: Resend
- **Authentication**: Session tokens

### Key API Endpoints

#### Doula
- `GET /api/doula/dashboard` - Get stats
- `GET /api/doula/clients` - List clients
- `POST /api/doula/clients` - Add client
- `GET /api/doula/contracts` - List contracts
- `POST /api/doula/contracts` - Create contract
- `POST /api/doula/contracts/{id}/send` - Send contract
- `GET /api/doula/invoices` - List invoices
- `POST /api/doula/invoices` - Create invoice
- `POST /api/doula/invoices/{id}/send` - Send invoice
- `POST /api/doula/invoices/{id}/mark-paid` - Mark as paid
- `GET /api/doula/notes` - Get notes
- `POST /api/doula/notes` - Add note

#### Notifications
- `GET /api/notifications` - Get notifications with unread count
- `PUT /api/notifications/{id}/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

#### Timeline
- `GET /api/timeline` - Get milestones + custom events
- `POST /api/timeline/events` - Add custom event
- `DELETE /api/timeline/events/{id}` - Delete event

#### Wellness
- `POST /api/wellness/entry` - Save wellness entry (mood, energy, sleep, symptoms, journal)
- `GET /api/wellness/entries` - Get entry history
- `GET /api/wellness/stats?days=7` - Get weekly averages

#### Postpartum
- `GET /api/postpartum/plan` - Get postpartum plan
- `PUT /api/postpartum/plan` - Save postpartum plan

## What's Been Implemented

### Feb 16, 2025 - Doula Dashboard Complete
- Full Doula dashboard with stats
- Client management (list, add)
- Contract management (create, send)
- Invoice management (create, send, mark paid)
- Profile management
- All backend APIs tested (100% pass rate)
- All frontend screens verified

### Earlier - MOM Experience Complete
- Birth Plan - 9 sections, 50+ fields
- Share Birth Plan - Search, request, accept/reject, provider notes
- Email Notifications - Resend integration
- In-app Notifications - Polling system
- Timeline Screen - Milestones + custom events
- Wellness Journal - Mood/energy/sleep/symptoms + journal
- Postpartum Plan - Full plan with 10+ sections
- My Team Screen - Provider management
- Home Dashboard - 4 quick action cards

## Test Reports
- `/app/test_reports/iteration_6.json` - Latest comprehensive tests
- Backend: 100% (14/14 tests passed)
- Frontend: 100% (all screens verified)

## Important Notes

### Email Notifications
Resend requires domain verification to send emails to external recipients. The code is complete but emails to external addresses will fail until domain is verified at resend.com/domains. In-app notifications work regardless.

### Known Limitations
- React Native Web Pressable/TouchableOpacity components don't work well with Playwright automation (workaround: localStorage token injection)
- Console warnings about deprecated shadow* props (cosmetic only)

## Prioritized Backlog

### P1 (High Priority)
- Full Midwife dashboard with visit logging and birth summaries
- Client notes for Doula (endpoint exists, UI needs linking)

### P2 (Medium Priority)
- Push notifications (mobile)
- PDF export for birth plan
- Contract e-signature integration

### P3 (Lower Priority)
- Admin content/user management
- Provider marketplace (Phase 3)

## Test Credentials
- MOM: `sharemom2_1771213474@test.com` / `password123`
- DOULA: `doula2_1771213474@test.com` / `password123`
