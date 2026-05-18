<template>
  <view class="app-bottom-nav" :class="[`app-bottom-nav--${theme}`, fixed ? 'app-bottom-nav--fixed' : '']">
    <view class="app-bottom-nav__inner">
      <button
        v-for="item in navItems"
        :key="item.key"
        class="app-bottom-nav__item"
        :class="item.key === current ? 'app-bottom-nav__item--active' : ''"
        @click="handleSelect(item)"
      >
        <AppIcon :name="item.icon" :size="44" :color="item.key === current ? activeColor : inactiveColor" />
        <text class="app-bottom-nav__label">{{ item.label }}</text>
      </button>
    </view>
    <view class="app-bottom-nav__safe" />
  </view>
</template>

<script>
import AppIcon from './AppIcon.vue';
import { switchTab } from '../../utils/route';

const DEFAULT_ITEMS = [
  { key: 'home', label: '首页', icon: 'home', url: '/pages/home/index' },
  { key: 'booking', label: '预约', icon: 'event_seat', url: '/pages/booking/index' },
  { key: 'access', label: '控制', icon: 'bolt', url: '/pages/access/index' },
  { key: 'packages', label: '商城', icon: 'shopping_bag', url: '/pages/packages/index' },
  { key: 'profile', label: '我的', icon: 'person', url: '/pages/profile/index' }
];

export default {
  name: 'AppBottomNav',
  components: {
    AppIcon
  },
  props: {
    current: {
      type: String,
      default: 'home'
    },
    theme: {
      type: String,
      default: 'light',
      validator: (value) => ['light', 'dark'].includes(value)
    },
    fixed: {
      type: Boolean,
      default: true
    },
    items: {
      type: Array,
      default: () => DEFAULT_ITEMS
    }
  },
  emits: ['change'],
  computed: {
    navItems() {
      return this.items && this.items.length ? this.items : DEFAULT_ITEMS;
    },
    activeColor() {
      return this.theme === 'dark' ? '#f3e0c0' : '#031632';
    },
    inactiveColor() {
      return this.theme === 'dark' ? 'rgba(255,255,255,0.64)' : '#44474d';
    }
  },
  methods: {
    handleSelect(item) {
      this.$emit('change', item);
      if (item.key === this.current) {
        return;
      }
      switchTab(item.url);
    }
  }
};
</script>

<style scoped>
.app-bottom-nav {
  width: 100%;
  background: #fbf9f9;
  box-shadow: 0 -20rpx 80rpx rgba(3, 22, 50, 0.08);
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
}

.app-bottom-nav--fixed {
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 50;
}

.app-bottom-nav--dark {
  border-top: 1rpx solid rgba(243, 224, 192, 0.18);
  background: rgba(3, 22, 50, 0.9);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: none;
}

.app-bottom-nav__inner {
  height: 160rpx;
  padding: 18rpx 24rpx 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 8rpx;
}

.app-bottom-nav__safe {
  height: env(safe-area-inset-bottom);
}

.app-bottom-nav__item {
  min-width: 104rpx;
  min-height: 96rpx;
  margin: 0;
  padding: 10rpx 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  border: 0;
  border-radius: 32rpx;
  background: transparent;
  color: #4b5360;
  line-height: 1.2;
}

.app-bottom-nav__item::after {
  border: 0;
}

.app-bottom-nav__item--active {
  background: rgba(243, 224, 192, 0.62);
  color: #031632;
}

.app-bottom-nav--dark .app-bottom-nav__item {
  color: rgba(255, 255, 255, 0.64);
}

.app-bottom-nav--dark .app-bottom-nav__item--active {
  border: 1rpx solid rgba(243, 224, 192, 0.28);
  background: rgba(243, 224, 192, 0.16);
  color: #f3e0c0;
  box-shadow: inset 0 0 24rpx rgba(243, 224, 192, 0.06);
}

.app-bottom-nav__label {
  color: currentColor;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 30rpx;
  letter-spacing: 0;
  white-space: nowrap;
}
</style>
