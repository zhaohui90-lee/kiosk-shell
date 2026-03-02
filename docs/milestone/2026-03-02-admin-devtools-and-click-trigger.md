# 2026-03-02 Admin DevTools Sync & Click Zone Trigger

## Summary
Implemented two features for the admin panel:
1. DevTools auto-open/close synchronized with admin panel visibility
2. Hidden click zone injection for admin panel trigger on keyboardless kiosk devices

## Issue 1: Admin Panel DevTools Sync

### Problem
When opening the admin panel, DevTools did not open. When closing the admin panel, DevTools were not closed.

### Solution
Modified `WindowManager.showAdminWindow()` and `hideAdminWindow()` in `packages/core/src/window.ts`:
- `showAdminWindow()`: calls `webContents.openDevTools({ mode: 'detach' })` after showing
- `hideAdminWindow()`: calls `webContents.closeDevTools()` before hiding if DevTools are open
- Close intercept handler now calls `hideAdminWindow()` instead of `hide()` directly

## Issue 2: Click Zone Trigger for Admin Panel

### Problem
Kiosk devices have no external keyboard, so the `Ctrl+Shift+F12` shortcut cannot be used to trigger the admin panel.

### Solution
Injected a hidden 50x50px transparent click zone at the bottom-left corner of every page via the preload script:
- **Location**: Bottom-left corner, z-index: 2147483647
- **Trigger**: 5 consecutive clicks within 2 seconds
- **Mechanism**: Preload script injects DOM element on `DOMContentLoaded`, sends `shell:adminTrigger` IPC when threshold is reached
- **Keyboard shortcut preserved**: As fallback for development

### Configuration
```typescript
CLICK_ZONE_CONFIG = {
  size: 50,           // pixels
  clickThreshold: 5,  // clicks needed
  timeWindowMs: 2000, // milliseconds
}
```

## Files Changed
- `packages/core/src/window.ts` — DevTools sync in show/hide admin window
- `packages/ipc/src/preload.ts` — Click zone injection logic
- `packages/ipc/tsconfig.json` — Added "DOM" lib for document access
- `packages/core/src/__tests__/admin-window.test.ts` — Updated + new DevTools tests (22 tests)
- `packages/ipc/src/__tests__/click-zone.test.ts` — New click zone tests (3 tests)
