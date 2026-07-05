// Rate-limit presets. Phase 3 offers a simple radio choice; custom values and the
// full warning ladder come later. Concurrency is capped by these presets alone.

export type PresetId = 'safe' | 'balanced' | 'fast';

export interface RatePreset {
  id: PresetId;
  concurrency: number;
  delayMs: number;
}

export const PRESETS: Record<PresetId, RatePreset> = {
  safe: { id: 'safe', concurrency: 1, delayMs: 1000 },
  balanced: { id: 'balanced', concurrency: 3, delayMs: 500 },
  fast: { id: 'fast', concurrency: 5, delayMs: 200 },
};

export const PRESET_ORDER: PresetId[] = ['safe', 'balanced', 'fast'];

export const DEFAULT_PRESET: PresetId = 'safe';
