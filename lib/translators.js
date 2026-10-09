// 可插拔翻译服务层(在 background service worker 中通过 importScripts 加载)
//
// 统一入口:ZhiyiTranslators.translateBatch(words, config)
//   words  = [{word, context, zipf}]
//   config = { provider, targetLanguage, apiKey, modelName, baseUrl, deeplApiKey }
// 返回:{ translations: { word: text }, provider }
//
// provider 取值:auto | chrome | deepl | openai
// auto 优先级(按翻译质量):openai > deepl > chrome(兜底)

(function (global) {
  const TARGET_MAP = {
    chrome: { 'zh-CN': 'zh', 'zh-TW': 'zh-Hant', 'zh': 'zh', 'en': 'en', 'ja': 'ja', 'ko': 'ko' },
    deepl: { 'zh-CN': 'ZH', 'zh-TW': 'ZH', 'zh': 'ZH', 'en': 'EN-US', 'ja': 'JA', 'ko': 'KO' },
  };

  function mapTarget(provider, lang) {
    const m = TARGET_MAP[provider] || {};
    return m[lang] || lang || 'zh';
  }

  // 带超时的 fetch,避免网络异常时请求永久挂起
  function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  // ---------- Chrome 内置离线翻译(免费、免密钥) ----------
  let chromeTranslatorCache = { key: null, promise: null };

  function getChromeTranslator(target) {
    if (typeof Translator === 'undefined') {
      return Promise.reject(new Error('当前环境不支持 Chrome 内置翻译(需 Chrome 138+ 且已启用)'));
    }
    const key = `en->${target}`;
    if (chromeTranslatorCache.key === key) return chromeTranslatorCache.promise;

    const promise = (async () => {
      if (typeof Translator.availability === 'function') {
        const avail = await Translator.availability({ sourceLanguage: 'en', targetLanguage: target });
        if (avail === 'unavailable') {
          throw new Error(`Chrome 内置翻译不支持 en→${target}`);
        }
      }
      return Translator.create({ sourceLanguage: 'en', targetLanguage: target });
    })();

    chromeTranslatorCache = { key, promise };
    return promise;
  }

  async function translateChrome(words, config) {
    const target = mapTarget('chrome', config.targetLanguage);
    const translator = await getChromeTranslator(target);
    const out = {};
    for (const w of words) {
      try {
        out[w.word] = (await translator.translate(w.word)) || w.word;
      } catch (e) {
        out[w.word] = w.word;
      }
    }
    return out;
  }

  // ---------- DeepL(Free 版每月 50 万字符) ----------
  async function translateDeepL(words, config) {
    const key = (config.deeplApiKey || '').trim();
    if (!key) throw new Error('请先在设置中配置 DeepL API Key');
    const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
    const target = mapTarget('deepl', config.targetLanguage);
    const out = {};
    const BATCH = 40;

    for (let i = 0; i < words.length; i += BATCH) {
      const batch = words.slice(i, i + BATCH);
      const body = new URLSearchParams();
      batch.forEach((w) => body.append('text', w.word));
      body.append('source_lang', 'EN');
      body.append('target_lang', target);

      const resp = await fetchWithTimeout(`${host}/v2/translate`, {
        method: 'POST',
        headers: { 'Authorization': `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!resp.ok) throw new Error(`DeepL 请求失败 (${resp.status})`);
      const data = await resp.json();
      (data.translations || []).forEach((t, idx) => {
        if (batch[idx]) out[batch[idx].word] = t.text;
      });
    }
    return out;
  }

  // ---------- OpenAI 兼容 LLM(真批量) ----------
  async function translateOpenAISingle(w, base, config) {
    const prompt = `Translate the English word "${w.word}" into Chinese. The context is: "${w.context}". Provide only the most concise and accurate Chinese translation of the word itself, without any extra explanation.`;
    const resp = await fetchWithTimeout(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.modelName || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a professional translator. Provide only the translation without explanations.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `LLM 请求失败 (${resp.status})`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || w.word;
  }

  // 单批翻译:一次请求,返回该批的 { word: translation }
  async function translateOpenAIBatch(batch, base, config) {
    const out = {};
    const list = batch.map((w, n) => `${n + 1}. word="${w.word}" context="${w.context}"`).join('\n');
    const prompt =
      `将下列英文词翻译为中文,严格返回 JSON 数组,每项 {"word","translation"};` +
      `translation 为结合上下文最贴切、最简洁的释义,不要解释:\n${list}`;

    // HTTP/网络错误显式抛出(便于定位);仅当返回非 JSON 时才回退逐词
    const resp = await fetchWithTimeout(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.modelName || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a professional translator. Return only a JSON array.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    }, 30000);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `LLM 请求失败 (${resp.status})`);
    }

    let arr = null;
    try {
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      const m = content.match(/\[[\s\S]*\]/);
      arr = JSON.parse(m ? m[0] : content);
    } catch (e) {
      arr = null;
    }

    if (Array.isArray(arr)) {
      const byWord = new Map(arr.map((o) => [String(o.word || '').toLowerCase(), o.translation]));
      for (const w of batch) {
        const t = byWord.get(w.word.toLowerCase());
        out[w.word] = t != null && t !== '' ? t : await translateOpenAISingle(w, base, config);
      }
    } else {
      for (const w of batch) out[w.word] = await translateOpenAISingle(w, base, config);
    }
    return out;
  }

  async function translateOpenAI(words, config) {
    if (!config.apiKey) throw new Error('请先在设置中配置 API Key');
    const base = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const out = {};

    const BATCH = config.llmBatchSize || 50;         // 每批词数
    const CONCURRENCY = config.llmConcurrency || 3;  // 并发批次数

    const batches = [];
    for (let i = 0; i < words.length; i += BATCH) batches.push(words.slice(i, i + BATCH));

    // 并发跑批次:总耗时≈最慢一批,而不是各批之和
    let cursor = 0;
    const worker = async () => {
      while (cursor < batches.length) {
        const batch = batches[cursor++];
        const partial = await translateOpenAIBatch(batch, base, config);
        Object.assign(out, partial);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker));
    return out;
  }

  const PROVIDER_FN = {
    chrome: translateChrome,
    deepl: translateDeepL,
    openai: translateOpenAI,
  };

  function resolveProvider(config) {
    const p = config.provider || 'auto';
    if (p !== 'auto') return p;
    // 质量优先:LLM > DeepL > Chrome 兜底
    if (config.apiKey) return 'openai';
    if (config.deeplApiKey) return 'deepl';
    return 'chrome';
  }

  async function translateBatch(words, config) {
    const provider = resolveProvider(config);
    const fn = PROVIDER_FN[provider];
    if (!fn) throw new Error(`未知的翻译服务: ${provider}`);
    const translations = await fn(words, config);
    return { translations, provider };
  }

  global.ZhiyiTranslators = {
    translateBatch,
    resolveProvider,
    PROVIDERS: Object.keys(PROVIDER_FN),
  };
})(typeof self !== 'undefined' ? self : this);
