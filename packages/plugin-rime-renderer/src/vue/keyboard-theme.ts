export function buildKeyboardCss(rootId: string, zIndex: number): string {
  return `
#${rootId} {
  --vk-bg: #cfd4dc;
  --vk-bg-top: rgba(248, 249, 252, 0.98);
  --vk-surface: rgba(255, 255, 255, 0.72);
  --vk-border: rgba(17, 24, 39, 0.1);
  --vk-key-bg: #ffffff;
  --vk-key-text: #111827;
  --vk-key-muted: #a8b0bb;
  --vk-key-muted-active: #949eaa;
  --vk-key-accent: #2b7cff;
  --vk-key-accent-active: #1f67d9;
  --vk-candidate-active: rgba(43, 124, 255, 0.12);
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${zIndex};
  transform: translateY(100%);
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
  -webkit-user-select: none;
  user-select: none;
  background:
    linear-gradient(180deg, var(--vk-bg-top) 0%, rgba(229, 233, 239, 0.98) 12%, var(--vk-bg) 100%);
  box-shadow: 0 -1px 0 rgba(15, 23, 42, 0.14), 0 -14px 34px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(18px);
}
#${rootId}::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: rgba(255, 255, 255, 0.7);
  pointer-events: none;
}
#${rootId}.is-visible {
  transform: translateY(0);
}
.vk-shell {
  max-width: 820px;
  margin: 0 auto;
  padding: 8px 8px calc(12px + env(safe-area-inset-bottom, 0px));
}
.vk-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 8px 8px;
}
.vk-composition {
  flex: 1;
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  background: var(--vk-surface);
  border: 1px solid var(--vk-border);
  border-radius: 15px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.68);
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  line-height: 1.35;
}
.vk-composition.is-idle {
  color: #6b7280;
  font-size: 14px;
  font-weight: 400;
}
.vk-status {
  flex-shrink: 0;
  font-size: 11px;
  color: #4b5563;
  padding: 0 4px;
  white-space: nowrap;
}
.vk-candidates {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 6px;
  padding: 0 8px 8px;
}
.vk-candidate {
  flex: 1;
  min-width: 0;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0 8px;
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  cursor: pointer;
  overflow: hidden;
}
.vk-candidate:active {
  transform: translateY(1px);
  background: #e2e6eb;
}
.vk-candidate.is-active {
  background: var(--vk-key-accent);
  color: #ffffff;
}
.vk-candidate-index,
.vk-candidate-comment {
  font-size: 10px;
  opacity: 0.5;
  flex-shrink: 0;
}
.vk-candidate-comment {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vk-page-btn {
  flex-shrink: 0;
  width: 40px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vk-key-muted);
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  cursor: pointer;
}
.vk-page-btn:active {
  background: var(--vk-key-muted-active);
  transform: translateY(1px);
}
.vk-keyboard {
  padding: 0 2px;
}
.vk-row {
  display: flex;
  align-items: stretch;
  gap: 6px;
  margin-bottom: 8px;
}
.vk-row:last-child {
  margin-bottom: 0;
}
.vk-row.is-alpha-row-1 {
  padding: 0;
}
.vk-row.is-alpha-row-2 {
  padding: 0;
}
.vk-row.is-alpha-row-3 {
  padding: 0 2px;
}
.vk-key {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border: none;
  border-radius: 10px;
  background: #ffffff;
  color: var(--vk-key-text);
  font-size: 20px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
}
.vk-key:active {
  transform: translateY(1px);
  background: #e2e6eb;
}
.vk-key.is-muted {
  background: var(--vk-key-muted);
  color: #111827;
  font-size: 13px;
  font-weight: 600;
}
.vk-key.is-muted:active {
  background: var(--vk-key-muted-active);
}
.vk-key.is-accent {
  background: var(--vk-key-accent);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}
.vk-key.is-accent:active {
  background: var(--vk-key-accent-active);
}
.vk-key.is-wide {
  flex: 1.55;
}
.vk-key.is-grow {
  flex: 3.2;
}
.vk-key.is-mode-switch {
  flex: 1.25;
}
.vk-key.is-space {
  font-size: 16px;
  letter-spacing: 0.08em;
}
.vk-key.is-enter {
  flex: 1.5;
}
.vk-key.is-shift,
.vk-key.is-backspace {
  font-size: 18px;
}
.vk-row.is-num-row-1 .vk-key,
.vk-row.is-num-row-2 .vk-key,
.vk-row.is-num-row-3 .vk-key,
.vk-row.is-num-row-4 .vk-key {
  height: 52px;
}
.vk-row.is-num-row-1,
.vk-row.is-num-row-2,
.vk-row.is-num-row-3,
.vk-row.is-num-row-4 {
  padding: 0 54px;
}
@media (max-width: 720px) {
  .vk-shell {
    padding-left: 4px;
    padding-right: 4px;
  }
  .vk-row.is-num-row-1,
  .vk-row.is-num-row-2,
  .vk-row.is-num-row-3,
  .vk-row.is-num-row-4 {
    padding: 0 20px;
  }
}
@media (max-width: 520px) {
  .vk-shell {
    padding-top: 6px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  }
  .vk-topbar {
    padding-left: 4px;
    padding-right: 4px;
  }
  .vk-composition {
    min-height: 38px;
    font-size: 15px;
    border-radius: 13px;
  }
  .vk-status {
    font-size: 10px;
  }
  .vk-candidates {
    padding-left: 4px;
    padding-right: 4px;
    gap: 4px;
  }
  .vk-page-btn {
    width: 34px;
    font-size: 15px;
  }
  .vk-row {
    gap: 5px;
    margin-bottom: 6px;
  }
  .vk-row.is-num-row-1,
  .vk-row.is-num-row-2,
  .vk-row.is-num-row-3,
  .vk-row.is-num-row-4 {
    padding: 0;
  }
  .vk-key {
    height: 44px;
    border-radius: 8px;
    font-size: 18px;
  }
  .vk-key.is-muted,
  .vk-key.is-accent {
    font-size: 12px;
  }
  .vk-key.is-shift,
  .vk-key.is-backspace {
    font-size: 16px;
  }
}
`.trim()
}
