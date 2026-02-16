# True Joy Birthing - Product Requirements Document

## Original Problem Statement
Build a full-stack application named "True Joy Birthing" for web, iOS, and Android. The app serves four main user roles: MOM, DOULA, MIDWIFE, and ADMIN.

## Core Requirements

### Authentication
- [x] Role-based signup (MOM, DOULA, MIDWIFE, ADMIN)
- [x] Email/password login
- [x] **Google Social Login** (via Emergent-managed OAuth)
- [x] JWT/session-based authentication

### MOM Experience
- [x] Onboarding flow
- [x] Home dashboard with quick actions
- [x] **Birth Plan** - All 9 sections, 50+ fields
- [x] **Share Birth Plan** - Search providers, send requests
- [x] **Timeline** - Week-by-week milestones + custom events
- [x] **Wellness Journal** - Mood, energy, sleep, symptoms tracking
- [x] **Postpartum Plan** - Support network, recovery goals
- [x] **My Team** - View connected providers
- [x] **Provider Marketplace** - Browse and connect with doulas/midwives

### Notifications
- [x] **In-app Notifications** - Share requests, etc.
- [x] **Email Notifications** - Resend integration (pending domain verification)

### DOULA Experience
- [x] Onboarding flow
- [x] **Dashboard** - Stats (clients, contracts, invoices)
- [x] **Client Management** - Add, list, view clients
- [x] **Contract Management** - Create, send, track
- [x] **Invoice Management** - Create, send, mark paid
- [x] **Client Notes** - Prenatal/Birth/Postpartum notes with filtering
- [x] **Profile** - Edit practice info, logout

### MIDWIFE Experience
- [x] Onboarding flow
- [x] **Dashboard** - Stats (clients, visits, births)
- [x] **Client Management** - Add, list, view clients
- [x] **Visit Logging** - Record prenatal/postpartum visits with vitals
- [x] **Birth Summaries** - Create detailed birth records
- [x] **Client Notes** - Prenatal/Birth/Postpartum notes with filtering
- [x] **Profile** - Edit practice info, credentials, logout

### ADMIN Experience
- [x] **User Management** - View all users, filter by role, change roles
- [x] **Content Management** - Edit birth plan section content, add videos
- [x] **Settings** - Admin profile and logout

### Phase 3 - Provider Marketplace
- [x] **Provider Search** - Browse doulas and midwives
- [x] **Location Filter** - Search by city
- [x] **Provider Type Filter** - Filter by Doula/Midwife
- [x] **Provider Profiles** - View details, credentials, services
- [x] **Accepting Status** - Show if accepting new clients

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

#### Marketplace
- `GET /api/marketplace/providers` - List all providers
- `GET /api/marketplace/providers?provider_type=DOULA` - Filter by type
- `GET /api/marketplace/providers?location_city=Austin` - Filter by city
- `GET /api/marketplace/provider/{user_id}` - Get provider details

#### Midwife Notes
- `GET /api/midwife/notes` - List notes
- `POST /api/midwife/notes` - Create note

#### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/{user_id}/role` - Change user role
- `GET /api/admin/content` - List content items
- `PUT /api/admin/content/{section_id}` - Update content

## What's Been Implemented

### Feb 16, 2025 - Session 3: Complete Feature Set
- **Midwife Client Notes** - Prenatal/Birth/Postpartum notes with filtering
- **Provider Marketplace** - Search, filter, view provider profiles
- **Admin Panel Verified** - User management + content management working
- Bug fixed: MongoDB ObjectId serialization in admin content creation

### Feb 16, 2025 - Session 2
- Doula Client Notes, Midwife Birth Summaries

### Feb 16, 2025 - Session 1
- Doula Dashboard (Clients, Contracts, Invoices)

### Earlier
- MOM Experience (Birth Plan, Timeline, Wellness, Postpartum, My Team)
- Provider Share & Notes system
- Email/In-app Notifications

## Test Reports
- `/app/test_reports/iteration_8.json` - Latest
- Backend: 100% (9/9 passed)
- Frontend: 90% (tabs visible, automation limitation)

## Important Notes

### Email Notifications
Resend requires domain verification (~24hrs pending).

### Known Limitations
- React Native Web tab navigation doesn't work in Playwright automation (works in real browser)

## Prioritized Backlog

### P1 (Complete!)
All core features implemented for MOM, DOULA, MIDWIFE, and ADMIN roles.

### P2 (Enhancements)
- Push notifications (mobile)
- PDF export for birth plan
- Contract e-signature integration
- Provider messaging/contact system

### P3 (Future)
- Payment processing for invoices
- Video consultations
- Multi-language support

## Test Credentials
- MOM: `sharemom2_1771213474@test.com` / `password123`
- DOULA: `doula2_1771213474@test.com` / `password123`
- MIDWIFE: `testmidwife_1771216891@test.com` / `password123`
- ADMIN: Create via API with `role: "ADMIN"`
