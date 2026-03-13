/**
 * WindowOptionsBuilder tests
 */

import { describe, it, expect } from 'vitest'
import { WindowOptionsBuilder } from '../window/builder/window-options-builder'

describe('WindowOptionsBuilder', () => {
  describe('defaults', () => {
    it('should have safe defaults', () => {
      const options = new WindowOptionsBuilder().build()

      expect(options.show).toBe(false)
      expect(options.webPreferences?.nodeIntegration).toBe(false)
      expect(options.webPreferences?.contextIsolation).toBe(true)
    })
  })

  describe('withSize', () => {
    it('should set width and height', () => {
      const options = new WindowOptionsBuilder()
        .withSize(1024, 768)
        .build()

      expect(options.width).toBe(1024)
      expect(options.height).toBe(768)
    })
  })

  describe('withKiosk', () => {
    it('should enable kiosk with alwaysOnTop and skipTaskbar', () => {
      const options = new WindowOptionsBuilder()
        .withKiosk(true)
        .build()

      expect(options.kiosk).toBe(true)
      expect(options.alwaysOnTop).toBe(true)
      expect(options.skipTaskbar).toBe(true)
    })

    it('should disable all three when kiosk is false', () => {
      const options = new WindowOptionsBuilder()
        .withKiosk(false)
        .build()

      expect(options.kiosk).toBe(false)
      expect(options.alwaysOnTop).toBe(false)
      expect(options.skipTaskbar).toBe(false)
    })
  })

  describe('withFullscreen', () => {
    it('should set fullscreen', () => {
      const options = new WindowOptionsBuilder()
        .withFullscreen(true)
        .build()

      expect(options.fullscreen).toBe(true)
    })
  })

  describe('withFrame', () => {
    it('should set frame and resizable together', () => {
      const options = new WindowOptionsBuilder()
        .withFrame(false)
        .build()

      expect(options.frame).toBe(false)
      expect(options.resizable).toBe(false)
    })

    it('should enable both when frame is true', () => {
      const options = new WindowOptionsBuilder()
        .withFrame(true)
        .build()

      expect(options.frame).toBe(true)
      expect(options.resizable).toBe(true)
    })
  })

  describe('withResizable (override)', () => {
    it('should override resizable set by withFrame', () => {
      const options = new WindowOptionsBuilder()
        .withFrame(false)
        .withResizable(true)
        .build()

      expect(options.frame).toBe(false)
      expect(options.resizable).toBe(true)
    })
  })

  describe('withBackgroundColor', () => {
    it('should set backgroundColor', () => {
      const options = new WindowOptionsBuilder()
        .withBackgroundColor('#1a1a2e')
        .build()

      expect(options.backgroundColor).toBe('#1a1a2e')
    })
  })

  describe('withCenter', () => {
    it('should set center', () => {
      const options = new WindowOptionsBuilder()
        .withCenter(true)
        .build()

      expect(options.center).toBe(true)
    })
  })

  describe('webPreferences', () => {
    it('withSandbox should set sandbox', () => {
      const options = new WindowOptionsBuilder()
        .withSandbox(true)
        .build()

      expect(options.webPreferences?.sandbox).toBe(true)
    })

    it('withDevTools should set devTools', () => {
      const options = new WindowOptionsBuilder()
        .withDevTools(true)
        .build()

      expect(options.webPreferences?.devTools).toBe(true)
    })

    it('withPreload should set preload path', () => {
      const options = new WindowOptionsBuilder()
        .withPreload('/path/to/preload.js')
        .build()

      expect(options.webPreferences?.preload).toBe('/path/to/preload.js')
    })

    it('should preserve existing webPreferences when adding new ones', () => {
      const options = new WindowOptionsBuilder()
        .withSandbox(true)
        .withDevTools(true)
        .withPreload('/path/to/preload.js')
        .build()

      expect(options.webPreferences?.sandbox).toBe(true)
      expect(options.webPreferences?.devTools).toBe(true)
      expect(options.webPreferences?.preload).toBe('/path/to/preload.js')
      expect(options.webPreferences?.nodeIntegration).toBe(false)
      expect(options.webPreferences?.contextIsolation).toBe(true)
    })
  })

  describe('withExtraOptions', () => {
    it('should merge extra options', () => {
      const options = new WindowOptionsBuilder()
        .withSize(800, 600)
        .withExtraOptions({ skipTaskbar: true, title: 'Test' })
        .build()

      expect(options.width).toBe(800)
      expect(options.skipTaskbar).toBe(true)
      expect(options.title).toBe('Test')
    })

    it('should merge extra webPreferences', () => {
      const options = new WindowOptionsBuilder()
        .withSandbox(true)
        .withExtraOptions({
          webPreferences: { allowRunningInsecureContent: false },
        })
        .build()

      expect(options.webPreferences?.sandbox).toBe(true)
      expect(options.webPreferences?.allowRunningInsecureContent).toBe(false)
    })
  })

  describe('build immutability', () => {
    it('should return a new object on each build', () => {
      const builder = new WindowOptionsBuilder().withSize(800, 600)
      const options1 = builder.build()
      const options2 = builder.build()

      expect(options1).not.toBe(options2)
      expect(options1.webPreferences).not.toBe(options2.webPreferences)
    })
  })

  describe('fluent chaining', () => {
    it('should support full chain', () => {
      const options = new WindowOptionsBuilder()
        .withSize(1920, 1080)
        .withFullscreen(true)
        .withKiosk(true)
        .withFrame(false)
        .withBackgroundColor('#FFFFFF')
        .withSandbox(true)
        .withDevTools(false)
        .build()

      expect(options.width).toBe(1920)
      expect(options.height).toBe(1080)
      expect(options.fullscreen).toBe(true)
      expect(options.kiosk).toBe(true)
      expect(options.frame).toBe(false)
      expect(options.backgroundColor).toBe('#FFFFFF')
      expect(options.webPreferences?.sandbox).toBe(true)
      expect(options.webPreferences?.devTools).toBe(false)
    })
  })
})
