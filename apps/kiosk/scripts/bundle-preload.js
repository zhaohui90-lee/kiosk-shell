/**
 * Bundle preload script using esbuild
 * Resolves workspace dependencies and outputs a self-contained preload script.
 *
 * Uses a custom resolve plugin to bypass stale Yarn PnP manifests
 * that may exist in parent directories and interfere with resolution.
 */
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const repoRoot = path.join(projectRoot, '..', '..');
const distDir = path.join(projectRoot, 'dist');

function resolveWorkspacePackageRoot(moduleName) {
  const parts = moduleName.split('/');
  if (parts.length !== 2 || parts[0] !== '@kiosk') {
    return null;
  }

  const packageName = parts[1];
  return path.join(repoRoot, 'packages', packageName);
}

/**
 * Plugin to resolve @kiosk/* workspace packages via monorepo package roots,
 * bypassing node_modules layout differences and stale package-manager metadata.
 */
const resolveWorkspacePlugin = {
  name: 'resolve-workspace',
  setup(build) {
    build.onResolve({ filter: /^@kiosk\// }, (args) => {
      // @kiosk/ipc/preload -> module=@kiosk/ipc, subpath=preload
      const parts = args.path.split('/');
      const moduleName = parts.slice(0, 2).join('/');
      const subpath = parts.slice(2).join('/');

      const workspaceRoot = resolveWorkspacePackageRoot(moduleName);
      if (!workspaceRoot) {
        return null;
      }

      // Resolve via the package.json exports field from the actual workspace root.
      const pkgJsonPath = path.join(workspaceRoot, 'package.json');
      const pkg = require(pkgJsonPath);

      let resolvedFile;
      if (subpath && pkg.exports && pkg.exports['./' + subpath]) {
        const exportEntry = pkg.exports['./' + subpath];
        const target = typeof exportEntry === 'string' ? exportEntry : exportEntry.default;
        resolvedFile = path.join(workspaceRoot, target);
      } else if (!subpath) {
        const main = (pkg.exports && pkg.exports['.'] && pkg.exports['.'].default) || pkg.main;
        resolvedFile = path.join(workspaceRoot, main);
      }

      if (resolvedFile) {
        return { path: resolvedFile };
      }
      return null;
    });
  },
};

const { build } = require('esbuild');

const commonOptions = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  allowOverwrite: true,
  plugins: [resolveWorkspacePlugin],
};

Promise.all([
  // Bundle main preload script
  build({
    ...commonOptions,
    entryPoints: [path.join(projectRoot, 'src', 'preload', 'index.ts')],
    outfile: path.join(distDir, 'preload', 'index.js'),
  }),
  // Bundle admin preload script
  build({
    ...commonOptions,
    entryPoints: [path.join(projectRoot, 'src', 'preload', 'admin.ts')],
    outfile: path.join(distDir, 'preload', 'admin.js'),
  }),
]).then(() => {
  console.log('[bundle-preload] Preload scripts bundled successfully');
}).catch((err) => {
  console.error('[bundle-preload] Failed:', err.message);
  process.exit(1);
});
