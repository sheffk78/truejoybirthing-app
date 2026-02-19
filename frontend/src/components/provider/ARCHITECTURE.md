# Doula/Midwife Shared Component Architecture

## Overview
This document describes the shared component architecture used for both Doula and Midwife provider experiences in True Joy Birthing.

## Architecture

### Directory Structure
```
frontend/src/components/provider/
├── index.ts                      # Main exports
├── ProviderMessages.tsx          # Shared messages component (500 lines)
├── ProviderInvoices.tsx          # Shared invoices component (799 lines)
├── config/
│   └── providerConfig.ts         # Role-specific configuration (178 lines)
└── types/
    └── provider.ts               # Shared TypeScript interfaces (101 lines)
```

### Configuration-Based Approach
Instead of duplicating code, we use a configuration object (`ProviderConfig`) that defines:
- Role name and labels
- Primary color
- API endpoints
- Navigation routes
- Dashboard stats and quick actions
- Profile field configurations

### Thin Wrapper Pattern
Each role's screen file is now a thin wrapper that passes the appropriate config:

```tsx
// (doula)/messages.tsx
import { ProviderMessages, DOULA_CONFIG } from '../../src/components/provider';
export default function DoulaMessagesScreen() {
  return <ProviderMessages config={DOULA_CONFIG} />;
}
```

## What's Shared

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
| Profile Fields | Specialties | Birth Settings Served |
| Dashboard Stats | Prenatal Clients, Appts | + Visits, Births this month |

## Benefits
1. **DRY Principle**: Single source of truth for shared functionality
2. **Consistent UX**: Both roles have identical interactions
3. **Easy Maintenance**: Bug fixes apply to both roles
4. **Type Safety**: Shared TypeScript interfaces
5. **Line Reduction**: ~40% reduction (2,686 → 1,606 lines)

## Future Refactoring Candidates
- Dashboard screens (similar stats display)
- Profile screens (shared form structure)
- Clients screens (shared list components)
- Contracts screens (90% similar)

## Testing
Verified via testing agent (iteration_80.json):
- ✓ Doula Messages loads with correct styling
- ✓ Midwife Messages loads with correct styling  
- ✓ Doula Invoices loads with status filters
- ✓ Midwife Invoices loads with status filters
- ✓ Both roles navigate correctly through tabs
