# Milestone: Application Startup Fixes

**Date**: 2026-02-04
**Module**: @kiosk/ipc, @kiosk/app

## Issue 1: Preload Context Detection

When running the application, the preload script failed with:

```
[Preload] Failed to expose shellAPI: TypeError: Cannot read properties of undefined (reading 'exposeInMainWorld')
```

## Root Cause

The `@kiosk/ipc` package's `index.ts` re-exports from `./preload`, causing the preload script to be loaded in the **main process** when the main process imports `@kiosk/ipc`:

```typescript
// apps/kiosk/src/main/index.ts
import { registerAllHandlers, unregisterAllHandlers } from '@kiosk/ipc';
```

The preload script auto-executed `exposeShellAPI()` on module load, but `contextBridge` is only available in the **preload context**, not the main process. Hence the error.

## Solution

Added a context detection check in `packages/ipc/src/preload.ts`:

```typescript
/**
 * Check if running in preload context
 * contextBridge is only available in the preload script context
 */
function isPreloadContext(): boolean {
  return typeof contextBridge !== 'undefined' && contextBridge !== null;
}

function exposeShellAPI(): void {
  if (!isPreloadContext()) {
    // Not in preload context (e.g., main process import), skip
    return;
  }
  // ... expose API
}
```

## Changes

- Modified `packages/ipc/src/preload.ts` to detect if running in preload context before calling `contextBridge.exposeInMainWorld()`
- Added new test file `packages/ipc/src/__tests__/preload.test.ts` with 7 test cases covering:
  - Context detection when `contextBridge` is undefined (main process)
  - Context detection when `contextBridge` is available (preload context)
  - Graceful error handling when `exposeInMainWorld` fails
  - shellAPI method exports and IPC invocation

## Test Results

```
Test Files  4 passed (4)
     Tests  47 passed (47)
```

All existing tests continue to pass, and the new preload tests verify correct behavior in both contexts.

---

## Issue 2: ProtocolHandler Missing Base Path

After fixing the preload issue, the app failed with:

```
Failed to start application: Error: Base path required for initial ProtocolHandler creation
```

### Root Cause

The `getProtocolHandler()` function in `@kiosk/core` requires a `basePath` argument when first called, but `apps/kiosk/src/main/index.ts` was calling it without one.

### Solution

Updated `apps/kiosk/src/main/index.ts` to calculate the correct resource path based on whether the app is packaged:

```typescript
// In production: extraResources are at process.resourcesPath/renderer
// In development: resources are at app.getAppPath()/resources/renderer
const isProduction = app.isPackaged;
const rendererPath = isProduction
  ? join(process.resourcesPath, 'renderer')
  : join(app.getAppPath(), 'resources', 'renderer');

const protocolHandler = getProtocolHandler(rendererPath);
```

### Changes

- Modified `apps/kiosk/src/main/index.ts` to provide the renderer resource path to `getProtocolHandler()`
