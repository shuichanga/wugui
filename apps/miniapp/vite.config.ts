import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// 版本号统一来源：apps/miniapp/package.json 的 version
// 发布正式版时只改这一处（微信后台提审版本号保持一致），页面显示自动跟随
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version: string;
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
