#!/usr/bin/env -S deno run -A --unstable-kv --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";
import { initApp } from "./lib/init.ts";

import "$std/dotenv/load.ts";

// 初始化应用
await initApp();

await dev(import.meta.url, "./main.ts", config);
