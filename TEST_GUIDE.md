# 测试指南

本指南帮助你验证扩展的功能是否正常工作，特别是针对 v1.0.1 版本的修复。

## 前置准备

1. **加载扩展**
   ```
   1. 打开 Chrome 浏览器
   2. 访问 chrome://extensions/
   3. 开启右上角"开发者模式"
   4. 点击"加载已解压的扩展程序"
   5. 选择 wdc-extension 文件夹
   ```

2. **配置 API Key**
   ```
   1. 点击扩展图标
   2. 点击"设置"按钮
   3. 填入 OpenAI API Key
   4. 保存配置
   ```

## 测试场景

### 场景 1：基本消息传递测试

**目的**：验证 content script 和 background script 之间的消息传递正常

**步骤**：
1. 打开任意英文网页（如：https://en.wikipedia.org）
2. 按 F12 打开开发者工具
3. 切换到 Console 标签
4. 观察是否有错误信息

**预期结果**：
- ✅ 控制台没有 "Could not establish connection" 错误
- ✅ 页面右下角显示激活提示（如果是首次访问）
- ✅ 扩展图标显示徽章（如果页面是英文）

**失败情况**：
- ❌ 看到连接错误：检查 background service worker 是否运行
- ❌ 没有激活提示：检查页面是否被识别为英文页面

---

### 场景 2：重试机制测试

**目的**：验证消息发送失败时的重试机制

**步骤**：
1. 打开 chrome://extensions/
2. 找到"智译"扩展，点击"Service Worker"链接
3. 在打开的 DevTools 中设置断点或暂停脚本
4. 打开一个英文网页
5. 观察控制台输出

**预期结果**：
- ✅ 看到类似 "消息发送失败 (尝试 1/3)" 的警告信息
- ✅ 系统自动重试
- ✅ 最终成功或在3次后失败

**失败情况**：
- ❌ 没有重试：检查 sendMessageSafely 函数是否正确调用

---

### 场景 3：Popup 交互测试

**目的**：验证 popup 页面与 content script 的通信

**步骤**：
1. 打开一个英文网页（如：https://news.ycombinator.com）
2. 点击扩展图标打开 popup
3. 切换"启用翻译"开关

**预期结果**：
- ✅ 开关状态正常切换
- ✅ 状态指示器显示"已激活"或"未激活"
- ✅ 页面开始翻译疑难词汇（如果开启）

**失败情况**：
- ❌ 提示需要刷新页面：这是正常的（第一次使用时）
- ❌ 开关无响应：检查 content script 是否注入

---

### 场景 4：激活提示测试

**目的**：验证页面内激活提示的功能

**步骤**：
1. 清除扩展数据：chrome://extensions/ → 智译 → 删除扩展数据
2. 重新加载扩展
3. 访问一个新的英文网页

**预期结果**：
- ✅ 页面右下角显示激活提示
- ✅ 点击"开启"按钮后提示消失
- ✅ 页面开始翻译
- ✅ 扩展图标显示 ✓ 徽章

**失败情况**：
- ❌ 点击"开启"后没有反应：检查 setActivation 消息处理

---

### 场景 5：翻译功能测试

**目的**：验证完整的翻译流程

**步骤**：
1. 访问 https://www.bbc.com/news
2. 激活翻译功能
3. 滚动页面查看文章

**预期结果**：
- ✅ 疑难词汇被高亮显示
- ✅ 疑难词汇旁边显示中文翻译
- ✅ 控制台显示 "发现 X 个疑难词汇"
- ✅ 控制台显示 "翻译注入完成"

**失败情况**：
- ❌ 没有翻译：检查 API Key 是否配置
- ❌ API 错误：检查网络和 API 配额

---

### 场景 6：扩展重新加载测试

**目的**：验证扩展重新加载后的恢复能力

**步骤**：
1. 打开一个英文网页并激活翻译
2. 访问 chrome://extensions/
3. 点击"智译"扩展的"重新加载"按钮
4. 返回之前的英文页面标签
5. 刷新页面

**预期结果**：
- ✅ 页面重新初始化
- ✅ 重新显示激活提示或自动翻译
- ✅ 没有连接错误

**失败情况**：
- ❌ 旧页面出错：刷新页面即可解决（这是预期行为）

---

### 场景 7：多标签页测试

**目的**：验证多个标签页独立工作

**步骤**：
1. 打开标签页 A：https://en.wikipedia.org
2. 激活翻译
3. 打开标签页 B：https://news.ycombinator.com
4. 不激活翻译
5. 切换回标签页 A

**预期结果**：
- ✅ 标签页 A 保持激活状态（显示 ✓ 徽章）
- ✅ 标签页 B 保持未激活状态
- ✅ 各自的状态独立管理

**失败情况**：
- ❌ 状态混乱：检查 storage key 是否正确使用 tab.id

---

### 场景 8：特殊页面测试

**目的**：验证在特殊页面上的行为

**步骤**：
1. 访问 chrome://extensions/
2. 访问 chrome://settings/
3. 观察扩展图标和控制台

**预期结果**：
- ✅ 不会产生错误（Chrome 内部页面不支持扩展）
- ✅ 扩展图标保持正常
- ✅ 没有崩溃

**失败情况**：
- ❌ 控制台大量错误：检查 content script 的注入条件

---

## 性能测试

### 测试 1：初始化速度
- 打开英文页面后，激活提示应在 1 秒内显示
- 页面语言检测应该很快完成

### 测试 2：翻译响应时间
- 单个词汇翻译：< 2 秒（取决于 API 响应）
- 批量翻译（10个词）：< 5 秒
- 缓存命中时：即时显示

### 测试 3：内存占用
```javascript
// 在页面控制台执行
console.log(performance.memory);
```
- 翻译前后内存增长应该在合理范围（< 10MB）

---

## 调试技巧

### 1. 查看 Background Service Worker 日志
```
chrome://extensions/ → 智译 → Service Worker → DevTools
```

### 2. 查看 Content Script 日志
```
页面 F12 → Console 标签
```

### 3. 检查存储数据
```javascript
// 在 background DevTools 控制台执行
chrome.storage.local.get(null, console.log);
chrome.storage.sync.get(null, console.log);
```

### 4. 手动触发消息
```javascript
// 在页面控制台执行
chrome.runtime.sendMessage({ action: 'getConfig' }, console.log);
```

---

## 常见问题诊断

| 症状 | 可能原因 | 解决方法 |
|------|---------|---------|
| 连接错误 | Background worker 未运行 | 刷新扩展或页面 |
| 无激活提示 | 页面未识别为英文 | 检查页面语言或手动开启 |
| 翻译失败 | API Key 错误 | 检查设置页面配置 |
| 样式错误 | CSS 未加载 | 检查 manifest.json 配置 |
| 状态不同步 | Storage 访问错误 | 清除扩展数据重试 |

---

## 自动化测试（可选）

如果你想编写自动化测试，可以使用以下框架：

### Puppeteer 测试示例
```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--disable-extensions-except=./wdc-extension',
      '--load-extension=./wdc-extension'
    ]
  });
  
  const page = await browser.newPage();
  await page.goto('https://en.wikipedia.org');
  
  // 等待扩展初始化
  await page.waitForTimeout(1000);
  
  // 检查是否有错误
  const errors = await page.evaluate(() => {
    return window.__extensionErrors || [];
  });
  
  console.log('Errors:', errors);
  
  await browser.close();
})();
```

---

## 报告问题

如果测试失败，请提供以下信息：

1. **环境信息**
   - Chrome 版本
   - 操作系统
   - 扩展版本

2. **错误信息**
   - 控制台错误截图
   - Background worker 日志
   - 复现步骤

3. **配置信息**
   - API 配置（隐藏敏感信息）
   - 难度等级设置
   - 白名单/黑名单配置

提交到：https://github.com/your-repo/wdc-extension/issues

---

## 测试清单

完成以下测试后打勾：

- [ ] 基本消息传递测试
- [ ] 重试机制测试
- [ ] Popup 交互测试
- [ ] 激活提示测试
- [ ] 翻译功能测试
- [ ] 扩展重新加载测试
- [ ] 多标签页测试
- [ ] 特殊页面测试
- [ ] 性能测试

全部通过后，扩展应该可以正常使用了！🎉

