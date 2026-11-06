# LiftCrew test plan

How to run:
- **Unit tests:** `npm test` (vitest).
- **Database rules:** `supabase/tests/run.sh` (local Postgres).
- **End to end:**
  1. `npm run build && npm run start`
  2. in another terminal, `npm run test:e2e` (Playwright on desktop Chrome and a Pixel 7).
- The e2e specs fail on any console error, 5xx response or missing file, and scan every screen for WCAG 2.1 AA problems with axe.

They only read pages and submit forms that fail validation. They never write to the live database or send texts or emails.

## Automated: end to end (`e2e/`)
| ID | Case | Result |
|---|---|---|
| F01-H1 | Landing shows the offer, quote form and town links | pass |
| F01-H2 | Canonical URL; LocalBusiness schema with no street address | pass |
| F01-E1 | No sideways scroll (desktop and mobile) | pass |
| F01-E2 | Accessibility (WCAG AA) | pass |
| F02-E1 | Empty submit is blocked by required fields | pass |
| F02-N1 | Bad phone number shows "Enter a 10-digit US phone number." | pass |
| F02-E2 | Accents and emoji in the name | pass |
| F02-E3 | Very long name is capped at 100 characters | pass |
| F02-E4 | Filled honeypot is rejected | pass |
| F02-E5 | Earliest move date is today in NJ, late in the evening and long after the build | **failed, fixed (B01)** |
| F02-E6 | Keyboard only: every field reachable with Tab, honeypot skipped | pass |
| F02-E7 | Quote section accessibility | pass |
| F03-H1 ×8 | Each town page: H1, title, canonical, FAQ and Service schema, prefilled town, no sideways scroll | pass |
| F03-H2 | "Also serving" links all open | pass |
| F03-N1 | Unknown town returns 404 | pass |
| F03-E1 | Town page and hub accessibility | pass |
| F04-H1 | robots.txt points to the sitemap and hides app pages | pass |
| F04-H2 | Every sitemap URL returns 200 | pass |
| F05-N1 ×7 | /home, /jobs, /messages, /admin, /settings, /earnings, /billing send logged-out visitors to /login | pass |
| F05-H1 | Login page renders | pass |

66 cases across 2 devices: **66 pass**.

## Automated: database rules (`supabase/tests/run.sh`)
**180 checks pass.** They cover:
- profiles and private home locations;
- labor-only attestations;
- NJ-only addresses;
- posting, applying, accepting and the crew;
- chat access (only the crew can chat);
- cancellations, no-shows, check-in timing, moderation and the 2-hour minimum.

## Manual checklist (sends real messages or writes to the live database)
| ID | Case | How |
|---|---|---|
| M1 | Log in with an email code and with a text code | On liftcrewnj.com, use your own email and phone |
| M2 | A real quote request saves, emails the alert, and texts the customer | Submit with your own phone. Check the inbox, check `alert_status` and `confirm_status`, then delete the row |
| M3 | Post job → helper applies → accept → chat | Two accounts. This passed in October; repeat after big changes |
| M4 | Push notifications on iPhone (home-screen app) and Android | Turn on in Settings, then trigger a chat message |
| M5 | Call and Text buttons open the dialer and SMS app with the message | After `BUSINESS_PHONE` is set, on a real phone |
