export const ROOT_ID = '__kiosk_virtual_keyboard_root'
export const STYLE_ID = '__kiosk_virtual_keyboard_style'

export function buildKeyboardCSS(zIndex: number): string {
  return `
    #${ROOT_ID} {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: ${zIndex};
      padding: 12px 14px calc(env(safe-area-inset-bottom, 0px) + 12px);
      background: linear-gradient(180deg, rgba(7, 15, 33, 0.96), rgba(8, 12, 22, 0.99));
      border-top: 1px solid rgba(123, 156, 255, 0.18);
      box-shadow: 0 -18px 44px rgba(0, 0, 0, 0.34);
      transform: translateY(calc(100% + 20px));
      transition: transform 0.24s ease, opacity 0.24s ease;
      opacity: 0;
      pointer-events: none;
      user-select: none;
      font-family: "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    #${ROOT_ID}.is-visible {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
    #${ROOT_ID} .vk-shell {
      width: min(100%, 920px);
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    #${ROOT_ID} .vk-topbar,
    #${ROOT_ID} .vk-candidates,
    #${ROOT_ID} .vk-row {
      display: flex;
      gap: 8px;
    }
    #${ROOT_ID} .vk-topbar {
      align-items: center;
      justify-content: space-between;
    }
    #${ROOT_ID} .vk-mode-group {
      display: flex;
      gap: 8px;
    }
    #${ROOT_ID} .vk-status {
      color: rgba(210, 222, 255, 0.72);
      font-size: 12px;
      letter-spacing: 0.08em;
    }
    #${ROOT_ID} .vk-composition {
      min-height: 44px;
      display: flex;
      align-items: center;
      padding: 0 14px;
      border-radius: 14px;
      background: rgba(18, 29, 55, 0.84);
      color: #f7fbff;
      font-size: 17px;
      border: 1px solid rgba(123, 156, 255, 0.14);
    }
    #${ROOT_ID} .vk-composition.is-idle {
      color: rgba(176, 192, 224, 0.48);
    }
    #${ROOT_ID} .vk-candidates {
      min-height: 44px;
      flex-wrap: wrap;
    }
    #${ROOT_ID} .vk-candidate,
    #${ROOT_ID} .vk-key {
      appearance: none;
      border: 0;
      cursor: pointer;
    }
    #${ROOT_ID} .vk-candidate {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(20, 32, 60, 0.84);
      color: #f6fbff;
      border: 1px solid rgba(123, 156, 255, 0.1);
    }
    #${ROOT_ID} .vk-candidate.is-active {
      background: rgba(72, 112, 236, 0.24);
      border-color: rgba(118, 156, 255, 0.38);
    }
    #${ROOT_ID} .vk-candidate-index {
      color: #8cb2ff;
      font-size: 12px;
      font-weight: 700;
    }
    #${ROOT_ID} .vk-candidate-comment {
      color: rgba(185, 200, 228, 0.7);
      font-size: 12px;
    }
    #${ROOT_ID} .vk-keyboard {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    #${ROOT_ID} .vk-row {
      justify-content: center;
    }
    #${ROOT_ID} .vk-key {
      min-width: 52px;
      min-height: 56px;
      padding: 0 10px;
      border-radius: 12px;
      background: rgba(243, 247, 255, 0.98);
      color: #12213e;
      font-size: 18px;
      font-weight: 600;
      box-shadow: 0 4px 8px rgba(5, 10, 20, 0.18), 0 1px 0 rgba(0,0,0,0.3);
    }
    #${ROOT_ID} .vk-key.is-muted {
      background: rgba(172, 190, 224, 0.72);
      color: #203459;
      font-size: 15px;
      box-shadow: 0 4px 8px rgba(5, 10, 20, 0.14), 0 1px 0 rgba(0,0,0,0.25);
    }
    #${ROOT_ID} .vk-key.is-accent {
      background: rgba(78, 128, 255, 0.96);
      color: #ffffff;
      box-shadow: 0 4px 8px rgba(40, 80, 200, 0.3), 0 1px 0 rgba(0,0,0,0.25);
    }
    #${ROOT_ID} .vk-key.is-wide {
      min-width: 80px;
    }
    #${ROOT_ID} .vk-key.is-grow {
      flex: 1;
    }
    @media (max-width: 640px) {
      #${ROOT_ID} {
        padding-left: 6px;
        padding-right: 6px;
      }
      #${ROOT_ID} .vk-key {
        min-width: 0;
        flex: 1;
        font-size: 16px;
        padding: 0 4px;
        min-height: 52px;
      }
      #${ROOT_ID} .vk-row {
        gap: 5px;
      }
    }
  `
}

export function injectKeyboardStyle(zIndex: number): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = buildKeyboardCSS(zIndex)
  document.head.appendChild(style)
}
