---
name: Neo-Brutalist Trust
colors:
  surface: '#FFFFFF'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#454934'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#757962'
  outline-variant: '#c5c9ae'
  surface-tint: '#536500'
  primary: '#536500'
  on-primary: '#ffffff'
  primary-container: '#d9ff3f'
  on-primary-container: '#607400'
  inverse-primary: '#b1d400'
  secondary: '#6252a3'
  on-secondary: '#ffffff'
  secondary-container: '#b9a7ff'
  on-secondary-container: '#493887'
  tertiary: '#006685'
  on-tertiary: '#ffffff'
  tertiary-container: '#dff3ff'
  on-tertiary-container: '#187596'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ccf230'
  primary-fixed-dim: '#b1d400'
  on-primary-fixed: '#171e00'
  on-primary-fixed-variant: '#3e4c00'
  secondary-fixed: '#e7deff'
  secondary-fixed-dim: '#ccbeff'
  on-secondary-fixed: '#1e035c'
  on-secondary-fixed-variant: '#4a3989'
  tertiary-fixed: '#bfe9ff'
  tertiary-fixed-dim: '#83d0f5'
  on-tertiary-fixed: '#001f2a'
  on-tertiary-fixed-variant: '#004d65'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
  paper: '#FFFDF7'
  coral: '#FF8F7C'
  sun: '#FFD64A'
  mint: '#8EF0C0'
  muted: '#E9E6DD'
  danger: '#E5484D'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 38px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

# Centinel Fin AI — ParentGuard
## Frontend DESIGN.md

**Version:** 1.0  
**Scope:** Phase 1 frontend foundation — authentication, role-aware shell, family setup, and family membership management.  
**Target:** Responsive web application, desktop-first with a usable mobile layout.  
**Style:** Neo-brutalism with a trustworthy fintech/safety-product feel.

---

## 1. Product statement

ParentGuard is a family spending-permission product inside Centinel Fin AI. A parent creates a family, links children, and later reviews purchase-permission requests. Phase 1 establishes trusted access: sign in, role recognition, family creation, and family-member management.

### Phase 1 user outcomes

- A visitor can sign in or create an account with Supabase Auth.
- A signed-in user lands in the correct role-aware area.
- A parent can create a family.
- A parent can add a child to their family.
- A parent can see the members of their own family.
- A child cannot access parent-only family-management actions.
- An unrelated parent cannot change another family.

### Not in this phase

- Purchase-request creation, approval, or denial.
- Spending charts and analytics.
- Browser-extension activity capture.
- AI assistant, recommendations, notifications, or scheduled insights.
- Payment processing or transaction confirmation.

---

## 2. Visual direction

### Design personality

Use **neo-brutalism**, but make it feel intentional and safe rather than playful or chaotic:

- Strong black outlines and hard-offset shadows.
- Large, confident typography and simple geometric shapes.
- Flat high-contrast color blocks; no glassmorphism.
- Rounded corners used sparingly: components feel solid and tactile.
- Clear information hierarchy, generous whitespace, obvious actions.
- No gradients, emoji, excessive illustrations, tiny text, or generic "AI dashboard" appearance.

### Brand impression

The product should communicate:

> "Clear family controls. No hidden decisions. Every action is visible."

The parent experience should feel calm and authoritative. The child experience should feel respectful and transparent, never surveillance-like.

---

## 3. Design tokens

### Color palette

| Token | Value | Use |
|---|---:|---|
| `--ink` | `#151515` | Primary text, borders, icons |
| `--paper` | `#FFFDF7` | Main page background |
| `--surface` | `#FFFFFF` | Cards, fields, modals |
| `--lime` | `#D9FF3F` | Primary action and active state |
| `--violet` | `#B9A7FF` | Brand highlight, parent label |
| `--coral` | `#FF8F7C` | Warning/denial and destructive actions |
| `--sky` | `#8DDAFF` | Child label and informational elements |
| `--sun` | `#FFD64A` | Attention / pending state |
| `--mint` | `#8EF0C0` | Success state |
| `--muted` | `#E9E6DD` | Disabled/background secondary elements |
| `--danger` | `#E5484D` | Error text and error outline |

### Semantic colors

| Meaning | Background | Text / border |
|---|---|---|
| Success | `--mint` | `--ink` |
| Pending | `--sun` | `--ink` |
| Denied / destructive | `--coral` | `--ink` |
| Parent role | `--violet` | `--ink` |
| Child role | `--sky` | `--ink` |
| Primary action | `--lime` | `--ink` |

### Typography

Use one expressive heading font and one highly readable UI font.

- **Headings:** `Space Grotesk`, fallback `Arial Black`, sans-serif.
- **Body/UI:** `Inter`, fallback `Arial`, sans-serif.
- **Data / request IDs / codes:** `IBM Plex Mono`, fallback monospace.

| Element | Font | Weight | Size |
|---|---|---:|---:|
| Display title | Space Grotesk | 800 | 48–64 px desktop, 34–42 px mobile |
| Page title | Space Grotesk | 800 | 32–40 px |
| Section title | Space Grotesk | 700 | 22–28 px |
| Card title | Space Grotesk | 700 | 18–20 px |
| Body | Inter | 500 | 16 px |
| Label | Inter | 700 | 12–14 px, uppercase, letter spacing |
| Small help text | Inter | 500 | 13–14 px |

### Borders and shadows

```css
--border: 3px solid #151515;
--border-thin: 2px solid #151515;
--shadow: 6px 6px 0 #151515;
--shadow-small: 4px 4px 0 #151515;
--shadow-hover: 8px 8px 0 #151515;
--radius: 8px;
--radius-small: 4px;
```

Rules:

- Every interactive card, button, field, dialog, and status badge uses an ink border.
- Primary actions use `--shadow`; on hover, move up/left by 2 px and increase shadow; on pressed, remove/shorten shadow and translate down/right.
- Do not use blurred box-shadows.
- Do not use more than one shadow direction: all shadows go down/right.

### Spacing grid

Use a 4 px base unit: `4, 8, 12, 16, 24, 32, 48, 64`.

- Desktop page horizontal padding: 40–64 px.
- Mobile page horizontal padding: 16–20 px.
- Standard card padding: 24 px desktop, 16 px mobile.
- Main section gap: 32 px.
