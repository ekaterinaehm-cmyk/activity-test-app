# Activity Test

A multilingual, public web app where any visitor can take a 54-question psychology / career-orientation test and receive a warm, AI-generated interpretation by email.

> Originally authored in Russian as **Тест на деятельность**. Source-of-truth Excel: `Тест на деятельность.xlsx`.

---

## Architecture

```
┌────────────────┐    POST /api/submit     ┌────────────────────┐
│  Next.js UI    │ ──────────────────────► │  /api/submit       │
│  /[locale]/…   │                         │  • validate (zod)  │
│  next-intl     │ ◄─────────────────────  │  • rate-limit (IP) │
│  localStorage  │     200 OK { id }       │  • insert → DB     │
└────────────────┘                         │  • fire-and-forget │
       │                                   │    POST /interpret │
       ▼                                   └──────────┬─────────┘
  /confirmation                                       │
                                                      ▼
                                       ┌──────────────────────────┐
                                       │  /api/interpret          │
                                       │  • load row              │
                                       │  • Claude API (sonnet)   │
                                       │  • Resend → email user   │
                                       │  • update row status     │
                                       └──────────────────────────┘
                                                      ▲
                              ┌───────────────────────┴────────────┐
                              │  Supabase (Postgres, EU region)    │
                              │  submissions, rate_limits          │
                              └────────────────────────────────────┘
```

## Stack

- **Next.js 15** (App Router, RSC) + **TypeScript** + **Tailwind**
- **next-intl** for i18n, file-based locales under `locales/<code>.json`
- **Supabase** (Postgres) for submissions + rate limiting (EU region recommended)
- **Anthropic SDK** with `claude-sonnet-4-6` for interpretation
- **Resend** for transactional email
- **zod** for request validation
- Deploys to **Vercel** (works on free tier; see notes below)

## Storage choice (why Supabase)

I evaluated the options in the spec and chose **Supabase** because:

| Option         | Verdict                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| Google Sheets  | Rejected. Rate limits + awkward shape for ranking arrays + fiddly service-account setup. |
| Supabase ✅    | Proper JSON columns for nested answers, EU region for GDPR, dashboard for inspection.    |
| Airtable       | Free-tier row caps bite quickly.                                                         |
| Firebase       | NoSQL shape is wrong for analytics on structured psychometric data.                      |

The submissions table stores the raw answers as `jsonb`, so you can query individual answers later (`answers->>'q22'`) without a migration.

---

## Local dev setup

Prereqs: Node 20+, an Anthropic key, a Supabase project, a Resend account.

```bash
git clone https://github.com/ekaterinaehm-cmyk/activity-test-app.git
cd activity-test-app
cp .env.example .env.local
# fill in keys in .env.local

# In the Supabase SQL editor, run the migration:
#   supabase/schema.sql

npm install
npm run dev
# open http://localhost:3000
```

## Environment variables

See `.env.example` for the full list. Required for full functionality:

| Var                              | Purpose                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`              | Claude API (interpretation step)                                 |
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase project URL                                             |
| `SUPABASE_SERVICE_ROLE_KEY`      | Service-role key — **server-side only**, never expose to client. |
| `RESEND_API_KEY`                 | Email delivery                                                   |
| `RESEND_FROM`                    | `"Activity Test <noreply@your-domain.com>"` after DNS is set up. |
| `NEXT_PUBLIC_APP_URL`            | Base URL used for the internal /api/interpret callback           |
| `INTERPRET_TASK_SECRET`          | Shared secret guarding /api/interpret                            |

Without Resend, interpretations are still generated and saved to the `submissions` table, but no email is sent.

## Deploying to Vercel

1. Create a new Vercel project from this repo.
2. Add all env vars from `.env.example`.
3. **Important — function timeout.** The `/api/interpret` route runs the Claude call (15–60s). On Vercel **Pro**, the route's `maxDuration = 60` is fine. On the **Hobby/free tier** (10s cap on serverless functions), the Claude call will be killed mid-flight. Two options:
   - Upgrade to Pro (simplest).
   - Move `/api/interpret` to a longer-running target (Vercel "background functions", a Supabase Edge Function, or a separate worker). The route already supports being called from anywhere — just pass the `x-task-secret` header.
4. Verify your sending domain in Resend and update `RESEND_FROM`. Until then, Resend's `onboarding@resend.dev` will work for testing to your verified address only.

## Adding a new language

The original test is in Russian (`locales/ru.json`). To add a new language:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npx tsx scripts/translate.ts de        # generates locales/de.json
# Review locales/de.json carefully — 54 psychometric questions are very
# sensitive to translation nuance. Fix anything that reads awkwardly.
```

Then enable the locale in [`src/i18n/config.ts`](src/i18n/config.ts):

```ts
export const locales: Locale[] = ["en", "ru", "de"]; // add "de"
```

Out of the box, only `en` and `ru` are exposed because the LLM-translated copies still need human review before going live.

## Editing the AI prompt

The system prompt for the interpretation lives in [`prompts/interpret.md`](prompts/interpret.md). Edit it freely — it's read fresh on each cold start.

## Regenerating questions.json from the Excel

```bash
python3 scripts/build-questions.py    # canonical builder
# or, from npm:
npm run parse-excel                   # ts wrapper that calls the python builder
```

The shape of each question (type, options, scale) is declarative inside `scripts/build-questions.py`. The translated prompts live in the locale files.

## Project structure

```
data/questions.json          # Generated. The schema for all 54 questions.
locales/{en,ru}.json         # UI + question copy (more languages live alongside).
prompts/interpret.md         # System prompt for the AI interpreter.
scripts/
  build-questions.py         # Generates data/questions.json
  parse-excel.ts             # TS wrapper around the Python builder
  translate.ts               # Claude-driven translation of ru.json → other locales
supabase/schema.sql          # Run once in Supabase
src/
  app/
    [locale]/                # i18n-routed pages
      page.tsx               # Landing page (language picker)
      test/page.tsx          # The test runner
      confirmation/page.tsx  # Post-submit screen
    api/submit/route.ts      # Submission endpoint
    api/interpret/route.ts   # Background interpretation + email
  components/
    TestRunner.tsx           # Paginated flow, progress bar, localStorage draft
    QuestionField.tsx        # Renders each question type
  lib/
    questions.ts             # Typed question schema
    answers.ts               # Answer type + required-field check
    interpret.ts             # Builds the Claude prompt + parses the response
    supabase.ts              # Server-side client
    rateLimit.ts             # IP rate-limit using Supabase
  i18n/                      # next-intl glue
  middleware.ts              # Locale routing
```

## Privacy & GDPR

- The landing page includes a short privacy notice.
- All data is stored in Supabase. Pick the **EU region** when you create the project.
- To delete a user's data: `delete from submissions where email = '...'` in the Supabase SQL editor.
- No analytics or third-party trackers. Plausible can be added if desired (commented out by default).

## Disclaimer

This test is not a substitute for professional psychological evaluation or career counseling. The AI interpretation is a reflection of self-reported answers, not a diagnosis.

## License

MIT — see [LICENSE](LICENSE).
