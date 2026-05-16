# activity-test-app — Claude session notes

Working notes for any future Claude session helping Ekaterina with this project. Updated 2026-05-16.

## What this is

A public web app where any visitor takes a 54-question psychology / career-orientation test originally authored in Russian ("Тест на деятельность"). On submit, the user's answers + an AI-generated interpretation get emailed to them.

- **Live production URL** (stable, always points at latest): https://activity-test-app.vercel.app
- **GitHub**: https://github.com/ekaterinaehm-cmyk/activity-test-app
- **Owner**: Ekaterina Ehm (Switzerland). She is **not technical** — give clear, one-step-at-a-time instructions and avoid jargon. The original test is in Russian; she speaks Russian and German fluently.

## User communication notes

- Respond in English. Test content stays in target language.
- Keep instructions step-by-step. She gets overwhelmed by long option lists. Pick the simplest path and tell her exactly what to click.
- She has already approved one public-repo push under `ekaterinaehm-cmyk/activity-test-app`. Further pushes don't need re-confirmation, but visible/destructive actions (force-push, repo deletion) do.

## Architecture

```
Browser (Next.js client) ──► /api/submit ──► Supabase insert ──► (fire-and-forget) /api/interpret
                                                                      │
                                                                      ▼
                                                              Claude API (sonnet-4-6)
                                                                      │
                                                                      ▼
                                                              Resend email to user
                                                                      │
                                                                      ▼
                                                          status="sent" on submission row
```

- **Next.js 15.5.x** (App Router) + TypeScript + Tailwind + next-intl
- **Supabase** Postgres in EU region for `submissions` + `rate_limits`
- **Anthropic Claude `claude-sonnet-4-6`** for the interpretation
- **Resend** for transactional email
- Deployed on **Vercel Hobby** tier — **the 10s function timeout is a known problem**: see "Open issues" below.

## Question schema

- 54 questions, declarative shape in [`scripts/build-questions.py`](scripts/build-questions.py).
- Generated JSON at [`data/questions.json`](data/questions.json).
- Eight widget types implemented in [`src/components/QuestionField.tsx`](src/components/QuestionField.tsx):
  `free_text`, `free_text_long` (both rendered identically — see below), `single_select`, `multi_select`, `ranking`, `likert_group`, `color_test` (external link + paste-result textarea), `industry_block` (Q15: 20 industries × {self, mother, father} matrix), `iq_matrix` (Q19: 3 categories × {harder, easier} + free-text IQ result).
- Q1 and Q54 are the Lüscher 8-color test, linking out to https://psytests.org/luscher/8color.html.

## i18n

- Translations live in `locales/<code>.json` keyed by question id (`q1.prompt`, `q15.industries.i3`, etc.).
- **Shipped & enabled**: en, ru, de, fr, it, zh, ja (7 languages).
- **`allLocales` but not enabled**: es, pt, pl, uk. Enable by adding to `src/i18n/config.ts:locales`.
- **Russian is the canonical source** (the test was authored in Russian); other locales were translated from it.
- Non-en/ru locales were LLM-translated by Claude directly in-conversation, **not yet reviewed by native speakers**. Recommend review before serious use. Most confidence: de, fr. Least confidence: zh, ja (tone/register may need adjustment).
- `scripts/translate.ts` automates re-translating from `ru.json` using the Claude API. Useful for batch regeneration.

## Test flow

The current flow (post 2026-05-16 changes):

1. **Landing page** (`/[locale]/page.tsx`) — title, language picker, privacy notice, "Start the test" button.
2. **Email gate** (`step="email"` inside `TestRunner`) — explanation of what email is for, email input, consent checkbox. User cannot proceed without both.
3. **Question pages** — paginated, 6 questions per page (`QUESTIONS_PER_PAGE = 6`). Progress bar counts answered questions out of 54. Shows "Results will be sent to {email}" reminder.
4. **Submit** — POSTs to `/api/submit`. Route validates with zod, rate-limits by IP (5/hr), inserts to Supabase, fire-and-forgets a call to `/api/interpret`.
5. **Confirmation page** (`/[locale]/confirmation`) — "Your results will arrive at {email} in ~5 minutes."
6. **/api/interpret** (background) — loads row, calls Claude, gets interpretation HTML, appends the user's submitted answers as HTML (via `renderAnswersHtml`), sends email through Resend, updates row status.

LocalStorage key `activity-test:draft:v1` persists `{ step, answers, email, consent, page }` so refresh doesn't wipe progress.

## Files of note

| Path | What |
|---|---|
| `src/components/TestRunner.tsx` | The whole test flow (email step → questions → submit) |
| `src/components/QuestionField.tsx` | Renders each of the 8 widget types |
| `src/lib/questions.ts` | Typed schema, loads `data/questions.json` |
| `src/lib/answers.ts` | `AnswerValue` types + `isAnswered` (required-field check) |
| `src/lib/interpret.ts` | Builds Claude prompt + renders answers HTML for email |
| `src/lib/supabase.ts` | Server-side Supabase client (service role) |
| `src/lib/rateLimit.ts` | IP rate limiter using Supabase `rate_limits` table |
| `src/app/api/submit/route.ts` | Submission endpoint |
| `src/app/api/interpret/route.ts` | Background interpret + email endpoint, gated by `INTERPRET_TASK_SECRET` |
| `prompts/interpret.md` | The system prompt for the AI interpreter — **edit this** to iterate, no code change needed |
| `supabase/schema.sql` | Run once in Supabase SQL editor |
| `scripts/build-questions.py` | Canonical question-shape definition |
| `scripts/translate.ts` | Claude-driven translation of `ru.json` → other locales |

## Status as of 2026-05-16

### Done

- All scaffolding, components, API routes, locale files, README, LICENSE, schema written
- Repo created at `ekaterinaehm-cmyk/activity-test-app`, pushed
- Deployed to Vercel; production URL is live and publicly accessible (Vercel Authentication / Deployment Protection toggled off)
- 7 languages enabled and rendering correctly
- All free-text inputs are now uniform 3-row textareas (Ekaterina noticed the input/textarea inconsistency)
- Email gate moved to **start** of the test (was at end). Answers will also be included in the result email so the user has a record of what they submitted.

### Open — required for the app to actually work

She is not yet through the backend wiring. Required env vars in Vercel:

| Var | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **NOT SET** — Ekaterina was about to create a Supabase project when the session paused |
| `SUPABASE_SERVICE_ROLE_KEY` | NOT SET |
| `ANTHROPIC_API_KEY` | NOT SET — she'll need to sign up at console.anthropic.com and add a payment method. This is a paid API. |
| `RESEND_API_KEY` | NOT SET — free tier is fine for the volume she'll see |
| `RESEND_FROM` | Default to `Activity Test <onboarding@resend.dev>` until she has a verified domain |
| `INTERPRET_TASK_SECRET` | NOT SET — any long random string |
| `NEXT_PUBLIC_APP_URL` | NOT SET — set to `https://activity-test-app.vercel.app` |

Until all of these are configured, `/api/submit` returns 500 and the test cannot be submitted. The landing page and the question flow itself work fine.

### Open — important caveats

1. **Vercel Hobby 10s timeout vs. Claude's 20–60s response time.** When she wires up the backend, the `/api/interpret` route will be killed mid-call on Hobby. Options:
   - Upgrade to Vercel Pro ($20/mo) — easiest.
   - Move `/api/interpret` to a Supabase Edge Function (no time limit, free).
   - Use Vercel "Background Functions" (recently launched, also Pro).
   The submission insert itself will still succeed; only the email won't arrive. The submission stays in `status='pending'` and can be retried.

2. **Translation review.** 5 of the 7 locales were LLM-translated without human review. Fine for soft-launch / personal sharing; would want native review before mass use. Russian and English are the most authoritative.

3. **`RESEND_FROM` domain verification.** Until she verifies a sending domain in Resend, only her own verified address will receive emails. Acceptable for solo testing; needs DNS records for public use.

## Conventions

- Working dir: `/Users/ekaterinaehm/projects/activity-test-app`.
- Don't bypass git hooks. Don't force-push to main.
- Commit messages use HEREDOC + `Co-Authored-By: Claude Opus 4.7 (1M context)` trailer, matching the existing history.
- User-friendly explanations are more useful than code dumps when chatting with Ekaterina.

## Next action

When the user is ready: pick up the Supabase setup walkthrough. She was at "create a new Supabase project (West EU Frankfurt, free tier)" when this note was written. After that comes:

1. Run `supabase/schema.sql` in Supabase's SQL Editor.
2. Copy `Project URL` + `service_role` key → Vercel env vars.
3. Get Anthropic API key, add billing, copy → Vercel.
4. Sign up at Resend, copy key → Vercel.
5. Generate a long random string → `INTERPRET_TASK_SECRET` in Vercel.
6. Set `NEXT_PUBLIC_APP_URL` to the production URL.
7. Redeploy (or trigger a redeploy via small commit).
8. End-to-end test: take the test, confirm submission, confirm email arrives.

Address the Hobby-timeout issue before relying on real submissions.
