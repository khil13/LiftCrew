---
name: LiftCrew
description: Warm, trustworthy local marketplace for booking moving helpers. White canvas, near-black ink, soft rounded shapes, and LiftCrew blue as the single accent. Layout and feel inspired by Airbnb's design system (awesome-design-md), with LiftCrew's own brand.
colors:
  primary: "#1d4ed8"        # LiftCrew blue: primary buttons, links, active tab, logo
  primary-active: "#1e40af"
  primary-tint: "#eef6ff"   # chips, selected states
  primary-disabled: "#d9eaff"
  ink: "#222222"            # headings and body (slate-900)
  body: "#3f3f3f"           # long-form text (slate-700)
  muted: "#6a6a6a"          # secondary text (slate-500)
  muted-soft: "#929292"     # placeholders, disabled (slate-400)
  border-strong: "#c1c1c1"  # input outlines (slate-300)
  hairline: "#dddddd"       # card borders, dividers (slate-200)
  surface-strong: "#f2f2f2" # icon buttons (slate-100)
  surface-soft: "#f7f7f7"   # soft bands, footer (slate-50)
  canvas: "#ffffff"
  accent-print: "#facc15"   # yellow, only for flyers, ads, and video (not in the app UI)
rounded:
  sm: 8px      # buttons, inputs (rounded-lg)
  card: 14px   # cards (rounded-card)
  full: 9999px # pills, the booking bar, avatars, the search orb
shadow:
  float: "0 0 0 1px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.1)"
---

# LiftCrew design

## Principles
- **One accent.** Blue is for the primary action on a screen (Post job, Apply, Book), links, and the active nav tab. Everything else is ink on white. Red and green are only for status (errors, Booked, no-shows).
- **Soft, human shapes.** No hard corners on interactive things: buttons and inputs use 8px, cards 14px, and pills and avatars are fully round.
- **Modest type.** Use the system font stack. Headings are bold but small: 24px for page titles in the app, up to 48px only on the landing hero. Use `tracking-tight` on headings. Body text is 16px, and secondary text is muted grey, not lighter weights.
- **Hairlines over boxes.** Prefer 1px #dddddd dividers (`divide-y divide-slate-200`) for lists and FAQs. Use a card only when the content is a distinct object (a job, a helper, a price). The single elevation is `shadow-float`, used only on things that float or invite a tap (the booking bar, the price card, a hover state).
- **White canvas.** Pages sit on white. `bg-slate-50` is for soft bands (helper call-out, footer), never the whole page.

## Tokens in code
- `tailwind.config.ts` remaps Tailwind's `slate` scale to the warm neutrals above, so `text-slate-500` is muted (#6a6a6a), `border-slate-200` is the hairline, and so on. Keep using `slate-*` classes.
- `src/app/globals.css` defines the components `.btn-primary` (blue, 48px tall, 8px radius), `.btn-secondary` (white with an ink 1px border), `.input` (56px tall, ink focus ring), `.label`, and `.card` (14px radius, hairline border, 20px padding).
- `src/components/Logo.tsx` is the mark and wordmark. Use it at the top of public pages.

## Patterns
- **Booking bar (landing):** a white pill with `shadow-float`, divided into Where / When / Crew segments on desktop (a single line on mobile), ending in a round blue orb with an arrow. The whole pill is one link.
- **Buttons:** full-width on mobile. On desktop, use `sm:w-auto` with extra horizontal padding.
- **Lists of facts:** rows with hairline dividers and a leading ✓ (blue) or ✕ (muted).
- **Price card:** big rate line, then a dl with underlined labels, a hairline above the total, and a primary button.
- **Footer:** soft grey band, three columns (brand, links, legal).

## Copy rules (also in PLAN.md, Section 7)
Labor only: never imply LiftCrew drives, hauls, or provides trucks. Service area comes from settings ("New Jersey"). No invented ratings, counts, or testimonials on public pages.
