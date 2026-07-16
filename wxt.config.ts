import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  outDir: 'output',
  manifest: {
    name: 'marimo live',
    description: 'Render marimo notebooks inline on GitHub instead of raw Python source.',
    permissions: [],
    host_permissions: ['*://github.com/*', '*://raw.githubusercontent.com/*'],
  },
});
