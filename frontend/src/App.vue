<script>
import { authStore } from './stores/auth';
import { hideNativeTabBar } from './utils/route';

export default {
  onLaunch() {
    authStore.initFromStorage();
    authStore.ensureAuthForRequest();
    hideNativeTabBar();
    console.log('App launched');
  },
  onShow() {
    hideNativeTabBar();
  }
};
</script>

<style>
page {
  background: #fbf9f9;
  color: #1b1c1c;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
