# True Joy Birthing - Design Guidelines

## Brand Identity
- **Name**: True Joy Birthing
- **Archetype**: The Nurturing Embrace
- **Tone**: Feminine, Soft, Supportive, Joyful, Calm
- **Keywords**: Gentle, Empowering, Natural, Connected, Safe

## Logo
- **SVG**: https://customer-assets.emergentagent.com/job_377ad6ce-3198-4a5b-87cd-5e06eae39f9e/artifacts/ccxz8is7_Logo%20TJB.svg
- **JPG**: https://customer-assets.emergentagent.com/job_377ad6ce-3198-4a5b-87cd-5e06eae39f9e/artifacts/oqwstugf_true-joy-birthing-full-color-200%20%281%29.jpg
- **Elements**: Lavender pregnant silhouette + Pink cursive "True Joy Birthing" text

## Color Palette

### Primary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#9F83B6` | Main brand color, buttons, links |
| Primary Light | `#C4B1D3` | Backgrounds, hover states |
| Primary Dark | `#7D628C` | Text on light backgrounds |

### Secondary Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Secondary (Dusty Rose) | `#D4A5A5` | Mom role accent, CTAs |
| Secondary Light | `#E3C0C0` | Subtle highlights |
| Secondary Dark | `#B88A8A` | Text emphasis |

### Accent Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Accent (Sage Green) | `#8CAF8C` | Success states, Midwife role |

### Background Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#FEFCFF` | Main app background |
| Surface | `#FFFFFF` | Cards, modals |
| Subtle | `#F9F5FA` | Input fields, subtle sections |

### Text Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#4A3B4E` | Main text |
| Secondary | `#8A7E8E` | Descriptions, labels |
| Light | `#B0A6B4` | Placeholder, disabled |

### Role Colors
| Role | Color | Hex |
|------|-------|-----|
| Mom | Dusty Rose | `#D4A5A5` |
| Doula | Lavender | `#9F83B6` |
| Midwife | Sage Green | `#8CAF8C` |
| Admin | Gray | `#8A7E8E` |

## Typography

### Font Families
- **Headings**: Playfair Display (700 Bold, 500 Medium)
- **Body**: Quicksand (400 Regular, 500 Medium, 700 Bold)

### Font Sizes
| Name | Size | Usage |
|------|------|-------|
| Hero | 36px | Main page titles |
| Title | 30px | Section headers |
| XXL | 24px | Card titles |
| XL | 20px | Subheadings |
| LG | 18px | Emphasized text |
| MD | 16px | Body text |
| SM | 14px | Secondary text |
| XS | 12px | Labels, captions |

## Spacing
| Name | Value |
|------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| xxl | 48px |

## Border Radius
| Name | Value | Usage |
|------|-------|-------|
| sm | 8px | Small elements |
| md | 12px | Input fields |
| lg | 16px | Cards |
| xl | 24px | Large cards |
| full | 9999px | Buttons (pill shape) |

## Component Styles

### Buttons
- **Primary**: Lavender background (#9F83B6), white text, pill-shaped
- **Secondary**: Dusty Rose background (#D4A5A5), white text
- **Outline**: Light lavender background (#F9F5FA), lavender border, lavender text
- All buttons are pill-shaped (border-radius: 9999px)

### Cards
- Background: White (#FFFFFF)
- Border radius: 16px
- Shadow: Soft shadow with #4A3B4E at 8% opacity

### Inputs
- Background: Subtle (#F9F5FA)
- Border: Light border (#EFE6F2)
- Border radius: 12px

## Shadows
```javascript
sm: {
  shadowColor: '#4A3B4E',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2
}

md: {
  shadowColor: '#4A3B4E',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 4
}
```

## Implementation Notes
- Google Fonts installed: @expo-google-fonts/playfair-display, @expo-google-fonts/quicksand
- Theme file location: `/app/frontend/src/constants/theme.ts`
- Brand assets accessible via `BRAND` export from theme
