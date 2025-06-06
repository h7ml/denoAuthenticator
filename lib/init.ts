/**
 * 应用初始化模块
 */

import { initDatabase } from "./db.ts";

/**
 * 初始化应用
 */
export async function initApp() {
  // 初始化数据库
  await initDatabase();

  console.log("✅ 应用初始化完成");
  console.log("📁 数据库: Deno KV");
}
