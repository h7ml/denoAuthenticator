#!/usr/bin/env -S deno run -A --unstable-kv --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";
import { initApp } from "./lib/init.ts";

import { load } from "$std/dotenv/mod.ts";

// 加载环境变量，允许空值
await load({ allowEmptyValues: true });

// 初始化应用（包括数据库）
await initApp();

await dev(import.meta.url, "./main.ts", config);
