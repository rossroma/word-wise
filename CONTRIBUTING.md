# 贡献指南

感谢您对"智译"项目的关注！我们欢迎任何形式的贡献。

## 🤝 如何贡献

### 报告问题 (Issues)

如果您发现了bug或有功能建议：

1. 在[Issues页面](https://github.com/your-username/wdc-extension/issues)搜索是否已有相关问题
2. 如果没有，创建一个新Issue
3. 清晰描述问题或建议，包括：
   - 详细的问题描述
   - 重现步骤（对于bug）
   - 期望的行为
   - 实际的行为
   - 截图（如适用）
   - 浏览器版本和操作系统信息

### 提交代码 (Pull Requests)

#### 准备工作

1. **Fork项目**
   ```bash
   # 在GitHub上点击Fork按钮
   ```

2. **克隆到本地**
   ```bash
   git clone https://github.com/your-username/wdc-extension.git
   cd wdc-extension
   ```

3. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

#### 开发规范

1. **代码风格**
   - 使用2空格缩进
   - 遵循JavaScript Standard Style
   - 使用有意义的变量和函数名
   - 添加必要的注释

2. **提交规范**
   使用语义化的commit message：
   ```
   类型: 简短描述

   详细描述（可选）

   类型包括：
   - feat: 新功能
   - fix: 修复bug
   - docs: 文档更新
   - style: 代码格式调整
   - refactor: 重构
   - test: 测试相关
   - chore: 构建/工具相关
   ```

   示例：
   ```bash
   git commit -m "feat: 添加深色模式支持"
   git commit -m "fix: 修复翻译缓存失效问题"
   git commit -m "docs: 更新安装指南"
   ```

3. **代码质量**
   ```bash
   # 运行代码检查（如果配置了）
   npm run lint
   
   # 格式化代码
   npm run format
   ```

#### 提交PR

1. **推送分支**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **创建Pull Request**
   - 在GitHub上打开您的Fork
   - 点击"New Pull Request"
   - 填写PR标题和描述
   - 关联相关的Issue（如果有）
   - 等待review

3. **PR描述模板**
   ```markdown
   ## 改动说明
   简要描述这个PR做了什么

   ## 改动类型
   - [ ] 新功能
   - [ ] Bug修复
   - [ ] 文档更新
   - [ ] 代码重构
   - [ ] 其他

   ## 相关Issue
   Closes #123

   ## 测试情况
   - [ ] 已在Chrome上测试
   - [ ] 已在不同网站测试
   - [ ] 已测试边界情况

   ## 截图（如适用）
   添加截图展示变更
   ```

## 📋 开发指南

### 项目结构

```
wdc-extension/
├── manifest.json          # 扩展配置
├── background.js          # 后台服务
├── content.js            # 内容脚本
├── content.css           # 内容样式
├── wdc-analyzer.js       # 词汇分析器
├── popup.html/css/js     # 弹出菜单
├── options.html/css/js   # 设置页面
└── icons/                # 图标资源
```

### 本地开发

1. **加载扩展**
   - 打开 `chrome://extensions/`
   - 开启"开发者模式"
   - 加载解压的扩展程序
   - 选择项目文件夹

2. **调试技巧**
   - **Background**: 在扩展管理页面点击"Service Worker"
   - **Content Script**: 在网页上按F12打开控制台
   - **Popup**: 右键点击图标→"检查弹出内容"
   - **Options**: 右键点击选项页面→"检查"

3. **热重载**
   修改代码后：
   - 在 `chrome://extensions/` 点击刷新图标
   - 或使用快捷键 `Ctrl+R`（Windows）/ `Cmd+R`（Mac）

### 关键功能开发

#### 添加新的翻译引擎

1. 在 `background.js` 中添加新的API处理函数
2. 更新 `options.html` 添加新的配置选项
3. 修改 `translateWord` 函数支持多引擎

#### 改进WDC算法

1. 编辑 `wdc-analyzer.js`
2. 调整 `isDifficultWord` 或 `calculateComplexity` 函数
3. 测试不同难度等级的效果

#### 优化翻译展示

1. 修改 `content.css` 调整样式
2. 更新 `injectTranslations` 函数改变注入逻辑
3. 确保不影响原网页布局

## 🧪 测试

### 手动测试清单

在提交PR前，请确保：

- [ ] 在多个英文网站测试（Wikipedia, Medium, ArXiv等）
- [ ] 测试不同难度等级（1、5、9）
- [ ] 测试设置保存和加载
- [ ] 测试白名单/黑名单功能
- [ ] 测试API错误处理
- [ ] 检查控制台无报错
- [ ] 验证不影响页面性能

### 测试网站推荐

- **新闻**: https://www.bbc.com/news
- **技术**: https://techcrunch.com
- **学术**: https://arxiv.org
- **百科**: https://en.wikipedia.org
- **博客**: https://medium.com

## 📚 需要帮助的领域

我们特别欢迎以下方面的贡献：

### 优先级高
- [ ] 性能优化（减少DOM操作）
- [ ] 支持更多AI模型（Claude, Gemini）
- [ ] 短语和习语识别
- [ ] 单元测试和集成测试

### 优先级中
- [ ] Firefox和Edge适配
- [ ] 深色模式完善
- [ ] 本地化（i18n）
- [ ] 键盘快捷键

### 优先级低
- [ ] 语音朗读功能
- [ ] 单词收藏和导出
- [ ] 统计和分析功能
- [ ] 自定义主题

## 💡 功能建议

有好的想法？请：
1. 先在[Discussions](https://github.com/your-username/wdc-extension/discussions)讨论
2. 获得认可后再开始开发
3. 避免重复工作

## 📜 许可协议

提交代码即表示您同意：
- 您的贡献将采用MIT许可协议
- 您拥有代码的版权或有权贡献
- 您的贡献可被自由使用和修改

## 🙏 致谢

感谢所有贡献者！

您的名字将出现在：
- [贡献者列表](CONTRIBUTORS.md)
- 扩展的"关于"页面
- 版本发布说明

## 📧 联系方式

有问题？联系我们：
- Email: your-email@example.com
- GitHub Discussions: [讨论区](https://github.com/your-username/wdc-extension/discussions)
- Issue Tracker: [问题追踪](https://github.com/your-username/wdc-extension/issues)

---

再次感谢您的贡献！🎉

