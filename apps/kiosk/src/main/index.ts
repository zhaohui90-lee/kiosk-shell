/**
 * @kiosk/app - Main Process Entry
 * Kiosk shell application for medical self-service terminals
 */

import { app } from 'electron';

app.whenReady().then(() => {
  // TODO: Initialize modules in Phase 2+
  console.log('Kiosk Shell starting...');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
