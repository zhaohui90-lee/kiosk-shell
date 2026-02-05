#!/usr/bin/env npx tsx

/**
 * Build script for kiosk-shell
 * - Builds all packages
 * - Optionally creates distributable
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const ROOT_DIR = resolve(__dirname, '..');
const APP_DIR = resolve(ROOT_DIR, 'apps/kiosk');

interface BuildOptions {
  platform?: 'win' | 'mac' | 'all';
  skipPackages?: boolean;
  verbose?: boolean;
}

function log(message: string): void {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);
}

function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`);

    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function buildPackages(): Promise<void> {
  log('Building all packages...');
  await runCommand('pnpm', ['-r', 'build'], ROOT_DIR);
  log('All packages built successfully');
}

async function createDistributable(platform: string): Promise<void> {
  log(`Creating distributable for ${platform}...`);

  const args = ['exec', 'electron-builder'];

  if (platform === 'win') {
    args.push('--win');
  } else if (platform === 'mac') {
    args.push('--mac');
  }

  await runCommand('pnpm', args, APP_DIR);
  log(`Distributable created for ${platform}`);
}

function parseArgs(): BuildOptions {
  const args = process.argv.slice(2);
  const options: BuildOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--win' || arg === '-w') {
      options.platform = 'win';
    } else if (arg === '--mac' || arg === '-m') {
      options.platform = 'mac';
    } else if (arg === '--all' || arg === '-a') {
      options.platform = 'all';
    } else if (arg === '--skip-packages' || arg === '-s') {
      options.skipPackages = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Kiosk Shell Build Script

Usage: npx tsx scripts/build.ts [options]

Options:
  --win, -w           Build for Windows
  --mac, -m           Build for macOS
  --all, -a           Build for all platforms
  --skip-packages, -s Skip building packages (use existing dist)
  --verbose, -v       Verbose output
  --help, -h          Show this help message

Examples:
  npx tsx scripts/build.ts              # Build packages only
  npx tsx scripts/build.ts --win        # Build packages and Windows distributable
  npx tsx scripts/build.ts --mac        # Build packages and macOS distributable
  npx tsx scripts/build.ts -s --win     # Skip packages, build Windows only
`);
}

async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('  Kiosk Shell - Build');
  console.log('========================================\n');

  // Set default UPDATE_SERVER_URL if not provided (required by electron-builder publish config)
  if (!process.env['UPDATE_SERVER_URL']) {
    process.env['UPDATE_SERVER_URL'] = 'https://update.example.com';
    log('UPDATE_SERVER_URL not set, using placeholder. Set this env var for production builds.');
  }

  // Skip code signing if CSC_LINK is not set (development builds)
  if (!process.env['CSC_LINK'] && !process.env['CSC_IDENTITY_AUTO_DISCOVERY']) {
    process.env['CSC_IDENTITY_AUTO_DISCOVERY'] = 'false';
    log('CSC_LINK not set, skipping code signing. Set CSC_LINK for production builds.');
  }

  const options = parseArgs();
  const startTime = Date.now();

  try {
    // Build packages
    if (!options.skipPackages) {
      await buildPackages();
    } else {
      log('Skipping package build');
    }

    // Create distributable if platform specified
    if (options.platform) {
      if (options.platform === 'all') {
        await createDistributable('win');
        await createDistributable('mac');
      } else {
        await createDistributable(options.platform);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Build completed in ${elapsed}s`);

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();
