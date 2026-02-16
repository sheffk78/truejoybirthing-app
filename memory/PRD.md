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

### DOULA/MIDWIFE Experience
- [x] Onboarding flow
- [x] **Client Birth Plans** - View shared birth plans
- [x] **Provider Notes** - Add professional notes to sections
- [x] **Share Request Management** - Accept/reject requests
- [ ] Dashboard
- [ ] Contract management
- [ ] Invoicing

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

## What's Been Implemented (Feb 16, 2025)

### Session 3 - Major Feature Release
1. **Birth Plan - Full PDF Implementation** - 9 sections, 50+ fields ✅
2. **Share Birth Plan Feature** - Search, request, accept/reject, provider notes ✅
3. **Email Notifications** - Resend integration configured ✅
4. **In-app Notifications** - Polling system ✅
5. **Timeline Screen** - Milestones + custom events ✅
6. **Wellness Journal** - Mood/energy/sleep/symptoms + journal ✅
7. **Postpartum Plan** - Full plan with 10+ sections ✅
8. **My Team Screen** - Provider management ✅
9. **Home Dashboard** - 4 quick action cards ✅

## Test Reports
- `/app/test_reports/iteration_5.json` - Latest comprehensive tests
- Backend: 100% (21/21 tests passed)

## Important Notes

### Email Notifications
Resend requires domain verification to send emails to external recipients. The code is complete but emails to external addresses will fail until domain is verified at resend.com/domains. In-app notifications work regardless.

### Known Limitations
- React Native Web Pressable/TouchableOpacity components don't work well with Playwright automation
- Console warnings about deprecated shadow* props (cosmetic only)

## Prioritized Backlog

### P1 (High Priority)
- Full Doula dashboard with contract management
- Full Midwife dashboard with visit logging

### P2 (Medium Priority)
- Push notifications (mobile)
- PDF export for birth plan

### P3 (Lower Priority)
- Admin content/user management
- Provider marketplace (Phase 3)

## Test Credentials
- MOM: `sharemom2_1771213474@test.com` / `password123`
- DOULA: `doula2_1771213474@test.com` / `password123`
