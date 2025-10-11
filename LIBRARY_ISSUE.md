# wdc-translator 库集成问题

## 问题描述

集成 `wdc-translator.min.js` 后出现错误：
```
TypeError: i is not a function
at wdc-translator.min.js:1:87430
```

## 原因分析

根据 [wdc-translator GitHub 仓库](https://github.com/rossroma/wdc-translator) 的代码分析：

1. **UMD 打包格式问题**
   ```javascript
   !function(e,i){
     "object"==typeof exports && "undefined"!=typeof module
       ? i(exports,require("compromise"))  // Node.js 环境
       : "function"==typeof define && define.amd
       ? define(["exports","compromise"],i)  // AMD 环境
       : i((e="undefined"!=typeof globalThis?globalThis:e||self).wdcTranslator={}, e.nlp)  // 浏览器环境
   }
   ```

2. **依赖问题**
   - 库依赖 `compromise` NLP 库
   - 在浏览器环境中，期望 `compromise` 作为全局变量 `nlp`
   - 当前打包文件中 `compromise` 未正确初始化

## 解决方案

### 方案 1：重新构建带依赖的版本（推荐）

需要从源码重新打包，将 compromise 完整打包进来：

```bash
# 克隆仓库
git clone https://github.com/rossroma/wdc-translator.git
cd wdc-translator

# 安装依赖
npm install

# 构建（需要配置 rollup 将 compromise 打包进来）
npm run build
```

### 方案 2：单独加载 compromise 库

在 manifest.json 中先加载 compromise：

```json
{
  "content_scripts": [{
    "js": [
      "lib/compromise.min.js",    // 先加载 compromise
      "lib/wdc-translator.min.js", // 再加载 wdc-translator
      "content.js"
    ]
  }]
}
```

需要下载 compromise 库：
```bash
# 下载 compromise
curl -o lib/compromise.min.js https://unpkg.com/compromise@14/builds/compromise.min.js
```

### 方案 3：使用 ES Module 版本

如果有 dist/wdc-translator.js（非 min 版本），可以在 content.js 中动态导入：

```javascript
// 在 content.js 顶部
let wdcTranslator;

// 动态加载
(async function loadLibrary() {
  try {
    const module = await import(chrome.runtime.getURL('lib/wdc-translator.js'));
    wdcTranslator = module;
  } catch (error) {
    console.error('Failed to load wdc-translator:', error);
  }
})();
```

### 方案 4：回退到简化版本（临时方案）

创建一个简化的词汇提取器作为临时替代：

```javascript
// simple-word-extractor.js
class SimpleWordExtractor {
  constructor(difficulty = 5) {
    this.difficulty = difficulty;
    this.commonWords = new Set([/* 常用词列表 */]);
  }
  
  extractWords(text, options) {
    const { difficulty, minLength } = options;
    // 简化的词汇提取逻辑
    // ...
  }
}
```

## 推荐行动

1. **立即**: 使用方案 4（简化版本）恢复功能
2. **短期**: 实施方案 2（单独加载 compromise）
3. **长期**: 联系库作者或fork项目，修复打包配置

## 相关链接

- [wdc-translator GitHub](https://github.com/rossroma/wdc-translator)
- [compromise 官方文档](https://github.com/spencermountain/compromise)
- [Chrome Extension Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

## 状态

- ✅ **已解决**：通过单独加载 compromise.min.js 解决依赖问题
- 📦 当前实施：方案 2 - 单独加载依赖库
- ✅ 测试状态：待用户测试验证

## 实施的解决方案

### 已完成的步骤

1. ✅ 下载 `compromise.min.js` (343KB) 从 jsDelivr CDN
2. ✅ 更新 `manifest.json`，按顺序加载依赖：
   ```json
   "js": [
     "lib/compromise.min.js",      // 先加载 NLP 核心
     "lib/wdc-translator.min.js",  // 再加载翻译器
     "content.js"                  // 最后加载业务逻辑
   ]
   ```
3. ✅ 更新 `content.js`，添加依赖检查逻辑
4. ✅ 使用正确的 API：`wdcTranslator.extractWords()`

### 测试方法

1. 重新加载扩展
2. 打开英文网页
3. 查看控制台是否有错误
4. 验证词汇提取功能是否正常

---

**更新时间**: 2025-10-11  
**负责人**: Development Team

