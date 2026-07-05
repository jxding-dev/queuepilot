# QueuePilot V2 — Phase Prompts for the Implementing Agent

This file contains the complete, ordered implementation plan for QueuePilot V2.
It is designed to be executed **one phase at a time** by a coding agent (Opus).

## How to use this file (rules for the implementing agent)

1. Read `CLAUDE.md` first and follow it. Then read this file top to bottom.
2. Find the **first unchecked phase** in the Progress Tracker below.
3. Execute **only that phase**. Never implement anything from a later phase,
   even if it seems convenient.
4. Before editing, read every file listed in that phase's "Read before editing".
5. After finishing, run the phase's verification checklist **for real** — never
   claim a check passed without running it.
6. Mark the phase as done in the Progress Tracker (edit this file: `[ ]` → `[x]`,
   add the date), then report in this exact format and **STOP**:

   ```
   Done. (or: Blocked — with the exact reason)
   Changed: <files>
   Checked: <which checklist items ran, with results>
   Notes: <risks, known limitations, anything deferred>
   ```

7. Do NOT commit or push unless the user explicitly asks.
8. Language rules: all **user-facing UI copy is Korean** (it lives in
   `src/constants/copy.ts` — the Korean literals in this file are the exact
   strings to use). Code, comments, identifiers, and commit messages stay English.
9. Hard constraints for every phase: no backend, no auth, no payment, no new
   runtime dependencies (unless a phase explicitly allows one), no changes to
   files a phase doesn't list, `src/engine/` must never import React or zustand.

## Progress Tracker

- [x] V2-P1 — Merge the dead "Results" step (4 → 3 steps) — 2026-07-05
- [x] V2-P2 — errorKind + auto-pause on 429 + early CORS panel — 2026-07-05
- [x] V2-P3 — Persist request template to localStorage — 2026-07-05
- [x] V2-P4 — Skip sample-successful rows on full run — 2026-07-05
- [ ] V2-P5 — Response value extraction (`qp_extracted`)
- [ ] V2-P6 — Demo mode ("try with sample data")
- [ ] V2-P7 — English UI toggle (**requires P2 done first**)
- [ ] V2-P8 — Vercel migration prep (run when actually migrating)

Dependency notes: P2 must be done before P7 (P7 relies on `errorKind`).
P3/P5/P6 interactions are already handled inside each phase's instructions.

---

## V2-P1 — Merge the dead "Results" step (4 → 3 steps)

**Role:** careful senior frontend engineer maintaining QueuePilot, a
browser-based CSV-to-API batch runner.

**Read before editing:** `src/App.tsx`, `src/state/store.ts`,
`src/components/StepNav.tsx`, `src/constants/copy.ts`

**Background (the actual bug):** the stepper has 4 steps, but step 4 ("결과")
renders only a placeholder via `{step === 3 && <PlaceholderStep .../>}` in
`App.tsx` saying "이 단계는 이후 단계에서 제공됩니다". The real results UI
(ProgressSummary, RetryFailedButton, ExportPanel, ResultTable) already lives
inside step 3's `RunControls.tsx`. Users who click "결과" see an unfinished
screen.

**Goal:** merge to 3 steps: `CSV 업로드` / `요청 설정` / `실행 · 결과`.
Results UI stays inside RunControls (no component moves).

**Scope — exact edits:**
1. `src/state/store.ts`: `STEPS` → `['Upload', 'Build', 'Run']`; `StepIndex` →
   `0 | 1 | 2`. The `setStep` gating (`step >= 2` condition) is already correct —
   verify only.
2. `src/constants/copy.ts`: `STEP_LABELS` → `['CSV 업로드', '요청 설정', '실행 · 결과']`.
   Delete `copy.placeholder` if this change makes it fully unused.
3. `src/App.tsx`: delete the `{step === 3 && ...}` branch and the
   `PlaceholderStep` component (grep first to confirm it has no other users).
   `DocumentTitle` uses `STEP_LABELS[step]` so it adjusts automatically — verify.
4. `src/components/StepNav.tsx`: it maps over `STEPS`, so it renders 3 steps
   automatically. Update its header comment ("4-step stepper") to match reality.

**Do NOT:** move components between files; restructure RunControls; do broad
CSS changes (only minimal spacing fixes if 3 steps look off); add a router,
dependencies, or any other feature.

**Pitfalls:**
- `STEP_LABELS` is an `as const` tuple — shrinking it turns any remaining
  `STEP_LABELS[3]` reference into a type error. Clean up all of them.
- `STEPS` (store) is logic keys; `STEP_LABELS` (copy) is display text. Keep
  that separation.

**Verification checklist (do not claim unrun checks):**
- [ ] `npm run build` passes (includes `tsc --noEmit`)
- [ ] `npm test` passes
- [ ] Stepper shows exactly 3 steps; no remnants of a 4th
- [ ] Full existing flow still works in the dev server: upload → build → run →
      sample → full run → result table → export
- [ ] grep finds 0 hits for `PlaceholderStep`, `copy.placeholder`, `STEP_LABELS[3]`

**Then STOP and report.**

---

## V2-P2 — errorKind + auto-pause on 429 + early CORS panel

**Role:** careful senior frontend engineer maintaining QueuePilot.

**Read before editing:** `src/types.ts`, `src/engine/errors.ts`,
`src/engine/queueRunner.ts`, `src/state/store.ts`,
`src/components/RunControls.tsx`, `src/constants/copy.ts`

**Background (two real problems):**
1. `RunControls.tsx` detects the all-CORS case by **string comparison**:
   `r.errorMessage === copy.run.errors.network`. It silently breaks if the
   copy changes or the UI becomes bilingual.
2. The 429 error message exists (`copy.run.errors.tooManyRequests`) but the
   runner keeps sending after repeated 429s. The auto-pause is the product's
   single biggest trust feature and it's missing.

**Goal (three related changes, one phase):**
A. Add a machine-readable `errorKind` to `RowResult`; kill string comparisons.
B. Auto-pause the run after 3 accumulated 429 responses, with a banner.
C. Make the CORS panel kind-based and show it early (mid-run too).

**Scope:**

A. errorKind
- `src/types.ts`: add
  ```ts
  export type ErrorKind =
    | 'http_4xx' | 'http_429' | 'http_5xx' | 'unexpected_status'
    | 'timeout' | 'network' | 'aborted' | 'unexpected';
  ```
  and `errorKind?: ErrorKind` on `RowResult` (undefined on success).
- `src/engine/errors.ts`: add `errorKind` to `Outcome`; fill it in every branch
  of `classifyHttpStatus` / `classifyThrownError`. **Do not** change how
  `errorMessage` is produced (the `copy` import stays — localization split is a
  later phase). This phase only ADDS the kind.
- `src/engine/queueRunner.ts`: `makeExecuteRow` copies `outcome.errorKind`
  into the returned `RowResult` (both the response path and the catch path).

B. Auto-pause on 429 (implement in `beginRun` in `src/state/store.ts`)
- Local counter `rate429Count` inside `beginRun`; increment in the `onResult`
  callback when `r.errorKind === 'http_429'`.
- When the counter reaches 3 and `get().run.phase === 'running'`:
  call `handle.pause()`, transition phase to `'pausing'` or `'paused'` based on
  `activeCount` (same logic as the existing `pauseRun` action), and set a new
  state flag `autoPaused429: true`.
- Reset `autoPaused429` to false in `resumeRun`, `stopRun`, and at the start of
  every `beginRun`.
- `RunControls.tsx`: when `autoPaused429`, show a `WarningBanner` with
  `tone="warn"`. New copy key `run.autoPause429`:
  `'API가 요청 속도를 낮춰 달라고 응답해(429) 자동으로 일시정지했습니다. 속도를 낮춘 뒤 재개하세요. 실패한 행은 마지막에 재시도할 수 있습니다.'`
- The preset `<fieldset>` is currently `disabled={active}`, which would make
  "lower the speed, then resume" impossible. Relax it to
  `disabled={active && run.phase !== 'paused'}` so presets are editable while
  paused.

C. Early CORS panel (`src/components/RunControls.tsx`)
- Replace the existing `allCors` logic (string compare, `phase === 'done'` only)
  with: completed rows (`success` or `failed`) ≥ 5 AND **all** of them failed
  with `errorKind === 'network'` → show the panel, in any phase (running /
  paused / done).
- While the panel is visible and `phase === 'running'`, add one extra line
  inside it (new copy key `run.cors.stopHint`):
  `'실행을 중지하고 원인을 먼저 확인하는 것을 권장합니다.'`

**Do NOT:** remove the `copy` import from `errors.ts` (later phase); implement
auto-retry/backoff (pause only); parse the Retry-After header; add React or
zustand imports inside `src/engine/` — the 429 counting happens in the store's
`onResult` callback, not in the engine.

**Pitfalls:**
- `beginRun`'s `onResult` only pushes to `resultBuffer` (flushed every ~100ms).
  Count 429s at `onResult` time (buffer push), not at flush time, so the pause
  reacts immediately.
- The counter must reset per run — a local variable in `beginRun` does this
  automatically; keep it that way.
- `queueRunner.test.ts` may assert `RowResult` shapes; update tests for the new
  field without weakening what they already verify.

**Verification checklist:**
- [ ] `npm run build`, `npm test` pass
- [ ] Against a local mock server returning 429 (e.g. `scratch/echo-server.mjs`
      `/status/429`): after 3× 429 the run auto-pauses and the banner shows
- [ ] While auto-paused, switch preset to 안전 and resume — run continues
- [ ] Banner clears on resume / stop / new run
- [ ] Full run against a dead port: CORS panel appears at ~5 completed rows,
      mid-run, without waiting for the end
- [ ] grep confirms the string-comparison `allCors` code is gone

**Then STOP and report.**

---

## V2-P3 — Persist request template to localStorage

**Role:** careful senior frontend engineer maintaining QueuePilot.

**Read before editing:** `src/state/store.ts`, `src/types.ts`,
`src/components/RequestBuilder.tsx`, `src/constants/copy.ts`,
`src/App.tsx` (see how PrivacyBanner already uses localStorage), `README.md`

**Background:** a refresh currently wipes URL/Header/Body. Repeat usage —
the core commercial metric — requires config persistence. But the product's
trust promise is "we don't store your API keys", so auth-like header values
must be excluded by default.

**Goal:** auto-save the RequestTemplate + rate preset to localStorage and
restore on startup. Auth-like header values excluded by default, saved only
with an explicit opt-in.

**Scope:**
1. New file `src/lib/configStorage.ts` (no React imports):
   - Storage key: `'qp_config_v1'`
   - Shape: `{ version: 1, config: RequestTemplate, preset: PresetId, saveAuthHeaders: boolean }`
   - `saveConfig(...)`: when `saveAuthHeaders` is false, any header whose KEY
     matches `/authorization|api[-_]?key|token|secret|password|bearer/i` is
     saved with `value: ''` (the key itself is kept so the row survives).
   - `loadConfig()`: before returning, merge over defaults
     (`{ ...DEFAULT_CONFIG, ...loaded.config }` style) so older saved shapes
     never crash the app when RequestTemplate later gains fields.
   - Every localStorage access in try/catch (private mode); fail silently to
     defaults.
2. `src/state/store.ts`:
   - Initialize `config`/`preset` from `loadConfig()` at store creation.
   - Save on change: `useStore.subscribe`, compare previous vs next config and
     preset, debounce ~300ms, then `saveConfig`.
   - New state `saveAuthHeaders: boolean` (default false) + actions
     `setSaveAuthHeaders`, `resetConfig` (restore DEFAULT_CONFIG and delete the
     stored entry).
   - **Never** persist csv data or run results.
3. `src/components/RequestBuilder.tsx` — small footer area:
   - Note: `'요청 설정은 이 브라우저에 자동 저장됩니다. CSV 데이터는 저장되지 않습니다.'`
   - Checkbox: `'인증 관련 Header 값도 저장 (공용 PC에서는 권장하지 않음)'`
   - Button: `'설정 초기화'` — confirmed via the existing `ConfirmDialog`
     component before executing.
   - All strings go in `copy.ts` under a `build.persist.*` group.
4. `README.md` "개인정보 / 보안" section: honestly update the localStorage
   scope (banner dismissal + request config, auth values excluded by default).

**Do NOT:** use zustand's `persist` middleware (manual control is required for
sensitive-value filtering); store CSV contents, results, or run history;
build multi-template management (single auto-save only — named templates are a
later version); add dependencies.

**Pitfalls:**
- `DEFAULT_CONFIG.headers` is `[{ key: '', value: '' }]`. If a restored config
  has `headers.length === 0`, the UI loses its input row — re-seed one empty row.
- A restored `urlTemplate` may contain `{{tokens}}` that don't exist in a newly
  uploaded CSV. The existing `unresolvedTokens` logic already flags this — no
  extra code, but DO verify the scenario manually.
- Turning `saveAuthHeaders` on, then off again, must actually strip the
  sensitive values from the stored JSON on the next save. Verify in devtools.

**Verification checklist:**
- [ ] `npm run build`, `npm test` pass
- [ ] Enter URL/Header/Body → refresh → restored
- [ ] Authorization header value → refresh → key survives, value empty
      (also inspect the raw localStorage JSON in devtools Application tab)
- [ ] Opt-in checked → auth value restored; unchecked again → stripped from storage
- [ ] '설정 초기화' → confirm dialog → defaults restored + storage entry removed
- [ ] No new localStorage keys other than `qp_config_v1`
- [ ] Manually corrupt `qp_config_v1` with invalid JSON → app still boots

**Then STOP and report.**

---

## V2-P4 — Skip sample-successful rows on full run

**Role:** careful senior frontend engineer maintaining QueuePilot.

**Read before editing:** `src/state/store.ts` (the whole `beginRun` function),
`src/components/RunControls.tsx`, `src/constants/copy.ts`

**Background:** the full run currently re-sends the 5 sampled rows
(`SAMPLE_SIZE = 5`, indexes 0–4). `copy.run.reRunNote` warns about it, but for
POST/DELETE this is real duplicate creation/deletion. `beginRun`'s `'full'`
mode seeds a completely fresh results map, discarding sample results.

**Goal:** checkbox next to the full-run button — `'테스트에서 성공한 행은 건너뛰기'`
(default checked). When checked, rows that succeeded in the sample are not
re-sent and their results are kept.

**Scope:**
1. `src/state/store.ts`:
   - New state `skipSampledSuccess: boolean` (default true) + setter action.
   - In `beginRun`, `mode === 'full'` branch: when `skipSampledSuccess`, find
     rows in the existing `state.run.results` with `status === 'success'`
     (the sample successes) and (a) exclude them from `rowIndexes`,
     (b) copy their `RowResult` **unchanged** into the freshly seeded results
     map. All other rows seed as pending, as today.
   - `baseAttempts` only covers rows in `rowIndexes`, so it keeps working —
     verify that kept rows retain `attempts = 1`.
2. `src/components/RunControls.tsx`:
   - Render the checkbox when `sampleDone && !active`, near the full-run button.
   - Make the `reRunNote` line conditional (new `run.skipSampled.*` copy keys):
     checked → `'테스트에서 성공한 N개 행은 건너뜁니다.'` (N = actual count);
     unchecked → keep the existing `'전체 실행은 테스트한 5개 행도 다시 전송합니다.'`

**Do NOT:** skip sample-FAILED rows (they must be re-sent); change
`SAMPLE_SIZE`; add arbitrary row selection; touch the `retry`/`sample` seeding
branches (only `'full'`).

**Pitfalls:**
- With kept successes, the done-count starts non-zero (e.g. 5/1000) at run
  start. That is correct — but check whether the ETA (based on `runStartedAt`)
  gets skewed by counting pre-completed rows; if so, subtract the
  at-start-completed count from the ETA math.
- Edge: CSV with ≤ 5 rows, all sampled successfully → `rowIndexes` is empty.
  Confirm `beginRun` completes cleanly to `'done'` and
  `runQueue`'s `workerCount` math (`rowIndexes.length || 1`) is safe.
- Export (`buildResultCsv`) reads the results map, so kept rows must export as
  `qp_status=success`.

**Verification checklist:**
- [ ] `npm run build`, `npm test` pass
- [ ] Mock server: sample 5 rows succeed → full run with checkbox on → server
      log shows those 5 rows were NOT re-sent; result table keeps them green
- [ ] If 2 sample rows failed → those 2 ARE re-sent on the full run
- [ ] Checkbox off → old behavior (5 rows re-sent)
- [ ] Exported CSV: skipped rows show `qp_status=success`, `qp_attempts=1`

**Then STOP and report.**

---

## V2-P5 — Response value extraction (`qp_extracted`)

**Role:** careful senior frontend engineer maintaining QueuePilot.

**Read before editing:** `src/types.ts`, `src/engine/queueRunner.ts`
(especially `makeExecuteRow`), `src/lib/csv.ts` (`RESULT_COLUMN_BASES`,
`buildResultCsv`, `resultCells`), `src/lib/csv.test.ts`,
`src/components/RequestBuilder.tsx`, `src/constants/copy.ts`

**Background:** responses are only stored as a 500-char snippet in
`qp_response`. The core scenario "get the issued coupon code back as a column"
needs a single dot-path extraction into its own result column.

**Goal:** optional Build-step input `'응답에서 값 추출'` (e.g. `data.coupon_code`);
extracted values export as a `qp_extracted` column.

**Scope:**
1. `src/types.ts`: `RequestTemplate` gains `extractPath: string` (default `''`);
   `RowResult` gains `extractedValue?: string`.
2. New file `src/engine/extract.ts` (no React imports) + `src/engine/extract.test.ts`:
   - `export function extractByPath(jsonText: string, path: string): string | undefined`
   - Behavior: try `JSON.parse` (undefined on failure) → walk `path.split('.')`,
     numeric segments act as array indexes (e.g. `items.0.id`) → final value:
     string/number/boolean → `String(value)`; object/array →
     `JSON.stringify(value)`; `null` → `'null'`; missing path → `undefined`.
   - Never throws, for any input.
   - Test cases: nested objects, array index, missing path, non-JSON input,
     and values that are `0` / `false` / `''` (falsy-but-present must NOT read
     as undefined).
3. `src/engine/queueRunner.ts` — `makeExecuteRow`:
   - **Current code truncates immediately**:
     `const snippet = (await safeReadText(response)).slice(0, SNIPPET_CHARS)`.
     Capture the FULL text into a variable first; extract from the full text;
     build the snippet afterwards with `slice`.
   - If `config.extractPath.trim()` is non-empty, run `extractByPath` and store
     the result in `RowResult.extractedValue`. Attempt on success AND error
     responses (pulling an error code out of an error body is a valid use).
4. `src/lib/csv.ts`:
   - Add `'qp_extracted'` to `RESULT_COLUMN_BASES` after `'qp_response'`,
     before `'qp_attempts'` (always included; empty when unused).
   - `resultCells`: add `extractedValue ?? ''`; the never-run row array also
     grows by one.
   - Update the column order/count assertions in `src/lib/csv.test.ts`.
5. `src/state/store.ts`: add `setExtractPath` action. If V2-P3 is already
   applied, the whole config persists so `extractPath` persists automatically —
   just confirm `loadConfig`'s default-merge keeps old saved configs safe.
6. `src/components/RequestBuilder.tsx`:
   - One input (or small collapsible section): label `'응답에서 값 추출 (선택)'`,
     placeholder `data.coupon_code`, hint
     `'응답 JSON에서 이 경로의 값을 결과 CSV의 qp_extracted 컬럼에 담습니다.'`
   - Strings in `copy.ts` under `build.extract.*`.

**Do NOT:** implement JSONPath/filters/wildcards/multiple paths (single
dot-path only); add a ResultTable column (export-only this version); apply
`{{token}}` substitution to `extractPath` (fixed path only).

**Pitfalls:**
- `extractPath` is NOT a template. It must NOT be included in
  `configTemplateTexts` / `unresolvedTokens` (otherwise `data.coupon_code`
  would be flagged as an unresolved token).
- Extract BEFORE truncating — values beyond the 500-char snippet must extract.
- `qp_` collision: if the original CSV already has a `qp_extracted` column, the
  existing collision logic must produce `qp_extracted_2` — cover with a test.

**Verification checklist:**
- [ ] `npm run build`, `npm test` pass (extract.test.ts + updated csv.test.ts)
- [ ] Mock server returning `{ "data": { "code": "ABC" } }` with extractPath
      `data.code` → exported CSV `qp_extracted` = `ABC`
- [ ] Empty extractPath → column exists but all empty; nothing else changed
- [ ] Non-JSON response / missing path → row still processed, extraction empty
- [ ] A value past the 500-char mark still extracts

**Then STOP and report.**

---

## V2-P6 — Demo mode ("try with sample data")

**Role:** careful senior frontend engineer maintaining QueuePilot.

**Read before editing:** `src/state/store.ts` (`beginRun`, `parseFile`,
`clearCsv`), `src/engine/queueRunner.ts` (the `makeExecuteRow` signature),
`src/App.tsx` (`UploadStep`), `src/components/CsvDropzone.tsx`,
`src/constants/copy.ts`

**Background:** today a visitor needs their own CSV **and** their own API to
experience the product — the biggest hole in the conversion funnel. We need a
demo mode that shows the whole loop (upload → build → sample → full run →
failures → retry → export) with zero real network traffic.

**Goal:** a `'샘플 데이터로 체험하기'` button on the upload screen. It loads a
bundled 30-row sample CSV and a pre-filled request config; runs are answered by
a simulator instead of `fetch`.

**Scope:**
1. New file `src/lib/demo.ts` (no React imports):
   - `DEMO_CSV: CsvData` — 30 rows generated in code. Columns: `user_id`,
     `name`, `email`, `coupon_amount`. Names/emails obviously fake
     (e.g. `hong.gildong@example.com`).
   - `DEMO_CONFIG: RequestTemplate` — POST,
     url `https://demo.queuepilot.invalid/coupons/{{user_id}}`,
     a Content-Type header, body
     `{ "email": "{{email}}", "amount": {{coupon_amount}} }`.
     If V2-P5 is applied, also set `extractPath: 'data.coupon_code'`.
   - `makeDemoExecuteRow(rows)`: returns the same signature as
     `makeExecuteRow` — `(rowIndex, signal) => Promise<RowResult>`. Behavior:
     * 150–450ms latency; on signal abort resolve immediately to an aborted
       RowResult (do NOT reject — same "never throws" contract as the real
       engine; use errorKind `'aborted'` and the same copy string).
     * Deterministic by rowIndex: `index % 10 === 3` → 500 failure,
       `index % 10 === 7` → 404 failure, everything else → 200 success with
       snippet `'{"data":{"coupon_code":"DEMO-<rowIndex>"}}'`.
     * Keep a closure `Set<number>` of rows that already failed once; when a
       previously-failed row runs again, make it succeed → the "retry failed
       rows" demo ends as a success story.
     * Reuse `classifyHttpStatus` from `src/engine/errors.ts` so
       errorKind/errorMessage match the real engine exactly.
2. `src/state/store.ts`:
   - `demoMode: boolean` state + `startDemo` action: `csv = DEMO_CSV`,
     `config = DEMO_CONFIG`, `demoMode = true`, run reset to `INITIAL_RUN`,
     `step = 1`.
   - `clearCsv` also resets `demoMode = false` (the demo exit path).
   - In `beginRun`:
     `const rawExecute = state.demoMode ? makeDemoExecuteRow(state.csv.rows) : makeExecuteRow(state.config, state.csv.rows);`
   - If V2-P3 is applied: **skip `saveConfig` while `demoMode` is true** so the
     demo config never pollutes the user's saved template.
3. UI:
   - Upload empty state (below the dropzone): secondary button
     `'샘플 데이터로 체험하기'` + subtext
     `'가짜 데이터와 가짜 API로 전체 흐름을 안전하게 둘러봅니다.'`
   - While `demoMode`: persistent top banner (`tone="info"`):
     `'데모 모드 — 실제 네트워크 요청이 전송되지 않습니다.'` + button
     `'데모 종료'` (calls `clearCsv`).
   - All strings in `copy.ts` under `demo.*`.

**Do NOT:** monkey-patch or globally intercept `fetch` (execute-function swap
only); block config editing during demo (playing with `{{tokens}}` IS the
demo); add a separate demo page/route, dependencies, or a server.

**Pitfalls:**
- The `.invalid` TLD is deliberate (RFC 2606 reserved): if a bug ever bypasses
  the simulator, the request can't reach anything real. Do not change it.
- The sample runs indexes 0–4 → index 3 fails with 500 → the sample shows one
  failure. That is intended (failure UX is part of the demo). Do NOT "fix" it.
- `makeDemoExecuteRow` must report `attempts: 1` — the store's `beginRun`
  re-stamps the real attempt count via `baseAttempts` (see existing logic).
- Check the demo banner and PrivacyBanner can coexist without breaking layout.

**Verification checklist:**
- [ ] `npm run build`, `npm test` pass
- [ ] With devtools Network tab open, run the full demo → zero external requests
- [ ] Full journey works: button → inspect config → sample (1 failure included)
      → full run → retry failed (all turn green) → export CSV
- [ ] (If V2-P5 applied) exported CSV `qp_extracted` contains `DEMO-*` codes
- [ ] '데모 종료' → back to the empty upload screen, `demoMode` off
- [ ] Refresh after using the demo → the demo config did NOT pollute the saved
      template (V2-P3 storage)

**Then STOP and report.**

---

## V2-P7 — English UI toggle (⚠️ requires V2-P2 done first)

**Role:** careful senior frontend engineer maintaining QueuePilot.

**Read before editing:** `src/constants/copy.ts` (all of it),
`src/engine/errors.ts`, `src/engine/queueRunner.ts`, `src/state/store.ts`,
and every component that imports copy (grep `from '../constants/copy'`).

**Precondition check:** `RowResult` must already have the `errorKind` field
(V2-P2). If it doesn't, STOP and report that fact — do not proceed.

**Background (the one dangerous spot):** `src/engine/errors.ts` imports
`constants/copy.ts` directly, so **Korean strings are baked into
`RowResult.errorMessage` at execution time**. Naively duplicating the copy
object would (a) leave the engine speaking one hardcoded language and
(b) mix languages in the result table/export after a toggle.

**Goal:** a Korean/English toggle in the header, persisted to localStorage
`'qp_locale'`. The engine becomes language-agnostic (strings injected);
result messages are recorded in the locale active at execution time.

**Scope:**
1. Restructure `src/constants/copy.ts`:
   - Rename the existing object to `const ko`; `export type CopyDict = typeof ko`.
   - Write `const en: CopyDict` — a complete English translation with the
     **exact same key structure**. Keep technical terms (CSV, API, URL, Header,
     Body, JSON, HTTP methods, status codes, CORS) as-is. Tone: concise,
     non-developer friendly (e.g. `fullButton` → ``(n) => `Send all ${n.toLocaleString()} rows` ``).
   - Move `STEP_LABELS` into the dictionaries (`ko.stepLabels` / `en.stepLabels`).
   - `export const dictionaries = { ko, en } as const;`
     `export type Locale = keyof typeof dictionaries;`
2. Remove the copy import from `src/engine/errors.ts`:
   - `export interface ErrorStrings` — same shape as the current
     `copy.run.errors` (`clientError(status, statusText)`, `tooManyRequests`,
     `serverError(status)`, `timeout`, `network`, `aborted`,
     `unexpectedStatus(status)`, `unexpected`).
   - `classifyHttpStatus` / `classifyThrownError` take an `ErrorStrings`
     parameter. The errorKind logic is untouched.
3. `src/engine/queueRunner.ts`: extend to
   `makeExecuteRow(config, rows, errorStrings: ErrorStrings)`; pass through to
   the classifiers.
4. `src/state/store.ts`:
   - `locale: Locale` state — initial value: localStorage `'qp_locale'`, else
     `navigator.language.startsWith('ko') ? 'ko' : 'en'`. `setLocale` action
     persists it (try/catch).
   - `beginRun` passes the current locale's `run.errors` into `makeExecuteRow`.
     (If V2-P6 is applied, the demo executor gets the same treatment.)
   - Move the `parseFile` fallback string (`'이 파일을 CSV로 읽을 수 없습니다.'`)
     into the dictionaries.
5. Component migration:
   - New hook `useCopy()`: reads `locale` from the store, returns
     `dictionaries[locale]`. Put the hook in `store.ts` (copy.ts exports only
     dictionaries) to avoid circular imports.
   - Convert EVERY component from the static `copy` import to `useCopy()`.
     Grep to confirm — one missed file = a partially-translated UI bug.
   - The Korean strings in `src/lib/csv.ts` (header warnings, parse errors)
     also move to string injection (`parseCsvFile` receives a strings object).
6. Toggle UI: small header button `한국어 / EN`; switches the whole UI instantly.

**Do NOT:** add an i18n library (two dictionaries + a hook is enough); add
per-locale URLs/routing; try to re-translate already-recorded
`RowResult.errorMessage` values on toggle — recording in the execution-time
locale is the spec (note it as a known limitation); translate the `qp_*`
export column names (they are locale-independent identifiers).

**Pitfalls:**
- `CopyDict = typeof ko` means a missing key in `en` is a compile error — that
  is the safety net. Do not bypass it with `any`.
- `DocumentTitle` in `App.tsx` hardcodes `'실행 중' / '일시정지' / '중지 중'` —
  move those into the dictionaries too. Then grep `src/` for remaining Korean
  literals outside the dictionaries (demo fake data names are the allowed
  exception).
- Every copy key added by earlier phases (`autoPause429`, `persist.*`,
  `extract.*`, `demo.*`, `skipSampled.*`, `cors.stopHint`) must exist in `en`.

**Verification checklist:**
- [ ] `npm run build`, `npm test` pass
- [ ] Toggle → every screen (upload/build/run/banners/dialogs/empty states)
      switches instantly; persists across refresh
- [ ] Run with failures in English mode → result table AND exported `qp_error`
      are English
- [ ] With Korean-run results on screen, switch to English → app doesn't break;
      old messages stay Korean (spec)
- [ ] CORS panel / 429 banner work in both locales (kind-based, locale-free
      detection)
- [ ] grep: zero remaining static `copy` imports in components

**Then STOP and report.**

---

## V2-P8 — Vercel migration prep (run when actually migrating)

**Role:** careful senior engineer managing QueuePilot's deployment.

**Read before editing:** `vite.config.ts`, everything under
`.github/workflows/`, `index.html`, `package.json`

**Background (THE trap):** `vite.config.ts` hardcodes `base: '/queuepilot/'`
for production builds (GitHub Pages subpath). Vercel serves from the root
(`/`), so deploying as-is produces asset 404s and a blank white page. This is
effectively the only landmine in this migration.

**Goal:** make the base path environment-driven so the same code works on both
GitHub Pages (subpath) and Vercel (root), and document the Vercel procedure.
The existing GitHub Pages deploy must keep working during the transition.

**Scope:**
1. `vite.config.ts`: `base: process.env.QP_BASE ?? '/'`
   (drop the `command` branch — root is the default; Pages sets it explicitly).
2. GitHub Actions deploy workflow — add to the build step's env:
   `QP_BASE: '/queuepilot/'` → Pages deploys stay identical.
3. Vercel: `vercel.json` is unnecessary (single page, no client routing) —
   do NOT create one. Instead add a Deployment section to `README.md`:
   - Vercel dashboard: Framework Preset `Vite`, Build Command `npm run build`,
     Output Directory `dist`, no env vars needed (unset `QP_BASE` = root).
   - One line on where to attach a custom domain.
4. Also document local verification in the README:
   - Root build: `npm run build && npm run preview` → verify the app works.
   - Pages simulation (PowerShell): `$env:QP_BASE='/queuepilot/'; npm run build`
     then check `dist/index.html` asset paths start with `/queuepilot/assets/`.

**Do NOT:** delete the GitHub Pages workflow (the user retires it manually
after Vercel is stable); add `vercel.json` / rewrites / headers; touch `src/`
(build config and docs only); add analytics, domains, or redirects.

**Pitfalls:**
- Using `process.env` in `vite.config.ts` may need Node types — check how
  tsconfig treats the config file; if there's a type error, use the simplest
  fix (`loadEnv`, or `defineConfig(({ mode }) => ...)` with a cast). No new
  dependencies; adding `@types/node` as a devDependency is allowed if needed.
- localStorage (privacy banner, saved config) is per-origin — after a domain
  change, user settings will "look wiped". No migration is possible; add one
  line to README's known-limitations section.
- Confirm `index.html` has no hardcoded absolute-path resources (a default
  Vite structure shouldn't).

**Verification checklist:**
- [ ] Build without `QP_BASE`: dist asset paths are `/assets/...` (root) and
      `npm run preview` shows a fully working app
- [ ] Build with `QP_BASE='/queuepilot/'`: `dist/index.html` asset paths start
      with `/queuepilot/assets/...` — verify by reading the file
- [ ] `npm test` passes (should be unaffected)
- [ ] Workflow YAML is valid syntax (do NOT commit/push on your own — user
      approval required)
- [ ] README documents the Vercel procedure and the localStorage/origin caveat

**Then STOP and report. In Notes, list step-by-step what the user must do in
the Vercel dashboard.**
