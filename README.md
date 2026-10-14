# 拾词 (Wordwise) - Chrome 浏览器插件

<div align="center">

![拾词 Logo](icons/icon128.png)

**智能识别并翻译网页中的疑难词汇，提升英文阅读效率**

[![Version](https://img.shields.io/badge/version-2.0.0-green)](.)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

</div>

---

## 📖 产品简介

“拾词”（Wordwise）面向非英语母语用户、英语学习者和需要高效阅读英文资料的专业人士。它自动识别网页中的疑难词汇，并在原文旁以浅色括号标注中文翻译，降低英文阅读门槛。

### ✨ 核心功能

- 🔍 **自动语言检测** - 智能识别英文网页
- 🎯 **精准内容识别** - 提取网页主体内容，过滤导航/广告/页脚
- 🧠 **本地词汇难度判定** - 基于 wordfreq 词频(Zipf)，离线、免费、结果可复现
- 🌐 **多引擎翻译** - 支持 LLM(OpenAI 兼容)、DeepL、Chrome 内置离线翻译
- 💫 **顺序渐进注入** - 按阅读顺序从上到下翻译，页面上方先出结果
- 🎚 **可调难度** - 按 CEFR 水平控制翻译力度
- 🔘 **自动 / 手动** - 可自动翻译，或仅在页面右侧显示小图标、点击后再翻译
- 💾 **翻译缓存** - 同词同语境只翻译一次（缓存按引擎与语言隔离）

---

## 🚀 快速开始

### 安装

```bash
git clone https://github.com/rossroma/word-wise.git
```

打开 `chrome://extensions/` → 开启"开发者模式" → "加载已解压的扩展程序" → 选择本项目文件夹。详见 [INSTALL.md](./INSTALL.md)。

### 配置（可选）

打开设置页，选择「翻译引擎」：

- **自动（推荐）**：按翻译质量优先 `LLM > DeepL > Chrome`；未配置任何 Key 时回退到 Chrome 内置离线翻译。
- 需要 Key 的引擎（LLM / DeepL）如何申请见 [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)。

> 不配置任何 Key 也能用：直接选「Chrome 内置离线翻译」，免费、无需密钥、数据不出本机。

---

## 📱 使用指南

1. **自动模式**：设置页开启"检测到英文网页时自动翻译"，打开英文页即自动翻译。
2. **手动模式**：该开关关闭时，页面右侧会出现一个小图标，点击后开始翻译。
3. **查看翻译**：疑难词后会以浅色括号标注中文。
4. **回看原文**：点击浏览器右上角的插件图标切换开关。

### 选择英语水平（CEFR）

设置页可调，档位越高翻译越少：

| 档位 | 说明 |
| --- | --- |
| A2 | 翻最多，适合初学者 |
| B1 | 翻较多 |
| B2 | 平衡（默认） |
| C1 | 翻较少，适合高级学习者 |
| C2 | 仅翻最难的专业术语 |

### 网站白名单 / 黑名单

- **白名单**：在这些网站自动开启翻译
- **黑名单**：在这些网站永不开启翻译

---

## 🛠 技术架构

### 项目结构

```
word-wise/
├── manifest.json            # 扩展配置 (Manifest V3)
├── background.js            # Service Worker：翻译调度与缓存
├── content.js               # 内容脚本：选词、注入、交互
├── content.css              # 注入样式
├── popup.html/css/js        # 弹出菜单（开关）
├── options.html/css/js      # 设置页
├── lib/
│   ├── en-zipf.js           # 英文 Zipf 词频表（离线）
│   ├── word-difficulty.js   # 本地疑难词判定器
│   └── translators.js       # 可插拔翻译引擎层
├── tools/
│   └── build_zipf_table.py  # 离线生成 Zipf 词表
├── icons/                   # 图标资源
└── docs：README / INSTALL / QUICKSTART / TROUBLESHOOTING / API_KEYS_GUIDE / CHANGELOG
```

### 核心模块

- **本地判定 `lib/word-difficulty.js`**：基于 wordfreq Zipf，`zipf < 阈值` 判为疑难；未登录词(OOV)视为最难。完全离线，不消耗额度。
- **翻译引擎 `lib/translators.js`**：统一入口，支持 `chrome` / `deepl` / `openai`；`auto` 按质量优先。批量请求、逐引擎错误可定位。
- **后台 `background.js`**：翻译缓存（按引擎 + 目标语言隔离）、批量调度、把"实际执行的引擎"回传给页面。
- **内容脚本 `content.js`**：提取正文、按阅读顺序分批翻译并渐进注入、小图标激活。

### 技术栈

- JavaScript (ES6+)、HTML5、CSS3
- Chrome Extension Manifest V3
- 词频数据：[wordfreq](https://github.com/rspeer/wordfreq)

---

## 🎯 目标用户

- 📚 **英语学习者**：希望通过阅读扩展词汇量
- 🔬 **科研人员**：需要快速阅读大量英文文献
- 💼 **职场人士**：处理英文邮件和报告
- 🌐 **普通用户**：浏览英文新闻和社交媒体

---

## 🗺 产品路线图

### 已完成 ✅

- [x] 本地 wordfreq 词汇难度判定（替换原固定词表）
- [x] 多引擎翻译（LLM / DeepL / Chrome 内置离线）
- [x] 自动翻译开关与小图标激活
- [x] 按阅读顺序的渐进注入
- [x] 翻译缓存与批量请求
- [x] 白名单 / 黑名单管理

### 开发中 🚧

- [ ] 用户个人词表（标记已知词，进一步减少误标）
- [ ] 短语 / 固定搭配翻译
- [ ] 深色模式优化

### 未来规划 🔮

- [ ] 支持更多目标语言
- [ ] 语音朗读功能
- [ ] 单词收藏与复习
- [ ] Firefox / Edge 版本

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。提交前请确保代码通过 lint（`npm run lint`）。

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 💬 反馈与支持

- **问题反馈**：[GitHub Issues](https://github.com/rossroma/word-wise/issues)
- **功能建议**：[GitHub Discussions](https://github.com/rossroma/word-wise/discussions)

---

## 🙏 致谢

- [wordfreq](https://github.com/rspeer/wordfreq) - 词频数据
- [OpenAI API](https://openai.com/) 及兼容服务 - AI 翻译能力
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - 浏览器扩展平台

---

<div align="center">

**让英文阅读更轻松 | Make English Reading Easier**

</div>
