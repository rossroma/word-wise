# 安装指南

本文档详细说明如何安装和配置"智译"浏览器插件。

## 📦 安装方式

### 方式一：Chrome Web Store安装（推荐）

> 注意：插件尚未发布到Chrome Web Store，敬请期待。

1. 访问Chrome Web Store中的智译插件页面
2. 点击"添加至Chrome"按钮
3. 在弹出的确认对话框中点击"添加扩展程序"
4. 安装完成后，浏览器右上角会出现智译图标

### 方式二：本地开发者模式安装

#### 步骤1: 准备文件

```bash
# 克隆或下载项目
git clone https://github.com/your-username/wdc-extension.git
cd wdc-extension

# 或者直接下载ZIP并解压
```

#### 步骤2: 生成图标（可选）

如果需要正式的图标，请根据 `icons/README.md` 中的说明生成PNG图标：

```bash
cd icons
# 使用ImageMagick
brew install imagemagick
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

#### 步骤3: 在Chrome中加载

1. 打开Chrome浏览器
2. 在地址栏输入 `chrome://extensions/` 并回车
3. 在右上角开启"**开发者模式**"开关
4. 点击左上角的"**加载已解压的扩展程序**"按钮
5. 在弹出的文件选择窗口中，选择本项目的根目录（包含manifest.json的文件夹）
6. 点击"选择"完成加载

#### 步骤4: 验证安装

安装成功后，您应该能看到：
- 浏览器右上角出现智译图标
- 在扩展程序页面看到"智译 - Smart Translation"
- 状态显示为"已启用"

## ⚙️ 初始配置

### 选择翻译引擎

设置页顶部可选择翻译引擎，**无需 Key 也能用**：

| 引擎 | 是否免费 | 需要准备 |
| --- | --- | --- |
| 自动（推荐） | 视情况 | 无需配置，按质量优先自动选择 |
| Chrome 内置离线翻译 | 免费 | 无需 Key，需 Chrome 138+ |
| DeepL | 有免费额度 | DeepL API Key |
| LLM（OpenAI 兼容） | 视供应商 | API Key + 基地址 + 模型名 |

> 无 Key 用法：选「自动」或「Chrome 内置离线翻译」即可。
> 需要 Key 的引擎如何申请，见 [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)。

### 配置 LLM（可选）

选择「LLM（OpenAI 兼容）」时填写：

1. **打开设置页面**：点击插件图标 → "设置"
2. **填写 API Key**：如 `sk-...`
3. **（可选）模型名称 / API 基地址**
4. **保存**：点击页面底部的"保存设置"

### 可选配置

#### 模型名称

选择「LLM（OpenAI 兼容）」时可指定模型，例如 `gpt-4o-mini`（便宜、够用），或服务商提供的其它模型名。留空则使用默认模型。

#### API基地址

如果您使用代理服务或第三方API服务，可以修改此项：
- 默认：`https://api.openai.com/v1`
- 代理示例：`https://your-proxy.com/v1`

#### 英语水平

选择你的英语水平（基于 CEFR 标准）：
- **A2 初级**：翻译更多词汇，适合英语初学者
- **B1 中级**：翻译较多词汇
- **B2 中高级**：平衡模式，适合大多数用户（推荐）
- **C1 高级**：翻译较少词汇，适合高级学习者
- **C2 精通**：仅翻译最难的专业术语

#### 目标语言

选择翻译的目标语言：
- 简体中文（默认）
- 繁體中文
- 日本語
- 한국어

## 🚀 开始使用

配置完成后：

1. 访问任意英文网页（如 Wikipedia、Medium、ArXiv 等）
2. 若开启了"自动翻译"，打开英文页即自动翻译；否则页面右侧会出现小图标，点击后再翻译
3. 页面中的疑难词汇会自动标注中文翻译

## 🔍 故障排查

### 问题：插件无法加载

**解决方案：**
- 确保选择的是包含 `manifest.json` 的正确文件夹
- 检查是否开启了"开发者模式"
- 查看是否有错误提示，根据提示修复

### 问题：翻译不工作

**解决方案：**
1. 确认所用引擎已正确配置（选「Chrome 内置离线翻译」无需 Key）
2. 若用 LLM / DeepL，检查 Key 是否有效、额度是否充足
3. 检查网络连接
4. 在 Service Worker 控制台查看报错：`chrome://extensions` → 智译 → "服务工作进程"

### 问题：某些网站不工作

**解决方案：**
- 检查该网站是否在黑名单中
- 尝试刷新页面
- 手动点击插件图标开启翻译
- 某些特殊网站（如Chrome Web Store）由于安全限制无法使用插件

### 问题：翻译速度慢

**解决方案：**
- 选「Chrome 内置离线翻译」或「自动」，本地翻译几乎无延迟
- 用 LLM 时优先选直连的快模型（如 `gpt-4o-mini`）；中转服务可能较慢
- 选择较高的英语水平（C1/C2），减少需要翻译的词汇数量
- 已翻译的词汇会被缓存，重复访问时更快

### 问题：API费用过高

**解决方案：**
- 选「Chrome 内置离线翻译」，零成本
- 用 LLM 时选择较高的英语水平，减少词汇数量
- 使用白名单，仅在特定网站开启
- 插件会缓存翻译结果，避免重复调用

## 📧 技术支持

如果遇到其他问题：

1. 查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. 提交 [GitHub Issue](https://github.com/your-username/wdc-extension/issues)

## 🔄 更新插件

### 从Web Store安装的版本
Chrome会自动更新插件，无需手动操作。

### 开发者模式安装的版本
1. 拉取最新代码：`git pull origin main`
2. 在 `chrome://extensions/` 页面点击智译插件的"重新加载"图标
3. 或者点击"更新"按钮

## 🗑 卸载插件

如需卸载：

1. 打开 `chrome://extensions/`
2. 找到"智译 - Smart Translation"
3. 点击"移除"按钮
4. 确认卸载

注意：卸载后，您的配置（包括API Key）会被清除。

---

安装完成！开始享受无障碍的英文阅读体验吧 🎉
