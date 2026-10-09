# 快速开始指南

本指南将帮助您在5分钟内快速上手"智译"浏览器插件。

## 🚀 三步开始

### 步骤1: 安装插件（2分钟）

**开发者模式安装：**

1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 开启右上角的"**开发者模式**"开关
3. 点击"**加载已解压的扩展程序**"
4. 选择本项目文件夹
5. 看到智译图标出现在浏览器右上角 ✅

### 步骤2: 选择翻译引擎（可选）

不配置任何 Key 也能用：设置页选「自动」或「Chrome 内置离线翻译」即可（免费、离线）。

想用 LLM / DeepL：

1. 点击插件图标 → "设置"
2. 选择「翻译引擎」，填入对应 Key
3. 点击"保存设置" ✅

> 各引擎 Key 的申请方式见 [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)。

### 步骤3: 开始翻译（1分钟）

1. 访问任意英文网页，例如：
   - https://en.wikipedia.org/wiki/Artificial_intelligence
   - https://www.bbc.com/news
   - https://techcrunch.com

2. 若开启"自动翻译"，打开英文页即自动翻译；否则页面右侧会出现小图标

3. 点击小图标开始翻译

4. 稍等片刻，页面中的疑难词汇会自动标注中文翻译 🎉

## 💡 使用技巧

### 调整翻译敏感度

**场景：** 翻译的词太多/太少？

1. 打开设置页面
2. 选择你的英语水平（CEFR标准）
   - **A2**: 初级，翻译最多
   - **B1**: 中级
   - **B2**: 中高级（推荐）
   - **C1**: 高级
   - **C2**: 精通，翻译最少
3. 刷新页面重新翻译

### 设置自动翻译网站

**场景：** 经常访问某些网站，希望自动开启翻译

1. 打开设置页面
2. 切换到"白名单"标签
3. 输入域名（如：`wikipedia.org`）
4. 点击"添加"
5. 下次访问该网站时自动开启翻译 ✅

### 快速开关翻译

**场景：** 需要临时查看原文

1. 点击浏览器右上角的智译图标
2. 点击开关按钮即可快速关闭/开启翻译

## 📊 推荐配置

### 配置1: 中高级学习者（推荐）
```
英语水平: B2 中高级
引擎: 自动 / LLM (如 gpt-4o-mini)
目标语言: 简体中文
```
适合有一定英语基础，希望通过阅读提升的用户。

### 配置2: 专业阅读
```
英语水平: C1 高级 / C2 精通
引擎: LLM (如 gpt-4o)
目标语言: 简体中文
```
适合科研人员、专业人士，只翻译最专业的术语。

### 配置3: 初学者
```
英语水平: A2 初级 / B1 中级
引擎: 自动 / Chrome 内置离线翻译
目标语言: 简体中文
```
适合英语初学者，翻译更多词汇降低阅读门槛。

## 🎯 推荐阅读网站

### 新闻类
- **BBC News**: https://www.bbc.com/news
- **The Guardian**: https://www.theguardian.com
- **NPR**: https://www.npr.org

### 技术类
- **TechCrunch**: https://techcrunch.com
- **Hacker News**: https://news.ycombinator.com
- **Medium**: https://medium.com

### 学术类
- **arXiv**: https://arxiv.org
- **Nature**: https://www.nature.com
- **PubMed**: https://pubmed.ncbi.nlm.nih.gov

### 百科类
- **Wikipedia**: https://en.wikipedia.org
- **Britannica**: https://www.britannica.com

## ⚠️ 常见问题

### Q: 为什么有些词没有翻译？
A: 可能是因为：
- 英语水平设置过高（C1/C2只翻译最难的词）
- 该词被判定为常用词
- API请求失败

**解决：** 选择较低的英语水平（如 A2/B1 翻译更多词）或检查API配置

### Q: 翻译速度慢？
A: 可能原因：
- 网络连接慢，或所用的 API 中转服务较慢
- 页面词汇量大

**解决：** 改用「Chrome 内置离线翻译」；或用直连快模型（如 `gpt-4o-mini`）；选择较高的英语水平减少词汇量

### Q: API费用如何计算？
A: 
- 按所选服务计费（LLM 按 token，DeepL 按字符额度，Chrome 内置离线免费）
- 翻译按批合并请求（每批约 50 词），比逐词调用省得多
- 估算：翻译 100 个词约 $0.01 以内（视模型而定）

**省钱技巧：**
- 选择较高的英语水平（C1/C2 翻译更少词汇）
- 使用白名单限制网站
- 已翻译内容会缓存，重复访问不消耗

### Q: 安全性如何？
A: 
- API Key仅存储在本地浏览器
- 不会上传到任何第三方服务器
- 翻译请求直接发送到您配置的API服务

## 🔥 进阶使用

### 使用第三方API服务

如果您使用代理或第三方API服务：

1. 打开设置页面
2. 在"API基地址"输入服务地址
   - 示例：`https://your-proxy.com/v1`
3. 保存设置

### 多语言翻译

目前支持将英文翻译为：
- 简体中文（默认）
- 繁體中文
- 日本語
- 한국어

在设置中选择"目标翻译语言"即可。

## 📞 需要帮助？

- 📖 详细文档：查看 [README.md](README.md)
- 🔧 安装问题：查看 [INSTALL.md](INSTALL.md)
- 🐛 报告问题：[GitHub Issues](https://github.com/your-username/wdc-extension/issues)
- 💬 讨论交流：[GitHub Discussions](https://github.com/your-username/wdc-extension/discussions)

---

开始享受无障碍的英文阅读体验吧！🎉
