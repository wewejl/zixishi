<template>
  <view
    class="app-icon"
    :class="[round ? 'app-icon--round' : '', fallbackVisible ? 'app-icon--fallback' : '']"
    :style="iconStyle"
  >
    <view
      v-if="maskVisible"
      class="app-icon__mask"
      :style="maskStyle"
    />
    <image
      v-else-if="imageVisible"
      class="app-icon__image"
      :src="resolvedSrc"
      mode="aspectFit"
      @error="handleImageError"
    />
    <text v-else class="app-icon__fallback" :style="fallbackStyle">{{ fallbackText }}</text>
  </view>
</template>

<script>
import { MP_ICON_DATA } from '../../utils/mp-icon-data';

const ICON_FILE_MAP = {
  home: 'ic-home',
  home_max: 'ic-home',
  event_seat: 'ic-seat',
  seat: 'ic-seat',
  calendar_month: 'ic-seat',
  qr_code_scanner: 'ic-access',
  bolt: 'ic-access',
  access: 'ic-access',
  shopping_bag: 'ic-shop',
  local_mall: 'ic-shop',
  shop: 'ic-shop',
  person: 'ic-user',
  user: 'ic-user',
  menu: 'ic-menu',
  arrow_back: 'ic-arrow-left',
  arrow_back_ios_new: 'ic-arrow-left',
  chevron_right: 'ic-chevron-right',
  content_copy: 'ic-copy',
  lock_open: 'ic-lock-open',
  shield_lock: 'ic-shield-lock',
  power: 'ic-power',
  bluetooth_connected: 'ic-bluetooth',
  wifi: 'ic-wifi',
  password: 'ic-password',
  volume_off: 'ic-volume-off',
  window: 'ic-window',
  star: 'ic-star',
  diamond: 'ic-diamond',
  check_circle: 'ic-check-circle',
  cancel: 'ic-cancel',
  schedule: 'ic-clock',
  calendar_today: 'ic-calendar',
  military_tech: 'ic-rank',
  receipt_long: 'ic-receipt',
  fact_check: 'ic-task',
  settings: 'ic-settings',
  help: 'ic-help',
  hourglass_empty: 'ic-hourglass',
  location_on: 'ic-location',
  group: 'ic-group'
};

const MP_ICON_COLOR_MAP = {
  '#031632': '031632',
  '#1f2f4d': '1f2f4d',
  '#44474d': '44474d',
  '#4b5360': '4b5360',
  '#6a5d43': '6a5d43',
  '#75777e': '75777e',
  '#9c7836': '9c7836',
  '#f0debd': 'f0debd',
  '#f3e0c0': 'f3e0c0',
  '#ffffff': 'ffffff',
  'white': 'ffffff',
  'rgba(255,255,255,0.64)': 'ffffff-a64',
  'rgba(255, 255, 255, 0.64)': 'ffffff-a64'
};

const FALLBACK_TEXT_MAP = {
  home: '首',
  home_max: '首',
  event_seat: '座',
  seat: '座',
  calendar_month: '约',
  qr_code_scanner: '控',
  bolt: '控',
  access: '控',
  shopping_bag: '商',
  local_mall: '商',
  shop: '商',
  person: '我',
  user: '我',
  menu: '≡',
  arrow_back: '<',
  arrow_back_ios_new: '<',
  arrow_forward: '>',
  chevron_right: '>',
  content_copy: '拷',
  lock_open: '开',
  shield_lock: '盾',
  power: '电',
  bluetooth_connected: '蓝',
  wifi: '网',
  password: '码',
  volume_off: '静',
  window: '窗',
  star: '星',
  diamond: '钻',
  check_circle: '好',
  cancel: '关',
  schedule: '时',
  calendar_today: '日',
  military_tech: '榜',
  receipt_long: '单',
  fact_check: '签',
  settings: '设',
  help: '?',
  hourglass_empty: '余',
  location_on: '位',
  group: '人'
};

function normalizeMpIconColor(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return MP_ICON_COLOR_MAP[normalized] || '031632';
}

function resolveMpIconSource(file, color) {
  const key = `${file}-${normalizeMpIconColor(color)}`;
  return MP_ICON_DATA[key] || '';
}

export default {
  name: 'AppIcon',
  props: {
    name: {
      type: String,
      default: ''
    },
    src: {
      type: String,
      default: ''
    },
    size: {
      type: [Number, String],
      default: 48
    },
    color: {
      type: String,
      default: '#031632'
    },
    background: {
      type: String,
      default: 'transparent'
    },
    round: {
      type: Boolean,
      default: false
    },
    fallback: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      imageFailed: false
    };
  },
  computed: {
    normalizedName() {
      return String(this.name || '').trim();
    },
    resolvedSrc() {
      if (this.src) {
        return this.src;
      }
      const file = ICON_FILE_MAP[this.normalizedName] || (this.normalizedName ? `ic-${this.normalizedName}` : '');
      // #ifdef MP-WEIXIN
      return file ? resolveMpIconSource(file, this.color) : '';
      // #endif
      return file ? `/static/icons/${file}.svg` : '';
    },
    imageVisible() {
      // #ifdef MP-WEIXIN
      return Boolean(this.resolvedSrc) && !this.imageFailed;
      // #endif
      return Boolean(this.resolvedSrc) && !this.imageFailed && !this.maskVisible;
    },
    maskVisible() {
      // #ifdef MP-WEIXIN
      return false;
      // #endif
      return Boolean(this.resolvedSrc?.endsWith('.svg')) && !this.imageFailed;
    },
    fallbackVisible() {
      return !this.imageVisible;
    },
    fallbackText() {
      return this.fallback || FALLBACK_TEXT_MAP[this.normalizedName] || this.normalizedName.slice(0, 2).toUpperCase() || '·';
    },
    sizeValue() {
      if (typeof this.size === 'number') {
        return `${this.size}rpx`;
      }
      return String(this.size);
    },
    iconStyle() {
      return {
        width: this.sizeValue,
        height: this.sizeValue,
        color: this.color,
        background: this.background
      };
    },
    maskStyle() {
      const source = `url("${this.resolvedSrc}")`;
      return {
        backgroundColor: 'currentColor',
        maskImage: source,
        maskSize: 'contain',
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
        WebkitMaskImage: source,
        WebkitMaskSize: 'contain',
        WebkitMaskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat'
      };
    },
    fallbackStyle() {
      const size = typeof this.size === 'number' ? `${Math.max(20, Math.round(this.size * 0.52))}rpx` : '24rpx';
      return {
        fontSize: size
      };
    }
  },
  watch: {
    resolvedSrc() {
      this.imageFailed = false;
    }
  },
  methods: {
    handleImageError() {
      this.imageFailed = true;
    }
  }
};
</script>

<style scoped>
.app-icon {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  line-height: 1;
}

.app-icon--round {
  border-radius: 999rpx;
}

.app-icon__image {
  width: 100%;
  height: 100%;
  display: block;
}

.app-icon__mask {
  width: 100%;
  height: 100%;
  display: block;
}

.app-icon__fallback {
  max-width: 100%;
  color: currentColor;
  font-size: 0.52em;
  font-weight: 600;
  line-height: 1;
  text-align: center;
}
</style>
