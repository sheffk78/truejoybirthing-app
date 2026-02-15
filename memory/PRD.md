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
- [x] Home dashboard
- [ ] Birth Plan (multi-section, interactive)
- [ ] Pregnancy Timeline
- [ ] Wellness/Emotional Check-in
- [ ] Postpartum Plan
- [ ] "My Team" screen to connect with doulas/midwives

### DOULA Experience
- [x] Onboarding flow
- [ ] Dashboard
- [ ] Client management
- [ ] Contract management
- [ ] Invoicing
- [ ] Client notes

### MIDWIFE Experience
- [x] Onboarding flow
- [ ] Dashboard
- [ ] Client management
- [ ] Prenatal/postpartum visit logging
- [ ] Birth summary creation

### ADMIN Experience
- [ ] Content management
- [ ] User management

### Phase 3 (Future)
- [ ] Provider marketplace for moms to find and connect with doulas/midwives

## Technical Architecture

### Frontend
- **Framework**: React Native with Expo SDK 51
- **Routing**: Expo Router v3
- **State Management**: Zustand with persist middleware
- **Icons**: lucide-react-native (SVG-based, replaced @expo/vector-icons due to web font loading issues)
- **Forms**: react-hook-form with zod validation

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: Session tokens with 7-day expiry, httpOnly cookies

### Key Files
- `/app/frontend/src/components/Icon.tsx` - Icon wrapper using lucide-react-native
- `/app/frontend/app/auth-callback.tsx` - Google OAuth callback handler
- `/app/frontend/src/store/authStore.ts` - Auth state with loginWithGoogle method
- `/app/backend/server.py` - All API routes and models

## What's Been Implemented (December 2025)

### Session 1 (Previous)
- Basic app structure with Expo Router
- Email/password authentication
- Role-based onboarding flows for MOM, DOULA, MIDWIFE
- Session persistence using Zustand persist middleware

### Session 2 (Current - Dec 15, 2025)
1. **Google Social Login** - COMPLETED
   - "Continue with Google" button on welcome screen
   - Redirects to Emergent Auth (auth.emergentagent.com)
   - Auth callback page processes session_id from URL hash
   - Backend endpoint exchanges session_id for session token

2. **Icon Loading Fix** - COMPLETED
   - Replaced @expo/vector-icons (Ionicons) with lucide-react-native
   - Created Icon wrapper component with Ionicons-to-Lucide mapping
   - All icons now render as SVGs, working on web/native

## Known Issues
- Console warning: 'shadow*' style props are deprecated (minor React Native Web deprecation)

## Prioritized Backlog

### P0 (Critical)
- None currently

### P1 (High Priority)
- Wire up Mom Home Screen functionality (Open Birth Plan, navigation)
- Implement Birth Plan Overview screen
- Implement remaining Mom screens (Timeline, Wellness, Postpartum, Profile, My Team)

### P2 (Medium Priority)
- Implement Doula dashboard and client management
- Implement Midwife dashboard and client management
- Implement contract and invoicing features

### P3 (Lower Priority)
- Admin content and user management
- Provider marketplace (Phase 3)
- iOS/Android native builds

## Test Reports
- Backend: 100% pass rate (23/23 tests)
- Frontend: 95% pass rate (visual and navigation tests pass)
- Test file: `/app/test_reports/iteration_1.json`
