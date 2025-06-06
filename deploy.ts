#!/usr/bin/env -S deno run -A

/**
 * 部署脚本
 * 用于检查项目是否准备好部署到 Deno Deploy
 */

async function checkDeploymentReadiness() {
  console.log("🔍 检查部署准备情况...\n");

  const checks = [
    {
      name: "检查 main.ts 文件",
      check: async () => {
        try {
          const stat = await Deno.stat("main.ts");
          return stat.isFile;
        } catch {
          return false;
        }
      }
    },
    {
      name: "检查 deno.json 配置",
      check: async () => {
        try {
          const content = await Deno.readTextFile("deno.json");
          const config = JSON.parse(content);
          return config.imports && config.imports["$fresh/"];
        } catch {
          return false;
        }
      }
    },
    {
      name: "检查静态文件目录",
      check: async () => {
        try {
          const stat = await Deno.stat("static");
          return stat.isDirectory;
        } catch {
          return false;
        }
      }
    },
    {
      name: "检查路由文件",
      check: async () => {
        try {
          const stat = await Deno.stat("routes");
          return stat.isDirectory;
        } catch {
          return false;
        }
      }
    },
    {
      name: "检查核心库文件",
      check: async () => {
        try {
          const files = ["lib/db.ts", "lib/auth.ts", "lib/totp.ts"];
          for (const file of files) {
            const stat = await Deno.stat(file);
            if (!stat.isFile) return false;
          }
          return true;
        } catch {
          return false;
        }
      }
    }
  ];

  let allPassed = true;

  for (const check of checks) {
    const result = await check.check();
    const status = result ? "✅" : "❌";
    console.log(`${status} ${check.name}`);
    if (!result) allPassed = false;
  }

  console.log("\n" + "=".repeat(50));

  if (allPassed) {
    console.log("🎉 项目已准备好部署到 Deno Deploy!");
    console.log("\n📋 部署步骤:");
    console.log("1. 将代码推送到 GitHub");
    console.log("2. 在 dash.deno.com 创建新项目");
    console.log("3. 连接 GitHub 仓库");
    console.log("4. 设置入口文件为 main.ts");
    console.log("5. 点击部署");
    console.log("\n📖 详细说明请查看 DEPLOY.md 文件");
  } else {
    console.log("⚠️  项目还未准备好部署，请修复上述问题");
  }
}

if (import.meta.main) {
  await checkDeploymentReadiness();
}
