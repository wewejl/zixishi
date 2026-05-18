<template>
  <view class="section-header" :class="[stacked ? 'section-header--stacked' : '', alignCenter ? 'section-header--center' : '']">
    <view class="section-header__main">
      <text v-if="eyebrow" class="section-header__eyebrow">{{ eyebrow }}</text>
      <text class="section-header__title">{{ title }}</text>
      <text v-if="description" class="section-header__description">{{ description }}</text>
    </view>

    <view v-if="$slots.action || actionText" class="section-header__action">
      <slot name="action">
        <button class="section-header__button" :disabled="actionDisabled" @click="handleAction">
          <text class="section-header__button-text">{{ actionText }}</text>
        </button>
      </slot>
    </view>
  </view>
</template>

<script>
export default {
  name: 'SectionHeader',
  props: {
    title: {
      type: String,
      required: true
    },
    eyebrow: {
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
    stacked: {
      type: Boolean,
      default: false
    },
    alignCenter: {
      type: Boolean,
      default: false
    }
  },
  emits: ['action'],
  methods: {
    handleAction(event) {
      if (this.actionDisabled) {
        return;
      }
      this.$emit('action', event);
    }
  }
};
</script>

<style scoped>
.section-header {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
}

.section-header--stacked {
  align-items: flex-start;
  flex-direction: column;
}

.section-header--center {
  text-align: center;
  align-items: center;
  justify-content: center;
}

.section-header__main {
  flex: 1;
  min-width: 0;
}

.section-header__eyebrow {
  display: block;
  margin-bottom: 8rpx;
  color: #6a5d43;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 32rpx;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.section-header__title {
  display: block;
  color: #031632;
  font-size: 48rpx;
  font-weight: 600;
  line-height: 64rpx;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.section-header__description {
  display: block;
  margin-top: 12rpx;
  color: #44474d;
  font-size: 28rpx;
  font-weight: 400;
  line-height: 44rpx;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.section-header__action {
  max-width: 45%;
  flex-shrink: 0;
}

.section-header__button {
  box-sizing: border-box;
  min-height: 64rpx;
  margin: 0;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999rpx;
  background: #f5f3f3;
  line-height: 1.25;
  white-space: normal;
}

.section-header__button::after {
  border: 0;
}

.section-header__button[disabled] {
  background: #efeded;
}

.section-header__button-text {
  color: #031632;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 32rpx;
  overflow-wrap: anywhere;
}

.section-header__button[disabled] .section-header__button-text {
  color: #75777e;
}
</style>
