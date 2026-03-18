import { createApp } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import VirtualKeyboardApp from './vue/VirtualKeyboardApp.vue'
import type { VirtualKeyboardOptions, VirtualKeyboardHandle } from './types'

type AppExpose = {
  show: () => void
  hide: (force?: boolean) => void
}

export function installVirtualKeyboardPlugin(options: VirtualKeyboardOptions): VirtualKeyboardHandle {
  const container = document.createElement('div')
  let app = createApp(VirtualKeyboardApp, { options })
  let instance: (ComponentPublicInstance & AppExpose) | null = null

  const mount = (): void => {
    document.body.appendChild(container)
    instance = app.mount(container) as ComponentPublicInstance & AppExpose
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true })
  } else {
    mount()
  }

  return {
    show: () => instance?.show(),
    hide: (force?: boolean) => instance?.hide(force),
    destroy: () => {
      app.unmount()
      container.remove()
    },
  }
}

export type { VirtualKeyboardOptions, VirtualKeyboardHandle } from './types'
