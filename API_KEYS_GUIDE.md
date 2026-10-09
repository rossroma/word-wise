# 智译 · 翻译引擎 Key 申请与测试指南

本文档说明每个翻译引擎如何申请所需凭据、在插件的设置页里怎么填,以及如何逐一切换测试。

> 免费额度与接口随时可能调整,以各官网为准。文中的模型名/地址为示例,如失效请查对应官方文档。

---

## 1. 引擎概览

插件设置页「翻译引擎」下拉里有四个选项:

| 下拉选项 | 对应引擎 | 是否免费 | 需要准备 |
| --- | --- | --- | --- |
| 自动 | 按质量优先:LLM > DeepL > Chrome 兜底 | 视情况 | 配好任一引擎(否则回退 Chrome) |
| Chrome 内置离线翻译 | 浏览器内置(本地) | 免费 | 无需 Key,需 Chrome 138+ |
| DeepL | DeepL API | 有免费额度 | DeepL API Key |
| LLM（OpenAI 兼容） | OpenAI 及任意兼容接口 | 视供应商 | API Key + 基地址 + 模型名 |

最省事、零成本的组合:直接用「自动」或「Chrome 内置离线翻译」。想对比质量再逐一切换云端。

---

## 2. Chrome 内置离线翻译(无需 Key)

- **要求**:Chrome 138 及以上(桌面版)。
- **配置**:设置页选「Chrome 内置离线翻译」,无需填任何字段。
- **首次使用**:浏览器会自动下载英→中的语言包,第一次可能稍慢。
- **验证是否可用**:打开任意页面按 F12,在页面控制台执行:

  ```js
  typeof Translator            // "function" 表示可用
  Translator.availability({ sourceLanguage: 'en', targetLanguage: 'zh' })
  // "available" 可直接用;"downloadable" 需下载;不可用则为 "unavailable"
  ```

---

## 3. DeepL(每月 50 万字符免费)

1. 打开 <https://www.deepl.com/pro-api>。
2. 选择 **DeepL API Free**(免费版),按流程注册(需要邮箱;部分地区可能要求绑定支付方式用于身份验证,但 Free 版不扣费)。
3. 进入账户页 → **API 密钥 / Authentication Key**,复制密钥。
4. Free 版密钥以 **`:fx`** 结尾(形如 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx`)。
5. 插件设置页:选「DeepL」,把密钥填入「DeepL API Key」,保存。

插件会自动识别:密钥以 `:fx` 结尾走免费接口 `api-free.deepl.com`,否则走 `api.deepl.com`,无需手动切换。

---

## 4. LLM(OpenAI 兼容接口)

这一项是通用的:只要供应商提供 OpenAI 兼容的 `/chat/completions`,填 **地址 + 模型名 + Key** 即可。下表是常见选择。

### 4.1 OpenAI(官方,付费)

- 申请:<https://platform.openai.com/api-keys> → Create new secret key。
- 需先在 Billing 充值(新账号可能无免费额度)。
- 设置页填写:
  - API Key:`sk-...`
  - API 基地址:`https://api.openai.com/v1`
  - 模型名称:`gpt-4o-mini`(便宜且够用)

### 4.2 Google Gemini(有免费额度,推荐用于零成本测试)

- 申请:<https://aistudio.google.com/apikey> → Create API key。
- 设置页填写:
  - API Key:Gemini 的 Key
  - API 基地址:`https://generativelanguage.googleapis.com/v1beta/openai`
  - 模型名称:`gemini-2.0-flash`(以官方当前可用模型为准)

### 4.3 Groq(有免费额度)

- 申请:<https://console.groq.com/keys>。
- 设置页填写:
  - API Key:`gsk_...`
  - API 基地址:`https://api.groq.com/openai/v1`
  - 模型名称:`llama-3.3-70b-versatile`(以官方当前模型为准)

### 4.4 OpenRouter(有免费模型)

- 申请:<https://openrouter.ai/keys>。
- 设置页填写:
  - API Key:`sk-or-...`
  - API 基地址:`https://openrouter.ai/api/v1`
  - 模型名称:带 `:free` 后缀的模型,如 `meta-llama/llama-3.3-70b-instruct:free`

### 4.5 其它兼容供应商

Cerebras(`https://api.cerebras.ai/v1`)、Mistral(`https://api.mistral.ai/v1`)等只要兼容 OpenAI 接口,按同样方式填「基地址 + 模型名 + Key」。具体地址与模型名见各自官方文档。

> 注意:插件的「API 基地址」应填到 `.../v1`(或供应商给出的 OpenAI 兼容根路径),**不要带斜杠结尾,也不要带 `/chat/completions`**,插件会自动补上。

---

## 5. 逐引擎测试清单

按下面步骤逐个切换,确认每个引擎都能通:

1. 在 `chrome://extensions` 里点智译的「重新加载」,确保用的是最新代码。
2. 打开设置页,选一个引擎,填好对应字段,点「保存设置」。
3. **切换引擎对比前,先点设置页的「清除翻译缓存」**,否则会命中上一个引擎的旧结果,看起来像"换了引擎但译文没变"。
4. 打开一个英文页面,点插件图标开启翻译。
5. 按 F12 看页面控制台,确认有一行:

   ```
   🔌 [智译] 实际执行引擎: <引擎名称>（缓存命中 N，实际调用 M，分 P 批）
   ```

   - **实际调用 M** 才是真正发出去的请求数;若 `M = 0`,说明这次全部命中了缓存,并没有真的调用任何引擎。
   - 也可以输入 `zhiyiDebug.lastTranslation` 查看结构化信息:`{ provider, pages, cacheHits, translated, total }`。
6. 进一步排查可打开 Service Worker 控制台:`chrome://extensions` → 智译 → 「服务工作进程」→ 检查视图,那里会打印 `[智译] 实际引擎=<key> 目标语言=... 缓存命中=N 实际调用=M 共=T`。

> 缓存键已包含「引擎 + 目标语言」,因此切换引擎不会串用旧结果;但要看到真实调用,**首次切换仍需清一次缓存**(或换一个没翻过的页面)。

对照检查表:

| 引擎 | 保存时的必填项 | 预期日志 |
| --- | --- | --- |
| Chrome 内置离线 | 无 | `Chrome 内置离线翻译（免费）` |
| DeepL | DeepL API Key | `DeepL（云端）` |
| LLM | API Key | `LLM（OpenAI 兼容）` |

---

## 6. 常见报错

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `当前环境不支持 Chrome 内置翻译` | 浏览器版本过低或未启用 | 升级到 Chrome 138+;或改用其它引擎 |
| `请先在设置中配置 API Key` | LLM 引擎未填 Key | 补填并保存 |
| `DeepL 请求失败 (403)` | Key 不是 `:fx` 却走了免费接口,或额度用尽 | 核对 Key 后缀与额度 |
| LLM 返回乱码或空 | 模型名/基地址不匹配 | 核对供应商的基地址与模型名 |
| 一直没出现 `🔌` 那行 | 扩展未重新加载,或页面未触发翻译 | 重新加载扩展再试 |

---

## 7. 备注

- 文中免费额度、模型名、接口地址会随供应商调整,以官方页面为准。
- 「自动」模式的优先级按翻译质量:LLM > DeepL > Chrome 内置兜底。想让离线优先,请手动选「Chrome 内置离线翻译」。
- 所有 Key 仅保存在浏览器本地(`chrome.storage`),不会上传到任何第三方服务器。
