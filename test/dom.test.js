/* =============================================================================
 *  小哀学习通助手 — 模拟 DOM 端到端测试（jsdom + jQuery）
 *  运行: node build.js && node test/dom.test.js
 *  通过 jsdom 模拟学习通页面，验证适配器 + 作答引擎 + 答案写入的真实行为
 * ============================================================================= */
'use strict';

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const builtFile = path.join(__dirname, '../dist/小哀学习通助手.user.js');
const jquerySrc = fs.readFileSync(require.resolve('jquery'), 'utf8');
const scriptSrc = fs.readFileSync(builtFile, 'utf8');

let passed = 0, failed = 0;

function test(name, fn) {
    return Promise.resolve()
        .then(fn)
        .then(function () { passed++; console.log('  ✓ ' + name); })
        .catch(function (e) { failed++; console.error('  ✗ ' + name); console.error('    ' + (e && e.stack || e)); });
}

// 创建带学习通作业页 DOM 的 jsdom 窗口
function makeWindow(bodyHtml, pathname, devMode) {
    const dom = new JSDOM('<!DOCTYPE html><html><body>' + (bodyHtml || '') + '</body></html>', {
        url: 'https://mooc1.chaoxing.com' + (pathname || '/'),
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        resources: 'usable'
    });
    const win = dom.window;
    // 覆盖 URL（pathname）
    win.history.replaceState({}, '', (pathname || '/'));
    // GM 桩
    const store = {};
    win.GM_getValue = function (k, d) { return (k in store) ? store[k] : d; };
    win.GM_setValue = function (k, v) { store[k] = v; };
    win.GM_deleteValue = function (k) { delete store[k]; };
    win.GM_info = { script: { version: 'test' } };
    win.GM_getResourceText = function () { return null; };
    // 默认 GM_xmlhttpRequest：返回空（测试中可覆盖）
    win.GM_xmlhttpRequest = function () { throw new Error('GM_xmlhttpRequest 未在测试中 mock'); };
    win.unsafeWindow = win;
    // 预置 API 配置（通过 localStorage，Storage 会回退读取）
    win.localStorage.setItem('GPTJsSetting.apiKey', 'sk-test-key');
    win.localStorage.setItem('GPTJsSetting.baseURL', 'https://api.deepseek.com');
    win.localStorage.setItem('GPTJsSetting.model', 'deepseek-v4-flash');
    // 开发模式：脚本加载前设置
    if (devMode) win.__XIAOAI_DEV_MODE__ = true;
    // 加载 jQuery
    win.eval(jquerySrc);
    // 运行脚本
    win.eval(scriptSrc);
    return win;
}

// 让 AI 返回指定内容的 GM mock
function mockAI(win, contents) {
    let idx = 0;
    win.GM_xmlhttpRequest = function (opts) {
        const content = Array.isArray(contents) ? contents[Math.min(idx++, contents.length - 1)] : contents;
        const body = { choices: [{ message: { content: content } }] };
        setTimeout(function () {
            opts.onload({ status: 200, responseText: JSON.stringify(body) });
        }, 5);
    };
}

// 等待 Promise 完成（processOne 内部有 setTimeout）
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* ============================================================ */
async function main() {
    console.log('\n===== 作业单选题 端到端 =====\n');
    await test('单选：AI返回JSON，选中正确选项', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="单选题">' +
            '<h3 class="mark_name">(单选题 2.0分) 下列属于网络协议的是？</h3>' +
            '<div class="stem_answer">' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">TCP/IP协议</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">UDP协议</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">HTTP协议</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">FTP协议</div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        // 点击监听
        win.document.querySelectorAll('.wrap').forEach(function (el, i) {
            el.addEventListener('click', function () { el.setAttribute('data-clicked', String(i)); });
        });
        mockAI(win, '{"answer":"UDP协议","answers":["UDP协议"]}');
        const T = win.__XIAOAI_TEST__;
        if (!T) throw new Error('测试钩子未挂载');
        const $timu = win.jQuery('.questionLi');
        const r = await T.QuizEngine.processOne(0, 1, $timu, T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功: ' + r.reason);
        const clicked = win.document.querySelector('.wrap[data-clicked]');
        if (!clicked) throw new Error('没有选项被点击');
        if (clicked.textContent.indexOf('UDP协议') === -1) throw new Error('点击了错误选项: ' + clicked.textContent);
    });

    await test('单选：AI返回字母，选中正确选项', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="单选题">' +
            '<h3 class="mark_name">(单选题) 哪个是HTTP？</h3>' +
            '<div class="stem_answer">' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">TCP协议</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">UDP协议</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">HTTP协议</div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        win.document.querySelectorAll('.wrap').forEach(function (el, i) {
            el.addEventListener('click', function () { el.setAttribute('data-clicked', String(i)); });
        });
        mockAI(win, '{"answer":"C","answers":["C"]}');
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        const clicked = win.document.querySelector('.wrap[data-clicked]');
        if (!clicked || clicked.textContent.indexOf('HTTP协议') === -1) throw new Error('点击了错误选项');
    });

    await test('单选：纯文本答案（无JSON），去标点匹配', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="单选题">' +
            '<h3 class="mark_name">(单选题) 传输层协议？</h3>' +
            '<div class="stem_answer">' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">TCP/IP协议</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">UDP/IP协议</div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        win.document.querySelectorAll('.wrap').forEach(function (el, i) {
            el.addEventListener('click', function () { el.setAttribute('data-clicked', String(i)); });
        });
        win.localStorage.setItem('GPTJsSetting.jsonMode', 'false'); // 关闭 JSON 模式
        mockAI(win, '答案：TCPIP协议');
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        const clicked = win.document.querySelector('.wrap[data-clicked]');
        if (!clicked || clicked.textContent.indexOf('TCP/IP') === -1) throw new Error('点击了错误选项');
    });

    console.log('\n===== 多选题 端到端 =====\n');
    await test('多选：AI返回多个文本，全部选中', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="多选题">' +
            '<h3 class="mark_name">(多选题 3.0分) 传输层协议包括？</h3>' +
            '<div class="stem_answer">' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">TCP/IP协议</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">UDP协议</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">HTTP协议</div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        win.document.querySelectorAll('.wrap').forEach(function (el, i) {
            el.addEventListener('click', function () { el.setAttribute('data-clicked', String(i)); });
        });
        mockAI(win, '{"answer":"TCP/IP协议|UDP协议","answers":["TCP/IP协议","UDP协议"]}');
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        const clicked = Array.prototype.map.call(win.document.querySelectorAll('.wrap[data-clicked]'), function (el) { return el.textContent; });
        if (clicked.length !== 2) throw new Error('应选中2个，实际 ' + JSON.stringify(clicked));
        if (clicked[0].indexOf('TCP/IP') === -1 || clicked[1].indexOf('UDP') === -1) throw new Error('选错: ' + JSON.stringify(clicked));
    });

    console.log('\n===== 判断题 端到端 =====\n');
    await test('判断：AI返回"正确"，选中"对"', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="判断题">' +
            '<h3 class="mark_name">(判断题 2.0分) TCP是可靠的传输协议</h3>' +
            '<div class="stem_answer">' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">正确</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">错误</div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        win.document.querySelectorAll('.wrap').forEach(function (el, i) {
            el.addEventListener('click', function () { el.setAttribute('data-clicked', String(i)); });
        });
        mockAI(win, '{"answer":"正确","answers":["正确"]}');
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        const clicked = win.document.querySelector('.wrap[data-clicked]');
        if (!clicked || clicked.textContent.indexOf('正确') === -1) throw new Error('点击了错误选项');
    });

    console.log('\n===== 填空题 端到端 =====\n');
    await test('填空：AI返回"北京|上海"，填入两个空', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="填空题">' +
            '<h3 class="mark_name">(填空题) 中国的首都是____，最大的城市是____</h3>' +
            '<div class="stem_answer">' +
            '<textarea name="answerEditor101"></textarea>' +
            '<textarea name="answerEditor102"></textarea>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        mockAI(win, '{"answer":"北京|上海","answers":["北京","上海"]}');
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        const tas = win.document.querySelectorAll('textarea[name^="answerEditor"]');
        if (tas[0].value !== '北京') throw new Error('第一空填错: "' + tas[0].value + '"');
        if (tas[1].value !== '上海') throw new Error('第二空填错: "' + tas[1].value + '"');
    });

    console.log('\n===== 简答题 端到端（拟学生语言） =====\n');
    await test('简答：AI返回正文，填入textarea', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="简答题">' +
            '<h3 class="mark_name">(简答题) 简述TCP三次握手过程</h3>' +
            '<div class="stem_answer"><textarea name="answerEditor1"></textarea></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        mockAI(win, '客户端先发SYN，服务端回SYN+ACK，客户端再确认，连接就建立了。');
        const T = win.__XIAOAI_TEST__;
        // 捕获实际发给 AI 的 prompt，验证拟学生语言
        win.__XIAOAI_PROMPTS__ = [];
        const orig = win.GM_xmlhttpRequest;
        win.GM_xmlhttpRequest = function (opts) {
            const data = JSON.parse(opts.data);
            win.__XIAOAI_PROMPTS__.push(data);
            orig(opts);
        };
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        const ta = win.document.querySelector('textarea');
        if (ta.value.indexOf('SYN') === -1) throw new Error('答案未填入');
        // 验证 prompt 里的学生口吻要求
        const systemText = win.__XIAOAI_PROMPTS__[0].messages[0].content;
        if (systemText.indexOf('普通学生') === -1) throw new Error('主观题未使用学生口吻 prompt');
        if (systemText.indexOf('套话') === -1) throw new Error('未要求避免套话');
    });

    console.log('\n===== 编程题 端到端 =====\n');
    await test('编程：CodeMirror填充+提交', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="编程题">' +
            '<h3 class="mark_name">(编程题) 用Python实现斐波那契数列</h3>' +
            '<div class="stem_answer">' +
            '<div class="CodeMirror"></div>' +
            '<button type="button">提交答案</button>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        // 模拟 CodeMirror 实例
        let cmValue = '';
        win.document.querySelector('.CodeMirror').CodeMirror = {
            setValue: function (v) { cmValue = v; }
        };
        // 追踪提交按钮
        let submitted = false;
        win.document.querySelector('button').addEventListener('click', function () { submitted = true; });
        mockAI(win, '```python\ndef fib(n):\n    return n\n```');
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功: ' + r.reason);
        if (cmValue.indexOf('def fib') === -1) throw new Error('代码未填入 CodeMirror');
        await wait(50);
        if (!submitted) throw new Error('提交按钮未被点击');
    });

    console.log('\n===== 手机版测验（PhoneAdapter） =====\n');
    await test('手机版：单选点击aria-label目标', async function () {
        const body = '<form class="Wrappadding"><div class="zquestions">' +
            '<div class="Py-mian1"><div class="Py-m1-title">1. [单选题] 哪个协议无连接？</div>' +
            '<div class="answerList singleChoice">' +
            '<li><span>TCP/IP协议</span></li>' +
            '<li><span>UDP协议</span></li>' +
            '</div></div></div></form>';
        const win = makeWindow(body, '/work/phone/work?workId=1');
        const T = win.__XIAOAI_TEST__;
        win.document.querySelectorAll('.answerList li').forEach(function (el, i) {
            el.addEventListener('click', function () { el.setAttribute('data-clicked', String(i)); });
        });
        mockAI(win, '{"answer":"UDP协议","answers":["UDP协议"]}');
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.Py-mian1'), T.PhoneAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        const clicked = win.document.querySelector('.answerList li[data-clicked]');
        if (!clicked || clicked.textContent.indexOf('UDP') === -1) throw new Error('点击了错误选项');
    });

    await test('手机版：UEditor填空（mock UE）', async function () {
        const body = '<form class="Wrappadding"><div class="zquestions">' +
            '<div class="Py-mian1"><div class="Py-m1-title">2. [填空题] 中国的首都是____</div>' +
            '<div data-editorindex="0" data-itemid="123"><textarea id="answer123"></textarea></div>' +
            '</div></div></form>';
        const win = makeWindow(body, '/work/phone/work?workId=1');
        const T = win.__XIAOAI_TEST__;
        // 模拟 contextWindow.editors
        win.editors = [{ ueditor: { setContent: function (v) { win.__ueditorVal = v; } } }];
        mockAI(win, '{"answer":"北京","answers":["北京"]}');
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.Py-mian1'), T.PhoneAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        await wait(400); // 等待 setTimeout 填充
        if (win.__ueditorVal !== '北京') throw new Error('UEditor 未填入: ' + win.__ueditorVal);
        if (win.document.querySelector('#answer123').value !== '北京') throw new Error('隐藏 textarea 未同步');
    });

    console.log('\n===== 答案匹配失败兜底 =====\n');
    await test('匹配失败：不自动提交且不崩溃', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="单选题">' +
            '<h3 class="mark_name">(单选题) 未知题</h3>' +
            '<div class="stem_answer"><div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">选项A</div></div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        mockAI(win, '完全无关的答案XYZ');
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (r.success) throw new Error('本应失败却成功');
        if (r.reason !== 'match_failed' && r.reason !== 'api_error') throw new Error('reason 异常: ' + r.reason);
    });

    console.log('\n===== 视频弹题 =====\n');
    await test('视频弹题：AI作答+提交', async function () {
        const body = '<div id="video"><div class="ans-videoquiz">' +
            '<div class="ans-videoquiz-title">视频中途的题目：传输层协议是？</div>' +
            '<div class="ans-videoquiz-opt"><label><input type="radio" name="q1"><span>TCP/IP协议</span></label></div>' +
            '<div class="ans-videoquiz-opt"><label><input type="radio" name="q1"><span>UDP协议</span></label></div>' +
            '<button id="videoquiz-submit">提交</button>' +
            '</div></div>';
        const win = makeWindow(body, '/knowledge/cards?courseid=1');
        const T = win.__XIAOAI_TEST__;
        // 模拟 video
        const media = {
            paused: true, play: function () { this.paused = false; return Promise.resolve(); }
        };
        win.document.querySelectorAll('.ans-videoquiz-opt label').forEach(function (el, i) {
            el.addEventListener('click', function () { el.setAttribute('data-clicked', String(i)); });
        });
        mockAI(win, '{"answer":"UDP协议","answers":["UDP协议"]}');
        T.VideoQuizHandler.handle(win.document, media, '测试视频');
        await wait(300);
        const clicked = win.document.querySelector('.ans-videoquiz-opt label[data-clicked]');
        if (!clicked || clicked.textContent.indexOf('UDP') === -1) throw new Error('弹题未选中 UDP');
    });

    console.log('\n===== 复合大题（阅读理解） =====\n');
    await test('阅读理解：子题递归作答', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="阅读理解">' +
            '<h3 class="mark_name">(阅读理解 4.0分) 阅读文章，回答问题</h3>' +
            '<div class="reading_answer" qtype="0">' +
            '<div class="reader_answer_tit">(1) 文中提到的无连接协议是？</div>' +
            '<div class="answerBg"><div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">TCP协议</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">UDP协议</div></div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        const T = win.__XIAOAI_TEST__;
        win.document.querySelectorAll('.answerBg .wrap').forEach(function (el, i) {
            el.addEventListener('click', function () { el.setAttribute('data-clicked', String(i)); });
        });
        mockAI(win, '{"answer":"UDP协议","answers":["UDP协议"]}');
        const $list = win.jQuery('.questionLi');
        await new Promise(function (resolve) {
            T.Router._processQuestionList($list, T.HomeworkAdapter, { onDone: resolve });
        });
        const clicked = win.document.querySelector('.answerBg .wrap[data-clicked]');
        if (!clicked || clicked.textContent.indexOf('UDP') === -1) throw new Error('子题未正确作答');
    });

    console.log('\n===== 本地答案缓存 =====\n');
    await test('相同题目第二次命中缓存，不重复调用 AI', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="单选题">' +
            '<h3 class="mark_name">(单选题) 缓存测试题</h3>' +
            '<div class="stem_answer">' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">选项甲</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">选项乙</div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/xiaoai-test');
        const T = win.__XIAOAI_TEST__;
        let aiCalls = 0;
        win.GM_xmlhttpRequest = function (opts) {
            if (opts.url.indexOf('chat/completions') !== -1 || opts.url.indexOf('/messages') !== -1) {
                aiCalls++;
            }
            const content = '{"answer":"选项甲","answers":["选项甲"]}';
            const b = { choices: [{ message: { content: content } }] };
            setTimeout(function () { opts.onload({ status: 200, responseText: JSON.stringify(b) }); }, 5);
        };
        const $list = win.jQuery('.questionLi');
        // 第一次作答
        await T.QuizEngine.processOne(0, 1, $list, T.HomeworkAdapter, {});
        if (aiCalls !== 1) throw new Error('首次应调用1次AI，实际 ' + aiCalls);
        // 第二次作答（相同题目）
        await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (aiCalls !== 1) throw new Error('第二次应命中缓存不调用AI，实际调用 ' + aiCalls);
    });

    console.log('\n===== 修复回归测试 =====\n');
    await test('getAnswer：JSON模式 400 时降级为纯文本重试', async function () {
        const win = makeWindow('<div></div>', '/xiaoai-test');
        const T = win.__XIAOAI_TEST__;
        win.localStorage.setItem('GPTJsSetting.jsonMode', 'true');
        let call = 0;
        win.GM_xmlhttpRequest = function (opts) {
            call++;
            if (call === 1) {
                // 第一次：400
                setTimeout(function () { opts.onload({ status: 400, responseText: '{"error":"bad request"}' }); }, 5);
            } else {
                // 第二次：200 纯文本
                const b = { choices: [{ message: { content: 'UDP协议' } }] };
                setTimeout(function () { opts.onload({ status: 200, responseText: JSON.stringify(b) }); }, 5);
            }
        };
        const p = T.Core.PromptBuilder.build({ type: 0, typeName: '单选题', question: '测试', options: ['TCP协议', 'UDP协议'] });
        const ans = await T.getAnswer(0, p);
        if (ans !== 'UDP协议') throw new Error('降级重试未得到答案: ' + ans);
        if (call < 2) throw new Error('应重试一次');
    });

    await test('视频弹题：第一次答错后第二次走排除法', async function () {
        const body = '<div id="video"><div class="ans-videoquiz">' +
            '<div class="ans-videoquiz-title">传输层协议是？</div>' +
            '<div class="ans-videoquiz-opt"><label><input type="radio" name="q1"><span>TCP/IP协议</span></label></div>' +
            '<div class="ans-videoquiz-opt"><label><input type="radio" name="q1"><span>UDP协议</span></label></div>' +
            '<button id="videoquiz-submit">提交</button></div></div>';
        const win = makeWindow(body, '/xiaoai-test');
        const T = win.__XIAOAI_TEST__;
        // AI 第一次答错（返回 TCP/IP，但正确答案是 UDP）
        let aiAnswer = '{"answer":"TCP/IP协议","answers":["TCP/IP协议"]}';
        win.GM_xmlhttpRequest = function (opts) {
            const b = { choices: [{ message: { content: aiAnswer } }] };
            setTimeout(function () { opts.onload({ status: 200, responseText: JSON.stringify(b) }); }, 5);
        };
        const clicks = [];
        win.document.querySelectorAll('.ans-videoquiz-opt label').forEach(function (el, i) {
            el.addEventListener('click', function () { clicks.push(i); });
        });
        const media = { paused: true, play: function () { this.paused = false; return Promise.resolve(); } };
        // 第一次处理：AI 答错
        T.VideoQuizHandler.handle(win.document, media, '测试');
        await wait(400);
        // 模拟"提交后答错"——移除 processing 状态，容器仍在
        const container = win.document.querySelector('.ans-videoquiz');
        container.removeAttribute('data-xiaoai-status');
        // 记录里应有第一次尝试
        const rec = win._xiaoaiFailedQuizzes && win._xiaoaiFailedQuizzes['传输层协议是？'];
        if (!rec) throw new Error('未记录失败状态');
        // 第二次处理：应走排除法选另一个（UDP）
        T.VideoQuizHandler.handle(win.document, media, '测试');
        await wait(400);
        if (clicks.length < 2) throw new Error('应有两次点击，实际 ' + clicks.length + ' 次: ' + JSON.stringify(clicks));
        const lastIdx = clicks[clicks.length - 1];
        const lastLabel = win.document.querySelectorAll('.ans-videoquiz-opt label')[lastIdx];
        if (lastLabel.textContent.indexOf('UDP') === -1) throw new Error('排除法应改选 UDP，实际最后选: ' + lastLabel.textContent + ' (点击序列 ' + JSON.stringify(clicks) + ')');
    });

    console.log('\n===== 简答题两段式 =====\n');
    await test('简答两段式：草稿→誊抄→提取【答案】标记内容填入', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="简答题"><h3 class="mark_name">(简答题) 计算寻道时间</h3>' +
            '<div class="stem_answer"><textarea name="answerEditor1"></textarea></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/mooc2/work/dowork?courseid=1');
        let calls = 0;
        const contents = [
            // 第一段：推理泄出的草稿
            '我们只需要输出答案正文。需要计算寻道时间。从柱面20开始，请求序列10,22,20,2,40,6,38。先来先服务按到达顺序...（大段思考）',
            // 第二段：AI 自定格式 + 标记
            '整理如下：\n【答案】\n(1) 先来先服务：10,22,20\n(2) 电梯算法：20,22,38\n【/答案】\n以上就是最终答案'
        ];
        win.GM_xmlhttpRequest = function (opts) {
            calls++;
            const b = { choices: [{ message: { content: contents[Math.min(calls - 1, contents.length - 1)] } }] };
            setTimeout(function () { opts.onload({ status: 200, responseText: JSON.stringify(b) }); }, 5);
        };
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        if (calls !== 2) throw new Error('两段式应调用2次API，实际 ' + calls);
        const ta = win.document.querySelector('textarea');
        const val = ta.value;
        // 应填入标记内的内容（干净、分点、带换行），而不是推理草稿
        if (val.indexOf('(1) 先来先服务') === -1) throw new Error('未填入标记内答案: ' + val);
        if (val.indexOf('我们只需要输出答案正文') !== -1) throw new Error('推理草稿被填进去了!');
        if (val.indexOf('【答案】') !== -1) throw new Error('标记本身被填入!');
        if (val.indexOf('\n') === -1) throw new Error('分点换行丢失: ' + JSON.stringify(val));
    });

    await test('简答两段式：第二段失败退回第一段草稿', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="简答题"><h3 class="mark_name">(简答题) 名词解释</h3>' +
            '<div class="stem_answer"><textarea name="answerEditor1"></textarea></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/mooc2/work/dowork?courseid=1');
        let calls = 0;
        win.GM_xmlhttpRequest = function (opts) {
            calls++;
            if (calls === 1) {
                const b = { choices: [{ message: { content: '进程是程序的一次执行过程，是系统进行资源分配的基本单位。' } }] };
                setTimeout(function () { opts.onload({ status: 200, responseText: JSON.stringify(b) }); }, 5);
            } else {
                // 第二段失败：返回 500
                setTimeout(function () { opts.onload({ status: 500, responseText: 'error' }); }, 5);
            }
        };
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        const ta = win.document.querySelector('textarea');
        if (ta.value.indexOf('进程是程序的一次执行过程') === -1) throw new Error('未退回第一段草稿: ' + ta.value);
    });

    await test('简答：第二段整理溢出无标记→自动重试→成功', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="简答题"><h3 class="mark_name">(简答题) 统考真题</h3>' +
            '<div class="stem_answer"><textarea name="answerEditor1"></textarea></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/mooc2/work/dowork?courseid=1');
        let calls = 0;
        const contents = [
            // 第一段草稿（干净）
            '操作顺序：用户输入⑥→中断④→字符读入③→进程插入就绪队列①→系统调用返回⑤。',
            // 第二段第一次：又去思考了（真实Q6场景），无标记
            '我们 need produce final answer in Chinese, within tags. Need answer based on analysis. Let us deeply reason to ensure correctness...',
            // 第二段重试：成功给出标记
            '整理：\n【答案】\n1) 操作①前一个③后一个⑤；操作⑥后一个④。\n2) 操作②后CPU切换到其他进程。\n【/答案】'
        ];
        win.GM_xmlhttpRequest = function (opts) {
            calls++;
            const b = { choices: [{ message: { content: contents[Math.min(calls - 1, contents.length - 1)] } }] };
            setTimeout(function () { opts.onload({ status: 200, responseText: JSON.stringify(b) }); }, 5);
        };
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('重试后应成功');
        if (calls !== 3) throw new Error('草稿+2次整理应调用3次，实际 ' + calls);
        const ta = win.document.querySelector('textarea');
        if (ta.value.indexOf('操作①前一个③') === -1) throw new Error('重试后未填入标记答案: ' + ta.value);
        if (ta.value.indexOf('deeply reason') !== -1) throw new Error('思考被填入!');
    });

    await test('简答：第二段两次都溢出→退回草稿', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="简答题"><h3 class="mark_name">(简答题) 名词解释</h3>' +
            '<div class="stem_answer"><textarea name="answerEditor1"></textarea></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/mooc2/work/dowork?courseid=1');
        let calls = 0;
        win.GM_xmlhttpRequest = function (opts) {
            calls++;
            const b = { choices: [{ message: { content: calls === 1 ? '进程是程序的一次执行过程，是系统进行资源分配的基本单位。' : '我们只需要输出最终答案。需要重新分析。让我想想...' } }] };
            setTimeout(function () { opts.onload({ status: 200, responseText: JSON.stringify(b) }); }, 5);
        };
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        if (calls !== 3) throw new Error('草稿+2次整理应调用3次，实际 ' + calls);
        const ta = win.document.querySelector('textarea');
        if (ta.value.indexOf('进程是程序的一次执行过程') === -1) throw new Error('应退回干净草稿: ' + ta.value);
        if (ta.value.indexOf('让我想想') !== -1) throw new Error('思考被填入!');
    });

    console.log('\n===== AI 确认投票 =====\n');
    await test('AI 确认投票：问2次取多数，选正确选项', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="单选题"><h3 class="mark_name">(单选题) 传输层协议？</h3>' +
            '<div class="stem_answer">' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">TCP协议</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">UDP协议</div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/mooc2/work/dowork?courseid=1');
        win.localStorage.setItem('GPTJsSetting.aiVote', '1'); // 问 2 次
        let calls = 0;
        const answers = ['{"answer":"UDP协议","answers":["UDP协议"]}', '{"answer":"UDP协议","answers":["UDP协议"]}'];
        win.GM_xmlhttpRequest = function (opts) {
            calls++;
            const content = answers[Math.min(calls - 1, answers.length - 1)];
            const b = { choices: [{ message: { content: content } }] };
            setTimeout(function () { opts.onload({ status: 200, responseText: JSON.stringify(b) }); }, 5);
        };
        win.document.querySelectorAll('.wrap').forEach(function (el, i) {
            el.addEventListener('click', function () { el.setAttribute('data-clicked', String(i)); });
        });
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        if (calls < 2) throw new Error('确认模式应询问2次，实际 ' + calls + ' 次');
        const clicked = win.document.querySelector('.wrap[data-clicked]');
        if (!clicked || clicked.textContent.indexOf('UDP') === -1) throw new Error('投票未选中 UDP');
    });

    await test('多选投票：收集全部多数选项（真实Q60场景）', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="多选题"><h3 class="mark_name">(多选题) 改善磁盘I/O性能的是？</h3>' +
            '<div class="stem_answer">' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">重排I/O请求次序</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">在一个磁盘上设置多个分区</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">预读和滞后写</div></div>' +
            '<div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">优化文件物理块的分布</div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/mooc2/work/dowork?courseid=1');
        win.localStorage.setItem('GPTJsSetting.aiVote', '1'); // 问 2 次
        let calls = 0;
        const answer = '{"answer":"重排I/O请求次序|预读和滞后写|优化文件物理块的分布","answers":["重排I/O请求次序","预读和滞后写","优化文件物理块的分布"]}';
        win.GM_xmlhttpRequest = function (opts) {
            calls++;
            const b = { choices: [{ message: { content: answer } }] };
            setTimeout(function () { opts.onload({ status: 200, responseText: JSON.stringify(b) }); }, 5);
        };
        win.document.querySelectorAll('.wrap').forEach(function (el, i) {
            el.addEventListener('click', function () { el.setAttribute('data-clicked', String(i)); });
        });
        const T = win.__XIAOAI_TEST__;
        const r = await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (!r.success) throw new Error('processOne 未成功');
        const clicked = Array.prototype.map.call(win.document.querySelectorAll('.wrap[data-clicked]'), function (el) { return +el.getAttribute('data-clicked'); }).sort();
        // 应选中 0(A),2(C),3(D)，而不是只选一个
        if (clicked.join(',') !== '0,2,3') throw new Error('多选投票应选 A,C,D(0,2,3)，实际 ' + JSON.stringify(clicked));
    });

    await test('aiVote=0 时只询问1次（不额外花钱）', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="单选题"><h3 class="mark_name">(单选题) 测试</h3>' +
            '<div class="stem_answer"><div class="wrap" style="cursor:pointer;"><span></span><div class="answer_p">选项A</div></div></div>' +
            '</div></div></form></div>';
        const win = makeWindow(body, '/mooc2/work/dowork?courseid=1');
        let calls = 0;
        win.GM_xmlhttpRequest = function (opts) {
            calls++;
            const b = { choices: [{ message: { content: '{"answer":"选项A","answers":["选项A"]}' } }] };
            setTimeout(function () { opts.onload({ status: 200, responseText: JSON.stringify(b) }); }, 5);
        };
        const T = win.__XIAOAI_TEST__;
        await T.QuizEngine.processOne(0, 1, win.jQuery('.questionLi'), T.HomeworkAdapter, {});
        if (calls !== 1) throw new Error('aiVote=0 应只问1次，实际 ' + calls + ' 次');
    });

    console.log('\n===== 诊断报告 =====\n');
    await test('报告 log 为逐行数组', async function () {
        const win = makeWindow('<div class="mark_table"><form><div class="questionLi"></div></form></div>', '/mooc2/work/dowork?courseid=1', true);
        const T = win.__XIAOAI_TEST__;
        const report = T.Report.build();
        if (!Array.isArray(report.log)) throw new Error('log 应为数组，实际 ' + typeof report.log);
    });
    await test('诊断报告：API Key 打码 + DOM 探针 + 日志捕获', async function () {
        const body = '<div class="mark_table"><form>' +
            '<div class="questionLi" typename="单选题"><h3 class="mark_name">(单选题) 测试题</h3>' +
            '<div class="stem_answer"><div class="answer_p">选项A</div><div class="answer_p">选项B</div></div></div>' +
            '</form></div>';
        const win = makeWindow(body, '/mooc2/work/dowork?courseid=1', true); // DEV_MODE 开启
        const T = win.__XIAOAI_TEST__;
        if (!T.Report) throw new Error('Report 未暴露');
        // 手动设置 API Key，验证报告打码
        win.localStorage.setItem('GPTJsSetting.apiKey', 'sk-super-secret-123');
        const report = T.Report.build();
        if (!report) throw new Error('报告构建失败');
        // 1. API Key 打码
        const settingsStr = JSON.stringify(report.settings || {});
        if (settingsStr.indexOf('sk-super-secret-123') !== -1) throw new Error('API Key 泄漏到报告!');
        if ((report.settings || {}).apiKey !== '(已打码，不外泄)') throw new Error('apiKey 字段未打码');
        // 2. DOM 探针
        const probe = report.domProbe || {};
        if (probe['.questionLi'] !== 1) throw new Error('DOM 探针未检测到 .questionLi: ' + JSON.stringify(probe));
        if (probe['.stem_answer .answer_p'] !== 2) throw new Error('DOM 探针未检测到 2 个选项');
        // 3. meta 信息
        if (!report.meta || !report.meta.url) throw new Error('meta 缺少 url');
        if (report.meta.url.indexOf('/mooc2/work/dowork') === -1) throw new Error('meta.url 错误: ' + report.meta.url);
        // 4. 路由信息
        if (report.route.indexOf('/mooc2/work/dowork') === -1) throw new Error('route 未记录');
    });

    await test('非开发模式：Report.export 拒绝导出', async function () {
        const win = makeWindow('<div></div>', '/xiaoai-test', false); // DEV_MODE 关闭
        const T = win.__XIAOAI_TEST__;
        const r = T.Report.export();
        if (r !== null) throw new Error('非开发模式不应导出报告');
    });

    /* ======================= 汇总 ======================= */
    console.log('\n========================================');
    console.log('  通过: ' + passed + '  失败: ' + failed + '  共: ' + (passed + failed));
    console.log('========================================\n');
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(function (e) {
    console.error('测试运行异常:', e);
    process.exit(1);
});
