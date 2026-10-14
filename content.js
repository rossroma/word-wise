// Content Script - 注入到网页中的脚本

let isActivated = false;
let config = null;
let debugEnabled = false;
const debugLog = (...args) => { if (debugEnabled) console.log(...args); };
const debugWarn = (...args) => { if (debugEnabled) console.warn(...args); };
const debugTable = (...args) => { if (debugEnabled) console.table(...args); };
const debugGroup = (...args) => { if (debugEnabled) console.group(...args); };
const debugGroupEnd = () => { if (debugEnabled) console.groupEnd(); };

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.config) {
    config = changes.config.newValue || {};
    debugEnabled = !!config.debugLogging;
    perfLogger.enabled = debugEnabled;
    if (!debugEnabled) perfLogger.clear();
  }
});

// ========== 性能监控工具 ==========
class PerformanceLogger {
  constructor() {
    this.logs = new Map(); // 存储所有日志
    this.timers = new Map(); // 存储计时器
    this.enabled = false; // 由设置页的调试开关控制
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
    
    if (!timer) return;
    
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
      debugLog(`⏱️ [${category}] ${name}: ${duration.toFixed(2)}ms`, extraData);
    }
  }

  // 输出统计报告
  report(category = null) {
    if (!this.enabled) return;
    
    debugGroup('📊 性能统计报告');
    
    const categories = category ? [category] : Array.from(this.logs.keys());
    
    categories.forEach(cat => {
      const logs = this.logs.get(cat);
      if (!logs || logs.length === 0) return;
      
      debugGroup(`📁 ${cat}`);
      debugTable(logs);
      
      // 计算统计信息
      const durations = logs.map(log => parseFloat(log.duration));
      const total = durations.reduce((a, b) => a + b, 0);
      const avg = total / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      
      debugLog(`总计: ${total.toFixed(2)}ms | 平均: ${avg.toFixed(2)}ms | 最大: ${max.toFixed(2)}ms | 最小: ${min.toFixed(2)}ms`);
      debugGroupEnd();
    });
    
    debugGroupEnd();
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

// 翻译引擎友好名称(与 background 的 provider 对应)
window.zhiyiProviderName = (provider) => ({
  chrome: 'Chrome 内置离线翻译（免费）',
  deepl: 'DeepL（云端）',
  openai: 'LLM（OpenAI 兼容）'
}[provider] || provider || '未知');

// 在控制台暴露性能报告功能，方便调试
window.zhiyiPerf = {
  report: () => perfLogger.report(),
  clear: () => perfLogger.clear(),
  stats: () => perfLogger.getStats()
};

// 在控制台暴露调试功能
window.zhiyiDebug = {
  // 最近一次翻译使用的引擎（页面加载后由 startTranslation 写入）
  lastProvider: null,
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
    
    debugLog(`找到 ${results.length} 个包含 "${word}" 的节点:`);
    debugTable(results);
    return results;
  },
  
  // 统计翻译相关的元素
  countElements: () => {
    const stats = {
      'zhiyi-word': document.querySelectorAll('.zhiyi-word').length,
      'zhiyi-translation': document.querySelectorAll('.zhiyi-translation').length
    };
    debugLog('翻译元素统计:', stats);
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
    
    debugLog(`发现 ${duplicates.length} 个可能的重复翻译:`);
    debugTable(duplicates);
    return duplicates;
  }
};

debugLog('🔍 调试工具已加载，使用 window.zhiyiDebug 访问:');
debugLog('  - zhiyiDebug.findWord("exceptions") - 查找包含某词的所有节点');
debugLog('  - zhiyiDebug.countElements() - 统计翻译元素数量');
debugLog('  - zhiyiDebug.checkDuplicates() - 检查重复翻译');
// ========================================

// 安全地发送消息，带重试机制
async function sendMessageSafely(message, retries = 3, timeoutMs = 60000) {
  for (let i = 0; i < retries; i++) {
    try {
      // 检查 runtime 是否可用
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalidated');
      }

      // 超时保护:避免后台无响应时永久挂起
      const response = await Promise.race([
        chrome.runtime.sendMessage(message),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`请求超时(${timeoutMs}ms),后台无响应`)), timeoutMs)),
      ]);
      return response;
    } catch (error) {
      debugWarn(`消息发送失败 (尝试 ${i + 1}/${retries}):`, error.message);
      
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
    debugEnabled = !!config.debugLogging;
    perfLogger.enabled = debugEnabled;
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
      }).catch(err => debugWarn('语言检测通知失败:', err));
    
    // autoTranslate 开启,或本标签页此前已激活 → 直接翻译;否则显示小图标
    if (config?.autoTranslate || isActivated) {
      if (!isActivated) {
        isActivated = true;
        sendMessageSafely({ action: 'setActivation', activated: true }).catch(err => debugWarn('设置激活状态失败:', err));
      }
      startTranslation();
    } else {
      // 显示小巧的激活图标
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

// 显示小巧的激活图标(点击即开始翻译)
function showActivationPrompt() {
  // 避免重复显示
  if (document.getElementById('zhiyi-activation-icon')) return;

  const icon = document.createElement('button');
  icon.id = 'zhiyi-activation-icon';
  icon.className = 'zhiyi-activation-icon';
  icon.type = 'button';
  icon.title = '点击翻译本页 · 上下拖动调整位置';
  icon.setAttribute('aria-label', '翻译本页疑难词，可上下拖动调整位置');
  icon.textContent = '译';

  const positionKey = 'zhiyi_activation_position';
  const edgeGap = 8;
  const defaultTop = () => Math.max(edgeGap, (window.innerHeight - icon.offsetHeight) / 2);
  const clampTop = top => Math.max(edgeGap, Math.min(top, Math.max(edgeGap, window.innerHeight - icon.offsetHeight - edgeGap)));
  const positionIcon = top => { icon.style.top = `${clampTop(top)}px`; };
  const savePosition = () => {
    const available = window.innerHeight - icon.offsetHeight - edgeGap * 2;
    const fraction = available > 0 ? (icon.getBoundingClientRect().top - edgeGap) / available : 0.5;
    chrome.storage.local.set({ [positionKey]: Math.max(0, Math.min(1, fraction)) });
  };
  const restorePosition = fraction => {
    if (typeof fraction !== 'number' || !Number.isFinite(fraction)) return;
    positionIcon(edgeGap + fraction * Math.max(0, window.innerHeight - icon.offsetHeight - edgeGap * 2));
  };
  let activePointer = null;
  let suppressClick = false;
  let positionChanged = false;

  icon.addEventListener('pointerdown', event => {
    if (event.button !== 0 || activePointer) return;
    suppressClick = false;
    activePointer = { id: event.pointerId, startY: event.clientY, startTop: icon.getBoundingClientRect().top, moved: false };
    icon.setPointerCapture(event.pointerId);
  });
  icon.addEventListener('pointermove', event => {
    if (!activePointer || event.pointerId !== activePointer.id) return;
    const distance = event.clientY - activePointer.startY;
    if (!activePointer.moved && Math.abs(distance) < 5) return;
    activePointer.moved = true;
    positionChanged = true;
    icon.classList.add('zhiyi-dragging');
    positionIcon(activePointer.startTop + distance);
  });
  const finishDrag = event => {
    if (!activePointer || event.pointerId !== activePointer.id) return;
    if (activePointer.moved) {
      suppressClick = event.type === 'pointerup';
      if (event.type === 'pointerup') savePosition();
    }
    icon.classList.remove('zhiyi-dragging');
    activePointer = null;
  };
  icon.addEventListener('pointerup', finishDrag);
  icon.addEventListener('pointercancel', finishDrag);
  const handleResize = () => positionIcon(icon.getBoundingClientRect().top);
  window.addEventListener('resize', handleResize);
  icon.addEventListener('keydown', event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    positionChanged = true;
    positionIcon(icon.getBoundingClientRect().top + (event.key === 'ArrowUp' ? -20 : 20));
    savePosition();
  });

  icon.addEventListener('click', async () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    isActivated = true;
    icon.remove();
    window.removeEventListener('resize', handleResize);
    try {
      await sendMessageSafely({ action: 'setActivation', activated: true });
    } catch (error) {
      debugWarn('设置激活状态失败:', error);
    }
    startTranslation();
  });

  document.body.appendChild(icon);
  positionIcon(defaultTop());
  chrome.storage.local.get([positionKey], result => {
    if (icon.isConnected && !activePointer && !positionChanged) restorePosition(result[positionKey]);
  });
}

// 开始翻译流程
async function startTranslation() {
  debugLog('🔍 [调试] ========== startTranslation 被调用 ==========');
  if (debugEnabled) debugLog('🔍 [调试] 调用栈:', new Error().stack);
  
  perfLogger.start('翻译流程', '翻译处理');
  
  try {
    // 1. 提取主体内容
    perfLogger.start('提取主体内容', '翻译处理');
    const mainContent = extractMainContent();
    perfLogger.end('提取主体内容', '翻译处理', { 内容长度: mainContent?.length || 0 });
    
    if (!mainContent) {
      debugWarn('未找到主体内容区域');
      perfLogger.end('翻译流程', '翻译处理', { 错误: '未找到内容' });
      return;
    }
    
    // 2. 使用本地 wordfreq(Zipf)判定器识别疑难词汇
    perfLogger.start('检查依赖', '翻译处理');

    // 阈值:优先使用 config.zipfThreshold;否则由 difficultyLevel 兼容映射
    const zipfThreshold = (typeof config?.zipfThreshold === 'number')
      ? config.zipfThreshold
      : (typeof zhiyiThresholdForLevel === 'function' ? zhiyiThresholdForLevel(config?.difficultyLevel || 4) : 4.1);

    // 检查依赖是否加载
    if (typeof createWordDifficultyScorer === 'undefined' || typeof window.__EN_ZIPF === 'undefined') {
      throw new Error('wordfreq 判定器或词表未正确加载');
    }

    const scorer = createWordDifficultyScorer(window.__EN_ZIPF, {
      threshold: zipfThreshold,
      minLength: 3,
      knownWords: config?.knownWords || [],
      ignoreWords: config?.ignoreWords || []
    });
    perfLogger.end('检查依赖', '翻译处理', { 阈值: zipfThreshold });
    
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
    
    debugLog(`文本已分成 ${chunks.length} 个块进行处理`);
    
    const allDifficultWords = new Map(); // word -> {word, zipf, context}，按词去重
    let processedChunks = 0;
    let totalProcessingTime = 0;
    
    perfLogger.start('分块词汇提取', '翻译处理');
    
    for (const chunk of chunks) {
      try {
        const chunkStartTime = performance.now();
        
        const words = scorer.extractWords(chunk);

        const chunkEndTime = performance.now();
        const chunkDuration = chunkEndTime - chunkStartTime;
        totalProcessingTime += chunkDuration;

        words.forEach(word => {
          if (!allDifficultWords.has(word.word)) allDifficultWords.set(word.word, word);
        });
        processedChunks++;
        
        // 每处理5个块输出一次进度
        if (processedChunks % 5 === 0) {
          debugLog(`已处理 ${processedChunks}/${chunks.length} 个块，发现 ${allDifficultWords.size} 个疑难词汇`);
          debugLog(`平均处理速度: ${(totalProcessingTime / processedChunks).toFixed(2)}ms/块`);
        }
        } catch (error) {
          console.error(`处理第 ${processedChunks + 1} 个文本块时出错:`, error);
      }
    }
    
    perfLogger.end('分块词汇提取', '翻译处理', {
      处理块数: processedChunks,
      总耗时: totalProcessingTime.toFixed(2) + 'ms',
      平均耗时: (totalProcessingTime / processedChunks).toFixed(2) + 'ms/块'
    });
    
    const difficultWords = Array.from(allDifficultWords.values());
    perfLogger.end('提取疑难词汇', '翻译处理', { 
      词汇数: difficultWords.length,
      文本块数: chunks.length,
      平均块大小: Math.round(mainContent.length / chunks.length),
      处理速度: (mainContent.length / totalProcessingTime * 1000).toFixed(0) + '字符/秒'
    });
    
    debugLog(`使用 wordfreq 判定完成（阈值 ${zipfThreshold}），共发现 ${difficultWords.length} 个不重复的疑难词汇`);
    
    if (difficultWords.length === 0) {
      debugLog('未发现疑难词汇');
      perfLogger.end('翻译流程', '翻译处理', { 词汇数: 0 });
      return;
    }
    
    debugLog(`发现 ${difficultWords.length} 个疑难词汇`);
    
    // 3. 按阅读顺序分批翻译,边翻边注入(页面上方的先出结果)
    const PAGE_SIZE = 50;
    const pages = [];
    for (let i = 0; i < difficultWords.length; i += PAGE_SIZE) {
      pages.push(difficultWords.slice(i, i + PAGE_SIZE));
    }

    perfLogger.start('翻译API调用', '翻译处理');
    let usedProvider = null;
    let totalCacheHits = 0;
    let totalTranslated = 0;

    for (let p = 0; p < pages.length; p++) {
      const response = await sendMessageSafely({ action: 'translate', words: pages[p] });
      if (!response?.success) {
        const errorMsg = response?.error || '翻译请求失败';
        console.error('翻译失败:', errorMsg);
        showError(errorMsg);
        break;
      }
      usedProvider = usedProvider || response.provider;
      totalCacheHits += response.cacheHits || 0;
      totalTranslated += response.translated || 0;

      // 本批一到达就注入,后续批次随后补齐
      perfLogger.start('注入翻译', '翻译处理');
      injectTranslations(response.translations);
      perfLogger.end('注入翻译', '翻译处理');
    }

    perfLogger.end('翻译API调用', '翻译处理', {
      词汇数: difficultWords.length,
      批次数: pages.length,
      实际引擎: usedProvider,
      缓存命中: totalCacheHits,
      实际调用: totalTranslated
    });

    if (usedProvider) {
      const providerLabel = (window.zhiyiProviderName && window.zhiyiProviderName(usedProvider)) || usedProvider || '未知';
      const note = totalTranslated === 0
        ? `（全部命中缓存，本次未实际调用引擎；结果来源=${providerLabel}）`
        : `（缓存命中 ${totalCacheHits}，实际调用 ${totalTranslated}，分 ${pages.length} 批）`;
      debugLog(`🔌 [拾词] 实际执行引擎: ${providerLabel} ${note}`);
      window.zhiyiDebug.lastTranslation = {
        provider: usedProvider,
        pages: pages.length,
        cacheHits: totalCacheHits,
        translated: totalTranslated,
        total: difficultWords.length
      };
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
  debugLog('🔍 [调试] 开始注入翻译，翻译词汇:', Object.keys(translations));
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
        
        // 跳过已注入翻译的词内部(避免二次翻译/嵌套);允许在已翻译区域的其他文本上继续注入
        if (parent.closest('.zhiyi-word, .zhiyi-translation')) {
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
      debugLog(`🔍 [调试-${nodeIndex}] 发现包含 "exceptions" 的节点:`);
      debugLog(`  原始文本: "${text.substring(0, 200)}..."`);
      debugLog(`  父元素: ${textNode.parentElement?.tagName}.${textNode.parentElement?.className}`);
    }
    
    // 收集所有需要替换的位置（避免重复替换）
    const replacements = [];

    // 为每个疑难词汇查找匹配位置
    Object.keys(translations).forEach(word => {
      const translation = translations[word];
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const isOverlapping = replacements.some(r =>
          (start >= r.start && start < r.end) ||
          (end > r.start && end <= r.end)
        );
        if (!isOverlapping) {
          replacements.push({ start, end, original: match[0], translation });
        }
      }
    });

    if (replacements.length > 0) {
      replacements.sort((a, b) => a.start - b.start);
      matchCount += replacements.length;

      // 用文档片段替换文本节点:只包住命中的词,不套外层容器,
      // 这样分批注入时同一段里后面的词仍能被后续批次处理
      const frag = document.createDocumentFragment();
      let cursor = 0;
      for (const r of replacements) {
        if (r.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, r.start)));
        const wordSpan = document.createElement('span');
        wordSpan.className = 'zhiyi-word';
        wordSpan.appendChild(document.createTextNode(r.original));
        const transSpan = document.createElement('span');
        transSpan.className = 'zhiyi-translation';
        transSpan.textContent = `（${r.translation}）`;
        wordSpan.appendChild(transSpan);
        frag.appendChild(wordSpan);
        cursor = r.end;
      }
      if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));

      textNode.parentNode.replaceChild(frag, textNode);
      replacedCount++;
    }
  });
  
  perfLogger.end('替换文本节点', 'DOM操作', {
    处理节点数: nodesToProcess.length,
    替换节点数: replacedCount,
    匹配次数: matchCount
  });
  
  debugLog('🔍 [调试] 翻译注入完成，共处理', nodesToProcess.length, '个节点，替换', replacedCount, '个节点');
  debugLog('🔍 [调试] 最终页面中包含 zhiyi-word 的元素数量:', document.querySelectorAll('.zhiyi-word').length);
}


// 显示错误提示
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'zhiyi-error-toast';
  errorDiv.textContent = `拾词错误: ${message}`;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('🔍 [调试] 收到消息:', request);
  
  if (request.action === 'toggleTranslation') {
    debugLog('🔍 [调试] toggleTranslation 消息，enabled:', request.enabled);
    isActivated = request.enabled;
    
    if (isActivated) {
      debugLog('🔍 [调试] 准备启动翻译...');
      startTranslation();
    } else {
      debugLog('🔍 [调试] 移除所有翻译...');
      // 去掉翻译、保留原词
      const words = document.querySelectorAll('.zhiyi-word');
      debugLog('🔍 [调试] 找到', words.length, '个需要还原的元素');
      words.forEach(el => {
        const trans = el.querySelector('.zhiyi-translation');
        if (trans) trans.remove();
        el.replaceWith(...el.childNodes);
      });
      // 兼容旧版本残留的外层包装
      document.querySelectorAll('.zhiyi-translated').forEach(el => el.replaceWith(...el.childNodes));
    }
    
    sendResponse({ success: true });
  } else if (request.action === 'getTranslatedCount') {
    sendResponse({ count: document.querySelectorAll('.zhiyi-translation').length });
  }
});
