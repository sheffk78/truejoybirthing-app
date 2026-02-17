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
- [x] **Doula Contract System Rework** (Major Feature):
  - Replaced old contract system with new customizable Doula Service Agreement
  - 6-section multi-step form: Parties & Basics, Services & Scope, Boundaries, Payment & Refunds, Unavailability, Addendum
  - New agreement text template with dynamic field merging
  - All contract fields customizable: prenatal visits, on-call window, backup doula preferences, cancellation terms, etc.
  - Full agreement text generated from template with user inputs
  - PDF export with new agreement format
  - E-signature support for both doula and client
  - Email delivery of signed contracts to both parties
- [x] **Doula Dashboard Icon Updates**:
  - Dashboard icon changed to Home icon (matching Mom section)
  - Invoice icon changed to dollar sign ($) icon
- [x] **Export Birth Plan as PDF** (Bug Fix):
  - Implemented working PDF export for birth plans using ReportLab
  - Endpoint: GET `/api/birth-plan/export/pdf` - Returns downloadable PDF
  - Frontend handleExport function updated to call new endpoint and trigger download
  - PDF includes: Mom's name, due date, birth setting, all birth plan sections with preferences
- [x] **Cancel Invitation Button Fix** (Bug Fix):
  - Fixed backend logic bug where share request data was being queried AFTER deletion
  - Now correctly fetches request data BEFORE deletion for proper cleanup
  - Properly removes provider connections from Mom's profile when invitation is cancelled
  - Cleans up any provider notes associated with the cancelled share
- [x] **UI Improvements** (Bug Fixes):
  - Changed Postpartum icon to baby icon on Mom dashboard
  - Removed unnecessary long-text fields from Birth Plan form
- [x] **Email Delivery of Signed Contracts**:
  - Automatic PDF generation and email delivery when a contract is signed
  - Both parties (provider and client) receive the signed contract PDF via email
  - Professional email template with agreement details summary
  - Uses existing Resend integration for email delivery
  - Works for both Doula and Midwife contracts
- [x] **PDF Export for Contracts**:
  - Added ReportLab-based PDF generation for both Doula and Midwife contracts
  - New endpoints: `/api/contracts/{id}/pdf` and `/api/midwife-contracts/{id}/pdf`
  - Download PDF button appears on signed contracts in both Doula and Midwife contract screens
  - PDF includes all contract details, sections, additional terms, and signatures
  - Professional formatting with brand colors (Lavender for Doula, Sage for Midwife)
- [x] **Midwifery Services Agreement** (from user-provided DOCX):
  - Full-featured contract system mirroring the Doula contract implementation
  - 12 sections from official Midwifery Services Agreement template
  - Sections: Scope of Services, Client Responsibilities, Birth Setting & Transfer, On-Call Period, Fees & Payment, Termination & Refunds, Risks & Consent, Scope Limitations, Confidentiality, Communication & Emergencies, Liability, Acknowledgement
  - Form fields: client name, partner name, due date, planned birth place, on-call weeks, total fee, deposit (auto-calculates remaining balance)
  - Digital signatures: Midwife signs when sending, Client signs via public link
  - Email notification to client when contract is sent
  - Client status updates: "Contract Sent" → "Contract Signed"
  - Backend APIs: 8 endpoints for full CRUD + signing workflow
  - Frontend UI: (midwife)/contracts.tsx, sign-midwife-contract.tsx
  - **All 25 backend tests passing** (iteration_19.json)
- [x] **DateTimePicker Web Fix**:
  - Added conditional rendering for web platform using HTML date/time inputs
  - Native platforms continue to use @react-native-community/datetimepicker
  - Fixes P2 issue: DateTimePicker component not working on web
- [x] **True Joy Birthing Doula Service Agreement** (from PDF):
  - Pre-populated contract template with 8 sections and ability to add additional terms
  - Form fields: client names, due date, total payment, retainer fee, final payment due date
  - Auto-calculated remaining balance (total - retainer)
  - Digital signatures: Doula signs when sending, Client signs via link
  - Email notification to client when contract is sent
  - HTML view for printing/reviewing full contract
  - Sections: Introduction, Role & Boundaries, Services (6 subsections), Restrictions, Privacy, Payment Terms, Cancellations, Acknowledgements
- [x] **Weekly Tips & Affirmations Integration** (from PDFs):
  - Added comprehensive content: 42 pregnancy weeks + 6 postpartum weeks
  - Backend API: `/api/weekly-content` (personalized), `/api/weekly-content/all` (browse)
  - Mom home screen: Weekly Tip card and Weekly Affirmation card
  - Weekly Tips browsing screen: Tabbed view (Pregnancy 1-42, Postpartum 1-6) with week selector
  - Content dynamically calculated based on Mom's due date
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
- [x] **Frontend UI for Appointments**:
  - Mom appointments screen (view and respond to invitations)
  - Provider appointments screen (create appointments, view status)
  - Quick action cards on Mom home, Doula dashboard, Midwife dashboard
  - Fixed layout issue with dashboard quick action grid (2x2 wrap)
- [x] Doula onboarding with zip code lookup (auto-fills city/state)
- [x] Midwife onboarding with zip code lookup (auto-fills city/state)
- [x] Birth location icons in Birth Plan form (Hospital, Birth Center, Home Birth, Not sure yet)
- [x] Email notifications sender domain configured (contact.truejoybirthing.com verified)

### 📊 Test Reports
- `/app/test_reports/iteration_20.json` - Export Birth Plan PDF & Cancel Invitation Fix (100% pass rate)
- `/app/test_reports/iteration_19.json` - Midwifery Services Agreement (100% pass rate, 25 tests)
- `/app/test_reports/iteration_18.json` - True Joy Birthing Doula Contract (100% pass rate, 22 tests)
- `/app/test_reports/iteration_17.json` - Weekly Tips & Affirmations (100% pass rate, 22 tests)
- `/app/test_reports/iteration_16.json` - Appointment E2E flow (100% pass rate, 11 tests)
- `/app/test_reports/iteration_14.json` - Backend collaboration rules (100% pass rate, 19 tests)
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
