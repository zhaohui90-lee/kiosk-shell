# 2026-03-13 Window Module Refactoring

## Summary

Refactored `@kiosk/core` window management from 3 flat files (`window.ts`, `main-window.ts`, `admin-window.ts`) into a modular `window/` directory with Strategy, Builder, Controller, and EventHandler patterns.

## Changes

### New Architecture (`packages/core/src/window/`)

| Component | File | Responsibility |
|-----------|------|----------------|
| Strategy | `strategy/window-strategy.ts` | Dev/Kiosk environment-specific config |
| Builder | `builder/window-options-builder.ts` | Fluent BrowserWindow options construction |
| EventHandler | `handler/window-event-handler.ts` | Window lifecycle event binding |
| MainWindowController | `controller/main-window-controller.ts` | Main window CRUD + mode control |
| AdminWindowController | `controller/admin-window-controller.ts` | Admin panel show/hide/toggle |
| WindowManager | `window-manager.ts` | Facade delegating to controllers |
| Index | `index.ts` | Public API barrel exports |

### Bugs Fixed During Review

1. **Critical**: `AdminWindowController.create()` — preload was applied to a throwaway builder, never used
2. `stratedy` → `strategy` (typo in field name + usages)
3. `shouldFoucsOnReady` → `shouldFocusOnReady` (typo in interface + impls)
4. `widthSize` → `withSize` (naming consistency)
5. `extralOptions` → `extraOptions` (typo in types)
6. Logger child name mismatches fixed
7. Duplicate `isWindowValid()` / `isValid()` removed
8. `!=` → `!==` in `isValid()`

### Removed Files

- `packages/core/src/window.ts`
- `packages/core/src/main-window.ts`
- `packages/core/src/admin-window.ts`
- `packages/core/src/window/types.ts` (duplicate of `src/types.ts`)

### Updated Consumers

- `apps/kiosk/src/main/index.ts` — uses new WindowManager facade API
- `packages/ipc/src/handlers/admin.ts` — `hideAdminWindow()` instead of `adminWindow.hide()`
- `packages/core/src/types.ts` — `additionalOptions` → `extraOptions`

## Test Results

- 165 tests passed (9 test files)
- New test files: `window-options-builder.test.ts`, `window-strategy.test.ts`, `main-window-controller.test.ts`, `admin-window-controller.test.ts`, `window-manager.test.ts`
- Full project build: all 11 packages compile successfully
