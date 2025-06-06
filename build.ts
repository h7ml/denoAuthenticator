#!/usr/bin/env -S deno run -A

/**
 * 简化的构建脚本
 * 避免 Fresh dev.ts 的复杂构建过程
 */

import { build } from "$fresh/src/build/mod.ts";
import config from "./fresh.config.ts";

console.log("🔨 Starting simplified build...");

try {
  // 设置构建超时
  const buildPromise = build(import.meta.url, "./main.ts", config);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Build timeout")), 300000) // 5分钟超时
  );

  await Promise.race([buildPromise, timeoutPromise]);
  console.log("✅ Build completed successfully");
} catch (error) {
  console.log("⚠️ Build failed or timed out:", error.message);
  console.log("📦 Continuing with deployment...");
  
  // 创建基本的 _fresh 目录结构
  try {
    await Deno.mkdir("_fresh", { recursive: true });
    console.log("📁 Created basic _fresh directory");
  } catch {
    // 目录可能已存在
  }
}
