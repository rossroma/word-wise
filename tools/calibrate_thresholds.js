// Reproduce corpus calibration: node tools/calibrate_thresholds.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const context = vm.createContext({ window: {} });
for (const file of ['lib/en-zipf.js', 'lib/word-difficulty.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const { __EN_ZIPF: table, createWordDifficultyScorer: createScorer } = context.window;
const fixtures = require('../tests/corpus/long-fixtures.json');
const tokenPattern = /[A-Za-z][A-Za-z'’]*(?:-[A-Za-z][A-Za-z'’]*)*/g;
const goals = [30, 25, 20, 15, 10, 5];
const observations = [];
let totalTokens = 0;

for (const { text } of fixtures) {
  const scorer = createScorer(table, { threshold: Infinity, minLength: 3 });
  totalTokens += (text.match(tokenPattern) || []).length;
  for (const match of text.matchAll(tokenPattern)) {
    let left = match.index;
    let right = left + match[0].length;
    while (left > 0 && /[A-Za-z0-9_-]/.test(text[left - 1])) left--;
    while (right < text.length && /[A-Za-z0-9_-]/.test(text[right])) right++;
    if (/[0-9_]/.test(text.slice(left, right))) continue;
    if (scorer.isDifficult(match[0])) observations.push(scorer.zipf(match[0]));
  }
}

const floor = observations.filter(zipf => zipf === 0).length * 100 / totalTokens;
console.log(`Token occurrences: ${totalTokens}; zero-Zipf floor: ${floor.toFixed(2)}%`);
for (const [index, target] of goals.entries()) {
  let best = { error: Infinity };
  for (let step = 301; step <= 550; step++) {
    const threshold = step / 100;
    const selected = observations.filter(zipf => zipf < threshold).length;
    const actual = selected * 100 / totalTokens;
    const error = Math.abs(actual - target);
    if (error < best.error) best = { threshold, selected, actual, error };
  }
  console.log(`${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][index]} target=${target}% threshold=${best.threshold.toFixed(2)} observed=${best.actual.toFixed(2)}%`);
}
