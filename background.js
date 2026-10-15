// Background Service Worker for 拾词插件

importScripts('lib/translators.js');
const debugLog = (enabled, ...args) => { if (enabled) console.log(...args); };
let debugEnabled = false;
chrome.storage.sync.get(['config'], result => { debugEnabled = !!result.config?.debugLogging; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.config) debugEnabled = !!changes.config.newValue?.debugLogging;
});

// 存储配置和状态
let config = {
  provider: 'auto',
  autoTranslate: false,
  apiKey: '',
  modelName: 'gpt-3.5-turbo',
  baseUrl: 'https://api.openai.com/v1',
  deeplApiKey: '',
  targetLanguage: 'zh-CN',
  difficultyLevel: 4,
  whitelist: [],
  blacklist: []
};

// 初始化配置
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['config'], (result) => {
    if (result.config) {
      config = { ...config, ...result.config };
    }
  });
  
  // 设置默认图标状态
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 验证请求
  if (!request || !request.action) {
    sendResponse({ success: false, error: '无效的请求' });
    return false;
  }
  
  try {
    if (request.action === 'detectLanguage') {
      handleLanguageDetection(request.data, sender.tab?.id);
      sendResponse({ success: true });
      return false;
    } 
    else if (request.action === 'translate') {
      handleTranslation(request.words)
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => {
          console.error('Translation error:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // 保持消息通道开放
    }
    else if (request.action === 'getConfig') {
      chrome.storage.sync.get(['config'], (result) => {
        const currentConfig = result.config || config;
        sendResponse({ success: true, config: currentConfig });
      });
      return true;
    }
    else if (request.action === 'checkActivation') {
      if (!sender.tab?.id) {
        sendResponse({ activated: false });
        return false;
      }
      chrome.storage.local.get([`activated_${sender.tab.id}`], (result) => {
        sendResponse({ activated: result[`activated_${sender.tab.id}`] || false });
      });
      return true;
    }
    else if (request.action === 'setActivation') {
      if (!sender.tab?.id) {
        sendResponse({ success: false, error: '无法获取标签页ID' });
        return false;
      }
      chrome.storage.local.set({ [`activated_${sender.tab.id}`]: request.activated }, () => {
        // 更新徽章
        if (request.activated) {
          chrome.action.setBadgeText({ text: '✓', tabId: sender.tab.id });
          chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: sender.tab.id });
        } else {
          chrome.action.setBadgeText({ text: '', tabId: sender.tab.id });
        }
        sendResponse({ success: true });
      });
      return true;
    }
    else if (request.action === 'clearCache') {
      chrome.storage.local.get(null, (all) => {
        const keys = Object.keys(all).filter(k => k.startsWith('cache_'));
        chrome.storage.local.remove(keys, () => {
          sendResponse({ success: true, removed: keys.length });
        });
      });
      return true;
    }
    else {
      sendResponse({ success: false, error: '未知的操作' });
      return false;
    }
  } catch (error) {
    console.error('Message handler error:', error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
});

// 处理语言检测结果
function handleLanguageDetection(data, tabId) {
  if (data.isEnglish) {
    // 显示徽章提示
    chrome.action.setBadgeText({ text: '!', tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#FF9800', tabId: tabId });
  }
}

// 处理翻译请求（批量）
async function handleTranslation(words) {
  // 获取最新配置
  const result = await chrome.storage.sync.get(['config']);
  const currentConfig = result.config || config;
  debugEnabled = !!currentConfig.debugLogging;
  let provider = ZhiyiTranslators.resolveProvider(currentConfig);
  const targetLanguage = currentConfig.targetLanguage || 'zh-CN';
  debugLog(debugEnabled, `[拾词] 收到翻译请求: ${words.length} 个词 | 选择引擎=${currentConfig.provider || 'auto'} 实际引擎=${provider} 基地址=${currentConfig.baseUrl || '-'} 模型=${currentConfig.modelName || '-'}`);

  // 缓存键包含 引擎 + 目标语言,避免切换引擎/语言时命中旧结果
  const cacheKeyFor = (w) =>
    `cache_${provider}_${targetLanguage}_${w.word}_${(w.context || '').substring(0, 50)}`;

  // 检查缓存
  const cacheKeys = words.map(cacheKeyFor);
  const cached = await chrome.storage.local.get(cacheKeys);

  const translations = {};
  const toTranslate = [];
  let cacheHits = 0;

  words.forEach((wordData, index) => {
    const cacheKey = cacheKeys[index];
    if (cached[cacheKey] != null) {
      translations[wordData.word] = cached[cacheKey];
      cacheHits++;
    } else {
      toTranslate.push(wordData);
    }
  });

  // 批量翻译未缓存的词汇
  if (toTranslate.length > 0) {
    const res = await ZhiyiTranslators.translateBatch(toTranslate, currentConfig);
    provider = res.provider;
    const newTranslations = res.translations;

    // 更新缓存
    const cacheData = {};
    toTranslate.forEach((wordData) => {
      const cacheKey = cacheKeyFor(wordData);
      const translation = newTranslations[wordData.word];
      cacheData[cacheKey] = translation;
      translations[wordData.word] = translation;
    });

    await chrome.storage.local.set(cacheData);
  }

  // 真实执行统计:引擎来自实际派发,而非用户选择
  const stats = {
    translations,
    provider,
    targetLanguage,
    cacheHits,
    translated: toTranslate.length,
    total: words.length,
  };
  debugLog(debugEnabled, `[拾词] 实际引擎=${provider} 目标语言=${targetLanguage} 缓存命中=${cacheHits} 实际调用=${toTranslate.length} 共=${words.length}`);
  return stats;
}

// 监听标签页激活，更新图标状态
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const activated = await chrome.storage.local.get([`activated_${activeInfo.tabId}`]);
  if (activated[`activated_${activeInfo.tabId}`]) {
    chrome.action.setBadgeText({ text: '✓', tabId: activeInfo.tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: activeInfo.tabId });
  }
});
