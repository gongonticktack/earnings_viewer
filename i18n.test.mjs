import assert from "node:assert/strict";
import { test } from "node:test";
import { translateText, readLanguage, saveLanguage } from "./i18n.js";

test("日英の見出し・開始年度・科目を切り替え、原文データを変更しない", () => {
  assert.equal(translateText("Quarterly Performance", "ja"), "四半期業績");
  assert.equal(translateText("四半期業績", "en"), "Quarterly Performance");
  assert.equal(translateText("2026年度（2027年3月期） / 第1四半期", "en"), "FY2026 (year ending Mar 2027) / Q1");
  assert.equal(translateText("商品・製品売上収益", "en"), "Product sales revenue");
  assert.equal(translateText("販売費及び一般管理費", "en"), "Selling, general and administrative expenses");
  assert.equal(translateText("未知の科目", "en"), "未知の科目");
  assert.equal(translateText("2026年度（2027年3月期）", "ja"), "2026年度（2027年3月期）");
});

test("言語設定を保存し、不正値・保存不可でも日本語で起動できる", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.equal(readLanguage(storage), "ja");
  saveLanguage("en", storage);
  assert.equal(readLanguage(storage), "en");
  saveLanguage("ja", storage);
  assert.equal(readLanguage(storage), "ja");
  values.set("earnings-language", "invalid");
  assert.equal(readLanguage(storage), "ja");
  const denied = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert.equal(readLanguage(denied), "ja");
  assert.doesNotThrow(() => saveLanguage("en", denied));
});
