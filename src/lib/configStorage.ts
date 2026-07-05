// Persist the request template + rate preset to localStorage. No React imports.
// The trust promise is "we don't store your API keys", so header values whose
// KEY looks auth-like are saved empty unless the user explicitly opts in.
//
// Defaults are passed in (not imported from the store) to avoid a circular
// import, and so a restored config can be merged over the current default shape.

import type { RequestTemplate } from '../types';
import { PRESETS, type PresetId } from './presets';

const STORAGE_KEY = 'qp_config_v1';

// Header keys whose values are treated as sensitive (excluded by default).
const SENSITIVE_KEY = /authorization|api[-_]?key|token|secret|password|bearer/i;

interface StoredConfig {
  version: 1;
  config: RequestTemplate;
  preset: PresetId;
  saveAuthHeaders: boolean;
}

export interface LoadedConfig {
  config: RequestTemplate;
  preset: PresetId;
  saveAuthHeaders: boolean;
}

/** Blank out sensitive header values (keep the key so the row survives). */
function sanitizeConfig(config: RequestTemplate, saveAuthHeaders: boolean): RequestTemplate {
  if (saveAuthHeaders) return config;
  return {
    ...config,
    headers: config.headers.map((h) =>
      SENSITIVE_KEY.test(h.key) ? { ...h, value: '' } : h,
    ),
  };
}

export function saveConfig(
  config: RequestTemplate,
  preset: PresetId,
  saveAuthHeaders: boolean,
): void {
  try {
    const payload: StoredConfig = {
      version: 1,
      config: sanitizeConfig(config, saveAuthHeaders),
      preset,
      saveAuthHeaders,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota / disabled — persistence is best-effort */
  }
}

export function loadConfig(
  defaultConfig: RequestTemplate,
  defaultPreset: PresetId,
): LoadedConfig {
  const fallback: LoadedConfig = {
    config: defaultConfig,
    preset: defaultPreset,
    saveAuthHeaders: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<StoredConfig>;
    const loaded =
      parsed.config && typeof parsed.config === 'object' ? parsed.config : {};

    // Merge over defaults so an older/newer saved shape never crashes the app.
    const config: RequestTemplate = { ...defaultConfig, ...loaded };
    // A restored config with no header rows would lose its input row — re-seed one.
    if (!Array.isArray(config.headers) || config.headers.length === 0) {
      config.headers = [{ key: '', value: '' }];
    }

    const preset: PresetId =
      typeof parsed.preset === 'string' && parsed.preset in PRESETS
        ? (parsed.preset as PresetId)
        : defaultPreset;

    return { config, preset, saveAuthHeaders: parsed.saveAuthHeaders === true };
  } catch {
    return fallback;
  }
}

export function clearConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
