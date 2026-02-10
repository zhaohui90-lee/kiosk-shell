/**
 * Bundle preload script using esbuild
 * Resolves workspace dependencies and outputs a self-contained preload script.
 *
 * Uses a custom resolve plugin to bypass stale Yarn PnP manifests
 * that may exist in parent directories and interfere with resolution.
 */
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const nodeModulesDir = path.join(projectRoot, 'node_modules');

/**
 * Plugin to resolve @kiosk/* workspace packages via local node_modules symlinks,
 * bypassing any Yarn PnP manifest that esbuild may find in parent directories.
 */
const resolveWorkspacePlugin = {
  name: 'resolve-workspace',
  setup(build) {
    build.onResolve({ filter: /^@kiosk\// }, (args) => {
      // @kiosk/ipc/preload -> module=@kiosk/ipc, subpath=preload
      const parts = args.path.split('/');
      const moduleName = parts.slice(0, 2).join('/');
      const subpath = parts.slice(2).join('/');

      // Resolve via the package.json exports field
      const pkgJsonPath = path.join(nodeModulesDir, moduleName, 'package.json');
      const pkg = require(pkgJsonPath);

      let resolvedFile;
      if (subpath && pkg.exports && pkg.exports['./' + subpath]) {
        const exportEntry = pkg.exports['./' + subpath];
        const target = typeof exportEntry === 'string' ? exportEntry : exportEntry.default;
        resolvedFile = path.join(nodeModulesDir, moduleName, target);
      } else if (!subpath) {
        const main = (pkg.exports && pkg.exports['.'] && pkg.exports['.'].default) || pkg.main;
        resolvedFile = path.join(nodeModulesDir, moduleName, main);
      }

      if (resolvedFile) {
        return { path: resolvedFile };
      }
      return null;
    });
  },
};

const { build } = require('esbuild');

build({
  entryPoints: [path.join(distDir, 'preload', 'index.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  outfile: path.join(distDir, 'preload', 'index.js'),
  allowOverwrite: true,
  plugins: [resolveWorkspacePlugin],
}).then(() => {
  console.log('[bundle-preload] Preload script bundled successfully');
}).catch((err) => {
  console.error('[bundle-preload] Failed:', err.message);
  process.exit(1);
});
