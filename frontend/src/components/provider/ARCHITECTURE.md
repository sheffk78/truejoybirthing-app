# Doula/Midwife Shared Component Architecture

## Overview
This document describes the shared component architecture used for both Doula and Midwife provider experiences in True Joy Birthing.

## Final Results - 53% Line Reduction
| Component | Old (Doula + Midwife) | New (Shared + Wrappers) | Savings |
|-----------|----------------------|------------------------|---------|
| Dashboard | 890 lines | 423 + 14 | 51% |
| Messages | 1,028 lines | 500 + 14 | 50% |
| Invoices | 1,658 lines | 799 + 14 | 51% |
| Clients | 1,518 lines | 459 + 14 | 69% |
| Profile | 1,671 lines | 637 + 14 | 61% |
| **Total** | **6,765 lines** | **3,180 lines** | **53%** |

## Directory Structure
```
frontend/src/components/provider/
├── index.ts                      # Main exports
├── ProviderDashboard.tsx         # 423 lines
├── ProviderMessages.tsx          # 500 lines
├── ProviderInvoices.tsx          # 799 lines
├── ProviderClients.tsx           # 459 lines
├── ProviderProfile.tsx           # 637 lines
├── config/
│   └── providerConfig.ts         # 191 lines - DOULA_CONFIG + MIDWIFE_CONFIG
└── types/
    └── provider.ts               # 101 lines
```

## Thin Wrapper Pattern
Each role's screen file is now a 7-line wrapper:
```tsx
// (doula)/profile.tsx
import { ProviderProfile, DOULA_CONFIG } from '../../src/components/provider';
export default function DoulaProfileScreen() {
  return <ProviderProfile config={DOULA_CONFIG} />;
}
```

## Role-Specific Differences

| Feature | Doula | Midwife |
|---------|-------|---------|
| **Color** | #9F83B6 (lavender) | #8CAF8C (green) |
| **Icon** | heart | medkit |
| **Profile: Location** | Zip code lookup | Manual city/state |
| **Profile: Credentials** | Not shown | CPM, CNM, LM field |
| **Clients: Display** | Linked clients only | All clients |
| **Clients: Actions** | Message, Birth Plan | + Prenatal Visits |
| **Dashboard: Stats** | Active, Appts, Contracts, Invoices | Prenatal, Appts, Visits, Births |

## Testing
Verified via testing agent (iteration_83.json) - 100% pass rate:
- ✓ Doula Profile - lavender badge, heart icon, zip code field
- ✓ Midwife Profile - green badge, medkit icon, credentials field
- ✓ Both roles - All 5 tabs work correctly
- ✓ Role-specific fields correctly shown/hidden
