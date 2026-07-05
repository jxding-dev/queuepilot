# QueuePilot — Product & Implementation Blueprint (v1)

> QueuePilot is a browser-based CSV-to-API batch runner: one CSV row = one API request.
> This document is the v1 product and implementation blueprint. Implementation phases are in §20.

## 1. Product Summary

**What it is.** QueuePilot is a web app that turns a CSV file into a batch of API requests. You upload a CSV, build one request template with placeholders like `{{email}}`, and QueuePilot sends one request per row — with a concurrency limit, delays, retries, live per-row status, and a downloadable result CSV.

**The problem it solves.** Today, "call this API once per row of this spreadsheet" has three bad answers:

- **Write a script** — most operators, marketers, and admins can't, or don't want to maintain one.
- **Use Postman** — Postman's Collection Runner *can* do CSV iteration, but it's buried inside a developer tool, gives poor per-row failure visibility, and produces no merged result file.
- **Use Zapier/n8n** — powerful, but you're building a workflow, mapping triggers, and paying per task, all to do something that is conceptually just a loop.

QueuePilot is the fourth answer: a tool where the CSV is the main object, not the request.

**Why it's different:**

| | Postman | CSV cleaners | Zapier/n8n | QueuePilot |
|---|---|---|---|---|
| Primary object | The request | The file | The workflow | The CSV batch |
| Per-row status & failure reason | Weak | N/A | Per-execution logs, scattered | First-class |
| Retry only failed rows | No | N/A | Manual re-trigger | One click |
| Results merged back into CSV | No | N/A | No | Core feature |
| Audience | Developers | Data people | Ops generalists | Non-developers with an API to call |

The one-line pitch: **"Upload a CSV, map columns into an API request, run the batch safely, download the results."**

## 2. Target Users

**Persona 1 — Mina, CRM marketer at a mid-size e-commerce company.**
Pain: She needs to issue 2,000 coupon codes through the company's internal coupon API. Engineering says "it's one POST per user, here's the endpoint" and then deprioritizes her ticket. QueuePilot lets her run it herself in 20 minutes with the customer export she already has, and hand back a CSV showing which users got coupons.

**Persona 2 — Daniel, operations manager at a logistics startup.**
Pain: A vendor migration means 5,000 shipment records need a PATCH to update carrier codes. He knows Excel deeply, knows what an API is roughly, and does not write Python. QueuePilot's sample-test-first flow gives him confidence he won't corrupt production data at scale.

**Persona 3 — Sofia, solo admin for a small SaaS business.**
Pain: She manages users across tools (helpdesk, billing, mailing list) that all have REST APIs but no bulk UI. Deactivating 300 churned accounts currently means 300 manual clicks. QueuePilot is her "bulk actions button" for any tool with an API.

**Persona 4 — Jae, junior developer / support engineer.**
Pain: He *could* write a script, but every one-off script re-solves rate limiting, retries, and logging — and a bug at row 400 of 3,000 is painful. QueuePilot is faster and safer than a throwaway script, and produces an audit-ready result file he can attach to the ticket.

**Persona 5 — Priya, no-code builder.**
Pain: She lives in Airtable/Notion/Make. For a one-time backfill of 1,500 records via API, building a Make scenario burns operations quota and time. QueuePilot handles one-time bulk jobs that don't deserve a permanent automation.

## 3. Real Use Cases

1. **Coupon distribution** — POST a unique coupon code to a promotions API for each customer in a campaign export.
2. **CRM field backfill** — PATCH 3,000 contact records to add a new custom field after a data migration.
3. **Bulk user deactivation** — DELETE or PATCH-deactivate churned users exported from a billing system.
4. **Mailing list sync** — POST subscribers from a legacy export into a new email platform's API.
5. **Product catalog price update** — PUT updated prices for 800 SKUs from a supplier's price sheet into a store API.
6. **Helpdesk ticket tagging** — PATCH a batch of old tickets with a new category taxonomy.
7. **Inventory/status verification** — GET each order's status by ID and export the responses next to the original rows for a reconciliation report.
8. **Webhook/endpoint backfill** — Re-POST historical events to a new integration endpoint that missed them.
9. **Address or data enrichment** — GET a validation/enrichment API per row and capture the response body into the result CSV.
10. **Membership/permission updates** — PATCH role changes for a department reorganization from an HR export.

The pattern in all of these: *the data already exists as a CSV, the API already exists, and the missing piece is a safe loop.*

## 4. MVP Scope

| # | Feature | Priority | Notes |
|---|---|---|---|
| 1 | CSV upload (file picker + drag-and-drop) | Must | PapaParse, header row required |
| 2 | CSV column preview (first ~20 rows) | Must | Confirms parse correctness |
| 3 | Method selection (GET/POST/PUT/PATCH/DELETE) | Must | |
| 4 | URL template with `{{column}}` variables | Must | Live preview using row 1 |
| 5 | Header editor (key/value pairs, variables allowed) | Must | |
| 6 | Body template editor (raw text/JSON with variables) | Must | Hidden for GET/DELETE by default |
| 7 | Variable picker (click column → insert `{{col}}`) | Must | The key non-developer affordance |
| 8 | Concurrency setting | Must | Via presets; custom allowed |
| 9 | Delay between requests | Must | Via presets; custom allowed |
| 10 | Rate limit presets (Safe/Balanced/Fast) | Must | Default: Safe |
| 11 | Start / Pause / Resume / Stop | Must | Core trust feature |
| 12 | Per-row status (pending/running/success/failed/skipped) | Must | |
| 13 | Per-row failure reason | Must | Human-readable, not just status codes |
| 14 | Retry failed rows only | Must | |
| 15 | Sample test (first 5 rows) before full run | Must | Gate: full run disabled until sample runs once |
| 16 | Export result CSV (original columns + result columns) | Must | |
| 17 | Pre-run validation rules (required, email, URL, number, contains/equals, skip-if-empty) | Should | Ship required + skip-if-empty first, rest in same phase |
| 18 | Request timeout setting | Should | Fixed 30s default is acceptable at first |
| 19 | Response body capture in results (truncated) | Should | Very useful for GET/enrichment cases |
| 20 | Save/load request config in localStorage | Should | Quality of life; no accounts needed |
| 21 | Auto-retry with backoff on 429 | Later | v1: mark failed with clear reason |
| 22 | Import/export config as JSON file | Later | |
| 23 | Response field extraction (JSONPath-lite) into a named column | Later | Powerful but scope creep for v1 |
| 24 | Run history | Later | |

## 5. Non-Goals

| Excluded | Why it should wait |
|---|---|
| Login/auth, cloud DB, backend | The entire v1 value works client-side. A backend adds cost, security liability (users' API keys!), and weeks of work before validating demand. |
| Payment system | Nothing to charge for until people demonstrably use the free version for real work. |
| Scheduling | Requires a backend or an always-open tab; a bulk *runner* is a foreground activity anyway. |
| Team collaboration | No accounts, no teams. Sharing = exporting a config JSON, later. |
| Workflow builder / chained requests | The moment you chain requests, you're rebuilding n8n and you lose the "it's just a loop" clarity. |
| Scripting language | Postman's pre-request scripts are exactly the intimidation QueuePilot avoids. |
| AI features | Adds cost and no core value; the mapping UI should be simple enough not to need it. |
| Webhook receiving | Requires a server. |
| Browser extension | Separate distribution and review pipeline; only justified later as a CORS mitigation if demand proves out. |
| Collections/marketplace/enterprise | These are year-2 problems for a product with users. |

## 6. User Flow

A single linear flow with four steps, always visible in a stepper. The user can move backward freely; moving forward is gated by completion.

```
Step 1: Upload          Step 2: Configure         Step 3: Test & Run        Step 4: Results
┌──────────────┐       ┌───────────────────┐     ┌──────────────────┐     ┌────────────────┐
│ Drop CSV     │──────▶│ Method + URL      │────▶│ Run Sample (5)   │────▶│ Result table   │
│ Parse+preview│       │ Headers           │     │ Review sample    │     │ Filter: failed │
│ Confirm cols │       │ Body template     │     │ Pick rate preset │     │ Retry failed   │
└──────────────┘       │ Insert {{vars}}   │     │ Start full run   │     │ Export CSV     │
                       │ Validation rules  │     │ pause/resume/stop│     └────────────────┘
                       └───────────────────┘     └──────────────────┘
```

Detailed sequence:

1. **Upload CSV** → drag-and-drop or file picker → parse → show row count, detected columns, and any parse warnings.
2. **Preview columns** → table of first 20 rows; user visually confirms headers are right.
3. **Configure request** → method dropdown, URL field, headers, body. A live "Preview with row 1" panel renders the fully-substituted request at all times.
4. **Map variables** → not a separate mapping screen; the user inserts `{{column}}` tokens via the variable picker directly into URL/headers/body. Unknown tokens are flagged inline.
5. **Add validation** (optional) → simple rule list, e.g. "email — must be valid email", "user_id — skip row if empty". Shows count of rows that would fail/skip.
6. **Run sample test** → executes rows 1–5 with the chosen settings, shows results in the same result-table component. Full run button unlocks after a sample run (user may proceed even if sample rows failed — with a warning).
7. **Run full batch** → progress bar, live counts, live-updating row table.
8. **Pause/resume/stop** → pause finishes in-flight requests then holds; stop aborts in-flight and finalizes.
9. **Review results** → filterable table (All / Success / Failed / Skipped), failure reason column, response snippet.
10. **Retry failed rows** → re-queues only failed rows; successes are preserved.
11. **Export result CSV** → original columns + `qp_status`, `qp_http_status`, `qp_error`, `qp_response`, `qp_attempts`, `qp_completed_at`.

## 7. Page Structure

One app route plus two static pages. No router library needed for the app itself (the stepper is state, not routes).

| Route | Contents |
|---|---|
| `/` | Landing page: value prop, 3-step explainer, screenshot/animation, "Open the app" button, email capture for updates. (Can be the app itself at first; split later for marketing.) |
| `/app` | The entire tool: stepper with Upload → Configure → Test & Run → Results. All state lives here. |
| `/privacy` | Static page: "your data never leaves your browser" explained in plain language. Doubles as a trust asset. |

Rationale: the batch run is a single continuous session with in-memory state; splitting it across routes creates state-loss bugs and back-button hazards for exactly the audience that will hit them.

## 8. UI/UX Design Direction

**Layout.** Single-column, max-width ~1100px, stepper across the top. Step 3/4 use a two-zone layout: sticky control/progress bar on top, row table below. No sidebar — sidebars signal "complex tool."

**Visual tone.** Calm and operational, like a modern admin tool: white/neutral background, one accent color (a confident blue or teal), generous whitespace, system font stack or Inter. Status colors are the loudest thing on screen: gray (pending), blue (running), green (success), red (failed), amber (skipped). No dark hacker theme; code font only inside the body template editor and response snippets.

**Dashboard structure (Run screen).**

```
┌─────────────────────────────────────────────────────┐
│  ▶ Running…   [Pause] [Stop]     Preset: Safe 🛡    │
│  ████████████░░░░░░░░░░  412 / 1,000                │
│  ✓ 398 success   ✗ 9 failed   ↷ 5 skipped   ~4m left│
├─────────────────────────────────────────────────────┤
│  [All] [Failed] [Skipped]                 Search 🔎 │
│  # │ email            │ status  │ reason            │
│  12│ a@b.com          │ ✗ failed│ 404 — user not…   │
└─────────────────────────────────────────────────────┘
```

**Making it non-intimidating:**

- Speak in rows, not requests: "Send 1,000 rows," "9 rows failed" — never "execute batch."
- Always-visible live preview of the real request built from row 1, so `{{tokens}}` never feel abstract.
- Insert variables by clicking a column chip, not by typing syntax.
- Safe defaults everywhere: Safe preset selected, sample test required before the full-run button enables, GET has no body editor.
- Translate errors: "The server said this user doesn't exist (404)" instead of a raw status line.
- Progressive disclosure: headers and validation are collapsed sections; a GET-with-no-auth user never sees JSON.

**UX copy examples:**

| Context | Copy |
|---|---|
| Upload empty state | **"Drop your CSV here"** — "Each row will become one API request. Your file stays in your browser — nothing is uploaded to us." |
| Sample test button | **"Test with first 5 rows"** — subtext: "Recommended before running everything." |
| Full run button (locked) | **"Send all 1,000 rows"** (disabled) — tooltip: "Run a 5-row test first so you can check the results." |
| Aggressive preset warning | ⚠️ "Fast sends 5 requests at once. Some APIs will block you for this. If you're not sure, use Safe — it's slower but rarely gets blocked." |
| Destructive method warning | ⚠️ "You're about to send **DELETE** requests for 1,000 rows. This usually can't be undone. The 5-row test will delete real data too." |
| Pause state | "Paused at row 412. Nothing else will be sent until you resume." |
| CORS error | "Your browser blocked this request before it was sent (CORS). This is a browser security rule, not a bug in your setup. → What you can do" (links to a short explainer) |
| Retry entry point | "9 rows failed. **Retry failed rows** — your 398 successful rows won't be sent again." |
| Export button | **"Download results (.csv)"** — "Your original columns plus status, error, and response columns." |
| Stop confirm | "Stop this run? 588 rows haven't been sent. You can download results for the 412 finished rows." |

## 9. Component Structure

```
src/
├── App.tsx                     // Stepper shell + step routing
├── components/
│   ├── stepper/StepNav.tsx
│   ├── upload/
│   │   ├── CsvDropzone.tsx         // drag-drop + file input + parse trigger
│   │   ├── CsvPreviewTable.tsx     // first 20 rows, column headers, warnings
│   │   └── CsvSummaryBar.tsx       // "1,000 rows · 6 columns · 2 warnings"
│   ├── builder/
│   │   ├── RequestBuilder.tsx      // composes the pieces below
│   │   ├── MethodUrlBar.tsx        // method select + URL template input
│   │   ├── HeaderEditor.tsx        // key/value rows, add/remove
│   │   ├── BodyEditor.tsx          // textarea w/ token highlighting + JSON check
│   │   ├── VariablePicker.tsx      // column chips; inserts {{col}} at cursor
│   │   ├── RequestPreview.tsx      // rendered request using row 1
│   │   └── TemplateInput.tsx       // shared input that supports {{tokens}}
│   ├── validation/
│   │   ├── ValidationPanel.tsx     // rule list + add rule
│   │   ├── ValidationRuleRow.tsx   // column + rule type + value + on-fail
│   │   └── ValidationSummary.tsx   // "23 rows will be skipped"
│   ├── run/
│   │   ├── RunControls.tsx         // sample test / start / pause / resume / stop
│   │   ├── RatePresetSelector.tsx  // Safe/Balanced/Fast + custom + warnings
│   │   ├── ProgressSummary.tsx     // bar, counts, ETA
│   │   └── SampleResultCallout.tsx // verdict after sample run
│   ├── results/
│   │   ├── ResultTable.tsx         // virtualized row table w/ status filter
│   │   ├── ResultRowDetail.tsx     // expandable: full error + response snippet
│   │   ├── RetryFailedButton.tsx
│   │   └── ExportPanel.tsx         // download CSV (all / failed only)
│   └── common/                     // Button, StatusBadge, WarningBanner, ConfirmDialog, EmptyState
├── engine/
│   ├── queueRunner.ts              // the promise-pool executor (framework-free)
│   ├── templating.ts               // {{token}} substitution + token extraction
│   ├── validation.ts               // rule evaluation
│   └── errors.ts                   // error → {category, humanMessage} mapping
├── lib/
│   ├── csv.ts                      // parse (PapaParse wrapper) + export
│   └── presets.ts                  // rate limit presets
└── state/
    └── store.ts                    // Zustand store (see §11)
```

Key decision: **`engine/` has zero React imports.** The queue runner, templating, and validation are plain TypeScript — unit-testable and interview-explainable.

## 10. Data Model

```typescript
// ---- CSV ----
type CsvRow = Record<string, string>;          // header name → cell value (Papa keeps strings)

interface CsvData {
  fileName: string;
  columns: string[];                            // ordered, deduped headers
  rows: CsvRow[];
  parseWarnings: string[];                      // e.g. "Row 14: too few fields"
}

// ---- Request template ----
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface HeaderEntry { id: string; key: string; value: string; enabled: boolean; }

interface RequestTemplate {
  method: HttpMethod;
  urlTemplate: string;                          // "https://api.x.com/users/{{user_id}}"
  headers: HeaderEntry[];
  bodyTemplate: string;                         // raw text, usually JSON, with {{tokens}}
  timeoutMs: number;                            // default 30_000
}

// ---- Variables (derived, not stored) ----
interface TemplateVariable {
  token: string;                                // "user_id"
  usedIn: ('url' | 'header' | 'body')[];
  matchedColumn: string | null;                 // null → unresolved, blocks run
}

// ---- Validation ----
type ValidationRuleType =
  | 'required' | 'email' | 'url' | 'number' | 'contains' | 'equals';

interface ValidationRule {
  id: string;
  column: string;
  type: ValidationRuleType;
  value?: string;                               // for contains/equals
  onFail: 'skip' | 'fail';                      // skip row vs mark failed (never sent)
}

// ---- Execution ----
type RowStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

type ErrorCategory =
  | 'validation' | 'template' | 'network' | 'cors' | 'timeout'
  | 'http_4xx' | 'http_429' | 'http_5xx' | 'aborted';

interface RowResult {
  rowIndex: number;                             // index into CsvData.rows
  status: RowStatus;
  attempts: number;
  httpStatus?: number;
  errorCategory?: ErrorCategory;
  errorMessage?: string;                        // human-readable
  responseSnippet?: string;                     // first ~500 chars of body
  durationMs?: number;
  completedAt?: string;                         // ISO
}

// ---- Run summary ----
type RunPhase = 'idle' | 'sampling' | 'running' | 'pausing' | 'paused' | 'stopping' | 'done';
type RunMode = 'sample' | 'full' | 'retry';

interface RunSettings { concurrency: number; delayMs: number; presetId: 'safe' | 'balanced' | 'fast' | 'custom'; }

interface RunSummary {
  mode: RunMode;
  phase: RunPhase;
  settings: RunSettings;
  total: number;
  counts: Record<RowStatus, number>;
  startedAt?: string;
  finishedAt?: string;
}
```

Note: there is no separate `QueueItem` object — the queue is just `rowIndex` order plus each row's `RowResult.status`. One source of truth, no synchronization bugs.

## 11. State Model

One Zustand store (justification: run state updates hundreds of times per run and is read by controls, progress bar, and table — context+reducer would either rerender everything or need manual selector plumbing; Zustand is ~1KB). Total dependencies for v1: **react, vite, typescript, papaparse, zustand**, plus optionally a row-virtualization lib.

| Slice | Contents | Persistence |
|---|---|---|
| `csv` | `CsvData \| null` | Memory only |
| `config` | `RequestTemplate`, `ValidationRule[]`, `RunSettings` | localStorage — **strip Authorization-like header values by default, opt-in to save them** |
| `run` | `RunSummary`, `results: Map<number, RowResult>`, `sampleCompleted: boolean` | Memory only |
| `ui` | current step, active result filter, expanded row, dismissed warnings, open dialogs | Memory only |

Rules:

- **Derived, never stored:** template variables, unresolved-token list, validation preview counts, progress percentages, ETA — all computed via selectors/`useMemo`.
- **The engine doesn't own state.** `queueRunner` receives rows + config and emits events (`rowStarted`, `rowFinished`, `runFinished`); the store subscribes and updates. Result-table updates are batched (flush every ~100ms).
- **Editing config is locked while `phase` is not `idle`/`done`.**

## 12. Core Queue Logic

A **promise pool with a shared cursor** — about 80 lines, no library.

```typescript
// engine/queueRunner.ts — conceptual core
async function runQueue(opts: {
  rowIndexes: number[];                 // pending rows, in order
  execute: (rowIndex: number, signal: AbortSignal) => Promise<RowResult>;
  concurrency: number;
  delayMs: number;
  control: RunControl;                  // shared flags: stopped, paused (with a promise gate)
  onResult: (r: RowResult) => void;
}) {
  let cursor = 0;
  const controller = new AbortController();

  async function worker() {
    while (true) {
      if (opts.control.stopped) return;
      await opts.control.whenNotPaused();      // resolves immediately if not paused
      const i = cursor++;                      // JS is single-threaded: no race
      if (i >= opts.rowIndexes.length) return;
      const rowIndex = opts.rowIndexes[i];
      const result = await opts.execute(rowIndex, controller.signal);
      opts.onResult(result);
      if (opts.delayMs > 0) await sleep(opts.delayMs);
    }
  }

  opts.control.onStop(() => controller.abort()); // hard-cancels in-flight fetches
  await Promise.all(Array.from({ length: opts.concurrency }, worker));
}
```

Behavior specification:

- **Pending queue:** the ordered list of row indexes whose status is `pending` (after validation marks skips/fails).
- **Active requests:** at most `concurrency` workers; each has at most one in-flight `fetch`. Rows are `running` while picked up.
- **Completed/failed:** `execute` never throws — all errors are caught inside it and classified (§16).
- **Delay:** applied per worker after each request, so effective rate ≈ `concurrency / ((avgLatency + delayMs) / 1000)` req/s.
- **Pause:** promise-gate flag. Workers finish their current request, then park. UI shows `pausing` until active count hits 0, then `paused`. In-flight requests are NOT aborted on pause.
- **Resume:** resolves the gate; workers continue from the shared cursor. Nothing is re-sent.
- **Stop:** sets `stopped` and aborts in-flight fetches. In-flight rows → `failed / aborted` ("Stopped by you before a response arrived — this request may or may not have reached the server"). Remaining rows stay `pending`. Phase → `done`.
- **Retry failed:** new `rowIndexes` from rows with `status === 'failed'`, reset to `pending`, increment `attempts`, run again with `mode: 'retry'`.
- **Sample run:** same machinery with first 5 valid pending rows and `mode: 'sample'`; results reset to `pending` before the full run (warn about re-sending for non-idempotent methods, or offer "skip the 5 sampled rows" checkbox).

## 13. Rate Limiting Strategy

| Preset | Concurrency | Delay | Effective rate* | When |
|---|---|---|---|---|
| 🛡 **Safe** (default) | 1 | 1000ms | ~0.7/s | Unknown APIs, production data, first runs |
| ⚖️ **Balanced** | 3 | 500ms | ~3/s | APIs you've used before with known headroom |
| ⚡ **Fast** | 5 | 200ms | ~7/s | APIs with documented generous limits |
| 🛠 Custom | 1–10 | 0–10000ms | — | Power users; capped at 10 concurrent |

\* assuming ~400ms API latency; show a live "≈ X requests/second" estimate.

Warning ladder:

- **Fast** selected: inline amber note about 429s.
- **Custom above 5 concurrent or 0 delay**: persistent warning banner + explicit acknowledgment checkbox.
- **During a run**: if ≥ 3 responses are 429, auto-pause and explain, suggest lowering speed then resuming. This is the biggest cheap trust-builder.

Hard cap concurrency at 10.

## 14. CSV Parsing and Export

**Parsing** — PapaParse: `header: true`, `skipEmptyLines: 'greedy'`, `dynamicTyping: false` (everything stays strings; templating decides types explicitly).

**Column names:** trim whitespace; keep casing for display; duplicate headers → suffix (`email_2`) + warning; empty header → `column_3` by position + warning. Variable matching is case-sensitive against the displayed name (picker inserts exact tokens).

**Invalid rows:** field-count mismatches import what parsed + warning, flagged in preview. Never silently drop rows. Validation-failing rows are marked `skipped`/`failed` before the run, with counts shown up front.

**Templating into JSON bodies:** `{{token}}` substitution is string substitution with **JSON-string escaping** so quotes/newlines in cells can't corrupt the body. Raw numbers/booleans: write `"count": {{count}}` without quotes → inserted verbatim. Live JSON-validity check on the row-1 preview.

**Result columns** — appended, prefixed `qp_` (suffix ours on collision):

| Column | Content |
|---|---|
| `qp_status` | success / failed / skipped / pending |
| `qp_http_status` | e.g. 200, 404; empty for network errors |
| `qp_error` | human-readable failure/skip reason |
| `qp_response` | response snippet (~500 chars) |
| `qp_attempts` | 1, 2, … |
| `qp_completed_at` | ISO timestamp |

**Export:** `Papa.unparse` → Blob download, `originalname.results.csv`. Two buttons: "All rows" and "Failed rows only". Available at any time, including after a stopped run. UTF-8 BOM for Excel compatibility.

## 15. Validation Rules

Flat rule list, not a rule engine. A rule = **column + check + (optional value) + on-fail action**:

| Check | Passes when | UI sentence |
|---|---|---|
| `required` | non-empty after trim | "**email** must not be empty" |
| `email` | pragmatic email regex | "**email** must look like an email address" |
| `url` | `new URL(value)` with http(s) | "**endpoint** must be a valid URL" |
| `number` | finite number | "**amount** must be a number" |
| `contains` | cell contains text | "**plan** must contain 'pro'" |
| `equals` | exact match | "**status** must equal 'active'" |

- `onFail: 'skip'` → `skipped` + reason, never sent, still exported. Doubles as row filtering — one mechanism, two use cases.
- `onFail: 'fail'` → `failed` + reason without being sent.
- Evaluated once before the run; ValidationSummary shows exact counts ("947 will be sent · 23 skipped · 30 failed").
- Implicit always-on rule: substituted URL invalid → `failed / template` at run time.

## 16. Error Handling

Every failure becomes a `RowResult` with an `ErrorCategory` and a human sentence, via one mapping function in `engine/errors.ts`.

| Situation | Detection | Behavior & message |
|---|---|---|
| Invalid CSV | Papa errors, zero rows | Block step 1: "We couldn't read this file as a CSV… (Excel: File → Save As → CSV UTF-8.)" |
| Missing columns | Unresolved `{{token}}` | Block run; red chip: "**{{user_id}}** doesn't match any column in your file." |
| Invalid URL template | `new URL()` on row-1 substitution | Inline error before run; per-row `template` failure at run time |
| Invalid JSON body | `JSON.parse` on row-1 substitution | Warning, not a hard block |
| CORS | `fetch` TypeError (indistinguishable from network failure) | Combined `cors/network` category, honest message + explainer link. If sample fails 5/5 this way → dedicated CORS explainer panel. |
| Offline | `!navigator.onLine` | Auto-pause: "You appear to be offline. Run paused." |
| 4xx (not 429) | status | `http_4xx`: "The server rejected this row (404 — Not Found). Response: …" + body snippet. Not auto-retried. |
| 429 | status | `http_429` + auto-pause after 3 (see §13) |
| 5xx | status ≥ 500 | `http_5xx`: "…usually temporary — retrying failed rows often fixes it." |
| Timeout | `AbortSignal.timeout` + run signal | `timeout`: "No response after 30 seconds. The request may still have reached the server." |
| User stop | run AbortController | In-flight → `failed / aborted` with "may or may not have been sent"; untouched rows stay `pending`; export still works |

Retry confirm dialog for `timeout/aborted` POST rows adds: "Some of these may have already reached the server. Retrying could create duplicates."

## 17. Security and Privacy

**Everything stays local:** CSV read via FileReader in-tab; sent only to the user's target API row by row; results in tab memory; export generated client-side. Config in localStorage is device-local; **header values matching `authorization|api[-_]?key|token|secret` are excluded from persistence by default** with an explicit opt-in checkbox. No analytics that capture URLs, headers, or CSV content.

**API key risks & framing:** key lives in tab memory + outgoing requests (same as any client). Warn about: saving keys on shared machines; secrets pasted into the URL ("most APIs expect it in a header"). Claim architecture, not magic: "we can't see your data because there is no server to send it to."

**Warnings:** first-visit privacy banner; auth-header persistence opt-in; `beforeunload` prompt when a run is in progress.

**Why no server in v1:** a backend means holding other people's production API keys and customer CSVs — real security/compliance work before demand is proven. Browser-only inverts the trust question; the tradeoff (CORS) is documented honestly (§22).

## 18. Monetization Strategy

**Precondition:** paid only works if (a) users return repeatedly and (b) CORS doesn't gate too many real APIs — the proxy that fixes CORS is itself the most plausible paid feature.

**v1:** completely free, no signup. The product is the marketing.

**Paid candidates later** (each requires the backend/account layer v1 skips):

| Paid candidate | Why worth money |
|---|---|
| **Cloud proxy runner** | Solves CORS for arbitrary APIs + close-the-laptop runs — most likely first paid feature |
| Scheduled/recurring batches | One-off tool → ongoing workflow |
| Run history & audit logs | Ops teams need evidence |
| Shared team templates | The team moment |
| 50k+ row runs with resumability | Heavy users self-identify |
| Auto-retry policies | Repeat-user convenience |

**Stays free forever:** the core local loop (upload, map, run in-browser, retry, export).

**Pricing sketch:** free → ~$15–29/mo solo (proxy, history, templates) → ~$49+/mo team. Per-seat, not per-request.

**Validation before building payment:** segmented landing-page waitlist ("Notify me about the cloud runner"); a clearly-labeled "planned feature — register interest" hook on CORS failures; interviews with first 10 repeat users. Threshold: recurring weekly users + waitlist in the hundreds, or 5+ "I'd pay today for the proxy."

**Landing copy to test:**

> **Run 1,000 API requests from a CSV. No scripts, no Zapier.**
> Upload a CSV → map columns into an API request → run it with rate limits and retries → download results with per-row status.
> Free. Runs entirely in your browser — your data and API keys never touch our servers.
> [Open QueuePilot] · [Get notified about cloud runs →]

## 19. Competitive Positioning

| Competitor | Actually for | Why users leak to QueuePilot |
|---|---|---|
| **Postman** | Developer API dev/testing | Collection Runner requires collections/environments/scripts; poor failure review at 1,000 iterations; no merged result CSV |
| **Hoppscotch** | Lightweight OSS Postman | Same single-request DNA; batch isn't the product |
| **CSV cleaners** | Fixing data | They stop at the file; QueuePilot starts where they end (complementary) |
| **Zapier / Make / n8n** | Persistent automations | One-time 3,000-row backfill = building a workflow + burning task quota (3,000 tasks = real money) + scattered logs |

**The gap QueuePilot owns:** *ad-hoc bulk API operations by semi-technical people* — too big for clicking, too one-off for automation platforms, too non-developer for Postman. Tagline: **"The bulk actions button for any API."** Feature test: "does the coupon-sending marketer need this?"

## 20. MVP Development Phases

**Phase 1 — Skeleton + CSV in/out**
Goal: upload a CSV, see it, export it back.
Files: Vite+React+TS scaffold, `App.tsx`, `StepNav`, `CsvDropzone`, `CsvPreviewTable`, `CsvSummaryBar`, `lib/csv.ts`, `state/store.ts` (csv + ui slices), common components.
Tasks: setup (papaparse, zustand); parse with §14 header rules; preview table; warnings; stub export.
Verify: clean CSV parses; duplicate/empty headers renamed with warnings; ragged rows flagged not dropped; 10k rows without freezing; export round-trips.
Not yet: request builder, validation, fetch, localStorage.

**Phase 2 — Request builder + templating**
Goal: configure a full request with correct live preview from row 1.
Files: `builder/*`, `engine/templating.ts`, config slice.
Tasks: method+URL bar; header editor; body editor + JSON hint; variable picker; token extraction + unresolved flags; JSON-escaped substitution.
Verify: tokens resolve/flag correctly; preview live; quotes/newlines in cells → valid JSON; GET hides body; unit tests for `templating.ts`.

**Phase 3 — Queue engine + sample run**
Goal: run 5 rows for real with statuses and readable errors.
Files: `engine/queueRunner.ts`, `engine/errors.ts`, run slice, `RunControls` (sample only), basic `ResultTable`, `SampleResultCallout`.
Tasks: promise pool per §12; per-row timeout via AbortSignal; error classification per §16; batched store updates; sample-gates-full-run.
Verify: against a local echo server + httpbin: success/404/500/timeout/unreachable/CORS each produce the right category+message; pool unit tests (concurrency respected, cursor exhaustion, abort). **Also test against 5 real target-persona APIs to measure the CORS hit rate.**

**Phase 4 — Full run: controls, presets, progress**
Goal: complete run experience on 1,000+ rows.
Files: `RatePresetSelector`, `ProgressSummary`, full `RunControls`.
Tasks: presets + warning ladder; pause/resume/stop per §12; progress + ETA; 429 auto-pause; config lock during run; `beforeunload`; table virtualization + filters.
Verify: 1,000-row runs at each preset; pause leaves no orphan requests; stop marks in-flight aborted, rest pending; UI responsive; `Σ counts === total` always.

**Phase 5 — Validation + retry + export**
Goal: safety-and-completion layer.
Files: `validation/*`, `engine/validation.ts`, `RetryFailedButton`, `ExportPanel`, `ResultRowDetail`.
Tasks: rule CRUD + pre-run evaluation + counts; skip/fail semantics; retry-failed incl. duplicate-POST warning; export with `qp_*` columns (all / failed-only); row detail.
Verify: rule counts exact; retry touches only failed rows, increments attempts; export opens in Excel + Google Sheets (UTF-8 BOM); failed-only re-imports cleanly.

**Phase 6 — Polish + trust + landing**
Goal: ship-ready.
Tasks: localStorage config with auth-header exclusion; privacy banner + `/privacy` page; DELETE warning; CORS explainer; all §8 copy; responsive pass (360/768/1440); keyboard focus pass; landing page with cloud-runner interest hook.
Verify: full CLAUDE.md checklist; **a non-technical human completes a run against the echo API unaided — the real acceptance test.**

## 21. Codex Follow-up Tasks

1. StatusBadge: consistent colors/icons for five states, incl. non-color (shape) accessibility indicator.
2. Result table truncation with tooltip + overflow fix at 360px.
3. Empty-state copy: no CSV / no failed rows 🎉 / no rules / run not started.
4. Button states: disabled-with-tooltip locked run button; loading spinners; double-click double-start guard.
5. Header editor: enter-to-add, auto-focus, trash hover state.
6. Progress bar reduced-motion variant; smooth count transitions.
7. Drag-and-drop polish: drag-over highlight; reject non-.csv with message.
8. `aria-live="polite"` run progress announcements.
9. Focus trap + Escape in confirm dialogs.
10. Number inputs: clamp, steps, invalid styling.
11. `qp_response` CSV-escaping pass (commas, quotes, newlines).
12. Favicon, per-step page titles ("QueuePilot — Running 412/1,000…"), landing OG tags.

## 22. Technical Risks

| Risk | Reality | Mitigation |
|---|---|---|
| **CORS** (#1 risk) | Many production APIs don't allow browser origins; can invalidate browser-only for some users | Sample test surfaces it in seconds; dedicated explainer; anonymous frequency counter to decide proxy roadmap; **Phase-3 reality check against real persona APIs** |
| Browser connection limits | ~6/host on HTTP/1.1; background-tab timer throttling | Concurrency cap 10; timestamp-based pacing; "keep tab in foreground" note |
| Large CSV performance | 50k rows × DOM = frozen tab | Virtualized table; ~100ms batched store flushes; Papa streaming; soft warning >20k rows; 500-char response cap (~25MB max) |
| API key handling | Users paste production keys | §17: no persistence by default, URL-secret warning, plain-language privacy page |
| Cancellation correctness | Orphaned fetches, stuck `running`, double-starts | One AbortController per run; `execute` always resolves (try/finally); phase state machine gates buttons; dev assert `Σ counts === total` |
| JSON template errors | Cell quotes/newlines break bodies | JSON-escaped substitution; live row-1 validity check; per-row `template` errors naming the column |
| User confusion about APIs | Audience may not know headers/404s | Every error translated; civilian tooltips ("Headers are the envelope — usually where your API key goes"); worked examples vs a demo API |

## 23. Final Recommended Build Plan

- **First (weeks 1–2): Phases 1–3.** CSV round-trip, builder, queue engine + sample run. Riskiest claims proven early. **Do the CORS reality-check here** — if most real APIs fail, pivot the roadmap toward the proxy in week 2, not after polish.
- **Second (weeks 3–4): Phases 4–5.** Full-run controls, presets, 429 auto-pause, validation, retry, export. Pause/stop/retry semantics ARE the product.
- **Then (week 5): Phase 6 + Codex tasks.** Copy, states, responsive, privacy, landing with cloud-runner interest hook.
- **Postpone without guilt:** response field extraction, config import/export, auto-retry/backoff, non-UTF-8 encodings, run history, anything with a server.
- **Validate with users:** unaided completion by a non-technical person; CORS hit rate; repeat usage; cloud-runner waitlist conversion.
- **Impressive-but-realistic core:** the framework-free ~80-line promise pool with correct pause/stop/retry semantics; honest error UX ("this request may have reached the server"); 429 auto-pause; privacy-by-architecture. ~4 dependencies and an `engine/` with zero React imports show the design was deliberate.
