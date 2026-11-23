/// <reference types="vite/client" />

export interface FunTimeWidgetOptions {
  width?: number
  height?: number
  opacity?: number
  alwaysOnTop?: boolean
}

export interface FunTimeWidgetResult {
  ok: boolean
  mode: 'utools' | 'unsupported'
}

export interface FunTimeEnterAction {
  code: string
  type: string
  payload: unknown
}

export interface FunTimeBridge {
  openFloatingWidget: (options?: FunTimeWidgetOptions) => FunTimeWidgetResult
  closeFloatingWidget: () => boolean
  setWidgetAlwaysOnTop: (flag: boolean) => boolean
  setWidgetOpacity: (opacity: number) => boolean
  isWidgetOpen: () => boolean
  notify: (title: string, body: string) => boolean
  saveTextFile: (defaultName: string, content: string) => boolean
  onEnter: (callback: (action: FunTimeEnterAction) => void) => () => void
}

declare global {
  interface Window {
    funtime?: FunTimeBridge
    utools?: {
      isDarkColors?: () => boolean
      copyText?: (text: string) => boolean
      showNotification?: (body: string) => void
      dbStorage?: {
        getItem: (key: string) => unknown
        setItem: (key: string, value: unknown) => void
        removeItem: (key: string) => void
      }
      registerTool?: (name: string, handler: (params: unknown) => unknown) => void
    }
  }
}

export {}
