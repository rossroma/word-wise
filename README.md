# 智译 (Smart Translation) - Chrome浏览器插件

<div align="center">

![智译Logo](icons/icon128.png)

**智能识别并翻译网页中的疑难词汇，提升英文阅读效率**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.4-green)](.)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)
[![Performance](https://img.shields.io/badge/performance-📊%20monitored-brightgreen)](PERFORMANCE_LOG.md)

</div>

---

## 📖 产品简介

"智译"是一款面向非英语母语用户、英语学习者和需要高效阅读英文资料的专业人士的浏览器插件。它旨在通过智能识别并翻译网页中的疑难词汇，降低英文阅读门槛，提升阅读效率和体验。

### ✨ 核心功能

- 🔍 **自动语言检测** - 智能识别英文网页并提示激活
- 🎯 **精准内容识别** - 智能识别网页主体内容区域，避免干扰
- 🧠 **AI词汇分析** - 基于WDC算法智能筛选疑难词汇
- 🤖 **AI大模型翻译** - 集成ChatGPT等大模型，提供精准、符合上下文的翻译
- 💫 **无缝展示** - 在原文旁自动注入翻译，无需手动操作
- 📊 **性能监控** - 内置性能分析工具，实时监控处理性能（v1.0.3+）

---

## 🚀 快速开始

### 安装方法

#### 方法1: 从Chrome Web Store安装（推荐）
1. 访问 [Chrome Web Store](#)（待发布）
2. 点击"添加至Chrome"
3. 完成安装

#### 方法2: 本地开发安装

```bash
# 克隆仓库
git clone https://github.com/your-username/wdc-extension.git
cd wdc-extension

# 在Chrome中加载插件
# 1. 打开 chrome://extensions/
# 2. 开启"开发者模式"
# 3. 点击"加载已解压的扩展程序"
# 4. 选择本项目文件夹
```

### 配置API Key

首次使用需要配置API Key：

1. 点击浏览器右上角的插件图标
2. 点击"设置"按钮
3. 输入您的OpenAI API Key
4. （可选）配置模型名称和API基地址
5. 点击"保存设置"

> 💡 如何获取API Key？
> - OpenAI: https://platform.openai.com/api-keys
> - 其他兼容OpenAI API的服务商

---

## 📱 使用指南

### 基础使用

1. **自动检测** - 访问英文网页时，插件会自动检测语言
2. **激活翻译** - 点击提示框中的"开启"按钮，或通过插件图标手动开启
3. **查看翻译** - 疑难词汇会自动标注中文翻译
4. **悬停查看** - 鼠标悬停在标注词汇上可查看更多信息

### 高级配置

#### 调整难度等级

在设置页面可以调整"疑难词汇难度等级"（1-9）：
- **1-3级（保守）**: 仅翻译最难的专业词汇
- **4-6级（平衡）**: 适合大多数用户
- **7-9级（激进）**: 翻译更多中等难度词汇

#### 网站白名单/黑名单

- **白名单**: 在这些网站自动开启翻译
- **黑名单**: 在这些网站永不开启翻译

#### 支持的AI模型

- OpenAI: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`
- 其他兼容OpenAI API格式的服务

---

## 📊 性能监控（v1.0.3+）

### 性能监控工具

智译内置完整的性能监控系统，帮助开发者和高级用户分析性能瓶颈：

**主要功能：**
- 📊 自动跟踪所有关键处理节点的耗时
- 🎯 详细的统计信息（总耗时、平均值、最大/最小值）
- ⚡ 实时性能警告（超过100ms的操作）
- 📈 分类报告（系统启动、内容扫描、批次处理等）

**快速使用：**

```javascript
// 在浏览器控制台中执行以下命令

// 查看性能报告
window.zhiyiPerf.report();

// 获取统计数据
window.zhiyiPerf.stats();

// 清除性能日志
window.zhiyiPerf.clear();

// 禁用/启用监控
window.zhiyiPerf.disable();
window.zhiyiPerf.enable();
```

**性能报告示例：**

```
📊 性能统计报告
  📁 系统启动
    初始化: 78.92ms
    检查激活状态: 15.23ms
    获取配置: 12.45ms
    检测页面语言: 45.67ms
  
  📁 批次处理
    批次1: 292.57ms (词汇数: 25)
    批次2: 234.12ms (词汇数: 18)
    
  总计: 152.27ms | 平均: 38.07ms
```

> 📘 详细使用指南请查看 [PERFORMANCE_LOG.md](./PERFORMANCE_LOG.md)  
> 🧪 快速测试指南请查看 [PERFORMANCE_TEST.md](./PERFORMANCE_TEST.md)

---

## 🛠 技术架构

### 项目结构

```
wdc-extension/
├── manifest.json           # Chrome扩展配置文件
├── background.js           # 后台服务Worker（API通信）
├── content.js             # 内容脚本（页面注入）
├── content.css            # 内容样式
├── wdc-analyzer.js        # WDC词汇难度分析器
├── popup.html/css/js      # 弹出菜单
├── options.html/css/js    # 设置页面
├── icons/                 # 图标资源
└── README.md              # 项目文档
```

### 核心模块

#### 1. WDC词汇难度分析器 (`wdc-analyzer.js`)
- 基于词频、词长、复杂度等多维度分析
- 智能识别疑难词汇
- 可调节难度等级（1-9）

#### 2. Background Service Worker (`background.js`)
- 管理API通信
- 处理翻译请求
- 缓存翻译结果
- 管理插件状态

#### 3. Content Script (`content.js`)
- 检测页面语言
- 提取主体内容
- DOM节点遍历与注入
- 用户交互处理

### 技术栈

- **开发语言**: JavaScript (ES6+), HTML5, CSS3
- **浏览器API**: Chrome Extension Manifest V3
- **AI集成**: OpenAI API (ChatGPT)
- **存储**: Chrome Storage API

---

## 🎯 目标用户

- 📚 **英语学习者**: 希望通过阅读扩展词汇量
- 🔬 **科研人员**: 需要快速阅读大量英文文献
- 💼 **职场人士**: 处理英文邮件和报告
- 🌐 **普通用户**: 浏览英文新闻和社交媒体

---

## 🗺 产品路线图

### 已完成 ✅
- [x] 核心翻译功能
- [x] WDC词汇分析算法
- [x] 用户设置页面
- [x] 白名单/黑名单管理
- [x] 翻译缓存机制

### 开发中 🚧
- [ ] 支持更多AI模型（Claude, Gemini等）
- [ ] 短语和固定搭配翻译
- [ ] 深色模式优化
- [ ] 性能优化

### 未来规划 🔮
- [ ] 支持更多目标语言
- [ ] 用户自定义词库
- [ ] 语音朗读功能
- [ ] 单词收藏和复习
- [ ] Firefox/Edge版本

---

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发流程

```bash
# Fork并克隆仓库
git clone https://github.com/your-username/wdc-extension.git

# 创建功能分支
git checkout -b feature/your-feature

# 提交更改
git commit -m "Add: your feature description"

# 推送到分支
git push origin feature/your-feature

# 创建Pull Request
```

### 代码规范

- 遵循JavaScript Standard Style
- 提交前确保代码通过lint检查
- 编写清晰的commit message

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 💬 反馈与支持

- **问题反馈**: [GitHub Issues](https://github.com/your-username/wdc-extension/issues)
- **功能建议**: [GitHub Discussions](https://github.com/your-username/wdc-extension/discussions)
- **邮件联系**: your-email@example.com

---

## 🙏 致谢

感谢以下开源项目和服务：

- [OpenAI API](https://openai.com/) - 提供强大的AI翻译能力
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - 浏览器扩展平台
- 所有贡献者和用户

---

<div align="center">

**让英文阅读更轻松 | Make English Reading Easier**

Made with ❤️ by [Your Name]

</div>

