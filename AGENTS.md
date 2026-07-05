# AGENTS.md

This file gives coding agents the minimum project context needed to work safely and consistently.

## Project Snapshot

- Project name: `[PROJECT_NAME]`
- Product type: `[web app / landing page / SaaS / portfolio / admin tool / etc.]`
- Main goal: `[one sentence: what this project helps users do]`
- Primary users: `[who uses this]`
- Current stage: `[prototype / MVP / beta / production]`

## Tech Stack

Update this section when the stack changes.

- Frontend: `[React + Vite / Next.js / Vanilla JS / etc.]`
- Styling: `[CSS Modules / plain CSS / Tailwind / SCSS / etc.]`
- Backend: `[Supabase / Express / Firebase / none / etc.]`
- Database: `[Supabase Postgres / MySQL / localStorage / IndexedDB / none]`
- Auth: `[Supabase Auth / Firebase Auth / custom / none]`
- Payments: `[Toss Payments / Stripe / none]`
- Deployment: `[Vercel / Netlify / GitHub Pages / Render / Railway / etc.]`

## Setup Commands

Use the commands that actually exist in `package.json`. Do not invent scripts.

```bash
npm install
npm run dev
npm run build
npm run preview
```

Optional checks, only if available:

```bash
npm run lint
npm run test
npm run typecheck
```

## Repository Map

Keep this section short and update it when the structure changes.

```txt
/
├─ src/                  # Application source
├─ src/components/       # Reusable UI components
├─ src/pages/            # Page-level views or routes
├─ src/lib/              # API clients, utilities, helpers
├─ src/styles/           # Global styles, tokens, resets
├─ public/               # Static assets
├─ docs/                 # Product notes and specs
├─ AGENTS.md             # Common instructions for coding agents
├─ CLAUDE.md             # Claude Code-specific instructions
└─ README.md             # Human-facing project overview
```

## Working Rules

- Read the relevant files before editing.
- Make the smallest safe change that solves the request.
- Preserve existing behavior unless the user explicitly asks to change it.
- Do not rewrite large sections just to improve style.
- Do not add new dependencies unless clearly necessary.
- Do not rename files, routes, database tables, or environment variables without a strong reason.
- Do not change deployment settings unless the task is specifically about deployment.
- When the request is ambiguous, make a reasonable assumption and state it in the final response.
- Ask a question only when continuing would likely break the project or produce the wrong feature.

## Code Style

- Prefer clear, boring, maintainable code over clever code.
- Keep functions small and purpose-driven.
- Remove dead code, unused imports, temporary comments, and leftover `console.log`.
- Use meaningful names for variables, components, files, classes, and functions.
- Avoid duplicated logic. Extract small helpers only when reuse is real.
- Keep UI state, data fetching, and formatting logic separated when practical.
- Do not over-engineer abstractions for one-off code.

## Frontend Standards

- Use semantic HTML where possible.
- Keep layout responsive from 360px mobile width to large desktop screens.
- Check empty, loading, error, and success states when adding UI.
- Do not rely only on color to communicate meaning.
- Preserve keyboard accessibility for buttons, links, forms, dialogs, and menus.
- Use real buttons for actions and links for navigation.
- Keep text readable: avoid tiny font sizes, low contrast, and cramped spacing.

## Backend / Data Rules

- Never expose API keys, service role keys, tokens, passwords, or private URLs.
- Keep environment variables in `.env.local` or the platform settings, not in source code.
- Validate user input before sending it to the database or API.
- Handle failed requests with visible user feedback.
- Do not change database schemas casually. If schema changes are required, document the reason and migration steps.

## Design Rules

- Do not change the visual direction unless requested.
- Keep spacing, typography, radius, shadows, and colors consistent with the existing design.
- Prefer a polished simple UI over a busy decorative UI.
- When improving UI, focus on hierarchy, alignment, readability, and clear actions first.
- Avoid generic AI-looking gradients, random emojis, and decorative elements that do not support the product.

## Testing and Verification

Before finishing, run the most relevant checks available for the project.

Minimum expected verification:

```bash
npm run build
```

If a command fails:

- Do not hide the error.
- Explain the exact failing command.
- Fix the issue if it is related to the current change.
- If it is unrelated, report it as an existing issue.

Manual verification checklist:

- Main user flow still works.
- Mobile layout does not break.
- No obvious console errors.
- No secrets or local-only values were added.
- New UI has loading/empty/error states if data is involved.

## Git Rules

- Do not commit unless the user explicitly asks.
- Do not force-push.
- Do not rewrite git history.
- Do not remove files without confirming they are unused.
- Keep diffs focused on the requested task.

## Final Response Format

When done, respond with:

1. What changed
2. Files changed
3. Checks run
4. Any remaining risks or TODOs

Keep the response concise and practical.
