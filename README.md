# Microsoft Authenticator

基于 Deno + Fresh 框架构建的 Microsoft Authenticator 工具，支持 TOTP 验证码生成和管理。

## 🚀 功能特性

- ✅ **TOTP 验证码生成**: 支持标准 TOTP 算法 (RFC 6238)
- ✅ **用户管理**: 安全的注册和登录系统
- ✅ **认证器管理**: 添加、删除、编辑认证器
- ✅ **实时显示**: 验证码实时生成和倒计时
- ✅ **响应式设计**: 支持桌面和移动设备
- ✅ **安全存储**: 使用 Deno KV 和 bcrypt 加密

## 🛠️ 技术栈

- **运行时**: Deno
- **框架**: Fresh 1.7.3
- **数据库**: Deno KV
- **加密**: bcrypt + Web Crypto API
- **UI**: 自定义 CSS (Tailwind-like)

## 📦 快速开始

### 本地开发

1. **安装 Deno**: https://deno.land/manual/getting_started/installation

2. **启动开发服务器**
   ```bash
   deno task start
   ```

3. **访问应用**
   打开浏览器访问 `http://localhost:8000`

### 部署到 Deno Deploy

1. **检查部署准备**
   ```bash
   deno run -A deploy.ts
   ```

2. **部署到 Deno Deploy**
   - 查看 [DEPLOY.md](./DEPLOY.md) 获取详细部署指南

## 📱 使用说明

### 注册和登录
1. 访问首页，点击"注册账户"
2. 输入用户名和密码（至少6位）
3. 注册成功后使用账户登录

### 添加认证器
1. 登录后进入仪表板
2. 点击"添加认证器"
3. 选择添加方式：
   - **URL 方式**: 粘贴 `otpauth://` 格式的 URL
   - **手动方式**: 输入名称、密钥等信息

### 查看验证码
1. 在仪表板中查看所有认证器
2. 验证码每30秒自动刷新
3. 点击"复制"按钮复制验证码
4. 查看倒计时进度条

## 🔐 安全特性

- **密码加密**: 使用 bcrypt 进行密码哈希
- **会话管理**: 安全的会话超时机制
- **数据加密**: 敏感数据安全存储
- **输入验证**: 防止恶意输入
- **HTTPS**: 生产环境强制 HTTPS

## 🌐 兼容性

- **Microsoft Authenticator**: 完全兼容
- **Google Authenticator**: 支持标准 TOTP
- **其他 TOTP 应用**: 支持 RFC 6238 标准

## 🔗 相关链接

- [Deno](https://deno.land/)
- [Fresh Framework](https://fresh.deno.dev/)
- [Deno Deploy](https://deno.com/deploy)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
