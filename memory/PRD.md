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
- [x] **Client Notes** - Add prenatal/birth/postpartum notes with filtering
- [x] **Client Birth Plans** - View shared birth plans
- [x] **Provider Notes** - Add professional notes to birth plan sections
- [x] **Profile** - Edit practice info, services, logout

### MIDWIFE Experience (COMPLETED Feb 16, 2025)
- [x] Onboarding flow
- [x] **Dashboard** - Stats (prenatal clients, total clients, visits/births this month)
- [x] **Client Management** - Add, list, view clients with status tracking
- [x] **Visit Logging** - Record prenatal/postpartum visits with vitals (BP, weight, FHR, GA)
- [x] **Birth Summaries** - Create detailed birth records (place, mode, newborn details, complications)
- [x] **Profile** - Edit practice info, credentials, logout

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
- `GET /api/doula/notes` - List notes
- `POST /api/doula/notes` - Add note

#### Midwife
- `GET /api/midwife/dashboard` - Get stats
- `GET /api/midwife/clients` - List clients
- `POST /api/midwife/clients` - Add client
- `GET /api/midwife/visits` - List visits
- `POST /api/midwife/visits` - Record visit
- `GET /api/midwife/birth-summaries` - List birth summaries
- `POST /api/midwife/birth-summaries` - Create birth summary

## What's Been Implemented

### Feb 16, 2025 - Session 2: Provider Dashboards Complete
- **Doula Client Notes** - Full CRUD with type filtering (Prenatal/Birth/Postpartum)
- **Midwife Birth Summaries** - Create/view with place, mode, newborn details
- **Midwife Visits** - Already existed, now tested
- All backend APIs tested (100% pass rate)
- All frontend screens verified

### Feb 16, 2025 - Session 1: Doula Dashboard
- Dashboard, Clients, Contracts, Invoices, Profile
- All tested and working

### Earlier - MOM Experience
- Birth Plan - 9 sections, 50+ fields
- Share Birth Plan - Search, request, accept/reject, provider notes
- Email/In-app Notifications
- Timeline, Wellness, Postpartum, My Team screens

## Test Reports
- `/app/test_reports/iteration_7.json` - Latest (Doula Notes + Midwife features)
- Backend: 100% (9/9 passed)
- Frontend: 100% (all screens verified)

## Important Notes

### Email Notifications
Resend requires domain verification (user waiting for DNS propagation ~24hrs).

### Known Limitations
- React Native Web click automation in Playwright (use localStorage injection)
- Console warnings about deprecated shadow* props (cosmetic)

## Prioritized Backlog

### P1 (High Priority)
- Midwife notes (endpoint exists, UI similar to Doula notes)
- Admin panel (content/user management)

### P2 (Medium Priority)
- Push notifications (mobile)
- PDF export for birth plan
- Contract e-signature integration

### P3 (Lower Priority)
- Provider marketplace (Phase 3)

## Test Credentials
- MOM: `sharemom2_1771213474@test.com` / `password123`
- DOULA: `doula2_1771213474@test.com` / `password123`
- MIDWIFE: `testmidwife_1771216891@test.com` / `password123`
