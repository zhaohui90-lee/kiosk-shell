import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    cssInjectedByJs({
      // Electron preload runs before HTML is parsed: document.head is null at that point.
      // Fall back to document.documentElement (<html>) so the style is always injected.
      injectCode: (cssCode) =>
        `(function(){try{if(typeof document!=="undefined"){` +
        `var t=document.head||document.documentElement;` +
        `if(t){var e=document.createElement("style");` +
        `e.textContent=${cssCode};t.appendChild(e);}}}catch(r){}})();`,
    }),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts'],
      rollupTypes: true,
    }),
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
    '__VUE_OPTIONS_API__': 'true',
    '__VUE_PROD_DEVTOOLS__': 'false',
    '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': 'false',
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      // Vue is bundled into the output so the preload bundle stays self-contained
    },
    sourcemap: true,
    emptyOutDir: true,
  },
})
