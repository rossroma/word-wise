const assert = require('assert');
const { readFileSync } = require('fs');
const path = require('path');
const vm = require('vm');

const source = readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const context = vm.createContext({
  chrome: {
    storage: { onChanged: { addListener() {} } },
    runtime: {
      id: 'test',
      onMessage: { addListener() {} },
      async sendMessage(message) {
        if (message.action === 'checkActivation') return { activated: false };
        if (message.action === 'getConfig') return { config: {} };
        return { success: true };
      }
    }
  },
  document: { documentElement: { lang: 'zh-CN' } },
  performance: { now: () => 0 },
  setTimeout: () => 0,
  console,
  window: {}
});

// A non-English page lets the content script initialize without starting translation.
vm.runInContext(source, context);
const isUsefulTranslation = vm.runInContext('isUsefulTranslation', context);

for (const [word, translation] of [
  ['Lua', 'lua'], ['DOS', 'dos'], ['Unix', 'unix'],
  ['typedefs', 'typedef'], ['dogs', 'dog'], ['dog', 'dogs'],
  ['policy', 'policies'], ['Lua', 'Lua.'], ['DOS', '“DOS”'],
  ['Unix', '"Unix"'], ['water', '  '], ['water', null]
]) {
  assert.strictEqual(isUsefulTranslation(word, translation), false, `${word} → ${translation}`);
}

for (const [word, translation] of [
  ['Lua', '卢阿'], ['Unix', 'Unix 系统'], ['apple', '苹果'],
  ['bank', 'shore'], ['rose', 'rise']
]) {
  assert.strictEqual(isUsefulTranslation(word, translation), true, `${word} → ${translation}`);
}

console.log('Translation display filter: all cases passed');
