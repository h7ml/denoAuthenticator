/**
 * 应用初始化模块
 */

import { initDatabase } from "./db.ts";

/**
 * 初始化应用
 */
export function initApp() {
  // 初始化数据库
  initDatabase();

  console.log("✅ 应用初始化完成");
  console.log("📁 数据库: JSON 文件存储");
}
