<template>
  <div
    :id="ROOT_ID"
    :class="{ 'is-visible': isVisible }"
    ref="rootEl"
    @pointerdown.prevent="onKeyboardPointerDown"
  >
    <div class="vk-shell">
      <!-- Top bar: mode switcher + status -->
      <div class="vk-topbar">
        <div class="vk-mode-group">
          <button
            v-for="m in MODES"
            :key="m.id"
            type="button"
            :class="['vk-key', mode === m.id ? 'is-accent' : 'is-muted']"
            @click="handleKeyClick({ id: `mode-${m.id}`, label: m.label, action: `mode-${m.id}` })"
          >{{ m.label }}</button>
        </div>
        <span class="vk-status">{{ statusText }}</span>
      </div>

      <!-- Composition bar -->
      <div :class="['vk-composition', compositionText ? '' : 'is-idle']">
        {{ compositionText || '点击输入框后开始输入' }}
      </div>

      <!-- Candidate list -->
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

      <!-- Keyboard rows -->
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
import { ref } from 'vue'
import { useVirtualKeyboard, candidateLabel } from './composables/useVirtualKeyboard'
import { ROOT_ID } from './keyboard-styles'
import type { VirtualKeyboardOptions } from '../types'

const props = defineProps<{ options: VirtualKeyboardOptions }>()

const rootEl = ref<HTMLElement | null>(null)

const {
  isVisible,
  mode,
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

const MODES = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: '英文' },
  { id: 'num', label: '数字' },
] as const

defineExpose({ show, hide })
</script>
