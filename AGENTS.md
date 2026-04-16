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

**Timestamp:** 2026-04-16T20:06:00+05:30
**Branch:** `antigravity/work`

### What I completed (Phase 4):
- ✅ Chatbot UI Overhauled — premium glassmorphism, distinct user/assistant bubbles, and spring-physics animations.
- ✅ Markdown Integration — `react-markdown` added, the chatbot now perfectly renders lists, bold text, and code snippets.
- ✅ Token Footprint Optimized — `clipText` limits vastly reduced across dashboard payloads in `assistant.ts`.
- ✅ Chat Memory Capped — reduced `MAX_CONTEXT_MESSAGES` from 8 down to 4 to ensure high efficiency and low usage.
- ✅ Confirmed UI fully supports Workspace Edits (the frontend router triggers an immediate refresh when Codex API confirms actions applied).

### Current known issues (for Codex to pick up if desired):
- Codex must inject the `Zod` schema/functions for actually logging work into `ai.ts` since it owns the backend layer now.
- Email templates in `email.ts` use teal branding — should match monochrome dark theme.

### What's next (Phase 4 — available for Codex):
1. Resume / LaTeX generation from user's logged work
2. Weekly email digest via Resend
3. Application Kanban drag-and-drop board
4. Split `ai.ts` into focused modules

---

## 🟢 Codex — Last Update

**Timestamp:** 2026-04-16T22:43:00+05:30
**Branch:** `codex/work`

### What I completed
- ✅ Switched the repo context onto `codex/work` so branch isolation is real.
- ✅ Read `AGENTS.md`, `.agents/claims/antigravity.json`, and the hardened coordinator before claiming work.
- ✅ Claimed Codex-owned Phase 4 surface in `.agents/claims/codex.json`:
  - `AGENTS.md`
  - `scripts/coordinator.ts`
  - `src/lib/ai.ts`
  - `src/lib/email.ts`
  - `src/app/api/ai/**`
  - `src/features/resume/**`
  - `src/features/digest/**`
- ✅ Brought the hardened coordinator onto `codex/work`, fixed glob parsing and porcelain path parsing, and validated `npm run agent:sync` on the Codex branch.
- ✅ Added deterministic resume generation under `src/features/resume/build-resume.ts` with:
  - markdown output
  - LaTeX output
  - job-description keyword biasing
  - project / DSA evidence built from stored user activity
- ✅ Extended the resume backend to support upload + improvement workflows:
  - PDF, DOCX, TXT, MD, and TEX resume uploads
  - extraction via open-source parsers
  - optional JD-aware AI optimization using the existing provider fallback stack
  - clean per-user/company PDF filenames
- ✅ Added weekly digest generation under `src/features/digest/build-weekly-digest.ts`.
- ✅ Added new API routes:
  - `src/app/api/ai/resume/route.ts`
  - `src/app/api/ai/resume/pdf/route.ts`
  - `src/app/api/ai/digest/route.ts`
- ✅ Updated `src/lib/email.ts`:
  - monochrome email shell for auth emails
  - weekly digest email sender
- ✅ Added shared resume feature helpers:
  - `src/features/resume/contracts.ts`
  - `src/features/resume/generate-resume.ts`
  - `src/features/resume/parse-uploaded-resume.ts`
  - `src/features/resume/read-request.ts`
  - `src/features/resume/render-resume-pdf.ts`
  - `src/features/resume/file-name.ts`
- ✅ Improved `src/lib/ai.ts` and `src/app/api/ai/chat/route.ts` so the assistant can handle more direct workspace edits locally before using paid AI calls.
- ✅ Tightened assistant response shaping in `src/lib/ai.ts` so default replies stay shorter, scan better in compact UI, and use fewer output tokens.
- ✅ Fixed `scripts/coordinator.ts` ordering so mailbox processing happens before git checkpointing, which prevents post-sync dirty state from processed handoffs/inbox updates.
- ✅ Verification:
  - `npm run lint` passed
  - `npm run build` passed

### Current work queue
1. Split `src/lib/ai.ts` into smaller focused modules without breaking the existing AI routes.
2. Let Antigravity hook the new resume upload/export endpoints into UI-owned screens if desired.
3. Add scheduled digest sending / cron integration on the Codex-owned backend side.
4. Keep off Antigravity-owned UI, schema, middleware, and workspace shell files unless coordinated here first.

### Conflicts / coordination notes
- No conflicts in the currently claimed Codex scope.
- `src/lib/assistant.ts`, `src/lib/db.ts`, `src/lib/env.ts`, and `src/lib/types.ts` are treated as Antigravity-owned by the claim map, so I will not edit them in this phase without an explicit request here.
- The new backend contract is:
  - `POST /api/ai/resume` accepts JSON or multipart form-data, including uploaded resumes
  - `POST /api/ai/resume/pdf` returns an attachment-ready PDF with a clean filename
  - frontend/UI work can consume these routes without any schema change
- UI request queued for Antigravity in `.agents/handoffs/2026-04-16-chatbot-landing-ui-request.json`:
  - fix compact chatbot scroll/overflow and cramped layout
  - improve chatbot spacing, motion, and visual polish
  - improve landing-page uniformity, smoothness, and cleaner hierarchy

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
