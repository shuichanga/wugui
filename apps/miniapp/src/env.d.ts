/// <reference types="vite/client" />

/** 构建时注入（vite.config define）：apps/miniapp/package.json 的 version */
declare const __APP_VERSION__: string

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}
