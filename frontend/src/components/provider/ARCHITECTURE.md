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
├── ProviderClients.tsx           # Shared clients component (459 lines)
├── config/
│   └── providerConfig.ts         # Role-specific configuration (191 lines)
└── types/
    └── provider.ts               # Shared TypeScript interfaces (101 lines)
```

### Line Savings Summary
| Component | Old (Doula + Midwife) | New (Shared + Wrappers) | Savings |
|-----------|----------------------|------------------------|---------|
| Dashboard | 890 lines | 423 + 14 | 51% |
| Messages | 1,028 lines | 500 + 14 | 50% |
| Invoices | 1,658 lines | 799 + 14 | 51% |
| Clients | 1,518 lines | 459 + 14 | 69% |
| **Total** | **5,094 lines** | **2,529 lines** | **50%** |

### Configuration-Based Approach
Instead of duplicating code, we use a configuration object (`ProviderConfig`) that defines:
- Role name and labels
- Primary color (Doula: lavender #9F83B6, Midwife: green #8CAF8C)
- API endpoints
- Navigation routes
- Dashboard stats and quick actions with color keys
- Tip card content

### Thin Wrapper Pattern
Each role's screen file is now a thin wrapper (7 lines) that passes the appropriate config:

```tsx
// (doula)/clients.tsx - 7 lines
import { ProviderClients, DOULA_CONFIG } from '../../src/components/provider';
export default function DoulaClientsScreen() {
  return <ProviderClients config={DOULA_CONFIG} />;
}
```

## What's Shared

### ProviderDashboard
- Header with greeting and profile avatar
- Stats grid (configurable via `statsCards` with `colorKey`)
- Connection requests from Moms
- Quick actions grid (configurable via `quickActions`)
- Role-specific tip card

### ProviderMessages
- Conversation list with real-time updates
- Chat modal with message input
- Role-based coloring
- Unread message indicators
- Empty state handling

### ProviderInvoices
- Invoice CRUD operations
- Payment template management
- Status filters (All, Draft, Sent, Paid, Cancelled)
- Client selection
- Modal forms with validation

### ProviderClients
- Pending connection requests section
- Active clients list with status badges
- Client action buttons (Message, Birth Plan)
- Midwife-specific: Prenatal Visits button
- Request detail modal

## Intentional Differences

| Feature | Doula | Midwife |
|---------|-------|---------|
| Primary Color | #9F83B6 (lavender) | #8CAF8C (green) |
| API Endpoints | /api/doula/* | /api/midwife/* |
| Dashboard Stats | Active Clients, Appts, Pending Contracts, Pending Invoices | Prenatal Clients, Appts, Visits This Month, Births This Month |
| Quick Actions | See Clients, New Contract, New Invoice, Appointments | Add Client, Add Visit, Birth Summary, Appointments |
| Client Display | Linked clients only | All clients |
| Client Actions | Message, Birth Plan | + Prenatal Visits |

## Benefits
1. **DRY Principle**: Single source of truth
2. **Consistent UX**: Identical interactions
3. **Easy Maintenance**: Bug fixes apply to both
4. **Type Safety**: Shared TypeScript interfaces
5. **50% Line Reduction**: ~2,565 lines saved

## Testing
Verified via testing agent (iteration_82.json) - 100% pass rate
