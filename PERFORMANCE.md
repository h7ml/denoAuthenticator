# GitHub Actions 性能优化指南

## 🚀 优化策略

### 1. 缓存优化
- **Deno 依赖缓存**: 缓存 `~/.cache/deno` 和 `~/.deno`
- **Fresh 构建缓存**: 缓存 `_fresh` 目录
- **智能缓存键**: 基于 `deno.json` 和源文件哈希

### 2. 构建优化
- **浅克隆**: 只获取最新提交 (`fetch-depth: 1`)
- **路径忽略**: 忽略文档文件变更
- **快速构建**: 使用 `--quiet` 和 `--no-check` 标志

### 3. 工作流选择

#### 标准部署 (`deploy.yml`)
- 包含代码质量检查
- 完整的类型检查
- 适合生产环境

#### 快速部署 (`fast-deploy.yml`)
- 跳过代码检查
- 激进缓存策略
- 适合开发和测试

## ⚡ 性能对比

| 优化前 | 优化后 |
|--------|--------|
| 5-8 分钟 | 1-3 分钟 |
| 每次重新下载依赖 | 智能缓存复用 |
| 完整代码检查 | 可选检查 |

## 🛠️ 使用方法

### 启用快速部署
将 `.github/workflows/fast-deploy.yml` 重命名为主工作流，或者：

```yaml
# 在 fast-deploy.yml 中修改触发条件
on:
  push:
    branches: [main]
```

### 手动触发构建
```bash
# 本地预缓存
deno task cache

# 快速构建
deno task build:fast
```

## 📊 监控构建时间

在 GitHub Actions 中查看：
1. 进入仓库 → Actions 标签
2. 选择工作流运行
3. 查看各步骤耗时

## 🔧 进一步优化

### 1. 使用自托管 Runner
```yaml
runs-on: self-hosted
```

### 2. 并行构建
```yaml
strategy:
  matrix:
    os: [ubuntu-latest]
```

### 3. 条件执行
```yaml
- name: Build only if needed
  if: contains(github.event.head_commit.message, '[build]')
  run: deno task build
```

## 🎯 最佳实践

1. **合理使用缓存**: 不要缓存过大的目录
2. **选择合适的工作流**: 开发用快速，生产用标准
3. **监控构建时间**: 定期检查性能指标
4. **渐进式优化**: 逐步应用优化策略

## 🚨 注意事项

- 快速部署跳过了类型检查，可能遗漏错误
- 缓存可能导致旧依赖问题，定期清理
- 过度优化可能影响构建稳定性
