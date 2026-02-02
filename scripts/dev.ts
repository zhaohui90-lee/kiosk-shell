#!/usr/bin/env npx tsx

/**
 * Development script for kiosk-shell
 * - Builds all packages in watch mode
 * - Starts Electron with auto-reload
 */

import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '..');
const APP_DIR = resolve(ROOT_DIR, 'apps/kiosk');

let electronProcess: ChildProcess | null = null;

function log(prefix: string, message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${prefix}] ${message}`);
}

function startTscWatch(): ChildProcess {
  log('TSC', 'Starting TypeScript watch mode...');

  const tsc = spawn('pnpm', ['-r', 'build', '--parallel'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: true,
  });

  tsc.on('error', (err) => {
    log('TSC', `Error: ${err.message}`);
  });

  return tsc;
}

function startElectron(): void {
  if (electronProcess !== null) {
    log('Electron', 'Killing previous instance...');
    electronProcess.kill();
    electronProcess = null;
  }

  log('Electron', 'Starting Electron...');

  electronProcess = spawn('pnpm', ['exec', 'electron', '.'], {
    cwd: APP_DIR,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });

  electronProcess.on('close', (code) => {
    if (code !== null) {
      log('Electron', `Process exited with code ${code}`);
    }
    electronProcess = null;
  });

  electronProcess.on('error', (err) => {
    log('Electron', `Error: ${err.message}`);
  });
}

async function buildOnce(): Promise<void> {
  log('Build', 'Building all packages...');

  return new Promise((resolve, reject) => {
    const build = spawn('pnpm', ['-r', 'build'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true,
    });

    build.on('close', (code) => {
      if (code === 0) {
        log('Build', 'Build completed successfully');
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });

    build.on('error', reject);
  });
}

async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('  Kiosk Shell - Development Mode');
  console.log('========================================\n');

  try {
    // Initial build
    await buildOnce();

    // Start Electron
    startElectron();

    // Handle process signals
    process.on('SIGINT', () => {
      log('Dev', 'Shutting down...');
      if (electronProcess !== null) {
        electronProcess.kill();
      }
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      log('Dev', 'Shutting down...');
      if (electronProcess !== null) {
        electronProcess.kill();
      }
      process.exit(0);
    });

    log('Dev', 'Development server started. Press Ctrl+C to stop.');
    log('Dev', 'Run "pnpm -r build" in another terminal to rebuild and restart.');

  } catch (error) {
    console.error('Failed to start development server:', error);
    process.exit(1);
  }
}

main();
