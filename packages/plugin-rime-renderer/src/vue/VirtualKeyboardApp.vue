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
          {{ compositionText || '' }}
        </div>
        <span class="vk-status">{{ statusText }}</span>
      </div>

      <!-- Candidate strip -->
      <div v-if="candidates.length" class="vk-candidates-bar">
        <button
          v-if="currentPage > 0"
          type="button"
          class="vk-page-btn"
          @click="prevPage"
        >‹</button>
        <div class="vk-candidates" :style="candidatesGridStyle">
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
        <button
          v-if="!isLastPage"
          type="button"
          class="vk-page-btn"
          @click="nextPage"
        >›</button>
      </div>

      <!-- Keyboard rows (mode switch is in the bottom row from the model) -->
      <div class="vk-keyboard">
        <div v-for="(row, rowIndex) in keyboardRows" :key="rowIndex" :class="rowClasses(rowIndex)">
          <button
            v-for="key in row"
            :key="key.id"
            type="button"
            :class="keyClasses(key)"
            @click="handleKeyClick(key)"
          >{{ key.label }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useVirtualKeyboard, candidateLabel } from './composables/useVirtualKeyboard'
import { buildKeyboardCss } from './keyboard-theme'
import type { KeyboardKey } from '../core/keyboard-model'
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
  currentPage,
  isLastPage,
  statusText,
  keyboardRows,
  mode,
  show,
  hide,
  handleKeyClick,
  handleCandidateClick,
  nextPage,
  prevPage,
  onKeyboardPointerDown,
} = useVirtualKeyboard(rootEl, props.options)

const candidatesPerRow = computed(() => {
  const total = candidates.value.length
  if (total === 0) return 1
  const maxChars = candidates.value.reduce((max, c) => Math.max(max, c.text.length), 0)
  if (maxChars <= 2) return Math.min(total, 9)
  if (maxChars <= 4) return Math.min(total, 5)
  if (maxChars <= 6) return Math.min(total, 3)
  return Math.min(total, 2)
})

const candidatesGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${candidatesPerRow.value}, 1fr)`,
}))

function rowClasses(rowIndex: number): string[] {
  const rowClass = mode.value === 'num' ? `is-num-row-${rowIndex + 1}` : `is-alpha-row-${rowIndex + 1}`
  return ['vk-row', rowClass]
}

function keyClasses(key: KeyboardKey): string[] {
  return [
    'vk-key',
    key.variant === 'muted' ? 'is-muted' : '',
    key.variant === 'accent' ? 'is-accent' : '',
    key.width === 'wide' ? 'is-wide' : '',
    key.width === 'grow' ? 'is-grow' : '',
    key.action === 'space' ? 'is-space' : '',
    key.action === 'enter' ? 'is-enter' : '',
    key.action === 'shift' ? 'is-shift' : '',
    key.action === 'backspace' ? 'is-backspace' : '',
    key.action?.startsWith('mode-') ? 'is-mode-switch' : '',
  ]
}

onMounted(() => {
  const zIndex = props.options.zIndex ?? DEFAULT_Z_INDEX
  let el = document.getElementById(STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  el.textContent = buildKeyboardCss(ROOT_ID, zIndex)
})

onUnmounted(() => {
  document.getElementById(STYLE_ID)?.remove()
})

defineExpose({ show, hide })
</script>
