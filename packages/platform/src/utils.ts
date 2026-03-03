/**
 * Platform module utility functions
 */

import * as os from 'os';

/**
 * Get the local IPv4 address of the machine.
 * Returns the first non-internal IPv4 address found, or empty string if none.
 */
export function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const entry of iface) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return '';
}
