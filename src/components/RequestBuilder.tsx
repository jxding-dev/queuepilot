// Build step: method + URL + headers + body, each editable with {{column}}
// tokens. Tracks the last-focused field so a VariablePicker chip inserts a token
// at the caret. Shows a live RequestPreview and gates advancing to the Run step.

import { useRef, useState } from 'react';
import type { HttpMethod } from '../types';
import {
  useStore,
  methodHasBody,
  isBuildComplete,
  isRunActive,
} from '../state/store';
import { copy } from '../constants/copy';
import { VariablePicker } from './VariablePicker';
import { RequestPreview } from './RequestPreview';
import { ConfirmDialog } from './ConfirmDialog';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

type EditableEl = HTMLInputElement | HTMLTextAreaElement;
interface FocusTarget {
  el: EditableEl;
  apply: (value: string) => void;
}

export function RequestBuilder() {
  const csv = useStore((s) => s.csv);
  const config = useStore((s) => s.config);
  const setMethod = useStore((s) => s.setMethod);
  const setUrlTemplate = useStore((s) => s.setUrlTemplate);
  const setBodyTemplate = useStore((s) => s.setBodyTemplate);
  const setExtractPath = useStore((s) => s.setExtractPath);
  const addHeader = useStore((s) => s.addHeader);
  const updateHeader = useStore((s) => s.updateHeader);
  const removeHeader = useStore((s) => s.removeHeader);
  const setStep = useStore((s) => s.setStep);
  const runPhase = useStore((s) => s.run.phase);
  const saveAuthHeaders = useStore((s) => s.saveAuthHeaders);
  const setSaveAuthHeaders = useStore((s) => s.setSaveAuthHeaders);
  const resetConfig = useStore((s) => s.resetConfig);

  const [resetOpen, setResetOpen] = useState(false);

  // The field (and its store setter) most recently focused, so chip clicks know
  // where to insert. Not state — changing it must not trigger a re-render.
  const lastFocused = useRef<FocusTarget | null>(null);

  function register(el: EditableEl, apply: (value: string) => void) {
    lastFocused.current = { el, apply };
  }

  function insertToken(token: string) {
    const target = lastFocused.current;
    if (!target) return;
    const { el, apply } = target;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const insertText = `{{${token}}}`;
    const next = el.value.slice(0, start) + insertText + el.value.slice(end);
    apply(next);
    // Restore focus + caret after React re-renders the controlled value.
    const caret = start + insertText.length;
    requestAnimationFrame(() => {
      el.focus();
      try {
        el.setSelectionRange(caret, caret);
      } catch {
        /* setSelectionRange is unsupported on some input types; ignore. */
      }
    });
  }

  if (!csv) return null; // gating in the store prevents reaching Build without a CSV

  const showBody = methodHasBody(config.method);
  const canProceed = isBuildComplete(config, csv.columns);
  const locked = isRunActive(runPhase); // config is read-only while a run is active

  return (
    <section className="panel builder">
      <h2 className="panel__title">{copy.build.title}</h2>

      {locked && <p className="builder__locked">{copy.build.lockedNote}</p>}

      <div className="builder__grid">
        <fieldset className="builder__form" disabled={locked}>
          {/* Method + URL */}
          <div className="field">
            <label className="field__label" htmlFor="method-select">
              {copy.build.methodLabel}
            </label>
            <div className="method-url">
              <select
                id="method-select"
                className="method-url__method"
                value={config.method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="method-url__url"
                aria-label={copy.build.urlLabel}
                placeholder={copy.build.urlPlaceholder}
                value={config.urlTemplate}
                onFocus={(e) => register(e.currentTarget, setUrlTemplate)}
                onChange={(e) => setUrlTemplate(e.target.value)}
              />
            </div>
          </div>

          {/* Headers */}
          <div className="field">
            <span className="field__label">{copy.build.headersLabel}</span>
            <div className="headers">
              {config.headers.map((header, i) => (
                <div className="headers__row" key={i}>
                  <input
                    type="text"
                    className="headers__key"
                    placeholder={copy.build.headerKeyPlaceholder}
                    value={header.key}
                    onFocus={(e) =>
                      register(e.currentTarget, (v) => updateHeader(i, { key: v }))
                    }
                    onChange={(e) => updateHeader(i, { key: e.target.value })}
                  />
                  <input
                    type="text"
                    className="headers__value"
                    placeholder={copy.build.headerValuePlaceholder}
                    value={header.value}
                    onFocus={(e) =>
                      register(e.currentTarget, (v) => updateHeader(i, { value: v }))
                    }
                    onChange={(e) => updateHeader(i, { value: e.target.value })}
                  />
                  <button
                    type="button"
                    className="headers__remove"
                    aria-label={copy.build.removeHeader}
                    onClick={() => removeHeader(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn--ghost headers__add" onClick={addHeader}>
                + {copy.build.addHeader}
              </button>
            </div>
          </div>

          {/* Body (hidden for GET/DELETE; text is preserved, not cleared) */}
          {showBody ? (
            <div className="field">
              <label className="field__label" htmlFor="body-editor">
                {copy.build.bodyLabel}
              </label>
              <textarea
                id="body-editor"
                className="body-editor"
                rows={6}
                spellCheck={false}
                placeholder={copy.build.bodyPlaceholder}
                value={config.bodyTemplate}
                onFocus={(e) => register(e.currentTarget, setBodyTemplate)}
                onChange={(e) => setBodyTemplate(e.target.value)}
              />
            </div>
          ) : (
            <p className="body-hidden-note">{copy.build.bodyHiddenNote(config.method)}</p>
          )}

          <VariablePicker columns={csv.columns} onInsert={insertToken} />

          {/* Response value extraction — a fixed dot-path, NOT a {{token}} field,
              so it is intentionally not registered for VariablePicker inserts. */}
          <div className="field">
            <label className="field__label" htmlFor="extract-path">
              {copy.build.extract.label}
            </label>
            <input
              id="extract-path"
              type="text"
              className="method-url__url"
              placeholder={copy.build.extract.placeholder}
              value={config.extractPath}
              onChange={(e) => setExtractPath(e.target.value)}
            />
            <p className="field__hint">{copy.build.extract.hint}</p>
          </div>
        </fieldset>

        <RequestPreview />
      </div>

      <div className="persist">
        <p className="persist__note">{copy.build.persist.note}</p>
        <div className="persist__controls">
          <label className="persist__optin">
            <input
              type="checkbox"
              checked={saveAuthHeaders}
              disabled={locked}
              onChange={(e) => setSaveAuthHeaders(e.target.checked)}
            />
            {copy.build.persist.saveAuthHeaders}
          </label>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={locked}
            onClick={() => setResetOpen(true)}
          >
            {copy.build.persist.reset}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title={copy.build.persist.resetConfirm.title}
        message={copy.build.persist.resetConfirm.message}
        confirmLabel={copy.build.persist.resetConfirm.confirm}
        cancelLabel={copy.build.persist.resetConfirm.cancel}
        onConfirm={() => {
          setResetOpen(false);
          resetConfig();
        }}
        onCancel={() => setResetOpen(false)}
      />

      <div className="builder__footer">
        {!canProceed && <p className="builder__gate">{copy.build.gateReason}</p>}
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canProceed}
          onClick={() => setStep(2)}
        >
          {copy.build.continue}
        </button>
      </div>
    </section>
  );
}
