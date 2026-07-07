// Live preview of the real request built from CSV row 1. Recomputes on every
// config change. Surfaces three checks:
//   - unresolved {{tokens}} -> red chips (these block the Run step, gated in store)
//   - substituted URL fails new URL() -> warning
//   - substituted JSON body fails JSON.parse -> non-blocking warning

import { useMemo } from 'react';
import { useStore, useCopy, methodHasBody, configUnresolvedTokens } from '../state/store';
import { substitute, substituteUrl } from '../engine/templating';

export function RequestPreview() {
  const copy = useCopy();
  const csv = useStore((s) => s.csv);
  const config = useStore((s) => s.config);

  const columns = csv?.columns ?? [];
  const unresolved = useMemo(
    () => configUnresolvedTokens(config, columns),
    [config, columns],
  );

  const row = csv?.rows[0];
  const showBody = methodHasBody(config.method);

  const rendered = useMemo(() => {
    if (!row) return null;
    const url = substituteUrl(config.urlTemplate, row);
    const headers = config.headers
      .filter((h) => h.key.trim() !== '')
      .map((h) => ({ key: substitute(h.key, row), value: substitute(h.value, row) }));
    const body = showBody ? substitute(config.bodyTemplate, row, { jsonEscape: true }) : '';

    let urlInvalid = false;
    if (url.trim() !== '') {
      try {
        new URL(url);
      } catch {
        urlInvalid = true;
      }
    }

    let jsonInvalid = false;
    if (showBody && body.trim() !== '') {
      try {
        JSON.parse(body);
      } catch {
        jsonInvalid = true;
      }
    }

    return { url, headers, body, urlInvalid, jsonInvalid };
  }, [row, config, showBody]);

  return (
    <aside className="reqpreview">
      <div className="reqpreview__head">
        <h3 className="reqpreview__title">{copy.preview.title}</h3>
        <span className="reqpreview__row1">{copy.preview.basedOnRow1}</span>
      </div>

      {unresolved.length > 0 && (
        <div className="reqpreview__unresolved" role="alert">
          <span className="reqpreview__unresolved-title">{copy.preview.unresolvedTitle}</span>
          <span className="reqpreview__chips">
            {unresolved.map((token) => (
              <span key={token} className="chip chip--error">{`{{${token}}}`}</span>
            ))}
          </span>
        </div>
      )}

      {!row ? (
        <p className="reqpreview__empty">{copy.preview.noRows}</p>
      ) : (
        rendered && (
          <div className="reqpreview__body">
            <div className="reqpreview__line">
              <span className="reqpreview__method">{config.method}</span>
              <span className="reqpreview__url">{rendered.url || '—'}</span>
            </div>
            {rendered.urlInvalid && (
              <p className="reqpreview__warn">{copy.preview.invalidUrl}</p>
            )}

            {rendered.headers.length > 0 && (
              <div className="reqpreview__section">
                <span className="reqpreview__label">{copy.preview.headersLabel}</span>
                <ul className="reqpreview__headers">
                  {rendered.headers.map((h, i) => (
                    <li key={i}>
                      <span className="reqpreview__hkey">{h.key}</span>
                      <span className="reqpreview__hsep">: </span>
                      <span className="reqpreview__hval">{h.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showBody && config.bodyTemplate.trim() !== '' && (
              <div className="reqpreview__section">
                <span className="reqpreview__label">{copy.preview.bodyLabel}</span>
                <pre className="reqpreview__code">{rendered.body}</pre>
                {rendered.jsonInvalid && (
                  <p className="reqpreview__warn">{copy.preview.invalidJson}</p>
                )}
              </div>
            )}
          </div>
        )
      )}
    </aside>
  );
}
