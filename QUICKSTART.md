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

### 步骤2: 配置API Key（2分钟）

**获取API Key：**

1. 访问 https://platform.openai.com/api-keys
2. 登录OpenAI账号（没有账号需要先注册）
3. 点击"Create new secret key"
4. 复制生成的密钥（格式：`sk-...`）

**填入插件：**

1. 点击浏览器右上角的智译图标
2. 点击"设置"按钮
3. 在"API Key"输入框粘贴您的密钥
4. 点击"保存设置"按钮 ✅

### 步骤3: 开始翻译（1分钟）

1. 访问任意英文网页，例如：
   - https://en.wikipedia.org/wiki/Artificial_intelligence
   - https://www.bbc.com/news
   - https://techcrunch.com

2. 页面加载后，右上角会弹出提示"是否开启本页疑难词翻译？"

3. 点击"**开启**"按钮

4. 稍等片刻，页面中的疑难词汇会自动标注中文翻译 🎉

## 💡 使用技巧

### 调整翻译敏感度

**场景：** 翻译的词太多/太少？

1. 打开设置页面
2. 调整"疑难词汇难度等级"滑块
   - 向左滑：减少翻译（1-3级，适合高级学习者）
   - 向右滑：增加翻译（7-9级，适合初学者）
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

### 配置1: 英语学习者（推荐）
```
难度等级: 5-6
模型: gpt-3.5-turbo
目标语言: 简体中文
```
适合有一定英语基础，希望通过阅读提升的用户。

### 配置2: 专业阅读
```
难度等级: 2-3
模型: gpt-4-turbo
目标语言: 简体中文
```
适合科研人员、专业人士，只翻译最专业的术语。

### 配置3: 初学者
```
难度等级: 7-8
模型: gpt-3.5-turbo
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
- 难度等级设置较低
- 该词被判定为常用词
- API请求失败

**解决：** 提高难度等级或检查API配置

### Q: 翻译速度慢？
A: 可能原因：
- 网络连接慢
- 使用GPT-4模型（较慢但更准确）
- 页面词汇量大

**解决：** 降低难度等级，使用gpt-3.5-turbo

### Q: API费用如何计算？
A: 
- OpenAI按token计费
- gpt-3.5-turbo约$0.002/1K tokens
- 平均每个词翻译约消耗50-100 tokens
- 估算：翻译100个词约$0.01-0.02

**省钱技巧：**
- 降低难度等级
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

