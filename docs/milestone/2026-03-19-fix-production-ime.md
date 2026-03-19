# Fix: Production IME not working

**Date**: 2026-03-19

## Problem

After packaging (`pnpm build`), the Chinese IME virtual keyboard plugin failed silently. In dev mode (`pnpm dev`) it worked correctly.

## Root Cause

`process.env.NODE_ENV` was never replaced at build time in either build step:

1. **Vite lib build** (`packages/plugin-rime-renderer/vite.config.ts`): Vite does not automatically replace `process.env.NODE_ENV` in lib mode when bundling third-party packages like Vue. This left 208 occurrences in `dist/index.js`, causing Vue 3 to run in dev mode with `__VUE_HMR_RUNTIME__` code paths active.

2. **esbuild preload bundle** (`apps/kiosk/scripts/bundle-preload.js`): No `define` option was set. In prod, esbuild inlines the plugin CJS output directly into the preload script without any replacement.

In dev mode, Node.js resolves `@kiosk/plugin-rime-renderer` at runtime (tsc + dynamic require), which uses the installed `vue` package that already has production mode determined by the runtime environment. No bundling occurs, so there is no mismatch.

## Fix

- Added `define` block to `vite.config.ts`:
  - `process.env.NODE_ENV → "production"` — eliminates all 208 runtime checks, removes HMR runtime
  - `__VUE_OPTIONS_API__`, `__VUE_PROD_DEVTOOLS__`, `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` — proper production flags
- Added `define: { 'process.env.NODE_ENV': '"production"' }` to `bundle-preload.js` `commonOptions` as a safety net.

## Verification

After fix: `dist/index.js` has 0 occurrences of `process.env.NODE_ENV` and 0 occurrences of `__VUE_HMR_RUNTIME__`.
