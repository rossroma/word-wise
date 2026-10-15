const assert = require('assert');
const fs = require('fs');
const path = require('path');
const fixtures = require('./corpus/long-fixtures.json');
const sources = require('./corpus/sources.json');
const summary = require('./corpus/absent-summary.json');
const { analyze, splitTextIntoChunks } = require('../tools/analyze_corpus');
const targets = [30, 25, 20, 15, 10, 5];

assert.strictEqual(fixtures.length, 8);
assert.deepStrictEqual(
  new Set(fixtures.map(item => item.genre)),
  new Set(['novel', 'essay', 'software', 'journal', 'news', 'explainer'])
);
assert.strictEqual(fixtures.filter(item => item.genre === 'novel').length, 3);
assert.strictEqual(fixtures.filter(item => item.genre === 'journal').length, 1);
assert.strictEqual(fixtures.filter(item => item.genre === 'software').length, 1);
assert.strictEqual(sources.filter(source => source.distribution === 'local-only').length, 1);
assert.deepStrictEqual(
  new Set(fixtures.map(item => item.id)),
  new Set(sources.filter(source => source.distribution !== 'local-only').map(source => source.id))
);

let totalAbsent = 0;
let totalTokens = 0;
const selectedOccurrences = [0, 0, 0, 0, 0, 0];
for (const fixture of fixtures) {
  assert.ok(fixture.source.startsWith('https://'));
  assert.ok(fixture.text.length >= 3500, `${fixture.id}: too short`);
  const result = analyze(fixture);
  assert.ok(result.tokens >= 500, `${fixture.id}: too few tokens`);
  assert.ok(result.unique > 200);
  assert.strictEqual(result.absentWords.length, result.absentFromTable);
  assert.strictEqual(result.absentRecords.length, result.absentFromTable);
  totalAbsent += result.absentFromTable;
  totalTokens += result.tokens;
  assert.ok(result.effectiveOov <= result.absentFromTable);
  assert.strictEqual(result.effectiveOovWords.length, result.effectiveOov);
  assert.strictEqual(result.levels.length, 6);
  assert.strictEqual(
    Object.values(result.oovCategories).reduce((sum, group) => sum + group.unique, 0),
    result.effectiveOov
  );
  for (let i = 0; i < result.levels.length; i++) {
    const row = result.levels[i];
    selectedOccurrences[i] += row.occurrences;
    assert.strictEqual(row.selectedWords.length, row.unique);
    assert.strictEqual(row.unmatchedWords.length, row.unmatched);
    assert.strictEqual(row.unique + row.unmatched, result.unique);
    assert.ok(row.effectiveOov <= row.unique);
    if (i) {
      assert.ok(row.unique <= result.levels[i - 1].unique, `${fixture.id}: threshold order`);
      assert.strictEqual(row.droppedVsPrevious, result.levels[i - 1].unique - row.unique);
    }
  }
}
for (let i = 0; i < targets.length; i++) {
  const percentage = selectedOccurrences[i] * 100 / totalTokens;
  assert.ok(Math.abs(percentage - targets[i]) < 0.8,
    `${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][i]}: ${percentage.toFixed(2)}% vs ${targets[i]}%`);
}
assert.strictEqual(summary.absent_pairs, totalAbsent);
assert.strictEqual(Object.values(summary.categories).reduce((sum, count) => sum + count, 0), totalAbsent);
const inventory = fs.readFileSync(path.join(__dirname, 'corpus/absent-vocabulary.csv'), 'utf8').trim().split('\n');
const perDocument = fs.readFileSync(path.join(__dirname, 'corpus/absent-words.csv'), 'utf8').trim().split('\n');
assert.strictEqual(inventory.length - 1, summary.global_unique_words);
assert.strictEqual(perDocument.length - 1, summary.absent_pairs);

assert.deepStrictEqual(splitTextIntoChunks('One. Two? Three!'), ['One. Two? Three!']);
assert.deepStrictEqual(splitTextIntoChunks('One. Curiouser'), ['One. Curiouser']);
assert.ok(splitTextIntoChunks('a '.repeat(1500)).length > 1);
const finalSentence = analyze({ id: 'end', genre: 'test', title: 'test', source: 'https://example.org', text: 'One. Curiouser' });
assert.ok(finalSentence.levels[5].selectedWords.includes('curiouser'));
const identifierOccurrences = analyze({ id: 'identifier', genre: 'test', title: 'test', source: 'https://example.org', text: 'Curiouser curiouser32 curiouser-version2' });
assert.strictEqual(identifierOccurrences.levels[5].occurrences, 1);
const compounds = analyze({ id: 'compound', genre: 'test', title: 'test', source: 'https://example.org', text: 'Rabbit-hole rabbit-hole. Fictionalword fictionalword. Books books.' });
assert.ok(compounds.absentWords.includes('rabbit-hole'));
assert.ok(!compounds.effectiveOovWords.includes('rabbit-hole'));
assert.ok(compounds.effectiveOovWords.includes('fictionalword'));
console.log('Long corpus analysis: fixtures, OOV groups and level metrics passed');
