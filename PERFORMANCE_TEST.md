# 性能监控快速测试指南

## 快速开始

### 1. 安装并启用插件

1. 在 Chrome 中加载扩展程序
2. 访问任意英文页面（如 [Wikipedia](https://en.wikipedia.org)）
3. 打开浏览器控制台（F12）

### 2. 查看自动生成的性能报告

插件初始化和翻译完成后，会自动输出性能报告。你会看到类似这样的输出：

```
📊 性能统计报告
  📁 系统启动
  📁 翻译处理
  📁 内容扫描
  📁 内容处理
  📁 批次处理
  📁 DOM操作
```

### 3. 手动查看性能报告

在控制台执行：

```javascript
// 查看完整报告
window.zhiyiPerf.report();

// 查看统计数据
window.zhiyiPerf.stats();
```

## 测试场景

### 场景1: 测试初始化性能

```javascript
// 1. 刷新页面
location.reload();

// 2. 等待页面加载完成，然后查看报告
window.zhiyiPerf.report('系统启动');
```

**预期结果**：
- 初始化应在 100ms 内完成
- 可以看到检查激活状态、获取配置、检测页面语言的详细耗时

### 场景2: 测试内容扫描性能

```javascript
// 1. 清除日志
window.zhiyiPerf.clear();

// 2. 滚动页面触发新的内容扫描
window.scrollBy(0, 1000);

// 3. 等待300ms（防抖延迟）后查看报告
setTimeout(() => {
  window.zhiyiPerf.report('内容扫描');
}, 500);
```

**预期结果**：
- 可以看到总段落数、可见段落数、跳过的段落数等详细信息
- 扫描时间应该与页面复杂度成正比

### 场景3: 测试批次处理性能

```javascript
// 查看所有批次的处理详情
window.zhiyiPerf.report('批次处理');
```

**预期结果**：
- 每个批次都有详细的耗时记录
- 可以看到提取词汇、翻译API调用、注入翻译三个子步骤的耗时
- 翻译API调用通常是最耗时的部分

### 场景4: 测试DOM操作性能

```javascript
// 查看DOM操作的详细性能
window.zhiyiPerf.report('DOM操作');
```

**预期结果**：
- 可以看到遍历文本节点和替换文本的耗时
- 包含处理节点数、替换节点数、匹配次数等统计信息

## 性能基准

以下是在标准测试页面（Wikipedia 首页）上的参考性能数据：

| 分类 | 操作 | 参考耗时 | 说明 |
|------|------|---------|------|
| 系统启动 | 初始化 | 50-100ms | 包含配置加载和语言检测 |
| 系统启动 | 检测页面语言 | 20-50ms | 依赖页面内容量 |
| 内容扫描 | 获取可见段落 | 30-80ms | 依赖页面元素数量 |
| 批次处理 | 提取词汇 | 10-30ms | 每批5个段落 |
| 批次处理 | 翻译API调用 | 100-500ms | 网络延迟影响最大 |
| 批次处理 | 注入翻译 | 20-50ms | 每批5个段落 |
| DOM操作 | 注入单个元素 | 5-15ms | 单个段落 |

## 常见性能问题及解决

### 问题1: 翻译API调用过慢

**症状**：
```javascript
⏱️ [批次处理] 翻译API调用: 1234.56ms
```

**排查**：
```javascript
// 查看API调用统计
const stats = window.zhiyiPerf.stats();
console.log('翻译API调用统计:', stats['批次处理']);
```

**可能原因**：
- 网络延迟
- API服务器响应慢
- 请求词汇量过大

**解决方案**：
- 检查网络连接
- 查看background.js中的API实现
- 考虑增加本地缓存

### 问题2: 内容扫描过慢

**症状**：
```javascript
⏱️ [内容扫描] 获取可见段落: 234.56ms
```

**排查**：
```javascript
// 查看扫描详情
window.zhiyiPerf.report('内容扫描');
// 注意查看"总段落数"和"可见段落数"的比例
```

**可能原因**：
- 页面DOM结构过于复杂
- 选择器匹配了太多元素
- getBoundingClientRect调用过多

**解决方案**：
- 优化选择器，减少匹配范围
- 考虑使用Intersection Observer
- 增加过滤条件

### 问题3: DOM注入过慢

**症状**：
```javascript
⏱️ [批次处理] 注入翻译: 234.56ms
```

**排查**：
```javascript
// 查看DOM操作详情
window.zhiyiPerf.report('DOM操作');
// 注意查看"处理节点数"和"替换节点数"
```

**可能原因**：
- 正则表达式匹配复杂
- DOM操作过于频繁
- 单个段落包含过多文本节点

**解决方案**：
- 优化正则表达式
- 使用DocumentFragment批量更新
- 减少DOM重排

## 导出性能数据

### 导出为JSON

```javascript
// 获取性能数据
const stats = window.zhiyiPerf.stats();

// 转换为JSON
const json = JSON.stringify(stats, null, 2);

// 复制到剪贴板（Chrome DevTools）
copy(json);

// 或控制台输出
console.log(json);
```

### 导出为CSV（用于Excel分析）

```javascript
function exportToCSV() {
  const stats = window.zhiyiPerf.stats();
  let csv = 'Category,Count,Total(ms),Average(ms),Max(ms),Min(ms)\n';
  
  Object.keys(stats).forEach(category => {
    const data = stats[category];
    csv += `"${category}",${data.count},${data.total},${data.average},${data.max},${data.min}\n`;
  });
  
  console.log(csv);
  return csv;
}

// 执行导出
const csvData = exportToCSV();
copy(csvData);
```

## 性能对比测试

### 对比不同配置的性能

```javascript
// 测试配置1: 难度级别5
// 1. 设置难度为5
// 2. 刷新页面
// 3. 记录性能数据
const stats5 = window.zhiyiPerf.stats();

// 测试配置2: 难度级别3
// 1. 设置难度为3
// 2. 刷新页面
// 3. 记录性能数据
const stats3 = window.zhiyiPerf.stats();

// 对比
console.log('难度5:', stats5);
console.log('难度3:', stats3);
```

### 对比不同页面的性能

```javascript
// 创建性能对比函数
function collectPerformanceData(pageName) {
  const stats = window.zhiyiPerf.stats();
  return {
    page: pageName,
    url: location.href,
    timestamp: new Date().toISOString(),
    stats: stats
  };
}

// 在不同页面收集数据
const data = collectPerformanceData('Wikipedia Main');
console.log(JSON.stringify(data, null, 2));
```

## 持续监控

### 监控脚本（在控制台运行）

```javascript
// 每10秒输出一次性能统计
setInterval(() => {
  const stats = window.zhiyiPerf.stats();
  console.log('=== 性能监控 ===');
  console.log('时间:', new Date().toLocaleTimeString());
  console.table(stats);
}, 10000);
```

### 性能告警（自定义阈值）

```javascript
// 自定义性能告警
function checkPerformance() {
  const stats = window.zhiyiPerf.stats();
  const warnings = [];
  
  // 检查翻译API调用
  if (stats['批次处理']?.average > 500) {
    warnings.push('⚠️ 翻译API调用过慢: ' + stats['批次处理'].average + 'ms');
  }
  
  // 检查内容扫描
  if (stats['内容扫描']?.average > 100) {
    warnings.push('⚠️ 内容扫描过慢: ' + stats['内容扫描'].average + 'ms');
  }
  
  // 输出告警
  if (warnings.length > 0) {
    console.warn('性能告警:');
    warnings.forEach(w => console.warn(w));
  } else {
    console.log('✅ 性能正常');
  }
}

// 运行检查
checkPerformance();
```

## 调试建议

1. **从整体到局部**
   - 先看整体报告 `window.zhiyiPerf.report()`
   - 找出最耗时的分类
   - 深入分析该分类的详细数据

2. **使用Chrome DevTools Timeline**
   - 结合Chrome的Performance面板
   - 可以看到更底层的性能数据
   - 关注Long Tasks和Layout Shift

3. **对比测试**
   - 清除日志后进行对比测试
   - 记录每次优化前后的数据
   - 建立性能基准

4. **实际场景测试**
   - 在不同类型的页面测试
   - 考虑网络环境影响
   - 测试不同配置下的性能

## 反馈与改进

如果你发现性能问题或有优化建议，请：

1. 导出性能数据
2. 记录测试环境（浏览器版本、页面URL等）
3. 提交Issue或PR

更多信息请参考 [PERFORMANCE_LOG.md](./PERFORMANCE_LOG.md)

