import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
// GitHub Pages serves this project at /queuepilot/, so the production build
// needs that base path. Local dev/preview stay at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/queuepilot/' : '/',
  plugins: [react()],
}));
