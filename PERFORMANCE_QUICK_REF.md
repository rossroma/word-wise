# 性能监控快速参考

## 🚀 快速上手（30秒）

```javascript
// 在浏览器控制台中执行

// 查看完整性能报告
window.zhiyiPerf.report();

// 获取统计数据
window.zhiyiPerf.stats();

// 清除日志
window.zhiyiPerf.clear();
```

## 📊 监控分类

| 分类 | 说明 | 关注指标 |
|------|------|---------|
| 系统启动 | 插件初始化 | < 100ms |
| 内容扫描 | 查找可见段落 | < 80ms |
| 批次处理 | 翻译处理流程 | < 500ms |
| DOM操作 | 注入翻译 | < 50ms |

## ⚡ 常用命令

```javascript
// 启用/禁用监控
window.zhiyiPerf.enable();
window.zhiyiPerf.disable();

// 查看特定分类
window.zhiyiPerf.report('批次处理');

// 导出数据
copy(JSON.stringify(window.zhiyiPerf.stats(), null, 2));
```

## 🔍 性能问题诊断

### API调用慢
```javascript
// 检查翻译API调用时间
const stats = window.zhiyiPerf.stats();
console.log('API调用:', stats['批次处理']);
// 如果 average > 500ms，考虑网络或缓存优化
```

### 扫描慢
```javascript
// 查看扫描详情
window.zhiyiPerf.report('内容扫描');
// 注意"总段落数"，如果过大考虑优化选择器
```

### DOM操作慢
```javascript
// 查看DOM操作详情
window.zhiyiPerf.report('DOM操作');
// 注意"处理节点数"，考虑批量更新
```

## 📖 详细文档

- 📘 [PERFORMANCE_LOG.md](./PERFORMANCE_LOG.md) - 完整使用指南
- 🧪 [PERFORMANCE_TEST.md](./PERFORMANCE_TEST.md) - 测试指南
- 💻 [performance-usage-example.js](./performance-usage-example.js) - 代码示例
- 📋 [PERFORMANCE_MONITORING_SUMMARY.md](./PERFORMANCE_MONITORING_SUMMARY.md) - 实现总结

## 💡 提示

- 超过100ms的操作会自动输出警告 ⚠️
- 完成内容处理后会自动显示报告 📊
- 定期清除日志避免内存占用 🧹
- 在生产环境可以禁用监控提升性能 ⚡

---

**快速访问**: 在控制台输入 `window.zhiyiPerf` 查看所有可用方法

