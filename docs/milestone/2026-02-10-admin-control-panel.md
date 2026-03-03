# Admin Control Panel

**Date**: 2026-02-10
**Branch**: feat-admin-panel

## Summary

Implemented a complete admin control panel ("ghost window") that is normally invisible, summoned via secret trigger, independent from business renderer, and provides privileged system operations.

## Changes

### Stage 1: Admin IPC Channels & Handlers
- Added 9 admin IPC channels to `IPC_CHANNELS` (login, exit, restart, system restart/shutdown, get config, get system info, reload business, trigger)
- Added `AdminLoginResult` and `AdminOperationResult` types
- Added rate limits for admin channels
- Created `packages/ipc/src/handlers/admin.ts` with session token management
- Added `DEFAULT_ADMIN_PASSWORD`, `ADMIN_API_NAMESPACE` constants
- 20 new tests

### Stage 2: Admin Window Management
- Added `AdminWindowConfig` interface to core types
- Extended `WindowManager` with admin window lifecycle: `createAdminWindow`, `showAdminWindow`, `hideAdminWindow`, `toggleAdminWindow`, `destroyAdminWindow`
- Admin window: `alwaysOnTop`, `frame: false`, `show: false`, close intercepted to hide
- Updated `destroy()` to also cleanup admin window
- 19 new tests

### Stage 3: Admin Preload Script
- Created `packages/ipc/src/admin-preload.ts` exposing `window.adminAPI`
- Added `./admin-preload` export to `@kiosk/ipc` package.json
- Created `apps/kiosk/src/preload/admin.ts` wrapper
- Updated `bundle-preload.js` to bundle both preload scripts
- Added `triggerAdmin()` to ShellAPI and main preload
- 8 new tests

### Stage 4: Trigger Mechanism & Integration
- Added `setupAdminPanel()` function in main process (creates admin window, loads HTML, sets password)
- Added `setupAdminTriggers()`: keyboard shortcut (`Ctrl+Shift+F12` / `Cmd+Shift+F12`) + renderer IPC click trigger
- Added `adminPassword` to `AppConfig` interface
- Updated `cleanup()` to unregister shortcuts and triggers
- Wired everything in `onAppReady()`

### Stage 5: Admin UI
- Created `apps/kiosk/resources/renderer/admin/index.html`
- Self-contained HTML/CSS/JS, dark theme (#1a1a2e)
- Custom frameless titlebar with drag region
- Login form with password input (autofocus)
- Operations panel: system info display, reload business, restart app, exit app, restart system, shutdown system
- Confirmation dialogs for destructive actions
- Session token management in-memory

## Files Modified
- `packages/ipc/src/types.ts` - Admin channels, types, rate limits
- `packages/ipc/src/constants.ts` - Admin password, namespace, error messages
- `packages/ipc/src/handlers/index.ts` - Admin handler exports
- `packages/ipc/src/index.ts` - Admin exports, registerAll/unregisterAll
- `packages/ipc/src/preload.ts` - Added triggerAdmin()
- `packages/ipc/package.json` - Added admin-preload export
- `packages/core/src/types.ts` - AdminWindowConfig
- `packages/core/src/window.ts` - Admin window methods
- `packages/core/src/index.ts` - AdminWindowConfig export
- `shared/types/shell-api.ts` - Added triggerAdmin()
- `apps/kiosk/src/main/index.ts` - Admin panel integration
- `apps/kiosk/src/main/config.ts` - adminPassword field
- `apps/kiosk/scripts/bundle-preload.js` - Bundle admin preload

## Files Created
- `packages/ipc/src/handlers/admin.ts`
- `packages/ipc/src/admin-preload.ts`
- `packages/ipc/src/__tests__/admin-handlers.test.ts`
- `packages/ipc/src/__tests__/admin-preload.test.ts`
- `packages/core/src/__tests__/admin-window.test.ts`
- `apps/kiosk/src/preload/admin.ts`
- `apps/kiosk/resources/renderer/admin/index.html`

## Test Results
- `@kiosk/ipc`: 76 tests (28 new)
- `@kiosk/core`: 97 tests (19 new)
- Total new tests: 47
