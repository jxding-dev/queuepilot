# CLAUDE.md

Claude Code guidance for this repository.

This file combines strict LLM coding mistake-prevention rules with practical project workflow rules. It is intentionally cautious: correctness, maintainability, and small safe diffs matter more than speed.

## Instruction Priority

Follow instructions in this order:

1. The user's current request
2. This `CLAUDE.md`
3. `AGENTS.md`
4. Existing project conventions
5. General best practices

If instructions conflict, do not guess silently. Explain the conflict briefly and ask, unless the user's current request makes the priority obvious.

## Project Context

Fill this section once per project.

- Product name: `[PROJECT_NAME]`
- Core purpose: `[what this project does in one sentence]`
- Main user flow: `[entry → action → result]`
- Main business rule: `[the one thing that must not break]`
- Deployment target: `[Vercel / Netlify / GitHub Pages / etc.]`
- Production URL: `[optional]`
- Primary users: `[who uses this and why]`

## Core Operating Mode

Work like a careful senior frontend/product engineer.

1. Inspect the existing structure before editing.
2. State important assumptions when they matter.
3. Identify the smallest safe change.
4. Make focused edits only.
5. Verify with the smallest relevant check.
6. Report what changed, what was checked, and what remains.

Do not turn a small request into a full rewrite.

---

# Golden Rules

## 1. Think Before Coding

Do not assume. Do not hide confusion. Surface tradeoffs.

Before implementing:

- State important assumptions explicitly.
- If something is uncertain, ask before coding.
- If multiple interpretations exist, present them instead of silently choosing one.
- If a simpler approach exists, say so.
- Push back respectfully when the requested approach is risky, overcomplicated, or harmful to the project.
- If a requirement is unclear, stop and name the confusing part.

Use extra caution when the task touches architecture, data structure, authentication, payment, deployment, database rules, secrets, or multiple files.

## 2. Simplicity First

Write the minimum code that solves the problem. Nothing speculative.

- Do not add features beyond what was asked.
- Do not create abstractions for one-use code.
- Do not add flexibility, configurability, or plugin systems unless requested.
- Do not add error handling for impossible or irrelevant scenarios.
- Prefer boring, readable code over clever code.
- Prefer existing project patterns over introducing new ones.
- If 200 lines can be rewritten as 50 clear lines, simplify before finishing.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

Touch only what is necessary. Clean up only your own mess.

When editing existing code:

- Do not improve adjacent code, comments, formatting, or naming just because you noticed it.
- Do not refactor code that is not broken.
- Match the existing style, even if another style seems better.
- Avoid broad formatting changes that create noisy diffs.
- If unrelated dead code is found, mention it but do not delete it unless asked.
- Do not rewrite whole files unless the task clearly requires it.

When your changes create unused code:

- Remove imports, variables, functions, or components made unused by your change.
- Leave pre-existing dead code untouched unless cleanup was requested.

Diff test: every changed line should directly support the user's request. If not, revert it.

## 4. Goal-Driven Execution

Define success criteria. Loop until verified.

Convert vague tasks into verifiable goals:

- "Add validation" → verify invalid inputs are handled.
- "Fix bug" → reproduce or locate the bug, then confirm the fix addresses the cause.
- "Refactor X" → confirm behavior still works before and after.
- "Improve UI" → confirm relevant responsive widths and states still work.

For multi-step tasks, state a short plan before coding:

```txt
1. [Step] → Verify: [what will be checked]
2. [Step] → Verify: [what will be checked]
3. [Step] → Verify: [what will be checked]
```

Avoid vague success criteria like "make it work" unless the user already defined what working means.

---

# Project Priorities

Use these priorities when making tradeoffs:

1. Existing features must keep working.
2. UI must remain clean, readable, and responsive.
3. Code should be easy to maintain.
4. Avoid unnecessary dependencies.
5. Prefer finishing the requested task over broad refactoring.
6. Prefer simple, verifiable changes over clever abstractions.
7. Preserve user data, configuration, routes, and deployment behavior.

## File Reading Rules

Before editing:

- Read files directly related to the task.
- Check existing project structure and naming conventions.
- Check `package.json` before assuming available commands.
- Confirm files, routes, APIs, components, and database tables exist before using them.

Do not invent project structure.

## Planning Rules

Use a plan when the task is multi-file, risky, ambiguous, or architecture-changing.

Keep plans short. A good plan includes:

- What will change
- Which files are likely involved
- How the result will be verified

Use todo tracking only for genuinely multi-step work.

## Feature Rules

Before adding a feature, identify:

- User goal
- Required UI
- Required state/data
- Files likely to change
- Realistic edge cases
- Verification method

Build the smallest complete version first.

A feature is incomplete if it needs an empty, loading, disabled, validation, or error state and that state is missing.

Do not add fake integrations, placeholder buttons, mock-only production paths, or future features unless requested.

## Bug Fix Rules

When fixing bugs:

1. Reproduce or locate the bug from the code.
2. Explain the likely cause briefly.
3. Fix the root cause, not only the visible symptom.
4. Check nearby related code for the same issue.
5. Run the smallest relevant verification command.
6. Report any remaining risk or unverified area.

Avoid speculative rewrites.

## Refactoring Rules

Refactor only when it directly helps the requested task.

Allowed:

- Remove duplicated logic related to the change.
- Rename unclear local variables touched by the change.
- Extract a component/helper when it clearly improves the changed code.
- Simplify deeply nested logic directly related to the task.
- Remove code made unused by the current change.

Avoid:

- Folder-wide reorganization
- Style-only rewrites across many files
- Replacing state management
- Changing build tools
- Migrating frameworks
- Rewriting working code just because it looks old
- Updating unrelated dependencies

## UI Editing Rules

For UI tasks, check relevant states and widths:

- Mobile around 360px
- Tablet around 768px
- Desktop around 1440px
- Long text overflow
- Empty state
- Loading state
- Error state
- Disabled state
- Hover/focus state
- Form validation feedback
- Keyboard focus visibility where relevant
- Mobile tap target size

Keep changes consistent with the existing design system.

Do not redesign the whole screen unless the user asked for a redesign.

## Security and Sensitive Files

Do not touch these unless the task explicitly requires it:

- `.env` files
- Secrets or tokens
- Deployment config
- Database policies
- Production credentials
- Payment, auth, analytics, or tracking setup

Never expose API keys, passwords, tokens, private URLs, user data, or credentials in code, logs, screenshots, commits, or final responses.

## Dependencies

Do not add dependencies unless necessary.

Before adding one:

- Check whether the project already has a suitable package.
- Prefer built-in browser/platform APIs for small tasks.
- Explain why the dependency is needed.
- Avoid large libraries for simple utilities.

## Useful Project Commands

Update this section with actual scripts from `package.json`.

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

Before running commands, check `package.json` and use only scripts that exist.

## Verification Checklist

Before finishing, check what is relevant:

- No unused imports introduced
- No unused variables introduced
- No accidental debug logs
- No hardcoded local URLs
- No exposed secrets
- No broken routes
- No unrelated formatting churn
- No large unrelated diffs
- Existing behavior still works where relevant
- Build passes if the project has a build command
- Tests pass if relevant tests exist
- Lint passes if linting is configured

Do not claim a check passed if it was not run.

If checks fail, report:

- The command that failed
- The relevant error
- Whether the failure appears related to the current change

## Final Response Format

Keep final responses short and concrete.

```txt
Done.

Changed:
- ...

Checked:
- ...

Notes:
- ...
```

If something could not be completed, say exactly what blocked it and which file or command caused the issue.

## Memory Maintenance

If a stable project fact will matter later, suggest adding it to this file or `AGENTS.md`.

Do not store temporary task details here.

## Source Note

This file adapts and merges LLM coding mistake-prevention guidance provided by the user, including the source note:

- https://americanopeople.tistory.com/514

It also includes practical Claude Code project rules for UI work, bug fixing, feature work, refactoring, verification, security, and final reporting.
