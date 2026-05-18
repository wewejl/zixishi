<template>
  <view class="base-state" :class="[`base-state--${type}`, dark ? 'base-state--dark' : '']">
    <view v-if="type === 'loading'" class="base-state__spinner">
      <view class="base-state__spinner-dot" />
    </view>

    <view v-else class="base-state__mark">
      <slot name="mark">
        <text class="base-state__mark-text">{{ markText }}</text>
      </slot>
    </view>

    <text class="base-state__title">{{ resolvedTitle }}</text>
    <text v-if="description" class="base-state__description">{{ description }}</text>

    <button
      v-if="actionText && type !== 'loading'"
      class="base-state__action"
      :disabled="actionDisabled"
      @click="handleAction"
    >
      <text class="base-state__action-text">{{ actionText }}</text>
    </button>

    <slot />
  </view>
</template>

<script>
const DEFAULT_TITLES = {
  loading: '加载中',
  empty: '暂无内容',
  error: '加载失败'
};

const MARK_TEXT = {
  empty: '空',
  error: '!'
};

export default {
  name: 'BaseState',
  props: {
    type: {
      type: String,
      default: 'empty',
      validator: (value) => ['loading', 'empty', 'error'].includes(value)
    },
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    actionText: {
      type: String,
      default: ''
    },
    actionDisabled: {
      type: Boolean,
      default: false
    },
    dark: {
      type: Boolean,
      default: false
    }
  },
  emits: ['action', 'retry'],
  computed: {
    resolvedTitle() {
      return this.title || DEFAULT_TITLES[this.type];
    },
    markText() {
      return MARK_TEXT[this.type] || '';
    }
  },
  methods: {
    handleAction(event) {
      if (this.actionDisabled) {
        return;
      }
      this.$emit('action', event);
      if (this.type === 'error') {
        this.$emit('retry', event);
      }
    }
  }
};
</script>

<style scoped>
.base-state {
  box-sizing: border-box;
  width: 100%;
  min-height: 320rpx;
  padding: 64rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 48rpx;
  background: #ffffff;
  box-shadow: 0 20rpx 80rpx rgba(26, 43, 72, 0.05);
}

.base-state__spinner,
.base-state__mark {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: #f0debd;
  box-shadow: 0 0 48rpx rgba(214, 196, 165, 0.28);
}

.base-state__spinner-dot {
  width: 32rpx;
  height: 32rpx;
  border-radius: 999rpx;
  background: #6a5d43;
}

.base-state__mark-text {
  color: #6a5d43;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 36rpx;
}

.base-state--error .base-state__mark {
  background: #ffdad6;
  box-shadow: none;
}

.base-state--error .base-state__mark-text {
  color: #ba1a1a;
}

.base-state__title {
  display: block;
  max-width: 100%;
  color: #031632;
  font-size: 32rpx;
  font-weight: 600;
  line-height: 48rpx;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.base-state__description {
  display: block;
  box-sizing: border-box;
  max-width: 560rpx;
  margin-top: 12rpx;
  color: #44474d;
  font-size: 26rpx;
  line-height: 40rpx;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.base-state__action {
  box-sizing: border-box;
  min-width: 200rpx;
  min-height: 88rpx;
  margin-top: 32rpx;
  padding: 0 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999rpx;
  background: #031632;
  line-height: 1.25;
  white-space: normal;
}

.base-state__action::after {
  border: 0;
}

.base-state__action[disabled] {
  background: #dbdad9;
}

.base-state__action-text {
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 36rpx;
  overflow-wrap: anywhere;
}

.base-state--dark {
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
  box-shadow: 0 0 80rpx rgba(229, 211, 179, 0.12), inset 0 0 40rpx rgba(229, 211, 179, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.base-state--dark .base-state__title,
.base-state--dark .base-state__description {
  color: #ffffff;
}

.base-state--dark .base-state__description {
  opacity: 0.72;
}
</style>
