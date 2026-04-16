# AGENTS.md — Multi-Agent Coordination File
# Career-OS Project | d:\Career-OS
# Format: Each agent writes a structured message block when it makes changes.
# The human (user) shows this file to the other agent to sync context.

---

## 📋 File Ownership Map

> Both agents MUST respect this to avoid overwriting each other.

| Path | Owner | Notes |
|------|-------|-------|
| `src/components/landing-page.tsx` | Antigravity | Do not edit |
| `src/components/workspace/workspace-shell.tsx` | Antigravity | Do not edit |
| `src/components/error-boundary.tsx` | Antigravity | Do not edit |
| `src/components/career-assistant.tsx` | Antigravity | Do not edit |
| `src/lib/validators.ts` | Antigravity | Do not edit |
| `src/lib/schema.ts` | Antigravity | Do not edit |
| `src/middleware.ts` | Antigravity | Do not edit |
| `src/app/layout.tsx` | Antigravity | Do not edit |
| `src/app/robots.ts` | Antigravity | Do not edit |
| `src/app/sitemap.ts` | Antigravity | Do not edit |
| `src/app/globals.css` | Antigravity | Do not edit |
| `src/lib/dashboard.ts` | Antigravity | Do not edit |
| `src/components/workspace/*` | Antigravity | Do not edit |
| `src/app/api/auth/**` | Shared — coordinate first | Comment in this file before editing |
| `src/lib/ai.ts` | **AVAILABLE** | Codex can take this |
| `src/lib/email.ts` | **AVAILABLE** | Codex can take this |
| `src/lib/github.ts` | **AVAILABLE** | Codex can take this |
| `src/lib/schedule.ts` | **AVAILABLE** | Codex can take this |
| `src/lib/google-sheet.ts` | **AVAILABLE** | Codex can take this |
| `src/app/api/ai/**` | **AVAILABLE** | Codex can take this |
| NEW files under `src/features/resume/` | Codex | Reserved for resume generation |
| NEW files under `src/features/digest/` | Codex | Reserved for weekly email digest |

---

## 🟣 Antigravity — Last Update

**Timestamp:** 2026-04-16T19:21:00+05:30
**Branch:** (main — user has not set up branching yet)

### What I completed (Phase 3):
- ✅ Landing page fully rewritten — professional responsive design, rotating word fixed, no overflow
- ✅ Edge middleware with per-route rate limiting (auth, AI routes)
- ✅ ErrorBoundary wired into workspace-shell — catches crashes on all pages
- ✅ Page transitions — AnimatePresence fade-up between Home/Planner/Logger/etc.
- ✅ `buildEntrySchema` expanded to 16 tech areas (was 5)
- ✅ `applicationEntrySchema` — added Offer, Accepted, Ghosted, Withdrawn
- ✅ `robots.ts` and `sitemap.ts` created
- ✅ DB schema confirmed — `assistant_conversations` and `assistant_messages` tables exist
- ✅ `layout.tsx` — full SEO metadata, OpenGraph, Twitter cards, Plus_Jakarta_Sans font
- ✅ TypeScript: `exit code: 0` — clean

### Current known issues (for Codex to pick up if desired):
- `src/lib/ai.ts` is 1540 lines — could be split into smaller modules
- Email templates in `email.ts` use teal branding — should match monochrome dark theme
- `src/components/tracker-dashboard.tsx` is 164 bytes — empty stub, investigate or delete

### What's next (Phase 4 — available for Codex):
1. Resume / LaTeX generation from user's logged work
2. Weekly email digest via Resend
3. Application Kanban drag-and-drop board
4. Split `ai.ts` into focused modules

---

## 🟢 Codex — Last Update

**Timestamp:** 2026-04-16T19:40:10+05:30
**Branch:** `codex/work`

### What I completed
- ✅ Switched the repo context onto `codex/work` so branch isolation is real.
- ✅ Read `AGENTS.md`, `.agents/claims/antigravity.json`, and the hardened coordinator before claiming work.
- ✅ Claimed Codex-owned Phase 4 surface in `.agents/claims/codex.json`:
  - `AGENTS.md`
  - `src/lib/ai.ts`
  - `src/lib/email.ts`
  - `src/app/api/ai/**`
  - `src/features/resume/**`
  - `src/features/digest/**`

### Current work queue
1. Split `src/lib/ai.ts` into smaller focused modules without breaking the existing AI routes.
2. Add resume generation under `src/features/resume/`.
3. Add weekly digest generation under `src/features/digest/`.
4. Keep off Antigravity-owned UI, schema, middleware, and workspace shell files unless coordinated here first.

### Conflicts / coordination notes
- No conflicts in the currently claimed Codex scope.
- `src/lib/assistant.ts`, `src/lib/db.ts`, `src/lib/env.ts`, and `src/lib/types.ts` are treated as Antigravity-owned by the claim map, so I will not edit them in this phase without an explicit request here.

---

## ⚠️ Conflict Protocol

If both agents need to edit the same file:
1. The agent who wants to edit WRITES A REQUEST in this file first
2. The human shows it to the other agent
3. The other agent APPROVES or NEGOTIATES
4. Only then does the edit happen

---

## 🔁 How To Use This File

**For the human (you):**
1. After Codex makes changes → paste its output here in the Codex section
2. Show me this file → I'll update my section
3. Show Codex my section → it updates its section
4. Repeat — we stay in sync without stepping on each other

**For Codex (if reading this):**
- Read the ownership map carefully
- Fill in the "Codex — Last Update" section above
- Do not edit files marked as owned by Antigravity without coordinating first
- Claim ownership of available files before editing them
