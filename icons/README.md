# 图标说明

本项目需要以下尺寸的PNG图标：
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

## 生成图标

已提供SVG源文件 `icon.svg`，您可以使用以下方法生成PNG图标：

### 方法1: 使用在线工具
访问 https://svgtopng.com/ 或类似工具，上传 `icon.svg` 并导出为所需尺寸。

### 方法2: 使用ImageMagick
```bash
# 安装ImageMagick (macOS)
brew install imagemagick

# 转换为不同尺寸
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

### 方法3: 使用Inkscape
```bash
# 安装Inkscape (macOS)
brew install --cask inkscape

# 转换
inkscape icon.svg -w 16 -h 16 -o icon16.png
inkscape icon.svg -w 48 -h 48 -o icon48.png
inkscape icon.svg -w 128 -h 128 -o icon128.png
```

## 临时方案

如果暂时没有工具生成PNG，您可以：
1. 暂时使用任何16x16、48x48、128x128的PNG图片作为占位符
2. 或者简单地复制icon.svg为icon16.png、icon48.png、icon128.png（某些浏览器支持SVG作为图标）

