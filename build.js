/* =============================================================================
 *  构建脚本：合并 core + vendor_typr + userscript 为单个 .user.js
 *  运行: node build.js
 * ============================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = __dirname;
const DIST = path.join(SRC, 'dist');
const VERSION = '1.0.0';

const HEADER = `// ==UserScript==
// @name         小哀学习通助手（自有AI·自动答题/刷课）
// @name:en      XiaoAi Chaoxing Assistant
// @namespace    xiaoai.chaoxing
// @version      ${VERSION}
// @description  学习通/超星全自动助手：自带 API Key 直连 AI（默认 deepseek-v4-flash），自动完成视频/音频/文档/阅读/读书/直播/速课/测验/作业/考试；支持单选/多选/判断/填空/简答/论述/写作/翻译/编程/复合大题；字体解密、防清进度、拟人化答题、答案加粗好学生模式。在设置面板填入你的 API Key 即可使用。
// @author       小哀
// @license      MIT
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij48dGV4dCB4PSIwIiB5PSIxMyIgZm9udC1zaXplPSIxNCI+5bCP5oK8PC90ZXh0Pjwvc3ZnPg==
// @match        *://*.chaoxing.com/*
// @match        *://*.edu.cn/*
// @match        *://*.nbdlib.cn/*
// @match        *://*.hnsyu.net/*
// @match        *://*.neauce.com/*
// @match        *://*.xueyinonline.com/*
// @match        *://*.sslibrary.com/*
// @match        *://*.org.cn/*
// @match        *://*.ac.cn/*
// @match        *://*.ynny.cn/*
// @match        *://*.hnvist.cn/*
// @match        *://*.fjlecb.cn/*
// @match        *://*.qutjxjy.cn/*
// @connect      api.deepseek.com
// @connect      api.openai.com
// @connect      api.anthropic.com
// @connect      api.moonshot.cn
// @connect      api.ollama.com
// @connect      cdn.ocsjs.com
// @connect      www.forestpolice.org
// @connect      cs.dkjdda.top
// @connect      zhibo.chaoxing.com
// @connect      mooc1.chaoxing.com
// @connect      mooc1-1.chaoxing.com
// @connect      mooc1-2.chaoxing.com
// @connect      passport2-api.chaoxing.com
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_info
// @grant        GM_getResourceText
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/sweetalert2/11.14.5/sweetalert2.all.min.js
// @resource     fontTable https://cdn.ocsjs.com/resources/font/table.json
// ==/UserScript==
`;

const parts = [
    HEADER,
    fs.readFileSync(path.join(SRC, 'src/core.js'), 'utf8'),
    '\n/* ===== Typr 字体解析器（内联自开源脚本，供字体解密使用） ===== */\n',
    fs.readFileSync(path.join(SRC, 'src/vendor_typr.js'), 'utf8'),
    '\n/* ===== 用户脚本主体 ===== */\n',
    fs.readFileSync(path.join(SRC, 'src/userscript.js'), 'utf8')
];

const out = parts.join('\n');
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

const outFile = path.join(DIST, '小哀学习通助手.user.js');
fs.writeFileSync(outFile, out, 'utf8');

// 语法检查
try {
    execFileSync(process.execPath, ['--check', outFile], { stdio: 'pipe' });
    console.log('✓ 语法检查通过');
} catch (e) {
    console.error('✗ 语法错误:');
    console.error(String(e.stderr));
    process.exit(1);
}

console.log('✓ 已生成: ' + outFile + '  (' + (out.length / 1024).toFixed(1) + ' KB, ' + out.split('\n').length + ' 行)');
