# Microsoft Authenticator - Deno Deploy 部署指南

## 部署到 Deno Deploy

### 方法一：通过 GitHub 自动部署（推荐）

1. **将代码推送到 GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **在 Deno Deploy 创建项目**
   - 访问 [dash.deno.com](https://dash.deno.com)
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repository"
   - 选择您的仓库和分支
   - 设置入口文件为 `main.ts`

3. **配置环境变量（可选）**
   - 在项目设置中添加环境变量
   - 目前项目不需要特殊环境变量

### 方法二：通过 deployctl 命令行部署

1. **安装 deployctl**
   ```bash
   deno install  --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f --global https://deno.land/x/deploy/deployctl.ts
   ```

2. **登录 Deno Deploy**
   ```bash
   deployctl login
   ```

3. **部署项目**
   ```bash
   deployctl deploy --project=your-project-name main.ts
   ```

### 方法三：通过 Web 界面直接部署

1. **访问 Deno Deploy**
   - 前往 [dash.deno.com](https://dash.deno.com)
   - 创建新项目

2. **上传代码**
   - 选择 "Deploy from local files"
   - 上传整个项目文件夹
   - 设置入口文件为 `main.ts`

## 项目特性

### ✅ Deno Deploy 兼容性
- **Deno KV**: 项目使用 Deno KV 作为数据库，完全兼容 Deno Deploy
- **Fresh 框架**: 基于 Fresh 1.7.3，完全支持 SSR
- **静态文件**: 自动处理 CSS、图片等静态资源
- **API 路由**: 支持动态 API 路由

### 🔧 技术栈
- **运行时**: Deno 1.40+
- **框架**: Fresh 1.7.3
- **数据库**: Deno KV (内置)
- **认证**: bcrypt + 会话管理
- **UI**: 自定义 CSS

## 部署后配置

### 域名设置
- Deno Deploy 会自动分配一个 `.deno.dev` 域名
- 可以在项目设置中配置自定义域名

### 数据持久化
- Deno KV 数据会自动持久化
- 无需额外配置数据库

### 性能优化
- Fresh 框架自动进行代码分割
- 静态资源自动缓存
- 边缘计算全球分发

## 环境变量（可选）

目前项目不需要特殊环境变量，但您可以添加：

```bash
# 可选：自定义会话超时时间（毫秒）
SESSION_TIMEOUT=86400000

# 可选：应用名称
APP_NAME="Microsoft Authenticator"
```

## 部署检查清单

- [ ] 代码已推送到 Git 仓库
- [ ] 所有依赖都通过 URL 导入
- [ ] main.ts 文件存在且可执行
- [ ] 静态文件在 static/ 目录下
- [ ] 测试本地运行正常

## 故障排除

### 常见问题

1. **导入错误**
   - 确保所有导入都使用完整的 URL
   - 检查 deno.json 中的 imports 映射

2. **权限错误**
   - Deno Deploy 自动处理权限
   - 无需 `-A` 标志

3. **静态文件不加载**
   - 确保文件在 static/ 目录下
   - 检查文件路径大小写

### 调试方法

1. **查看部署日志**
   - 在 Deno Deploy 控制台查看实时日志
   - 检查启动错误信息

2. **本地测试**
   ```bash
   deno run -A main.ts
   ```

3. **检查依赖**
   ```bash
   deno check main.ts
   ```

## 部署后访问

部署成功后，您可以：

1. **访问应用**: `https://your-project-name.deno.dev`
2. **注册账户**: 创建新的用户账户
3. **添加认证器**: 管理您的 TOTP 认证器
4. **生成验证码**: 查看实时验证码

## 安全注意事项

- 使用 HTTPS（Deno Deploy 自动提供）
- 定期更新依赖版本
- 不要在代码中硬编码敏感信息
- 使用强密码注册账户

## 支持

如果遇到部署问题：
1. 检查 Deno Deploy 文档
2. 查看项目日志
3. 确认代码在本地正常运行
