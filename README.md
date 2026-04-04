# Career OS

A full-stack student workspace for interview prep, project execution, planner management, and job application tracking.

## Features

- Multi-user auth with isolated student data
- Daily study tracker with revision, deep-work, and shutdown review blocks
- Daily, weekly, and weekend task planner with customizable targets
- DSA logging with difficulty, pattern, insight, and proof link
- Build logging for frontend, backend, TypeScript, AI, and system design work
- Application tracking with Google Sheets sync support
- Personalized settings for profile links, target role, planning style, and weekly theme
- AI task-pack suggestions, coaching, and motivational header quotes
- AI coach panel with switchable providers:
  - OpenAI
  - Gemini
  - OpenRouter
- Weekend-aware schedule blocks tuned for an 8 AM to 8 PM office routine
- Weekly targets with progress tracking
- Built-in focus timer with browser reminders
- One-click calendar export for your daily schedule
- GitHub and LeetCode profile linking
- Hosted Turso storage with per-user isolation
- Encrypted per-user AI key storage on the server
- API hardening with rate limiting and security headers

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Framer Motion
- Turso / libSQL via `@libsql/client`
- OpenAI SDK plus provider-specific server-side integrations

## Why This Exists

Most study trackers are either too generic, too manual, or too fragile. Career OS is built for a real placement grind:

- office-heavy weekdays
- stronger weekend execution windows
- continuous DSA proof
- visible project output
- application follow-up that does not get lost

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a local `.env` file:

```bash
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=Career OS <onboarding@resend.dev>
OPENAI_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
```

Only `.env.example` is meant for version control. Real keys stay in `.env` locally.

## AI Provider Setup

The app lets you choose the active AI provider from the Settings page.

- `openai` uses the OpenAI Responses API
- `gemini` uses the Gemini REST API
- `openrouter` uses OpenRouter's OpenAI-compatible chat completions endpoint

If the selected provider key is missing, the AI features stay disabled instead of failing noisily.

Recommended default:

- OpenRouter for daily usage and model flexibility
- Gemini as a reliable backup
- OpenAI when you want premium structured coaching and have quota available

## Google Sheets Sync

To enable application sync:

1. Deploy your Google Apps Script webhook
2. Paste the webhook URL into the Settings page
3. Save settings
4. Use the sync button from the dashboard

## Google OAuth Setup

Google sign-in must authorize the Better Auth callback URI.

Add these Authorized redirect URIs in Google Cloud:

- `http://localhost:3000/api/auth/callback/google`
- `${BETTER_AUTH_URL}/api/auth/callback/google`

For Vercel, `BETTER_AUTH_URL` should be your live deployment origin, for example:

- `https://career-os-tawny.vercel.app`

If preview deployments use different domains, either add those preview callback URIs too or keep Google sign-in limited to the production domain.

## Password Reset Email

Password reset requires a valid Resend key and a verified sender:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

The reset flow redirects users back to `/reset-password` with a secure token after Better Auth validates the email link.

## Project Structure

- `src/app` - routes and API handlers
- `src/components` - dashboard UI, planner, analytics, and settings surfaces
- `src/lib` - storage, AI, and shared server logic
- `data` - local scratch/test files only

## Production Direction

This repository is structured for a hosted deployment:

1. Deploy the app to Vercel
2. Point production at Turso with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
3. Configure Google OAuth callback URIs for the deployed origin
4. Configure Resend for password reset delivery
5. Keep AI keys only on the server

## License

MIT. See [LICENSE](./LICENSE).
