<template>
  <view
    class="glass-card"
    :class="[
      `glass-card--${variant}`,
      padded ? 'glass-card--padded' : '',
      glow ? 'glass-card--glow' : '',
      circle ? 'glass-card--circle' : ''
    ]"
    @click="handleClick"
  >
    <slot />
  </view>
</template>

<script>
export default {
  name: 'GlassCard',
  props: {
    variant: {
      type: String,
      default: 'dark',
      validator: (value) => ['dark', 'light', 'button'].includes(value)
    },
    padded: {
      type: Boolean,
      default: true
    },
    glow: {
      type: Boolean,
      default: false
    },
    circle: {
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
.glass-card {
  box-sizing: border-box;
  overflow: hidden;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 48rpx;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  color: #ffffff;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.glass-card--padded {
  padding: 48rpx;
}

.glass-card--glow {
  box-shadow: 0 0 80rpx rgba(229, 211, 179, 0.15), inset 0 0 40rpx rgba(229, 211, 179, 0.05);
}

.glass-card--circle {
  border-radius: 999rpx;
  aspect-ratio: 1 / 1;
}

.glass-card--light {
  border-color: rgba(197, 198, 206, 0.34);
  background: rgba(255, 255, 255, 0.72);
  color: #031632;
  box-shadow: 0 20rpx 80rpx rgba(26, 43, 72, 0.05);
}

.glass-card--button {
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.08);
  transition: transform 160ms ease, opacity 160ms ease;
}

.glass-card--button:active {
  opacity: 0.9;
  transform: scale(0.98);
}
</style>
