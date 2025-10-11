# 快速测试指南 - v1.0.2

## 🚀 立即测试修复

### 步骤 1: 重新加载扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 找到 **智译 - Smart Translation**
4. 点击刷新按钮 🔄

### 步骤 2: 打开测试页面

打开任意英文网页进行测试，推荐：
- https://en.wikipedia.org/wiki/Artificial_intelligence
- https://www.bbc.com/news
- https://news.ycombinator.com

### 步骤 3: 打开开发者工具

1. 按 `F12` 或 `Cmd+Option+I` (Mac)
2. 切换到 **Console** 标签

### 步骤 4: 检查库加载

在控制台输入以下命令检查：

```javascript
// 检查 compromise 是否加载
console.log('compromise loaded:', typeof nlp !== 'undefined');

// 检查 wdc-translator 是否加载
console.log('wdcTranslator loaded:', typeof wdcTranslator !== 'undefined');

// 检查 extractWords 函数
console.log('extractWords exists:', typeof wdcTranslator?.extractWords === 'function');
```

**预期输出：**
```
compromise loaded: true
wdcTranslator loaded: true
extractWords exists: true
```

### 步骤 5: 测试功能

1. 点击扩展图标
2. 开启翻译功能
3. 查看页面是否显示翻译

**预期结果：**
- ✅ 控制台显示 "使用 wdc-translator 提取完成"
- ✅ 控制台显示 "发现 X 个疑难词汇"
- ✅ 页面显示疑难词汇的翻译
- ❌ **不应该**出现 "TypeError: i is not a function"

## 🐛 如果还有错误

### 错误 1: compromise 未加载

**错误信息：**
```
Error: compromise (nlp) 库未加载
```

**解决方法：**
1. 确认 `lib/compromise.min.js` 文件存在
2. 检查文件大小（应该约 343KB）
3. 重新下载：
   ```bash
   cd /path/to/wdc-extension/lib
   curl -L -o compromise.min.js https://cdn.jsdelivr.net/npm/compromise@14/builds/compromise.min.js
   ```

### 错误 2: wdc-translator 未加载

**错误信息：**
```
Error: wdc-translator 库未正确加载
```

**解决方法：**
1. 确认 `lib/wdc-translator.min.js` 文件存在
2. 检查 `manifest.json` 中的加载顺序
3. 确保 compromise 在 wdc-translator 之前加载

### 错误 3: 仍然是 "i is not a function"

**可能原因：**
- compromise 版本不兼容
- 加载顺序错误

**解决方法：**
1. 清除扩展缓存：
   - 在 `chrome://extensions/` 中移除扩展
   - 重新加载扩展
2. 刷新测试页面
3. 查看详细错误堆栈

## 📊 性能测试

测试词汇提取性能：

```javascript
// 在控制台执行
const testText = document.body.innerText.substring(0, 5000);
console.time('extract');
const words = wdcTranslator.extractWords(testText, {
  difficulty: 5,
  minLength: 4
});
console.timeEnd('extract');
console.log('Found words:', words.length);
```

**预期性能：**
- 提取时间：< 100ms（5000字符）
- 词汇数量：10-50 个（取决于文本）

## 🔍 调试信息

如果需要报告问题，请提供以下信息：

1. **Chrome 版本：**
   ```
   打开 chrome://version/
   ```

2. **扩展版本：**
   ```
   在 chrome://extensions/ 中查看
   ```

3. **文件大小：**
   ```bash
   ls -lh lib/*.js
   ```

4. **控制台完整错误：**
   - 截图或复制完整的错误堆栈

5. **测试URL：**
   - 提供出错的网页地址

## ✅ 测试清单

测试完成后，请确认：

- [ ] compromise 库正确加载（343KB）
- [ ] wdc-translator 库正确加载
- [ ] extractWords 函数可用
- [ ] 页面初始化无错误
- [ ] 词汇提取功能正常
- [ ] 翻译注入正常显示
- [ ] 性能在可接受范围内

## 📝 反馈

测试结果请反馈：
- ✅ **成功**：在 GitHub 关闭相关 Issue
- ❌ **失败**：提供上述调试信息到 GitHub Issue

---

**版本：** 1.0.2  
**测试日期：** 2025-10-11  
**预计测试时间：** 5 分钟

