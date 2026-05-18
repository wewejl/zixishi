import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginCandidates = [
  resolve('node_modules/@vitejs/plugin-vue/dist/index.mjs'),
  resolve('../frontend/node_modules/@vitejs/plugin-vue/dist/index.mjs')
];
const pluginPath = pluginCandidates.find((candidate) => existsSync(candidate));
const { default: vue } = await import(pathToFileURL(pluginPath).href);
const vueRuntimeCandidates = [
  resolve('node_modules/vue/dist/vue.runtime.esm-bundler.js'),
  resolve('../frontend/node_modules/vue/dist/vue.runtime.esm-bundler.js')
];
const vueRuntimePath = vueRuntimeCandidates.find((candidate) => existsSync(candidate));

export default {
  plugins: [vue()],
  resolve: {
    alias: {
      vue: vueRuntimePath
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
};
