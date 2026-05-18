import { createSSRApp } from 'vue';
import App from './App.vue';
import { authStore } from './stores/auth';
import { hideNativeTabBar } from './utils/route';

export function createApp() {
  authStore.initFromStorage();
  const app = createSSRApp(App);
  app.mixin({
    onShow() {
      hideNativeTabBar();
    }
  });
  return { app };
}
