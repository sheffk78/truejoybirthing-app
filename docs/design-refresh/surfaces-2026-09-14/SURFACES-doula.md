# SURFACES-doula.md â Doula App Screen â Mockup Surface Index

> Generated 2026-09-21 for TrueJoyBirthing doula-side redesign mockup packet.
> Matches approved mom-section design law (S7-S15): hband photo headers with veil fade, cream/lavender/rose palette, Cormorant+Quicksand, white rounded tab bar, serif stat numerals, initials-fallback avatars.

## Mockup Pages

| Page File | Phones | Screens Covered |
|---|---|---|
| `doula-d1d2d3-dashboard-clients-clientdetail.html` | D1, D2, D3 | Dashboard, Clients list, Client Detail hub |
| `doula-d4d5d6-birthplan-notes-contracts.html` | D4, D5, D6 | Client Birth Plan review, Notes, Contracts |
| `doula-d7d8d9-invoices-appointments-messages.html` | D7, D8, D9 | Invoices, Appointments, Messages |
| `doula-d10-profile-settings.html` | D10 | Profile/Settings |

## Screen â Surface Mapping

| RN Screen (doula route) | Mockup Phone | Mockup Surface | Status |
|---|---|---|---|
| Dashboard | D1 | doula-d1d2d3-dashboard-clients-clientdetail.html | â Covered |
| Clients list | D2 | doula-d1d2d3-dashboard-clients-clientdetail.html | â Covered |
| Client Detail hub | D3 | doula-d1d2d3-dashboard-clients-clientdetail.html | â Covered |
| Client Birth Plan review | D4 | doula-d4d5d6-birthplan-notes-contracts.html | â Covered |
| Notes | D5 | doula-d4d5d6-birthplan-notes-contracts.html | â Covered |
| Contracts | D6 | doula-d4d5d6-birthplan-notes-contracts.html | â Covered |
| Invoices | D7 | doula-d7d8d9-invoices-appointments-messages.html | â Covered |
| Appointments | D8 | doula-d7d8d9-invoices-appointments-messages.html | â Covered |
| Messages | D9 | doula-d7d8d9-invoices-appointments-messages.html | â Covered |
| Profile/Settings | D10 | doula-d10-profile-settings.html | â Covered |

## Intentionally Deferred Screens

| Screen | Reason |
|---|---|
| Leads (doula leads pipeline) | Not in scope for this packet; leads are a marketing-facing surface, not a clinical/doula workflow screen. Could be added as D11 if Jeff requests. |
| Subscription management | Shown as a section within Profile/Settings (D10) rather than a standalone screen. The real app has a dedicated Subscription page; mockup consolidates it into the profile hub. |
| Contract Templates | Listed in the RN routes but is a template-management screen for admins, not a doula-facing workflow. Deferred to a future packet. |

## Design Decisions for Jeff Review

1. **doulaPrimary token**: The real app uses `colors.doulaPrimary` (a blue-purple #6E6C99). This value IS within the approved lavender corpus (#6E6C99). No conflict flagged.
2. **Leads consolidation**: The mockup does not include a standalone Leads screen. The doula's lead pipeline is shown as a summary section on the Dashboard (D1) and a mini section on Profile/Settings (D10).
3. **Contract Templates**: Not included as a separate screen. The Contracts screen (D6) shows the doula's active contracts with sign/track functionality only.
4. **Profile/Settings consolidation**: The real app has separate Profile and Settings navigation items. The mockup consolidates them into one screen (D10) following the s13s14s15 pattern.
5. **hband headers**: Used on Dashboard (D1), Client Detail hub (D3), and Birth Plan review (D4) where the mom-section pattern applies. Omitted on screens where the content is primarily data tables (Invoices, Appointments, Messages).
6. **2Ã2 stat grid**: Used on Dashboard (D1) and Profile/Settings (D10). All stat rows follow the 2Ã2 grid pattern (never 4-across), matching the S14 fix.

## Palette Audit

All hex values in the mockup files are drawn from the approved corpus extracted from s7s8s9 + s13s14s15 CSS:

- Cream: #FAF8F5
- Lavender: #8E8CB5, #6E6C99, #D5D3E8, #EDEAF6, #F1F1FB
- Rose: #A25C86, #B085A5, #EFE0EB, #F0E9EE, #B87AA0
- Sage: #5F7154, #E8EDE5
- Charcoal: #2A2A2A
- Gray: #6A6B6C, #8A8B8D, #9C9DA0
- White: #FFFFFF (#fff shorthand)
- Border/neutral: #B9AFB8, #EBE7E1, #F3F1EE, #FDFCFA

No blue, no cartoony art colors, no bright-violet website accent. All values verified.

## Overflow Audit

All phone frames use `overflow: hidden` on the screen container and `flex-shrink: 0` on fixed-height elements. Stat rows use `grid-template-columns: 1fr 1fr` (2Ã2 grid, never 4-across). No scrollWidth issues detected in playwright rendering.

## Rendering & Verification

- Rendered with Playwright (Python) at 390px phone width
- Per-phone PNG screenshots saved to `renders-doula/`
- Combined PDF built from all 4 pages
- All screens verified zero content overflow
- Palette audit passed (all hex â approved corpus)
