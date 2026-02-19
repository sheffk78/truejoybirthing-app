# Doula/Midwife Shared Component Architecture

## Overview
This document describes the shared component architecture used for both Doula and Midwife provider experiences in True Joy Birthing.

## Architecture

### Directory Structure
```
frontend/src/components/provider/
├── index.ts                      # Main exports
├── ProviderDashboard.tsx         # Shared dashboard component (423 lines)
├── ProviderMessages.tsx          # Shared messages component (500 lines)
├── ProviderInvoices.tsx          # Shared invoices component (799 lines)
├── config/
│   └── providerConfig.ts         # Role-specific configuration (191 lines)
└── types/
    └── provider.ts               # Shared TypeScript interfaces (101 lines)
```

### Configuration-Based Approach
Instead of duplicating code, we use a configuration object (`ProviderConfig`) that defines:
- Role name and labels
- Primary color
- API endpoints
- Navigation routes
- Dashboard stats and quick actions with color keys
- Profile field configurations
- Tip card content

### Thin Wrapper Pattern
Each role's screen file is now a thin wrapper that passes the appropriate config:

```tsx
// (doula)/dashboard.tsx - 7 lines
import { ProviderDashboard, DOULA_CONFIG } from '../../src/components/provider';
export default function DoulaDashboardScreen() {
  return <ProviderDashboard config={DOULA_CONFIG} />;
}
```

## What's Shared

### ProviderDashboard
- Header with greeting and profile avatar
- Stats grid (configurable via `statsCards` with `colorKey`)
- Connection requests from Moms
- Quick actions grid (configurable via `quickActions` with routes and icons)
- Role-specific tip card (configurable via `tipTitle` and `tipText`)

### ProviderMessages
- Conversation list with real-time updates
- Chat modal with message input
- Role-based coloring (Doula: lavender, Midwife: green)
- Unread message indicators
- Empty state handling

### ProviderInvoices
- Invoice CRUD operations
- Payment template management
- Status filters (All, Draft, Sent, Paid, Cancelled)
- Client selection with active client filtering
- Modal forms with proper validation

## Intentional Differences

| Feature | Doula | Midwife |
|---------|-------|---------|
| Primary Color | #9F83B6 (lavender) | #8CAF8C (green) |
| API Endpoints | /api/doula/* | /api/midwife/* |
| Dashboard Stats | Active Clients, Appts, Pending Contracts, Pending Invoices | Prenatal Clients, Appts, Visits This Month, Births This Month |
| Quick Actions | See Clients, New Contract, New Invoice, Appointments | Add Client, Add Visit, Birth Summary, Appointments |
| Tip Title | "Doula Tip" | "Midwifery Tools" |

## Benefits
1. **DRY Principle**: Single source of truth for shared functionality
2. **Consistent UX**: Both roles have identical interactions
3. **Easy Maintenance**: Bug fixes apply to both roles
4. **Type Safety**: Shared TypeScript interfaces
5. **Line Reduction**: ~42% reduction (3,576 → 2,056 lines for Dashboard+Messages+Invoices)

## Future Refactoring Candidates
- Profile screens (shared form structure)
- Clients screens (shared list components)
- Contracts screens (90% similar)

## Testing
Verified via testing agent (iteration_81.json):
- ✓ Doula Dashboard loads with lavender theme, 4 stats, 4 actions
- ✓ Midwife Dashboard loads with green theme, 4 stats, 4 actions
- ✓ Both Messages screens load with role-specific colors
- ✓ Both Invoices screens load with status filters and actions
- ✓ Profile navigation works via bottom tab
