// 本地疑难词判定器(基于 wordfreq Zipf 词频)
//
// 判定规则:zipf(word) < 阈值 T → 疑难词(越罕见越可能被翻译)
//   - 未登录词(OOV)视为 Zipf=0 → 必然 < T → 判为最难(安全方向,修掉漏译)
//   - 连字符复合词取各片段中最罕见者(即最小 Zipf)作为其难度
//   - 个性化:knownWords 命中则永不翻译;ignoreWords 命中则跳过
//
// 词表来自 lib/en-zipf.js 暴露的 window.__EN_ZIPF:{ word: zipfValue }

(function (global) {
  const DEFAULT_THRESHOLD = 4.27; // B2 默认
  const DEFAULT_MIN_LENGTH = 3;

  // CEFR 档位 → Zipf 阈值；按本地跨体裁语料的词语出现次数标注率校准。
  const LEVEL_TO_THRESHOLD = {
    1: 5.05, // A1 ~30%
    2: 4.83, // A2 ~25%
    3: 4.58, // B1 ~20%
    4: 4.27, // B2 ~15%
    5: 3.88, // C1 ~10%
    6: 3.25, // C2 ~5%
  };

  // 连字符必须是“字母-字母”内部形式,避免把 "PDP-11" 切成 "pdp-"
  const WORD_RE = /[A-Za-z][A-Za-z'’]*(?:-[A-Za-z][A-Za-z'’]*)*/g;
  const SENT_SPLIT_RE = /[^.!?]+[.!?]*/g;

  class WordDifficultyScorer {
    constructor(table, opts = {}) {
      this.table = table || (global.__EN_ZIPF || {});
      this.threshold = opts.threshold != null ? opts.threshold : DEFAULT_THRESHOLD;
      this.minLength = opts.minLength != null ? opts.minLength : DEFAULT_MIN_LENGTH;
      this.knownWords = new Set((opts.knownWords || []).map((w) => String(w).toLowerCase().replace(/’/g, "'")));
      this.ignoreWords = new Set((opts.ignoreWords || []).map((w) => String(w).toLowerCase().replace(/’/g, "'")));
    }

    // 返回某词的 Zipf 频率;查不到(OOV)按 0 处理(最难)
    zipf(word) {
      const w = String(word).toLowerCase().replace(/’/g, "'");
      if (this.table[w] !== undefined) return this.table[w];
      const base = w.replace(/'s$/, '');
      if (base !== w) return this.zipf(base);
      const segs = w.split('-').filter(Boolean);
      if (segs.length > 1) {
        // 复合词:取最罕见片段(最小 Zipf)
        return segs.reduce((min, s) => Math.min(min, this.zipf(s)), Infinity);
      }
      return 0;
    }

    isDifficult(word) {
      const w = String(word).toLowerCase().replace(/’/g, "'").replace(/^'|'$/g, '');
      const base = this.table[w] === undefined ? w.replace(/'s$/, '') : w;
      if (base.length < this.minLength) return false;
      if (this.ignoreWords.has(w) || this.ignoreWords.has(base)) return false;
      if (this.knownWords.has(w) || this.knownWords.has(base)) return false;
      if (base.includes("'")) {
        // 缩约词仅在词表中有独立频率时判定，避免把未知缩写当作难词。
        const z = this.table[base];
        return z !== undefined && z < this.threshold;
      }
      return this.zipf(base) < this.threshold;
    }

    // 从文本中提取疑难词,返回 [{word, lemma, zipf, context}]
    extractWords(text) {
      const seen = new Set();
      const out = [];
      const input = String(text);
      const sentences = input.match(SENT_SPLIT_RE) || [];
      const remainder = input.slice(sentences.join('').length);
      if (remainder) sentences.push(remainder);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;
        const tokens = trimmed.matchAll(WORD_RE);
        for (const token of tokens) {
          const raw = token[0];
          const start = token.index;
          const end = start + raw.length;
          let left = start;
          let right = end;
          while (left > 0 && /[A-Za-z0-9_-]/.test(trimmed[left - 1])) left--;
          while (right < trimmed.length && /[A-Za-z0-9_-]/.test(trimmed[right])) right++;
          if (/[0-9_]/.test(trimmed.slice(left, right))) continue;
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
