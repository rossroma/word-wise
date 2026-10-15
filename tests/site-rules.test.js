const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = vm.createContext({ window: {}, URL });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../lib/site-rules.js'), 'utf8'), context);
const { normalizeRule, matchesRule, sitePolicy } = context.window.WordwiseSiteRules;

for (const [rule, url, expected] of [
  ['example.com', 'https://example.com/story', true],
  ['example.com', 'https://news.example.com/story', true],
  ['example.com', 'https://example.com:8443/story', true],
  ['https://example.com:8443/docs/*', 'https://example.com:8443/docs/intro', true],
  ['https://example.com:8443/docs/*', 'https://example.com/docs/intro', false],
  ['example.com', 'https://notexample.com/', false],
  ['*.example.com', 'https://news.example.com/', true],
  ['*.example.com', 'https://example.com/', false],
  ['example.*', 'https://example.org/', true],
  ['*', 'https://anything.org/', false],
  ['https://*/docs/*', 'https://anything.org/docs/intro', false],
  ['https://example.com/docs/*', 'https://example.com/docs/intro', true],
  ['https://example.com/docs/*', 'http://example.com/docs/intro', false],
  ['https://example.com/docs/*', 'https://example.com/other', false],
  ['example.com', 'https://example.com.evil.org/', false],
  ['example.com', 'https://other.org/?next=example.com', false],
]) {
  assert.strictEqual(matchesRule(url, rule), expected, `${rule}: ${url}`);
}
for (const invalid of ['', '*', 'https://*', 'https://*/docs/*', 'example.com?foo=1', '.example.com', 'example..com', 'example.com/path', 'http://user@example.com', 'foo', 'example.com:65536']) {
  assert.strictEqual(normalizeRule(invalid), null, invalid);
}
assert.strictEqual(sitePolicy('https://example.com/', { autoTranslate: false, whitelist: ['example.com'] }), 'automatic');
assert.strictEqual(sitePolicy('https://example.com/', { autoTranslate: true, blacklist: ['example.com'] }), 'blocked');
assert.strictEqual(sitePolicy('https://example.com/', { autoTranslate: true, whitelist: ['*.example.com'], blacklist: ['example.com'] }), 'blocked');
assert.strictEqual(sitePolicy('https://example.com/', { autoTranslate: true, blacklist: ['*'] }), 'automatic');
assert.strictEqual(sitePolicy('https://other.org/', { autoTranslate: false }), 'manual');
console.log('Site rules: wildcard, precedence and validation passed');

async function checkContentPolicy(config, initiallyActivated, expected) {
  const messages = [];
  let listener;
  const page = vm.createContext({
    URL,
    window: { innerHeight: 800 },
    location: { href: 'https://news.example.com/story' },
    chrome: {
      storage: {
        onChanged: { addListener() {} },
        local: { get(_keys, callback) { callback({}); }, set() {} }
      },
      runtime: {
        id: 'test',
        onMessage: { addListener(fn) { listener = fn; } },
        async sendMessage(message) {
          messages.push(message);
          if (message.action === 'checkActivation') return { activated: initiallyActivated };
          if (message.action === 'getConfig') return { config };
          return { success: true };
        }
      }
    },
    document: {
      documentElement: { lang: 'en' },
      querySelectorAll(selector) { return selector === 'p' ? [{ textContent: 'This is a sufficiently long English paragraph about reading and language learning.' }] : []; },
      querySelector() { return null; },
      getElementById() { return null; },
      createTreeWalker() { return { nextNode() { return null; } }; },
      body: { appendChild() {} }
    },
    NodeFilter: { SHOW_TEXT: 4 },
    performance: { now: () => 0 },
    setTimeout() {},
    console
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../lib/site-rules.js'), 'utf8'), page);
  page.WordwiseSiteRules = page.window.WordwiseSiteRules;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../content.js'), 'utf8'), page);
  await new Promise(resolve => setImmediate(resolve));
  assert.strictEqual(vm.runInContext('isActivated', page), expected, 'initial activation');
  if (expected) assert.ok(messages.some(item => item.action === 'setActivation' && item.activated));
  if (config.blacklist?.length) {
    assert.ok(messages.some(item => item.action === 'setActivation' && !item.activated));
    assert.ok(!messages.some(item => item.action === 'translate'));
    let response;
    listener({ action: 'toggleTranslation', enabled: true }, {}, value => { response = value; });
    assert.strictEqual(response.success, false, 'blacklist rejects popup activation');
    listener({ action: 'getSitePolicy' }, {}, value => { response = value; });
    assert.strictEqual(response.policy, 'blocked', 'popup can disable controls');
  }
  if (!expected) assert.ok(!messages.some(item => item.action === 'translate'));
  return { page, listener, messages };
}

(async () => {
  await checkContentPolicy({ autoTranslate: false, whitelist: ['*.example.com'] }, false, true);
  await checkContentPolicy({ autoTranslate: true, blacklist: ['*.example.com'] }, true, false);
  const active = await checkContentPolicy({ autoTranslate: false, whitelist: ['*.example.com'] }, false, true);
  let response;
  const asyncResponse = active.listener({ action: 'toggleTranslation', enabled: false }, {}, value => { response = value; });
  assert.strictEqual(asyncResponse, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.strictEqual(response.success, true);
  assert.strictEqual(vm.runInContext('isActivated', active.page), false);
  assert.ok(active.messages.some(item => item.action === 'setActivation' && item.activated === false));
  console.log('Site rules: content script applies whitelist and blacklist before global setting');
})().catch(error => { console.error(error); process.exitCode = 1; });
