import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
// The base path is environment-driven so the same build works on both GitHub
// Pages (served at /queuepilot/) and Vercel (served at root). The Pages deploy
// workflow sets QP_BASE=/queuepilot/; when unset (Vercel, local dev/preview)
// it defaults to root.
export default defineConfig({
  base: process.env.QP_BASE ?? '/',
  plugins: [react()],
});
