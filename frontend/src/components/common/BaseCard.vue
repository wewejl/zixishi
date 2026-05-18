<template>
  <view
    class="base-card"
    :class="[
      `base-card--${variant}`,
      `base-card--radius-${radius}`,
      `base-card--theme-${theme}`,
      padded ? 'base-card--padded' : '',
      elevated ? 'base-card--elevated' : '',
      borderless ? 'base-card--borderless' : '',
      clickable ? 'base-card--clickable' : ''
    ]"
    @click="handleClick"
  >
    <slot />
  </view>
</template>

<script>
export default {
  name: 'BaseCard',
  props: {
    variant: {
      type: String,
      default: 'surface',
      validator: (value) => ['surface', 'muted', 'dark', 'glass', 'profile', 'package', 'vip'].includes(value)
    },
    radius: {
      type: String,
      default: 'lg',
      validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
    },
    theme: {
      type: String,
      default: 'light',
      validator: (value) => ['light', 'dark'].includes(value)
    },
    padded: {
      type: Boolean,
      default: true
    },
    elevated: {
      type: Boolean,
      default: true
    },
    borderless: {
      type: Boolean,
      default: false
    },
    clickable: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click'],
  methods: {
    handleClick(event) {
      if (!this.clickable) {
        return;
      }
      this.$emit('click', event);
    }
  }
};
</script>

<style scoped>
.base-card {
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
  border: 1rpx solid rgba(240, 222, 189, 0.42);
  background: var(--app-surface-lowest, #ffffff);
  color: var(--app-text-strong, #031632);
}

.base-card--radius-sm {
  border-radius: 24rpx;
}

.base-card--radius-md {
  border-radius: 32rpx;
}

.base-card--radius-lg {
  border-radius: 48rpx;
}

.base-card--radius-xl {
  border-radius: 64rpx;
}

.base-card--padded {
  padding: 48rpx;
}

.base-card--elevated {
  box-shadow: var(--app-shadow-card, 0 20rpx 72rpx rgba(3, 22, 50, 0.08));
}

.base-card--borderless {
  border-color: transparent;
}

.base-card--clickable {
  transition: transform 160ms ease, opacity 160ms ease;
}

.base-card--clickable:active {
  opacity: 0.9;
  transform: scale(0.99);
}

.base-card--surface,
.base-card--profile,
.base-card--package {
  background: var(--app-surface-lowest, #ffffff);
}

.base-card--muted {
  border-color: rgba(240, 222, 189, 0.36);
  background: var(--app-surface-low, #f6f2ea);
  box-shadow: none;
}

.base-card--dark {
  border-color: rgba(240, 222, 189, 0.22);
  background: var(--app-surface-dark, #071c3e);
  color: var(--app-text-on-dark, #fbf9f9);
  box-shadow: 0 24rpx 80rpx rgba(3, 22, 50, 0.28);
}

.base-card--glass {
  border-color: rgba(240, 222, 189, 0.22);
  background: linear-gradient(135deg, rgba(251, 249, 249, 0.12), rgba(243, 224, 192, 0.06));
  color: var(--app-text-on-dark, #fbf9f9);
  box-shadow: var(--app-shadow-glow, 0 0 80rpx rgba(243, 224, 192, 0.18));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.base-card--vip {
  border-color: rgba(240, 222, 189, 0.32);
  background: linear-gradient(135deg, #031632, #071c3e 58%, #12305a);
  color: var(--app-text-on-dark, #fbf9f9);
  box-shadow: 0 24rpx 90rpx rgba(3, 22, 50, 0.24);
}

.base-card--theme-dark {
  border-color: rgba(240, 222, 189, 0.2);
  background: var(--app-surface-dark, #071c3e);
  color: var(--app-text-on-dark, #fbf9f9);
}

.base-card--theme-dark.base-card--surface,
.base-card--theme-dark.base-card--profile,
.base-card--theme-dark.base-card--package {
  background: var(--app-surface-dark, #071c3e);
}

.base-card--theme-dark.base-card--muted {
  background: var(--app-surface-dark-low, #0b2348);
}

.base-card--theme-dark.base-card--elevated {
  box-shadow: 0 28rpx 84rpx rgba(0, 0, 0, 0.22);
}
</style>
