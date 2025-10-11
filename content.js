// Content Script - 注入到网页中的脚本

let isActivated = false;
let config = null;

// ========== 性能监控工具 ==========
class PerformanceLogger {
  constructor() {
    this.logs = new Map(); // 存储所有日志
    this.timers = new Map(); // 存储计时器
    this.enabled = true; // 是否启用日志
  }

  // 开始计时
  start(name, category = 'default') {
    if (!this.enabled) return;
    
    const key = `${category}:${name}`;
    this.timers.set(key, {
      name,
      category,
      startTime: performance.now(),
      startTimestamp: new Date().toISOString()
    });
  }

  // 结束计时
  end(name, category = 'default', extraData = {}) {
    if (!this.enabled) return;
    
    const key = `${category}:${name}`;
    const timer = this.timers.get(key);
    
    if (!timer) {
      console.warn(`未找到计时器: ${key}`);
      return;
    }
    
    const endTime = performance.now();
    const duration = endTime - timer.startTime;
    
    // 保存日志
    if (!this.logs.has(category)) {
      this.logs.set(category, []);
    }
    
    this.logs.get(category).push({
      name: timer.name,
      duration: duration.toFixed(2),
      startTime: timer.startTimestamp,
      ...extraData
    });
    
    // 清除计时器
    this.timers.delete(key);
    
    // 实时输出（可选）
    if (duration > 100) { // 只显示耗时超过100ms的操作
      console.log(`⏱️ [${category}] ${name}: ${duration.toFixed(2)}ms`, extraData);
    }
  }

  // 输出统计报告
  report(category = null) {
    if (!this.enabled) return;
    
    console.group('📊 性能统计报告');
    
    const categories = category ? [category] : Array.from(this.logs.keys());
    
    categories.forEach(cat => {
      const logs = this.logs.get(cat);
      if (!logs || logs.length === 0) return;
      
      console.group(`📁 ${cat}`);
      console.table(logs);
      
      // 计算统计信息
      const durations = logs.map(log => parseFloat(log.duration));
      const total = durations.reduce((a, b) => a + b, 0);
      const avg = total / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      
      console.log(`总计: ${total.toFixed(2)}ms | 平均: ${avg.toFixed(2)}ms | 最大: ${max.toFixed(2)}ms | 最小: ${min.toFixed(2)}ms`);
      console.groupEnd();
    });
    
    console.groupEnd();
  }

  // 清除日志
  clear() {
    this.logs.clear();
    this.timers.clear();
  }

  // 获取统计数据
  getStats(category = null) {
    const categories = category ? [category] : Array.from(this.logs.keys());
    const stats = {};
    
    categories.forEach(cat => {
      const logs = this.logs.get(cat);
      if (!logs || logs.length === 0) return;
      
      const durations = logs.map(log => parseFloat(log.duration));
      const total = durations.reduce((a, b) => a + b, 0);
      
      stats[cat] = {
        count: logs.length,
        total: total.toFixed(2),
        average: (total / durations.length).toFixed(2),
        max: Math.max(...durations).toFixed(2),
        min: Math.min(...durations).toFixed(2)
      };
    });
    
    return stats;
  }
}

// 创建全局性能日志实例
const perfLogger = new PerformanceLogger();

// 在控制台暴露性能报告功能，方便调试
window.zhiyiPerf = {
  report: () => perfLogger.report(),
  clear: () => perfLogger.clear(),
  stats: () => perfLogger.getStats(),
  enable: () => perfLogger.enabled = true,
  disable: () => perfLogger.enabled = false
};

// 在控制台暴露调试功能
window.zhiyiDebug = {
  // 检查页面中包含某个词的所有元素
  findWord: (word) => {
    const results = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (new RegExp(word, 'i').test(node.textContent)) {
        results.push({
          text: node.textContent.substring(0, 100),
          parent: node.parentElement,
          parentTag: node.parentElement?.tagName,
          parentClass: node.parentElement?.className,
          html: node.parentElement?.innerHTML.substring(0, 200)
        });
      }
    }
    
    console.log(`找到 ${results.length} 个包含 "${word}" 的节点:`);
    console.table(results);
    return results;
  },
  
  // 统计翻译相关的元素
  countElements: () => {
    const stats = {
      'zhiyi-translated': document.querySelectorAll('.zhiyi-translated').length,
      'zhiyi-word': document.querySelectorAll('.zhiyi-word').length,
      'zhiyi-translation': document.querySelectorAll('.zhiyi-translation').length
    };
    console.log('翻译元素统计:', stats);
    return stats;
  },
  
  // 检查是否有重复翻译
  checkDuplicates: () => {
    const elements = document.querySelectorAll('.zhiyi-translation');
    const duplicates = [];
    
    elements.forEach(el => {
      const text = el.textContent;
      // 检查是否出现多次相同的翻译括号
      const matches = text.match(/（[^）]+）/g);
      if (matches && matches.length > 1) {
        duplicates.push({
          element: el,
          text: el.parentElement?.textContent.substring(0, 100),
          translations: matches
        });
      }
    });
    
    console.log(`发现 ${duplicates.length} 个可能的重复翻译:`);
    console.table(duplicates);
    return duplicates;
  }
};

console.log('🔍 调试工具已加载，使用 window.zhiyiDebug 访问:');
console.log('  - zhiyiDebug.findWord("exceptions") - 查找包含某词的所有节点');
console.log('  - zhiyiDebug.countElements() - 统计翻译元素数量');
console.log('  - zhiyiDebug.checkDuplicates() - 检查重复翻译');
// ========================================

// 安全地发送消息，带重试机制
async function sendMessageSafely(message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      // 检查 runtime 是否可用
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalidated');
      }
      
      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      console.warn(`消息发送失败 (尝试 ${i + 1}/${retries}):`, error.message);
      
      // 如果是最后一次尝试，抛出错误
      if (i === retries - 1) {
        throw error;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
    }
  }
}

// 初始化
(async function init() {
  perfLogger.start('初始化', '系统启动');
  
  try {
  // 检查是否已激活
    perfLogger.start('检查激活状态', '系统启动');
    const response = await sendMessageSafely({ action: 'checkActivation' });
    isActivated = response?.activated || false;
    perfLogger.end('检查激活状态', '系统启动');
  
  // 获取配置
    perfLogger.start('获取配置', '系统启动');
    const configResponse = await sendMessageSafely({ action: 'getConfig' });
    config = configResponse?.config || {};
    perfLogger.end('获取配置', '系统启动');
  
  // 检测页面语言
    perfLogger.start('检测页面语言', '系统启动');
    const isEnglish = detectEnglishPage();
    perfLogger.end('检测页面语言', '系统启动', { isEnglish });
    
    if (isEnglish) {
    // 通知background script
      await sendMessageSafely({
      action: 'detectLanguage',
      data: { isEnglish: true }
      }).catch(err => console.warn('语言检测通知失败:', err));
    
    // 如果已激活，则自动开始翻译
    if (isActivated) {
      startTranslation();
    } else {
      // 显示激活提示
      showActivationPrompt();
    }
  }
    
    perfLogger.end('初始化', '系统启动', { isActivated, isEnglish });
    
    // 输出初始化性能报告
    if (isActivated) {
      setTimeout(() => perfLogger.report('系统启动'), 1000);
    }
  } catch (error) {
    console.error('初始化失败:', error);
    perfLogger.end('初始化', '系统启动', { error: error.message });
    // 即使初始化失败，也不影响页面正常显示
  }
})();

// 检测是否为英文页面
function detectEnglishPage() {
  // 方法1: 检查lang属性
  const htmlLang = document.documentElement.lang?.toLowerCase();
  if (htmlLang && !htmlLang.startsWith('en')) {
    return false;
  }
  
  // 方法2: 分析首屏段落内容
  const paragraphs = document.querySelectorAll('p');
  let sampleText = '';
  
  for (let i = 0; i < Math.min(5, paragraphs.length); i++) {
    sampleText += paragraphs[i].textContent + ' ';
    if (sampleText.length > 500) break;
  }
  
  if (!sampleText) return false;
  
  // 计算英文字母占比
  const englishLetters = sampleText.match(/[a-zA-Z]/g) || [];
  const totalChars = sampleText.replace(/\s/g, '').length;
  
  if (totalChars === 0) return false;
  
  const englishRatio = englishLetters.length / totalChars;
  
  // 如果英文字母占比超过70%，认为是英文页面
  return englishRatio > 0.7;
}

// 显示激活提示
function showActivationPrompt() {
  // 避免重复显示
  if (document.getElementById('zhiyi-prompt')) return;
  
  const prompt = document.createElement('div');
  prompt.id = 'zhiyi-prompt';
  prompt.className = 'zhiyi-activation-prompt';
  prompt.innerHTML = `
    <div class="zhiyi-prompt-content">
      <div class="zhiyi-prompt-text">检测到英文页面，是否开启疑难词翻译？</div>
      <div class="zhiyi-prompt-buttons">
        <button id="zhiyi-activate-yes" class="zhiyi-btn zhiyi-btn-primary">开启</button>
        <button id="zhiyi-activate-no" class="zhiyi-btn zhiyi-btn-secondary">暂不</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(prompt);
  
  // 绑定事件
  document.getElementById('zhiyi-activate-yes').addEventListener('click', async () => {
    isActivated = true;
    prompt.remove();
    
    // 通知 background script 更新激活状态
    try {
      await sendMessageSafely({ 
        action: 'setActivation', 
        activated: true 
      });
    } catch (error) {
      console.warn('设置激活状态失败:', error);
    }
    
    startTranslation();
  });
  
  document.getElementById('zhiyi-activate-no').addEventListener('click', () => {
    prompt.remove();
  });
  
  // 5秒后自动消失
  setTimeout(() => {
    if (prompt.parentNode) {
      prompt.remove();
    }
  }, 5000);
}

// 开始翻译流程
async function startTranslation() {
  console.log('🔍 [调试] ========== startTranslation 被调用 ==========');
  console.log('🔍 [调试] 调用栈:', new Error().stack);
  
  perfLogger.start('翻译流程', '翻译处理');
  
  try {
    // 1. 提取主体内容
    perfLogger.start('提取主体内容', '翻译处理');
    const mainContent = extractMainContent();
    perfLogger.end('提取主体内容', '翻译处理', { 内容长度: mainContent?.length || 0 });
    
    if (!mainContent) {
      console.warn('未找到主体内容区域');
      perfLogger.end('翻译流程', '翻译处理', { 错误: '未找到内容' });
      return;
    }
    
    // 2. 使用 wdc-translator 识别疑难词汇
    perfLogger.start('检查依赖', '翻译处理');
    const difficultyLevel = config?.difficultyLevel || 5;
    const minLength = 4; // 最小单词长度
    
    // 检查依赖是否加载
    if (typeof nlp === 'undefined') {
      throw new Error('compromise (nlp) 库未加载');
    }
    if (typeof wdcTranslator === 'undefined' || typeof wdcTranslator.extractWords === 'undefined') {
      throw new Error('wdc-translator 库未正确加载');
    }
    perfLogger.end('检查依赖', '翻译处理');
    
    // 分块处理文本以优化性能
    perfLogger.start('提取疑难词汇', '翻译处理');
    
    // 将文本分成较小的块（每块约2000字符）
    const chunkSize = 2000;
    
    perfLogger.start('文本分块', '翻译处理');
    const chunks = splitTextIntoChunks(mainContent, chunkSize);
    perfLogger.end('文本分块', '翻译处理', { 
      文本块数: chunks.length,
      原始长度: mainContent.length,
      平均块大小: Math.round(mainContent.length / chunks.length)
    });
    
    console.log(`文本已分成 ${chunks.length} 个块进行处理`);
    
    const allDifficultWords = new Set(); // 使用Set去重
    let processedChunks = 0;
    let totalProcessingTime = 0;
    
    perfLogger.start('分块词汇提取', '翻译处理');
    
    for (const chunk of chunks) {
      try {
        const chunkStartTime = performance.now();
        
        const words = wdcTranslator.extractWords(chunk, {
          difficulty: difficultyLevel,
          minLength: minLength
        });
        
        const chunkEndTime = performance.now();
        const chunkDuration = chunkEndTime - chunkStartTime;
        totalProcessingTime += chunkDuration;
        
        words.forEach(word => allDifficultWords.add(word));
        processedChunks++;
        
        // 每处理5个块输出一次进度
        if (processedChunks % 5 === 0) {
          console.log(`已处理 ${processedChunks}/${chunks.length} 个块，发现 ${allDifficultWords.size} 个疑难词汇`);
          console.log(`平均处理速度: ${(totalProcessingTime / processedChunks).toFixed(2)}ms/块`);
        }
      } catch (error) {
        console.warn(`处理第 ${processedChunks + 1} 个文本块时出错:`, error);
      }
    }
    
    perfLogger.end('分块词汇提取', '翻译处理', {
      处理块数: processedChunks,
      总耗时: totalProcessingTime.toFixed(2) + 'ms',
      平均耗时: (totalProcessingTime / processedChunks).toFixed(2) + 'ms/块'
    });
    
    const difficultWords = Array.from(allDifficultWords);
    perfLogger.end('提取疑难词汇', '翻译处理', { 
      词汇数: difficultWords.length,
      文本块数: chunks.length,
      平均块大小: Math.round(mainContent.length / chunks.length),
      处理速度: (mainContent.length / totalProcessingTime * 1000).toFixed(0) + '字符/秒'
    });
    
    console.log(`使用 wdc-translator 提取完成，共发现 ${difficultWords.length} 个不重复的疑难词汇`);
    
    if (difficultWords.length === 0) {
      console.log('未发现疑难词汇');
      perfLogger.end('翻译流程', '翻译处理', { 词汇数: 0 });
      return;
    }
    
    console.log(`发现 ${difficultWords.length} 个疑难词汇`);
    
    // 3. 调用background script进行翻译
    perfLogger.start('翻译API调用', '翻译处理');
    const response = await sendMessageSafely({
      action: 'translate',
      words: difficultWords
    });
    perfLogger.end('翻译API调用', '翻译处理', { 
      词汇数: difficultWords.length,
      成功: response?.success 
    });
    
    if (response?.success) {
      // 4. 注入翻译结果到DOM
      perfLogger.start('注入翻译', '翻译处理');
      injectTranslations(response.translations);
      perfLogger.end('注入翻译', '翻译处理');
    } else {
      const errorMsg = response?.error || '翻译请求失败';
      console.error('翻译失败:', errorMsg);
      showError(errorMsg);
    }
    
    perfLogger.end('翻译流程', '翻译处理');
    
    // 输出性能报告
    setTimeout(() => perfLogger.report(), 500);
    
  } catch (error) {
    console.error('翻译流程出错:', error);
    perfLogger.end('翻译流程', '翻译处理', { error: error.message });
    showError(error.message);
  }
}

// 提取主体内容区域
function extractMainContent() {
  // 尝试多种策略提取主体内容
  
  // 策略1: 寻找main、article标签
  let contentElement = document.querySelector('main, article, [role="main"]');
  
  // 策略2: 寻找id或class包含content、post、entry的元素
  if (!contentElement) {
    contentElement = document.querySelector(
      '#content, #main, #post, .content, .post, .entry, .article-body, .post-content'
    );
  }
  
  // 策略3: 使用整个body（过滤掉header、footer、nav、aside）
  if (!contentElement) {
    contentElement = document.body;
  }
  
  // 提取文本，过滤掉不需要的元素
  const textNodes = getTextNodes(contentElement);
  let text = textNodes.map(node => node.textContent).join(' ');
  
  return text;
}

// 将文本分割成较小的块
function splitTextIntoChunks(text, chunkSize = 2000) {
  const chunks = [];
  
  // 按句子分割（以句号、问号、感叹号为边界）
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // 如果当前块加上新句子不超过限制，则添加
    if (currentChunk.length + sentence.length <= chunkSize) {
      currentChunk += sentence;
    } else {
      // 保存当前块
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      
      // 如果单个句子超过块大小，需要强制分割
      if (sentence.length > chunkSize) {
        // 按单词分割长句子
        const words = sentence.split(/\s+/);
        let tempChunk = '';
        
        for (const word of words) {
          if (tempChunk.length + word.length + 1 <= chunkSize) {
            tempChunk += (tempChunk ? ' ' : '') + word;
          } else {
            if (tempChunk) {
              chunks.push(tempChunk.trim());
            }
            tempChunk = word;
          }
        }
        
        currentChunk = tempChunk;
      } else {
        // 开始新块
        currentChunk = sentence;
      }
    }
  }
  
  // 添加最后一个块
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

// 获取所有文本节点（排除script、style等）
function getTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // 排除script、style、code、pre等标签内的文本
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'code', 'pre'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // 排除空白文本
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  return textNodes;
}

// 注入翻译结果到DOM
function injectTranslations(translations) {
  console.log('🔍 [调试] 开始注入翻译，翻译词汇:', Object.keys(translations));
  perfLogger.start('DOM遍历', 'DOM操作');
  
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'code', 'pre'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // 跳过已经处理过的节点
        if (parent.classList.contains('zhiyi-translated')) {
          console.log('🔍 [调试] 跳过已翻译节点:', parent.className);
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  const nodesToProcess = [];
  let node;
  while (node = walker.nextNode()) {
    nodesToProcess.push(node);
  }
  
  perfLogger.end('DOM遍历', 'DOM操作', { 节点数: nodesToProcess.length });
  
  // 处理每个文本节点
  perfLogger.start('替换文本节点', 'DOM操作');
  let replacedCount = 0;
  let matchCount = 0;
  
  nodesToProcess.forEach((textNode, nodeIndex) => {
    let text = textNode.textContent;
    
    // 特别关注包含 "exceptions" 的节点
    const containsExceptions = /exceptions/i.test(text);
    if (containsExceptions) {
      console.log(`🔍 [调试-${nodeIndex}] 发现包含 "exceptions" 的节点:`);
      console.log(`  原始文本: "${text.substring(0, 200)}..."`);
      console.log(`  父元素: ${textNode.parentElement?.tagName}.${textNode.parentElement?.className}`);
    }
    
    let hasTranslation = false;
    
    // 创建新的HTML内容
    let newHTML = text;
    
    // 为每个疑难词汇添加翻译
    Object.keys(translations).forEach(word => {
      const translation = translations[word];
      // 使用正则匹配整个单词（不区分大小写）
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      
      // 先测试是否匹配
      const hasMatch = regex.test(newHTML);
      
      if (hasMatch) {
        // 重新创建正则（因为test()会改变lastIndex）
        const replaceRegex = new RegExp(`\\b(${word})\\b`, 'gi');
        const beforeReplace = newHTML;
        
        newHTML = newHTML.replace(replaceRegex, (match) => {
          hasTranslation = true;
          matchCount++;
          
          if (word.toLowerCase() === 'exceptions') {
            console.log(`🔍 [调试-${nodeIndex}] 正在替换 "exceptions":`);
            console.log(`  匹配到: "${match}"`);
            console.log(`  翻译为: "${translation}"`);
            console.log(`  替换前片段: "${beforeReplace.substring(Math.max(0, beforeReplace.indexOf(match) - 20), beforeReplace.indexOf(match) + match.length + 20)}"`);
          }
          
          return `<span class="zhiyi-word">${match}<span class="zhiyi-translation">（${translation}）</span></span>`;
        });
        
        if (word.toLowerCase() === 'exceptions') {
          console.log(`🔍 [调试-${nodeIndex}] 替换后片段: "${newHTML.substring(0, 300)}..."`);
        }
      }
    });
    
    // 如果有翻译，则替换节点
    if (hasTranslation) {
      const parent = textNode.parentElement;
      const wrapper = document.createElement('span');
      wrapper.className = 'zhiyi-translated';
      wrapper.innerHTML = newHTML;
      
      if (containsExceptions) {
        console.log(`🔍 [调试-${nodeIndex}] 即将替换包含 "exceptions" 的节点`);
        console.log(`  最终HTML: "${wrapper.innerHTML.substring(0, 300)}..."`);
      }
      
      parent.replaceChild(wrapper, textNode);
      replacedCount++;
      
      if (containsExceptions) {
        console.log(`🔍 [调试-${nodeIndex}] 已完成替换，父元素现在的className: "${parent.className}"`);
        console.log(`🔍 [调试-${nodeIndex}] 替换后的wrapper内容: "${wrapper.innerHTML.substring(0, 300)}..."`);
      }
    }
  });
  
  perfLogger.end('替换文本节点', 'DOM操作', {
    处理节点数: nodesToProcess.length,
    替换节点数: replacedCount,
    匹配次数: matchCount
  });
  
  console.log('🔍 [调试] 翻译注入完成，共处理', nodesToProcess.length, '个节点，替换', replacedCount, '个节点');
  console.log('🔍 [调试] 最终页面中包含 zhiyi-translated 的元素数量:', document.querySelectorAll('.zhiyi-translated').length);
  console.log('🔍 [调试] 最终页面中包含 zhiyi-word 的元素数量:', document.querySelectorAll('.zhiyi-word').length);
}


// 显示错误提示
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'zhiyi-error-toast';
  errorDiv.textContent = `智译错误: ${message}`;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔍 [调试] 收到消息:', request);
  
  if (request.action === 'toggleTranslation') {
    console.log('🔍 [调试] toggleTranslation 消息，enabled:', request.enabled);
    isActivated = request.enabled;
    
    if (isActivated) {
      console.log('🔍 [调试] 准备启动翻译...');
      startTranslation();
    } else {
      console.log('🔍 [调试] 移除所有翻译...');
      // 移除所有翻译
      const elementsToRemove = document.querySelectorAll('.zhiyi-translated, .zhiyi-word');
      console.log('🔍 [调试] 找到', elementsToRemove.length, '个需要移除的元素');
      elementsToRemove.forEach(el => {
        el.replaceWith(el.textContent);
      });
    }
    
    sendResponse({ success: true });
  }
});

