'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../dist/小哀学习通助手.user.js'), 'utf8');
const jquery = fs.readFileSync(require.resolve('jquery'), 'utf8');

function setup(t, html = '') {
    const dom = new JSDOM(html, { url: 'https://mooc1.chaoxing.com/xiaoai-test', runScripts: 'dangerously', virtualConsole: new VirtualConsole() });
    const w = dom.window;
    t.after(() => w.close());
    const store = new Map([['chaoxing.com:GPTJsSetting.apiKey', 'test-key']]);
    w.unsafeWindow = w;
    w.GM_getValue = (key, fallback) => store.has(key) ? store.get(key) : fallback;
    w.GM_setValue = (key, value) => store.set(key, value);
    w.GM_deleteValue = key => store.delete(key);
    w.GM_info = { script: { version: '1.2.0' } };
    w.GM_getResourceText = () => '';
    w.GM_xmlhttpRequest = () => { throw new Error('Unexpected request'); };
    w.eval(jquery);
    w.eval(source);
    return { w, T: w.__XIAOAI_TEST__, store };
}
const prompt = { system: 'Connection test', user: 'Reply OK', temperature: 0 };
function respond(w, response, status = 200) {
    const calls = [];
    w.GM_xmlhttpRequest = opts => {
        calls.push(opts);
        w.queueMicrotask(() => opts.onload({ status, responseText: JSON.stringify(response) }));
        return { abort() {} };
    };
    return calls;
}
const answer = { choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }] };

for (const [base, endpoint] of [
    ['https://api.deepseek.com', 'https://api.deepseek.com/v1/chat/completions'],
    ['https://api.deepseek.com/v1/', 'https://api.deepseek.com/v1/chat/completions'],
    ['https://gateway.example/custom/v1/chat/completions/', 'https://gateway.example/custom/v1/chat/completions'],
    ['https://api.deepseek.com/beta', 'https://api.deepseek.com/beta/chat/completions'],
    ['https://gateway.example/v1/models', 'https://gateway.example/v1/chat/completions'],
    ['https://gateway.example/v1/completions', 'https://gateway.example/v1/chat/completions'],
    ['https://gateway.example/v1?route=a', 'https://gateway.example/v1/chat/completions?route=a']
]) test('兼容地址：' + base, async t => {
    const { w, T } = setup(t);
    T.setSetting('baseURL', base);
    const calls = respond(w, answer);
    assert.equal(await T.ApiClient.ask(prompt), 'OK');
    assert.equal(calls[0].url, endpoint);
    assert.equal(calls[0].anonymous, true);
});

for (const [base, endpoint] of [
    ['https://api.anthropic.com', 'https://api.anthropic.com/v1/messages'],
    ['https://api.anthropic.com/v1', 'https://api.anthropic.com/v1/messages'],
    ['https://api.anthropic.com/v1/messages', 'https://api.anthropic.com/v1/messages'],
    ['https://api.deepseek.com/anthropic', 'https://api.deepseek.com/anthropic/v1/messages']
]) test('Anthropic 地址与多内容块：' + base, async t => {
    const { w, T } = setup(t);
    T.setSetting('baseURL', base);
    const calls = respond(w, { content: [{ type: 'thinking', thinking: 'secret thought' }, { type: 'text', text: 'O' }, { type: 'text', text: 'K' }] });
    assert.equal(await T.ApiClient.ask(prompt), 'O\nK');
    assert.equal(calls[0].url, endpoint);
    assert.equal(calls[0].headers['x-api-key'], 'test-key');
    assert.equal(JSON.parse(calls[0].data).system, prompt.system);
});

test('Claude 模型经过兼容网关时保留 OpenAI 格式', async t => {
    const { w, T } = setup(t);
    T.setSetting('model', 'claude-sonnet-4-5');
    T.setSetting('baseURL', 'https://gateway.example/v1');
    const calls = respond(w, answer);
    await T.ApiClient.ask(prompt);
    assert.equal(calls[0].url, 'https://gateway.example/v1/chat/completions');
    assert.equal(calls[0].headers.Authorization, 'Bearer test-key');
});

test('官方 DeepSeek 显式控制思考模式，保留已保存模型名', async t => {
    const { w, T } = setup(t);
    T.setSetting('model', 'deepseek-v4-flash');
    let calls = respond(w, answer);
    await T.ApiClient.ask(prompt);
    assert.equal(JSON.parse(calls[0].data).thinking.type, 'disabled');
    assert.equal(JSON.parse(calls[0].data).model, 'deepseek-v4-flash');
    T.setSetting('deepseekThinking', 'true');
    calls = respond(w, answer);
    await T.ApiClient.ask(prompt);
    assert.equal(JSON.parse(calls[0].data).thinking.type, 'enabled');
});

test('OpenAI 推理模型使用 max_completion_tokens，省略自定义温度', async t => {
    const { w, T } = setup(t);
    T.setSetting('baseURL', 'https://api.openai.com/v1');
    T.setSetting('model', 'o3-mini');
    const calls = respond(w, answer);
    await T.ApiClient.ask(prompt);
    const data = JSON.parse(calls[0].data);
    assert.equal(data.max_completion_tokens, 4096);
    assert.equal(data.max_tokens, undefined);
    assert.equal(data.temperature, undefined);
    assert.equal(data.thinking, undefined);
});

test('本地 Ollama 不需要填写 API Key', async t => {
    const { w, T } = setup(t);
    T.setSetting('baseURL', 'http://127.0.0.1:11434/v1');
    T.setSetting('apiKey', '');
    const calls = respond(w, answer);
    assert.equal(await T.ApiClient.test(), 'OK');
    assert.equal(calls[0].headers.Authorization, undefined);
});

test('远程接口拒绝空 Key 与无效 URL，不发请求', async t => {
    const { w, T } = setup(t);
    const calls = respond(w, answer);
    T.setSetting('apiKey', '');
    await assert.rejects(T.ApiClient.ask(prompt), e => e.c === -10);
    T.setSetting('baseURL', 'not-a-url');
    await assert.rejects(T.ApiClient.ask(prompt), e => e.c === -11);
    assert.equal(calls.length, 0);
});

for (const response of [
    { choices: [{ message: { content: null, reasoning_content: 'A is probably correct' } }] },
    { choices: [{ message: { content: ' ' } }] },
    { choices: [{ message: { content: 'Partial answer' }, finish_reason: 'length' }] }
]) test('空白、纯思考或截断响应不得填题：' + JSON.stringify(response), async t => {
    const { w, T } = setup(t);
    respond(w, response);
    await assert.rejects(T.ApiClient.ask(prompt), e => e.c === 0 || e.c === -12);
});

test('脚本管理器同步拒绝请求时立即失败，不挂起', async t => {
    const { w, T } = setup(t);
    await assert.rejects(T.ApiClient.ask(prompt), e => e.c === -2);
});

test('429/503 重试有上限，忽略前一次请求的迟到回调', async t => {
    const { w, T } = setup(t);
    const realTimeout = w.setTimeout.bind(w);
    w.setTimeout = (fn, ms, ...args) => realTimeout(fn, ms >= 1000 && ms <= 60000 ? 0 : ms, ...args);
    let calls = 0;
    w.GM_xmlhttpRequest = opts => {
        calls++;
        const status = calls === 1 ? 429 : calls === 2 ? 503 : 200;
        w.queueMicrotask(() => {
            opts.onload({ status, responseText: JSON.stringify(answer), responseHeaders: 'Retry-After: 1' });
            if (status !== 200) opts.onerror();
        });
    };
    assert.equal(await T.ApiClient.ask(prompt), 'OK');
    assert.equal(calls, 3);
    calls = 0;
    w.GM_xmlhttpRequest = opts => {
        calls++;
        w.queueMicrotask(() => opts.onload({ status: 503, responseText: '{}' }));
    };
    await assert.rejects(T.ApiClient.ask(prompt), e => e.c === 503);
    assert.equal(calls, 3);
});

test('401 不重试', async t => {
    const { w, T } = setup(t);
    const calls = respond(w, {}, 401);
    await assert.rejects(T.ApiClient.ask(prompt), e => e.c === 401);
    assert.equal(calls.length, 1);
});

test('旧 Key 迁移后从网页存储删除，新 Key 仅写入 GM', t => {
    const { w, T, store } = setup(t);
    store.delete('chaoxing.com:GPTJsSetting.apiKey');
    w.localStorage.setItem('GPTJsSetting.apiKey', 'legacy-key');
    assert.equal(T.getSetting('apiKey'), 'legacy-key');
    assert.equal(w.localStorage.getItem('GPTJsSetting.apiKey'), null);
    T.setSetting('apiKey', 'new-key');
    assert.equal(T.getSetting('apiKey'), 'new-key');
    assert.equal(w.localStorage.getItem('GPTJsSetting.apiKey'), null);
    T.setSetting('password', 'password');
    assert.equal(w.localStorage.getItem('GPTJsSetting.password'), null);
});

test('GM 中已有新 Key 时不被旧网页 Key 覆盖', t => {
    const { w, T } = setup(t);
    w.localStorage.setItem('GPTJsSetting.apiKey', 'stale-key');
    assert.equal(T.getSetting('apiKey'), 'test-key');
    assert.equal(w.localStorage.getItem('GPTJsSetting.apiKey'), null);
});

test('正式版不记录题目调试日志', t => {
    const { w, T, store } = setup(t);
    assert.equal(T.Report.export(), null);
    T.logger('test');
    assert.equal(store.has('xiaoai_dev_log'), false);
    assert.equal(T.Report.build().meta, null);
});

test('更新比较无百位溢出，不提示旧版/预发布/恶意文本', t => {
    const { w, T } = setup(t, '<div id="ne-21notice"></div>');
    assert.equal(T.Updater._isNewer('1.100.0', '2.0.0'), false);
    assert.equal(T.Updater._isNewer('1.2.101', '1.3.0'), false);
    assert.equal(T.Updater._isNewer('v1.3.0', '1.2.0'), true);
    for (const version of ['1.1.0', '1.3.0-beta', '<img src=x onerror=alert(1)>']) {
        T.Storage.set('updateAvailable', version);
        T.Updater._renderNotice();
        assert.equal(w.document.querySelector('.xiaoai-update'), null);
        assert.equal(w.document.querySelector('img'), null);
    }
});

test('没有 Release (404) 时也限频', t => {
    const { w, T } = setup(t);
    const calls = respond(w, {}, 404);
    T.Storage.set('updateChecked', '0');
    T.Updater.check();
    T.Updater.check();
    assert.equal(calls.length, 1);
});

for (const [value, expected] of [[0, 0], [1, 1], [2, 2], [3, 3], [17, 9], [11, undefined]]) {
    test('数字题型优先于 typeFlag 和控件猜测：' + value, t => {
        const { w, T } = setup(t, '<div class="questionLi"><input name="typeFlag" value="0"><input name="type" value="0"><input id="answertype123" value="' + value + '"><textarea></textarea></div>');
        for (const adapter of [T.PhoneAdapter, T.HomeworkAdapter, T.ExamAdapter, T.ExamPreviewAdapter, T.PcQuizAdapter]) {
            assert.equal(adapter.getType(w.jQuery('.questionLi')).type, expected);
        }
    });
}

test('新版 answerBg 包装内选项能读取与点击', t => {
    const { w, T } = setup(t, '<div class="questionLi"><div class="answerBg"><span></span><div class="answer_p">正确</div></div><div class="answerBg"><span></span><div class="answer_p">错误</div></div></div>');
    const q = w.jQuery('.questionLi');
    assert.equal(T.HomeworkAdapter.getOptions(q).length, 2);
    let clicked = false;
    q.find('.answerBg').eq(1).on('click', () => { clicked = true; });
    T.HomeworkAdapter.selectOption(q, 1);
    assert.equal(clicked, true);
});

test('连接测试显示 AI 文本时不会插入 HTML', async t => {
    const { w, T } = setup(t);
    T.UIManager.init();
    respond(w, { choices: [{ message: { content: '<img src=x onerror=alert(1)>' } }] });
    w.document.getElementById('testApiBtn').click();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(w.document.querySelector('#userInfo img'), null);
    assert.match(w.document.getElementById('userInfo').textContent, /<img/);
});


test('看门狗超时会中止请求，迟到答案不算成功', async t => {
    const { w, T } = setup(t);
    const realTimeout = w.setTimeout.bind(w);
    let watchdog, aborted = false, callback;
    w.setTimeout = (fn, ms) => {
        if (ms > 60000) { watchdog = fn; return 987654; }
        return realTimeout(fn, ms);
    };
    w.GM_xmlhttpRequest = opts => { callback = opts; return { abort() { aborted = true; opts.onabort(); } }; };
    const pending = T.ApiClient.ask(prompt, 2);
    const rejected = assert.rejects(pending, e => e.c === 666);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(typeof watchdog, 'function');
    watchdog();
    callback.onload({ status: 200, responseText: JSON.stringify(answer) });
    await rejected;
    assert.equal(aborted, true);
});
