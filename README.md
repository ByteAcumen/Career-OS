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
- Local persistent storage with SQLite
- Encrypted per-user AI key storage on the server
- API hardening with rate limiting and security headers

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Framer Motion
- SQLite via `better-sqlite3`
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
DATABASE_FILE=./data/career-tracker.db
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
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

## Project Structure

- `src/app` - routes and API handlers
- `src/components` - dashboard UI, planner, analytics, and settings surfaces
- `src/lib` - storage, AI, and shared server logic
- `data` - local SQLite database file

## Production Direction

This repository currently uses SQLite for a reliable local workflow. A production-ready hosted version can be extended by:

1. Deploying the app to Vercel
2. Swapping the storage layer to hosted PostgreSQL
3. Keeping Google Sheets as an export/reporting surface
4. Keeping AI keys only on the server

## License

MIT. See [LICENSE](./LICENSE).
