// Background Service Worker for 智译插件

// 存储配置和状态
let config = {
  apiKey: '',
  modelName: 'gpt-3.5-turbo',
  baseUrl: 'https://api.openai.com/v1',
  targetLanguage: 'zh-CN',
  difficultyLevel: 5,
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
      handleTranslation(request.words, sender.tab?.id)
        .then(translations => sendResponse({ success: true, translations }))
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
async function handleTranslation(words, tabId) {
  // 获取最新配置
  const result = await chrome.storage.sync.get(['config']);
  const currentConfig = result.config || config;
  
  if (!currentConfig.apiKey) {
    throw new Error('请先在设置中配置API Key');
  }
  
  // 检查缓存
  const cacheKeys = words.map(w => `cache_${w.word}_${w.context.substring(0, 50)}`);
  const cached = await chrome.storage.local.get(cacheKeys);
  
  const translations = {};
  const toTranslate = [];
  
  words.forEach((wordData, index) => {
    const cacheKey = cacheKeys[index];
    if (cached[cacheKey]) {
      translations[wordData.word] = cached[cacheKey];
    } else {
      toTranslate.push(wordData);
    }
  });
  
  // 批量翻译未缓存的词汇
  if (toTranslate.length > 0) {
    const newTranslations = await batchTranslate(toTranslate, currentConfig);
    
    // 更新缓存
    const cacheData = {};
    toTranslate.forEach((wordData, index) => {
      const cacheKey = `cache_${wordData.word}_${wordData.context.substring(0, 50)}`;
      const translation = newTranslations[wordData.word];
      cacheData[cacheKey] = translation;
      translations[wordData.word] = translation;
    });
    
    await chrome.storage.local.set(cacheData);
  }
  
  return translations;
}

// 批量翻译
async function batchTranslate(words, config) {
  const translations = {};
  
  // 为了提高效率，使用批量请求（每次最多10个词）
  const batchSize = 10;
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(wordData => translateWord(wordData, config))
    );
    
    batch.forEach((wordData, index) => {
      translations[wordData.word] = batchResults[index];
    });
  }
  
  return translations;
}

// 调用AI API翻译单个词汇
async function translateWord(wordData, config) {
  const prompt = `Translate the English word "${wordData.word}" into Chinese. The context is: "${wordData.context}". Provide only the most concise and accurate Chinese translation of the word itself, without any extra explanation. Format: just the Chinese translation.`;
  
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: 'system', content: 'You are a professional translator. Provide only the translation without explanations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 100
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '翻译请求失败');
    }
    
    const data = await response.json();
    const translation = data.choices[0]?.message?.content?.trim() || wordData.word;
    
    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    return wordData.word; // 出错时返回原词
  }
}

// 监听标签页激活，更新图标状态
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const activated = await chrome.storage.local.get([`activated_${activeInfo.tabId}`]);
  if (activated[`activated_${activeInfo.tabId}`]) {
    chrome.action.setBadgeText({ text: '✓', tabId: activeInfo.tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: activeInfo.tabId });
  }
});

