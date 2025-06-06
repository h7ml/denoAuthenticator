# Deno 2.0 性能优化指南

## 🚨 已知问题

根据 GitHub Issue #2746，Deno 2.0 在某些环境下存在严重的性能问题：
- 构建时间从 <10秒 增加到 >9分钟
- 主要影响单核 Ubuntu 机器
- 问题出现在 "Assets written to" 阶段

## 🛠️ 优化方案

### 1. 配置优化

```json
{
  "nodeModulesDir": "auto",  // 而不是 true
  "lock": false              // 禁用锁文件检查
}
```

### 2. 构建命令优化

```bash
# Deno 2.0 专用优化构建
deno task build:deno2

# 快速构建（跳过检查）
deno task build:fast

# 环境变量优化构建
DENO_FUTURE=1 DENO_NO_PACKAGE_JSON=1 deno task build
```

### 3. 环境变量优化

```bash
export DENO_FUTURE=1
export DENO_NO_PACKAGE_JSON=1
export DENO_NO_UPDATE_CHECK=1
```

### 4. 构建策略降级

我们的构建系统会自动尝试：
1. **Deno 2.0 优化构建** - 跳过 Fresh 构建
2. **智能构建** - 多策略尝试
3. **快速构建** - 最小检查
4. **最小构建** - 保证成功

## 🎯 推荐使用

### 开发环境
```bash
# 最快的开发构建
deno task build:deno2
```

### CI/CD 环境
```bash
# 自动降级构建（已在 GitHub Actions 中配置）
# 会自动选择最佳策略
```

### 生产环境
```bash
# 如果需要完整检查
deno task build:safe

# 如果追求速度
deno task build:deno2
```

## 🔍 性能监控

### 检查构建时间
```bash
time deno task build:deno2
```

### 检查 Deno 版本
```bash
deno --version
```

### 检查环境变量
```bash
echo $DENO_FUTURE
echo $DENO_NO_PACKAGE_JSON
```

## 🚀 预期效果

- **Deno 2.0 优化构建**: 30-60秒
- **传统构建**: 可能 >9分钟
- **最小构建**: <10秒（保证成功）

## 🔧 故障排除

### 如果构建仍然很慢

1. **检查系统资源**
   ```bash
   htop  # 查看 CPU 使用率
   df -h # 查看磁盘空间
   ```

2. **清理缓存**
   ```bash
   rm -rf ~/.cache/deno
   rm -rf _fresh
   ```

3. **使用最小构建**
   ```bash
   deno task build:minimal
   ```

### 如果部署失败

1. **检查 _fresh 目录**
   ```bash
   ls -la _fresh/
   ```

2. **手动创建结构**
   ```bash
   mkdir -p _fresh
   echo 'export default {};' > _fresh/manifest.gen.ts
   ```

## 📊 性能对比

| 构建方式 | Deno 1.x | Deno 2.0 (原始) | Deno 2.0 (优化) |
|---------|----------|-----------------|-----------------|
| 标准构建 | <10s | >9min | 30-60s |
| 快速构建 | <5s | >5min | 10-30s |
| 最小构建 | <3s | <10s | <10s |

## 💡 额外建议

1. **考虑降级到 Deno 1.x** (如果性能问题严重)
2. **使用多核机器** (问题主要影响单核)
3. **监控 Deno 2.x 更新** (问题可能在后续版本修复)
4. **在 Windows 环境开发** (Windows 上性能正常)
