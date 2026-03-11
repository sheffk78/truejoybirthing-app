# True Joy Birthing - Product Requirements Document

## Original Problem Statement
Build a comprehensive birthing support application for expecting mothers, doulas, and midwives. The app allows moms to create birth plans, connect with care providers, and track their pregnancy journey. Providers can manage clients, send contracts/invoices, and provide ongoing support.

## Core Requirements
- Multi-role authentication (Mom, Doula, Midwife, Admin)
- Birth plan creation and sharing
- Provider marketplace and discovery
- Client management for providers
- Contract and invoice management
- Real-time messaging
- Contraction timer with pattern analysis
- Video content/education delivery

## User Personas
1. **Expecting Mom**: Creates birth plan, finds providers, tracks pregnancy
2. **Doula**: Manages clients, sends contracts, provides labor support
3. **Midwife**: Clinical care tracking, prenatal visits, birth records
4. **Admin**: Content management, user oversight

## Tech Stack
- **Frontend**: React Native (Expo) with TypeScript
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Styling**: Custom theming with dynamic light/dark mode support

---

## What's Been Implemented

### Theme System (Completed - March 2025)
- [x] Theme Provider with React Context API
- [x] Zustand store with AsyncStorage persistence
- [x] Light and dark color palettes
- [x] `createThemedStyles` utility for StyleSheet migration
- [x] Settings UI for theme selection (Light/Dark/System)
- [x] Full migration of all components and screens to dynamic theming
- [x] Resolved all build errors from batch migration

### Authentication & Onboarding
- [x] Email/password login and registration
- [x] Google OAuth integration (Emergent-managed)
- [x] Role-based onboarding flows
- [x] JWT token management

### Mom Features
- [x] Birth plan creation with multiple sections
- [x] Provider discovery marketplace
- [x] Team management
- [x] Contraction timer with charts
- [x] Weekly pregnancy content
- [x] Messaging with providers

### Provider Features (Doula & Midwife)
- [x] Client management dashboard
- [x] Contract creation and sending
- [x] Invoice management
- [x] Lead tracking
- [x] Birth plan viewing
- [x] Messaging with clients

### Midwife-Specific Features
- [x] Prenatal visit tracking
- [x] Labor records
- [x] Birth records
- [x] Newborn exams

### Admin Features
- [x] Content management
- [x] User management

---

## Prioritized Backlog

### P0 (Critical)
- [ ] Full regression testing of Light/Dark mode across all roles

### P1 (High Priority)
- [ ] Apple IAP integration for subscriptions
- [ ] Google Play IAP integration
- [ ] Stripe integration for web subscriptions

### P2 (Medium Priority)
- [ ] Admin panel enhancements
- [ ] Cross-platform alert utility abstraction
- [ ] Performance optimizations

### P3 (Nice to Have)
- [ ] Push notifications
- [ ] Offline support
- [ ] Analytics dashboard

---

## Key Technical Patterns

### Theme System
```typescript
// Use the createThemedStyles utility for StyleSheet objects
const getStyles = createThemedStyles((colors) => ({
  container: { backgroundColor: colors.background },
}));

// In component:
const colors = useColors();
const styles = getStyles(colors);

// For module-level constants that need colors, convert to functions:
const getStatusColors = (colors: ThemeColors) => ({
  active: colors.success,
  pending: colors.warning,
});
```

### File Structure
```
/app/frontend
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth screens
│   ├── (mom)/             # Mom screens
│   ├── (doula)/           # Doula screens
│   ├── (midwife)/         # Midwife screens
│   └── (admin)/           # Admin screens
├── src/
│   ├── components/        # Shared components
│   ├── contexts/          # React contexts (ThemeContext)
│   ├── hooks/             # Custom hooks (useThemedStyles)
│   ├── store/             # Zustand stores
│   └── theme/             # Theme definitions
```

---

## Test Credentials
- **Mom**: demo.mom@truejoybirthing.com / DemoScreenshot2024!
- **Doula**: demo.doula@truejoybirthing.com / DemoScreenshot2024!
- **Midwife**: demo.midwife@truejoybirthing.com / DemoScreenshot2024!

---

## Known Issues
- Birth Plan percentage starts at 11% by design (not a bug - sections have minimum weights)

## Third-Party Integrations
- Bunny.net: Video streaming
- Resend: Transactional emails
- Emergent-managed Google Auth

---

*Last Updated: March 11, 2025*
