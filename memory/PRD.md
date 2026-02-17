# True Joy Birthing - Product Requirements Document

## Original Problem Statement
Build a full-stack application named "True Joy Birthing" for web, iOS, and Android. The app serves three main user roles: MOM, DOULA, and MIDWIFE, plus an ADMIN role.

## Brand Identity (Updated 2026-02-16)
- **Logo**: Lavender pregnant silhouette + Pink cursive "True Joy Birthing"
- **Primary Color**: Soft Lavender (#9F83B6)
- **Secondary Color**: Dusty Rose (#D4A5A5)
- **Accent Color**: Sage Green (#8CAF8C)
- **Typography**: Playfair Display (headings) + Quicksand (body)
- See `/app/design_guidelines.md` for full design system

## Core Requirements

### Authentication
- Role-based signup (MOM, DOULA, MIDWIFE) and login
- Google Social Login via Emergent-managed OAuth
- JWT-based session management

### MOM Experience
- Onboarding with due date, birth preferences
- Comprehensive multi-section Birth Plan
- Pregnancy Timeline with weekly milestones
- Wellness/Emotional Check-in tracking
- Postpartum Plan creation
- "My Team" screen to manage providers
- Provider Marketplace to find and contact providers
- Direct messaging with providers

### DOULA Experience
- Dashboard with client overview
- Client management (add, track)
- Contract management with e-signatures
- Invoicing system
- Client notes
- Direct messaging with clients

### MIDWIFE Experience
- Dashboard with client overview
- Client management
- Prenatal/postpartum visit logging
- Client notes
- Birth summary creation
- Direct messaging with clients

### ADMIN Experience
- User management
- Content management

## Technical Stack
- **Frontend**: React Native, Expo (SDK 51), Expo Router, Zustand
- **Backend**: FastAPI, Pydantic, MongoDB
- **Authentication**: JWT + Emergent-managed Google OAuth
- **Notifications**: Resend API (email), In-app notifications

## Database Schema (Key Models)
- **User**: {user_id, email, full_name, role, onboarding_completed}
- **BirthPlan**: {user_id, sections: [...], shared_with: [...]}
- **ShareRequest**: {mom_id, provider_id, status}
- **DoulaClient/MidwifeClient**: {provider_id, mom_id, name, status, ...}
- **Contract**: {doula_id, client_id, content, status, signature_data, signed_at}
- **Invoice**: {doula_id, client_id, amount, status}
- **ProviderNote**: {provider_id, client_id, content}
- **BirthSummary**: {midwife_id, client_id, summary}
- **Message**: {message_id, sender_id, receiver_id, content, read, created_at}

## What's Been Implemented (Last Updated: 2026-02-16)

### ✅ COMPLETED FEATURES

#### Brand Styling (COMPLETED - 2026-02-16)
- [x] Playfair Display font applied to all headings across the app
- [x] Quicksand font applied to all body text
- [x] Brand color palette (lavender, dusty rose, sage green) applied consistently
- [x] Role-based colors: MOM (dusty rose), DOULA (lavender), MIDWIFE (sage green)
- [x] All screens updated with FONTS constants instead of fontWeight

#### Onboarding Tutorial (COMPLETED - 2026-02-16)
- [x] Swipeable 6-step tutorial for new users after role-specific onboarding
- [x] Role-specific content and tips for MOM, DOULA, MIDWIFE
- [x] Skip button to bypass tutorial
- [x] "Get Started" button on final step to enter app
- [x] "View App Tour" option in all profile screens to revisit tutorial

#### Birth Plan Forms (ENHANCED - 2026-02-16)
- [x] Comprehensive 9-section birth plan with detailed questions
- [x] Section 1: About Me - name, contact, due date, birth location, support team
- [x] Section 2: Labor & Delivery - environment, clothing, positions, photography
- [x] Section 3: Pain Management - approach, non-medication methods, medication options
- [x] Section 4: Labor Environment - monitoring, IV, vaginal exams, comfort measures
- [x] Section 5: Induction & Interventions - induction, pitocin, episiotomy, cesarean
- [x] Section 6: Pushing & Safe Word - positions, mirror, perineal support, safe word
- [x] Section 7: Post-Delivery - skin-to-skin, cord clamping, placenta, golden hour
- [x] Section 8: Newborn Care - bathing, vaccines, feeding, rooming-in
- [x] Section 9: Other Considerations - cultural, religious, medical, emergency contact
- [x] Multi-select checkboxes and single-select radio buttons
- [x] Data persistence and section status tracking

#### Authentication & Onboarding
- [x] User registration (MOM, DOULA, MIDWIFE roles)
- [x] Login with JWT authentication
- [x] Google OAuth integration
- [x] Role-specific onboarding flows

#### MOM Features (100% Complete)
- [x] Home dashboard with pregnancy progress
- [x] Birth Plan (multi-section with all categories)
- [x] Birth Plan sharing with providers
- [x] Pregnancy Timeline with milestones
- [x] Wellness check-ins (mood, sleep tracking)
- [x] Postpartum Plan
- [x] My Team (view connected providers)
- [x] Provider Marketplace (browse doulas/midwives)
- [x] **Direct Messaging with providers** (NEW - 2026-02-16)

#### DOULA Features (100% Complete)
- [x] Dashboard with client summary
- [x] Client management (CRUD)
- [x] Contract creation and management
- [x] Send contract for signature
- [x] **E-Signature functionality** (NEW - 2026-02-16)
- [x] Invoicing system
- [x] Client notes
- [x] **Direct Messaging with clients** (NEW - 2026-02-16)

#### MIDWIFE Features (100% Complete)
- [x] Dashboard with client summary
- [x] Client management
- [x] Prenatal visit logging
- [x] Postpartum visit logging
- [x] Birth summaries
- [x] Client notes
- [x] **Direct Messaging with clients** (NEW - 2026-02-16)

#### ADMIN Features (100% Complete)
- [x] User management (list, status toggle)
- [x] Content management

#### Backend Infrastructure
- [x] All API endpoints for above features
- [x] MongoDB integration
- [x] JWT authentication middleware
- [x] Notification system (in-app + email via Resend)
- [x] Messaging endpoints

### 🟡 BLOCKED
- None (previously: Email notifications domain verification - now resolved)

### ✅ RECENTLY COMPLETED (2026-02-17)
- [x] **Collaboration & Permission Rules** (from PDF):
  - Connection permissions (`can_view_birth_plan`, `can_message`) on share requests
  - Birth plan status tracking (`not_started`, `in_progress`, `complete`)
  - Auto-notification to providers when Mom completes birth plan
  - Appointment system: Doula/Midwife can create appointments with Moms (private notes hidden from Mom)
  - Mom can accept/decline appointment invitations
  - Messaging permissions enforce active connections
  - Provider-to-Provider messaging requires shared client
  - Midwife visits split into `summary_for_mom` (Mom visible) and `private_note` (Midwife only)
  - Providers view birth plan as read-only
- [x] Doula onboarding with zip code lookup (auto-fills city/state)
- [x] Midwife onboarding with zip code lookup (auto-fills city/state)
- [x] Birth location icons in Birth Plan form (Hospital, Birth Center, Home Birth, Not sure yet)
- [x] Email notifications sender domain configured (contact.truejoybirthing.com verified)

### 📊 Test Reports
- `/app/test_reports/iteration_13.json` - Latest test (100% pass rate, zip code lookup & icons)
- `/app/test_reports/iteration_12.json` - Previous test (100% pass rate, birth plan forms)
- Backend: 18/18 tests passed
- Frontend: All flows verified

## Key API Endpoints

### Authentication
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`

### Messages (NEW)
- GET `/api/messages/conversations` - Get all conversations
- GET `/api/messages/{user_id}` - Get messages with a user
- POST `/api/messages` - Send a message
- GET `/api/messages/unread/count` - Get unread count

### Contracts
- GET `/api/contracts/{contract_id}` - Public endpoint for viewing
- POST `/api/doula/contracts/{contract_id}/sign` - Sign with name/timestamp

### Other Endpoints
- Marketplace: `/api/marketplace/providers`
- Birth Plan: `/api/birthplan`, `/api/birthplan/share`
- Doula: `/api/doula/*`
- Midwife: `/api/midwife/*`
- Admin: `/api/admin/*`

## Test Credentials
- MOM: Create new with unique email
- Test MOM: `frontend_test_mom@test.com` / `password123`
- Test DOULA: `marketplace_doula@test.com` / `password123`
- Create ADMIN via API with role: "ADMIN"

## Files of Reference
- `backend/server.py` - Main backend file
- `frontend/app/(mom)/messages.tsx` - MOM messaging
- `frontend/app/(doula)/messages.tsx` - DOULA messaging
- `frontend/app/(midwife)/messages.tsx` - MIDWIFE messaging
- `frontend/app/sign-contract.tsx` - Contract signing page
- `frontend/app/(mom)/marketplace.tsx` - Provider marketplace

## Future Enhancements (Backlog)
- Real-time messaging with WebSockets
- Push notifications
- File attachments in messages
- Provider scheduling/availability
- Payment processing integration
