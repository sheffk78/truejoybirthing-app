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

## What's Been Implemented (Last Updated: 2026-02-19)

### ✅ RECENTLY COMPLETED (2026-02-19) - Client-Centered Architecture Refactoring
- [x] **Unified Provider Routes** - `/api/provider/*` endpoints work for both DOULA and MIDWIFE roles
- [x] **Active/Inactive Client Logic** - Clients automatically marked inactive 6 weeks after due date
- [x] **Active/Inactive Filter Toggle** - Clients screen has Active/Inactive/All filter buttons
- [x] **Client Detail Hub** - Unified Client Detail screen with Timeline, Appointments, Visits (Midwife only), Notes, Messages, Contracts, Invoices, Birth Info tabs
- [x] **Unified Appointments** - `/api/provider/appointments` with client_id and provider_id linkage
- [x] **Unified Notes** - `/api/provider/notes` with client context
- [x] **Unified Visits** - `/api/provider/visits` (Midwife only) linked to appointments
- [x] **Client Timeline** - `/api/provider/clients/{client_id}/timeline` returns all activity for a client
- [x] **Unified Dashboard** - `/api/provider/dashboard` returns role-appropriate stats
- [x] **Frontend Clients Wiring** - ProviderClients now uses `/api/provider/clients` with filter toggle
- [x] **Mom Appointment Creation** - Moms can request appointments with providers from their team via modal UI
- [x] **Mom Team Providers API** - `GET /api/mom/team-providers` returns accepted providers
- [x] **Mom Appointment API** - `POST /api/mom/appointments` creates appointment request with validation

### ✅ RECENTLY COMPLETED (2026-02-19) - Profile Photo Display
- [x] **Marketplace Provider Photos** - Provider cards and modal now show profile photos when available
- [x] **Provider Clients Photos** - Pending requests show mom photos, active clients show client photos
- [x] **My Team Provider Photos** - Accepted and pending provider invitations show profile photos

### ✅ RECENTLY COMPLETED (2026-02-19) - UI Fixes
- [x] **Keyboard Overlap Fix** - Added KeyboardAvoidingView to Daily Check-in modal
- [x] **Paper Airplane Send Icon** - Messages use paper-plane icon with mapping in Icon.tsx
- [x] **Eye Icon for App Tour** - Changed from help-circle-outline to eye-outline in profile

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

### ✅ RECENTLY COMPLETED (2026-02-19) - Pre-Launch Subscription Readiness Check

#### Apple StoreKit & Google Play Billing Architecture (COMPLETED - 2026-02-19)
- [x] **Backend subscription_provider field**: All subscription records now store subscription_provider (APPLE/GOOGLE/MOCK/WEB)
- [x] **Backend auto_renewing field**: Tracks auto-renewal status for subscriptions
- [x] **Backend subscription_end_date field**: Tracks when subscriptions expire
- [x] **Validate Receipt Endpoint**: `POST /api/subscription/validate-receipt` for validating store receipts
  - Validates product IDs match provider (Apple vs Google format)
  - Apple products: `truejoy.pro.monthly`, `truejoy.pro.annual` (dot notation)
  - Google products: `truejoy_pro_monthly`, `truejoy_pro_annual` (underscore notation)
  - Returns subscription status with provider info
- [x] **Cancel Endpoint Enhanced**: Returns provider-specific management URLs
  - Apple: `https://apps.apple.com/account/subscriptions`
  - Google: `https://play.google.com/store/account/subscriptions`
- [x] **Frontend Billing Service**: `/app/frontend/app/services/billing.ts`
  - Placeholder functions for react-native-iap integration
  - `initializeBilling()`, `fetchProducts()`, `purchaseProduct()`, `restorePurchases()`
  - `validateReceipt()`, `getSubscriptionStatus()`, `openSubscriptionManagement()`
  - Platform detection and provider mapping (iOS→APPLE, Android→GOOGLE)
- [x] **Frontend Subscription Config**: `/app/frontend/app/config/subscriptionConfig.ts`
  - Product IDs for both Apple and Google stores
  - Plan details, pricing, features, trial duration (30 days)
  - Helper functions: `getAnnualSavings()`, `getStatusDisplayText()`, `getProviderDisplayName()`
- [x] **Updated subscriptionStore.ts**: Added `validateReceipt()` method and `getSubscriptionManageUrl()`
- [x] **Updated ProGate.tsx**: Uses config for trial days, added SubscriptionInfoCard component
- [x] **Updated plans-pricing.tsx**: Shows subscription management info for active subscribers
- [x] **Case-insensitive role check**: Fixed `check_role()` to handle lowercase role values
- [x] **All 28 backend tests passing** (iteration_85.json)

**Product IDs for App Store Connect & Google Play Console:**
| Platform | Monthly Product ID | Annual Product ID |
|----------|-------------------|-------------------|
| Apple    | truejoy.pro.monthly | truejoy.pro.annual |
| Google   | truejoy_pro_monthly | truejoy_pro_annual |

**Note**: In-App Purchase processing is MOCKED. The `validate-receipt` endpoint accepts any receipt without actual server validation. Ready for react-native-iap integration.

#### react-native-iap Integration (COMPLETED - 2026-02-19)
- [x] **Installed react-native-iap v14.7.12** for native in-app purchases
- [x] **Updated billing.ts** with actual IAP functions using react-native-iap:
  - `initConnection()` for store initialization
  - `getSubscriptions()` for fetching product info
  - `requestSubscription()` for purchase flow
  - `getAvailablePurchases()` for restore purchases
  - `purchaseUpdatedListener` and `purchaseErrorListener` for handling transactions
- [x] **Created useIAPSubscription hook** (`/app/frontend/app/hooks/useIAPSubscription.ts`)
- [x] **Updated plans-pricing.tsx** with IAP hook and "Restore Purchases" button
- [x] **Updated app.json** with iOS/Android bundle IDs and IAP plugin
- [x] **Created IAP Setup Guide** (`/app/frontend/IAP_SETUP_GUIDE.md`)

### ✅ RECENTLY COMPLETED (2026-02-19) - Demo Data & Screenshot System

#### Demo Data Seed System (COMPLETED - 2026-02-19)
- [x] **Created `/app/backend/seed_demo_data.py`** - Comprehensive demo data seeding script
- [x] **Demo Accounts Created**:
  - Demo Doula: `demo.doula@truejoybirthing.com` / `DemoScreenshot2024!` (Sarah Mitchell)
  - Demo Midwife: `demo.midwife@truejoybirthing.com` / `DemoScreenshot2024!` (Emily Thompson)
  - Demo Mom: `demo.mom@truejoybirthing.com` / `DemoScreenshot2024!` (Emma Johnson)
- [x] **Demo Data Includes**:
  - 4 Doulas + 3 Midwives with full profiles
  - 8 Moms with varied due dates and birth settings
  - Client relationships (Doula has 4 clients, Midwife has 3)
  - Message conversations between providers and clients
  - Invoices (Paid, Sent, Draft statuses)
  - Signed service agreement/contract
  - Complete birth plan (100% for Emma Johnson)
  - Prenatal visit notes
- [x] **DiceBear Avatars** - CC0 licensed, legally safe for App Store screenshots
- [x] **Created `/app/SCREENSHOT_GUIDE.md`** - Comprehensive guide including:
  - Device resolution specifications for iOS and Android
  - 12 screenshot checklist with navigation instructions
  - Step-by-step capture process for simulators and devices
  - Asset organization structure
  - Re-capture instructions for future updates

**Usage**: `cd /app/backend && source .env && python seed_demo_data.py --reset`

### ✅ RECENTLY COMPLETED (2026-02-19) - Navigation Restructuring

#### Client-First Navigation Pattern (COMPLETED - 2026-02-19)
- [x] **Simplified Bottom Navigation**: Reduced to 4 tabs for both Doula and Midwife
  - Home, Clients, Messages, Profile
  - Tools (Notes, Contracts, Invoices, Appointments) hidden via `href: null`
- [x] **Dashboard Quick Actions**: Simplified to 2 items
  - "See Clients" and "Appointments" only
  - Removed direct links to Contracts, Invoices, Notes
- [x] **Client-Scoped Tool Access**:
  - Clients → Client Detail → Notes/Contracts/Invoices/Appointments
  - Back navigation returns to Client Detail, not Home
- [x] **ProviderNotes Back Navigation**: Shows back button when accessed with `clientId` parameter
- [x] **Testing**: Frontend testing confirmed 7/7 features working (iteration_96)

#### Navigation Structure:
```
Bottom Tabs (visible):
  - Home (dashboard)
  - Clients (client list → client detail hub)
  - Messages (conversations)
  - Profile (settings)

Hidden but accessible via navigation:
  - client-detail?clientId=...&clientName=...
  - notes?clientId=...&clientName=...
  - contracts?clientId=...&clientName=...
  - invoices?clientId=...&clientName=...
  - appointments
  - visits (midwife only)
  - birth-summaries (midwife only)
  - contract-templates
```

#### Contracts Screen Consolidation (COMPLETED - 2026-02-19)
- [x] **ProviderContracts.tsx** - Created shared contracts component (1156 lines)
- [x] **contractsConfig.ts** - Created contracts config with role-specific sections and defaults (258 lines)
- [x] **Thin Wrappers** - Both contracts screens reduced to 8 lines each
  - `(doula)/contracts.tsx` - 8 lines (was 1514)
  - `(midwife)/contracts.tsx` - 8 lines (was 1523)
- [x] **Line Reduction**: 3037 → 1430 lines (53% reduction)
- [x] **Bug Fixed**: Testing agent fixed endpoint paths from hyphenated to slash format

#### Client-Centric Messaging (COMPLETED - 2026-02-19)
- [x] **Message Model** - Added optional `client_id` field to link messages to specific client relationships
- [x] **Auto Client-ID Resolution** - When provider sends message to mom (or vice versa), `client_id` is auto-populated from clients collection
- [x] **New Endpoint** - `GET /api/provider/clients/{client_id}/messages` returns all messages for a specific client
- [x] **Permission Fix** - `check_provider_can_message` now checks both `share_requests` AND `clients` collection for linked relationships
- [x] **Contracts Config** - Created `/app/frontend/src/components/provider/config/contractsConfig.ts` with role-specific contract sections and defaults (prep for future consolidation)

#### Dead Code Cleanup & Provider Component Consolidation (COMPLETED - 2026-02-19)
- [x] **ProviderNotes.tsx** - Shared notes component for both Doula and Midwife
- [x] **ProviderAppointments.tsx** - Shared appointments component with config-based filter tabs
  - Doula: No filter tabs (shows all appointments)
  - Midwife: Shows filter tabs (All, Prenatal, Postpartum)
- [x] **Thin Wrappers** - Both role screens reduced to ~8 lines each
  - `(doula)/notes.tsx` - 8 lines
  - `(midwife)/notes.tsx` - 8 lines
  - `(doula)/appointments.tsx` - 8 lines
  - `(midwife)/appointments.tsx` - 8 lines (reduced from 943 lines!)
- [x] **Backend Route Conflict Fixed** - Renamed `/provider/notes/{id}` to `/provider/birth-plan-notes/{id}` for birth plan section notes to avoid conflict with unified notes delete endpoint
- [x] **Deleted Old Files** - Removed `/app/frontend/src/components/ProviderAppointments.tsx` (replaced by `/app/frontend/src/components/provider/ProviderAppointments.tsx`)

#### Shared Provider Component Architecture (COMPLETED - 2026-02-19)
- [x] Created unified `ProviderDashboard` component used by both Doula and Midwife
- [x] Created unified `ProviderMessages` component used by both Doula and Midwife
- [x] Created unified `ProviderInvoices` component used by both Doula and Midwife
- [x] Created unified `ProviderClients` component used by both Doula and Midwife
- [x] Created unified `ProviderProfile` component used by both Doula and Midwife
- [x] Implemented `ProviderConfig` system for role-specific configuration
- [x] Thin wrapper pattern: role screens pass config to shared components (7 lines each)
- [x] **Line reduction**: ~53% (6,765 → 3,180 lines) for all 5 provider screens
- [x] Architecture documentation in `/app/frontend/src/components/provider/ARCHITECTURE.md`

#### Midwife Client Navigation Bug Fix (COMPLETED - 2026-02-19)
- [x] Fixed navigation from Midwife client list to client-detail page
- [x] Root cause: Backend queries using `provider_id` instead of `pro_user_id`
- [x] Fixed in server.py lines 5638, 5665, 5669

### ✅ RECENTLY COMPLETED (2026-02-19) - Features
- [x] **Doula Clients Rework** - Removed manual "Add Client" button, now shows only Moms who connected via Marketplace
  - Pending Requests section with Accept/Decline buttons
  - Shows Mom's name, due date, and birth plan availability
- [x] **Doula Profile Enhancements**:
  - Photo upload via camera/library (expo-image-picker)
  - Video Introduction: YouTube URL field with thumbnail preview
  - More About Me: Long text field with 800 character limit
- [x] **Doula Messages '+' Icon** - Added '+' button in top right to start new conversation
- [x] **Doula Dashboard Avatar** - Profile icon now shows actual profile photo, links to profile page
- [x] **Invoice Mark as Paid** - Backend now marks invoice notifications as resolved for Mom and sends "Payment Received" confirmation
- [x] **Marketplace Video/Bio Display** - Provider profiles in Marketplace now show Video Introduction and More About Me

### ✅ RECENTLY COMPLETED (2026-02-18)
- [x] **Critical Bug Fix: PDF Download** - Fixed token variable being undefined (was using non-existent `token` property, now correctly uses `sessionToken` from authStore)
- [x] **KeyboardAvoidingView Improvement** - Updated Birth Plan modal to use better keyboard offset settings for iOS
- [x] **Marketplace Contact & Add to Team Buttons** - Added two action buttons for each provider:
  - **Contact**: Opens messages with a pre-filled intro message (or existing conversation)
  - **Add to Team**: Sends a share request to add provider to Mom's team (shares birth plan)
  - Buttons appear on both provider cards and in the provider profile modal
  - Status tracking: "Add to Team" → "Pending" → "On Team"
  - Backend integration with `/api/birth-plan/share` endpoint

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
- [x] **Duplicate Contract Feature** (ADDED 2026-02-17):
  - Allows Doulas and Midwives to quickly create new contracts from existing ones
  - New endpoints: `POST /api/doula/contracts/{id}/duplicate` and `POST /api/midwife/contracts/{id}/duplicate`
  - Duplicated contracts preserve: all fee settings, service descriptions, on-call windows, and custom terms
  - Duplicated contracts reset: status to "Draft", all signatures cleared, client_id set to null
  - Client name prefixed with "[Copy of...]" to indicate duplication
  - "Duplicate" button added to contract cards in both Doula and Midwife contract pages
  - Users must select a new client after duplication before sending
  - **All 17 tests passing** (iteration_22.json)
- [x] **Quick Edit Feature** (ADDED 2026-02-17):
  - Edit key contract fields directly from the preview modal without going through all 7 steps
  - Available only for Draft contracts (not shown for Signed or Sent)
  - **Midwife Quick Edit Fields**: Client name, Partner/Support person, Due date, Birth location, Total fee, Retainer, Balance due by, On-call window, Special arrangements
  - **Doula Quick Edit Fields**: Client name, Due date, Total fee, Retainer, Final payment due, Prenatal visits, On-call window, Postpartum visits, Special arrangements
  - **Auto-Calculation**: Remaining balance auto-updates when fee or retainer changes
  - **Cancel/Save Actions**: Cancel returns to preview mode without saving; Save updates contract via PUT API
  - Accessible via "Quick Edit" button at bottom of Contract Preview modal
  - **All tests passing** (iteration_23.json)
- [x] **Simple Invoicing + Payment Instructions** (ADDED 2026-02-17):
  - **Payment Instructions Templates**:
    - Create/edit/delete reusable payment instruction templates
    - Set default template that auto-fills new invoices
    - Fields: Label, Instructions Text, Is Default
    - Shared endpoint: `/api/payment-instructions` (for both Doula & Midwife)
  - **Invoice Management** (for Doulas & Midwives):
    - Create invoices with: Client, Description, Amount, Issue Date, Due Date, Payment Instructions, Notes
    - Auto-generated invoice numbers: TJ-YYYY-NNN format
    - Status filters: All, Draft, Sent, Paid, Cancelled
    - Status flow: Draft → Sent → Paid (or Draft → Cancelled)
    - Only Draft invoices can be deleted
    - Sending invoice triggers email + in-app notification to client
  - **Client (Mom) Invoice View**:
    - Moms see invoices from their Doula/Midwife providers
    - Draft invoices NOT visible to clients (privacy protection)
    - Clear payment instructions display
    - Disclaimer: "Payments are made directly to your provider. True Joy Birthing does not process payments."
  - **Backend APIs**:
    - `POST/GET/PUT/DELETE /api/payment-instructions`
    - `POST/GET/PUT/DELETE /api/doula/invoices` + `/send`, `/mark-paid`, `/cancel`, `/send-reminder`
    - `POST/GET/PUT/DELETE /api/midwife/invoices` + `/send`, `/mark-paid`, `/cancel`, `/send-reminder`
    - `GET /api/mom/invoices`
  - **Frontend**: `(doula)/invoices.tsx`, `(midwife)/invoices.tsx`, `(mom)/invoices.tsx`
  - **Auto-link Mom Feature**: When provider creates client with a Mom's email, linked_mom_id is automatically set
  - **All 21 backend tests passing** (iteration_25.json)
- [x] **Invoice Payment Reminder Feature** (ADDED 2026-02-17):
  - Providers can send payment reminders for Sent invoices
  - Reminder sends email notification + in-app notification to client
  - Shows days overdue if invoice is past due date
  - Tracks `last_reminder_sent` timestamp on invoice
  - "Remind" button added to invoice cards for Sent status
  - Backend endpoints: `POST /api/doula/invoices/{id}/send-reminder`, `POST /api/midwife/invoices/{id}/send-reminder`
- [x] **Subscription System (Pro Plan + Free Moms + 30-Day Trial)** (ADDED 2026-02-17):
  - **Pricing Model**:
    - MOMs: Always FREE - no subscription needed
    - Doulas & Midwives: True Joy Pro - $29/month or $276/year (save $72)
    - 30-day free trial for all PRO users
  - **Backend APIs**:
    - `GET /api/subscription/pricing` - Public pricing info with features
    - `GET /api/subscription/status` - User's subscription status
    - `POST /api/subscription/start-trial` - Start 30-day free trial
    - `POST /api/subscription/activate` - Activate paid subscription (MOCK)
    - `POST /api/subscription/cancel` - Cancel subscription
  - **Frontend**:
    - `/plans-pricing` - Plans & Pricing page with MOMs free section and PRO plans
    - Subscription card in Doula/Midwife profile pages
    - Shows trial status with days remaining
    - Upgrade prompts for non-subscribed PRO users
  - **State Management**: `subscriptionStore.ts` with Zustand
  - **ProGate Component**: `src/components/ProGate.tsx` for gating PRO features
  - **Note**: In-App Purchases (StoreKit/Google Play) are MOCKED for testing
  - **All tests passing** (iteration_26.json: 15/15 backend tests, 100% frontend)
- [x] **Pro Feedback Form** (ADDED 2026-02-17):
  - **Who can use**: Only active Pro users (Doulas/Midwives with trial or subscription)
  - **Location**: Profile → "Send Feedback" menu item (only visible with Pro access)
  - **Form Features**:
    - Description explaining purpose
    - Multi-line feedback text (500-800 character limit)
    - Optional topic dropdown: Bug, Feature request, General comment
    - Pre-fills user info (name, email, role)
  - **On Submit**: 
    - Sends email to shelbi@truejoybirthing.com with formatted details
    - Stores feedback in `pro_feedback` collection for records
    - Shows success confirmation
  - **Validations**: Required text, character limit, Pro access check
  - **Backend API**: `POST /api/pro/feedback`
  - **Frontend**: `/pro-feedback` page accessible from Doula/Midwife profiles
- [x] **Doula Contract Delete Endpoint** (ADDED 2026-02-17):
  - New endpoint: `DELETE /api/doula/contracts/{id}` for deleting Draft contracts
  - Delete button now functional on Doula contract cards
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
- [x] **Midwifery Services Agreement - Complete Overhaul** (UPDATED 2026-02-17):
  - **7-Section Multi-Step Contract Form** (matching Doula contract system):
    1. Parties & Basic Details: Client name, Partner/Support person, Estimated Due Date
    2. Place of Birth & Scope: Planned birth location, Services description (with defaults)
    3. Fees & Payment: Total fee, Retainer, Remaining balance (auto-calc), Fee coverage, Refund policy
    4. Transfer & Withdrawal: Transfer indications, Client refusal notes, Midwife withdrawal reasons, No-refund scenarios
    5. On-Call & Backup: On-call window (e.g., 37-42 weeks), Backup midwife policy
    6. Communication & Emergencies: Routine contact, Urgent contact, Emergency instructions
    7. Special Arrangements: Addendum for any additional terms
  - **Full CRUD Operations**: Create, Read, Update, Delete (Draft contracts only)
  - **Digital Signatures**: Midwife signs when sending, Client (and Partner if applicable) signs via public link
  - **PDF Generation**: Professional PDF with all contract details and signatures
  - **Email Delivery**: Signed contracts automatically emailed to all parties
  - **Contract Text Generation**: Full legal agreement text generated from template with user inputs
  - **Backend APIs**: 12 endpoints for complete workflow
    - GET/POST `/api/midwife/contracts` - List/Create
    - GET/PUT/DELETE `/api/midwife/contracts/{id}` - Read/Update/Delete
    - POST `/api/midwife/contracts/{id}/send` - Send to client
    - GET `/api/midwife-contracts/{id}` - Public view
    - GET `/api/midwife-contracts/{id}/html` - HTML view
    - GET `/api/midwife-contracts/{id}/pdf` - PDF download
    - POST `/api/midwife-contracts/{id}/sign` - Client signs
  - **Frontend UI**: `(midwife)/contracts.tsx` with multi-step modal form, `sign-midwife-contract.tsx`
  - **All E2E tests passing** (iteration_21.json: 13/13 backend tests, full frontend verification)
- [x] **Contract Templates Feature** (ADDED 2026-02-17):
  - **Purpose**: Allow Doulas and Midwives to create, manage, and reuse contract templates for faster contract creation
  - **Backend APIs**:
    - `GET /api/contract-templates` - Get all templates for current provider
    - `POST /api/contract-templates` - Create a new template
    - `PUT /api/contract-templates/{template_id}` - Update a template
    - `DELETE /api/contract-templates/{template_id}` - Delete a template
    - `POST /api/contract-templates/{template_id}/set-default` - Set as default template
  - **Template Data**: Stores all contract form fields (fees, services, terms, etc.) for quick reuse
  - **Frontend Pages**:
    - `(doula)/contract-templates.tsx` - Full CRUD for Doula templates
    - `(midwife)/contract-templates.tsx` - Full CRUD for Midwife templates
  - **Templates Button**: Added to Contracts page header for both roles
  - **Create from Template**: When creating new contract, users can select a template to pre-fill form fields
  - **Default Template**: Auto-applied when opening New Contract modal if set
  - **All tests passing** (iteration_27.json: 100% backend - 16 tests, iteration_28.json: 100% frontend verification)
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
- [x] **9 Doula/Messaging Fixes** (COMPLETED 2026-02-18):
  - **Fix 1: Doula Client Acceptance** - Accepting a share request now automatically creates a client entry in doula/midwife's client list
  - **Fix 2: Paid Invoices Filter** - Paid invoices no longer appear in Mom's pending invoices section
  - **Fix 3: Invoice Client Picker** - Fixed client selector using grid layout (flexWrap) instead of broken horizontal scroll
  - **Fix 4a: Service Agreement** - Removed duplicate "Final Payment Due" field
  - **Fix 4b: Create Contract** - Fixed Create Contract button (payload field name mismatch)
  - **Fix 6a: Active Clients Section** - Doula clients page shows "Active Clients" section
  - **Fix 6b: Past Clients Section** - Doula clients page shows "Past Clients" section for completed clients
  - **Fix 6c: Dashboard Button** - Changed "Add Client" to "See Clients" on doula dashboard
  - **Fix 8: Paper-plane Icon** - Send button in messages now uses paper-plane icon
  - **Fix 9: Real-time Messages** - Added WebSocket support for real-time messaging (`/ws/messages/{token}`)
- [x] **7 UI/UX Improvements** (COMPLETED 2026-02-18):
  - **Fix 1: Profile Photo in Header** - Mom's profile photo now shows in top-right avatar on home page
  - **Fix 3: Native Date Picker** - Profile page uses native HTML date input for web instead of text field
  - **Fix 4: Birth Plan to Profile Sync** - Due date and birth setting automatically sync to profile when "About Me" section is saved
  - **Fix 5: Remove My Team from Profile** - My Team section removed from Mom's Profile page (view team via My Team tab)
  - **Fix 6: Provider Photos in Team** - Provider profile photos display in My Team list (shows default icon if no photo)
  - **Fix 7a: Remove Share Card** - "Share Your Birth Plan" card removed from Mom Home page
  - **Fix 7b: Shared With Display** - Birth Plan page shows "Shared with: [providers]" for accepted connections
  - **Fix 7c: View Birth Plan Button** - Doula/Midwife clients page has "View Birth Plan" button for linked moms
- [x] **3 User-Requested Fixes** (COMPLETED 2026-02-18):
  - **Contact Provider**: Fixed marketplace flow - opens messages with pre-filled intro message for connected providers, shows helpful alert for unconnected providers
  - **Auto-share Birth Plan**: UI notice added to birth plan page informing moms that their plan is automatically shared with team members on save
  - **Invoices in Messages**: Fixed invoice rendering on Mom's Messages page - now shows pending invoices with amount, description, status, due date, provider name, and payment disclaimer
- [x] **7 Dashboard & UX Improvements** (COMPLETED 2026-02-18):
  - **Fix 1: Doula Dashboard Upcoming Appts** - Dashboard shows "Upcoming Appts" counter instead of "Total Clients"
  - **Fix 2: Midwife Dashboard Upcoming Appts** - Dashboard shows "Upcoming Appts" counter instead of "Total Clients"
  - **Fix 3: Birth Plan PDF Download** - Providers can download client's birth plan as PDF from View Birth Plan page
  - **Fix 4: Midwife Appointment Tabs** - Appointments page has "All", "Prenatal", "Postpartum" filter tabs
  - **Fix 5: Doula Zip Code Profile** - Profile edit form uses zip code lookup to auto-fill city/state
  - **Fix 6: Keyboard Overlap Fix** - KeyboardAvoidingView added to modal forms (Client Notes)
  - **Fix 7: Client Notes Grid Layout** - Client selector uses grid layout instead of horizontal scroll
- [x] **10 Mom Section UI/UX Fixes** (COMPLETED 2026-02-18):
  - **Fix 1: Home Appointments Icon** - Changed to calendar icon
  - **Fix 2: Home Quick Actions** - Replaced "Postpartum" with "Birth Plan" (document icon)
  - **Fix 3: Birth Plan Preview Print** - Direct print without extra dialog
  - **Fix 4: Timeline Button Text** - Changed to "Add Appointment" (removed "/Event")
  - **Fix 5: Timeline Date Picker** - Modal uses native date picker for web
  - **Fix 6: Timeline Keyboard Fix** - Added KeyboardAvoidingView to modal
  - **Fix 7: My Team Marketplace Button** - Changed to purple (COLORS.primary)
  - **Fix 8: Marketplace Search** - Multi-field search (name, city, state, zip) with updated placeholder
  - **Fix 9: Profile Postpartum Removed** - Removed "Postpartum Plan" button from Profile
  - **Fix 10: Date Pickers** - Due Date in Profile and Birth Plan now use native date pickers
  - **Fix 11: Profile Zip Code** - Fixed to clear city/state when changing zip code

### ✅ RECENTLY COMPLETED (2026-02-19) - Midwife Prenatal Visit Assessment
- [x] **Backend CRUD API** - GET/POST/PUT/DELETE endpoints for prenatal visits attached to clients
- [x] **Vitals & Measurements** - Urinalysis, Blood Pressure, FHR, Fundal Height, Weight (lbs/kg)
- [x] **Well-being Check-in** - 6 categories (eating, water, emotional, physical, mental, spiritual) with 1-5 scale + notes
- [x] **Auto-generated Summary** - "BP 118/72, FHR 145, FH 28 cm, Wt 152 lbs" format for list view
- [x] **Client Detail Page** - New page with prenatal visits section, add/edit/view/delete modals
- [x] **Date Picker** - HTML5 date picker on web, default to today

### ✅ RECENTLY COMPLETED (2026-02-19) - Midwife Contract Functionality
- [x] **Midwife Contract Defaults** - GET/PUT endpoints for saving contract text defaults
- [x] **Save as Default Feature** - Contracts auto-save text settings as defaults for future contracts  
- [x] **Double JSON.stringify Bug Fix** - Fixed in contracts.tsx and invoices.tsx
- [x] **Backend Query Fixes** - Fixed provider_id/provider_type to use pro_user_id/pro_type consistently
- [x] **Midwifery-specific Fields** - 16 contract fields: scope_description, transfer_indications, backup_midwife_policy, etc.

### ✅ RECENTLY COMPLETED (2026-02-19) - Midwife Section Parity with Doula
- [x] **Midwife Profile** - Added photo upload, video intro URL, more about me, accepting clients toggle
- [x] **Midwife Clients Page** - Reworked to show pending requests + active clients (same as Doula)
- [x] **Midwife Messages** - Added + icon button for new messages
- [x] **Midwife Dashboard Stats** - Fixed to use `pro_user_id` and added `active_clients` field
- [x] **Backend Fixes** - Updated MidwifeProfileUpdate model with new fields, fixed client queries

### ✅ RECENTLY COMPLETED (2026-02-19) - Contract "Save as Default" Feature
- [x] **GET /api/doula/contract-defaults** - Returns saved contract text defaults
- [x] **PUT /api/doula/contract-defaults** - Saves contract text as new defaults (upsert)
- [x] **Auto-load defaults** - When opening "New Contract" modal, form pre-fills with saved defaults
- [x] **Auto-save on contract creation** - After creating a contract, all text fields are saved as new defaults
- [x] **Success message updated** - User sees "Your text and settings have been saved as defaults for future contracts"

### ✅ RECENTLY COMPLETED (2026-02-19) - Form Usability Improvements
- [x] **Calendar Date Pickers** - Invoice form now has HTML5 date pickers for Issue Date and Due Date
- [x] **Contract Quick Edit Date Picker** - Quick Edit modal has calendar picker for Due Date
- [x] **Active Clients Only Dropdown** - Invoice client dropdown filters to show only active clients (with linked_mom_id)
- [x] **Auto-fill Due Date** - When client is selected, due date auto-fills from client's EDD if available

### ✅ RECENTLY COMPLETED (2026-02-19) - Bug Fixes
- [x] **Double JSON.stringify Bug Fix** - Fixed contracts.tsx (saveQuickEdit) and invoices.tsx (handleSaveInvoice, handleSaveTemplate) where body was being double-stringified. The apiRequest utility already does JSON.stringify, so passing pre-stringified body was causing 422 errors.
- [x] **Contract Creation Fix** - Contracts can now be created without 422 errors
- [x] **Invoice Creation Fix** - Invoices can now be created and updated without errors
- [x] **Contract Quick Edit Fix** - Quick edit mode now correctly saves contract updates
- [x] **Dashboard Stats Verification** - Confirmed backend correctly returns active client counts using `pro_user_id` field
- [x] **Midwife Client Detail Navigation Fix** (2026-02-19) - Fixed critical bug where clicking a client in Midwife's client list was returning 404 "Client not found". Root cause: Backend queries in GET/PUT `/api/midwife/clients/{client_id}` were using `provider_id` instead of `pro_user_id`. Fixed in server.py lines 5638, 5665, 5669.

### ✅ RECENTLY COMPLETED (2026-02-19) - UI Fixes (3 User-Requested)
- [x] **Keyboard Overlap Fix** - Added `KeyboardAvoidingView` wrapper to Daily Check-in modal in wellness.tsx with proper iOS/Android behavior
- [x] **Paper Airplane Send Icon** - Messages already used `paper-plane` icon; added missing mapping in Icon.tsx (maps to Lucide `Send` icon)
- [x] **Eye Icon for App Tour** - Changed "View App Tour" menu item icon from `help-circle-outline` to `eye-outline` in profile.tsx

### ✅ RECENTLY COMPLETED (2026-02-19) - Profile Photo Display
- [x] **Marketplace Provider Photos** - Provider cards and modal now show profile photos when available, with icon fallback
- [x] **Provider Clients Photos** - Pending requests show mom photos, active clients show client photos
- [x] **My Team Provider Photos** - Accepted and pending provider invitations show profile photos

### 📊 Test Reports
- `/app/test_reports/iteration_91.json` - **Visit Auto-Appointment & Filtering VERIFIED** (Backend: 100% - 15/15 tests)
- `/app/test_reports/iteration_90.json` - **Frontend Wiring & Mom Appointments VERIFIED** (Backend: 100% - 10/10 tests)
- `/app/test_reports/iteration_89.json` - **Client-Centered Architecture VERIFIED** (Backend: 100% - 17/17 tests)
- `/app/test_reports/iteration_88.json` - **Profile Photo Display VERIFIED** (100%)
- `/app/test_reports/iteration_87.json` - **UI Fixes VERIFIED** (eye-outline icon, KeyboardAvoidingView, paper-plane icon)
- `/app/test_reports/iteration_79.json` - **Midwife Client Detail Navigation Bug FIXED** (Root cause: provider_id vs pro_user_id field mismatch in backend queries)
- `/app/test_reports/iteration_78.json` - **Prenatal Visit Assessment VERIFIED** (100% - 20/20 pytest tests passed for all CRUD endpoints + summary generation + well-being scores)
- `/app/test_reports/iteration_77.json` - **Midwife Contract Functionality VERIFIED** (100% - 14/14 tests passed, 3 backend bugs found & fixed)
- `/app/test_reports/iteration_76.json` - **Midwife Section Parity VERIFIED** (100% backend - 19/19 pytest tests passed, frontend code review verified)
- `/app/test_reports/iteration_75.json` - **Contract "Save as Default" VERIFIED** (100% - 7/7 pytest tests passed, backend + frontend code review)
- `/app/test_reports/iteration_74.json` - **Form Usability Improvements VERIFIED** (100% frontend - All 4 features working: date pickers, client dropdown, auto-fill)
- `/app/test_reports/iteration_73.json` - **Doula Bug Fixes VERIFIED** (100% backend - 11/11 tests passed for dashboard stats, contract creation, invoice creation, contract quick edit)
- `/app/test_reports/iteration_69.json` - **10 Mom Section UI/UX Fixes VERIFIED** (100% backend, 100% code review)
- `/app/test_reports/iteration_68.json` - **7 Dashboard & UX Improvements VERIFIED** (100% pass - appointments, dashboard counters, PDF, zip code, keyboard)
- `/app/test_reports/iteration_35.json` - **9 Doula/Messaging Fixes VERIFIED** (100% pass - client acceptance, invoices, contracts, clients list, WebSocket)
- `/app/test_reports/iteration_34.json` - **7 UI/UX Fixes from Doc** (Backend 100%, Frontend 71% verified - some caching issues during testing)
- `/app/test_reports/iteration_33.json` - **3 User-Requested Fixes VERIFIED** (100% pass - Contact Provider, Auto-share Birth Plan, Invoices in Messages)
- `/app/test_reports/iteration_32.json` - **Initial testing of 3 fixes** (identified invoice rendering bug)
- `/app/test_reports/iteration_28.json` - **Contract Templates Bug Fix** (100% frontend verification - template selection working)
- `/app/test_reports/iteration_27.json` - **Contract Templates Feature** (100% backend - 16 tests, frontend partial)
- `/app/test_reports/iteration_26.json` - **Subscription System** (100% backend - 15 tests, 100% frontend verification)
- `/app/test_reports/iteration_25.json` - **Invoice Auto-link & Reminder Feature** (100% backend - 21 tests)
- `/app/test_reports/iteration_24.json` - **Invoice & Payment Instructions Feature** (100% backend - 21 tests, 80% frontend)
- `/app/test_reports/iteration_23.json` - **Quick Edit Feature** (100% pass rate, frontend + backend verification)
- `/app/test_reports/iteration_22.json` - **Duplicate Contract Feature** (100% pass rate, 17 backend tests + frontend UI verification)
- `/app/test_reports/iteration_21.json` - **Midwife Contract System E2E** (100% pass rate, 13 backend tests + full frontend verification)
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

### Messages (UPDATED - Client-Centric)
- GET `/api/messages/conversations` - Get all conversations
- GET `/api/messages/{user_id}` - Get messages with a user
- POST `/api/messages` - Send a message (now auto-populates `client_id`)
- GET `/api/messages/unread/count` - Get unread count
- GET `/api/provider/clients/{client_id}/messages` - **NEW**: Get messages for a specific client (client-scoped)

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

## Code Smell Analysis (2026-02-19)

### Fixed Code Smells

1. **Contracts Screen Duplication** ✅ FIXED
   - Before: ~3037 lines duplicated between Doula and Midwife
   - After: 1430 lines total (53% reduction)
   - Solution: Created shared `ProviderContracts.tsx` with `contractsConfig.ts`

2. **Contract Templates Duplication** ✅ FIXED
   - Before: ~1125 lines duplicated between Doula and Midwife
   - After: ~740 lines total (35% reduction)
   - Solution: Created shared `ProviderContractTemplates.tsx`

3. **Message Model Not Client-Centric** ✅ FIXED
   - Added `client_id` field to Message model
   - Auto-populated when sending messages between provider and mom
   - New endpoint: `GET /api/provider/clients/{client_id}/messages`

4. **Provider Messaging Permissions** ✅ FIXED
   - Updated `check_provider_can_message` to check both `share_requests` AND `clients` collections
   - Linked clients can now message without requiring a share_request record

5. **Field Naming Inconsistency** ✅ FIXED (2026-02-19)
   - Standardized `pro_user_id` → `provider_id` (70 occurrences)
   - Standardized `pro_type` → `provider_type` (33 occurrences)
   - Migration script: `/app/backend/migrations/standardize_provider_id.py`
   - All 15 backend tests passed after migration

6. **Unused Components** ✅ FIXED
   - Deleted `/app/frontend/src/components/ProGate.tsx` (was never used)

7. **Dead Code in client_utils.py** ✅ FIXED
   - Updated `get_active_clients_query()` to use `provider_id`
   - Updated `build_provider_query()` to use `provider_id` consistently
   - Updated helper function docstrings to reflect new standard

### Documented Architecture Decisions

1. **Midwife client-detail.tsx (1112 lines) - Kept Separate**
   - This is a SPECIALIZED prenatal visit form with clinical data (vitals, urinalysis, wellness scores)
   - Different purpose from the shared ProviderClientDetail hub component
   - Documented with comment block explaining the architectural decision
   - The shared ProviderClientDetail is for general client hub/overview, this is for clinical documentation

### Remaining Technical Debt (P3 - Low Priority)

1. **Monolithic server.py**: 7,888 lines - should be split into modular routers
   - Suggested modules: auth, users, clients, appointments, contracts, invoices, messages, admin

2. **Large Shared Components**: Some shared components are still large but functional
   - ProviderAppointments.tsx: 950 lines
   - ProviderInvoices.tsx: 799 lines
   - ProviderContracts.tsx: 1156 lines
   - Could be broken down further but not blocking

3. **Midwife-specific screens** (not duplicates, unique features):
   - visits.tsx: 584 lines (clinical visit tracking)
   - birth-summaries.tsx: 693 lines (midwife-only feature)
   - client-detail.tsx: 1127 lines (prenatal visit form)
   - ProviderInvoices.tsx: 799 lines
   - Could be broken down into smaller sub-components

**P3 - Low Priority:**
6. **ProGate.tsx**: Defined but never used (subscription gating component)
7. **BirthPlanForms.tsx**: 1,248 lines - complex but serves single purpose

### Already Fixed:
- ✅ Dead code cleanup (appointments screens consolidated)
- ✅ Duplicate route conflict for `/provider/notes/{id}`
- ✅ Message model now has `client_id` for client-centric queries
- ✅ Permission check updated to allow linked client messaging

## Files of Reference
- `backend/server.py` - Main backend file
- `frontend/app/(mom)/messages.tsx` - MOM messaging
- `frontend/app/(doula)/messages.tsx` - DOULA messaging
- `frontend/app/(midwife)/messages.tsx` - MIDWIFE messaging
- `frontend/app/sign-contract.tsx` - Contract signing page
- `frontend/app/(mom)/marketplace.tsx` - Provider marketplace

## Future Enhancements (Backlog)
- Push notifications (deferred per user request)
- Stripe integration for subscription payment processing
- Admin Panel enhancements
- File attachments in messages
- Provider scheduling/availability
- Backend refactoring (split server.py into modular routers)
