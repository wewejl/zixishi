<template>
  <view class="app-topbar" :class="[`app-topbar--${theme}`, fixed ? 'app-topbar--fixed' : '']">
    <view class="app-topbar__safe" />
    <view class="app-topbar__inner">
      <button v-if="resolvedLeft !== 'none'" class="app-topbar__icon-button" @click="handleLeft">
        <AppIcon :name="resolvedLeft === 'back' ? 'arrow_back_ios_new' : 'menu'" :size="48" :color="iconColor" />
      </button>
      <view v-else class="app-topbar__spacer" />

      <view class="app-topbar__title-wrap" :class="centerTitle ? 'app-topbar__title-wrap--center' : ''">
        <text class="app-topbar__title">{{ title }}</text>
        <text v-if="subtitle" class="app-topbar__subtitle">{{ subtitle }}</text>
      </view>

      <button v-if="showAvatar && avatarSrc" class="app-topbar__avatar-button" @click="handleRight">
        <image class="app-topbar__avatar" :src="avatarSrc" mode="aspectFill" />
      </button>
      <button v-else-if="showAvatar || rightPlaceholder" class="app-topbar__avatar-button" @click="handleRight">
        <AppIcon name="person" :size="40" :color="iconColor" />
      </button>
      <view v-else class="app-topbar__spacer" />
    </view>
  </view>
</template>

<script>
import AppIcon from './AppIcon.vue';

export default {
  name: 'AppTopBar',
  components: {
    AppIcon
  },
  props: {
    title: {
      type: String,
      default: '静谧空间'
    },
    subtitle: {
      type: String,
      default: ''
    },
    theme: {
      type: String,
      default: 'light',
      validator: (value) => ['light', 'dark', 'warm'].includes(value)
    },
    fixed: {
      type: Boolean,
      default: true
    },
    leftType: {
      type: String,
      default: '',
      validator: (value) => ['', 'menu', 'back', 'none'].includes(value)
    },
    showBack: {
      type: Boolean,
      default: false
    },
    showMenu: {
      type: Boolean,
      default: true
    },
    showAvatar: {
      type: Boolean,
      default: true
    },
    avatarSrc: {
      type: String,
      default: ''
    },
    rightPlaceholder: {
      type: Boolean,
      default: true
    },
    centerTitle: {
      type: Boolean,
      default: true
    },
    autoBack: {
      type: Boolean,
      default: true
    }
  },
  emits: ['back', 'menu', 'right'],
  computed: {
    resolvedLeft() {
      if (this.leftType) {
        return this.leftType;
      }
      if (this.showBack) {
        return 'back';
      }
      if (this.showMenu) {
        return 'menu';
      }
      return 'none';
    },
    iconColor() {
      return this.theme === 'dark' ? '#f3e0c0' : '#031632';
    }
  },
  methods: {
    handleLeft(event) {
      if (this.resolvedLeft === 'back') {
        this.$emit('back', event);
        if (!this.autoBack) {
          return;
        }
        uni.navigateBack({
          delta: 1,
          fail: () => {
            uni.switchTab({ url: '/pages/home/index' });
          }
        });
        return;
      }
      this.$emit('menu', event);
    },
    handleRight(event) {
      this.$emit('right', event);
    }
  }
};
</script>

<style scoped>
.app-topbar {
  width: 100%;
  color: #031632;
  background: rgba(251, 249, 249, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.app-topbar--fixed {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 50;
}

.app-topbar--warm {
  background: rgba(243, 224, 192, 0.9);
}

.app-topbar--dark {
  color: #fbf9f9;
  background: rgba(3, 22, 50, 0.86);
}

.app-topbar__safe {
  height: env(safe-area-inset-top);
}

.app-topbar__inner {
  height: 128rpx;
  padding: 0 48rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.app-topbar__icon-button,
.app-topbar__avatar-button {
  width: 64rpx;
  height: 64rpx;
  margin: 0;
  padding: 0;
  flex: 0 0 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999rpx;
  background: transparent;
}

.app-topbar--dark .app-topbar__icon-button,
.app-topbar--dark .app-topbar__avatar-button {
  border-color: rgba(243, 224, 192, 0.24);
  background: rgba(251, 249, 249, 0.08);
}

.app-topbar__icon-button::after,
.app-topbar__avatar-button::after {
  border: 0;
}

.app-topbar__spacer {
  width: 64rpx;
  height: 64rpx;
  flex: 0 0 64rpx;
}

.app-topbar__title-wrap {
  flex: 1;
  min-width: 0;
}

.app-topbar__title-wrap--center {
  text-align: center;
}

.app-topbar__title {
  display: block;
  color: currentColor;
  font-size: 48rpx;
  font-weight: 600;
  line-height: 64rpx;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-topbar__subtitle {
  display: block;
  color: currentColor;
  font-size: 22rpx;
  line-height: 30rpx;
  opacity: 0.68;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-topbar__avatar-button {
  overflow: hidden;
  border: 1rpx solid rgba(240, 222, 189, 0.48);
  background: #f0debd;
}

.app-topbar__avatar {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 999rpx;
}
</style>
