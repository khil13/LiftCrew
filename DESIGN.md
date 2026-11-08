---
name: LiftCrew
description: Clean, trustworthy booking site for local moving help. 60-30-10 color rule - light canvas, deep navy, LiftCrew blue for actions. Soft rounded shapes, Inter type, restrained shadows.
colors:
  # 60%: light canvas
  canvas: "#ffffff"
  surface-soft: "#f5f7fc"   # alternating section bands, hero gradient end (slate-50)
  # 30%: deep navy
  navy: "#202b45"           # headings, nav text, footer, helper band (slate-900 / navy)
  body: "#384157"           # body text (slate-700)
  muted: "#5b6478"          # supporting text (slate-500), 5.9:1 on white
  # 10%: LiftCrew blue
  primary: "#3154de"        # primary buttons, links, icons, selected options (brand-600), 6.1:1 on white
  primary-hover: "#2541b5"  # brand-700
  primary-tint: "#eef2fd"   # icon badges, hero gradient start (brand-50)
  hairline: "#dfe4ef"       # card borders, dividers (slate-200)
  input-border: "#8c94a8"   # form field outlines (slate-400), 3:1 on white
  accent-print: "#facc15"   # yellow, only for flyers, ads, and video (not in the site UI)
rounded:
  input: 12px  # buttons, inputs (rounded-xl)
  card: 16px   # cards (rounded-card)
  full: 9999px # pills, avatars, step numbers
shadow:
  card: "0 1px 2px rgba(32,43,69,.05), 0 2px 8px rgba(32,43,69,.05)"   # resting cards
  float: "0 1px 2px rgba(32,43,69,.06), 0 8px 24px rgba(32,43,69,.10)"  # price card, quote form
---

# LiftCrew design

## Principles
- **60-30-10.** About 60% of every screen is white or #F5F7FC, 30% is navy (headings, nav, footer, the helper band), and 10% is blue. Blue is for the primary action, links, icons and selected options. Never make a whole section blue. Red, green and amber are only for status (errors, Booked, warnings).
- **One primary action per view: "Book Moving Help"** (`PRIMARY_CTA` in `src/lib/cta.ts`). The secondary action is always "Get a Free Quote" (`SECONDARY_CTA`). Use these constants, not new wording.
- **Soft, human shapes.** Buttons and inputs 12px, cards 16px, pills and step numbers fully round.
- **Type.** Inter (next/font) with the system stack as fallback. Headings are bold navy with `tracking-tight`; section titles use `.section-title`, small blue labels above them use `.eyebrow`. Body copy is 16-18px slate-600/700.
- **Alternate bands, don't box everything.** Sections alternate white and `bg-slate-50`. Cards (`.card`, white with a hairline border and `shadow-card`) hold distinct things: a reason, a step, a price. `shadow-float` is only for the price card and quote form.
- **Accessible by default.** Every text pair passes WCAG AA (check with `python3 contrast.py replica/design/tokens.json` from the replica-design skill). Keyboard focus shows a 2px blue outline (`:focus-visible` in globals.css). Touch targets are at least 44px.
- **Honest trust signals only.** Show what is true in the current payment mode (no deposit, free cancellation, local NJ). Never add insured, background-checked, licensed, ratings, counts or testimonials unless they are verified.

## Tokens in code
- `tailwind.config.ts` remaps `slate` to a cool neutral ramp that ends in navy (`slate-900` = `navy` = #202B45) and `brand` to the LiftCrew blue ramp (`brand-600` = #3154DE). Keep using `slate-*` and `brand-*` classes.
- `src/app/globals.css`: `.btn-primary`, `.btn-secondary`, `.btn-on-dark` (white button on navy), `.input` (56px, blue focus ring), `.label`, `.card`, `.eyebrow`, `.section-title`, `.link`.
- Components: `Logo` (`tone="light"` on navy), `Icon` / `IconBadge` (inline stroke icons, no library), `SiteHeader`, `SiteFooter` (navy), `MobileCtaBar` (pinned Book / Quote bar on phones), `MarketingShell` (header + optional hero band + footer + bar, used by town, areas and legal pages), `SubmitButton` (spinner while pending).

## Patterns
- **Hero:** soft gradient from brand-50 to slate-50, eyebrow, navy H1, slate-600 lead, Book (primary) and Quote (secondary) buttons, then a white price-preview card on desktop and a row of four trust tiles.
- **Feature cards:** `IconBadge` + semibold title + slate-600 text.
- **Steps:** blue numbered circles in cards.
- **Selected options:** radio "chips" that turn solid blue when checked (quote form helpers).
- **Footer:** navy band, white headings, slate-300 links that turn white on hover.
- **Mobile:** buttons are full width; public pages add `pb-24` for the pinned booking bar.

## Copy rules (also in PLAN.md, Section 7)
Labor only: never imply LiftCrew drives, hauls, or provides trucks. Service area comes from settings ("New Jersey"). No invented ratings, counts, or testimonials on public pages.
