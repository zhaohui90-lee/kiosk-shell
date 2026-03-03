# 2026-03-02 Fix Admin Network Test (Ping)

## Summary
Fixed `testNetwork` API failure in admin panel caused by macOS ping output parsing regex mismatch and added host parameter sanitization to prevent command injection.

## Root Cause
The `parsePingResult()` function in `packages/ipc/src/handlers/admin.ts` used a regex that only matched Linux ping output format (`X received`) but not macOS format (`X packets received`).

Additionally, the time statistics regex only matched `stddev` (macOS) but not `mdev` (Linux).

## Changes

### Bug Fix: Regex Compatibility
- **File**: `packages/ipc/src/handlers/admin.ts`
- Stats regex: `/(\d+) packets transmitted, (\d+) received/` -> `/(\d+) packets transmitted, (\d+)(?: packets)? received/`
- Time regex: `/min\/avg\/max\/stddev/` -> `/min\/avg\/max\/(?:std|m)dev/`

### Security Fix: Command Injection Prevention
- **File**: `packages/ipc/src/handlers/admin.ts`
- Added `isValidHost()` function to validate hostname/IP before passing to `exec()`
- Rejects hosts containing shell metacharacters (`;`, `|`, `$()`, backticks, spaces)

### Unit Tests
- **File**: `packages/ipc/src/__tests__/admin-network.test.ts` (new)
- 14 test cases covering:
  - `isValidHost`: valid hostnames, IPv4, IPv6, malicious inputs
  - `parsePingResult`: macOS, Linux, Windows (Chinese locale), packet loss, no time stats
  - `handleAdminTestNetwork`: token validation, host validation, ping execution, error handling

## Files Changed
- `packages/ipc/src/handlers/admin.ts` - regex fix + host validation + exports
- `packages/ipc/src/__tests__/admin-network.test.ts` - new test file (14 tests)
- `docs/tasks/2026-03-02-admin-panel-fixes.md` - marked Issue 3 as completed
