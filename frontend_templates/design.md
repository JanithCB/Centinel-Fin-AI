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

---

## 4. Global layout

### Application shell

**Desktop layout**

```text
┌──────────────────────────────────────────────────────────────┐
│ Top bar: logo / environment badge / profile menu / sign out  │
├───────────────┬──────────────────────────────────────────────┤
│ Side nav      │ Main page content                            │
│ 220–250 px    │ max-width 1280 px                            │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

**Mobile layout**

- Top bar remains visible.
- Replace sidebar with a menu drawer or compact navigation sheet.
- Keep primary page action visible near the page title.
- Cards stack into one column.

### Parent navigation — Phase 1

- Overview — visible but marked **Coming soon** until purchase workflow exists.
- Family — active and fully implemented.
- Settings — optional placeholder.
- Sign out — always available.

### Child navigation — Phase 1

- Home — role confirmation / simple status page.
- Family — read-only family-members list if desired; otherwise hidden.
- Sign out.

Never rely on frontend navigation alone for security. The Spring Boot backend must authorize every protected request.

---

## 5. Component rules

### Buttons

| Variant | Visual rule | Use |
|---|---|---|
| Primary | Lime background, ink border, hard shadow | Sign in, create family, save changes |
| Secondary | White background, ink border, hard shadow | Cancel, back, neutral actions |
| Destructive | Coral background, ink border, hard shadow | Remove member, sign out confirmation |
| Text/link | No card surface; underline on hover/focus | Switch auth mode, legal text |

Button anatomy:

```text
[ optional icon ]  LABEL
```

- Height: minimum 44 px.
- Labels use active verbs: `CREATE FAMILY`, `ADD CHILD`, `CONTINUE`, `SIGN IN`.
- Disable state: muted background, no hard shadow, `not-allowed` cursor.
- Loading state: preserve width; replace label with `WORKING…` or a small non-emoji spinner.

### Inputs

- White surface, ink border, 4 px radius, 48 px minimum height.
- Label sits above the field; do not rely on placeholder text as a label.
- Focus: 3 px ink outline plus a 3 px lime offset ring.
- Error: coral field fill at low intensity, danger border/text below.
- Help text explains why data is needed, especially for role selection and family name.

### Cards

- Surface background, 3 px ink border, hard shadow.
- Use a small top label or colored corner tab to signal context.
- Avoid card overload: one primary intention per card.

### Tags / badges

- Rectangular with slightly rounded corners.
- Uppercase, high-weight 12 px text.
- Role badges: `PARENT` violet; `CHILD` sky.
- Status badges reserved for later purchase workflow: `PENDING` sun, `APPROVED` mint, `DENIED` coral.

### Modal/dialog

- Use for irreversible actions only, such as removing a child later.
- Surface is white with thick border and 8 px hard shadow.
- Must trap focus and close with Escape.

---

## 6. Phase 1 screens

### Screen A — Landing / Auth entry

**Route:** `/`

**Purpose:** Explain the product simply and direct the user to authentication.

**Layout:**

```text
[ CENTINEL FIN AI ]                         [ SIGN IN ]

FAMILY SPENDING,
MADE CLEAR.

ParentGuard helps families set clear purchase permissions.
No hidden decisions. No payment processing in this app.

[ GET STARTED ]  [ I ALREADY HAVE AN ACCOUNT ]

[ thick bordered information strip ]
PHASE 1: Secure sign-in and family setup.
```

**Design notes:**

- Use oversized headline left-aligned.
- Add abstract geometric blocks on right: violet square, lime rectangle, sky circle; no stock photo required.
- Do not claim automatic payment blocking or real-time browser monitoring.

### Screen B — Sign in

**Route:** `/auth/sign-in`

**Purpose:** Authenticate an existing account through Supabase Auth.

**Fields:**

- Email address.
- Password.

**Actions:**

- `SIGN IN` primary.
- `CREATE ACCOUNT` text link.
- `FORGOT PASSWORD?` text link, only if password recovery is configured.

**Layout:**

```text
← BACK TO HOME

┌────────────────────────────────────────┐
│ SIGN IN                                │
│ Access your ParentGuard space.          │
│                                        │
│ EMAIL ADDRESS                           │
│ [                                     ] │
│                                        │
│ PASSWORD                                │
│ [                                     ] │
│                                        │
│ [ SIGN IN ]                             │
│                                        │
│ New here? CREATE ACCOUNT                │
└────────────────────────────────────────┘
```

**States:**

- Invalid email / missing password: inline validation.
- Invalid credentials: one non-specific error: `We could not sign you in with those details.`
- Loading: disable duplicate submission.

### Screen C — Create account and select role

**Route:** `/auth/sign-up`

**Purpose:** Create an authentication account and collect the intended role.

**Fields:**

- Email address.
- Password.
- Confirm password.
- Role selection: Parent or Child.

**Role selector:** Use two large selectable cards, not a small dropdown.

```text
WHO IS THIS ACCOUNT FOR?

┌──────────────────┐  ┌──────────────────┐
│ PARENT           │  │ CHILD            │
│ Create and manage│  │ Request permission│
│ a family.        │  │ from your family.│
└──────────────────┘  └──────────────────┘
```

**Important product rule:** The UI can collect an intended role, but the backend must be the source of truth for the stored role and family relationship. A user must never gain parent access merely by changing a browser value.

**Success behavior:**

- If email confirmation is enabled, show `CHECK YOUR EMAIL` confirmation screen.
- If authenticated immediately, send parent to onboarding and child to the child welcome screen.

### Screen D — Parent onboarding: Create family

**Route:** `/onboarding/create-family`

**Audience:** Authenticated parent with no existing family.

**Purpose:** Create the parent’s first family group.

**Layout:**

```text
STEP 1 OF 2                         PARENT SETUP

CREATE YOUR FAMILY SPACE
This is where you will manage purchase permissions.

FAMILY NAME
[ The Perera Family                         ]

[ CREATE FAMILY ]

You can add children after creating the family.
```

**Backend interaction:**

```text
POST /api/v1/families
Authorization: Bearer <Supabase access token>
```

**Success:** Route to `/family/add-child` or `/family`.

### Screen E — Parent onboarding: Add child

**Route:** `/family/add-child`

**Audience:** Authenticated parent who owns a family.

**Purpose:** Link an existing child account to the family.

**Fields:**

- Child email address or a future invitation mechanism.

**Important implementation note:** The Phase 1 backend plan currently supports adding a child by user identity. If email lookup/invitation is not implemented yet, use a **development-only child selector** seeded with test child users. Label it clearly: `DEVELOPMENT TEST ACCOUNT`. Do not pretend this is a production invitation flow.

**Layout:**

```text
FAMILY MEMBERS                         STEP 2 OF 2

ADD A CHILD
Link a child account to this family.

CHILD EMAIL ADDRESS
[ child@example.com                       ]

[ ADD CHILD ]     [ FINISH LATER ]

┌────────────────────────────────────────┐
│ PRIVACY NOTE                            │
│ Phase 1 stores family relationships; it │
│ does not collect browsing activity.     │
└────────────────────────────────────────┘
```

**Success:** Child appears in the members list; show a mint success strip: `CHILD ADDED TO FAMILY.`

### Screen F — Parent family management

**Route:** `/family`

**Audience:** Authenticated parent.

**Purpose:** View own family, see members, and add a child.

**Layout:**

```text
FAMILY
THE PERERA FAMILY                         [ + ADD CHILD ]

┌────────────────────────────────────────────────────────────┐
│ FAMILY MEMBERS                                               │
│                                                              │
│ [PARENT]  Nimal Perera   parent@example.com   YOU            │
│ [CHILD ]  Sam Perera     child@example.com                   │
│                                                              │
│ 2 MEMBERS                                                     │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ WHAT'S NEXT?                                                 │
│ Purchase-request controls unlock in the next product phase.  │
└────────────────────────────────────────────────────────────┘
```

**Rules:**

- Show only members from the authenticated parent’s own family.
- Do not expose database IDs in normal UI.
- Member removal can be omitted in Phase 1. If included later, it must require confirmation.

### Screen G — Child welcome / restricted role view

**Route:** `/child`

**Audience:** Authenticated child.

**Purpose:** Confirm the child is connected to a family and clearly explain current availability.

**Layout:**

```text
YOUR FAMILY SPACE
You are connected to: THE PERERA FAMILY

┌────────────────────────────────────────┐
│ PURCHASE REQUESTS                       │
│ Available in the next phase.            │
└────────────────────────────────────────┘

[ VIEW FAMILY ]
```

**Rule:** Do not show family management or parent controls to children. The API must also deny those endpoints.

### Screen H — Unauthorized / no access

**Route:** `/unauthorized`

**Purpose:** Explain a blocked route without leaking private information.

```text
ACCESS NOT AVAILABLE
Your account does not have permission to view this area.

[ GO TO MY HOME ]  [ SIGN OUT ]
```

Do not say which family, user, or resource caused the denial.

---

## 7. Key user flows

### Parent authentication and family setup

```text
Landing
  → Sign up
  → choose Parent
  → Supabase account created / email verified
  → backend recognizes parent role
  → Create Family
  → Add Child
  → Family Management page
```

### Existing parent sign-in

```text
Sign in
  → Supabase returns session
  → frontend retrieves role/profile from backend
  → if parent with family: /family
  → if parent with no family: /onboarding/create-family
```

### Existing child sign-in

```text
Sign in
  → Supabase returns session
  → frontend retrieves role/profile from backend
  → /child
```

### Authorization failure

```text
Child visits /family
  → frontend route guard redirects to /unauthorized or /child
  → if direct API request is attempted, Spring Boot returns 403
```

---

## 8. Frontend-to-backend contract

### Authentication ownership

- Supabase Auth creates and maintains the authenticated session.
- The frontend obtains the Supabase access token/session.
- Every protected Spring Boot call includes `Authorization: Bearer <access_token>`.
- Spring Security validates the JWT; the backend determines identity and role.
- Never put the Supabase service-role/secret key into browser or Flutter client code.

### Phase 1 API needs

| UI action | Endpoint | Client sends | Backend owns |
|---|---|---|---|
| Create family | `POST /api/v1/families` | family name + Bearer token | Parent identity, family ownership |
| Add child | `POST /api/v1/families/{id}/members` | child identifier + Bearer token | Whether caller owns family, whether child can be linked |
| View own family | Recommended `GET /api/v1/families/me` | Bearer token | Returns only caller's allowed family data |
| Current profile/role | Recommended `GET /api/v1/me` | Bearer token | Role, profile and onboarding state |

`GET /api/v1/me` and `GET /api/v1/families/me` are small recommended additions because the frontend needs a safe way to choose its post-login route without guessing roles or family membership from local state.

### Client data rules

- Do not send parent ID from the browser as a source of authority.
- Do not accept user role from browser state as a source of authority.
- Do not store authentication secrets in code, URLs, logs, or screenshots.
- Do not expose raw JWT content in the UI.

---

## 9. Accessibility and UX requirements

- Minimum body-text contrast must meet WCAG AA; black text over the selected pastel palette is preferred.
- Every input has a visible label.
- Every icon-only control has an accessible label.
- Full keyboard operation: Tab, Shift+Tab, Enter, Escape for dialogs.
- Visible focus state must be obvious; do not remove browser focus without replacement.
- Minimum touch target: 44 by 44 px.
- Use errors that explain recovery: `Enter a valid email address`, not `Invalid input`.
- Do not use color alone to convey a role/status; pair color with visible text.
- Respect reduced-motion preferences; transitions should be short (120–180 ms) and non-essential.

---

## 10. Responsive behavior

| Breakpoint | Layout behavior |
|---|---|
| Desktop: 1024 px+ | Sidebar, two-column onboarding where useful, max-width content container |
| Tablet: 768–1023 px | Compact sidebar or top nav, cards may become one column |
| Mobile: <768 px | Drawer navigation, one-column cards, full-width buttons for key actions |

Never make tables horizontally impossible on mobile. For family members, switch from a row/table to stacked member cards below 768 px.

---

## 11. Recommended implementation choice

### Recommended: Next.js + TypeScript + Tailwind CSS + Supabase Auth

Use **Stitch with Google for visual exploration**, then implement the actual web UI in **Next.js**. This matches the existing ParentGuard plan, which already calls for a Next.js frontend and Supabase Auth. Supabase provides an SSR package intended for Next.js cookie-based session handling.[web:169][web:170]

Recommended stack:

```text
Next.js App Router + TypeScript
Tailwind CSS (custom tokens from this DESIGN.md)
Supabase Auth + @supabase/ssr
Spring Boot API (authorization source of truth)
```

Suggested frontend structure:

```text
frontend/
  app/
    page.tsx
    auth/sign-in/page.tsx
    auth/sign-up/page.tsx
    onboarding/create-family/page.tsx
    family/page.tsx
    family/add-child/page.tsx
    child/page.tsx
    unauthorized/page.tsx
  components/
    ui/
    auth/
    family/
    layout/
  lib/
    supabase/
    api-client.ts
    auth-routing.ts
  middleware.ts
```

### Flutter alternative

Flutter is valid if your priority is a future Android/iOS app. Supabase has Flutter methods for password sign-in, sign-up, and auth-state changes.[web:166][web:167][web:177] However, for this current browser-based ParentGuard MVP and the planned Next.js tickets, Flutter would add unnecessary divergence. Choose Flutter only if you deliberately change the product target to mobile-first.

### Stitch prompt

Paste this into Stitch with Google after adding this file:

```text
Design a responsive desktop-first web app called "Centinel Fin AI — ParentGuard".
Use a polished neo-brutalist visual system: warm off-white background, black 3px borders, hard black shadows down-right, lime primary buttons, violet parent labels, sky child labels, coral warning states, Space Grotesk headings and Inter body text. No gradients, no glassmorphism, no emoji, no generic AI dashboard style.

Build Phase 1 screens only: landing page, sign in, sign up with Parent/Child role cards, parent create-family onboarding, add-child onboarding, parent family-management page, child welcome page, and unauthorized page.

The product is a family purchase-permission system. It does not process payments and does not yet show analytics or AI insights. Make parent UI authoritative and clear; make child UI respectful and transparent. Include responsive mobile layouts and clear error/loading/empty states.
```

---

## 12. Design acceptance checklist

Before approving any Phase 1 frontend screen, verify:

- [ ] The screen uses the defined palette, thick borders, and hard shadows consistently.
- [ ] Text is clear, professional, and contains no emoji or fake/overly-AI wording.
- [ ] Parent and child roles are visually distinct and textually labelled.
- [ ] Parent-only actions are absent from child screens.
- [ ] Loading, empty, error, and disabled states are designed.
- [ ] The design makes no false claim about payments, browser monitoring, AI, or notifications.
- [ ] All protected API calls use the Supabase session access token.
- [ ] The backend—not the UI—remains the final authorization authority.
- [ ] The layout works at desktop, tablet, and mobile sizes.
- [ ] Keyboard focus and form labels are visible.

---

## 13. Future visual language

When later phases are implemented, add components without changing the Phase 1 foundation:

- Purchase request cards: use status badges and amount in monospace.
- Parent approval panel: make Approve lime and Deny coral; require a clear confirmation state.
- Analytics: use thick bordered bar charts and category cards; no gradient charts.
- AI insights: show a "Generated from aggregated family totals" label and do not display raw private data.
- Notifications: use an inbox panel first; add external delivery only after explicit user preferences exist.

The visual system should remain simple: **black outlines, hard shadows, warm paper background, explicit labels, and accountable actions.**
