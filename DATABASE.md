# 数据库配置说明

本项目已从 JSON 文件存储迁移到 Deno KV 数据库。

## 🗄️ 数据库类型

### Deno KV
- **高性能**：原生支持，比 JSON 文件更快
- **ACID 事务**：保证数据一致性
- **自动备份**：云端自动备份和恢复
- **并发支持**：多用户同时访问更稳定

## 🔧 配置方式

### 本地开发环境

**选项 1：使用云端 KV（推荐）**
```bash
# 1. 获取访问令牌
# 访问：https://dash.deno.com/account
# 复制 "Access Token"

# 2. 创建 .env 文件
cp .env.example .env

# 3. 编辑 .env 文件，设置访问令牌
DENO_KV_ACCESS_TOKEN=your_access_token_here
```

**选项 2：使用本地 KV**
```bash
# 在 .env 文件中设置
FORCE_LOCAL_KV=true
```

### 生产环境

生产环境自动使用本地 KV，无需额外配置。

## 🚀 启动应用

```bash
# 开发模式
deno task start

# 生产模式
deno task deploy
```

## 📊 数据库状态

启动时会显示数据库连接状态：

```
✅ 本地开发环境连接到云端 Deno KV 数据库成功
✅ 应用初始化完成
📁 数据库: Deno KV
```

## 🔄 数据迁移

从 JSON 文件迁移到 Deno KV 后：
- 旧的 JSON 数据不会自动迁移
- 需要重新注册用户和添加认证器
- 数据存储更安全和高效

## 🛠️ 故障排除

### 云端 KV 连接失败
```
❌ 首选 KV 连接失败，使用备用方案: Error: Missing DENO_KV_ACCESS_TOKEN
```

**解决方案：**
1. 检查 `.env` 文件中的 `DENO_KV_ACCESS_TOKEN`
2. 确认访问令牌有效
3. 或设置 `FORCE_LOCAL_KV=true` 使用本地 KV

### 权限错误
```
❌ 默认本地 KV 连接也失败
```

**解决方案：**
1. 确保运行时使用了 `--unstable-kv` 标志
2. 检查文件系统权限
3. 重新启动应用

## 📝 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DENO_KV_ACCESS_TOKEN` | Deno Deploy 访问令牌 | 无 |
| `FORCE_LOCAL_KV` | 强制使用本地 KV | `false` |
| `DENO_DEPLOYMENT_ID` | 生产环境标识（自动设置） | 无 |

## 🔐 安全说明

- 云端 KV 数据加密存储
- 访问令牌请妥善保管
- 生产环境使用本地 KV 确保数据隔离
