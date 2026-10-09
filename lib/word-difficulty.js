// 本地疑难词判定器(基于 wordfreq Zipf 词频)
//
// 判定规则:zipf(word) < 阈值 T → 疑难词(越罕见越可能被翻译)
//   - 未登录词(OOV)视为 Zipf=0 → 必然 < T → 判为最难(安全方向,修掉漏译)
//   - 连字符复合词取各片段中最罕见者(即最小 Zipf)作为其难度
//   - 个性化:knownWords 命中则永不翻译;ignoreWords 命中则跳过
//
// 词表来自 lib/en-zipf.js 暴露的 window.__EN_ZIPF:{ word: zipfValue }

(function (global) {
  const DEFAULT_THRESHOLD = 4.1; // B2 默认
  const DEFAULT_MIN_LENGTH = 3;

  // CEFR 档位 → Zipf 阈值(经 Rank/黄金集校准;越大翻越多)
  const LEVEL_TO_THRESHOLD = {
    1: 5.0, // A1
    2: 4.6, // A2
    3: 4.3, // B1
    4: 4.1, // B2
    5: 3.9, // C1
    6: 3.6, // C2
  };

  // 连字符必须是“字母-字母”内部形式,避免把 "PDP-11" 切成 "pdp-"
  const WORD_RE = /[A-Za-z][A-Za-z'’]*(?:-[A-Za-z][A-Za-z'’]*)*/g;
  const SENT_SPLIT_RE = /[^.!?]+[.!?]*/g;

  class WordDifficultyScorer {
    constructor(table, opts = {}) {
      this.table = table || (global.__EN_ZIPF || {});
      this.threshold = opts.threshold != null ? opts.threshold : DEFAULT_THRESHOLD;
      this.minLength = opts.minLength != null ? opts.minLength : DEFAULT_MIN_LENGTH;
      this.knownWords = new Set((opts.knownWords || []).map((w) => String(w).toLowerCase()));
      this.ignoreWords = new Set((opts.ignoreWords || []).map((w) => String(w).toLowerCase()));
    }

    // 返回某词的 Zipf 频率;查不到(OOV)按 0 处理(最难)
    zipf(word) {
      const w = String(word).toLowerCase();
      const segs = w.split('-').filter(Boolean);
      if (segs.length > 1) {
        // 复合词:取最罕见片段(最小 Zipf)
        return segs.reduce((min, s) => Math.min(min, this.zipf(s)), Infinity);
      }
      const z = this.table[w];
      return z === undefined ? 0 : z;
    }

    isDifficult(word) {
      const w = String(word).toLowerCase().replace(/^['’]|['’]$/g, '').replace(/['’]s$/, '');
      if (w.length < this.minLength) return false;
      if (this.ignoreWords.has(w)) return false;
      if (this.knownWords.has(w)) return false;
      if (w.indexOf("'") !== -1 || w.indexOf("’") !== -1) {
        // 缩略/所有格:仅当整词在表中且罕见时才判定,避免把 OOV 缩写误判为难词
        const z = this.table[w];
        return z !== undefined && z < this.threshold;
      }
      return this.zipf(w) < this.threshold;
    }

    // 从文本中提取疑难词,返回 [{word, lemma, zipf, context}]
    extractWords(text) {
      const seen = new Set();
      const out = [];
      const sentences = String(text).match(SENT_SPLIT_RE) || [String(text)];
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;
        const tokens = trimmed.match(WORD_RE) || [];
        for (const raw of tokens) {
          const w = raw.toLowerCase();
          if (seen.has(w)) continue;
          if (!this.isDifficult(w)) continue;
          seen.add(w);
          out.push({ word: w, zipf: this.zipf(w), context: trimmed });
        }
      }
      return out;
    }
  }

  function createWordDifficultyScorer(table, opts) {
    return new WordDifficultyScorer(table, opts);
  }

  function thresholdForLevel(level) {
    return LEVEL_TO_THRESHOLD[level] != null ? LEVEL_TO_THRESHOLD[level] : DEFAULT_THRESHOLD;
  }

  global.WordDifficultyScorer = WordDifficultyScorer;
  global.createWordDifficultyScorer = createWordDifficultyScorer;
  global.zhiyiThresholdForLevel = thresholdForLevel;
})(typeof window !== 'undefined' ? window : self);
