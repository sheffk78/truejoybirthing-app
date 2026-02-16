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
- [x] **Birth Plan - All 9 Sections Implemented per PDF Specification** with comprehensive forms:
  - **Section 1: About Me & My Preferences** (7 fields: Mother's Name, Partner's Name, Email, Phone, Due Date, Birth Support, Doctor's Name)
  - **Section 2: Labor & Delivery Preferences** (7 fields: Clothing, Fetal Monitoring, IV/Saline Lock, Eating/Drinking)
  - **Section 3: Pain Management** (2 fields: Pain Management options with ranking, Other specify)
  - **Section 4: Labor Environment & Comfort** (6 fields: Environment, Counter Pressure, Physical Touch)
  - **Section 5: Induction & Birth Interventions** (5 fields: Induction methods, Birthing interventions, Movement)
  - **Section 6: Pushing, Delivery & Safe Word** (7 fields: Cervical Checks, Pushing, Mirror, Photography, Safe Word, Birth Word)
  - **Section 7: Post-Delivery Preferences** (11 fields: Skin-to-Skin, Cord Clamping, Cord Cutting, Placenta, Pitocin, Golden Hour, Feeding)
  - **Section 8: Newborn Care Preferences** (7 fields: Eye Ointment, Hep B, Vitamin K, Vernix, Circumcision, Care Location, Footprints)
  - **Section 9: Other Important Considerations** (6 fields: Other Preferences, Religious/Cultural, Allergies, Visitors, Photography Notes, Music)
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
- **State Management**: Zustand with AsyncStorage for persistence
- **Icons**: lucide-react-native (SVG-based)
- **Forms**: Custom form components (BirthPlanForms.tsx) with text, textarea, multiselect, and singleselect fields

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: Session tokens with 7-day expiry

### Key Files
- `/app/frontend/src/components/Icon.tsx` - Icon wrapper using lucide-react-native
- `/app/frontend/src/components/BirthPlanForms.tsx` - All 9 birth plan section form configurations matching PDF
- `/app/frontend/app/(mom)/birth-plan.tsx` - Birth plan overview and section editor modal
- `/app/frontend/app/(mom)/home.tsx` - Mom dashboard with birth plan progress
- `/app/frontend/app/auth-callback.tsx` - Google OAuth callback handler
- `/app/frontend/src/store/authStore.ts` - Auth state management
- `/app/backend/server.py` - All API routes and models

## What's Been Implemented (December 2025)

### Session 1 (Previous)
- Basic app structure with Expo Router
- Email/password authentication
- Role-based onboarding flows for MOM, DOULA, MIDWIFE
- Session persistence using AsyncStorage

### Session 2 (Previous)
1. **Google Social Login** - COMPLETED
2. **Icon Loading Fix** - COMPLETED (using lucide-react-native)
3. **Birth Plan V1 (Placeholder)** - COMPLETED

### Session 3 (Current - Feb 16, 2025)
1. **Birth Plan - Full PDF Implementation** - COMPLETED
   - Updated `/app/frontend/src/components/BirthPlanForms.tsx` with all fields from "True Joy Birthing Fillout Form FINAL.pdf"
   - Implemented proper form field types:
     - TextInputField for text and textarea
     - MultiSelectField for checkbox groups
     - SingleSelectField for radio button groups
   - All 9 sections now match exact PDF specifications
   - Backend sections updated with matching titles
   - Tested via testing_agent_v3_fork: 100% backend (22/22 tests), 100% frontend

## Known Issues
- Console warning: 'shadow*' style props are deprecated (minor React Native Web deprecation)
- Playwright button clicks don't work with React Native Web Pressable (test automation limitation only)

## Prioritized Backlog

### P0 (Critical)
- None currently - Birth Plan implementation complete!

### P1 (High Priority)
- Implement remaining Mom screens (Timeline, Wellness, Postpartum, Profile, My Team)
- Implement Doula dashboard and client management

### P2 (Medium Priority)
- Implement Midwife dashboard and client management
- Implement contract and invoicing features

### P3 (Lower Priority)
- Admin content and user management
- Provider marketplace (Phase 3)
- iOS/Android native builds

## Test Reports
- Backend: 100% pass rate
- Frontend: 100% pass rate
- Test files: 
  - `/app/test_reports/iteration_1.json` (Google OAuth tests)
  - `/app/test_reports/iteration_2.json` (Initial Birth Plan tests)
  - `/app/test_reports/iteration_3.json` (Full Birth Plan PDF implementation tests)
  - `/app/backend/tests/test_birth_plan_v3.py`

## API Endpoints

### Birth Plan
- `GET /api/birth-plan` - Get user's birth plan with all 9 sections
- `PUT /api/birth-plan/section/{section_id}` - Update a section's data and notes
- `GET /api/birth-plan/export` - Export birth plan for sharing

### Section IDs
1. `about_me` - About Me & My Preferences
2. `labor_delivery` - Labor & Delivery Preferences
3. `pain_management` - Pain Management
4. `monitoring_iv` - Labor Environment & Comfort
5. `induction_interventions` - Induction & Birth Interventions
6. `pushing_safe_word` - Pushing, Delivery & Safe Word
7. `post_delivery` - Post-Delivery Preferences
8. `newborn_care` - Newborn Care Preferences
9. `other_considerations` - Other Important Considerations
