# PROJECT.md

This document describes the product direction, feature scope, and project decisions.

Keep this file product-focused. Put coding-agent behavior in `AGENTS.md` and Claude-specific behavior in `CLAUDE.md`.

## 1. Product Overview

- Product name: `[PROJECT_NAME]`
- One-line description: `[what the product is]`
- Main value: `[why users would use it]`
- Target users: `[who it is for]`
- Current stage: `[idea / prototype / MVP / beta / production]`

## 2. Problem

Describe the user problem in plain language.

```txt
Users currently struggle with:
- [problem 1]
- [problem 2]
- [problem 3]
```

## 3. Solution

Describe what this product gives users.

```txt
This product helps users:
- [benefit 1]
- [benefit 2]
- [benefit 3]
```

## 4. MVP Scope

These are the features required for the first usable version.

### Must Have

- [ ] `[feature 1]`
- [ ] `[feature 2]`
- [ ] `[feature 3]`

### Should Have

- [ ] `[feature 4]`
- [ ] `[feature 5]`

### Nice to Have

- [ ] `[feature 6]`
- [ ] `[feature 7]`

## 5. Out of Scope

These should not be built yet unless the project direction changes.

- `[out-of-scope item 1]`
- `[out-of-scope item 2]`
- `[out-of-scope item 3]`

## 6. Main User Flow

Write the core path users should complete.

```txt
1. User lands on the service.
2. User understands the value within a few seconds.
3. User starts the main action.
4. User enters or uploads required information.
5. User receives a useful result.
6. User saves, shares, exports, pays, or returns.
```

Replace with the real flow:

```txt
[Landing]
  → [Action]
  → [Result]
  → [Next step]
```

## 7. Pages and Routes

Update this table as routes are added.

| Route | Purpose | Main Components | Status |
|---|---|---|---|
| `/` | Landing or main entry | Hero, CTA, Preview | Planned |
| `/app` | Main app workspace | MainForm, ResultView | Planned |
| `/pricing` | Pricing page | PlanCards, FAQ | Optional |
| `/login` | Authentication | LoginForm | Optional |
| `/dashboard` | User dashboard | ProjectList, AccountPanel | Optional |

## 8. Feature Details

Use this format for each important feature.

### Feature: `[FEATURE_NAME]`

**Goal**  
`[what the feature helps users do]`

**User story**  
As a `[user type]`, I want to `[action]` so that `[benefit]`.

**Acceptance criteria**

- [ ] User can `[required behavior]`.
- [ ] System shows a clear result.
- [ ] Empty state is handled.
- [ ] Loading state is handled.
- [ ] Error state is handled.
- [ ] Mobile layout works.

**Edge cases**

- `[edge case 1]`
- `[edge case 2]`

## 9. Data Model

Update only when the project uses stored data.

### Entities

```txt
User
- id
- email
- created_at

Project
- id
- user_id
- title
- content
- created_at
- updated_at
```

### Storage Rules

- Do not store sensitive data unless necessary.
- Do not expose private user data publicly.
- Add validation before saving user-generated content.
- Keep export/import format stable once users depend on it.

## 10. Auth and Permissions

- Public users can: `[view landing page / use free demo / etc.]`
- Logged-in users can: `[save projects / manage account / etc.]`
- Admin users can: `[manage content / view reports / etc.]`

If auth is not implemented yet:

```txt
Auth is not part of the current MVP.
Do not add login, signup, profile, or account pages unless requested.
```

## 11. Pricing / Plan Logic

Use only if the project has paid plans.

| Plan | Price | Limits | Main Features |
|---|---:|---|---|
| Free | 0 | `[limit]` | `[features]` |
| Pro | `[price]` | `[limit]` | `[features]` |

Payment rules:

- Do not fake successful payments.
- Do not expose payment keys.
- Paid-only UI should be clearly marked.
- If billing is not implemented, use disabled or “coming soon” states.

## 12. UI Direction

- Style keywords: `[clean / premium / playful / minimal / dark / etc.]`
- Mood: `[trustworthy / sharp / friendly / experimental / etc.]`
- Avoid: `[visual styles to avoid]`
- Must keep: `[brand colors, layout rules, tone, etc.]`

UI quality standards:

- Clear hierarchy
- Readable text
- Enough spacing
- Strong primary CTA
- Consistent buttons and forms
- Responsive layout
- No clutter that weakens the main action

## 13. Content Tone

- Language: `[Korean / English / both]`
- Tone: `[simple / direct / friendly / professional]`
- Avoid: `[overly cute / overly corporate / vague claims / etc.]`

Example copy style:

```txt
Good: "Upload your portfolio image and preview it across real screen sizes."
Avoid: "Experience the next generation of revolutionary creative workflow."
```

## 14. Quality Checklist

Before release or deployment:

- [ ] Main flow works from start to finish.
- [ ] Mobile layout works at 360px.
- [ ] Desktop layout works at 1440px+.
- [ ] No obvious console errors.
- [ ] Build succeeds.
- [ ] Empty/loading/error states exist where needed.
- [ ] Buttons and forms are understandable.
- [ ] No secrets are committed.
- [ ] README has setup instructions.
- [ ] Deployment URL works.

## 15. Decision Log

Record important product or technical decisions.

| Date | Decision | Reason |
|---|---|---|
| YYYY-MM-DD | `[decision]` | `[reason]` |

## 16. Roadmap

### Next

- [ ] `[task]`
- [ ] `[task]`

### Later

- [ ] `[task]`
- [ ] `[task]`

### Maybe

- [ ] `[idea]`
- [ ] `[idea]`
