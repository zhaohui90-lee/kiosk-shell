# Milestone: Wire showEmoji and simplified Config Through Full IME Chain

**Date**: 2026-03-18
**Branch**: feat-admin-panel
**Commit**: 3aeefce

## Summary

Completed the full configuration chain for the `showEmoji` and `simplified` IME settings, from `kiosk.config.json` all the way through to the RIME engine options.

## Changes

### Configuration Layer
- `packages/shared/app-config.ts`: Added `showEmoji?: boolean` and `simplified?: boolean` to `VirtualKeyboardConfig`
- `apps/kiosk/kiosk.config.json`: Config already had these fields (user-added)

### IPC Layer
- `packages/ipc/src/types.ts`: Added `showEmoji: boolean` and `simplified: boolean` to `ImeConfig`
- `packages/ipc/src/handlers/ime/index.ts`: Updated `DEFAULT_IME_CONFIG` and `setImeConfig` to propagate new fields
- `packages/ipc/src/preload.ts`: Pass `showEmoji` and `simplified` from `vkConfig` to `installVirtualKeyboardPlugin`
- `packages/ipc/src/plugin-rime-renderer.d.ts`: Fixed stale manual declaration — added `imeSetOption` to `ImeBridge`, added `showEmoji`/`simplified` to `VirtualKeyboardOptions`

### Plugin Layer
- `packages/plugin-rime/src/renderer/index.ts`:
  - Added `imeSetOption` to `ImeApi` type
  - Added `showEmoji?: boolean` and `simplified?: boolean` to `VirtualKeyboardOptions`
  - Added private fields to `VirtualKeyboardController`
  - `ensureImeReady()` calls `imeSetOption('emoji_suggestion', showEmoji)` and `imeSetOption('simplification', !simplified)` on initialization

## Bug Fix

Identified root cause of TypeScript build error: `packages/ipc/src/plugin-rime-renderer.d.ts` was a stale manual ambient module declaration that was shadowing the real `@kiosk/plugin-rime/renderer` types. The file predated the addition of `showEmoji`/`simplified` and had to be updated. The stale declaration persisted because `moduleResolution: node` (Node10) doesn't support `package.json` exports fields, so the fallback resolution was picking up this stale declaration instead of the dist types.

## Test Results

- `@kiosk/ipc`: Build passes cleanly, test results identical to baseline (pre-existing failures unrelated to this change)
- `@kiosk/plugin-rime`: All 6 model tests pass
