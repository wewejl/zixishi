<template>
  <view
    class="status-pill"
    :class="[
      `status-pill--${tone}`,
      compact ? 'status-pill--compact' : '',
      dot ? 'status-pill--with-dot' : '',
      outlined ? 'status-pill--outlined' : ''
    ]"
  >
    <slot name="icon">
      <view v-if="dot" class="status-pill__dot" />
    </slot>
    <text class="status-pill__text">{{ label }}</text>
  </view>
</template>

<script>
export default {
  name: 'StatusPill',
  props: {
    label: {
      type: String,
      required: true
    },
    tone: {
      type: String,
      default: 'neutral',
      validator: (value) => ['neutral', 'warm', 'selected', 'success', 'warning', 'danger', 'info', 'dark'].includes(value)
    },
    compact: {
      type: Boolean,
      default: false
    },
    dot: {
      type: Boolean,
      default: false
    },
    outlined: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
.status-pill {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  padding: 12rpx 28rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: 1rpx solid transparent;
  border-radius: 999rpx;
  background: #f6f2ea;
}

.status-pill--compact {
  padding: 8rpx 20rpx;
  gap: 8rpx;
}

.status-pill__text {
  color: #4b5360;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 32rpx;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.status-pill__dot {
  width: 12rpx;
  height: 12rpx;
  flex: 0 0 12rpx;
  border-radius: 999rpx;
  background: currentColor;
}

.status-pill--compact .status-pill__text {
  font-size: 22rpx;
  line-height: 30rpx;
}

.status-pill--outlined {
  border-color: rgba(240, 222, 189, 0.58);
}

.status-pill--warm {
  border-color: rgba(240, 222, 189, 0.9);
  background: rgba(243, 224, 192, 0.52);
}

.status-pill--warm .status-pill__text,
.status-pill--warm {
  color: #031632;
}

.status-pill--selected {
  background: #031632;
}

.status-pill--selected .status-pill__text,
.status-pill--selected {
  color: #ffffff;
}

.status-pill--success {
  background: #e8f5ee;
}

.status-pill--success .status-pill__text,
.status-pill--success {
  color: #1f7a4d;
}

.status-pill--warning {
  background: #fff4d8;
}

.status-pill--warning .status-pill__text,
.status-pill--warning {
  color: #936316;
}

.status-pill--danger {
  background: #fff1ef;
}

.status-pill--danger .status-pill__text,
.status-pill--danger {
  color: #c24132;
}

.status-pill--info {
  background: #eaf2ff;
}

.status-pill--info .status-pill__text,
.status-pill--info {
  color: #2457a7;
}

.status-pill--dark {
  border-color: rgba(243, 224, 192, 0.24);
  background: rgba(251, 249, 249, 0.08);
}

.status-pill--dark .status-pill__text,
.status-pill--dark {
  color: #ffffff;
}
</style>
