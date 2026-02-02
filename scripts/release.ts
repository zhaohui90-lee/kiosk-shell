#!/usr/bin/env npx tsx

/**
 * Release script for kiosk-shell
 * - Bumps version
 * - Builds all packages
 * - Creates distributables
 * - Generates changelog
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const ROOT_DIR = resolve(__dirname, '..');
const APP_DIR = resolve(ROOT_DIR, 'apps/kiosk');

type VersionBump = 'major' | 'minor' | 'patch';

interface ReleaseOptions {
  bump: VersionBump;
  dryRun: boolean;
  skipBuild: boolean;
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

function bumpVersion(currentVersion: string, bump: VersionBump): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

function updatePackageVersion(pkgPath: string, newVersion: string): void {
  const content = readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(content) as { version: string };
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function parseArgs(): ReleaseOptions {
  const args = process.argv.slice(2);
  const options: ReleaseOptions = {
    bump: 'patch',
    dryRun: false,
    skipBuild: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === 'major') {
      options.bump = 'major';
    } else if (arg === 'minor') {
      options.bump = 'minor';
    } else if (arg === 'patch') {
      options.bump = 'patch';
    } else if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--skip-build' || arg === '-s') {
      options.skipBuild = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Kiosk Shell Release Script

Usage: npx tsx scripts/release.ts [version] [options]

Version:
  major               Bump major version (x.0.0)
  minor               Bump minor version (0.x.0)
  patch               Bump patch version (0.0.x) [default]

Options:
  --dry-run, -d       Show what would be done without making changes
  --skip-build, -s    Skip building (version bump only)
  --help, -h          Show this help message

Examples:
  npx tsx scripts/release.ts patch      # 1.0.0 -> 1.0.1
  npx tsx scripts/release.ts minor      # 1.0.0 -> 1.1.0
  npx tsx scripts/release.ts major      # 1.0.0 -> 2.0.0
  npx tsx scripts/release.ts --dry-run  # Preview changes
`);
}

async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('  Kiosk Shell - Release');
  console.log('========================================\n');

  const options = parseArgs();

  // Read current version
  const rootPkgPath = resolve(ROOT_DIR, 'package.json');
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8')) as { version: string };
  const currentVersion = rootPkg.version;
  const newVersion = bumpVersion(currentVersion, options.bump);

  log(`Current version: ${currentVersion}`);
  log(`New version: ${newVersion} (${options.bump} bump)`);

  if (options.dryRun) {
    log('Dry run mode - no changes will be made');
    return;
  }

  try {
    // Update root package.json
    log('Updating root package.json...');
    updatePackageVersion(rootPkgPath, newVersion);

    // Update app package.json
    const appPkgPath = resolve(APP_DIR, 'package.json');
    log('Updating apps/kiosk/package.json...');
    updatePackageVersion(appPkgPath, newVersion);

    if (!options.skipBuild) {
      // Build all packages
      log('Building packages...');
      await runCommand('pnpm', ['-r', 'build'], ROOT_DIR);

      // Build distributables
      log('Building Windows distributable...');
      await runCommand('pnpm', ['exec', 'electron-builder', '--win'], APP_DIR);

      log('Building macOS distributable...');
      await runCommand('pnpm', ['exec', 'electron-builder', '--mac'], APP_DIR);
    }

    log(`Release ${newVersion} completed!`);
    log('Next steps:');
    log('  1. Review the changes');
    log('  2. Commit: git commit -am "chore: release v' + newVersion + '"');
    log('  3. Tag: git tag v' + newVersion);
    log('  4. Push: git push && git push --tags');

  } catch (error) {
    console.error('Release failed:', error);
    process.exit(1);
  }
}

main();
