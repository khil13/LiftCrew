# LiftCrew

Labor-only moving marketplace: customers and moving companies book local helpers to load, unload, and pack. Helpers never drive or transport customer goods, and every job stays inside one allowed state. See [PLAN.md](PLAN.md) for the full plan and progress.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth, Storage) · Google Places API (New)

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a Supabase project, then apply the migrations in `supabase/migrations/` in order (Supabase CLI: `supabase link` then `supabase db push`, or paste each file into the SQL editor).

3. Set the launch state. Until you do, no job or helper address will pass the state checks:

   ```sql
   update app_settings set value = '["NJ"]' where key = 'allowed_states';
   ```

4. In Supabase Auth, enable the Email provider. For phone sign-in, enable the Phone provider and connect an SMS provider (Twilio). To sign in with a code instead of only the magic link, include `{{ .Token }}` in the email template.

5. In Google Cloud, enable **Places API (New)** and create a server key (no HTTP referrer restriction; restrict it to Places API).

6. Copy `.env.example` to `.env.local` and fill in at least:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   GOOGLE_MAPS_SERVER_API_KEY=
   ```

   For email notifications also set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` (server-only). Without them the app still works and shows in-app alerts only.

7. Run the app:

   ```sh
   npm run dev
   ```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (compliance rules, money helpers) |
| `DATABASE_URL=… supabase/tests/run.sh` | Apply migrations to a scratch Postgres and check compliance rules + RLS |

## Deploy

Push to GitHub, import the repo in Vercel, and add the environment variables from `.env.example` in the Vercel dashboard. Add your Vercel URL to Supabase Auth → URL Configuration so magic links redirect correctly.
