# Fix: IME Worker Thread Module Resolution in Packaged App

**Date**: 2026-03-19

## Problem

RIME Chinese IME worked in development but candidates did not appear after packaging with electron-builder. The symptom was that all IME process calls returned `{ state: 3 }` (insert raw char, no candidates).

## Root Cause

Node.js Worker threads created via `worker_threads` in Electron do **not** inherit Electron's asar filesystem hooks. The Worker thread (`worker.js`) runs from `app.asar.unpacked` and requires:

- `@libreservice/my-worker` — only in `app.asar`, not `app.asar.unpacked`
- `@libreservice/lazy-cache` — only in `app.asar`, not `app.asar.unpacked`
- `idb` (peer dep of lazy-cache) — not in the asar at all

Without asar patching, Node.js's module resolution from `app.asar.unpacked` cannot look inside `app.asar`, causing the Worker thread to crash silently on startup.

## Fix

1. Added `idb` as a direct dependency of `@kiosk/plugin-rime` (so electron-builder includes it in the packaged app)
2. Added `asarUnpack` entries to `electron-builder.yml`:
   - `**/node_modules/@kiosk/plugin-rime/node_modules/@libreservice/**/*`
   - `**/node_modules/@kiosk/plugin-rime/node_modules/idb/**/*`

This ensures all three packages are physically present in `app.asar.unpacked` and accessible to the Worker thread without needing asar hooks.

## Verification

Module resolution test from the Worker thread location in the packaged app confirmed all three packages resolve to physical paths in `app.asar.unpacked`. Both `@libreservice/my-worker` and `@libreservice/lazy-cache` can be `require()`d successfully.

## Files Changed

- `packages/plugin-rime/package.json` — added `"idb": "^8.0.0"` to dependencies
- `apps/kiosk/electron-builder.yml` — added two `asarUnpack` entries
