const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = vm.createContext({ window: {} });
for (const filename of ['en-zipf.js', 'word-difficulty.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'lib', filename), 'utf8'), context);
}
const { createWordDifficultyScorer: createScorer, __EN_ZIPF: table } = context.window;
const expectedThresholds = [5.05, 4.83, 4.58, 4.27, 3.88, 3.25];
assert.deepStrictEqual(
  [1, 2, 3, 4, 5, 6].map(level => context.window.zhiyiThresholdForLevel(level)),
  expectedThresholds
);
const scorer = createScorer(table, { threshold: 4.1, minLength: 3 });

assert.strictEqual(scorer.zipf('don’t'), table["don't"]);
assert.strictEqual(scorer.isDifficult('don’t'), false);
assert.strictEqual(scorer.isDifficult('ma’am'), false);
assert.strictEqual(scorer.zipf('animal’s'), table.animal);
assert.strictEqual(scorer.isDifficult('animal’s'), false);
assert.strictEqual(scorer.isDifficult('curiouser'), true);
assert.ok(scorer.extractWords('Ma’am, the animal’s coat. Curiouser!').some(item => item.word === 'curiouser'));
assert.ok(!scorer.extractWords('The animal’s coat.').some(item => item.word === 'animal’s'));

const matches = scorer.extractWords('int32_t uint8_t word_thing _private UTF-8 PDP-11 32-bit 64-bit curiouser astrophysics');
assert.deepStrictEqual([...matches].map(item => item.word), ['curiouser', 'astrophysics']);
assert.ok(scorer.extractWords('This is plain-text with rabbit-hole consequences.').some(item => item.word === 'rabbit-hole'));
assert.ok(scorer.extractWords('One. Curiouser').some(item => item.word === 'curiouser'));
assert.ok(!scorer.extractWords('curiouser-version2').some(item => item.word === 'curiouser'));
const rarePossessive = createScorer(table, { threshold: 4.1, knownWords: ['curiouser’s'] });
assert.strictEqual(rarePossessive.isDifficult('curiouser’s'), false);
const ignoredPossessive = createScorer(table, { threshold: 4.1, ignoreWords: ['curiouser’s'] });
assert.strictEqual(ignoredPossessive.isDifficult('curiouser’s'), false);
const contraction = createScorer({ "let's": 2, let: 6 }, { threshold: 4.1 });
assert.strictEqual(contraction.isDifficult("let's"), true);

console.log('Word difficulty: apostrophe normalization and code identifier boundary cases passed');
