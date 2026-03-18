<template>
  <div
    :id="ROOT_ID"
    :class="{ 'is-visible': isVisible }"
    ref="rootEl"
    @pointerdown.prevent="onKeyboardPointerDown"
  >
    <div class="vk-shell">
      <!-- Composition + status -->
      <div class="vk-topbar">
        <div class="vk-composition" :class="{ 'is-idle': !compositionText }">
          {{ compositionText || '点击输入框开始输入' }}
        </div>
        <span class="vk-status">{{ statusText }}</span>
      </div>

      <!-- Candidate strip -->
      <div v-if="candidates.length" class="vk-candidates">
        <button
          v-for="(candidate, index) in candidates"
          :key="index"
          type="button"
          :class="['vk-candidate', index === 0 ? 'is-active' : '']"
          @click="handleCandidateClick(index)"
        >
          <span class="vk-candidate-index">{{ candidateLabel(index) }}</span>
          <span>{{ candidate.text }}</span>
          <span v-if="candidate.comment" class="vk-candidate-comment">{{ candidate.comment }}</span>
        </button>
      </div>

      <!-- Keyboard rows (mode switch is in the bottom row from the model) -->
      <div class="vk-keyboard">
        <div v-for="(row, rowIndex) in keyboardRows" :key="rowIndex" class="vk-row">
          <button
            v-for="key in row"
            :key="key.id"
            type="button"
            :class="[
              'vk-key',
              key.variant === 'muted' ? 'is-muted' : '',
              key.variant === 'accent' ? 'is-accent' : '',
              key.width === 'wide' ? 'is-wide' : '',
              key.width === 'grow' ? 'is-grow' : '',
            ]"
            @click="handleKeyClick(key)"
          >{{ key.label }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useVirtualKeyboard, candidateLabel } from './composables/useVirtualKeyboard'
import type { VirtualKeyboardOptions } from '../types'

const ROOT_ID = '__kiosk_virtual_keyboard_root'
const STYLE_ID = '__kiosk_virtual_keyboard_style'
const DEFAULT_Z_INDEX = 2147483646

const props = defineProps<{ options: VirtualKeyboardOptions }>()

const rootEl = ref<HTMLElement | null>(null)

const {
  isVisible,
  compositionText,
  candidates,
  statusText,
  keyboardRows,
  show,
  hide,
  handleKeyClick,
  handleCandidateClick,
  onKeyboardPointerDown,
} = useVirtualKeyboard(rootEl, props.options)

function buildCSS(zIndex: number): string {
  return `
#${ROOT_ID} {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: ${zIndex};
  transform: translateY(100%);
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
  -webkit-user-select: none;
  user-select: none;
}
#${ROOT_ID}.is-visible {
  transform: translateY(0);
}
.vk-shell {
  background: #CDD0D5;
  padding: 6px 3px 10px;
  box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.18);
}
.vk-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  min-height: 30px;
}
.vk-composition {
  flex: 1;
  font-size: 15px;
  color: #1C1C1E;
  line-height: 1.4;
}
.vk-composition.is-idle {
  color: #8E8E93;
  font-size: 13px;
}
.vk-status {
  font-size: 11px;
  color: #6D6D72;
  margin-left: 10px;
  white-space: nowrap;
}
.vk-candidates {
  display: flex;
  gap: 5px;
  padding: 4px 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.vk-candidates::-webkit-scrollbar {
  display: none;
}
.vk-candidate {
  display: flex;
  align-items: baseline;
  gap: 3px;
  background: #FFFFFF;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 16px;
  color: #1C1C1E;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.28);
  flex-shrink: 0;
}
.vk-candidate.is-active {
  background: #007AFF;
  color: #FFFFFF;
}
.vk-candidate-index {
  font-size: 10px;
  opacity: 0.5;
}
.vk-candidate-comment {
  font-size: 10px;
  opacity: 0.5;
}
.vk-keyboard {
  padding: 0 3px;
}
.vk-row {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-bottom: 8px;
}
.vk-row:last-child {
  margin-bottom: 0;
}
.vk-key {
  flex: 1;
  min-width: 0;
  height: 44px;
  background: #FFFFFF;
  border: none;
  border-radius: 5px;
  font-size: 17px;
  color: #1C1C1E;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.38);
  padding: 0;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
}
.vk-key:active {
  background: #E5E5EA;
  box-shadow: none;
}
.vk-key.is-muted {
  background: #ACB3BB;
  color: #1C1C1E;
  font-size: 12px;
  flex: 1.3;
}
.vk-key.is-muted:active {
  background: #9BA3AC;
  box-shadow: none;
}
.vk-key.is-muted.is-wide {
  font-size: 18px;
}
.vk-key.is-accent {
  background: #007AFF;
  color: #FFFFFF;
  font-size: 14px;
}
.vk-key.is-accent:active {
  background: #0062CC;
  box-shadow: none;
}
.vk-key.is-wide {
  flex: 1.7;
}
.vk-key.is-grow {
  flex: 3;
}
`.trim()
}

onMounted(() => {
  const zIndex = props.options.zIndex ?? DEFAULT_Z_INDEX
  let el = document.getElementById(STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  el.textContent = buildCSS(zIndex)
})

onUnmounted(() => {
  document.getElementById(STYLE_ID)?.remove()
})

defineExpose({ show, hide })
</script>
