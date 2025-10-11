# 故障排除指南

## 常见问题与解决方案

### 1. "Could not establish connection. Receiving end does not exist" 错误

#### 问题描述
这是 Chrome 扩展中最常见的错误之一，通常表示消息发送方和接收方之间的连接失败。

#### 产生原因
1. **Content Script 未注入**：在某些页面（如 chrome://、chrome-extension:// 等特殊页面）无法注入 content script
2. **扩展重新加载**：开发过程中重新加载扩展会导致现有页面的 content script 失效
3. **页面加载时机**：在页面完全加载前尝试发送消息
4. **Background Service Worker 未准备好**：service worker 可能因为各种原因未初始化完成

#### 已实施的修复措施

##### 1. 消息重试机制（content.js）
```javascript
// 安全地发送消息，带重试机制
async function sendMessageSafely(message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      // 检查 runtime 是否可用
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalidated');
      }
      
      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      console.warn(`消息发送失败 (尝试 ${i + 1}/${retries}):`, error.message);
      
      if (i === retries - 1) {
        throw error;
      }
      
      // 等待后重试，延迟递增
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
    }
  }
}
```

##### 2. 错误处理增强（popup.js）
- 检测连接错误并提示用户刷新页面
- 提供友好的用户交互反馈
- 自动恢复开关状态

##### 3. Background Script 健壮性（background.js）
- 添加请求验证
- 增强错误处理和日志记录
- 确保所有异步操作正确返回 `true`

#### 用户操作指南

如果遇到此错误，请尝试以下操作：

1. **刷新页面**
   - 点击扩展图标
   - 在弹出的提示中选择"是"来刷新页面

2. **手动刷新**
   - 按 `F5` 或 `Ctrl/Cmd + R` 刷新页面
   - 再次尝试使用扩展功能

3. **重新加载扩展**
   - 打开 `chrome://extensions/`
   - 找到"智译"扩展
   - 点击"重新加载"按钮
   - 刷新所有使用扩展的标签页

4. **检查页面限制**
   - 某些页面（如 Chrome 内部页面）不支持扩展
   - 确保在普通网页上使用扩展

### 2. 翻译功能无响应

#### 可能原因
1. API Key 未配置或无效
2. 网络连接问题
3. API 配额用尽

#### 解决方法
1. 打开扩展设置页面
2. 检查 API Key 是否正确配置
3. 检查网络连接
4. 查看浏览器控制台（F12）的错误信息

### 3. 页面未检测到英文内容

#### 可能原因
1. 页面内容动态加载
2. 页面语言标记不正确
3. 内容在特殊标签中（如 iframe）

#### 解决方法
1. 等待页面完全加载后再激活扩展
2. 手动点击扩展图标开启翻译
3. 刷新页面重试

## 开发者信息

### 调试技巧

#### 1. 查看 Background Service Worker 日志
```
1. 打开 chrome://extensions/
2. 确保开启"开发者模式"
3. 点击"Service Worker"链接
4. 在 DevTools 中查看日志
```

#### 2. 查看 Content Script 日志
```
1. 在需要调试的页面按 F12
2. 切换到 Console 标签
3. 查看 content script 的日志输出
```

#### 3. 测试消息传递
```javascript
// 在页面控制台测试
chrome.runtime.sendMessage({ action: 'getConfig' }, console.log);
```

### 常见开发问题

#### Manifest V3 注意事项
1. **Background Pages → Service Workers**
   - Service Worker 会在不活动时休眠
   - 不要在 Service Worker 中存储状态
   - 使用 chrome.storage API 持久化数据

2. **异步消息处理**
   - 必须返回 `true` 以保持消息通道开放
   - 使用 `sendResponse` 前确保通道未关闭

3. **Content Security Policy**
   - 不能使用 `eval()` 或内联脚本
   - 外部 API 调用需要在 background script 中进行

## 更新日志

### v1.0.1 (修复版本)
- ✅ 修复"Could not establish connection"错误
- ✅ 添加消息重试机制
- ✅ 增强错误处理和用户反馈
- ✅ 改进 background script 的健壮性
- ✅ 优化激活状态管理

## 联系与反馈

如果问题仍然存在，请：
1. 打开浏览器开发者工具（F12）
2. 复制控制台中的错误信息
3. 在 GitHub Issues 中提交问题报告
4. 包含以下信息：
   - Chrome 版本
   - 扩展版本
   - 错误信息
   - 复现步骤

