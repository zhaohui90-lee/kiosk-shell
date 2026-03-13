/**
 * WindowStrategy tests
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

import { KioskStrategy, DevStrategy } from '../window/strategy/window-strategy'

describe('KioskStrategy', () => {
  const strategy = new KioskStrategy()

  it('should return production base config', () => {
    const config = strategy.getBaseConfig()

    expect(config.fullscreen).toBe(true)
    expect(config.kiosk).toBe(true)
    expect(config.frame).toBe(false)
    expect(config.resizable).toBe(false)
    expect(config.skipTaskbar).toBe(true)
    expect(config.alwaysOnTop).toBe(true)
    expect(config.devTools).toBe(false)
    expect(config.sandbox).toBe(true)
    expect(config.backgroundColor).toBe('#FFFFFF')
  })

  it('should focus on ready', () => {
    expect(strategy.shouldFocusOnReady()).toBe(true)
  })

  it('should NOT open DevTools on ready', () => {
    expect(strategy.shouldOpenDevToolsOnReady()).toBe(false)
  })

  it('should NOT allow DevTools', () => {
    expect(strategy.isDevToolsAllowed()).toBe(false)
  })

  it('should block new windows', () => {
    expect(strategy.shouldBlockNewWindows()).toBe(true)
  })
})

describe('DevStrategy', () => {
  const strategy = new DevStrategy()

  it('should return development base config', () => {
    const config = strategy.getBaseConfig()

    expect(config.fullscreen).toBe(false)
    expect(config.kiosk).toBe(false)
    expect(config.frame).toBe(true)
    expect(config.resizable).toBe(true)
    expect(config.skipTaskbar).toBe(false)
    expect(config.alwaysOnTop).toBe(false)
    expect(config.devTools).toBe(true)
    expect(config.sandbox).toBe(false)
  })

  it('should focus on ready', () => {
    expect(strategy.shouldFocusOnReady()).toBe(true)
  })

  it('should open DevTools on ready', () => {
    expect(strategy.shouldOpenDevToolsOnReady()).toBe(true)
  })

  it('should allow DevTools', () => {
    expect(strategy.isDevToolsAllowed()).toBe(true)
  })

  it('should NOT block new windows', () => {
    expect(strategy.shouldBlockNewWindows()).toBe(false)
  })
})

describe('createStrategy', () => {
  it('should return DevStrategy when app is not packaged', async () => {
    const { app } = await import('electron')
    Object.defineProperty(app, 'isPackaged', { value: false, configurable: true })

    const { createStrategy } = await import('../window/strategy/window-strategy')
    const strategy = createStrategy()
    expect(strategy).toBeInstanceOf(DevStrategy)
  })

  it('should return KioskStrategy when app is packaged', async () => {
    const { app } = await import('electron')
    Object.defineProperty(app, 'isPackaged', { value: true, configurable: true })

    // Re-import to pick up the change
    const mod = await import('../window/strategy/window-strategy')
    const strategy = mod.createStrategy()
    expect(strategy).toBeInstanceOf(KioskStrategy)

    // Reset
    Object.defineProperty(app, 'isPackaged', { value: false, configurable: true })
  })
})
