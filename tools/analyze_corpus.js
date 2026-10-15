// Run with: node tools/analyze_corpus.js [--json]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const context = vm.createContext({ window: {} });
for (const file of ['lib/en-zipf.js', 'lib/word-difficulty.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const { __EN_ZIPF: table, createWordDifficultyScorer: createScorer, zhiyiThresholdForLevel: thresholdForLevel } = context.window;
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests/corpus/long-fixtures.json'), 'utf8'));
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const tokenPattern = /[A-Za-z][A-Za-z'’]*(?:-[A-Za-z][A-Za-z'’]*)*/g;
const historicSpellings = new Set(['publick', 'stroling', 'cabbin', 'barbadoes', 'encreaseth', 'expence', 'prolifick']);

// Heuristic categories, not dictionary/POS labels. Priority prevents double counting.
function categorizeOov(word, surfaces) {
  if (word.includes('-')) return 'compound';
  if (word.includes("'") || word.includes('’')) return 'apostrophe';
  if (historicSpellings.has(word)) return 'historic-spelling';
  if (surfaces.some(surface => surface === surface.toUpperCase() && surface.length > 1)) return 'acronym';
  if (surfaces.some(surface => /^[A-Z][a-z]/.test(surface))) return 'capitalized';
  const roots = [
    word.replace(/ies$/, 'y'), word.replace(/es$/, ''), word.replace(/s$/, ''),
    word.replace(/ied$/, 'y'), word.replace(/ed$/, ''), word.replace(/ing$/, ''),
    word.replace(/ing$/, 'e'), word.replace(/ed$/, 'e')
  ];
  if (roots.some(root => root !== word && Object.prototype.hasOwnProperty.call(table, root))) return 'derived-form';
  return 'other-rare-or-unknown';
}

// Mirror content.js splitTextIntoChunks; scorer.extractWords deduplicates within each chunk.
function splitTextIntoChunks(text, chunkSize = 2000) {
  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const consumed = sentences.join('').length;
  if (consumed < text.length) sentences.push(text.slice(consumed));
  let currentChunk = '';
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= chunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk.length) chunks.push(currentChunk.trim());
      if (sentence.length > chunkSize) {
        let tempChunk = '';
        for (const word of sentence.split(/\s+/)) {
          if (tempChunk.length + word.length + 1 <= chunkSize) {
            tempChunk += (tempChunk ? ' ' : '') + word;
          } else {
            if (tempChunk) chunks.push(tempChunk.trim());
            tempChunk = word;
          }
        }
        currentChunk = tempChunk;
      } else {
        currentChunk = sentence;
      }
    }
  }
  if (currentChunk.length) chunks.push(currentChunk.trim());
  return chunks.filter(Boolean);
}

function analyze({ id, genre, title, source, text }, scorerFactory = createScorer) {
  const rawTokens = text.match(tokenPattern) || [];
  const tokens = rawTokens.map(word => word.toLowerCase());
  const frequencies = new Map();
  const surfaces = new Map();
  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    frequencies.set(word, (frequencies.get(word) || 0) + 1);
    if (!surfaces.has(word)) surfaces.set(word, new Set());
    surfaces.get(word).add(rawTokens[i]);
  }
  const unique = [...frequencies.keys()];
  const eligibleOccurrences = new Map();
  const baselineScorer = scorerFactory(table, { threshold: Infinity, minLength: 3 });
  for (const raw of text.matchAll(tokenPattern)) {
    const word = raw[0].toLowerCase();
    let left = raw.index;
    let right = left + raw[0].length;
    while (left > 0 && /[A-Za-z0-9_-]/.test(text[left - 1])) left--;
    while (right < text.length && /[A-Za-z0-9_-]/.test(text[right])) right++;
    if (/[0-9_]/.test(text.slice(left, right))) continue;
    if (!baselineScorer.isDifficult(word)) continue;
    eligibleOccurrences.set(word, (eligibleOccurrences.get(word) || 0) + 1);
  }
  const chunks = splitTextIntoChunks(text);
  const absent = unique.filter(word => !Object.prototype.hasOwnProperty.call(table, word));
  const scorerForOov = scorerFactory(table, { minLength: 3 });
  const effectiveOov = unique.filter(word => scorerForOov.zipf(word) === 0);
  const effectiveOovSet = new Set(effectiveOov);
  const absentRecords = absent.map(word => ({
    word,
    occurrences: frequencies.get(word),
    surfaces: [...surfaces.get(word)],
    scorerZipf: scorerForOov.zipf(word),
    selectedLevels: []
  }));
  const oovCategories = {};
  for (const word of effectiveOov) {
    const category = categorizeOov(word, [...surfaces.get(word)]);
    if (!oovCategories[category]) oovCategories[category] = { unique: 0, occurrences: 0, examples: [] };
    oovCategories[category].unique++;
    oovCategories[category].occurrences += frequencies.get(word);
    oovCategories[category].examples.push(word);
  }
  const byLevel = levels.map((level, index) => {
    const threshold = thresholdForLevel(index + 1);
    const scorer = scorerFactory(table, { threshold, minLength: 3, knownWords: [], ignoreWords: [] });
    const matched = new Set();
    for (const chunk of chunks) {
      for (const item of scorer.extractWords(chunk)) matched.add(item.word);
    }
    const words = [...matched];
    const matchedOov = words.filter(word => effectiveOovSet.has(word));
    const unmatched = unique.filter(word => !matched.has(word));
    const occurrences = words.reduce((total, word) => total + (eligibleOccurrences.get(word) || 0), 0);
    return {
      level, threshold, unique: words.length,
      uniquePercent: +(100 * words.length / unique.length).toFixed(1),
      unmatched: unmatched.length,
      unmatchedPercent: +(100 * unmatched.length / unique.length).toFixed(1),
      occurrences, occurrencePercent: +(100 * occurrences / tokens.length).toFixed(1),
      effectiveOov: matchedOov.length,
      effectiveOovPercent: +(100 * matchedOov.length / (words.length || 1)).toFixed(1),
      selectedWords: words,
      unmatchedWords: unmatched
    };
  });
  for (const record of absentRecords) {
    record.selectedLevels = byLevel.filter(row => row.selectedWords.includes(record.word)).map(row => row.level);
  }
  return {
    id, genre, title, source, tokens: tokens.length, unique: unique.length,
    absentFromTable: absent.length,
    absentPercent: +(100 * absent.length / unique.length).toFixed(1),
    absentWords: absent.sort((a, b) => frequencies.get(b) - frequencies.get(a) || a.localeCompare(b)),
    absentRecords,
    effectiveOov: effectiveOov.length,
    effectiveOovPercent: +(100 * effectiveOov.length / unique.length).toFixed(1),
    effectiveOovWords: effectiveOov.sort((a, b) => frequencies.get(b) - frequencies.get(a) || a.localeCompare(b)),
    oovCategories,
    levels: byLevel.map((row, index) => {
      const selected = new Set(row.selectedWords);
      return {
        ...row,
        droppedVsPrevious: index
          ? byLevel[index - 1].selectedWords.filter(word => !selected.has(word)).length
          : null
      };
    })
  };
}

function main() {
  const results = fixtures.map(fixture => analyze(fixture));
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  } else {
    for (const item of results) {
      console.log(`\n${item.genre}: ${item.title}\n${item.source}`);
      console.log(`tokens=${item.tokens} unique=${item.unique} absent-from-table=${item.absentFromTable} (${item.absentPercent}%) effective-OOV=${item.effectiveOov} (${item.effectiveOovPercent}%)`);
      console.log(`absent-from-table words: ${item.absentWords.join(', ')}`);
      console.log(`effective-OOV words: ${item.effectiveOovWords.join(', ')}`);
      for (const [category, details] of Object.entries(item.oovCategories)) {
        console.log(`  ${category}: ${details.unique} types / ${details.occurrences} occurrences; ${details.examples.slice(0, 12).join(', ')}`);
      }
      console.log('level  zipf  selected  selected%  not-selected  not-selected%  occurrences  occ%  effective-OOV-selected  OOV%  drop');
      for (const row of item.levels) {
        console.log(`${row.level.padEnd(5)}  ${String(row.threshold).padEnd(4)}  ${String(row.unique).padStart(8)}  ${String(row.uniquePercent).padStart(9)}  ${String(row.unmatched).padStart(12)}  ${String(row.unmatchedPercent).padStart(13)}  ${String(row.occurrences).padStart(11)}  ${String(row.occurrencePercent).padStart(4)}  ${String(row.effectiveOov).padStart(22)}  ${String(row.effectiveOovPercent).padStart(4)}  ${row.droppedVsPrevious == null ? '-' : row.droppedVsPrevious}`);
      }
    }
  }
  return results;
}

if (require.main === module) main();
module.exports = { analyze, main, splitTextIntoChunks };
