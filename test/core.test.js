/* =============================================================================
 *  小哀学习通助手 — core.js 单元测试（Node）
 *  运行: node test/core.test.js
 * ============================================================================= */
'use strict';

var Core = require('../src/core.js');
var assert = require('assert');

var passed = 0, failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ✓ ' + name);
    } catch (e) {
        failed++;
        console.error('  ✗ ' + name);
        console.error('    ' + (e && e.message));
    }
}

function expectEqual(actual, expected, label) {
    assert.strictEqual(actual, expected, (label || '') + ' 期望=' + JSON.stringify(expected) + ' 实际=' + JSON.stringify(actual));
}

function expectDeep(actual, expected, label) {
    assert.deepStrictEqual(actual, expected, (label || '') + ' 期望=' + JSON.stringify(expected) + ' 实际=' + JSON.stringify(actual));
}

console.log('\n===== 文本工具 =====\n');

test('toHalfWidth 全角转半角', function () {
    expectEqual(Core.toHalfWidth('ＡＢＣ１２３'), 'ABC123');
    expectEqual(Core.toHalfWidth('　全角空格'), ' 全角空格');
});

test('normalizeSimilarChars 希腊字母/全角字母', function () {
    expectEqual(Core.normalizeSimilarChars('ΑΒΓ１２３'), 'ABC123');
});

test('stripHtml 去标签保留文字', function () {
    expectEqual(Core.stripHtml('<p>hello <b>world</b></p>'), 'hello world');
});

test('textifyMedia 图片转URL文本', function () {
    var out = Core.textifyMedia('题干<img src="https://img.chaoxing.com/a.png">请回答');
    expectEqual(out.indexOf('[图片:img.chaoxing.com/a.png]') !== -1, true);
});

test('tidyQuestion 清洗题干', function () {
    // 全角标点会被归一化为半角，方便 AI 解析与匹配
    expectEqual(Core.tidyQuestion('【单选题】\n1. 下列哪个是网络协议？ （1.0分）'), '下列哪个是网络协议?');
    expectEqual(Core.tidyQuestion('(10) 关于数据结构正确的是？'), '关于数据结构正确的是?');
});

test('normalizeOptionText 去字母前缀', function () {
    expectEqual(Core.normalizeOptionText('A. TCP/IP协议'), 'TCP/IP协议');
    expectEqual(Core.normalizeOptionText('B、HTTP'), 'HTTP');
    expectEqual(Core.normalizeOptionText('C．FTP'), 'FTP');
});

test('clearString 保留中英文数字', function () {
    expectEqual(Core.clearString('TCP/IP 协议 (v4)'), 'tcpip协议v4');
});

test('stringSimilarity Levenshtein', function () {
    expectEqual(Core.stringSimilarity('abc', 'abc'), 1);
    expectEqual(Math.round(Core.stringSimilarity('abc', 'abd') * 1e9) / 1e9, Math.round((2 / 3) * 1e9) / 1e9);
    expectEqual(Core.stringSimilarity('', ''), 1);
    expectEqual(Core.stringSimilarity('abc', ''), 0);
});

console.log('\n===== 判断题解析 =====\n');

test('parseJudgeAnswer 各种变体', function () {
    expectEqual(Core.parseJudgeAnswer('正确'), 'true');
    expectEqual(Core.parseJudgeAnswer('错误'), 'false');
    expectEqual(Core.parseJudgeAnswer('对'), 'true');
    expectEqual(Core.parseJudgeAnswer('错'), 'false');
    expectEqual(Core.parseJudgeAnswer('√'), 'true');
    expectEqual(Core.parseJudgeAnswer('×'), 'false');
    expectEqual(Core.parseJudgeAnswer('True'), 'true');
    expectEqual(Core.parseJudgeAnswer('FALSE'), 'false');
    expectEqual(Core.parseJudgeAnswer('对的'), 'true');   // 包含匹配
    expectEqual(Core.parseJudgeAnswer('正确的'), 'true'); // 防"错误"误判
    expectEqual(Core.parseJudgeAnswer('不正确'), 'false'); // 否定优先
    expectEqual(Core.parseJudgeAnswer('答案：正确。'), 'true');
});

test('panDuan 模糊判定', function () {
    expectEqual(Core.panDuan('对'), 'true');
    expectEqual(Core.panDuan('B'), 'false');
    expectEqual(Core.panDuan('T'), 'true');
    expectEqual(Core.panDuan('错误'), 'false');
});

test('findJudgeOptionIndex', function () {
    expectEqual(Core.findJudgeOptionIndex(['对', '错'], true), 0);
    expectEqual(Core.findJudgeOptionIndex(['对', '错'], false), 1);
    expectEqual(Core.findJudgeOptionIndex(['正确', '错误'], true), 0);
    expectEqual(Core.findJudgeOptionIndex(['A. 正确', 'B. 错误'], true), 0);
});

console.log('\n===== 字母解析 =====\n');

test('extractLetterIndices 纯字母', function () {
    expectDeep(Core.extractLetterIndices('AB', 4), [0, 1]);
    expectDeep(Core.extractLetterIndices('A,C,D', 4), [0, 2, 3]);
    expectDeep(Core.extractLetterIndices('ACD', 4), [0, 2, 3]);
});

test('extractLetterIndices 从文本', function () {
    expectDeep(Core.extractLetterIndices('答案是 B', 4), [1]);
    expectDeep(Core.extractLetterIndices('正确答案为D', 4), [3]);
});

test('extractLetterIndices 排除解释文本', function () {
    // 解释文本不能误提取字母
    expectDeep(Core.extractLetterIndices('这道题考察的是网络协议的基本概念', 4), []);
});

test('splitAiAnswers 多分隔符', function () {
    expectDeep(Core.splitAiAnswers('TCP|UDP'), ['TCP', 'UDP']);
    // 丢弃孤立的选项标签字母
    expectDeep(Core.splitAiAnswers('A、HTTP，B、FTP'), ['HTTP', 'FTP']);
});

test('asciiSort 多选排序', function () {
    expectEqual(Core.asciiSort('CAD'), 'ACD');
});

console.log('\n===== 单选匹配（重点） =====\n');

var opts = ['TCP/IP协议', 'UDP协议', 'HTTP协议', 'FTP协议'];

test('matchSingle 精确匹配', function () {
    var r = Core.matchSingle('UDP协议', opts);
    expectEqual(r.index, 1);
    expectEqual(r.confidence, 'exact');
});

test('matchSingle 字母匹配', function () {
    var r = Core.matchSingle('B', opts);
    expectEqual(r.index, 1);
    expectEqual(r.confidence, 'letter');
    r = Core.matchSingle('答案是 C', opts);
    expectEqual(r.index, 2);
});

test('matchSingle 去标点', function () {
    var r = Core.matchSingle('TCP/IP 协议', opts);
    expectEqual(r.index, 0);
});

test('matchSingle C.文本 复合', function () {
    var r = Core.matchSingle('C. HTTP协议', opts);
    expectEqual(r.index, 2);
});

test('matchSingle 包含匹配', function () {
    var r = Core.matchSingle('HTTP', opts);
    expectEqual(r.index, 2);
});

test('matchSingle 无空格/标点变体（包含匹配）', function () {
    var r = Core.matchSingle('TCPIP协议', opts);
    expectEqual(r.index, 0);
});

test('matchSingle 多包含命中取相似度最高', function () {
    // 答案"机器学习"被多个选项包含，应选相似度最高（更长、更完整）的选项，而非恒选第一个
    var r = Core.matchSingle('机器学习', ['机器学习与数据挖掘', '机器学习算法', '人工智能'], 0.4);
    expectEqual(r.index, 1); // "机器学习算法" 相似度更高
});

test('matchSingle 数字索引', function () {
    var r = Core.matchSingle('2', opts);
    expectEqual(r.index, 2);
});

test('matchSingle 答案是 C（关键词提取字母）', function () {
    var r = Core.matchSingle('答案是 C', opts);
    expectEqual(r.index, 2);
    expectEqual(r.confidence, 'letter');
});

test('matchSingle 文本答案变体（无空格/缩写）', function () {
    var r = Core.matchSingle('TCP协议', opts, 0.5);
    expectEqual(r.index, 0); // 模糊匹配到 TCP 选项
    r = Core.matchSingle('TCP', opts, 0.5);
    expectEqual(r.index, 0); // 包含匹配
});

test('parseJudgeAnswer 否定形式', function () {
    expectEqual(Core.parseJudgeAnswer('不正确'), 'false');
    expectEqual(Core.parseJudgeAnswer('不对'), 'false');
    expectEqual(Core.parseJudgeAnswer('说法不正确'), 'false');
    expectEqual(Core.parseJudgeAnswer('是不正确的'), 'false');
});

test('matchSingle 无匹配返回-1', function () {
    var r = Core.matchSingle('完全无关的内容XYZ', opts, 0.5);
    expectEqual(r.index, -1);
});

test('matchSingle 模糊阈值过滤低质量', function () {
    var r = Core.matchSingle('随机文本阿阿阿', opts, 0.6);
    expectEqual(r.index, -1);
});

console.log('\n===== 多选匹配（重点） =====\n');

test('matchMulti 纯字母', function () {
    expectDeep(Core.matchMulti('AC', opts), [0, 2]);
    expectDeep(Core.matchMulti('A,D', opts), [0, 3]);
});

test('matchMulti 文本片段', function () {
    var r = Core.matchMulti('TCP/IP协议|HTTP协议', opts);
    expectDeep(r, [0, 2]);
});

test('matchMulti 逗号分隔文本', function () {
    var r = Core.matchMulti('TCP/IP协议, HTTP协议', opts);
    expectDeep(r, [0, 2]);
});

test('matchMulti 顺序无关', function () {
    var r = Core.matchMulti('HTTP协议|TCP/IP协议', opts);
    expectDeep(r, [0, 2]);
});

test('matchMulti 无匹配', function () {
    var r = Core.matchMulti('完全无关', opts, 0.5);
    expectDeep(r, []);
});

test('matchMulti 字母列表模式 A、TCP，C、HTTP', function () {
    var r = Core.matchMulti('A、TCP/IP协议，C、HTTP协议', opts);
    expectDeep(r, [0, 2]);
});

test('matchMulti 正确答案为A和C', function () {
    var r = Core.matchMulti('正确答案为A和C', opts);
    expectDeep(r, [0, 2]);
});

test('matchMulti 不能错选文本中的字母', function () {
    var r = Core.matchMulti('TCP和UDP都是传输层协议', opts, 0.5);
    expectDeep(r, []);
});

console.log('\n===== 填空答案分割 =====\n');

test('splitFillAnswers JSON数组', function () {
    expectDeep(Core.splitFillAnswers('["第一空","第二空"]'), ['第一空', '第二空']);
});

test('splitFillAnswers |分隔', function () {
    expectDeep(Core.splitFillAnswers('北京|上海'), ['北京', '上海']);
});

test('splitFillAnswers #分隔', function () {
    expectDeep(Core.splitFillAnswers('北京#上海'), ['北京', '上海']);
});

test('splitFillAnswers 单个', function () {
    expectDeep(Core.splitFillAnswers('北京'), ['北京']);
});

console.log('\n===== Prompt 构建 =====\n');

test('PromptBuilder 客观题', function () {
    var p = Core.PromptBuilder.build({ type: 0, typeName: '单选题', question: '下列属于网络协议的是？', options: opts });
    expectEqual(p.user.indexOf('【选项】') !== -1, true);
    expectEqual(p.user.indexOf('A. TCP/IP协议') !== -1, true);
    expectEqual(p.system.indexOf('只输出') !== -1, true);
});

test('PromptBuilder 判断题格式', function () {
    var p = Core.PromptBuilder.build({ type: 3, typeName: '判断题', question: 'TCP是可靠的？' });
    expectEqual(p.system.indexOf("输出'正确'或'错误'") !== -1, true);
});

test('PromptBuilder 主观题用学生口吻', function () {
    var p = Core.PromptBuilder.build({ type: 4, typeName: '简答题', question: '简述TCP三次握手' });
    expectEqual(p.system.indexOf('普通学生') !== -1, true);
    expectEqual(p.system.indexOf('套话') !== -1, true);
    expectEqual(p.system.indexOf('不要提到AI') !== -1, true);
});

test('PromptBuilder 编程题代码块', function () {
    var p = Core.PromptBuilder.build({ type: 9, typeName: '编程题', question: '用Python求斐波那契' });
    expectEqual(p.system.indexOf('```代码块```') !== -1, true);
});

console.log('\n===== AI 响应解析 =====\n');

test('AiResponseParser JSON模式', function () {
    var r = Core.AiResponseParser.parse({ raw: '{"answer":"UDP协议","answers":["UDP协议"]}', type: 0, jsonMode: true });
    expectEqual(r.answer, 'UDP协议');
    expectEqual(r.json, true);
});

test('AiResponseParser JSON模式(多选)', function () {
    var r = Core.AiResponseParser.parse({ raw: '{"answer":"TCP/IP协议|HTTP协议","answers":["TCP/IP协议","HTTP协议"]}', type: 1, jsonMode: true });
    expectDeep(r.answers, ['TCP/IP协议', 'HTTP协议']);
});

test('AiResponseParser 短文本清洗', function () {
    var r = Core.AiResponseParser.parse({ raw: '答案：UDP协议。', type: 0, jsonMode: false });
    expectEqual(r.answer, 'UDP协议');
});

test('AiResponseParser 长文本提取', function () {
    var r = Core.AiResponseParser.parse({ raw: '这是一大段推理过程...最终答案：UDP协议', type: 0, jsonMode: false });
    expectEqual(r.answer, 'UDP协议');
});

test('AiResponseParser 代码围栏', function () {
    var r = Core.AiResponseParser.parse({ raw: '```\ndef fib(n):\n    return n\n```', type: 9, jsonMode: false });
    expectEqual(r.answer.indexOf('def fib') !== -1, true);
});

console.log('\n===== 连线/匹配分组 =====\n');

test('buildAnswerGroups 多分隔符候选', function () {
    var groups = Core.buildAnswerGroups('a#b|c');
    var keys = groups.map(function (g) { return g.join('|'); });
    expectEqual(keys.indexOf('a|b|c') !== -1, true);
});

console.log('\n===== 题型映射 =====\n');

test('mapTypeName 各题型', function () {
    expectEqual(Core.mapTypeName('单选题'), 0);
    expectEqual(Core.mapTypeName('多选题'), 1);
    expectEqual(Core.mapTypeName('填空题'), 2);
    expectEqual(Core.mapTypeName('判断题'), 3);
    expectEqual(Core.mapTypeName('简答题'), 4);
    expectEqual(Core.mapTypeName('论述题'), 4);
    expectEqual(Core.mapTypeName('写作题'), 5);
    expectEqual(Core.mapTypeName('翻译题'), 8);
    expectEqual(Core.mapTypeName('编程题'), 9);
    expectEqual(Core.mapTypeName('阅读理解'), 6);
    expectEqual(Core.mapTypeName('完形填空'), 6);
    expectEqual(Core.mapTypeName('名词解释'), 4);
    expectEqual(Core.mapTypeName('计算题'), 7);
});

test('answerCacheKey 稳定', function () {
    var k1 = Core.answerCacheKey('题目', 0, ['b', 'a']);
    var k2 = Core.answerCacheKey('题目', 0, ['a', 'b']);
    expectEqual(k1, k2);
});

/* ======================= 汇总 ======================= */
console.log('\n========================================');
console.log('  通过: ' + passed + '  失败: ' + failed + '  共: ' + (passed + failed));
console.log('========================================\n');
process.exit(failed > 0 ? 1 : 0);
