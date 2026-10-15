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

const collector = [];
const node = { textContent: 'int32_t 32-bit 64-bit UTF-8 PDP-11 _int int_private curiouser-version2 curiouser-phrase curiouser’s int, curiouser', parentElement: {} };
const parent = { replaceChild(fragment) { collector.push(fragment); } };
node.parentNode = parent;
context.NodeFilter = { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 };
context.document = {
  body: {},
  documentElement: { lang: 'zh-CN' },
  createTreeWalker() { let read = false; return { nextNode() { if (read) return null; read = true; return node; } }; },
  createDocumentFragment() { return { children: [], appendChild(child) { this.children.push(child); } }; },
  createTextNode(text) { return { textContent: text }; },
  createElement() { return { children: [], appendChild(child) { this.children.push(child); }, set textContent(value) { this.children.push({ textContent: value }); } }; },
  querySelectorAll() { return []; }
};
vm.runInContext('injectTranslations({ int: "integer", bit: "位", utf: "编码", pdp: "计算机", curiouser: "更好奇" })', context);
assert.strictEqual(collector.length, 1);
const wrapped = collector[0].children.filter(child => child.className === 'zhiyi-word');
assert.deepStrictEqual(wrapped.map(span => span.children[0].textContent), ['int', 'curiouser']);
console.log('Translation injection: code identifiers left untouched');
