<template>
  <button
    class="primary-button"
    :class="[
      `primary-button--${size}`,
      `primary-button--${resolvedTone}`,
      `primary-button--theme-${theme}`,
      block ? 'primary-button--block' : ''
    ]"
    :disabled="disabled || loading"
    :loading="loading"
    :open-type="openType"
    @click="handleClick"
  >
    <slot name="icon" />
    <text class="primary-button__text">
      <slot>{{ loading && loadingText ? loadingText : text }}</slot>
    </text>
  </button>
</template>

<script>
export default {
  name: 'PrimaryButton',
  props: {
    text: {
      type: String,
      default: '确认'
    },
    loadingText: {
      type: String,
      default: ''
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    block: {
      type: Boolean,
      default: true
    },
    plain: {
      type: Boolean,
      default: false
    },
    tone: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'outline', 'light', 'ghost', 'danger'].includes(value)
    },
    theme: {
      type: String,
      default: 'light',
      validator: (value) => ['light', 'dark'].includes(value)
    },
    size: {
      type: String,
      default: 'normal',
      validator: (value) => ['small', 'normal', 'large'].includes(value)
    },
    openType: {
      type: String,
      default: ''
    }
  },
  emits: ['click'],
  computed: {
    resolvedTone() {
      return this.plain ? 'outline' : this.tone;
    }
  },
  methods: {
    handleClick(event) {
      if (this.disabled || this.loading) {
        return;
      }
      this.$emit('click', event);
    }
  }
};
</script>

<style scoped>
.primary-button {
  box-sizing: border-box;
  min-width: 176rpx;
  margin: 0;
  padding: 0 48rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  border: 1rpx solid transparent;
  border-radius: 999rpx;
  background: var(--app-primary, #031632);
  color: var(--app-on-primary, #ffffff);
  line-height: 1.25;
  white-space: normal;
  transition: transform 160ms ease, opacity 160ms ease;
}

.primary-button::after {
  border: 0;
}

.primary-button:active {
  opacity: 0.9;
  transform: scale(0.98);
}

.primary-button[disabled] {
  border-color: transparent;
  background: rgba(126, 113, 93, 0.28);
  color: rgba(3, 22, 50, 0.48);
  opacity: 1;
  transform: none;
}

.primary-button--block {
  width: 100%;
}

.primary-button--small {
  min-height: 80rpx;
  padding: 0 36rpx;
}

.primary-button--normal {
  min-height: 96rpx;
}

.primary-button--large {
  min-height: 112rpx;
  padding: 0 64rpx;
}

.primary-button--primary {
  background: #031632;
  color: #ffffff;
  box-shadow: 0 12rpx 32rpx rgba(3, 22, 50, 0.14);
}

.primary-button--secondary {
  background: #f0debd;
  color: #031632;
  box-shadow: 0 8rpx 24rpx rgba(126, 113, 93, 0.18);
}

.primary-button--outline {
  border-color: rgba(3, 22, 50, 0.28);
  background: transparent;
  color: #031632;
  box-shadow: none;
}

.primary-button--light {
  background: #fbf9f9;
  color: #031632;
  box-shadow: 0 8rpx 40rpx rgba(3, 22, 50, 0.24);
}

.primary-button--ghost {
  border-color: rgba(240, 222, 189, 0.34);
  background: rgba(251, 249, 249, 0.08);
  color: inherit;
  box-shadow: none;
}

.primary-button--danger {
  background: #ba1a1a;
  color: #ffffff;
}

.primary-button--outline[disabled],
.primary-button--ghost[disabled] {
  border-color: rgba(240, 222, 189, 0.28);
  background: rgba(240, 222, 189, 0.14);
  color: rgba(3, 22, 50, 0.46);
}

.primary-button--theme-dark[disabled] {
  background: rgba(251, 249, 249, 0.12);
  color: rgba(251, 249, 249, 0.42);
}

.primary-button--theme-dark.primary-button--primary {
  background: #f3e0c0;
  color: #031632;
  box-shadow: 0 14rpx 40rpx rgba(243, 224, 192, 0.18);
}

.primary-button--theme-dark.primary-button--secondary {
  border-color: rgba(243, 224, 192, 0.34);
  background: rgba(243, 224, 192, 0.16);
  color: #f3e0c0;
  box-shadow: none;
}

.primary-button--theme-dark.primary-button--outline {
  border-color: rgba(243, 224, 192, 0.48);
  background: transparent;
  color: #f3e0c0;
}

.primary-button--theme-dark.primary-button--light {
  background: #fbf9f9;
  color: #031632;
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.22);
}

.primary-button--theme-dark.primary-button--ghost {
  border-color: rgba(243, 224, 192, 0.28);
  background: rgba(251, 249, 249, 0.08);
  color: #fbf9f9;
}

.primary-button--theme-dark.primary-button--outline[disabled],
.primary-button--theme-dark.primary-button--ghost[disabled] {
  border-color: rgba(243, 224, 192, 0.18);
  background: rgba(251, 249, 249, 0.08);
  color: rgba(251, 249, 249, 0.42);
}

.primary-button__text {
  color: inherit;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 40rpx;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.primary-button--small .primary-button__text {
  font-size: 24rpx;
  line-height: 32rpx;
}

.primary-button--large .primary-button__text {
  font-size: 32rpx;
  line-height: 48rpx;
}
</style>
