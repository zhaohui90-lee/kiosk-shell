# Milestone: Refactor hardware-info.ts to use systeminformation

**Date**: 2026-03-04
**Module**: `@kiosk/device`

## Summary

Refactored `hardware-info.ts` to uniformly use the `systeminformation` (si) library instead of mixing Node.js `os` module with `si`. This improves data richness (e.g., network gateway info), consistency, and robustness.

## Changes

### hardware-info.ts
- Removed `import * as os from 'os'` — all hardware info now comes from `systeminformation`
- `getOsInfo()`: sync → async, uses `si.osInfo()` with platform mapping (Windows→win32, Darwin→darwin)
- `getCpuInfo()`: sync → async, uses `si.cpu()` with GHz→MHz conversion
- `getMemoryInfo()`: sync → async, uses `si.mem()`
- `getNetworkInfo()`: sync → async, uses `si.networkInterfaces()` + `si.networkGatewayDefault()`
- `getDisplayInfo()`: added `si.graphics()` fallback for non-Electron environments
- `getSystemMerics()` → `getSystemMetrics()`: fixed typo in function name
- `collectHardwareInfo()`: uses `Promise.all` for parallel execution
- All functions have independent try/catch with sensible fallback values

### index.ts
- Updated export: `getSystemMerics` → `getSystemMetrics`

### Tests
- Fully rewritten to mock `systeminformation` instead of relying on live `os` module
- All tests are now async
- Added error fallback path tests for every function
- Added tests for platform mapping, parallel execution, and edge cases
- 35 tests, all passing

## Verification
- `pnpm --filter @kiosk/device test` — 81 tests passed (35 hardware-info)
- `pnpm -r build` — full monorepo build passes
