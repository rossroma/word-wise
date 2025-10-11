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

### 配置API Key（必需）

首次使用前必须配置API Key：

1. **打开设置页面**
   - 点击浏览器右上角的智译图标
   - 在弹出菜单中点击"设置"按钮
   - 或直接右键点击图标，选择"选项"

2. **输入API Key**
   - 在"API配置"部分找到"API Key"输入框
   - 输入您的OpenAI API Key
   - API Key格式通常为：`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

3. **获取API Key**
   - OpenAI官方：访问 https://platform.openai.com/api-keys
   - 登录您的OpenAI账号
   - 点击"Create new secret key"创建新密钥
   - 复制密钥并妥善保存（只显示一次）

4. **保存配置**
   - 点击页面底部的"保存设置"按钮
   - 看到"设置已保存！"提示即表示成功

### 可选配置

#### 模型名称

如果您想使用特定的AI模型，可以在"模型名称"中填写：
- `gpt-3.5-turbo` （默认，速度快，成本低）
- `gpt-4` （更准确，成本较高）
- `gpt-4-turbo` （平衡速度和准确性）

留空则使用默认的 `gpt-3.5-turbo`。

#### API基地址

如果您使用代理服务或第三方API服务，可以修改此项：
- 默认：`https://api.openai.com/v1`
- 代理示例：`https://your-proxy.com/v1`

#### 难度等级

调整"疑难词汇难度等级"（1-9）：
- **1-3级**：仅翻译最难的专业词汇（推荐高级学习者）
- **4-6级**：平衡模式，适合大多数用户（推荐）
- **7-9级**：翻译更多中等难度词汇（推荐初学者）

#### 目标语言

选择翻译的目标语言：
- 简体中文（默认）
- 繁體中文
- 日本語
- 한국어

## 🚀 开始使用

配置完成后：

1. 访问任意英文网页（如Wikipedia、Medium、ArXiv等）
2. 插件会自动检测语言并在右上角显示提示
3. 点击提示框中的"开启"按钮激活翻译
4. 页面中的疑难词汇会自动标注中文翻译

## 🔍 故障排查

### 问题：插件无法加载

**解决方案：**
- 确保选择的是包含 `manifest.json` 的正确文件夹
- 检查是否开启了"开发者模式"
- 查看是否有错误提示，根据提示修复

### 问题：翻译不工作

**解决方案：**
1. 检查是否已配置API Key
2. 验证API Key是否有效（在OpenAI控制台检查）
3. 确认账户有足够的API使用额度
4. 检查网络连接是否正常
5. 在浏览器控制台（F12）查看是否有错误信息

### 问题：某些网站不工作

**解决方案：**
- 检查该网站是否在黑名单中
- 尝试刷新页面
- 手动点击插件图标开启翻译
- 某些特殊网站（如Chrome Web Store）由于安全限制无法使用插件

### 问题：翻译速度慢

**解决方案：**
- 降低难度等级，减少需要翻译的词汇数量
- 使用 `gpt-3.5-turbo` 模型（比GPT-4更快）
- 检查网络连接速度
- 已翻译的词汇会被缓存，重复访问时会更快

### 问题：API费用过高

**解决方案：**
- 降低难度等级（1-3级）
- 使用白名单，仅在特定网站开启
- 使用 `gpt-3.5-turbo` 而非 `gpt-4`
- 插件会缓存翻译结果，避免重复调用

## 📧 技术支持

如果遇到其他问题：

1. 查看 [常见问题FAQ](FAQ.md)
2. 提交 [GitHub Issue](https://github.com/your-username/wdc-extension/issues)
3. 发送邮件至：your-email@example.com

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

