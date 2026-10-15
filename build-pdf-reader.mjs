import { mkdir, copyFile, cp, rm } from "node:fs/promises";

// PDF.js公式配布の解析エンジン・Worker・日本語文字マップを公開用フォルダへ配置します。
await mkdir(new URL("./vendor/", import.meta.url), { recursive: true });
const base = new URL("./node_modules/pdfjs-dist/", import.meta.url);
await copyFile(new URL("legacy/build/pdf.mjs", base), new URL("./vendor/pdf-reader.js", import.meta.url));
await copyFile(new URL("legacy/build/pdf.worker.mjs", base), new URL("./vendor/pdf-worker.js", import.meta.url));
await cp(new URL("cmaps/", base), new URL("./vendor/cmaps/", import.meta.url), { recursive: true });
await cp(new URL("standard_fonts/", base), new URL("./vendor/standard_fonts/", import.meta.url), { recursive: true });
await copyFile(new URL("LICENSE", base), new URL("./vendor/pdfjs-LICENSE.txt", import.meta.url));
await rm(new URL("./vendor/unpdf-LICENSE.txt", import.meta.url), { force: true });
console.log("ブラウザ用PDF解析ライブラリを準備しました。");
