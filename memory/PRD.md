# True Joy Birthing - Product Requirements Document

## Original Problem Statement
Build a full-stack application named "True Joy Birthing" for web, iOS, and Android. The app serves four main user roles: MOM, DOULA, MIDWIFE, and ADMIN.

## Core Requirements

### Authentication
- [x] Role-based signup (MOM, DOULA, MIDWIFE)
- [x] Email/password login
- [x] **Google Social Login** (via Emergent-managed OAuth)
- [x] JWT/session-based authentication with httpOnly cookies

### MOM Experience
- [x] Onboarding flow
- [x] Home dashboard with progress tracking
- [x] **Birth Plan - All 9 Sections Implemented per PDF Specification**
- [x] **Share Birth Plan with Providers** - Search for doulas/midwives, send share requests, manage access
- [ ] Pregnancy Timeline
- [ ] Wellness/Emotional Check-in
- [ ] Postpartum Plan
- [ ] "My Team" screen to connect with doulas/midwives

### DOULA/MIDWIFE Experience
- [x] Onboarding flow
- [x] **Client Birth Plans** - View shared birth plans from moms
- [x] **Provider Notes** - Add professional notes to birth plan sections
- [x] **Share Request Management** - Accept/reject birth plan share requests
- [ ] Dashboard
- [ ] Client management
- [ ] Contract management
- [ ] Invoicing

### ADMIN Experience
- [ ] Content management
- [ ] User management

### Phase 3 (Future)
- [ ] Provider marketplace for moms to find and connect with doulas/midwives

## Technical Architecture

### Frontend
- **Framework**: React Native with Expo SDK 51
- **Routing**: Expo Router v3
- **State Management**: Zustand with AsyncStorage for persistence
- **Icons**: lucide-react-native (SVG-based)
- **Forms**: Custom form components (BirthPlanForms.tsx)

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: Session tokens with 7-day expiry

### Key Files
- `/app/frontend/src/components/Icon.tsx` - Icon wrapper
- `/app/frontend/src/components/BirthPlanForms.tsx` - Birth plan form configurations
- `/app/frontend/app/(mom)/birth-plan.tsx` - Birth plan screen
- `/app/frontend/app/(mom)/share-birth-plan.tsx` - NEW: Share with providers screen
- `/app/frontend/app/(provider)/client-birth-plans.tsx` - NEW: Provider view for shared plans
- `/app/backend/server.py` - All API routes and models

## What's Been Implemented

### Session 3 (Feb 16, 2025)
1. **Birth Plan - Full PDF Implementation** - COMPLETED
   - All 9 sections with 50+ form fields from PDF spec
   - Proper form field types (text, textarea, multiselect, singleselect)
   - Tested: 100% backend, 100% frontend

2. **Share Birth Plan Feature** - COMPLETED
   - MOM can search for doulas/midwives by name or email
   - MOM sends share requests (request-based, not instant access)
   - Provider receives notifications of pending requests
   - Provider accepts/rejects share requests
   - Upon acceptance, provider can view full birth plan
   - Provider can add notes to any birth plan section
   - MOM can revoke provider access at any time
   - Tested: 100% backend (24/24 tests), 95% frontend

### API Endpoints - Share Feature
- `GET /api/providers/search?query=X` - Search doulas/midwives
- `POST /api/birth-plan/share` - Send share request
- `GET /api/birth-plan/share-requests` - MOM's share requests
- `DELETE /api/birth-plan/share/{request_id}` - Revoke access
- `GET /api/provider/share-requests` - Provider's pending requests
- `PUT /api/provider/share-requests/{id}/respond` - Accept/reject
- `GET /api/provider/shared-birth-plans` - Provider's shared plans
- `POST /api/provider/birth-plan/{mom_id}/notes` - Add note
- `PUT /api/provider/notes/{note_id}` - Update note
- `DELETE /api/provider/notes/{note_id}` - Delete note

## Test Reports
- `/app/test_reports/iteration_1.json` - Google OAuth tests
- `/app/test_reports/iteration_2.json` - Initial Birth Plan tests
- `/app/test_reports/iteration_3.json` - Full Birth Plan PDF implementation
- `/app/test_reports/iteration_4.json` - Share Birth Plan feature (24/24 backend, frontend verified)
- `/app/backend/tests/test_share_birth_plan.py` - Comprehensive backend tests

## Known Issues
- Console warning: 'shadow*' style props are deprecated (minor React Native Web deprecation)
- Playwright button clicks don't work well with React Native Web Pressable (test automation limitation)

## Prioritized Backlog

### P1 (High Priority)
- Implement remaining Mom screens (Timeline, Wellness, Postpartum, Profile, My Team)
- Implement full Doula dashboard
- Implement full Midwife dashboard

### P2 (Medium Priority)
- Contract and invoicing features for providers
- Real-time notifications for share requests

### P3 (Lower Priority)
- Admin content and user management
- Provider marketplace (Phase 3)
- iOS/Android native builds

## Test Credentials
- MOM: `sharemom2_1771213474@test.com` / `password123`
- DOULA: `doula2_1771213474@test.com` / `password123`
