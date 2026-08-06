// ==UserScript==
// @name         小哀学习通助手（自有AI·自动答题/刷课）
// @name:en      XiaoAi Chaoxing Assistant
// @namespace    xiaoai.chaoxing
// @version      1.0.0
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

/* =============================================================================
 *  小哀学习通助手 — 纯逻辑核心（无 DOM / 无 GM 依赖）
 *  同时兼容浏览器与 Node（用于单元测试）
 * ============================================================================= */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else if (root) {
        root.XiaoAiCore = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /* ======================= MD5（内联，避免死掉的 CDN 依赖） ======================= */

    function md5(input) {
        function safeAdd(x, y) {
            var lsw = (x & 0xffff) + (y & 0xffff);
            var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xffff);
        }
        function bitRotateLeft(num, cnt) {
            return (num << cnt) | (num >>> (32 - cnt));
        }
        function md5cmn(q, a, b, x, s, t) {
            return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
        }
        function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
        function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
        function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
        function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }

        // UTF-8 编码（兼容中文输入）
        var str = String(input).replace(/\r\n/g, '\n');
        var utftext = '';
        for (var ui = 0; ui < str.length; ui++) {
            var uc = str.charCodeAt(ui);
            if (uc < 128) {
                utftext += String.fromCharCode(uc);
            } else if (uc > 127 && uc < 2048) {
                utftext += String.fromCharCode((uc >> 6) | 192, (uc & 63) | 128);
            } else {
                utftext += String.fromCharCode((uc >> 12) | 224, ((uc >> 6) & 63) | 128, (uc & 63) | 128);
            }
        }

        var i, len, x, k, olda, oldb, oldc, oldd;
        var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
        len = utftext.length * 8;
        // 构建 32 位字数组
        x = [];
        for (k = 0; k < utftext.length; k++) {
            var wordIdx = k >> 2;
            if (x[wordIdx] === undefined) x[wordIdx] = 0;
            x[wordIdx] |= (utftext.charCodeAt(k) & 0xff) << ((k % 4) * 8);
        }
        // 填充
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        for (i = 0; i < x.length; i += 16) {
            olda = a; oldb = b; oldc = c; oldd = d;
            a = md5ff(a, b, c, d, x[i], 7, -680876936);
            d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
            c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
            b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
            a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
            d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
            c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
            b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
            a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
            d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
            c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
            b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
            d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
            a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
            d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
            c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
            b = md5gg(b, c, d, a, x[i], 20, -373897302);
            a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
            d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
            c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
            a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
            d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
            c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
            b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
            a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
            d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
            c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
            b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
            a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
            d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
            c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
            b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
            d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
            c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
            b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
            d = md5hh(d, a, b, c, x[i], 11, -358537222);
            c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
            b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
            a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
            d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
            b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
            a = md5ii(a, b, c, d, x[i], 6, -198630844);
            d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
            c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
            a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
            d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
            c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
            a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
            d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
            b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
            a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
            d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
            b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);

            a = safeAdd(a, olda); b = safeAdd(b, oldb); c = safeAdd(c, oldc); d = safeAdd(d, oldd);
        }

        function binl2hex(binarray) {
            var hexTab = '0123456789abcdef', str = '';
            for (var j = 0; j < binarray.length * 4; j++) {
                str += hexTab.charAt((binarray[j >> 2] >> ((j % 4) * 8 + 4)) & 0xf) +
                    hexTab.charAt((binarray[j >> 2] >> ((j % 4) * 8)) & 0xf);
            }
            return str;
        }
        return binl2hex([a, b, c, d]);
    }

    /* ======================= 文本工具 ======================= */

    // 希腊字母 / 音标 / 相似字符归一化（提升选项匹配率）
    var SIMILAR_CHAR_MAP = {
        'Α': 'A', 'Α': 'A', 'Ｂ': 'B', 'Β': 'B', 'Ｃ': 'C', 'Γ': 'C', 'Ｄ': 'D', 'Δ': 'D',
        'Ｅ': 'E', 'Ε': 'E', 'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J', 'Ｋ': 'K',
        'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ο': 'O', 'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R',
        'Ｓ': 'S', 'Ｔ': 'T', 'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
        'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h',
        'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｏ': 'o',
        'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w',
        'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
        '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10'
    };

    // 全角 → 半角
    function toHalfWidth(s) {
        if (!s) return '';
        return String(s).replace(/[！-～]/g, function (ch) {
            return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
        }).replace(/　/g, ' ');
    }

    // 归一化相似字符（先相似表，再全角转半角兜底）
    function normalizeSimilarChars(s) {
        if (!s) return '';
        return toHalfWidth(String(s).split('').map(function (c) {
            return SIMILAR_CHAR_MAP[c] || c;
        }).join(''));
    }

    // 去掉 HTML 标签（keepImg=true 时保留 <img>，块级标签转为换行）
    function stripHtml(s, keepImg) {
        if (!s) return '';
        var html = String(s);
        if (keepImg) {
            // 块级/换行标签 → 换行，保持题目阅读层次
            html = html.replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/(p|div|li|tr|h\d|ul|ol)>/gi, '\n')
                .replace(/<(p|div|li|tr|h\d|ul|ol)[^>]*>/gi, '\n')
                // 其余标签全部剥除，仅保留 <img>
                .replace(/<(?!img|\/img)[^>]*>/g, '');
        } else {
            html = html.replace(/<[^>]*>/g, '');
        }
        return html.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    }

    // 图片/音频 → URL 文本（用于把图片题/听力题文本化后发给 AI）
    function textifyMedia(html) {
        if (!html) return '';
        var s = String(html);
        // 图片
        s = s.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, function (m, src) {
            return ' [图片:' + src.replace(/^https?:\/\//, '') + '] ';
        });
        // iframe（含音频播放器）
        s = s.replace(/<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi, function (m, src) {
            return ' [音频:' + src.replace(/^https?:\/\//, '') + '] ';
        });
        s = s.replace(/<audio[^>]*>[\s\S]*?<source[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<\/audio>/gi, function (m, src) {
            return ' [音频:' + src.replace(/^https?:\/\//, '') + '] ';
        });
        // video
        s = s.replace(/<video[^>]*src=["']([^"']+)["'][^>]*>/gi, function (m, src) {
            return ' [视频:' + src.replace(/^https?:\/\//, '') + '] ';
        });
        return stripHtml(s, true);
    }

    // 通用文本清洗：题干
    function tidyQuestion(s) {
        if (!s) return '';
        var str = stripHtml(s, true)
            .replace(/^【.*?】\s*/, '')
            .replace(/\s*（\d+\.\d+分）$/, '')
            .replace(/^\d+[.、]\s*/, '')
            .replace(/^[(（]\d{1,3}[)）]\s*/, '')
            .replace(/^\s*\d+[.、]?\s*/, '');
        return toHalfWidth(str).replace(/^\s+|\s+$/g, '');
    }

    // 通用文本清洗：选项（去选项字母前缀）
    function normalizeOptionText(text) {
        if (text == null) return '';
        return toHalfWidth(stripHtml(String(text), true))
            .replace(/^[A-Z]\s*[.、．:：)）]\s*/i, '')
            .replace(/^[A-Z]\s+/i, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/g, '');
    }

    // 去除所有标点与空白（用于精确比对）
    function stripPunc(s) {
        if (!s) return '';
        return String(s).replace(/[一-龥A-Za-z0-9]/g, function (m) { return m; })
            .replace(/[^一-龥A-Za-z0-9]/g, '')
            .toLowerCase();
    }

    // 保留中英文与数字，去其余字符（用于模糊匹配前归一）
    function clearString(s) {
        if (!s) return '';
        return String(s).replace(/[^一-龥a-zA-Z0-9]/g, '').toLowerCase();
    }

    // 去掉常见冗余后缀（方式/方法/技术/协议/机制 等）
    function removeRedundantWords(s) {
        if (!s) return '';
        return String(s).replace(/(方式|方法|技术|协议|机制|原理|模型|结构|系统|问题)$/g, '');
    }

    /* ======================= 字符串相似度（Levenshtein 空间优化版） ======================= */

    function stringSimilarity(s1, s2) {
        if (s1 == null && s2 == null) return 1;
        if (s1 == null || s2 == null) return 0;
        s1 = clearString(normalizeSimilarChars(s1));
        s2 = clearString(normalizeSimilarChars(s2));
        if (s1 === s2) return 1;
        var len1 = s1.length, len2 = s2.length;
        if (len1 === 0 || len2 === 0) return 0;
        var prev = [], curr = [];
        for (var j = 0; j <= len2; j++) prev[j] = j;
        for (var i = 1; i <= len1; i++) {
            curr[0] = i;
            for (var j = 1; j <= len2; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    curr[j] = prev[j - 1];
                } else {
                    curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
                }
            }
            var tmp = prev; prev = curr; curr = tmp;
        }
        return 1 - prev[len2] / Math.max(len1, len2);
    }

    /* ======================= 判断题解析 ======================= */

    // AI 回答 → 'true' / 'false' / null
    // 先查否定词（"不正确""不对""错误的"），再查"正确/对"，避免"正确的"误判
    function parseJudgeAnswer(ans) {
        if (!ans) return null;
        var s = toHalfWidth(String(ans)).replace(/[。，.,!！\s]/g, '').toLowerCase();
        var trueWords = ['正确', '是', '对', '√', 't', 'true', 'ri', 'right', 'yes'];
        var falseWords = ['错误', '否', '错', '×', 'f', 'false', 'wr', 'wrong', 'no', '不正确', '不对', '非正确', '不是'];
        // 精确匹配（否定优先）
        for (var i = 0; i < falseWords.length; i++) { if (s === falseWords[i]) return 'false'; }
        for (var i = 0; i < trueWords.length; i++) { if (s === trueWords[i]) return 'true'; }
        // 判断题选项字母约定：A=正确/对，B=错误/错（仅精确单字母，避免误伤普通文本）
        if (s === 'a') return 'true';
        if (s === 'b') return 'false';
        // 包含匹配（否定词优先）
        for (var j = 0; j < falseWords.length; j++) { if (s.indexOf(falseWords[j]) !== -1) return 'false'; }
        for (var k = 0; k < trueWords.length; k++) { if (s.indexOf(trueWords[k]) !== -1) return 'true'; }
        return null;
    }

    // 在选项文本数组中找到"对/错"对应的索引
    function findJudgeOptionIndex(options, isTrue) {
        var trueWords = ['正确', '是', '对', '√', 'T', 'ri', 'A', 'a'];
        var falseWords = ['错误', '否', '错', '×', 'F', 'wr', 'B', 'b'];
        var words = isTrue ? trueWords : falseWords;
        for (var i = 0; i < options.length; i++) {
            var t = toHalfWidth(normalizeOptionText(options[i]));
            for (var j = 0; j < words.length; j++) {
                if (t.indexOf(words[j]) !== -1) return i;
            }
        }
        return -1;
    }

    // 模糊判定：任意文本 → true/false/null（容错高）
    function panDuan(s) {
        if (!s) return null;
        var str = String(s).trim().toLowerCase();
        if (/^(正确|是|对|√|t|true|right|yes|a)$/i.test(str)) return 'true';
        if (/^(错误|否|错|×|f|false|wrong|no|b)$/i.test(str)) return 'false';
        var r = parseJudgeAnswer(str);
        return r;
    }

    /* ======================= 字母/答案解析 ======================= */

    // 从文本中提取字母下标（"AB" / "A,C,D" / "答案是 B" / "A、TCP，C、HTTP"）
    function extractLetterIndices(answer, optionCount) {
        var result = [];
        if (!answer) return result;
        var s = toHalfWidth(String(answer)).toUpperCase();
        // 纯字母串（去分隔符后只剩 A-Z；要求全部字母在选项范围内，避免"TCP"这类缩写误判）
        var lettersOnly = s.replace(/[^A-Z]/g, '');
        if (/^[A-Z]+$/.test(s.replace(/[\s,，、;；|:：.。()（）-]+/g, '')) && lettersOnly.length > 0 && lettersOnly.length <= optionCount) {
            var allInRange = true;
            for (var i = 0; i < lettersOnly.length; i++) {
                var li = lettersOnly.charCodeAt(i) - 65;
                if (li < 0 || li >= optionCount) { allInRange = false; break; }
            }
            if (allInRange) {
                for (var j = 0; j < lettersOnly.length; j++) {
                    li = lettersOnly.charCodeAt(j) - 65;
                    if (result.indexOf(li) === -1) result.push(li);
                }
                if (result.length > 0) return result;
            }
        }
        // "A、文本" 列表：字母紧跟分隔符（避免从普通文本误取）
        var m;
        var re = /(?:^|[^A-Z])([A-G])\s*[.、。,，;；:：)）】](?=\S)/g;
        while ((m = re.exec(s)) !== null) {
            var idx2 = m[1].charCodeAt(0) - 65;
            if (idx2 >= 0 && idx2 < optionCount && result.indexOf(idx2) === -1) result.push(idx2);
        }
        // 答案关键词后的连续字母串（"答案：AB" / "正确答案为A和C"）
        re = /(?:正确答案|正确选项|答案|选)[^A-Z]{0,8}?\s*([A-G](?:[和及与、,，&\s]*[A-G]){0,7})(?![A-G])/g;
        while ((m = re.exec(s)) !== null) {
            var run = m[1];
            for (var li2 = 0; li2 < run.length; li2++) {
                var idx3 = run.charCodeAt(li2) - 65;
                if (idx3 >= 0 && idx3 < optionCount && result.indexOf(idx3) === -1) result.push(idx3);
            }
        }
        return result;
    }

    // 把 AI 回答按常见分隔符拆成多个片段
    function splitAiAnswers(answer) {
        if (!answer) return [];
        return String(answer)
            .split(/[|｜#`*@~;；,，、\n]+/)
            .map(function (s) { return normalizeOptionText(s).replace(/^[A-Z]\s*[.、．:：)）]\s*/i, ''); })
            .filter(function (s) { return s && !/^[A-Ga-g]$/.test(s); }); // 丢弃孤立的选项标签字母
    }

    // 多选答案串按 ASCII 排序（规避选项顺序问题）
    function asciiSort(letters) {
        return String(letters || '').split('').sort().join('');
    }

    /* ======================= 答案匹配器 ======================= */

    // 单选/判断题：六层匹配
    // options 为已归一化的选项文本数组（去掉了字母前缀）
    // 返回 { index, confidence }
    function matchSingle(answer, options, fuzzyThreshold) {
        if (!answer || !options || options.length === 0) return { index: -1, confidence: 'none' };
        fuzzyThreshold = (fuzzyThreshold === undefined) ? 0.5 : fuzzyThreshold;
        var answerStr = String(answer).trim();

        // L0: 数字索引（题库返回索引场景）
        if (/^\d+$/.test(answerStr)) {
            var n = parseInt(answerStr, 10);
            if (n >= 0 && n < options.length) return { index: n, confidence: 'numeric' };
        }

        // L1: 字母索引（单选：仅当唯一命中字母时直接采用，避免解释文本误取）
        var letters = extractLetterIndices(answerStr, options.length);
        if (letters.length === 1) {
            return { index: letters[0], confidence: 'letter' };
        }

        // L2: 精确匹配（含归一化）
        var normAnswer = normalizeOptionText(answerStr);
        for (var i = 0; i < options.length; i++) {
            if (options[i] === answerStr || options[i] === normAnswer) return { index: i, confidence: 'exact' };
        }

        // L3: 去标点精确
        var strippedAnswer = stripPunc(normAnswer);
        if (strippedAnswer) {
            for (var j = 0; j < options.length; j++) {
                if (stripPunc(options[j]) === strippedAnswer) return { index: j, confidence: 'normalized' };
            }
        }

        // L4: "C. 文本" 复合匹配（已提取字母则已命中；此处处理未被字母正则捕获的情况）
        var composite = /^([A-Ga-g])\s*[.、。,，;；:：)）】\s]+(.+)$/.exec(normAnswer);
        if (composite) {
            var letterIdx = composite[1].charCodeAt(0) - 65;
            var restText = composite[2];
            for (var k = 0; k < options.length; k++) {
                if (stripPunc(options[k]) === stripPunc(restText)) {
                    return { index: k, confidence: 'composite' };
                }
            }
            if (letterIdx >= 0 && letterIdx < options.length) return { index: letterIdx, confidence: 'composite-letter' };
        }

        // L5: 包含匹配（短答案需唯一命中）
        var containsMatches = [];
        for (var c = 0; c < options.length; c++) {
            var optC = clearString(options[c]);
            var ansC = clearString(normAnswer);
            if (!optC || !ansC) continue;
            if (optC.indexOf(ansC) !== -1 || ansC.indexOf(optC) !== -1) containsMatches.push(c);
        }
        if (containsMatches.length === 1) return { index: containsMatches[0], confidence: 'contains' };
        if (containsMatches.length > 1 && containsMatches.length < options.length) {
            // 多个包含命中：取相似度最高的（长度更长/更完整的选项优先，避免恒取第一个）
            var bestSim = 0, bestIdx = -1;
            for (var cc = 0; cc < containsMatches.length; cc++) {
                var sim = stringSimilarity(options[containsMatches[cc]], normAnswer);
                if (sim > bestSim) { bestSim = sim; bestIdx = containsMatches[cc]; }
            }
            if (bestIdx !== -1) return { index: bestIdx, confidence: 'contains-best' };
        }

        // L6: 模糊匹配（Levenshtein，考虑去冗余后缀）
        var bestScore = 0, bestFuzz = -1;
        var normAnswerCleared = removeRedundantWords(clearString(normAnswer));
        for (var f = 0; f < options.length; f++) {
            var o = removeRedundantWords(clearString(options[f]));
            var score = stringSimilarity(o, normAnswerCleared);
            if (score > bestScore) { bestScore = score; bestFuzz = f; }
        }
        if (bestScore >= fuzzyThreshold) {
            return { index: bestFuzz, confidence: 'fuzzy(' + Math.round(bestScore * 100) + '%)' };
        }

        return { index: -1, confidence: 'none' };
    }

    // 多选题：先字母，再分隔符拆片段逐段匹配，再整体模糊
    // 返回下标数组
    function matchMulti(answer, options, fuzzyThreshold) {
        if (!answer || !options || options.length === 0) return [];
        fuzzyThreshold = (fuzzyThreshold === undefined) ? 0.5 : fuzzyThreshold;
        var indices = [];

        // L1: 纯字母（"AB" / "A,B,D"）
        var cleaned = toHalfWidth(String(answer)).toUpperCase().replace(/[\s,，、;；|:：.。()（）-]+/g, '');
        if (/^[A-Ga-g]+$/.test(cleaned)) {
            var letters = extractLetterIndices(String(answer), options.length);
            for (var l = 0; l < letters.length; l++) {
                if (indices.indexOf(letters[l]) === -1) indices.push(letters[l]);
            }
            return indices;
        }

        // L1.5: 字母列表模式（"A、TCP，C、HTTP" / "正确答案为A和C"）
        var listedLetters = extractLetterIndices(String(answer), options.length);
        if (listedLetters.length > 0) {
            return listedLetters;
        }

        // L2: 分隔符拆片段
        var parts = splitAiAnswers(answer);
        for (var p = 0; p < parts.length; p++) {
            var partResult = matchSingle(parts[p], options, fuzzyThreshold);
            if (partResult.index !== -1 && indices.indexOf(partResult.index) === -1) {
                indices.push(partResult.index);
            }
        }

        // L3: 整体包含
        if (indices.length === 0) {
            for (var i = 0; i < options.length; i++) {
                if (stripPunc(String(answer)) === stripPunc(options[i])) {
                    indices.push(i);
                    break;
                }
            }
        }

        // L4: 整体模糊
        if (indices.length === 0) {
            var bestIdx = -1, bestScore = 0;
            var ansCleared = clearString(answer);
            for (var f = 0; f < options.length; f++) {
                var score = stringSimilarity(options[f], String(answer));
                if (score > bestScore && score >= fuzzyThreshold) { bestScore = score; bestIdx = f; }
            }
            if (bestIdx !== -1) indices.push(bestIdx);
        }

        // 排序（保持选项顺序）
        return indices.sort(function (a, b) { return a - b; });
    }

    // 判断题匹配：AI 回答 → isTrue / null
    function matchJudge(answer) {
        var r = parseJudgeAnswer(answer);
        if (r === 'true') return { isTrue: true, confidence: 'parsed' };
        if (r === 'false') return { isTrue: false, confidence: 'parsed' };
        return { isTrue: null, confidence: 'none' };
    }

    /* ======================= 填空题答案分割 ======================= */

    // 把 AI 答案按分隔符拆成数组，兼容 JSON 数组、# / | / === 等
    function splitFillAnswers(answer) {
        if (!answer) return [];
        var s = String(answer).trim();
        if (/^\s*\[[\s\S]*\]\s*$/.test(s)) {
            try {
                var arr = JSON.parse(s);
                if (Array.isArray(arr)) return arr.map(function (x) { return String(x).trim(); });
            } catch (e) { /* fallthrough */ }
        }
        // 去掉可能的围栏
        s = s.replace(/^```[a-z]*\s*/i, '').replace(/```$/, '');
        var parts = s.split(/[|｜#`*@~;；、\n]+/).map(function (x) { return String(x).trim(); }).filter(Boolean);
        return parts;
    }

    /* ======================= 连线/匹配题答案分组 ======================= */

    // 按多种分隔符把答案拆成多组候选，逐个尝试直到能填满所有空
    function buildAnswerGroups(answer) {
        var groups = [];
        var raw = String(answer == null ? '' : answer).trim();
        if (!raw) return groups;
        var separators = ['===', '#!#', '###', '----', '#', '---', '|', ';', '；', ',', '，'];
        for (var s = 0; s < separators.length; s++) {
            var parts = raw.split(separators[s]).map(function (x) { return x.trim(); }).filter(Boolean);
            if (parts.length > 1) groups.push(parts);
        }
        // 兜底：整体作为一个组
        groups.push([raw]);
        // 去重
        var seen = {}, unique = [];
        for (var g = 0; g < groups.length; g++) {
            var key = groups[g].join('|');
            if (!seen[key]) { seen[key] = true; unique.push(groups[g]); }
        }
        return unique;
    }

    /* ======================= Prompt 构建器 ======================= */

    var ESSAY_SYSTEM = [
        '你是一名中国大学的普通学生，正在完成老师布置的在线作业。',
        '请用自然、朴实、像真人学生一样的中文作答，具体要求：',
        '1. 语言口语化但表达通顺、语法正确；避免"综上所述""由此可见""从XX角度来看"等AI式套话。',
        '2. 不要提到AI、模型、助手等任何关于作答者身份的信息。',
        '3. 结合题目实际内容作答，不要空话套话；可以有少量口语词（如"其实""比如"），但不要过度随意。',
        '4. 严格只输出答案正文，不要输出"以下是我的答案"之类的引导语，不要编号说明。'
    ].join('\n');

    var OBJECTIVE_SYSTEM = '你是一个精确的自动答题引擎。严格按要求只输出答案，绝不输出任何解释、推理过程或多余文字。';

    var PromptBuilder = {
        // 各题型答案格式要求
        FORMAT: {
            SINGLE: '只输出正确选项的完整文本（不要带A/B/C/D字母，不要加前缀）。',
            MULTI: "只输出所有正确选项的完整文本，用'|'分隔，不要带字母，不要加前缀。",
            JUDGE: "只输出'正确'或'错误'两个字。",
            FILL: "多个空用'|'分隔，只输出要填入空的文本。",
            ESSAY: '直接输出答案正文。'
        },

        /**
         * 构建 messages
         * @param {object} opts { type, typeName, question, options[], answerFormat, lang }
         * @returns {object} { system, user }
         */
        build: function (opts) {
            opts = opts || {};
            var type = opts.type;              // 数字题型
            var typeName = opts.typeName || '未知题型';
            var question = opts.question || '';
            var options = opts.options || [];

            var system = OBJECTIVE_SYSTEM;
            var format = '';

            // 主观题：拟学生化语言
            var subjectiveTypes = { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 };
            var isSubjective = !!subjectiveTypes[type];

            if (isSubjective) {
                system = ESSAY_SYSTEM;
            } else {
                switch (type) {
                    case 0: format = this.FORMAT.SINGLE; break;
                    case 1: format = this.FORMAT.MULTI; break;
                    case 2: format = this.FORMAT.FILL; break;
                    case 3: format = this.FORMAT.JUDGE; break;
                    default: format = '';
                }
                if (format) {
                    system += '\n答案格式要求：' + format;
                }
            }

            // 主观题细节要求
            if (type === 4) system += '\n\n字数要求：简答/问答 60~150 字；名词解释 50~120 字；论述/材料 300~500 字。按题目分值把握详略，直接输出正文。';
            if (type === 6) system += '\n\n写作题：按题目要求用对应语言写作，结构完整，直接输出正文。';
            if (type === 8) system += '\n\n翻译题：直接输出翻译结果，不要解释。';
            if (type === 9) system += '\n\n编程题：直接输出可运行的代码，放在```代码块```中，可附 1-2 行极简注释，不要解释思路。';

            var userMsg = '【题目类型】' + typeName + '\n【题目】\n' + question;
            if (options && options.length > 0) {
                var labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                userMsg += '\n\n【选项】';
                for (var i = 0; i < options.length; i++) {
                    userMsg += '\n' + labels[i] + '. ' + options[i];
                }
                userMsg += '\n\n请选出正确答案。';
            } else {
                userMsg += '\n\n请作答。';
            }

            return { system: system, user: userMsg };
        }
    };

    /* ======================= AI 响应解析 ======================= */

    var AiResponseParser = {
        // JSON 模式：{"answer":"...","answers":[...]}
        parseJson: function (text) {
            if (!text) return null;
            var s = String(text).trim();
            // 去代码围栏
            s = s.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
            // 截取首尾 { }
            var start = s.indexOf('{');
            var end = s.lastIndexOf('}');
            if (start === -1 || end === -1 || end <= start) return null;
            var json = s.substring(start, end + 1);
            try {
                var obj = JSON.parse(json);
                if (obj && (obj.answer !== undefined || obj.answers !== undefined)) return obj;
            } catch (e) { /* fallthrough */ }
            return null;
        },

        // 从任意文本中提取最终答案（长响应处理）
        cleanResponse: function (raw, opts) {
            opts = opts || {};
            var text = String(raw == null ? '' : raw).trim();
            if (!text) return '';

            // 客观题：优先提取尾部 "答案：X"（含"最终答案""正确答案"等）
            if (opts.extractTrailing) {
                var m = text.match(/(?:最终|正确)?答案(?:是|为|：|:)\s*([^。，;；\n]+)[。，;；]?\s*$/);
                if (m && m[1] && m[1].trim()) {
                    var t = m[1].trim();
                    if (t.length <= 80) return t;
                }
                m = text.match(/(?:正确选项|正确答案|选)(?:是|为|：|:)\s*([^。，;；\n]+)[。，;；]?\s*$/);
                if (m && m[1] && m[1].trim()) {
                    t = m[1].trim();
                    if (t.length <= 80) return t;
                }
            }

            if (text.length <= 200) {
                return text
                    .replace(/^[（(]?\s*(正确)?答案(是|为)?[：:]\s*/i, '')
                    .replace(/^[（(]?\s*正确选项(是|为)?[：:]\s*/i, '')
                    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
                    .replace(/^```[a-z]*\s*/i, '').replace(/```$/, '')
                    .replace(/\*{1,2}(.*?)\*{1,2}/g, '$1')
                    .replace(/[。，,.\s]+$/, '')
                    .trim();
            }
            // 长响应：尝试从末尾提取
            var m2 = text.match(/(?:正确)?答案(?:是|为|：|:)\s*(.+?)[。，\s]*$/);
            if (m2) return m2[1].trim();
            m2 = text.match(/(?:正确选项|选)(?:是|为|：|:)\s*(.+?)[。，\s]*$/);
            if (m2) return m2[1].trim();
            var lines = text.split('\n').filter(function (l) { return l.trim(); });
            if (lines.length > 0) {
                var last = lines[lines.length - 1].trim();
                if (last.length > 100) {
                    var short = last.match(/[^。，,.\n]+/g);
                    if (short && short.length > 0) last = short[short.length - 1].trim();
                }
                return last;
            }
            return text.slice(-200);
        },

        /**
         * 统一解析 AI 响应
         * @param {object} opts { raw, type, jsonMode }
         * @returns {object} { answer, answers[], raw }
         */
        parse: function (opts) {
            opts = opts || {};
            var raw = String(opts.raw == null ? '' : opts.raw).trim();
            var type = opts.type;
            var jsonMode = opts.jsonMode !== false;

            // 1. JSON 模式
            if (jsonMode) {
                var obj = this.parseJson(raw);
                if (obj) {
                    var answerStr = obj.answer !== undefined ? String(obj.answer).trim() : '';
                    var answers = [];
                    if (Array.isArray(obj.answers)) answers = obj.answers.map(function (x) { return String(x).trim(); }).filter(Boolean);

                    if (type === 1) {
                        // 多选：优先用 answers 数组（或 answer 按 | 拆）
                        if (answers.length === 0 && answerStr) answers = answerStr.split('|');
                        var multiAns = answers.join('|');
                        return { answer: multiAns, answers: answers, raw: raw, json: true };
                    } else {
                        // 单选/判断/填空：优先 answer 字段（防止 answer 是语义值、answers 却是选项字母）
                        var ans = answerStr || (answers.length ? answers[0] : '');
                        return { answer: ans, answers: answers.length ? answers : (ans ? [ans] : []), raw: raw, json: true };
                    }
                }
            }

            // 2. 非 JSON：清洗（客观题启用尾部答案提取）
            var cleaned = this.cleanResponse(raw, { extractTrailing: [0, 1, 2, 3].indexOf(type) !== -1 });
            return { answer: cleaned, answers: cleaned ? [cleaned] : [], raw: raw, json: false };
        }
    };

    /* ======================= 本地答案缓存 key ======================= */

    function answerCacheKey(question, type, options) {
        var opts = options || [];
        var sorted = opts.slice().sort().join('|');
        return type + ':' + clearString(question) + ':' + clearString(sorted);
    }

    /* ======================= 题型映射 ======================= */

    var QuestionType = {
        SINGLE: 0, MULTI: 1, FILL: 2, JUDGE: 3,
        ESSAY: 4, WRITING: 5, COMPOSITE: 6,
        CALC: 7, TRANSLATE: 8, PROGRAMMING: 9
    };

    var TYPE_MAP = {
        '单选': 0, '单项选择题': 0, '单选题': 0, '单项选择': 0, '选择题': 0, '单项': 0, 'X型题': 0,
        '多选': 1, '多项选择题': 1, '多选题': 1, '多项': 1, '不定项': 1,
        '填空': 2, '填空题': 2,
        '判断': 3, '是非题': 3, '判断题': 3, '是非判断题': 3,
        '简答': 4, '简答题': 4, '问答题': 4, '问答': 4, '名词解释': 4, '论述题': 4, '论述': 4, '材料题': 4, '资料题': 4, '综合题': 4, '案例分析': 4, '其他': 4, '其它': 4, '阅读理解': 6, '阅读': 6, '阅读题': 6, '理解题': 6, '完形填空': 6, '完形': 6,
        '写作题': 5, '作文': 5,
        '计算题': 7, '计算': 7, '分录题': 7, '作图题': 7, '证明题': 7,
        '翻译题': 8, '翻译': 8,
        '程序': 9, '编程': 9, '程序设计': 9, '代码': 9, '写代码': 9
    };

    function mapTypeName(typeName) {
        if (!typeName) return undefined;
        var t = String(typeName);
        // 正则关键词（注意顺序：完形/阅读 必须先于 填空，避免"完形填空"误判）
        if (/单选|单项选择/.test(t)) return 0;
        if (/多选|多项选择/.test(t)) return 1;
        if (/完形|阅读|理解/.test(t)) return 6;
        if (/填空/.test(t)) return 2;
        if (/判断|是非/.test(t)) return 3;
        if (/编程|程序设计|代码|写代码/.test(t)) return 9;
        if (/翻译/.test(t)) return 8;
        if (/写作|作文/.test(t)) return 5;
        if (/计算|分录|作图|证明/.test(t)) return 7;
        for (var key in TYPE_MAP) {
            if (t.indexOf(key) !== -1) return TYPE_MAP[key];
        }
        return undefined;
    }

    /* ======================= 导出 ======================= */

    return {
        QuestionType: QuestionType,
        TYPE_MAP: TYPE_MAP,
        mapTypeName: mapTypeName,

        toHalfWidth: toHalfWidth,
        normalizeSimilarChars: normalizeSimilarChars,
        stripHtml: stripHtml,
        textifyMedia: textifyMedia,
        tidyQuestion: tidyQuestion,
        normalizeOptionText: normalizeOptionText,
        stripPunc: stripPunc,
        clearString: clearString,
        removeRedundantWords: removeRedundantWords,
        stringSimilarity: stringSimilarity,
        md5: md5,

        parseJudgeAnswer: parseJudgeAnswer,
        findJudgeOptionIndex: findJudgeOptionIndex,
        panDuan: panDuan,
        extractLetterIndices: extractLetterIndices,
        splitAiAnswers: splitAiAnswers,
        splitFillAnswers: splitFillAnswers,
        asciiSort: asciiSort,
        buildAnswerGroups: buildAnswerGroups,

        matchSingle: matchSingle,
        matchMulti: matchMulti,
        matchJudge: matchJudge,

        PromptBuilder: PromptBuilder,
        AiResponseParser: AiResponseParser,
        answerCacheKey: answerCacheKey
    };
});


/* ===== Typr 字体解析器（内联自开源脚本，供字体解密使用） ===== */

  var Typr$1 = {};
  var Typr = {};
  Typr.parse = function(buff) {
    var bin = Typr._bin;
    var data = new Uint8Array(buff);
    var tag = bin.readASCII(data, 0, 4);
    if (tag == "ttcf") {
      var offset = 4;
      bin.readUshort(data, offset);
      offset += 2;
      bin.readUshort(data, offset);
      offset += 2;
      var numF = bin.readUint(data, offset);
      offset += 4;
      var fnts = [];
      for (var i = 0; i < numF; i++) {
        var foff = bin.readUint(data, offset);
        offset += 4;
        fnts.push(Typr._readFont(data, foff));
      }
      return fnts;
    } else
      return [Typr._readFont(data, 0)];
  };
  Typr._readFont = function(data, offset) {
    var bin = Typr._bin;
    var ooff = offset;
    bin.readFixed(data, offset);
    offset += 4;
    var numTables = bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    var tags = [
      "cmap",
      "head",
      "hhea",
      "maxp",
      "hmtx",
      "name",
      "OS/2",
      "post",
      //"cvt",
      //"fpgm",
      "loca",
      "glyf",
      "kern",
      //"prep"
      //"gasp"
      "CFF ",
      "GPOS",
      "GSUB",
      "SVG "
      //"VORG",
    ];
    var obj = { _data: data, _offset: ooff };
    var tabs = {};
    for (var i = 0; i < numTables; i++) {
      var tag = bin.readASCII(data, offset, 4);
      offset += 4;
      bin.readUint(data, offset);
      offset += 4;
      var toffset = bin.readUint(data, offset);
      offset += 4;
      var length = bin.readUint(data, offset);
      offset += 4;
      tabs[tag] = { offset: toffset, length };
    }
    for (var i = 0; i < tags.length; i++) {
      var t = tags[i];
      if (tabs[t])
        obj[t.trim()] = Typr[t.trim()].parse(data, tabs[t].offset, tabs[t].length, obj);
    }
    return obj;
  };
  Typr._tabOffset = function(data, tab, foff) {
    var bin = Typr._bin;
    var numTables = bin.readUshort(data, foff + 4);
    var offset = foff + 12;
    for (var i = 0; i < numTables; i++) {
      var tag = bin.readASCII(data, offset, 4);
      offset += 4;
      bin.readUint(data, offset);
      offset += 4;
      var toffset = bin.readUint(data, offset);
      offset += 4;
      bin.readUint(data, offset);
      offset += 4;
      if (tag == tab)
        return toffset;
    }
    return 0;
  };
  Typr._bin = {
    readFixed: function(data, o) {
      return (data[o] << 8 | data[o + 1]) + (data[o + 2] << 8 | data[o + 3]) / (256 * 256 + 4);
    },
    readF2dot14: function(data, o) {
      var num = Typr._bin.readShort(data, o);
      return num / 16384;
    },
    readInt: function(buff, p) {
      return Typr._bin._view(buff).getInt32(p);
    },
    readInt8: function(buff, p) {
      return Typr._bin._view(buff).getInt8(p);
    },
    readShort: function(buff, p) {
      return Typr._bin._view(buff).getInt16(p);
    },
    readUshort: function(buff, p) {
      return Typr._bin._view(buff).getUint16(p);
    },
    readUshorts: function(buff, p, len) {
      var arr = [];
      for (var i = 0; i < len; i++)
        arr.push(Typr._bin.readUshort(buff, p + i * 2));
      return arr;
    },
    readUint: function(buff, p) {
      return Typr._bin._view(buff).getUint32(p);
    },
    readUint64: function(buff, p) {
      return Typr._bin.readUint(buff, p) * (4294967295 + 1) + Typr._bin.readUint(buff, p + 4);
    },
    readASCII: function(buff, p, l) {
      var s = "";
      for (var i = 0; i < l; i++)
        s += String.fromCharCode(buff[p + i]);
      return s;
    },
    readUnicode: function(buff, p, l) {
      var s = "";
      for (var i = 0; i < l; i++) {
        var c = buff[p++] << 8 | buff[p++];
        s += String.fromCharCode(c);
      }
      return s;
    },
    _tdec: typeof window !== "undefined" && window["TextDecoder"] ? new window["TextDecoder"]() : null,
    readUTF8: function(buff, p, l) {
      var tdec = Typr._bin._tdec;
      if (tdec && p == 0 && l == buff.length)
        return tdec["decode"](buff);
      return Typr._bin.readASCII(buff, p, l);
    },
    readBytes: function(buff, p, l) {
      var arr = [];
      for (var i = 0; i < l; i++)
        arr.push(buff[p + i]);
      return arr;
    },
    readASCIIArray: function(buff, p, l) {
      var s = [];
      for (var i = 0; i < l; i++)
        s.push(String.fromCharCode(buff[p + i]));
      return s;
    },
    _view: function(buff) {
      return buff._dataView || (buff._dataView = buff.buffer ? new DataView(buff.buffer, buff.byteOffset, buff.byteLength) : new DataView(new Uint8Array(buff).buffer));
    }
  };
  Typr._lctf = {};
  Typr._lctf.parse = function(data, offset, length, font, subt) {
    var bin = Typr._bin;
    var obj = {};
    var offset0 = offset;
    bin.readFixed(data, offset);
    offset += 4;
    var offScriptList = bin.readUshort(data, offset);
    offset += 2;
    var offFeatureList = bin.readUshort(data, offset);
    offset += 2;
    var offLookupList = bin.readUshort(data, offset);
    offset += 2;
    obj.scriptList = Typr._lctf.readScriptList(data, offset0 + offScriptList);
    obj.featureList = Typr._lctf.readFeatureList(data, offset0 + offFeatureList);
    obj.lookupList = Typr._lctf.readLookupList(data, offset0 + offLookupList, subt);
    return obj;
  };
  Typr._lctf.readLookupList = function(data, offset, subt) {
    var bin = Typr._bin;
    var offset0 = offset;
    var obj = [];
    var count = bin.readUshort(data, offset);
    offset += 2;
    for (var i = 0; i < count; i++) {
      var noff = bin.readUshort(data, offset);
      offset += 2;
      var lut = Typr._lctf.readLookupTable(data, offset0 + noff, subt);
      obj.push(lut);
    }
    return obj;
  };
  Typr._lctf.readLookupTable = function(data, offset, subt) {
    var bin = Typr._bin;
    var offset0 = offset;
    var obj = { tabs: [] };
    obj.ltype = bin.readUshort(data, offset);
    offset += 2;
    obj.flag = bin.readUshort(data, offset);
    offset += 2;
    var cnt = bin.readUshort(data, offset);
    offset += 2;
    var ltype = obj.ltype;
    for (var i = 0; i < cnt; i++) {
      var noff = bin.readUshort(data, offset);
      offset += 2;
      var tab = subt(data, ltype, offset0 + noff, obj);
      obj.tabs.push(tab);
    }
    return obj;
  };
  Typr._lctf.numOfOnes = function(n) {
    var num = 0;
    for (var i = 0; i < 32; i++)
      if ((n >>> i & 1) != 0)
        num++;
    return num;
  };
  Typr._lctf.readClassDef = function(data, offset) {
    var bin = Typr._bin;
    var obj = [];
    var format = bin.readUshort(data, offset);
    offset += 2;
    if (format == 1) {
      var startGlyph = bin.readUshort(data, offset);
      offset += 2;
      var glyphCount = bin.readUshort(data, offset);
      offset += 2;
      for (var i = 0; i < glyphCount; i++) {
        obj.push(startGlyph + i);
        obj.push(startGlyph + i);
        obj.push(bin.readUshort(data, offset));
        offset += 2;
      }
    }
    if (format == 2) {
      var count = bin.readUshort(data, offset);
      offset += 2;
      for (var i = 0; i < count; i++) {
        obj.push(bin.readUshort(data, offset));
        offset += 2;
        obj.push(bin.readUshort(data, offset));
        offset += 2;
        obj.push(bin.readUshort(data, offset));
        offset += 2;
      }
    }
    return obj;
  };
  Typr._lctf.getInterval = function(tab, val) {
    for (var i = 0; i < tab.length; i += 3) {
      var start = tab[i], end = tab[i + 1];
      tab[i + 2];
      if (start <= val && val <= end)
        return i;
    }
    return -1;
  };
  Typr._lctf.readCoverage = function(data, offset) {
    var bin = Typr._bin;
    var cvg = {};
    cvg.fmt = bin.readUshort(data, offset);
    offset += 2;
    var count = bin.readUshort(data, offset);
    offset += 2;
    if (cvg.fmt == 1)
      cvg.tab = bin.readUshorts(data, offset, count);
    if (cvg.fmt == 2)
      cvg.tab = bin.readUshorts(data, offset, count * 3);
    return cvg;
  };
  Typr._lctf.coverageIndex = function(cvg, val) {
    var tab = cvg.tab;
    if (cvg.fmt == 1)
      return tab.indexOf(val);
    if (cvg.fmt == 2) {
      var ind = Typr._lctf.getInterval(tab, val);
      if (ind != -1)
        return tab[ind + 2] + (val - tab[ind]);
    }
    return -1;
  };
  Typr._lctf.readFeatureList = function(data, offset) {
    var bin = Typr._bin;
    var offset0 = offset;
    var obj = [];
    var count = bin.readUshort(data, offset);
    offset += 2;
    for (var i = 0; i < count; i++) {
      var tag = bin.readASCII(data, offset, 4);
      offset += 4;
      var noff = bin.readUshort(data, offset);
      offset += 2;
      var feat = Typr._lctf.readFeatureTable(data, offset0 + noff);
      feat.tag = tag.trim();
      obj.push(feat);
    }
    return obj;
  };
  Typr._lctf.readFeatureTable = function(data, offset) {
    var bin = Typr._bin;
    var offset0 = offset;
    var feat = {};
    var featureParams = bin.readUshort(data, offset);
    offset += 2;
    if (featureParams > 0) {
      feat.featureParams = offset0 + featureParams;
    }
    var lookupCount = bin.readUshort(data, offset);
    offset += 2;
    feat.tab = [];
    for (var i = 0; i < lookupCount; i++)
      feat.tab.push(bin.readUshort(data, offset + 2 * i));
    return feat;
  };
  Typr._lctf.readScriptList = function(data, offset) {
    var bin = Typr._bin;
    var offset0 = offset;
    var obj = {};
    var count = bin.readUshort(data, offset);
    offset += 2;
    for (var i = 0; i < count; i++) {
      var tag = bin.readASCII(data, offset, 4);
      offset += 4;
      var noff = bin.readUshort(data, offset);
      offset += 2;
      obj[tag.trim()] = Typr._lctf.readScriptTable(data, offset0 + noff);
    }
    return obj;
  };
  Typr._lctf.readScriptTable = function(data, offset) {
    var bin = Typr._bin;
    var offset0 = offset;
    var obj = {};
    var defLangSysOff = bin.readUshort(data, offset);
    offset += 2;
    if (defLangSysOff > 0) {
      obj["default"] = Typr._lctf.readLangSysTable(data, offset0 + defLangSysOff);
    }
    var langSysCount = bin.readUshort(data, offset);
    offset += 2;
    for (var i = 0; i < langSysCount; i++) {
      var tag = bin.readASCII(data, offset, 4);
      offset += 4;
      var langSysOff = bin.readUshort(data, offset);
      offset += 2;
      obj[tag.trim()] = Typr._lctf.readLangSysTable(data, offset0 + langSysOff);
    }
    return obj;
  };
  Typr._lctf.readLangSysTable = function(data, offset) {
    var bin = Typr._bin;
    var obj = {};
    bin.readUshort(data, offset);
    offset += 2;
    obj.reqFeature = bin.readUshort(data, offset);
    offset += 2;
    var featureCount = bin.readUshort(data, offset);
    offset += 2;
    obj.features = bin.readUshorts(data, offset, featureCount);
    return obj;
  };
  Typr.CFF = {};
  Typr.CFF.parse = function(data, offset, length) {
    var bin = Typr._bin;
    data = new Uint8Array(data.buffer, offset, length);
    offset = 0;
    data[offset];
    offset++;
    data[offset];
    offset++;
    data[offset];
    offset++;
    data[offset];
    offset++;
    var ninds = [];
    offset = Typr.CFF.readIndex(data, offset, ninds);
    var names2 = [];
    for (var i = 0; i < ninds.length - 1; i++)
      names2.push(bin.readASCII(data, offset + ninds[i], ninds[i + 1] - ninds[i]));
    offset += ninds[ninds.length - 1];
    var tdinds = [];
    offset = Typr.CFF.readIndex(data, offset, tdinds);
    var topDicts = [];
    for (var i = 0; i < tdinds.length - 1; i++)
      topDicts.push(Typr.CFF.readDict(data, offset + tdinds[i], offset + tdinds[i + 1]));
    offset += tdinds[tdinds.length - 1];
    var topdict = topDicts[0];
    var sinds = [];
    offset = Typr.CFF.readIndex(data, offset, sinds);
    var strings = [];
    for (var i = 0; i < sinds.length - 1; i++)
      strings.push(bin.readASCII(data, offset + sinds[i], sinds[i + 1] - sinds[i]));
    offset += sinds[sinds.length - 1];
    Typr.CFF.readSubrs(data, offset, topdict);
    if (topdict.CharStrings) {
      offset = topdict.CharStrings;
      var sinds = [];
      offset = Typr.CFF.readIndex(data, offset, sinds);
      var cstr = [];
      for (var i = 0; i < sinds.length - 1; i++)
        cstr.push(bin.readBytes(data, offset + sinds[i], sinds[i + 1] - sinds[i]));
      topdict.CharStrings = cstr;
    }
    if (topdict.ROS) {
      offset = topdict.FDArray;
      var fdind = [];
      offset = Typr.CFF.readIndex(data, offset, fdind);
      topdict.FDArray = [];
      for (var i = 0; i < fdind.length - 1; i++) {
        var dict = Typr.CFF.readDict(data, offset + fdind[i], offset + fdind[i + 1]);
        Typr.CFF._readFDict(data, dict, strings);
        topdict.FDArray.push(dict);
      }
      offset += fdind[fdind.length - 1];
      offset = topdict.FDSelect;
      topdict.FDSelect = [];
      var fmt = data[offset];
      offset++;
      if (fmt == 3) {
        var rns = bin.readUshort(data, offset);
        offset += 2;
        for (var i = 0; i < rns + 1; i++) {
          topdict.FDSelect.push(bin.readUshort(data, offset), data[offset + 2]);
          offset += 3;
        }
      } else
        throw fmt;
    }
    if (topdict.Encoding)
      topdict.Encoding = Typr.CFF.readEncoding(data, topdict.Encoding, topdict.CharStrings.length);
    if (topdict.charset)
      topdict.charset = Typr.CFF.readCharset(data, topdict.charset, topdict.CharStrings.length);
    Typr.CFF._readFDict(data, topdict, strings);
    return topdict;
  };
  Typr.CFF._readFDict = function(data, dict, ss) {
    var offset;
    if (dict.Private) {
      offset = dict.Private[1];
      dict.Private = Typr.CFF.readDict(data, offset, offset + dict.Private[0]);
      if (dict.Private.Subrs)
        Typr.CFF.readSubrs(data, offset + dict.Private.Subrs, dict.Private);
    }
    for (var p in dict)
      if (["FamilyName", "FontName", "FullName", "Notice", "version", "Copyright"].indexOf(p) != -1)
        dict[p] = ss[dict[p] - 426 + 35];
  };
  Typr.CFF.readSubrs = function(data, offset, obj) {
    var bin = Typr._bin;
    var gsubinds = [];
    offset = Typr.CFF.readIndex(data, offset, gsubinds);
    var bias, nSubrs = gsubinds.length;
    if (nSubrs < 1240)
      bias = 107;
    else if (nSubrs < 33900)
      bias = 1131;
    else
      bias = 32768;
    obj.Bias = bias;
    obj.Subrs = [];
    for (var i = 0; i < gsubinds.length - 1; i++)
      obj.Subrs.push(bin.readBytes(data, offset + gsubinds[i], gsubinds[i + 1] - gsubinds[i]));
  };
  Typr.CFF.tableSE = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51,
    52,
    53,
    54,
    55,
    56,
    57,
    58,
    59,
    60,
    61,
    62,
    63,
    64,
    65,
    66,
    67,
    68,
    69,
    70,
    71,
    72,
    73,
    74,
    75,
    76,
    77,
    78,
    79,
    80,
    81,
    82,
    83,
    84,
    85,
    86,
    87,
    88,
    89,
    90,
    91,
    92,
    93,
    94,
    95,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    96,
    97,
    98,
    99,
    100,
    101,
    102,
    103,
    104,
    105,
    106,
    107,
    108,
    109,
    110,
    0,
    111,
    112,
    113,
    114,
    0,
    115,
    116,
    117,
    118,
    119,
    120,
    121,
    122,
    0,
    123,
    0,
    124,
    125,
    126,
    127,
    128,
    129,
    130,
    131,
    0,
    132,
    133,
    0,
    134,
    135,
    136,
    137,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    138,
    0,
    139,
    0,
    0,
    0,
    0,
    140,
    141,
    142,
    143,
    0,
    0,
    0,
    0,
    0,
    144,
    0,
    0,
    0,
    145,
    0,
    0,
    146,
    147,
    148,
    149,
    0,
    0,
    0,
    0
  ];
  Typr.CFF.glyphByUnicode = function(cff, code) {
    for (var i = 0; i < cff.charset.length; i++)
      if (cff.charset[i] == code)
        return i;
    return -1;
  };
  Typr.CFF.glyphBySE = function(cff, charcode) {
    if (charcode < 0 || charcode > 255)
      return -1;
    return Typr.CFF.glyphByUnicode(cff, Typr.CFF.tableSE[charcode]);
  };
  Typr.CFF.readEncoding = function(data, offset, num) {
    Typr._bin;
    var array = [".notdef"];
    var format = data[offset];
    offset++;
    if (format == 0) {
      var nCodes = data[offset];
      offset++;
      for (var i = 0; i < nCodes; i++)
        array.push(data[offset + i]);
    } else
      throw "error: unknown encoding format: " + format;
    return array;
  };
  Typr.CFF.readCharset = function(data, offset, num) {
    var bin = Typr._bin;
    var charset = [".notdef"];
    var format = data[offset];
    offset++;
    if (format == 0) {
      for (var i = 0; i < num; i++) {
        var first = bin.readUshort(data, offset);
        offset += 2;
        charset.push(first);
      }
    } else if (format == 1 || format == 2) {
      while (charset.length < num) {
        var first = bin.readUshort(data, offset);
        offset += 2;
        var nLeft = 0;
        if (format == 1) {
          nLeft = data[offset];
          offset++;
        } else {
          nLeft = bin.readUshort(data, offset);
          offset += 2;
        }
        for (var i = 0; i <= nLeft; i++) {
          charset.push(first);
          first++;
        }
      }
    } else
      throw "error: format: " + format;
    return charset;
  };
  Typr.CFF.readIndex = function(data, offset, inds) {
    var bin = Typr._bin;
    var count = bin.readUshort(data, offset) + 1;
    offset += 2;
    var offsize = data[offset];
    offset++;
    if (offsize == 1)
      for (var i = 0; i < count; i++)
        inds.push(data[offset + i]);
    else if (offsize == 2)
      for (var i = 0; i < count; i++)
        inds.push(bin.readUshort(data, offset + i * 2));
    else if (offsize == 3)
      for (var i = 0; i < count; i++)
        inds.push(bin.readUint(data, offset + i * 3 - 1) & 16777215);
    else if (count != 1)
      throw "unsupported offset size: " + offsize + ", count: " + count;
    offset += count * offsize;
    return offset - 1;
  };
  Typr.CFF.getCharString = function(data, offset, o) {
    var bin = Typr._bin;
    var b0 = data[offset], b1 = data[offset + 1];
    data[offset + 2];
    data[offset + 3];
    data[offset + 4];
    var vs = 1;
    var op = null, val = null;
    if (b0 <= 20) {
      op = b0;
      vs = 1;
    }
    if (b0 == 12) {
      op = b0 * 100 + b1;
      vs = 2;
    }
    if (21 <= b0 && b0 <= 27) {
      op = b0;
      vs = 1;
    }
    if (b0 == 28) {
      val = bin.readShort(data, offset + 1);
      vs = 3;
    }
    if (29 <= b0 && b0 <= 31) {
      op = b0;
      vs = 1;
    }
    if (32 <= b0 && b0 <= 246) {
      val = b0 - 139;
      vs = 1;
    }
    if (247 <= b0 && b0 <= 250) {
      val = (b0 - 247) * 256 + b1 + 108;
      vs = 2;
    }
    if (251 <= b0 && b0 <= 254) {
      val = -(b0 - 251) * 256 - b1 - 108;
      vs = 2;
    }
    if (b0 == 255) {
      val = bin.readInt(data, offset + 1) / 65535;
      vs = 5;
    }
    o.val = val != null ? val : "o" + op;
    o.size = vs;
  };
  Typr.CFF.readCharString = function(data, offset, length) {
    var end = offset + length;
    var bin = Typr._bin;
    var arr = [];
    while (offset < end) {
      var b0 = data[offset], b1 = data[offset + 1];
      data[offset + 2];
      data[offset + 3];
      data[offset + 4];
      var vs = 1;
      var op = null, val = null;
      if (b0 <= 20) {
        op = b0;
        vs = 1;
      }
      if (b0 == 12) {
        op = b0 * 100 + b1;
        vs = 2;
      }
      if (b0 == 19 || b0 == 20) {
        op = b0;
        vs = 2;
      }
      if (21 <= b0 && b0 <= 27) {
        op = b0;
        vs = 1;
      }
      if (b0 == 28) {
        val = bin.readShort(data, offset + 1);
        vs = 3;
      }
      if (29 <= b0 && b0 <= 31) {
        op = b0;
        vs = 1;
      }
      if (32 <= b0 && b0 <= 246) {
        val = b0 - 139;
        vs = 1;
      }
      if (247 <= b0 && b0 <= 250) {
        val = (b0 - 247) * 256 + b1 + 108;
        vs = 2;
      }
      if (251 <= b0 && b0 <= 254) {
        val = -(b0 - 251) * 256 - b1 - 108;
        vs = 2;
      }
      if (b0 == 255) {
        val = bin.readInt(data, offset + 1) / 65535;
        vs = 5;
      }
      arr.push(val != null ? val : "o" + op);
      offset += vs;
    }
    return arr;
  };
  Typr.CFF.readDict = function(data, offset, end) {
    var bin = Typr._bin;
    var dict = {};
    var carr = [];
    while (offset < end) {
      var b0 = data[offset], b1 = data[offset + 1];
      data[offset + 2];
      data[offset + 3];
      data[offset + 4];
      var vs = 1;
      var key = null, val = null;
      if (b0 == 28) {
        val = bin.readShort(data, offset + 1);
        vs = 3;
      }
      if (b0 == 29) {
        val = bin.readInt(data, offset + 1);
        vs = 5;
      }
      if (32 <= b0 && b0 <= 246) {
        val = b0 - 139;
        vs = 1;
      }
      if (247 <= b0 && b0 <= 250) {
        val = (b0 - 247) * 256 + b1 + 108;
        vs = 2;
      }
      if (251 <= b0 && b0 <= 254) {
        val = -(b0 - 251) * 256 - b1 - 108;
        vs = 2;
      }
      if (b0 == 255) {
        val = bin.readInt(data, offset + 1) / 65535;
        vs = 5;
        throw "unknown number";
      }
      if (b0 == 30) {
        var nibs = [];
        vs = 1;
        while (true) {
          var b = data[offset + vs];
          vs++;
          var nib0 = b >> 4, nib1 = b & 15;
          if (nib0 != 15)
            nibs.push(nib0);
          if (nib1 != 15)
            nibs.push(nib1);
          if (nib1 == 15)
            break;
        }
        var s = "";
        var chars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ".", "e", "e-", "reserved", "-", "endOfNumber"];
        for (var i = 0; i < nibs.length; i++)
          s += chars[nibs[i]];
        val = parseFloat(s);
      }
      if (b0 <= 21) {
        var keys = [
          "version",
          "Notice",
          "FullName",
          "FamilyName",
          "Weight",
          "FontBBox",
          "BlueValues",
          "OtherBlues",
          "FamilyBlues",
          "FamilyOtherBlues",
          "StdHW",
          "StdVW",
          "escape",
          "UniqueID",
          "XUID",
          "charset",
          "Encoding",
          "CharStrings",
          "Private",
          "Subrs",
          "defaultWidthX",
          "nominalWidthX"
        ];
        key = keys[b0];
        vs = 1;
        if (b0 == 12) {
          var keys = [
            "Copyright",
            "isFixedPitch",
            "ItalicAngle",
            "UnderlinePosition",
            "UnderlineThickness",
            "PaintType",
            "CharstringType",
            "FontMatrix",
            "StrokeWidth",
            "BlueScale",
            "BlueShift",
            "BlueFuzz",
            "StemSnapH",
            "StemSnapV",
            "ForceBold",
            0,
            0,
            "LanguageGroup",
            "ExpansionFactor",
            "initialRandomSeed",
            "SyntheticBase",
            "PostScript",
            "BaseFontName",
            "BaseFontBlend",
            0,
            0,
            0,
            0,
            0,
            0,
            "ROS",
            "CIDFontVersion",
            "CIDFontRevision",
            "CIDFontType",
            "CIDCount",
            "UIDBase",
            "FDArray",
            "FDSelect",
            "FontName"
          ];
          key = keys[b1];
          vs = 2;
        }
      }
      if (key != null) {
        dict[key] = carr.length == 1 ? carr[0] : carr;
        carr = [];
      } else
        carr.push(val);
      offset += vs;
    }
    return dict;
  };
  Typr.cmap = {};
  Typr.cmap.parse = function(data, offset, length) {
    data = new Uint8Array(data.buffer, offset, length);
    offset = 0;
    var bin = Typr._bin;
    var obj = {};
    bin.readUshort(data, offset);
    offset += 2;
    var numTables = bin.readUshort(data, offset);
    offset += 2;
    var offs = [];
    obj.tables = [];
    for (var i = 0; i < numTables; i++) {
      var platformID = bin.readUshort(data, offset);
      offset += 2;
      var encodingID = bin.readUshort(data, offset);
      offset += 2;
      var noffset = bin.readUint(data, offset);
      offset += 4;
      var id = "p" + platformID + "e" + encodingID;
      var tind = offs.indexOf(noffset);
      if (tind == -1) {
        tind = obj.tables.length;
        var subt;
        offs.push(noffset);
        var format = bin.readUshort(data, noffset);
        if (format == 0)
          subt = Typr.cmap.parse0(data, noffset);
        else if (format == 4)
          subt = Typr.cmap.parse4(data, noffset);
        else if (format == 6)
          subt = Typr.cmap.parse6(data, noffset);
        else if (format == 12)
          subt = Typr.cmap.parse12(data, noffset);
        else
          console.warn("unknown format: " + format, platformID, encodingID, noffset);
        obj.tables.push(subt);
      }
      if (obj[id] != null)
        throw "multiple tables for one platform+encoding";
      obj[id] = tind;
    }
    return obj;
  };
  Typr.cmap.parse0 = function(data, offset) {
    var bin = Typr._bin;
    var obj = {};
    obj.format = bin.readUshort(data, offset);
    offset += 2;
    var len = bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    obj.map = [];
    for (var i = 0; i < len - 6; i++)
      obj.map.push(data[offset + i]);
    return obj;
  };
  Typr.cmap.parse4 = function(data, offset) {
    var bin = Typr._bin;
    var offset0 = offset;
    var obj = {};
    obj.format = bin.readUshort(data, offset);
    offset += 2;
    var length = bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    var segCountX2 = bin.readUshort(data, offset);
    offset += 2;
    var segCount = segCountX2 / 2;
    obj.searchRange = bin.readUshort(data, offset);
    offset += 2;
    obj.entrySelector = bin.readUshort(data, offset);
    offset += 2;
    obj.rangeShift = bin.readUshort(data, offset);
    offset += 2;
    obj.endCount = bin.readUshorts(data, offset, segCount);
    offset += segCount * 2;
    offset += 2;
    obj.startCount = bin.readUshorts(data, offset, segCount);
    offset += segCount * 2;
    obj.idDelta = [];
    for (var i = 0; i < segCount; i++) {
      obj.idDelta.push(bin.readShort(data, offset));
      offset += 2;
    }
    obj.idRangeOffset = bin.readUshorts(data, offset, segCount);
    offset += segCount * 2;
    obj.glyphIdArray = [];
    while (offset < offset0 + length) {
      obj.glyphIdArray.push(bin.readUshort(data, offset));
      offset += 2;
    }
    return obj;
  };
  Typr.cmap.parse6 = function(data, offset) {
    var bin = Typr._bin;
    var obj = {};
    obj.format = bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    obj.firstCode = bin.readUshort(data, offset);
    offset += 2;
    var entryCount = bin.readUshort(data, offset);
    offset += 2;
    obj.glyphIdArray = [];
    for (var i = 0; i < entryCount; i++) {
      obj.glyphIdArray.push(bin.readUshort(data, offset));
      offset += 2;
    }
    return obj;
  };
  Typr.cmap.parse12 = function(data, offset) {
    var bin = Typr._bin;
    var obj = {};
    obj.format = bin.readUshort(data, offset);
    offset += 2;
    offset += 2;
    bin.readUint(data, offset);
    offset += 4;
    bin.readUint(data, offset);
    offset += 4;
    var nGroups = bin.readUint(data, offset);
    offset += 4;
    obj.groups = [];
    for (var i = 0; i < nGroups; i++) {
      var off = offset + i * 12;
      var startCharCode = bin.readUint(data, off + 0);
      var endCharCode = bin.readUint(data, off + 4);
      var startGlyphID = bin.readUint(data, off + 8);
      obj.groups.push([startCharCode, endCharCode, startGlyphID]);
    }
    return obj;
  };
  Typr.glyf = {};
  Typr.glyf.parse = function(data, offset, length, font) {
    var obj = [];
    for (var g = 0; g < font.maxp.numGlyphs; g++)
      obj.push(null);
    return obj;
  };
  Typr.glyf._parseGlyf = function(font, g) {
    var bin = Typr._bin;
    var data = font._data;
    var offset = Typr._tabOffset(data, "glyf", font._offset) + font.loca[g];
    if (font.loca[g] == font.loca[g + 1])
      return null;
    var gl = {};
    gl.noc = bin.readShort(data, offset);
    offset += 2;
    gl.xMin = bin.readShort(data, offset);
    offset += 2;
    gl.yMin = bin.readShort(data, offset);
    offset += 2;
    gl.xMax = bin.readShort(data, offset);
    offset += 2;
    gl.yMax = bin.readShort(data, offset);
    offset += 2;
    if (gl.xMin >= gl.xMax || gl.yMin >= gl.yMax)
      return null;
    if (gl.noc > 0) {
      gl.endPts = [];
      for (var i = 0; i < gl.noc; i++) {
        gl.endPts.push(bin.readUshort(data, offset));
        offset += 2;
      }
      var instructionLength = bin.readUshort(data, offset);
      offset += 2;
      if (data.length - offset < instructionLength)
        return null;
      gl.instructions = bin.readBytes(data, offset, instructionLength);
      offset += instructionLength;
      var crdnum = gl.endPts[gl.noc - 1] + 1;
      gl.flags = [];
      for (var i = 0; i < crdnum; i++) {
        var flag = data[offset];
        offset++;
        gl.flags.push(flag);
        if ((flag & 8) != 0) {
          var rep = data[offset];
          offset++;
          for (var j = 0; j < rep; j++) {
            gl.flags.push(flag);
            i++;
          }
        }
      }
      gl.xs = [];
      for (var i = 0; i < crdnum; i++) {
        var i8 = (gl.flags[i] & 2) != 0, same = (gl.flags[i] & 16) != 0;
        if (i8) {
          gl.xs.push(same ? data[offset] : -data[offset]);
          offset++;
        } else {
          if (same)
            gl.xs.push(0);
          else {
            gl.xs.push(bin.readShort(data, offset));
            offset += 2;
          }
        }
      }
      gl.ys = [];
      for (var i = 0; i < crdnum; i++) {
        var i8 = (gl.flags[i] & 4) != 0, same = (gl.flags[i] & 32) != 0;
        if (i8) {
          gl.ys.push(same ? data[offset] : -data[offset]);
          offset++;
        } else {
          if (same)
            gl.ys.push(0);
          else {
            gl.ys.push(bin.readShort(data, offset));
            offset += 2;
          }
        }
      }
      var x = 0, y = 0;
      for (var i = 0; i < crdnum; i++) {
        x += gl.xs[i];
        y += gl.ys[i];
        gl.xs[i] = x;
        gl.ys[i] = y;
      }
    } else {
      var ARG_1_AND_2_ARE_WORDS = 1 << 0;
      var ARGS_ARE_XY_VALUES = 1 << 1;
      var WE_HAVE_A_SCALE = 1 << 3;
      var MORE_COMPONENTS = 1 << 5;
      var WE_HAVE_AN_X_AND_Y_SCALE = 1 << 6;
      var WE_HAVE_A_TWO_BY_TWO = 1 << 7;
      var WE_HAVE_INSTRUCTIONS = 1 << 8;
      gl.parts = [];
      var flags;
      do {
        flags = bin.readUshort(data, offset);
        offset += 2;
        var part = { m: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }, p1: -1, p2: -1 };
        gl.parts.push(part);
        part.glyphIndex = bin.readUshort(data, offset);
        offset += 2;
        if (flags & ARG_1_AND_2_ARE_WORDS) {
          var arg1 = bin.readShort(data, offset);
          offset += 2;
          var arg2 = bin.readShort(data, offset);
          offset += 2;
        } else {
          var arg1 = bin.readInt8(data, offset);
          offset++;
          var arg2 = bin.readInt8(data, offset);
          offset++;
        }
        if (flags & ARGS_ARE_XY_VALUES) {
          part.m.tx = arg1;
          part.m.ty = arg2;
        } else {
          part.p1 = arg1;
          part.p2 = arg2;
        }
        if (flags & WE_HAVE_A_SCALE) {
          part.m.a = part.m.d = bin.readF2dot14(data, offset);
          offset += 2;
        } else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
          part.m.a = bin.readF2dot14(data, offset);
          offset += 2;
          part.m.d = bin.readF2dot14(data, offset);
          offset += 2;
        } else if (flags & WE_HAVE_A_TWO_BY_TWO) {
          part.m.a = bin.readF2dot14(data, offset);
          offset += 2;
          part.m.b = bin.readF2dot14(data, offset);
          offset += 2;
          part.m.c = bin.readF2dot14(data, offset);
          offset += 2;
          part.m.d = bin.readF2dot14(data, offset);
          offset += 2;
        }
      } while (flags & MORE_COMPONENTS);
      if (flags & WE_HAVE_INSTRUCTIONS) {
        var numInstr = bin.readUshort(data, offset);
        offset += 2;
        gl.instr = [];
        for (var i = 0; i < numInstr; i++) {
          gl.instr.push(data[offset]);
          offset++;
        }
      }
    }
    return gl;
  };
  Typr.GPOS = {};
  Typr.GPOS.parse = function(data, offset, length, font) {
    return Typr._lctf.parse(data, offset, length, font, Typr.GPOS.subt);
  };
  Typr.GPOS.subt = function(data, ltype, offset, ltable) {
    var bin = Typr._bin, offset0 = offset, tab = {};
    tab.fmt = bin.readUshort(data, offset);
    offset += 2;
    if (ltype == 1 || ltype == 2 || ltype == 3 || ltype == 7 || ltype == 8 && tab.fmt <= 2) {
      var covOff = bin.readUshort(data, offset);
      offset += 2;
      tab.coverage = Typr._lctf.readCoverage(data, covOff + offset0);
    }
    if (ltype == 1 && tab.fmt == 1) {
      var valFmt1 = bin.readUshort(data, offset);
      offset += 2;
      var ones1 = Typr._lctf.numOfOnes(valFmt1);
      if (valFmt1 != 0)
        tab.pos = Typr.GPOS.readValueRecord(data, offset, valFmt1);
    } else if (ltype == 2 && tab.fmt >= 1 && tab.fmt <= 2) {
      var valFmt1 = bin.readUshort(data, offset);
      offset += 2;
      var valFmt2 = bin.readUshort(data, offset);
      offset += 2;
      var ones1 = Typr._lctf.numOfOnes(valFmt1);
      var ones2 = Typr._lctf.numOfOnes(valFmt2);
      if (tab.fmt == 1) {
        tab.pairsets = [];
        var psc = bin.readUshort(data, offset);
        offset += 2;
        for (var i = 0; i < psc; i++) {
          var psoff = offset0 + bin.readUshort(data, offset);
          offset += 2;
          var pvc = bin.readUshort(data, psoff);
          psoff += 2;
          var arr = [];
          for (var j = 0; j < pvc; j++) {
            var gid2 = bin.readUshort(data, psoff);
            psoff += 2;
            var value1, value2;
            if (valFmt1 != 0) {
              value1 = Typr.GPOS.readValueRecord(data, psoff, valFmt1);
              psoff += ones1 * 2;
            }
            if (valFmt2 != 0) {
              value2 = Typr.GPOS.readValueRecord(data, psoff, valFmt2);
              psoff += ones2 * 2;
            }
            arr.push({ gid2, val1: value1, val2: value2 });
          }
          tab.pairsets.push(arr);
        }
      }
      if (tab.fmt == 2) {
        var classDef1 = bin.readUshort(data, offset);
        offset += 2;
        var classDef2 = bin.readUshort(data, offset);
        offset += 2;
        var class1Count = bin.readUshort(data, offset);
        offset += 2;
        var class2Count = bin.readUshort(data, offset);
        offset += 2;
        tab.classDef1 = Typr._lctf.readClassDef(data, offset0 + classDef1);
        tab.classDef2 = Typr._lctf.readClassDef(data, offset0 + classDef2);
        tab.matrix = [];
        for (var i = 0; i < class1Count; i++) {
          var row = [];
          for (var j = 0; j < class2Count; j++) {
            var value1 = null, value2 = null;
            if (valFmt1 != 0) {
              value1 = Typr.GPOS.readValueRecord(data, offset, valFmt1);
              offset += ones1 * 2;
            }
            if (valFmt2 != 0) {
              value2 = Typr.GPOS.readValueRecord(data, offset, valFmt2);
              offset += ones2 * 2;
            }
            row.push({ val1: value1, val2: value2 });
          }
          tab.matrix.push(row);
        }
      }
    } else if (ltype == 9 && tab.fmt == 1) {
      var extType = bin.readUshort(data, offset);
      offset += 2;
      var extOffset = bin.readUint(data, offset);
      offset += 4;
      if (ltable.ltype == 9) {
        ltable.ltype = extType;
      } else if (ltable.ltype != extType) {
        throw "invalid extension substitution";
      }
      return Typr.GPOS.subt(data, ltable.ltype, offset0 + extOffset);
    } else
      console.warn("unsupported GPOS table LookupType", ltype, "format", tab.fmt);
    return tab;
  };
  Typr.GPOS.readValueRecord = function(data, offset, valFmt) {
    var bin = Typr._bin;
    var arr = [];
    arr.push(valFmt & 1 ? bin.readShort(data, offset) : 0);
    offset += valFmt & 1 ? 2 : 0;
    arr.push(valFmt & 2 ? bin.readShort(data, offset) : 0);
    offset += valFmt & 2 ? 2 : 0;
    arr.push(valFmt & 4 ? bin.readShort(data, offset) : 0);
    offset += valFmt & 4 ? 2 : 0;
    arr.push(valFmt & 8 ? bin.readShort(data, offset) : 0);
    offset += valFmt & 8 ? 2 : 0;
    return arr;
  };
  Typr.GSUB = {};
  Typr.GSUB.parse = function(data, offset, length, font) {
    return Typr._lctf.parse(data, offset, length, font, Typr.GSUB.subt);
  };
  Typr.GSUB.subt = function(data, ltype, offset, ltable) {
    var bin = Typr._bin, offset0 = offset, tab = {};
    tab.fmt = bin.readUshort(data, offset);
    offset += 2;
    if (ltype != 1 && ltype != 4 && ltype != 5 && ltype != 6)
      return null;
    if (ltype == 1 || ltype == 4 || ltype == 5 && tab.fmt <= 2 || ltype == 6 && tab.fmt <= 2) {
      var covOff = bin.readUshort(data, offset);
      offset += 2;
      tab.coverage = Typr._lctf.readCoverage(data, offset0 + covOff);
    }
    if (ltype == 1 && tab.fmt >= 1 && tab.fmt <= 2) {
      if (tab.fmt == 1) {
        tab.delta = bin.readShort(data, offset);
        offset += 2;
      } else if (tab.fmt == 2) {
        var cnt = bin.readUshort(data, offset);
        offset += 2;
        tab.newg = bin.readUshorts(data, offset, cnt);
        offset += tab.newg.length * 2;
      }
    } else if (ltype == 4) {
      tab.vals = [];
      var cnt = bin.readUshort(data, offset);
      offset += 2;
      for (var i = 0; i < cnt; i++) {
        var loff = bin.readUshort(data, offset);
        offset += 2;
        tab.vals.push(Typr.GSUB.readLigatureSet(data, offset0 + loff));
      }
    } else if (ltype == 5 && tab.fmt == 2) {
      if (tab.fmt == 2) {
        var cDefOffset = bin.readUshort(data, offset);
        offset += 2;
        tab.cDef = Typr._lctf.readClassDef(data, offset0 + cDefOffset);
        tab.scset = [];
        var subClassSetCount = bin.readUshort(data, offset);
        offset += 2;
        for (var i = 0; i < subClassSetCount; i++) {
          var scsOff = bin.readUshort(data, offset);
          offset += 2;
          tab.scset.push(scsOff == 0 ? null : Typr.GSUB.readSubClassSet(data, offset0 + scsOff));
        }
      }
    } else if (ltype == 6 && tab.fmt == 3) {
      if (tab.fmt == 3) {
        for (var i = 0; i < 3; i++) {
          var cnt = bin.readUshort(data, offset);
          offset += 2;
          var cvgs = [];
          for (var j = 0; j < cnt; j++)
            cvgs.push(Typr._lctf.readCoverage(data, offset0 + bin.readUshort(data, offset + j * 2)));
          offset += cnt * 2;
          if (i == 0)
            tab.backCvg = cvgs;
          if (i == 1)
            tab.inptCvg = cvgs;
          if (i == 2)
            tab.ahedCvg = cvgs;
        }
        var cnt = bin.readUshort(data, offset);
        offset += 2;
        tab.lookupRec = Typr.GSUB.readSubstLookupRecords(data, offset, cnt);
      }
    } else if (ltype == 7 && tab.fmt == 1) {
      var extType = bin.readUshort(data, offset);
      offset += 2;
      var extOffset = bin.readUint(data, offset);
      offset += 4;
      if (ltable.ltype == 9) {
        ltable.ltype = extType;
      } else if (ltable.ltype != extType) {
        throw "invalid extension substitution";
      }
      return Typr.GSUB.subt(data, ltable.ltype, offset0 + extOffset);
    } else
      console.warn("unsupported GSUB table LookupType", ltype, "format", tab.fmt);
    return tab;
  };
  Typr.GSUB.readSubClassSet = function(data, offset) {
    var rUs = Typr._bin.readUshort, offset0 = offset, lset = [];
    var cnt = rUs(data, offset);
    offset += 2;
    for (var i = 0; i < cnt; i++) {
      var loff = rUs(data, offset);
      offset += 2;
      lset.push(Typr.GSUB.readSubClassRule(data, offset0 + loff));
    }
    return lset;
  };
  Typr.GSUB.readSubClassRule = function(data, offset) {
    var rUs = Typr._bin.readUshort, rule = {};
    var gcount = rUs(data, offset);
    offset += 2;
    var scount = rUs(data, offset);
    offset += 2;
    rule.input = [];
    for (var i = 0; i < gcount - 1; i++) {
      rule.input.push(rUs(data, offset));
      offset += 2;
    }
    rule.substLookupRecords = Typr.GSUB.readSubstLookupRecords(data, offset, scount);
    return rule;
  };
  Typr.GSUB.readSubstLookupRecords = function(data, offset, cnt) {
    var rUs = Typr._bin.readUshort;
    var out = [];
    for (var i = 0; i < cnt; i++) {
      out.push(rUs(data, offset), rUs(data, offset + 2));
      offset += 4;
    }
    return out;
  };
  Typr.GSUB.readChainSubClassSet = function(data, offset) {
    var bin = Typr._bin, offset0 = offset, lset = [];
    var cnt = bin.readUshort(data, offset);
    offset += 2;
    for (var i = 0; i < cnt; i++) {
      var loff = bin.readUshort(data, offset);
      offset += 2;
      lset.push(Typr.GSUB.readChainSubClassRule(data, offset0 + loff));
    }
    return lset;
  };
  Typr.GSUB.readChainSubClassRule = function(data, offset) {
    var bin = Typr._bin, rule = {};
    var pps = ["backtrack", "input", "lookahead"];
    for (var pi = 0; pi < pps.length; pi++) {
      var cnt = bin.readUshort(data, offset);
      offset += 2;
      if (pi == 1)
        cnt--;
      rule[pps[pi]] = bin.readUshorts(data, offset, cnt);
      offset += rule[pps[pi]].length * 2;
    }
    var cnt = bin.readUshort(data, offset);
    offset += 2;
    rule.subst = bin.readUshorts(data, offset, cnt * 2);
    offset += rule.subst.length * 2;
    return rule;
  };
  Typr.GSUB.readLigatureSet = function(data, offset) {
    var bin = Typr._bin, offset0 = offset, lset = [];
    var lcnt = bin.readUshort(data, offset);
    offset += 2;
    for (var j = 0; j < lcnt; j++) {
      var loff = bin.readUshort(data, offset);
      offset += 2;
      lset.push(Typr.GSUB.readLigature(data, offset0 + loff));
    }
    return lset;
  };
  Typr.GSUB.readLigature = function(data, offset) {
    var bin = Typr._bin, lig = { chain: [] };
    lig.nglyph = bin.readUshort(data, offset);
    offset += 2;
    var ccnt = bin.readUshort(data, offset);
    offset += 2;
    for (var k = 0; k < ccnt - 1; k++) {
      lig.chain.push(bin.readUshort(data, offset));
      offset += 2;
    }
    return lig;
  };
  Typr.head = {};
  Typr.head.parse = function(data, offset, length) {
    var bin = Typr._bin;
    var obj = {};
    bin.readFixed(data, offset);
    offset += 4;
    obj.fontRevision = bin.readFixed(data, offset);
    offset += 4;
    bin.readUint(data, offset);
    offset += 4;
    bin.readUint(data, offset);
    offset += 4;
    obj.flags = bin.readUshort(data, offset);
    offset += 2;
    obj.unitsPerEm = bin.readUshort(data, offset);
    offset += 2;
    obj.created = bin.readUint64(data, offset);
    offset += 8;
    obj.modified = bin.readUint64(data, offset);
    offset += 8;
    obj.xMin = bin.readShort(data, offset);
    offset += 2;
    obj.yMin = bin.readShort(data, offset);
    offset += 2;
    obj.xMax = bin.readShort(data, offset);
    offset += 2;
    obj.yMax = bin.readShort(data, offset);
    offset += 2;
    obj.macStyle = bin.readUshort(data, offset);
    offset += 2;
    obj.lowestRecPPEM = bin.readUshort(data, offset);
    offset += 2;
    obj.fontDirectionHint = bin.readShort(data, offset);
    offset += 2;
    obj.indexToLocFormat = bin.readShort(data, offset);
    offset += 2;
    obj.glyphDataFormat = bin.readShort(data, offset);
    offset += 2;
    return obj;
  };
  Typr.hhea = {};
  Typr.hhea.parse = function(data, offset, length) {
    var bin = Typr._bin;
    var obj = {};
    bin.readFixed(data, offset);
    offset += 4;
    obj.ascender = bin.readShort(data, offset);
    offset += 2;
    obj.descender = bin.readShort(data, offset);
    offset += 2;
    obj.lineGap = bin.readShort(data, offset);
    offset += 2;
    obj.advanceWidthMax = bin.readUshort(data, offset);
    offset += 2;
    obj.minLeftSideBearing = bin.readShort(data, offset);
    offset += 2;
    obj.minRightSideBearing = bin.readShort(data, offset);
    offset += 2;
    obj.xMaxExtent = bin.readShort(data, offset);
    offset += 2;
    obj.caretSlopeRise = bin.readShort(data, offset);
    offset += 2;
    obj.caretSlopeRun = bin.readShort(data, offset);
    offset += 2;
    obj.caretOffset = bin.readShort(data, offset);
    offset += 2;
    offset += 4 * 2;
    obj.metricDataFormat = bin.readShort(data, offset);
    offset += 2;
    obj.numberOfHMetrics = bin.readUshort(data, offset);
    offset += 2;
    return obj;
  };
  Typr.hmtx = {};
  Typr.hmtx.parse = function(data, offset, length, font) {
    var bin = Typr._bin;
    var obj = {};
    obj.aWidth = [];
    obj.lsBearing = [];
    var aw = 0, lsb = 0;
    for (var i = 0; i < font.maxp.numGlyphs; i++) {
      if (i < font.hhea.numberOfHMetrics) {
        aw = bin.readUshort(data, offset);
        offset += 2;
        lsb = bin.readShort(data, offset);
        offset += 2;
      }
      obj.aWidth.push(aw);
      obj.lsBearing.push(lsb);
    }
    return obj;
  };
  Typr.kern = {};
  Typr.kern.parse = function(data, offset, length, font) {
    var bin = Typr._bin;
    var version = bin.readUshort(data, offset);
    offset += 2;
    if (version == 1)
      return Typr.kern.parseV1(data, offset - 2, length, font);
    var nTables = bin.readUshort(data, offset);
    offset += 2;
    var map2 = { glyph1: [], rval: [] };
    for (var i = 0; i < nTables; i++) {
      offset += 2;
      var length = bin.readUshort(data, offset);
      offset += 2;
      var coverage = bin.readUshort(data, offset);
      offset += 2;
      var format = coverage >>> 8;
      format &= 15;
      if (format == 0)
        offset = Typr.kern.readFormat0(data, offset, map2);
      else
        throw "unknown kern table format: " + format;
    }
    return map2;
  };
  Typr.kern.parseV1 = function(data, offset, length, font) {
    var bin = Typr._bin;
    bin.readFixed(data, offset);
    offset += 4;
    var nTables = bin.readUint(data, offset);
    offset += 4;
    var map2 = { glyph1: [], rval: [] };
    for (var i = 0; i < nTables; i++) {
      bin.readUint(data, offset);
      offset += 4;
      var coverage = bin.readUshort(data, offset);
      offset += 2;
      bin.readUshort(data, offset);
      offset += 2;
      var format = coverage >>> 8;
      format &= 15;
      if (format == 0)
        offset = Typr.kern.readFormat0(data, offset, map2);
      else
        throw "unknown kern table format: " + format;
    }
    return map2;
  };
  Typr.kern.readFormat0 = function(data, offset, map2) {
    var bin = Typr._bin;
    var pleft = -1;
    var nPairs = bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    for (var j = 0; j < nPairs; j++) {
      var left = bin.readUshort(data, offset);
      offset += 2;
      var right = bin.readUshort(data, offset);
      offset += 2;
      var value = bin.readShort(data, offset);
      offset += 2;
      if (left != pleft) {
        map2.glyph1.push(left);
        map2.rval.push({ glyph2: [], vals: [] });
      }
      var rval = map2.rval[map2.rval.length - 1];
      rval.glyph2.push(right);
      rval.vals.push(value);
      pleft = left;
    }
    return offset;
  };
  Typr.loca = {};
  Typr.loca.parse = function(data, offset, length, font) {
    var bin = Typr._bin;
    var obj = [];
    var ver = font.head.indexToLocFormat;
    var len = font.maxp.numGlyphs + 1;
    if (ver == 0)
      for (var i = 0; i < len; i++)
        obj.push(bin.readUshort(data, offset + (i << 1)) << 1);
    if (ver == 1)
      for (var i = 0; i < len; i++)
        obj.push(bin.readUint(data, offset + (i << 2)));
    return obj;
  };
  Typr.maxp = {};
  Typr.maxp.parse = function(data, offset, length) {
    var bin = Typr._bin;
    var obj = {};
    var ver = bin.readUint(data, offset);
    offset += 4;
    obj.numGlyphs = bin.readUshort(data, offset);
    offset += 2;
    if (ver == 65536) {
      obj.maxPoints = bin.readUshort(data, offset);
      offset += 2;
      obj.maxContours = bin.readUshort(data, offset);
      offset += 2;
      obj.maxCompositePoints = bin.readUshort(data, offset);
      offset += 2;
      obj.maxCompositeContours = bin.readUshort(data, offset);
      offset += 2;
      obj.maxZones = bin.readUshort(data, offset);
      offset += 2;
      obj.maxTwilightPoints = bin.readUshort(data, offset);
      offset += 2;
      obj.maxStorage = bin.readUshort(data, offset);
      offset += 2;
      obj.maxFunctionDefs = bin.readUshort(data, offset);
      offset += 2;
      obj.maxInstructionDefs = bin.readUshort(data, offset);
      offset += 2;
      obj.maxStackElements = bin.readUshort(data, offset);
      offset += 2;
      obj.maxSizeOfInstructions = bin.readUshort(data, offset);
      offset += 2;
      obj.maxComponentElements = bin.readUshort(data, offset);
      offset += 2;
      obj.maxComponentDepth = bin.readUshort(data, offset);
      offset += 2;
    }
    return obj;
  };
  Typr.name = {};
  Typr.name.parse = function(data, offset, length) {
    var bin = Typr._bin;
    var obj = {};
    bin.readUshort(data, offset);
    offset += 2;
    var count = bin.readUshort(data, offset);
    offset += 2;
    bin.readUshort(data, offset);
    offset += 2;
    var names2 = [
      "copyright",
      "fontFamily",
      "fontSubfamily",
      "ID",
      "fullName",
      "version",
      "postScriptName",
      "trademark",
      "manufacturer",
      "designer",
      "description",
      "urlVendor",
      "urlDesigner",
      "licence",
      "licenceURL",
      "---",
      "typoFamilyName",
      "typoSubfamilyName",
      "compatibleFull",
      "sampleText",
      "postScriptCID",
      "wwsFamilyName",
      "wwsSubfamilyName",
      "lightPalette",
      "darkPalette"
    ];
    var offset0 = offset;
    for (var i = 0; i < count; i++) {
      var platformID = bin.readUshort(data, offset);
      offset += 2;
      var encodingID = bin.readUshort(data, offset);
      offset += 2;
      var languageID = bin.readUshort(data, offset);
      offset += 2;
      var nameID = bin.readUshort(data, offset);
      offset += 2;
      var slen = bin.readUshort(data, offset);
      offset += 2;
      var noffset = bin.readUshort(data, offset);
      offset += 2;
      var cname = names2[nameID];
      var soff = offset0 + count * 12 + noffset;
      var str;
      if (platformID == 0)
        str = bin.readUnicode(data, soff, slen / 2);
      else if (platformID == 3 && encodingID == 0)
        str = bin.readUnicode(data, soff, slen / 2);
      else if (encodingID == 0)
        str = bin.readASCII(data, soff, slen);
      else if (encodingID == 1)
        str = bin.readUnicode(data, soff, slen / 2);
      else if (encodingID == 3)
        str = bin.readUnicode(data, soff, slen / 2);
      else if (platformID == 1) {
        str = bin.readASCII(data, soff, slen);
        console.warn("reading unknown MAC encoding " + encodingID + " as ASCII");
      } else
        throw "unknown encoding " + encodingID + ", platformID: " + platformID;
      var tid = "p" + platformID + "," + languageID.toString(16);
      if (obj[tid] == null)
        obj[tid] = {};
      obj[tid][cname !== void 0 ? cname : nameID] = str;
      obj[tid]._lang = languageID;
    }
    for (var p in obj)
      if (obj[p].postScriptName != null && obj[p]._lang == 1033)
        return obj[p];
    for (var p in obj)
      if (obj[p].postScriptName != null && obj[p]._lang == 0)
        return obj[p];
    for (var p in obj)
      if (obj[p].postScriptName != null && obj[p]._lang == 3084)
        return obj[p];
    for (var p in obj)
      if (obj[p].postScriptName != null)
        return obj[p];
    var tname;
    for (var p in obj) {
      tname = p;
      break;
    }
    console.warn("returning name table with languageID " + obj[tname]._lang);
    return obj[tname];
  };
  Typr["OS/2"] = {};
  Typr["OS/2"].parse = function(data, offset, length) {
    var bin = Typr._bin;
    var ver = bin.readUshort(data, offset);
    offset += 2;
    var obj = {};
    if (ver == 0)
      Typr["OS/2"].version0(data, offset, obj);
    else if (ver == 1)
      Typr["OS/2"].version1(data, offset, obj);
    else if (ver == 2 || ver == 3 || ver == 4)
      Typr["OS/2"].version2(data, offset, obj);
    else if (ver == 5)
      Typr["OS/2"].version5(data, offset, obj);
    else
      throw "unknown OS/2 table version: " + ver;
    return obj;
  };
  Typr["OS/2"].version0 = function(data, offset, obj) {
    var bin = Typr._bin;
    obj.xAvgCharWidth = bin.readShort(data, offset);
    offset += 2;
    obj.usWeightClass = bin.readUshort(data, offset);
    offset += 2;
    obj.usWidthClass = bin.readUshort(data, offset);
    offset += 2;
    obj.fsType = bin.readUshort(data, offset);
    offset += 2;
    obj.ySubscriptXSize = bin.readShort(data, offset);
    offset += 2;
    obj.ySubscriptYSize = bin.readShort(data, offset);
    offset += 2;
    obj.ySubscriptXOffset = bin.readShort(data, offset);
    offset += 2;
    obj.ySubscriptYOffset = bin.readShort(data, offset);
    offset += 2;
    obj.ySuperscriptXSize = bin.readShort(data, offset);
    offset += 2;
    obj.ySuperscriptYSize = bin.readShort(data, offset);
    offset += 2;
    obj.ySuperscriptXOffset = bin.readShort(data, offset);
    offset += 2;
    obj.ySuperscriptYOffset = bin.readShort(data, offset);
    offset += 2;
    obj.yStrikeoutSize = bin.readShort(data, offset);
    offset += 2;
    obj.yStrikeoutPosition = bin.readShort(data, offset);
    offset += 2;
    obj.sFamilyClass = bin.readShort(data, offset);
    offset += 2;
    obj.panose = bin.readBytes(data, offset, 10);
    offset += 10;
    obj.ulUnicodeRange1 = bin.readUint(data, offset);
    offset += 4;
    obj.ulUnicodeRange2 = bin.readUint(data, offset);
    offset += 4;
    obj.ulUnicodeRange3 = bin.readUint(data, offset);
    offset += 4;
    obj.ulUnicodeRange4 = bin.readUint(data, offset);
    offset += 4;
    obj.achVendID = [bin.readInt8(data, offset), bin.readInt8(data, offset + 1), bin.readInt8(data, offset + 2), bin.readInt8(data, offset + 3)];
    offset += 4;
    obj.fsSelection = bin.readUshort(data, offset);
    offset += 2;
    obj.usFirstCharIndex = bin.readUshort(data, offset);
    offset += 2;
    obj.usLastCharIndex = bin.readUshort(data, offset);
    offset += 2;
    obj.sTypoAscender = bin.readShort(data, offset);
    offset += 2;
    obj.sTypoDescender = bin.readShort(data, offset);
    offset += 2;
    obj.sTypoLineGap = bin.readShort(data, offset);
    offset += 2;
    obj.usWinAscent = bin.readUshort(data, offset);
    offset += 2;
    obj.usWinDescent = bin.readUshort(data, offset);
    offset += 2;
    return offset;
  };
  Typr["OS/2"].version1 = function(data, offset, obj) {
    var bin = Typr._bin;
    offset = Typr["OS/2"].version0(data, offset, obj);
    obj.ulCodePageRange1 = bin.readUint(data, offset);
    offset += 4;
    obj.ulCodePageRange2 = bin.readUint(data, offset);
    offset += 4;
    return offset;
  };
  Typr["OS/2"].version2 = function(data, offset, obj) {
    var bin = Typr._bin;
    offset = Typr["OS/2"].version1(data, offset, obj);
    obj.sxHeight = bin.readShort(data, offset);
    offset += 2;
    obj.sCapHeight = bin.readShort(data, offset);
    offset += 2;
    obj.usDefault = bin.readUshort(data, offset);
    offset += 2;
    obj.usBreak = bin.readUshort(data, offset);
    offset += 2;
    obj.usMaxContext = bin.readUshort(data, offset);
    offset += 2;
    return offset;
  };
  Typr["OS/2"].version5 = function(data, offset, obj) {
    var bin = Typr._bin;
    offset = Typr["OS/2"].version2(data, offset, obj);
    obj.usLowerOpticalPointSize = bin.readUshort(data, offset);
    offset += 2;
    obj.usUpperOpticalPointSize = bin.readUshort(data, offset);
    offset += 2;
    return offset;
  };
  Typr.post = {};
  Typr.post.parse = function(data, offset, length) {
    var bin = Typr._bin;
    var obj = {};
    obj.version = bin.readFixed(data, offset);
    offset += 4;
    obj.italicAngle = bin.readFixed(data, offset);
    offset += 4;
    obj.underlinePosition = bin.readShort(data, offset);
    offset += 2;
    obj.underlineThickness = bin.readShort(data, offset);
    offset += 2;
    return obj;
  };
  Typr.SVG = {};
  Typr.SVG.parse = function(data, offset, length) {
    var bin = Typr._bin;
    var obj = { entries: [] };
    var offset0 = offset;
    bin.readUshort(data, offset);
    offset += 2;
    var svgDocIndexOffset = bin.readUint(data, offset);
    offset += 4;
    bin.readUint(data, offset);
    offset += 4;
    offset = svgDocIndexOffset + offset0;
    var numEntries = bin.readUshort(data, offset);
    offset += 2;
    for (var i = 0; i < numEntries; i++) {
      var startGlyphID = bin.readUshort(data, offset);
      offset += 2;
      var endGlyphID = bin.readUshort(data, offset);
      offset += 2;
      var svgDocOffset = bin.readUint(data, offset);
      offset += 4;
      var svgDocLength = bin.readUint(data, offset);
      offset += 4;
      var sbuf = new Uint8Array(data.buffer, offset0 + svgDocOffset + svgDocIndexOffset, svgDocLength);
      var svg = bin.readUTF8(sbuf, 0, sbuf.length);
      for (var f = startGlyphID; f <= endGlyphID; f++) {
        obj.entries[f] = svg;
      }
    }
    return obj;
  };
  Typr.SVG.toPath = function(str) {
    var pth = { cmds: [], crds: [] };
    if (str == null)
      return pth;
    var prsr = new DOMParser();
    var doc = prsr["parseFromString"](str, "image/svg+xml");
    var svg = doc.firstChild;
    while (svg.tagName != "svg")
      svg = svg.nextSibling;
    var vb = svg.getAttribute("viewBox");
    if (vb)
      vb = vb.trim().split(" ").map(parseFloat);
    else
      vb = [0, 0, 1e3, 1e3];
    Typr.SVG._toPath(svg.children, pth);
    for (var i = 0; i < pth.crds.length; i += 2) {
      var x = pth.crds[i], y = pth.crds[i + 1];
      x -= vb[0];
      y -= vb[1];
      y = -y;
      pth.crds[i] = x;
      pth.crds[i + 1] = y;
    }
    return pth;
  };
  Typr.SVG._toPath = function(nds, pth, fill) {
    for (var ni = 0; ni < nds.length; ni++) {
      var nd = nds[ni], tn = nd.tagName;
      var cfl = nd.getAttribute("fill");
      if (cfl == null)
        cfl = fill;
      if (tn == "g")
        Typr.SVG._toPath(nd.children, pth, cfl);
      else if (tn == "path") {
        pth.cmds.push(cfl ? cfl : "#000000");
        var d = nd.getAttribute("d");
        var toks = Typr.SVG._tokens(d);
        Typr.SVG._toksToPath(toks, pth);
        pth.cmds.push("X");
      } else if (tn == "defs") ;
      else
        console.warn(tn, nd);
    }
  };
  Typr.SVG._tokens = function(d) {
    var ts = [], off = 0, rn = false, cn = "";
    while (off < d.length) {
      var cc = d.charCodeAt(off), ch = d.charAt(off);
      off++;
      var isNum = 48 <= cc && cc <= 57 || ch == "." || ch == "-";
      if (rn) {
        if (ch == "-") {
          ts.push(parseFloat(cn));
          cn = ch;
        } else if (isNum)
          cn += ch;
        else {
          ts.push(parseFloat(cn));
          if (ch != "," && ch != " ")
            ts.push(ch);
          rn = false;
        }
      } else {
        if (isNum) {
          cn = ch;
          rn = true;
        } else if (ch != "," && ch != " ")
          ts.push(ch);
      }
    }
    if (rn)
      ts.push(parseFloat(cn));
    return ts;
  };
  Typr.SVG._toksToPath = function(ts, pth) {
    var i = 0, x = 0, y = 0, ox = 0, oy = 0;
    var pc = { "M": 2, "L": 2, "H": 1, "V": 1, "S": 4, "C": 6 };
    var cmds = pth.cmds, crds = pth.crds;
    while (i < ts.length) {
      var cmd = ts[i];
      i++;
      if (cmd == "z") {
        cmds.push("Z");
        x = ox;
        y = oy;
      } else {
        var cmu = cmd.toUpperCase();
        var ps = pc[cmu], reps = Typr.SVG._reps(ts, i, ps);
        for (var j = 0; j < reps; j++) {
          var xi = 0, yi = 0;
          if (cmd != cmu) {
            xi = x;
            yi = y;
          }
          if (cmu == "M") {
            x = xi + ts[i++];
            y = yi + ts[i++];
            cmds.push("M");
            crds.push(x, y);
            ox = x;
            oy = y;
          } else if (cmu == "L") {
            x = xi + ts[i++];
            y = yi + ts[i++];
            cmds.push("L");
            crds.push(x, y);
          } else if (cmu == "H") {
            x = xi + ts[i++];
            cmds.push("L");
            crds.push(x, y);
          } else if (cmu == "V") {
            y = yi + ts[i++];
            cmds.push("L");
            crds.push(x, y);
          } else if (cmu == "C") {
            var x1 = xi + ts[i++], y1 = yi + ts[i++], x2 = xi + ts[i++], y2 = yi + ts[i++], x3 = xi + ts[i++], y3 = yi + ts[i++];
            cmds.push("C");
            crds.push(x1, y1, x2, y2, x3, y3);
            x = x3;
            y = y3;
          } else if (cmu == "S") {
            var co = Math.max(crds.length - 4, 0);
            var x1 = x + x - crds[co], y1 = y + y - crds[co + 1];
            var x2 = xi + ts[i++], y2 = yi + ts[i++], x3 = xi + ts[i++], y3 = yi + ts[i++];
            cmds.push("C");
            crds.push(x1, y1, x2, y2, x3, y3);
            x = x3;
            y = y3;
          } else
            console.warn("Unknown SVG command " + cmd);
        }
      }
    }
  };
  Typr.SVG._reps = function(ts, off, ps) {
    var i = off;
    while (i < ts.length) {
      if (typeof ts[i] == "string")
        break;
      i += ps;
    }
    return (i - off) / ps;
  };
  if (Typr == null)
    Typr = {};
  if (Typr.U == null)
    Typr.U = {};
  Typr.U.codeToGlyph = function(font, code) {
    var cmap = font.cmap;
    for (var _i = 0, _a = [cmap.p0e4, cmap.p3e1, cmap.p3e10, cmap.p0e3, cmap.p1e0]; _i < _a.length; _i++) {
      var tind = _a[_i];
      if (tind == null)
        continue;
      var tab = cmap.tables[tind];
      if (tab.format == 0) {
        if (code >= tab.map.length)
          continue;
        return tab.map[code];
      } else if (tab.format == 4) {
        var sind = -1;
        for (var i = 0; i < tab.endCount.length; i++) {
          if (code <= tab.endCount[i]) {
            sind = i;
            break;
          }
        }
        if (sind == -1)
          continue;
        if (tab.startCount[sind] > code)
          continue;
        var gli = 0;
        if (tab.idRangeOffset[sind] != 0) {
          gli = tab.glyphIdArray[code - tab.startCount[sind] + (tab.idRangeOffset[sind] >> 1) - (tab.idRangeOffset.length - sind)];
        } else {
          gli = code + tab.idDelta[sind];
        }
        return gli & 65535;
      } else if (tab.format == 12) {
        if (code > tab.groups[tab.groups.length - 1][1])
          continue;
        for (var i = 0; i < tab.groups.length; i++) {
          var grp = tab.groups[i];
          if (grp[0] <= code && code <= grp[1])
            return grp[2] + (code - grp[0]);
        }
        continue;
      } else {
        throw "unknown cmap table format " + tab.format;
      }
    }
    return 0;
  };
  Typr.U.glyphToPath = function(font, gid) {
    var path = { cmds: [], crds: [] };
    if (font.SVG && font.SVG.entries[gid]) {
      var p = font.SVG.entries[gid];
      if (p == null)
        return path;
      if (typeof p == "string") {
        p = Typr.SVG.toPath(p);
        font.SVG.entries[gid] = p;
      }
      return p;
    } else if (font.CFF) {
      var state = { x: 0, y: 0, stack: [], nStems: 0, haveWidth: false, width: font.CFF.Private ? font.CFF.Private.defaultWidthX : 0, open: false };
      var cff = font.CFF, pdct = font.CFF.Private;
      if (cff.ROS) {
        var gi = 0;
        while (cff.FDSelect[gi + 2] <= gid)
          gi += 2;
        pdct = cff.FDArray[cff.FDSelect[gi + 1]].Private;
      }
      Typr.U._drawCFF(font.CFF.CharStrings[gid], state, cff, pdct, path);
    } else if (font.glyf) {
      Typr.U._drawGlyf(gid, font, path);
    }
    return path;
  };
  Typr.U._drawGlyf = function(gid, font, path) {
    var gl = font.glyf[gid];
    if (gl == null)
      gl = font.glyf[gid] = Typr.glyf._parseGlyf(font, gid);
    if (gl != null) {
      if (gl.noc > -1) {
        Typr.U._simpleGlyph(gl, path);
      } else {
        Typr.U._compoGlyph(gl, font, path);
      }
    }
  };
  Typr.U._simpleGlyph = function(gl, p) {
    for (var c = 0; c < gl.noc; c++) {
      var i0 = c == 0 ? 0 : gl.endPts[c - 1] + 1;
      var il = gl.endPts[c];
      for (var i = i0; i <= il; i++) {
        var pr = i == i0 ? il : i - 1;
        var nx = i == il ? i0 : i + 1;
        var onCurve = gl.flags[i] & 1;
        var prOnCurve = gl.flags[pr] & 1;
        var nxOnCurve = gl.flags[nx] & 1;
        var x = gl.xs[i], y = gl.ys[i];
        if (i == i0) {
          if (onCurve) {
            if (prOnCurve) {
              Typr.U.P.moveTo(p, gl.xs[pr], gl.ys[pr]);
            } else {
              Typr.U.P.moveTo(p, x, y);
              continue;
            }
          } else {
            if (prOnCurve) {
              Typr.U.P.moveTo(p, gl.xs[pr], gl.ys[pr]);
            } else {
              Typr.U.P.moveTo(p, (gl.xs[pr] + x) / 2, (gl.ys[pr] + y) / 2);
            }
          }
        }
        if (onCurve) {
          if (prOnCurve)
            Typr.U.P.lineTo(p, x, y);
        } else {
          if (nxOnCurve) {
            Typr.U.P.qcurveTo(p, x, y, gl.xs[nx], gl.ys[nx]);
          } else {
            Typr.U.P.qcurveTo(p, x, y, (x + gl.xs[nx]) / 2, (y + gl.ys[nx]) / 2);
          }
        }
      }
      Typr.U.P.closePath(p);
    }
  };
  Typr.U._compoGlyph = function(gl, font, p) {
    for (var j = 0; j < gl.parts.length; j++) {
      var path = { cmds: [], crds: [] };
      var prt = gl.parts[j];
      Typr.U._drawGlyf(prt.glyphIndex, font, path);
      var m = prt.m;
      for (var i = 0; i < path.crds.length; i += 2) {
        var x = path.crds[i], y = path.crds[i + 1];
        p.crds.push(x * m.a + y * m.b + m.tx);
        p.crds.push(x * m.c + y * m.d + m.ty);
      }
      for (var i = 0; i < path.cmds.length; i++) {
        p.cmds.push(path.cmds[i]);
      }
    }
  };
  Typr.U._getGlyphClass = function(g, cd) {
    var intr = Typr._lctf.getInterval(cd, g);
    return intr == -1 ? 0 : cd[intr + 2];
  };
  Typr.U.getPairAdjustment = function(font, g1, g2) {
    var hasGPOSkern = false;
    if (font.GPOS) {
      var gpos = font["GPOS"];
      var llist = gpos.lookupList, flist = gpos.featureList;
      var tused = [];
      for (var i = 0; i < flist.length; i++) {
        var fl = flist[i];
        if (fl.tag != "kern")
          continue;
        hasGPOSkern = true;
        for (var ti = 0; ti < fl.tab.length; ti++) {
          if (tused[fl.tab[ti]])
            continue;
          tused[fl.tab[ti]] = true;
          var tab = llist[fl.tab[ti]];
          for (var j = 0; j < tab.tabs.length; j++) {
            if (tab.tabs[j] == null)
              continue;
            var ltab = tab.tabs[j], ind;
            if (ltab.coverage) {
              ind = Typr._lctf.coverageIndex(ltab.coverage, g1);
              if (ind == -1)
                continue;
            }
            if (tab.ltype == 1) ;
            else if (tab.ltype == 2) {
              var adj = null;
              if (ltab.fmt == 1) {
                var right = ltab.pairsets[ind];
                for (var i = 0; i < right.length; i++) {
                  if (right[i].gid2 == g2)
                    adj = right[i];
                }
              } else if (ltab.fmt == 2) {
                var c1 = Typr.U._getGlyphClass(g1, ltab.classDef1);
                var c2 = Typr.U._getGlyphClass(g2, ltab.classDef2);
                adj = ltab.matrix[c1][c2];
              }
              if (adj) {
                var offset = 0;
                if (adj.val1 && adj.val1[2])
                  offset += adj.val1[2];
                if (adj.val2 && adj.val2[0])
                  offset += adj.val2[0];
                return offset;
              }
            }
          }
        }
      }
    }
    if (font.kern && !hasGPOSkern) {
      var ind1 = font.kern.glyph1.indexOf(g1);
      if (ind1 != -1) {
        var ind2 = font.kern.rval[ind1].glyph2.indexOf(g2);
        if (ind2 != -1)
          return font.kern.rval[ind1].vals[ind2];
      }
    }
    return 0;
  };
  Typr.U.stringToGlyphs = function(font, str) {
    var gls = [];
    for (var i = 0; i < str.length; i++) {
      var cc = str.codePointAt(i);
      if (cc > 65535)
        i++;
      gls.push(Typr.U.codeToGlyph(font, cc));
    }
    for (var i = 0; i < str.length; i++) {
      var cc = str.codePointAt(i);
      if (cc == 2367) {
        var t = gls[i - 1];
        gls[i - 1] = gls[i];
        gls[i] = t;
      }
      if (cc > 65535)
        i++;
    }
    var gsub = font["GSUB"];
    if (gsub == null)
      return gls;
    var llist = gsub.lookupList, flist = gsub.featureList;
    var cligs = [
      "rlig",
      "liga",
      "mset",
      "isol",
      "init",
      "fina",
      "medi",
      "half",
      "pres",
      "blws"
      /* Tibetan fonts like Himalaya.ttf */
    ];
    var tused = [];
    for (var fi = 0; fi < flist.length; fi++) {
      var fl = flist[fi];
      if (cligs.indexOf(fl.tag) == -1)
        continue;
      for (var ti = 0; ti < fl.tab.length; ti++) {
        if (tused[fl.tab[ti]])
          continue;
        tused[fl.tab[ti]] = true;
        var tab = llist[fl.tab[ti]];
        for (var ci = 0; ci < gls.length; ci++) {
          var feat = Typr.U._getWPfeature(str, ci);
          if ("isol,init,fina,medi".indexOf(fl.tag) != -1 && fl.tag != feat)
            continue;
          Typr.U._applySubs(gls, ci, tab, llist);
        }
      }
    }
    return gls;
  };
  Typr.U._getWPfeature = function(str, ci) {
    var wsep = '\n	" ,.:;!?()  ،';
    var R = "آأؤإاةدذرزوٱٲٳٵٶٷڈډڊڋڌڍڎڏڐڑڒړڔڕږڗژڙۀۃۄۅۆۇۈۉۊۋۍۏےۓەۮۯܐܕܖܗܘܙܞܨܪܬܯݍݙݚݛݫݬݱݳݴݸݹࡀࡆࡇࡉࡔࡧࡩࡪࢪࢫࢬࢮࢱࢲࢹૅેૉ૊૎૏ૐ૑૒૝ૡ૤૯஁ஃ஄அஉ஌எஏ஑னப஫஬";
    var L = "ꡲ્૗";
    var slft = ci == 0 || wsep.indexOf(str[ci - 1]) != -1;
    var srgt = ci == str.length - 1 || wsep.indexOf(str[ci + 1]) != -1;
    if (!slft && R.indexOf(str[ci - 1]) != -1)
      slft = true;
    if (!srgt && R.indexOf(str[ci]) != -1)
      srgt = true;
    if (!srgt && L.indexOf(str[ci + 1]) != -1)
      srgt = true;
    if (!slft && L.indexOf(str[ci]) != -1)
      slft = true;
    var feat = null;
    if (slft) {
      feat = srgt ? "isol" : "init";
    } else {
      feat = srgt ? "fina" : "medi";
    }
    return feat;
  };
  Typr.U._applySubs = function(gls, ci, tab, llist) {
    var rlim = gls.length - ci - 1;
    for (var j = 0; j < tab.tabs.length; j++) {
      if (tab.tabs[j] == null)
        continue;
      var ltab = tab.tabs[j], ind;
      if (ltab.coverage) {
        ind = Typr._lctf.coverageIndex(ltab.coverage, gls[ci]);
        if (ind == -1)
          continue;
      }
      if (tab.ltype == 1) {
        gls[ci];
        if (ltab.fmt == 1)
          gls[ci] = gls[ci] + ltab.delta;
        else
          gls[ci] = ltab.newg[ind];
      } else if (tab.ltype == 4) {
        var vals = ltab.vals[ind];
        for (var k = 0; k < vals.length; k++) {
          var lig = vals[k], rl = lig.chain.length;
          if (rl > rlim)
            continue;
          var good = true, em1 = 0;
          for (var l = 0; l < rl; l++) {
            while (gls[ci + em1 + (1 + l)] == -1)
              em1++;
            if (lig.chain[l] != gls[ci + em1 + (1 + l)])
              good = false;
          }
          if (!good)
            continue;
          gls[ci] = lig.nglyph;
          for (var l = 0; l < rl + em1; l++)
            gls[ci + l + 1] = -1;
          break;
        }
      } else if (tab.ltype == 5 && ltab.fmt == 2) {
        var cind = Typr._lctf.getInterval(ltab.cDef, gls[ci]);
        var cls = ltab.cDef[cind + 2], scs = ltab.scset[cls];
        for (var i = 0; i < scs.length; i++) {
          var sc = scs[i], inp = sc.input;
          if (inp.length > rlim)
            continue;
          var good = true;
          for (var l = 0; l < inp.length; l++) {
            var cind2 = Typr._lctf.getInterval(ltab.cDef, gls[ci + 1 + l]);
            if (cind == -1 && ltab.cDef[cind2 + 2] != inp[l]) {
              good = false;
              break;
            }
          }
          if (!good)
            continue;
          var lrs = sc.substLookupRecords;
          for (var k = 0; k < lrs.length; k += 2) {
            lrs[k];
            lrs[k + 1];
          }
        }
      } else if (tab.ltype == 6 && ltab.fmt == 3) {
        if (!Typr.U._glsCovered(gls, ltab.backCvg, ci - ltab.backCvg.length))
          continue;
        if (!Typr.U._glsCovered(gls, ltab.inptCvg, ci))
          continue;
        if (!Typr.U._glsCovered(gls, ltab.ahedCvg, ci + ltab.inptCvg.length))
          continue;
        var lr = ltab.lookupRec;
        for (var i = 0; i < lr.length; i += 2) {
          var cind = lr[i], tab2 = llist[lr[i + 1]];
          Typr.U._applySubs(gls, ci + cind, tab2, llist);
        }
      }
    }
  };
  Typr.U._glsCovered = function(gls, cvgs, ci) {
    for (var i = 0; i < cvgs.length; i++) {
      var ind = Typr._lctf.coverageIndex(cvgs[i], gls[ci + i]);
      if (ind == -1)
        return false;
    }
    return true;
  };
  Typr.U.glyphsToPath = function(font, gls, clr) {
    var tpath = { cmds: [], crds: [] };
    var x = 0;
    for (var i = 0; i < gls.length; i++) {
      var gid = gls[i];
      if (gid == -1)
        continue;
      var gid2 = i < gls.length - 1 && gls[i + 1] != -1 ? gls[i + 1] : 0;
      var path = Typr.U.glyphToPath(font, gid);
      for (var j = 0; j < path.crds.length; j += 2) {
        tpath.crds.push(path.crds[j] + x);
        tpath.crds.push(path.crds[j + 1]);
      }
      if (clr)
        tpath.cmds.push(clr);
      for (var j = 0; j < path.cmds.length; j++)
        tpath.cmds.push(path.cmds[j]);
      if (clr)
        tpath.cmds.push("X");
      x += font.hmtx.aWidth[gid];
      if (i < gls.length - 1)
        x += Typr.U.getPairAdjustment(font, gid, gid2);
    }
    return tpath;
  };
  Typr.U.pathToSVG = function(path, prec) {
    if (prec == null)
      prec = 5;
    var out = [], co = 0, lmap = { "M": 2, "L": 2, "Q": 4, "C": 6 };
    for (var i = 0; i < path.cmds.length; i++) {
      var cmd = path.cmds[i], cn = co + (lmap[cmd] ? lmap[cmd] : 0);
      out.push(cmd);
      while (co < cn) {
        var c = path.crds[co++];
        out.push(parseFloat(c.toFixed(prec)) + (co == cn ? "" : " "));
      }
    }
    return out.join("");
  };
  Typr.U.pathToContext = function(path, ctx) {
    var c = 0, crds = path.crds;
    for (var j = 0; j < path.cmds.length; j++) {
      var cmd = path.cmds[j];
      if (cmd == "M") {
        ctx.moveTo(crds[c], crds[c + 1]);
        c += 2;
      } else if (cmd == "L") {
        ctx.lineTo(crds[c], crds[c + 1]);
        c += 2;
      } else if (cmd == "C") {
        ctx.bezierCurveTo(crds[c], crds[c + 1], crds[c + 2], crds[c + 3], crds[c + 4], crds[c + 5]);
        c += 6;
      } else if (cmd == "Q") {
        ctx.quadraticCurveTo(crds[c], crds[c + 1], crds[c + 2], crds[c + 3]);
        c += 4;
      } else if (cmd.charAt(0) == "#") {
        ctx.beginPath();
        ctx.fillStyle = cmd;
      } else if (cmd == "Z") {
        ctx.closePath();
      } else if (cmd == "X") {
        ctx.fill();
      }
    }
  };
  Typr.U.P = {};
  Typr.U.P.moveTo = function(p, x, y) {
    p.cmds.push("M");
    p.crds.push(x, y);
  };
  Typr.U.P.lineTo = function(p, x, y) {
    p.cmds.push("L");
    p.crds.push(x, y);
  };
  Typr.U.P.curveTo = function(p, a, b, c, d, e, f) {
    p.cmds.push("C");
    p.crds.push(a, b, c, d, e, f);
  };
  Typr.U.P.qcurveTo = function(p, a, b, c, d) {
    p.cmds.push("Q");
    p.crds.push(a, b, c, d);
  };
  Typr.U.P.closePath = function(p) {
    p.cmds.push("Z");
  };
  Typr.U._drawCFF = function(cmds, state, font, pdct, p) {
    var stack = state.stack;
    var nStems = state.nStems, haveWidth = state.haveWidth, width = state.width, open = state.open;
    var i = 0;
    var x = state.x, y = state.y, c1x = 0, c1y = 0, c2x = 0, c2y = 0, c3x = 0, c3y = 0, c4x = 0, c4y = 0, jpx = 0, jpy = 0;
    var o = { val: 0, size: 0 };
    while (i < cmds.length) {
      Typr.CFF.getCharString(cmds, i, o);
      var v = o.val;
      i += o.size;
      if (v == "o1" || v == "o18") {
        var hasWidthArg;
        hasWidthArg = stack.length % 2 !== 0;
        if (hasWidthArg && !haveWidth) {
          width = stack.shift() + pdct.nominalWidthX;
        }
        nStems += stack.length >> 1;
        stack.length = 0;
        haveWidth = true;
      } else if (v == "o3" || v == "o23") {
        var hasWidthArg;
        hasWidthArg = stack.length % 2 !== 0;
        if (hasWidthArg && !haveWidth) {
          width = stack.shift() + pdct.nominalWidthX;
        }
        nStems += stack.length >> 1;
        stack.length = 0;
        haveWidth = true;
      } else if (v == "o4") {
        if (stack.length > 1 && !haveWidth) {
          width = stack.shift() + pdct.nominalWidthX;
          haveWidth = true;
        }
        if (open)
          Typr.U.P.closePath(p);
        y += stack.pop();
        Typr.U.P.moveTo(p, x, y);
        open = true;
      } else if (v == "o5") {
        while (stack.length > 0) {
          x += stack.shift();
          y += stack.shift();
          Typr.U.P.lineTo(p, x, y);
        }
      } else if (v == "o6" || v == "o7") {
        var count = stack.length;
        var isX = v == "o6";
        for (var j = 0; j < count; j++) {
          var sval = stack.shift();
          if (isX) {
            x += sval;
          } else {
            y += sval;
          }
          isX = !isX;
          Typr.U.P.lineTo(p, x, y);
        }
      } else if (v == "o8" || v == "o24") {
        var count = stack.length;
        var index = 0;
        while (index + 6 <= count) {
          c1x = x + stack.shift();
          c1y = y + stack.shift();
          c2x = c1x + stack.shift();
          c2y = c1y + stack.shift();
          x = c2x + stack.shift();
          y = c2y + stack.shift();
          Typr.U.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
          index += 6;
        }
        if (v == "o24") {
          x += stack.shift();
          y += stack.shift();
          Typr.U.P.lineTo(p, x, y);
        }
      } else if (v == "o11") {
        break;
      } else if (v == "o1234" || v == "o1235" || v == "o1236" || v == "o1237") {
        if (v == "o1234") {
          c1x = x + stack.shift();
          c1y = y;
          c2x = c1x + stack.shift();
          c2y = c1y + stack.shift();
          jpx = c2x + stack.shift();
          jpy = c2y;
          c3x = jpx + stack.shift();
          c3y = c2y;
          c4x = c3x + stack.shift();
          c4y = y;
          x = c4x + stack.shift();
          Typr.U.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
          Typr.U.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);
        }
        if (v == "o1235") {
          c1x = x + stack.shift();
          c1y = y + stack.shift();
          c2x = c1x + stack.shift();
          c2y = c1y + stack.shift();
          jpx = c2x + stack.shift();
          jpy = c2y + stack.shift();
          c3x = jpx + stack.shift();
          c3y = jpy + stack.shift();
          c4x = c3x + stack.shift();
          c4y = c3y + stack.shift();
          x = c4x + stack.shift();
          y = c4y + stack.shift();
          stack.shift();
          Typr.U.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
          Typr.U.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);
        }
        if (v == "o1236") {
          c1x = x + stack.shift();
          c1y = y + stack.shift();
          c2x = c1x + stack.shift();
          c2y = c1y + stack.shift();
          jpx = c2x + stack.shift();
          jpy = c2y;
          c3x = jpx + stack.shift();
          c3y = c2y;
          c4x = c3x + stack.shift();
          c4y = c3y + stack.shift();
          x = c4x + stack.shift();
          Typr.U.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
          Typr.U.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);
        }
        if (v == "o1237") {
          c1x = x + stack.shift();
          c1y = y + stack.shift();
          c2x = c1x + stack.shift();
          c2y = c1y + stack.shift();
          jpx = c2x + stack.shift();
          jpy = c2y + stack.shift();
          c3x = jpx + stack.shift();
          c3y = jpy + stack.shift();
          c4x = c3x + stack.shift();
          c4y = c3y + stack.shift();
          if (Math.abs(c4x - x) > Math.abs(c4y - y)) {
            x = c4x + stack.shift();
          } else {
            y = c4y + stack.shift();
          }
          Typr.U.P.curveTo(p, c1x, c1y, c2x, c2y, jpx, jpy);
          Typr.U.P.curveTo(p, c3x, c3y, c4x, c4y, x, y);
        }
      } else if (v == "o14") {
        if (stack.length > 0 && !haveWidth) {
          width = stack.shift() + font.nominalWidthX;
          haveWidth = true;
        }
        if (stack.length == 4) {
          var adx = stack.shift();
          var ady = stack.shift();
          var bchar = stack.shift();
          var achar = stack.shift();
          var bind2 = Typr.CFF.glyphBySE(font, bchar);
          var aind = Typr.CFF.glyphBySE(font, achar);
          Typr.U._drawCFF(font.CharStrings[bind2], state, font, pdct, p);
          state.x = adx;
          state.y = ady;
          Typr.U._drawCFF(font.CharStrings[aind], state, font, pdct, p);
        }
        if (open) {
          Typr.U.P.closePath(p);
          open = false;
        }
      } else if (v == "o19" || v == "o20") {
        var hasWidthArg;
        hasWidthArg = stack.length % 2 !== 0;
        if (hasWidthArg && !haveWidth) {
          width = stack.shift() + pdct.nominalWidthX;
        }
        nStems += stack.length >> 1;
        stack.length = 0;
        haveWidth = true;
        i += nStems + 7 >> 3;
      } else if (v == "o21") {
        if (stack.length > 2 && !haveWidth) {
          width = stack.shift() + pdct.nominalWidthX;
          haveWidth = true;
        }
        y += stack.pop();
        x += stack.pop();
        if (open)
          Typr.U.P.closePath(p);
        Typr.U.P.moveTo(p, x, y);
        open = true;
      } else if (v == "o22") {
        if (stack.length > 1 && !haveWidth) {
          width = stack.shift() + pdct.nominalWidthX;
          haveWidth = true;
        }
        x += stack.pop();
        if (open)
          Typr.U.P.closePath(p);
        Typr.U.P.moveTo(p, x, y);
        open = true;
      } else if (v == "o25") {
        while (stack.length > 6) {
          x += stack.shift();
          y += stack.shift();
          Typr.U.P.lineTo(p, x, y);
        }
        c1x = x + stack.shift();
        c1y = y + stack.shift();
        c2x = c1x + stack.shift();
        c2y = c1y + stack.shift();
        x = c2x + stack.shift();
        y = c2y + stack.shift();
        Typr.U.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
      } else if (v == "o26") {
        if (stack.length % 2) {
          x += stack.shift();
        }
        while (stack.length > 0) {
          c1x = x;
          c1y = y + stack.shift();
          c2x = c1x + stack.shift();
          c2y = c1y + stack.shift();
          x = c2x;
          y = c2y + stack.shift();
          Typr.U.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
        }
      } else if (v == "o27") {
        if (stack.length % 2) {
          y += stack.shift();
        }
        while (stack.length > 0) {
          c1x = x + stack.shift();
          c1y = y;
          c2x = c1x + stack.shift();
          c2y = c1y + stack.shift();
          x = c2x + stack.shift();
          y = c2y;
          Typr.U.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
        }
      } else if (v == "o10" || v == "o29") {
        var obj = v == "o10" ? pdct : font;
        if (stack.length == 0) {
          console.warn("error: empty stack");
        } else {
          var ind = stack.pop();
          var subr = obj.Subrs[ind + obj.Bias];
          state.x = x;
          state.y = y;
          state.nStems = nStems;
          state.haveWidth = haveWidth;
          state.width = width;
          state.open = open;
          Typr.U._drawCFF(subr, state, font, pdct, p);
          x = state.x;
          y = state.y;
          nStems = state.nStems;
          haveWidth = state.haveWidth;
          width = state.width;
          open = state.open;
        }
      } else if (v == "o30" || v == "o31") {
        var count, count1 = stack.length;
        var index = 0;
        var alternate = v == "o31";
        count = count1 & ~2;
        index += count1 - count;
        while (index < count) {
          if (alternate) {
            c1x = x + stack.shift();
            c1y = y;
            c2x = c1x + stack.shift();
            c2y = c1y + stack.shift();
            y = c2y + stack.shift();
            if (count - index == 5) {
              x = c2x + stack.shift();
              index++;
            } else {
              x = c2x;
            }
            alternate = false;
          } else {
            c1x = x;
            c1y = y + stack.shift();
            c2x = c1x + stack.shift();
            c2y = c1y + stack.shift();
            x = c2x + stack.shift();
            if (count - index == 5) {
              y = c2y + stack.shift();
              index++;
            } else {
              y = c2y;
            }
            alternate = true;
          }
          Typr.U.P.curveTo(p, c1x, c1y, c2x, c2y, x, y);
          index += 4;
        }
      } else if ((v + "").charAt(0) == "o") {
        console.warn("Unknown operation: " + v, cmds);
        throw v;
      } else
        stack.push(v);
    }
    state.x = x;
    state.y = y;
    state.nStems = nStems;
    state.haveWidth = haveWidth;
    state.width = width;
    state.open = open;
  };
  Typr$1.Typr = Typr;
  var Typr_js_1 = Typr$1;


/* ===== 用户脚本主体 ===== */

/* =============================================================================
 *  小哀学习通助手 — 用户脚本主体（依赖 core.js 与 vendor_typr.js）
 *  原作者思路: Ne-21 系 + 减负/九九/ABC 系优势整合
 * ============================================================================= */
(function () {
    'use strict';

    /* =========================== 全局引用 =========================== */
    var _w = unsafeWindow,
        _l = location,
        _d = _w.document,
        $ = _w.jQuery || top.jQuery;
    var Core = (typeof unsafeWindow !== 'undefined' && unsafeWindow.XiaoAiCore) ||
        (typeof self !== 'undefined' && self.XiaoAiCore) ||
        (typeof window !== 'undefined' && window.XiaoAiCore) || {};
    // Typr 由 vendor_typr.js 在脚本全局定义；用多层取值避免 IIFE 内 var 遮蔽
    var Typr = (typeof unsafeWindow !== 'undefined' && unsafeWindow.Typr) ||
        (typeof self !== 'undefined' && self.Typr) ||
        (typeof window !== 'undefined' && window.Typr) || null;
    var UE = _w.UE;
    var Swal = _w.Swal || window.Swal;

    // 解决 out_link.shtml 等嵌套 iframe 的跨域问题
    try { document.domain = 'chaoxing.com'; } catch (e) { /* ignore */ }

    /* =========================== 配置（默认值） =========================== */
    var CONFIG = {
        // ---- AI 服务 ----
        baseURL: 'https://api.deepseek.com',   // OpenAI 兼容端点，自动补全 /chat/completions
        apiKey: '',                             // 用户自填
        model: 'deepseek-v4-flash',             // 模型名
        temperature: 0.2,
        maxTokens: 1500,
        jsonMode: 1,                            // 1=让 AI 输出 JSON(宽松解析) 0=纯文本
        requestInterval: 0,                     // AI 请求最小间隔(秒)
        reqTimeout: 120,                        // 单次请求超时(秒)

        // ---- 界面 ----
        showBox: 1,
        task: 0,                                // 仅处理任务点

        // ---- 视频 ----
        video: 1, audio: 1, rate: 1, review: 0,

        // ---- 测验 ----
        work: 1, time: 2500, sub: 0, force: 0, decrypt: 1, redo: 0, fuzzyMatch: 1,
        useCache: 1,                            // 本地答案缓存（测试时可关闭，只存高置信度）
        accuracy: 60,                           // 答题覆盖率阈值，达标才自动提交(%)
        randomDo: 0,                            // 无答案时随机选(B/全选/错) 模拟真人

        // ---- 考试 ----
        examTurn: 0, examTurnTime: 0, goodStudent: 0, alterTitle: 1,

        // ---- 防检测/防清进度 ----
        antiDetect: 1,
        dailyQuota: 22,                         // 每日学习时长上限(小时)，超限强制停止
        autoRefresh: 0, autoRefreshMinutes: 30,

        // ---- 登录 ----
        autoLogin: 0, phone: '', password: ''
    };

    var _quizPaused = false;       // 答题暂停
    var _dailyCount = 0;           // 当日 AI 请求计数
    var _answeredCount = 0;        // 本次测验已答题数（用于正确率阈值）
    var _totalCount = 0;           // 本次测验总题数
    var _videoQuizActive = false;  // 视频弹题处理中（onPause 据此避免冲突）

    /* =========================== 存储（GM + 域名隔离） =========================== */
    var Storage = {
        _prefix: function () {
            try {
                var host = _l.hostname;
                var m = host.match(/([^.]+\.(?:com|net|org|edu)\.cn|[^.]+\.[^.]+)$/i);
                return (m ? m[0] : host) + ':';
            } catch (e) { return ''; }
        },
        get: function (key, def) {
            var v = undefined;
            try { v = GM_getValue(this._prefix() + key); } catch (e) { /* ignore */ }
            if (v === undefined || v === null) {
                try {
                    var lv = _w.localStorage.getItem(key);
                    if (lv !== null) { try { GM_setValue(this._prefix() + key, lv); } catch (e) {} return lv; }
                } catch (e) { /* ignore */ }
                return def;
            }
            return v;
        },
        set: function (key, val) {
            try { GM_setValue(this._prefix() + key, String(val)); } catch (e) { /* ignore */ }
            try { _w.localStorage.setItem(key, String(val)); } catch (e) { /* ignore */ }
        },
        getBool: function (key, def) {
            var v = this.get(key, def === true ? 'true' : 'false');
            return v === true || v === 'true' || v === 1 || v === '1';
        }
    };

    /* =========================== 工具函数 =========================== */
    function getCk(name) {
        try { return document.cookie.match('[;\\s+]?' + name + '=([^;]*)') ? document.cookie.match('[;\\s+]?' + name + '=([^;]*)')[1] : undefined; }
        catch (e) { return undefined; }
    }
    function getStr(str, start, end) {
        var res = str.match(new RegExp(start + '(.*?)' + end));
        return res ? res[1] : null;
    }
    function parseUrlParams() {
        var q = _l.search.substring(1), vars = q.split('&'), p = {};
        for (var i = 0; i < vars.length; i++) { var pair = vars[i].split('='); p[pair[0]] = pair[1]; }
        return p;
    }
    function uid() { return getCk('_uid') || getCk('UID') || ''; }

    // 随机毫秒数
    function rand(min, max) { min = min || 0; max = max || 0; return Math.floor(Math.random() * (max - min + 1)) + min; }

    // HTML 转义（AI 返回文本插入 innerHTML 前使用）
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // 剥离 alterTitle 插入的 .xiaoai-ai 标记（避免污染题干 → 影响缓存 key 与下次匹配）
    function stripAiMarker(html) {
        if (!html) return '';
        try {
            var $tmp = $('<div>' + html + '</div>');
            $tmp.find('.xiaoai-ai').remove();
            // 移除 alterTitle 添加的空 <p> 分隔符
            $tmp.find('.xiaoai-ai-block').remove();
            $tmp.find('p').each(function () {
                if ($.trim($(this).text()) === '' && !$(this).find('img').length) $(this).remove();
            });
            return $tmp.html();
        } catch (e) { return html; }
    }

    /* =========================== 日志 ===========================
     * ★ DEV_MODE：本地开发调试开关 ★
     *   true  = 记录详细日志（AI 原始请求/响应、匹配细节、填空逐空），
     *           持久化到 GM 存储，可在控制台用 __xiaoaiDumpLog() 导出。
     *   false = 发布版：只保留简单日志（logger/logStep 正常流程信息），
     *           debugLog 静默、不持久化、不占存储。
     * 更新检测时请置 true，发布前务必改回 false。
     */
    var DEV_MODE = true;
    // 允许运行时覆盖（测试/高级用法）：在脚本加载前设置 window.__XIAOAI_DEV_MODE__ = true
    try {
        if ((typeof unsafeWindow !== 'undefined' && unsafeWindow.__XIAOAI_DEV_MODE__) ||
            (typeof __XIAOAI_DEV_MODE__ !== 'undefined' && __XIAOAI_DEV_MODE__)) DEV_MODE = true;
    } catch (e) { /* ignore */ }

    var LogColors = {
        red: '#dc2626', green: '#059669', blue: '#2563eb',
        yellow: '#ca8a04', orange: '#ea580c', purple: '#7c3aed',
        pink: '#db2777', gray: '#64748b', grey: '#64748b'
    };

    var Logger = {
        _buffer: [],
        MAX_BUFFER: 1500,       // 内存环形缓冲上限
        PERSIST_MAX: 500,       // 持久化到 GM 的上限

        init: function () {
            if (!DEV_MODE) return; // 发布版不加载历史日志
            try {
                var arr = JSON.parse(GM_getValue('xiaoai_dev_log', '[]') || '[]');
                if (Array.isArray(arr)) this._buffer = arr.slice(-this.MAX_BUFFER);
            } catch (e) { /* ignore */ }
        },

        isDebug: function () { return DEV_MODE; },

        // opts: { console: true } = 强制镜像到控制台（如错误）
        write: function (msg, color, opts) {
            opts = opts || {};
            var time = new Date().toLocaleTimeString();
            var $p = null;
            // 面板显示（始终）
            try {
                var c = LogColors[color] || color || '#334155';
                $p = $('<p><span style="color:rgba(15,23,42,.4);margin-right:6px;">[' + time + ']</span><span style="color:' + c + ';">' + escapeHtml(msg) + '</span></p>');
                var $log = $('#ne-21log', window.parent.document);
                $log.prepend($p);
                while ($log.children().length > 200) $log.children().last().remove();
            } catch (e) { /* ignore */ }
            // 控制台镜像：仅开发模式，或明确要求（错误）
            if (DEV_MODE || opts.console) {
                try { console.log('[XiaoAi] ' + msg); } catch (e) { /* ignore */ }
            }
            // 环形缓冲 + 持久化：仅开发模式
            if (DEV_MODE) {
                this._buffer.push({ t: Date.now(), time: time, msg: msg });
                if (this._buffer.length > this.MAX_BUFFER) this._buffer.splice(0, this._buffer.length - this.MAX_BUFFER);
                try { GM_setValue('xiaoai_dev_log', JSON.stringify(this._buffer.slice(-this.PERSIST_MAX))); } catch (e) { /* ignore */ }
            }
            return $p;
        },

        exportText: function () {
            return this._buffer.map(function (l) { return '[' + l.time + '] ' + l.msg; }).join('\n');
        },

        clear: function () {
            this._buffer = [];
            try { GM_setValue('xiaoai_dev_log', '[]'); } catch (e) { /* ignore */ }
            try { $('#ne-21log', window.parent.document).empty(); } catch (e) { /* ignore */ }
        }
    };

    // 兼容旧签名：logger(msg,color) 返回 $p 供原地更新（简单日志，始终显示）
    function logger(msg, color) { return Logger.write(msg, color, {}); }
    // 分步格式化：▸ [路由] 匹配到作业页面 ...（简单流程信息，始终显示）
    function logStep(step, msg, color) { return Logger.write('▸ [' + step + '] ' + msg, color || 'blue', {}); }
    // 详细调试日志：仅 DEV_MODE 生效（AI prompt/原始响应/匹配细节）
    function debugLog(msg) { if (!DEV_MODE) return null; return Logger.write('[调试] ' + msg, 'gray', { console: true }); }
    function logError(msg) { return Logger.write(msg, 'red', { console: true }); }
    function updateLogEntry($p, msg, color) {
        if (!$p || !$p.length) return;
        var c = LogColors[color] || color || '#334155';
        var timeHtml = $p.find('span:first')[0] ? $p.find('span:first')[0].outerHTML : '';
        $p.html(timeHtml + '<span style="color:' + c + ';">' + escapeHtml(msg) + '</span>');
    }

    // 开发用导出/清空钩子（控制台执行：__xiaoaiDumpLog() 打印/复制，__xiaoaiClearLog() 清空）
    try {
        _w.__xiaoaiDumpLog = function (copy) {
            var text = Logger.exportText();
            if (copy && _d.execCommand) {
                var ta = _d.createElement('textarea');
                ta.value = text; _d.body.appendChild(ta); ta.select();
                try { _d.execCommand('copy'); } catch (e) { /* ignore */ }
                try { ta.remove(); } catch (e) { /* ignore */ }
                return '已复制 ' + Logger._buffer.length + ' 行日志到剪贴板';
            }
            console.log('===== 小哀学习通 DEV 日志 (' + Logger._buffer.length + ' 行) =====');
            console.log(text);
            return text;
        };
        _w.__xiaoaiClearLog = function () { Logger.clear(); return '日志已清空'; };
    } catch (e) { /* ignore */ }

    /* =========================== 诊断报告（DEV_MODE 专用） =========================== */
    var Report = {
        _errors: [],
        _snapshots: [],
        _meta: null,
        _route: '',

        init: function () {
            if (!DEV_MODE) return;
            try {
                this._meta = {
                    time: new Date().toLocaleString(),
                    scriptVersion: (typeof GM_info !== 'undefined' && GM_info && GM_info.script) ? GM_info.script.version : 'unknown',
                    handler: (typeof GM_info !== 'undefined' && GM_info && GM_info.scriptHandler) ? GM_info.scriptHandler : 'unknown',
                    ua: navigator.userAgent,
                    url: _l.href,
                    hostname: _l.hostname,
                    pathname: _l.pathname,
                    uid: uid()
                };
            } catch (e) { /* ignore */ }
            // 捕获页面错误与未处理 Promise 拒绝
            try {
                _w.addEventListener('error', function (e) {
                    Report._errors.push('[页面错误] ' + (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || ''));
                });
                _w.addEventListener('unhandledrejection', function (e) {
                    var r = e && e.reason;
                    Report._errors.push('[未处理拒绝] ' + (r && (r.msg || r.message || r.stack || r)) + '');
                });
            } catch (e) { /* ignore */ }
        },

        setRoute: function (r) { if (DEV_MODE) this._route = r; },

        // 题目 DOM 快照（解析/匹配失败时调用）
        snapshot: function (label, html) {
            if (!DEV_MODE) return;
            if (this._snapshots.length > 12) this._snapshots.shift();
            this._snapshots.push({ label: label, html: String(html || '').slice(0, 2000) });
        },

        // 每种题型首次出现采样一份 HTML（DEV_MODE，帮助核对真实 DOM 结构）
        _typeSampled: {},
        sampleQuestion: function (typeName, html) {
            if (!DEV_MODE) return;
            if (this._typeSampled[typeName]) return;
            this._typeSampled[typeName] = true;
            this.snapshot('[采样] 题型: ' + typeName, html);
        },

        // 关键选择器存在性探针：判断真实页面结构是否与适配器预期一致
        domProbe: function () {
            var probes = {};
            var path = _l.pathname;
            var selectors = [];
            if (path.indexOf('/mooc2/work/dowork') !== -1) {
                selectors = ['.mark_table', '.mark_table form', '.questionLi', '.stem_answer .answer_p',
                    '.stem_answer textarea', 'textarea[name^="answerEditor"]', '.reading_answer', '.CodeMirror', '.subEditor textarea'];
            } else if (path.indexOf('/work/phone') !== -1) {
                selectors = ['.Py-mian1', '.Py-m1-title', '.answerList li', '.answerList.singleChoice li',
                    '.answerList.multiChoice li', '.answerList.panduan li', '.blankList2 input', '[data-editorindex]',
                    '.zquestions', '.zsubmit', 'textarea[name^="answer"]'];
            } else if (path.indexOf('/exam/test') !== -1) {
                selectors = ['.whiteDiv', 'h3.mark_name', '#submitTest', '.stem_answer .answer_p', '.nextDiv', '.answerBg', '.reading_answer'];
            } else if (path.indexOf('/mooc2/exam/preview') !== -1) {
                selectors = ['.questionLi', '.mark_name', '.answerBg .answer_p', '.reading_answer', 'textarea[name^="answerEditor"]'];
            } else if (path.indexOf('/knowledge/cards') !== -1) {
                selectors = ['.ans-attach-ct', '.ans-attach-ct iframe', '.ans-videoquiz', '#videoquiz-submit', 'video', 'audio', 'style:contains(font-cxsecret)'];
            }
            var doc = _d;
            for (var i = 0; i < selectors.length; i++) {
                try { probes[selectors[i]] = doc.querySelectorAll(selectors[i]).length; } catch (e) { probes[selectors[i]] = 'err'; }
            }
            return probes;
        },

        // 设置快照（API Key 打码，绝不导出密钥）
        settings: function () {
            var s = {};
            ['baseURL', 'model', 'temperature', 'maxTokens', 'jsonMode', 'requestInterval', 'reqTimeout',
                'rate', 'accuracy', 'sub', 'force', 'examTurn', 'goodStudent', 'alterTitle', 'redo',
                'randomDo', 'fuzzyMatch', 'decrypt', 'antiDetect', 'showBox', 'time', 'review'].forEach(function (k) {
                var v = getSetting(k, CONFIG[k] !== undefined ? CONFIG[k] : '');
                s[k] = (typeof v === 'string' && v.length > 0 && v.length <= 200) ? v : v;
            });
            s.apiKey = '(已打码，不外泄)';
            return s;
        },

        build: function () {
            return {
                meta: this._meta,
                route: this._route,
                settings: this.settings(),
                domProbe: this.domProbe(),
                errors: this._errors,
                questionSnapshots: this._snapshots,
                log: Logger.exportText()
            };
        },

        export: function () {
            if (!DEV_MODE) { logger('诊断报告仅开发模式可用（DEV_MODE=true）', 'orange'); return null; }
            try {
                var obj = this.build();
                var json = JSON.stringify(obj, null, 2);
                try {
                    console.log('===== 小哀学习通诊断报告 (' + Logger._buffer.length + ' 行日志) =====');
                    console.log(json);
                } catch (e) { /* ignore */ }
                var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                var url = URL.createObjectURL(blob);
                var a = _d.createElement('a');
                a.href = url;
                a.download = 'xiaoai-report-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json';
                _d.body.appendChild(a);
                a.click();
                setTimeout(function () { URL.revokeObjectURL(url); try { a.remove(); } catch (e) {} }, 2000);
                logger('诊断报告已导出（' + Logger._buffer.length + ' 行日志、' + obj.questionSnapshots.length + ' 个题目快照、' + obj.errors.length + ' 条错误）', 'green');
                return obj;
            } catch (e) {
                logError('导出报告失败: ' + (e && e.message));
                return null;
            }
        }
    };

    // 控制台钩子：__xiaoaiExportReport() 导出完整诊断报告
    try {
        _w.__xiaoaiExportReport = function () { return Report.export(); };
    } catch (e) { /* ignore */ }

    /* =========================== 设置读写（GM + localStorage 双写） =========================== */
    function getSetting(key, def) { return Storage.get('GPTJsSetting.' + key, def); }
    function setSetting(key, val) { Storage.set('GPTJsSetting.' + key, val); }
    function getSettingBool(key, def) { return Storage.getBool('GPTJsSetting.' + key, def); }
    function setSettingBool(key, val) { setSetting(key, val ? 'true' : 'false'); }

    // 读取 AI 配置
    function aiConfig() {
        return {
            baseURL: getSetting('baseURL', CONFIG.baseURL),
            apiKey: getSetting('apiKey', CONFIG.apiKey),
            model: getSetting('model', CONFIG.model),
            temperature: parseFloat(getSetting('temperature', CONFIG.temperature)),
            maxTokens: parseInt(getSetting('maxTokens', CONFIG.maxTokens), 10),
            jsonMode: getSettingBool('jsonMode', !!CONFIG.jsonMode),
            requestInterval: parseInt(getSetting('requestInterval', CONFIG.requestInterval), 10),
            reqTimeout: parseInt(getSetting('reqTimeout', CONFIG.reqTimeout), 10)
        };
    }

    /* =========================== 本地答案缓存 =========================== */
    var AnswerCache = {
        get: function (question, type, options) {
            try {
                var key = Core.answerCacheKey(question, type, options);
                var all = JSON.parse(GM_getValue('xiaoai_answers', '{}') || '{}');
                var item = all[key];
                if (item && item.a) return item.a;
            } catch (e) { /* ignore */ }
            return null;
        },
        set: function (question, type, options, answer) {
            try {
                if (!answer) return;
                var key = Core.answerCacheKey(question, type, options);
                var all = JSON.parse(GM_getValue('xiaoai_answers', '{}') || '{}');
                all[key] = { a: answer, t: Date.now() };
                // 最多保留 500 条
                var keys = Object.keys(all);
                if (keys.length > 500) {
                    keys.sort(function (a, b) { return (all[a].t || 0) - (all[b].t || 0); });
                    for (var i = 0; i < keys.length - 500; i++) delete all[keys[i]];
                }
                GM_setValue('xiaoai_answers', JSON.stringify(all));
            } catch (e) { /* ignore */ }
        },

        clear: function () {
            try { GM_setValue('xiaoai_answers', '{}'); } catch (e) { /* ignore */ }
            try { logger('答案缓存已清空', 'orange'); } catch (e) { /* ignore */ }
        }
    };
    // 控制台：__xiaoaiClearCache() 清空答案缓存（更新检测时避免旧答案回放）
    try {
        _w.__xiaoaiClearCache = function () { AnswerCache.clear(); return '答案缓存已清空'; };
    } catch (e) { /* ignore */ }

    /* =========================== API 客户端 =========================== */
    var ApiClient = (function () {
        var nextAllowedAt = 0;
        var MAX_RETRIES = 2;

        // 归一化 endpoint：自动补全 /chat/completions
        function normalizeEndpoint(ep) {
            ep = (ep || '').trim().replace(/\/+$/, '');
            if (/chat\/completions$/i.test(ep) || /completions$/i.test(ep)) return ep;
            if (/\/v\d+$/i.test(ep)) return ep + '/chat/completions';
            return ep + '/v1/chat/completions';
        }

        function isAnthropic(cfg) {
            return /anthropic|claude/i.test(cfg.baseURL) || /claude/i.test(cfg.model);
        }

        function buildMessages(promptObj) {
            var msgs = [];
            if (promptObj.system) msgs.push({ role: 'system', content: promptObj.system });
            msgs.push({ role: 'user', content: promptObj.user });
            return msgs;
        }

        function ask(promptObj, retryCount) {
            retryCount = retryCount || 0;
            var cfg = aiConfig();

            return new Promise(function (resolve, reject) {
                if (!cfg.apiKey) {
                    return reject({ c: -10, msg: '未配置 API Key，请在设置面板填写' });
                }

                // 节流
                var intervalMs = Math.min(60000, Math.max(0, (cfg.requestInterval || 0)) * 1000);
                var nowTs = Date.now();
                var waitMs = Math.max(0, nextAllowedAt - nowTs);
                nextAllowedAt = Math.max(nowTs, nextAllowedAt) + intervalMs;

                var requestDone = false;
                var longWaitTimer = null;
                var timeoutMs = (cfg.reqTimeout || 120) * 1000;

                // 看门狗：请求在 timeoutMs 内未完成则重试（ontimeout 通常先触发，此为兜底）
                longWaitTimer = setTimeout(function () {
                    if (!requestDone) {
                        requestDone = true;
                        if (retryCount < MAX_RETRIES) {
                            logger('请求超时重试（第' + (retryCount + 1) + '次）', 'orange');
                            ask(promptObj, retryCount + 1).then(resolve).catch(reject);
                        } else {
                            reject({ c: 666, msg: '请求超时（已重试 ' + MAX_RETRIES + ' 次）' });
                        }
                    }
                }, timeoutMs + 30000 + waitMs);

                setTimeout(function () {
                    if (requestDone) return;

                    var endpoint = isAnthropic(cfg)
                        ? (cfg.baseURL.trim().replace(/\/+$/, '') + '/messages')
                        : normalizeEndpoint(cfg.baseURL);

                    var body;
                    var headers = { 'Content-Type': 'application/json' };
                    if (isAnthropic(cfg)) {
                        headers['x-api-key'] = cfg.apiKey;
                        headers['anthropic-version'] = '2023-06-01';
                        body = JSON.stringify({
                            model: cfg.model,
                            max_tokens: Math.max(cfg.maxTokens, 1024),
                            temperature: cfg.temperature,
                            messages: [{ role: 'user', content: promptObj.user }],
                            system: promptObj.system || ''
                        });
                    } else {
                        headers['Authorization'] = 'Bearer ' + cfg.apiKey;
                        body = JSON.stringify({
                            model: cfg.model,
                            messages: buildMessages(promptObj),
                            temperature: cfg.temperature,
                            max_tokens: cfg.maxTokens
                        });
                    }

                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: endpoint,
                        headers: headers,
                        data: body,
                        timeout: timeoutMs,
                        onload: function (xhr) {
                            if (requestDone) return;
                            requestDone = true;
                            clearTimeout(longWaitTimer);
                            if (xhr.status === 200) {
                                try {
                                    var obj = JSON.parse(xhr.responseText);
                                    var msg = (obj.choices && obj.choices[0] && obj.choices[0].message) ||
                                        (obj.content && obj.content[0] && obj.content[0].text ? { content: obj.content[0].text } : null) ||
                                        {};
                                    var answer = msg.content || msg.reasoning_content || '';
                                    if (answer) {
                                        resolve(answer);
                                    } else {
                                        reject({ c: 0, msg: 'AI 返回空答案' });
                                    }
                                } catch (e) {
                                    reject({ c: -1, msg: 'JSON 解析失败' });
                                }
                            } else if (xhr.status === 401 || xhr.status === 403) {
                                reject({ c: xhr.status, msg: 'API Key 无效或权限不足 (' + xhr.status + ')' });
                            } else if (xhr.status === 429) {
                                reject({ c: 429, msg: '请求过于频繁，请降低速率或稍后再试' });
                            } else if (xhr.status === 400) {
                                // 400 不修改全局配置，交由 getAnswer 层做一次性降级重试
                                reject({ c: 400, msg: '请求参数错误 (400)，请检查 Base URL/模型名/参数' });
                            } else {
                                reject({ c: xhr.status, msg: 'HTTP ' + xhr.status });
                            }
                        },
                        onerror: function () {
                            if (requestDone) return;
                            requestDone = true;
                            clearTimeout(longWaitTimer);
                            reject({ c: -2, msg: '网络错误，请检查 Base URL 或网络' });
                        },
                        ontimeout: function () {
                            if (requestDone) return;
                            requestDone = true;
                            clearTimeout(longWaitTimer);
                            if (retryCount < MAX_RETRIES) {
                                logger('请求超时，重试（第' + (retryCount + 1) + '次）', 'orange');
                                ask(promptObj, retryCount + 1).then(resolve).catch(reject);
                            } else {
                                reject({ c: 666, msg: '请求超时（已重试 ' + MAX_RETRIES + ' 次）' });
                            }
                        }
                    });
                }, waitMs);
            });
        }

        // 测试连接
        function test() {
            var cfg = aiConfig();
            if (!cfg.apiKey) return Promise.reject({ msg: '请先填写 API Key' });
            var p = Core.PromptBuilder.build({ type: 3, typeName: '判断题', question: '这是一条连接测试消息' });
            return ask(p, 0);
        }

        return { ask: ask, test: test };
    })();

    /* =========================== AI 作答入口（含缓存/JSON解析/类型化清洗） =========================== */
    // type 为数字题型；返回 Promise<string> 已清洗的答案文本
    function getAnswer(type, promptObj) {
        var jsonMode = getSettingBool('jsonMode', !!CONFIG.jsonMode);
        var $thinking = logger('<span style="display:inline-block;width:9px;height:9px;margin-right:5px;border:1.5px solid rgba(15,23,42,.18);border-top-color:rgba(15,23,42,.7);border-radius:50%;vertical-align:-1px;animation:ne21-spin .8s linear infinite;"></span>AI 思考中...', 'gray');

        function buildPromptObj(useJson) {
            var p = { system: promptObj.system, user: promptObj.user };
            if (useJson && [0, 1, 2, 3].indexOf(type) !== -1) {
                p.system += '\n必须只输出一个 JSON 对象：{"answer":"...","answers":["..."]}，其中 answer 为答案文本(多选用 | 分隔)，answers 为数组。不要输出任何其他内容。';
            }
            return p;
        }

        function doAsk(useJson, retryCount) {
            var p = buildPromptObj(useJson);
            if (DEV_MODE) debugLog('→ 发送请求 [' + (useJson ? 'JSON' : '文本') + '] model=' + aiConfig().model);
            if (DEV_MODE) debugLog('→ System: ' + String(p.system).slice(0, 400));
            if (DEV_MODE) debugLog('→ User: ' + String(p.user).slice(0, 400));
            return ApiClient.ask(p, retryCount).then(function (raw) {
                _dailyCount++;
                if (DEV_MODE) debugLog('← AI 原始返回(' + raw.length + '字符): ' + raw.slice(0, 600));
                var parsed = Core.AiResponseParser.parse({ raw: raw, type: type, jsonMode: useJson });
                // JSON 模式但返回超长非 JSON（推理模型泄出）：视为失败，触发降级重试
                if (useJson && parsed.json === false && raw.length > 500) {
                    throw { c: 0, msg: 'JSON 模式返回超长非JSON响应，降级重试' };
                }
                var answer = parsed.answer;
                updateLogEntry($thinking, '答案: ' + (answer || '(空)'), 'purple');
                if (DEV_MODE) debugLog('→ 解析结果: ' + (answer || '(空)') + (parsed.json ? ' [JSON]' : ' [文本]'));
                if (answer) return answer;
                throw { c: 0, msg: 'AI 返回空答案' };
            });
        }

        // JSON 模式失败（400/空答案）时，临时降级为纯文本重试一次（不改全局配置）
        return doAsk(jsonMode, 0).catch(function (err) {
            if (jsonMode && (err.c === 400 || err.c === 0)) {
                logger('JSON 模式失败，降级为纯文本重试', 'orange');
                return doAsk(false, 1);
            }
            throw err;
        }).catch(function (err) {
            updateLogEntry($thinking, 'AI 请求失败: ' + (err.msg || err.c || '未知'), 'red');
            throw err;
        });
    }

    /* =========================== UEditor / 编辑器填充助手 =========================== */
    var EditorHelper = {
        // 三层定位 UEditor 实例
        getUEditor: function (contextWindow, editorIndex, itemId) {
            contextWindow = contextWindow || _w;
            var ueditor = null;
            try {
                if (contextWindow.editors && contextWindow.editors[editorIndex]) {
                    ueditor = contextWindow.editors[editorIndex].ueditor;
                }
                if (!ueditor && contextWindow.UE && contextWindow.UE.instants) {
                    ueditor = contextWindow.UE.instants['ueditorInstant' + editorIndex];
                }
                if (!ueditor && itemId && contextWindow.UE && contextWindow.UE.getEditor) {
                    ueditor = contextWindow.UE.getEditor('ananas-editor-answer' + itemId);
                }
                if (!ueditor && itemId && contextWindow.UE && contextWindow.UE.getEditor) {
                    ueditor = contextWindow.UE.getEditor('answerEditor' + itemId);
                }
            } catch (e) { /* ignore */ }
            return ueditor;
        },

        // 设置 UEditor 内容并同步隐藏 textarea
        setUEditorContent: function (ueditor, textarea, val) {
            try {
                if (ueditor && ueditor.setContent) { ueditor.setContent(val); }
            } catch (e) { /* ignore */ }
            if (textarea) {
                try {
                    textarea.val(val);
                    if (textarea[0]) {
                        textarea[0].dispatchEvent(new Event('change'));
                        textarea[0].dispatchEvent(new Event('input'));
                    }
                } catch (e) { /* ignore */ }
            }
        }
    };

    /* =========================== 编程题处理器 =========================== */
    var ProgrammingHandler = {
        // 提取 AI 代码（去掉 ``` 围栏；兼容同行围栏 ```js code```）
        extractCode: function (answer) {
            if (!answer) return '';
            var m = answer.match(/```[a-zA-Z]*\s*\n?([\s\S]*?)```/);
            if (m && m[1].trim()) return m[1].trim();
            // 无围栏：去掉"以下是代码"等引导
            return answer
                .replace(/^.*?(代码如下|代码如|如下)[：:]\s*/i, '')
                .replace(/^(以下是)?(我的)?(程序|代码)[：:：]?\s*/i, '')
                .trim();
        },

        // 填充代码编辑器；返回是否成功
        fill: function ($container, code) {
            if (!code) return false;
            var ctxWin = $container[0] ? ($container[0].ownerDocument.defaultView || _w) : _w;
            var filled = false;

            // 1. CodeMirror
            var cm = null;
            try {
                var cmEls = $container.find('.CodeMirror');
                if (cmEls.length > 0) {
                    // CodeMirror 实例可从元素取 .CodeMirror 属性 或遍历 _CodeMirror
                    var el = cmEls[0];
                    cm = el.CodeMirror || el._CodeMirror;
                    if (!cm && ctxWin.CodeMirror && ctxWin.CodeMirror.instanceFromTextArea) {
                        var ta = $container.find('textarea').filter(function () { return this.offsetParent !== null; })[0] || $container.find('textarea')[0];
                        if (ta) cm = ctxWin.CodeMirror.instanceFromTextArea(ta);
                    }
                }
            } catch (e) { /* ignore */ }
            if (cm) {
                try { cm.setValue(code); filled = true; } catch (e) { /* ignore */ }
            }

            // 2. Monaco（优先按 DOM 节点匹配到当前题目对应的编辑器，避免多编程题填错）
            if (!filled) {
                try {
                    var mo = ctxWin.monaco;
                    if (mo && mo.editor) {
                        var model = null;
                        var eds = mo.editor.getEditors && mo.editor.getEditors();
                        if (eds && eds.length) {
                            for (var ei = 0; ei < eds.length; ei++) {
                                try {
                                    var node = eds[ei].getDomNode && eds[ei].getDomNode();
                                    if (node && $container[0] && $container[0].contains(node)) {
                                        model = eds[ei].getModel && eds[ei].getModel();
                                        if (model) break;
                                    }
                                } catch (e) { /* ignore */ }
                            }
                        }
                        if (!model) {
                            var models = mo.editor.getModels && mo.editor.getModels();
                            if (models && models.length) model = models[0];
                        }
                        if (model) { model.setValue(code); filled = true; }
                    }
                } catch (e) { /* ignore */ }
            }

            // 3. textarea 兜底
            if (!filled) {
                var $ta = $container.find('textarea');
                if ($ta.length > 0) {
                    $ta.val(code).trigger('input').trigger('change');
                    filled = true;
                }
            }
            return filled;
        },

        // 点击"提交/运行"按钮
        submit: function ($container) {
            var keywords = ['提交', '运行', '执行', '测试', '保存', '确定', 'Run', 'Submit', 'Compile'];
            var $btns = $container.find('button, a, input[type=button], .btn, .el-button');
            for (var i = 0; i < $btns.length; i++) {
                var txt = ($btns.eq(i).text() || $btns.eq(i).val() || '').trim();
                for (var k = 0; k < keywords.length; k++) {
                    if (txt.indexOf(keywords[k]) !== -1) {
                        try { $btns.eq(i).click(); } catch (e) { /* ignore */ }
                        return true;
                    }
                }
            }
            return false;
        }
    };

    // 是否属于可缓存的高置信度匹配（模糊匹配比例 <60% 不缓存，避免回放错误答案）
    function isCacheableConfidence(conf) {
        if (!conf) return false;
        if (conf.indexOf('fuzzy') !== -1) {
            var m = conf.match(/(\d+)%/);
            return m && parseInt(m[1], 10) >= 60;
        }
        return true;
    }

    /* =========================== 答案应用（把解析结果写入页面） =========================== */
    // adapter 提供 selectOption/highlightOption/fillBlanks/fillEssay/fillProgramming/showAnswerInTitle
    function applyAnswer(type, answer, options, $timu, adapter, settings) {
        settings = settings || {};
        var goodStudent = getSettingBool('goodStudent', !!CONFIG.goodStudent);
        var alterTitle = settings.alterTitle !== undefined ? settings.alterTitle : getSettingBool('alterTitle', !!CONFIG.alterTitle);

        switch (type) {
            case 0: { // 单选
                var r = Core.matchSingle(answer, options, getSettingBool('fuzzyMatch', true) ? 0.45 : -1);
                if (DEV_MODE) debugLog('匹配结果: AI答案="' + answer + '" -> 选项[' + r.index + '] ' + (r.index >= 0 ? options[r.index] : '(无)') + ' (' + r.confidence + ')');
                if (r.index === -1) return { success: false, reason: 'match_failed', confidence: r.confidence };
                if (alterTitle) adapter.showAnswerInTitle($timu, answer);
                if (goodStudent) adapter.highlightOption($timu, r.index);
                else adapter.selectOption($timu, r.index);
                if (DEV_MODE) debugLog('已点击选项[' + r.index + ']: ' + options[r.index]);
                return { success: true, confidence: r.confidence };
            }
            case 1: { // 多选
                var indices = Core.matchMulti(answer, options, getSettingBool('fuzzyMatch', true) ? 0.45 : -1);
                if (DEV_MODE) debugLog('多选匹配: AI答案="' + answer + '" -> 选项下标[' + indices.join(',') + ']');
                if (indices.length === 0) return { success: false, reason: 'multi_match_failed' };
                if (alterTitle) adapter.showAnswerInTitle($timu, answer);
                for (var i = 0; i < indices.length; i++) {
                    if (goodStudent) adapter.highlightOption($timu, indices[i]);
                    else adapter.selectOption($timu, indices[i]);
                }
                if (DEV_MODE) debugLog('已点击多选项: ' + indices.map(function (x) { return options[x]; }).join(' | '));
                return { success: true, confidence: 'matched(' + indices.length + ')' };
            }
            case 2: { // 填空
                var blanks = Core.splitFillAnswers(answer);
                if (blanks.length === 0) blanks = [answer];
                if (DEV_MODE) debugLog('填空答案拆分为 ' + blanks.length + ' 个空: ' + blanks.join(' | '));
                adapter.fillBlanks($timu, blanks);
                if (alterTitle) adapter.showAnswerInTitle($timu, blanks.join(' | '));
                return { success: true, confidence: 'filled(' + blanks.length + ')' };
            }
            case 3: { // 判断
                var jr = Core.matchJudge(answer);
                if (DEV_MODE) debugLog('判断解析: AI答案="' + answer + '" -> ' + (jr.isTrue === null ? '解析失败' : (jr.isTrue ? '正确' : '错误')));
                if (jr.isTrue === null) return { success: false, reason: 'judge_parse_failed' };
                if (alterTitle) adapter.showAnswerInTitle($timu, answer);
                var optIdx = Core.findJudgeOptionIndex(options, jr.isTrue);
                if (optIdx === -1) return { success: false, reason: 'judge_option_not_found' };
                if (goodStudent) adapter.highlightOption($timu, optIdx);
                else adapter.selectOption($timu, optIdx);
                if (DEV_MODE) debugLog('已点击判断选项[' + optIdx + ']: ' + options[optIdx]);
                return { success: true, confidence: 'judge' };
            }
            case 4: case 5: case 7: case 8: { // 简答/写作/计算/翻译 → 文本
                adapter.fillEssay($timu, answer);
                if (alterTitle) adapter.showAnswerInTitle($timu, answer);
                return { success: true, confidence: 'essay' };
            }
            case 6: { // 复合大题（阅读/完形）在子题处理器中单独处理
                return { success: false, reason: 'composite_handled_elsewhere' };
            }
            case 9: { // 编程
                var code = ProgrammingHandler.extractCode(answer);
                var ok = adapter.fillProgramming ? adapter.fillProgramming($timu, code) : ProgrammingHandler.fill($timu, code);
                if (alterTitle && ok) adapter.showAnswerInTitle($timu, '已填入代码');
                return { success: ok, reason: ok ? 'programming' : 'programming_fill_failed', confidence: 'programming' };
            }
            default:
                return { success: false, reason: 'unsupported_type' };
        }
    }

    // 找不到答案时按 randomDo 随机作答（模拟真人，避免全对）
    function randomAnswer(type, options, adapter, $timu) {
        if (!getSettingBool('randomDo', !!CONFIG.randomDo)) return;
        var acc = parseInt(getSetting('accuracy', CONFIG.accuracy), 10);
        if (acc >= 100) return; // 100% 正确率时不掺错
        try {
            if (type === 0 && options.length > 0) {
                adapter.selectOption($timu, 1 % options.length); // 选 B
                logger('随机作答：单选选 B', 'orange');
            } else if (type === 1 && options.length > 0) {
                for (var i = 0; i < options.length; i++) adapter.selectOption($timu, i); // 全选
                logger('随机作答：多选全选', 'orange');
            } else if (type === 3) {
                var idx = Core.findJudgeOptionIndex(options, false);
                if (idx !== -1) { adapter.selectOption($timu, idx); logger('随机作答：判断选错', 'orange'); }
            }
        } catch (e) { /* ignore */ }
    }

    /* =========================== 题型引擎 =========================== */
    var QuizEngine = {
        processOne: function (index, total, $timu, adapter, settings) {
            settings = settings || {};
            return new Promise(function (resolve) {
                var prefix = '第' + (index + 1) + (total ? '/' + total : '') + '题 ';
                var typeInfo = adapter.getType($timu);
                if (typeInfo.type === undefined) {
                    logger(prefix + '无法识别题型(' + (typeInfo.typeName || '未知') + ')，跳过', 'red');
                    Report.snapshot('第' + (index + 1) + '题 [未知题型: ' + (typeInfo.typeName || '?') + '] 解析失败', $timu[0] ? $timu[0].outerHTML : '');
                    return resolve({ success: false, reason: 'unknown_type' });
                }
                var questionText = adapter.getQuestionText($timu);
                var options = adapter.getOptions($timu, typeInfo.type) || [];
                logger(prefix + '[' + typeInfo.typeName + '] ' + (questionText || '').slice(0, 80), 'pink');
                Report.sampleQuestion(typeInfo.typeName, $timu[0] ? $timu[0].outerHTML : '');
                if (DEV_MODE) {
                    debugLog('题干全文: ' + questionText);
                    debugLog('选项(' + options.length + '): ' + options.join(' | '));
                    debugLog('题型识别: ' + typeInfo.typeName + ' -> type=' + typeInfo.type);
                }

                // 已作答检查
                if (adapter.isAnswered && adapter.isAnswered($timu)) {
                    if (!getSettingBool('redo', !!CONFIG.redo)) {
                        logger(prefix + '已作答，跳过', 'green');
                        return resolve({ success: true, reason: 'already_answered' });
                    }
                    logger(prefix + '重做模式，重新作答', 'blue');
                    if (adapter.unselectAll) adapter.unselectAll($timu);
                }

                // 本地答案缓存命中（可关闭；只缓存高置信度，避免回放错误答案）
                var cached = getSettingBool('useCache', !!CONFIG.useCache) ? AnswerCache.get(questionText, typeInfo.type, options) : null;
                if (cached) {
                    logger(prefix + '命中本地缓存，直接作答', 'blue');
                    var cachedResult = applyAnswer(typeInfo.type, cached, options, $timu, adapter, settings);
                    if (cachedResult.success) {
                        logger(prefix + '缓存作答成功 [' + cachedResult.confidence + ']', 'green');
                        _answeredCount++;
                        return resolve({ success: true, reason: 'cache', confidence: cachedResult.confidence });
                    }
                    logger(prefix + '缓存答案匹配失败，重新请求 AI', 'orange');
                }

                // 构造 prompt
                var promptOpts = { type: typeInfo.type, typeName: typeInfo.typeName, question: questionText, options: options };
                var prompt = Core.PromptBuilder.build(promptOpts);

                var thinkingHtml = '<span style="display:inline-block;width:9px;height:9px;margin-right:5px;border:1.5px solid rgba(15,23,42,.18);border-top-color:rgba(15,23,42,.7);border-radius:50%;vertical-align:-1px;animation:ne21-spin .8s linear infinite;"></span>AI 思考中...';
                var $thinking = logger(thinkingHtml, 'gray');

                getAnswer(typeInfo.type, prompt).then(function (answer) {
                    updateLogEntry($thinking, '答案: ' + answer, 'purple');

                    var result = applyAnswer(typeInfo.type, answer, options, $timu, adapter, settings);
                    if (result.success) {
                        // 匹配成功才写缓存，且仅高置信度（防止模糊匹配的错误答案被回放）
                        if (getSettingBool('useCache', !!CONFIG.useCache) && isCacheableConfidence(result.confidence)) {
                            AnswerCache.set(questionText, typeInfo.type, options, answer);
                        }
                        logger(prefix + '自动答题成功 [' + result.confidence + ']', 'green');
                        _answeredCount++;
                        resolve({ success: true, reason: 'answered', confidence: result.confidence });
                    } else {
                        logger(prefix + '答案匹配失败 — ' + result.reason, 'red');
                        Report.snapshot('第' + (index + 1) + '题 [' + typeInfo.typeName + '] 匹配失败(AI="' + String(answer).slice(0, 60) + '", 原因=' + result.reason + ')', $timu[0] ? $timu[0].outerHTML : '');
                        randomAnswer(typeInfo.type, options, adapter, $timu);
                        resolve({ success: false, reason: result.reason });
                    }
                }).catch(function (err) {
                    updateLogEntry($thinking, 'AI 请求失败: ' + (err.msg || err.c || '未知'), 'red');
                    logger(prefix + 'AI 请求失败', 'red');
                    randomAnswer(typeInfo.type, options, adapter, $timu);
                    resolve({ success: false, reason: 'api_error' });
                });
            });
        },

        processAll: function ($questions, adapter, settings, callback) {
            settings = settings || {};
            var index = 0;
            var total = $questions.length;
            _answeredCount = 0;
            _totalCount = total;
            logger('共 ' + total + ' 道题待处理', 'blue');

            function next() {
                if (_quizPaused) { setTimeout(next, 800); return; }
                if (index >= total) {
                    logger('全部题目处理完毕', 'green');
                    if (settings.onAllDone) settings.onAllDone(_answeredCount, total);
                    if (callback) callback();
                    return;
                }
                var $timu = $($questions[index]);
                QuizEngine.processOne(index, total, $timu, adapter, settings).then(function () {
                    index++;
                    var delay = settings.delayFn ? settings.delayFn() : (parseInt(getSetting('time', CONFIG.time), 10) + rand(0, 800));
                    setTimeout(next, delay);
                });
            }
            next();
        }
    };

    /* ===================================================================
     *  场景适配器 — 每个只提供该场景特有的 DOM 选择器
     * =================================================================== */

    // ---- Phone Adapter（手机版测验 /work/phone/work） ----
    var PhoneAdapter = {
        getType: function ($timu) {
            var full = $timu.find('.Py-m1-title').html() || '';
            var m = full.match(/.*?\[(.*?)]/);
            var typeName = m ? m[1] : '未知';
            var type = Core.mapTypeName(typeName);
            if (type === undefined) {
                if ($timu.find('.answerList.singleChoice li').length > 0) { type = 0; typeName = '单选题'; }
                else if ($timu.find('.answerList.multiChoice li').length > 0) { type = 1; typeName = '多选题'; }
                else if ($timu.find('.blankList2 input, [data-editorindex]').length > 0) { type = 2; typeName = '填空题'; }
                else if ($timu.find('.answerList.panduan li').length > 0) { type = 3; typeName = '判断题'; }
                else if ($timu.find('textarea').length > 0 || $timu.find('.edui-editor').length > 0) { type = 4; typeName = '简答题'; }
            }
            return { type: type, typeName: typeName };
        },
        getQuestionText: function ($timu) {
            var full = stripAiMarker($timu.find('.Py-m1-title').html() || '');
            return Core.tidyQuestion(Core.textifyMedia(full)).replace(/.*?\[.*?题\]\s*\n\s*/, '');
        },
        getOptions: function ($timu, type) {
            var selector = type === 0 ? '.answerList.singleChoice li' : type === 1 ? '.answerList.multiChoice li' : type === 3 ? '.answerList.panduan li' : null;
            if (!selector) return [];
            var opts = [];
            $timu.find(selector).each(function () { opts.push(Core.normalizeOptionText($(this).html())); });
            return opts;
        },
        isAnswered: function ($timu) {
            return $timu.find('.answerList li[aria-label]').length > 0;
        },
        unselectAll: function ($timu) {
            $timu.find('.answerList li[aria-label]').each(function () { try { $(this).click(); } catch (e) {} });
        },
        selectOption: function ($timu, index) {
            var $opt = $timu.find('.answerList li').eq(index);
            if ($opt.length) { try { $opt.click(); } catch (e) {} }
        },
        highlightOption: function ($timu, index) {
            $timu.find('.answerList li').eq(index).css('font-weight', 'bold');
        },
        showAnswerInTitle: function ($timu, answer) {
            var $title = $timu.find('.Py-m1-title');
            $title.html($title.html() + '<p></p><b class="xiaoai-ai" style="color:#059669;">[AI] ' + escapeHtml(answer) + '</b>');
        },
        fillBlanks: function ($timu, blanks) {
            var ctxWin = $timu[0] ? ($timu[0].ownerDocument.defaultView || _w) : _w;
            var $blocks = $timu.find('[data-editorindex]');
            var $inputs = $timu.find('.blankList2 input');
            if ($blocks.length > 0) {
                $blocks.each(function (i) {
                    var editorIndex = $(this).attr('data-editorindex');
                    var itemId = $(this).attr('data-itemid');
                    var val = blanks[i] !== undefined ? blanks[i] : (blanks[0] || '');
                    setTimeout(function () {
                        var ueditor = EditorHelper.getUEditor(ctxWin, editorIndex, itemId);
                        var $ta = itemId ? $('#answer' + itemId) : null;
                        EditorHelper.setUEditorContent(ueditor, $ta, val);
                    }, 300 * (i + 1));
                });
            } else if ($inputs.length > 0) {
                $inputs.each(function (i) {
                    var val = blanks[i] !== undefined ? blanks[i] : (blanks[0] || '');
                    $($inputs[i]).val(val).trigger('input').trigger('change');
                });
            } else {
                var $tas = $timu.find('textarea');
                $tas.each(function (i) {
                    var val = blanks[i] !== undefined ? blanks[i] : (blanks[0] || '');
                    var $ta = $($tas[i]);
                    $ta.val(val).trigger('input').trigger('change');
                    var id = $ta.attr('id') || $ta.attr('name');
                    setTimeout(function () {
                        try { if (id && UE && UE.getEditor(id)) UE.getEditor(id).setContent(val); } catch (e) {}
                    }, 300 + i * 200);
                });
            }
        },
        fillEssay: function ($timu, answer) {
            var ctxWin = $timu[0] ? ($timu[0].ownerDocument.defaultView || _w) : _w;
            var $blocks = $timu.find('[data-editorindex]');
            var $tas = $timu.find('textarea[name^="answer"], textarea');
            if ($blocks.length > 0) {
                var editorIndex = $blocks.first().attr('data-editorindex');
                var itemId = $blocks.first().attr('data-itemid');
                setTimeout(function () {
                    var ueditor = EditorHelper.getUEditor(ctxWin, editorIndex, itemId);
                    var $ta = $tas.first();
                    EditorHelper.setUEditorContent(ueditor, $ta, answer);
                }, 500);
            } else if ($tas.length > 0) {
                $tas.first().val(answer).trigger('input').trigger('change');
            }
        },
        fillProgramming: function ($timu, code) {
            return ProgrammingHandler.fill($timu, code);
        }
    };

    // ---- Homework Adapter（作业 /mooc2/work/dowork） ----
    var HomeworkAdapter = {
        getType: function ($timu) {
            var typeName = $timu.attr('typename') || '';
            var type = Core.mapTypeName(typeName);
            if (type === undefined) {
                var $opts = $timu.find('.stem_answer .answer_p');
                if ($opts.length > 0) {
                    var hasCheckbox = $timu.find('.stem_answer input[type="checkbox"]').length > 0;
                    type = hasCheckbox ? 1 : 0;
                    typeName = hasCheckbox ? '多选题' : '单选题';
                } else {
                    var $tas = $timu.find('.stem_answer textarea[name^="answerEditor"], .stem_answer .subEditor textarea, .Answer textarea, .CodeMirror');
                    if ($tas.length > 0) {
                        // 编程题检测
                        if (typeName.indexOf('编程') !== -1 || typeName.indexOf('程序') !== -1 || $timu.find('.CodeMirror').length > 0) {
                            type = 9; typeName = '编程题';
                        } else { type = 4; typeName = '简答题'; }
                    }
                }
            }
            return { type: type, typeName: typeName || '未知' };
        },
        getQuestionText: function ($timu) {
            var full = stripAiMarker($timu.find('.mark_name').html() || '');
            return Core.tidyQuestion(Core.textifyMedia(full)).replace(/^[(].*?[)]/, '');
        },
        getOptions: function ($timu, type) {
            var $opts = $timu.find('.stem_answer .answer_p');
            if ($opts.length === 0) return [];
            var opts = [];
            $opts.each(function () { opts.push(Core.normalizeOptionText($(this).html())); });
            return opts;
        },
        isAnswered: function ($timu) {
            return $timu.find('.stem_answer span.check_answer, .stem_answer span.check_answer_dx').length > 0;
        },
        unselectAll: function ($timu) {
            $timu.find('.stem_answer span.check_answer, .stem_answer span.check_answer_dx').each(function () {
                try { $(this).parent().click(); } catch (e) {}
            });
        },
        selectOption: function ($timu, index) {
            var $opt = $timu.find('.stem_answer .answer_p').eq(index);
            if ($opt.length) {
                var cls = $opt.parent().find('span').attr('class') || '';
                if (cls.indexOf('check_answer') === -1) { try { $opt.parent().click(); } catch (e) {} }
            }
        },
        highlightOption: function ($timu, index) {
            $timu.find('.stem_answer .answer_p').eq(index).parent().find('span').css('font-weight', 'bold');
        },
        showAnswerInTitle: function ($timu, answer) {
            var $title = $timu.find('.mark_name');
            $title.html($title.html() + '<p></p><b class="xiaoai-ai" style="color:#059669;">[AI] ' + escapeHtml(answer) + '</b>');
        },
        fillBlanks: function ($timu, blanks) {
            var $tas = $timu.find('textarea[name^="answerEditor"]');
            if ($tas.length === 0) $tas = $timu.find('.stem_answer .subEditor textarea');
            $tas.each(function (i) {
                var id = $(this).attr('id') || $(this).attr('name');
                var val = blanks[i] !== undefined ? blanks[i] : (blanks[0] || '');
                var $ta = $(this);
                $ta.val(val).trigger('input').trigger('change');
                setTimeout(function () {
                    try { if (id && UE && UE.getEditor(id)) UE.getEditor(id).setContent(val); } catch (e) {}
                }, 300 + i * 200);
            });
        },
        fillEssay: function ($timu, answer) {
            var $tas = $timu.find('textarea[name^="answerEditor"]');
            if ($tas.length === 0) $tas = $timu.find('.stem_answer .subEditor textarea, .Answer textarea, textarea');
            $tas.first().val(answer).trigger('input').trigger('change');
            $tas.each(function (i) {
                var id = $(this).attr('id') || $(this).attr('name');
                setTimeout(function () {
                    try { if (id && UE && UE.getEditor(id)) UE.getEditor(id).setContent(answer); } catch (e) {}
                }, 300 + i * 200);
            });
        },
        fillProgramming: function ($timu, code) {
            var ok = ProgrammingHandler.fill($timu, code);
            ProgrammingHandler.submit($timu);
            return ok;
        }
    };

    // ---- Exam Adapter（考试逐题模式 /exam/test/reVersionTestStartNew） ----
    var ExamAdapter = {
        getType: function ($timu) {
            var full = ($timu.find('h3.mark_name').html() || '').trim();
            var m = full.match(/[(](.*?),.*?分[)]/);
            var typeName = m ? m[1] : '未知';
            var type = Core.mapTypeName(typeName);
            if (type === undefined) {
                var $opts = $timu.find('#submitTest .stem_answer .clearfix.answerBg .fl.answer_p');
                if ($opts.length > 0) {
                    var hasCheckbox = $timu.find('#submitTest .stem_answer input[type="checkbox"]').length > 0;
                    type = hasCheckbox ? 1 : 0;
                    typeName = hasCheckbox ? '多选题' : '单选题';
                } else {
                    var $tas = $timu.find('#submitTest .stem_answer textarea[name^="answerEditor"]');
                    if ($tas.length > 0) {
                        if (typeName.indexOf('编程') !== -1 || typeName.indexOf('程序') !== -1 || $timu.find('.CodeMirror').length > 0) {
                            type = 9; typeName = '编程题';
                        } else { type = 4; typeName = '简答题'; }
                    }
                }
            }
            return { type: type, typeName: typeName };
        },
        getQuestionText: function ($timu) {
            var full = stripAiMarker($timu.find('h3.mark_name').html() || '');
            return Core.tidyQuestion(Core.textifyMedia(full.replace(/[(].*?分[)]/, '')));
        },
        getOptions: function ($timu, type) {
            var $opts = $timu.find('#submitTest .stem_answer .clearfix.answerBg .fl.answer_p');
            if ($opts.length === 0) return [];
            var opts = [];
            $opts.each(function () { opts.push(Core.normalizeOptionText($(this).html())); });
            return opts;
        },
        isAnswered: function ($timu) {
            return $timu.find('#submitTest .stem_answer span.check_answer, #submitTest .stem_answer span.check_answer_dx').length > 0;
        },
        unselectAll: function ($timu) {
            $timu.find('#submitTest .stem_answer span.check_answer, #submitTest .stem_answer span.check_answer_dx').each(function () {
                try { $(this).parent().click(); } catch (e) {}
            });
        },
        selectOption: function ($timu, index) {
            var $opt = $timu.find('#submitTest .stem_answer .clearfix.answerBg .fl.answer_p').eq(index);
            if ($opt.length) {
                var cls = $opt.parent().find('span').attr('class') || '';
                if (cls.indexOf('check_answer') === -1) { try { $opt.parent().click(); } catch (e) {} }
            }
        },
        highlightOption: function ($timu, index) {
            $timu.find('#submitTest .stem_answer .clearfix.answerBg .fl.answer_p').eq(index).parent().find('span').css('font-weight', 'bold');
        },
        showAnswerInTitle: function ($timu, answer) {
            var $title = $timu.find('h3.mark_name');
            $title.html($title.html() + '<b class="xiaoai-ai" style="color:#059669;">[AI] ' + escapeHtml(answer) + '</b>');
        },
        fillBlanks: function ($timu, blanks) {
            var $tas = $timu.find('#submitTest .stem_answer .Answer .divText .subEditor textarea, #submitTest .stem_answer textarea');
            $tas.each(function (i) {
                var id = $(this).attr('id') || $(this).attr('name');
                var val = blanks[i] !== undefined ? blanks[i] : (blanks[0] || '');
                var $ta = $(this);
                $ta.val(val).trigger('input').trigger('change');
                setTimeout(function () {
                    try { if (id && UE && UE.getEditor(id)) UE.getEditor(id).setContent(val); } catch (e) {}
                }, 300 + i * 200);
            });
        },
        fillEssay: function ($timu, answer) {
            var $tas = $timu.find('#submitTest textarea[name^="answerEditor"], #submitTest .subEditor textarea');
            $tas.first().val(answer).trigger('input').trigger('change');
            $tas.each(function (i) {
                var id = $(this).attr('id') || $(this).attr('name');
                setTimeout(function () {
                    try { if (id && UE && UE.getEditor(id)) UE.getEditor(id).setContent(answer); } catch (e) {}
                }, 300 + i * 200);
            });
        },
        fillProgramming: function ($timu, code) {
            return ProgrammingHandler.fill($timu, code);
        }
    };

    // ---- Exam Preview Adapter（整卷预览 /mooc2/exam/preview） ----
    var ExamPreviewAdapter = {
        getType: function ($timu) {
            var typeName = $timu.attr('typename') || '';
            var type = Core.mapTypeName(typeName);
            if (type !== undefined) return { type: type, typeName: typeName };
            var prefixText = ($timu.find('.colorShallow').text() || $timu.find('.mark_name').text() || '');
            var m = prefixText.match(/(单选|多选|填空|判断|简答|论述|写作|翻译|编程|程序)/);
            if (m) {
                type = Core.mapTypeName(m[1]);
                if (type !== undefined) return { type: type, typeName: m[1] };
            }
            var $opts = $timu.find('.answerBg .answer_p');
            if ($opts.length > 0) {
                var isMulti = $timu.find('.answerBg input[type="checkbox"]').length > 0;
                return { type: isMulti ? 1 : 0, typeName: isMulti ? '多选题' : '单选题' };
            }
            var $tas = $timu.find('textarea[name^="answerEditor"], .subEditor textarea');
            if ($tas.length > 0) {
                if ($timu.find('.CodeMirror').length > 0) return { type: 9, typeName: '编程题' };
                return { type: 4, typeName: '简答题' };
            }
            return { type: undefined, typeName: typeName || '未知' };
        },
        getQuestionText: function ($timu) {
            var full = stripAiMarker($timu.find('.mark_name').html() || '');
            return Core.tidyQuestion(Core.textifyMedia(full)).replace(/^[(].*?[)]/, '');
        },
        getOptions: function ($timu, type) {
            var $opts = $timu.find('.answerBg .answer_p');
            if ($opts.length === 0) return [];
            var opts = [];
            $opts.each(function () { opts.push(Core.normalizeOptionText($(this).html())); });
            return opts;
        },
        isAnswered: function ($timu) {
            return $timu.find('.answerBg span.check_answer, .answerBg span.check_answer_dx').length > 0;
        },
        unselectAll: function ($timu) {
            $timu.find('.answerBg span.check_answer, .answerBg span.check_answer_dx').each(function () {
                try { $(this).parent().click(); } catch (e) {}
            });
        },
        selectOption: function ($timu, index) {
            var $opt = $timu.find('.answerBg .answer_p').eq(index);
            if ($opt.length) {
                var cls = $opt.parent().find('span').attr('class') || '';
                if (cls.indexOf('check_answer') === -1) { try { $opt.parent().click(); } catch (e) {} }
            }
        },
        highlightOption: function ($timu, index) {
            $timu.find('.answerBg .answer_p').eq(index).parent().find('span').css('font-weight', 'bold');
        },
        showAnswerInTitle: function ($timu, answer) {
            var $title = $timu.find('.mark_name');
            $title.html($title.html() + '<p></p><b class="xiaoai-ai" style="color:#059669;">[AI] ' + escapeHtml(answer) + '</b>');
        },
        fillBlanks: function ($timu, blanks) {
            var $tas = $timu.find('textarea[name^="answerEditor"]');
            if ($tas.length === 0) $tas = $timu.find('.subEditor textarea');
            $tas.each(function (i) {
                var id = $(this).attr('id') || $(this).attr('name');
                var val = blanks[i] !== undefined ? blanks[i] : (blanks[0] || '');
                var $ta = $(this);
                $ta.val(val).trigger('input').trigger('change');
                setTimeout(function () {
                    try { if (id && UE && UE.getEditor(id)) UE.getEditor(id).setContent(val); } catch (e) {}
                }, 300 + i * 200);
            });
        },
        fillEssay: function ($timu, answer) {
            var $tas = $timu.find('textarea[name^="answerEditor"], .subEditor textarea, textarea');
            $tas.first().val(answer).trigger('input').trigger('change');
            $tas.each(function (i) {
                var id = $(this).attr('id') || $(this).attr('name');
                setTimeout(function () {
                    try { if (id && UE && UE.getEditor(id)) UE.getEditor(id).setContent(answer); } catch (e) {}
                }, 300 + i * 200);
            });
        },
        fillProgramming: function ($timu, code) {
            return ProgrammingHandler.fill($timu, code);
        }
    };

    // ---- Pc Quiz Adapter（旧版 PC 测验 /knowledge/cards） ----
    var PcQuizAdapter = {
        getType: function ($timu) {
            var questionFull = $timu.find('.Zy_TItle.clearfix > div').html() || '';
            var m = questionFull.match(/^【(.*?)】/);
            var typeName = m ? m[1] : '未知';
            var type = Core.mapTypeName(typeName);
            if (type === undefined) {
                var $choiceList = $timu.find('.Zy_ulTop li');
                if ($choiceList.length > 0) {
                    if ($choiceList.length === 2 &&
                        ($($choiceList[0]).text().indexOf('对') !== -1 || $($choiceList[0]).text().indexOf('√') !== -1)) {
                        type = 3; typeName = '判断题';
                    } else { type = 0; typeName = '单选题'; }
                } else if ($timu.find('.Zy_ulTk .XztiHover1').length > 0) {
                    type = 2; typeName = '填空题';
                } else { type = 4; typeName = '简答题'; }
            }
            return { type: type, typeName: typeName };
        },
        getQuestionText: function ($timu) {
            var full = stripAiMarker($timu.find('.Zy_TItle.clearfix > div').html() || '');
            return Core.tidyQuestion(Core.textifyMedia(full)).replace(/^【.*?】/, '');
        },
        getOptions: function ($timu, type) {
            var $opts = $timu.find('.Zy_ulTop li a');
            if ($opts.length === 0) return [];
            var opts = [];
            $opts.each(function () { opts.push(Core.normalizeOptionText($(this).html())); });
            return opts;
        },
        isAnswered: function () { return false; },
        unselectAll: function ($timu) {
            $timu.find('.Zy_ulTop li a').each(function () { try { $(this).parent().click(); } catch (e) {} });
        },
        selectOption: function ($timu, index) {
            $timu.find('.Zy_ulTop li a').eq(index).parent().click();
        },
        highlightOption: function ($timu, index) {
            $timu.find('.Zy_ulTop li a').eq(index).css('font-weight', 'bold');
        },
        showAnswerInTitle: function ($timu, answer) {
            var $title = $timu.find('.Zy_TItle.clearfix > div');
            $title.html($title.html() + '<b class="xiaoai-ai" style="color:#059669;">[AI] ' + escapeHtml(answer) + '</b>');
        },
        fillBlanks: function ($timu, blanks) {
            var $blanks = $timu.find('.Zy_ulTk .XztiHover1');
            $blanks.each(function (i) {
                var val = blanks[i] !== undefined ? blanks[i] : (blanks[0] || '');
                var $blank = $($blanks[i]);
                try {
                    $blank.find('#ueditor_' + i).contents().find('.view p').html(val);
                    $blank.find('textarea').html('<p>' + val + '</p>');
                } catch (e) { /* ignore */ }
            });
        },
        fillEssay: function ($timu, answer) {
            var $blanks = $timu.find('.Zy_ulTk .XztiHover1');
            $blanks.each(function () {
                try {
                    $(this).find('#ueditor_' + 0).contents().find('.view p').html(answer);
                    $(this).find('textarea').html('<p>' + answer + '</p>');
                } catch (e) { /* ignore */ }
            });
        },
        fillProgramming: function ($timu, code) {
            return ProgrammingHandler.fill($timu, code);
        }
    };

    /* =========================== 复合大题（阅读理解/完形填空）子题处理 =========================== */
    function processSubQuestions(subIndex, $subQuestions, parentQuestion, getDelay, onComplete) {
        if (_quizPaused) { setTimeout(function () { processSubQuestions(subIndex, $subQuestions, parentQuestion, getDelay, onComplete); }, 800); return; }
        var delay = typeof getDelay === 'function' ? getDelay() : (parseInt(getSetting('time', CONFIG.time), 10) || 2500);
        if (subIndex >= $subQuestions.length) {
            logger('该大题所有子题已处理完毕', 'green');
            setTimeout(onComplete, delay);
            return;
        }
        var $subQ = $($subQuestions[subIndex]);
        var subText = $subQ.find('.reader_answer_tit').text().replace(/^\(\d+\)\s*/, '').trim();
        var fullQuestion = '[材料]\n' + parentQuestion + '\n\n[问题]\n' + subText;

        // 子题题型：qtype 属性 或 .read_type 文本
        var subTypeVal = parseInt($subQ.attr('qtype'), 10);
        var readTypeText = $subQ.find('.read_type').text().trim();
        var subType = undefined;
        if (!isNaN(subTypeVal)) {
            subType = subTypeVal === 4 ? 4 : (subTypeVal >= 0 ? subTypeVal : undefined);
            if (subType === 4 && !$subQ.find('textarea').length && $subQ.find('.answer_p').length) subType = 0;
        } else if (/多选/.test(readTypeText)) subType = 1;
        else if (/单选/.test(readTypeText)) subType = 0;
        else if (/填空/.test(readTypeText)) subType = 2;
        else if (/判断/.test(readTypeText)) subType = 3;
        else if (/简答|问答|论述/.test(readTypeText)) subType = 4;

        if (subType === undefined) {
            logger('子题 ' + (subIndex + 1) + ' 题型未知，跳过', 'red');
            setTimeout(function () { processSubQuestions(subIndex + 1, $subQuestions, parentQuestion, getDelay, onComplete); }, delay);
            return;
        }

        var $options = $subQ.find('.answerBg .answer_p');
        if ($options.length === 0) $options = $subQ.find('.stem_answer .answer_p');
        var options = [];
        $options.each(function () { options.push(Core.normalizeOptionText($(this).html())); });

        // 已作答检测
        if (subType === 0 || subType === 1 || subType === 3) {
            var answered = false;
            for (var i = 0; i < $options.length; i++) {
                var cls = $($options[i]).parent().find('span').attr('class') || '';
                if (cls.indexOf('check_answer') !== -1) { answered = true; break; }
            }
            if (answered && !getSettingBool('redo', !!CONFIG.redo)) {
                logger('子题 ' + (subIndex + 1) + ' 已作答，跳过', 'green');
                setTimeout(function () { processSubQuestions(subIndex + 1, $subQuestions, parentQuestion, getDelay, onComplete); }, 30);
                return;
            }
        }

        var prompt = Core.PromptBuilder.build({ type: subType, typeName: readTypeText || '子题', question: fullQuestion, options: subType === 0 || subType === 1 ? options : [] });

        getAnswer(subType, prompt).then(function (answer) {
            var success = false;
            if (subType === 0) {
                var r = Core.matchSingle(answer, options, 0.45);
                if (r.index !== -1) { try { $($options[r.index]).parent().click(); } catch (e) {} success = true; }
            } else if (subType === 1) {
                var idxs = Core.matchMulti(answer, options, 0.45);
                for (var k = 0; k < idxs.length; k++) {
                    var cls2 = $($options[idxs[k]]).parent().find('span').attr('class') || '';
                    if (cls2.indexOf('check_answer_dx') === -1) { try { $($options[idxs[k]]).parent().click(); } catch (e) {} }
                }
                success = idxs.length > 0;
            } else if (subType === 3) {
                var jr = Core.matchJudge(answer);
                var oi = jr.isTrue !== null ? Core.findJudgeOptionIndex(options, jr.isTrue) : -1;
                if (oi !== -1) { try { $($options[oi]).parent().click(); } catch (e) {} success = true; }
            } else if (subType === 2 || subType === 4) {
                var $tas = $subQ.find('textarea, .subEditor textarea, .divText textarea, textarea[name^="answerEditor"]');
                if ($tas.length > 0) {
                    var parts = subType === 2 ? Core.splitFillAnswers(answer) : [answer];
                    $tas.each(function (i) {
                        var val = parts[i] !== undefined ? parts[i] : (parts[0] || answer);
                        var $ta = $(this);
                        $ta.val(val).trigger('input').trigger('change');
                        var id = $ta.attr('id') || $ta.attr('name');
                        setTimeout(function () {
                            try { if (id && UE && UE.getEditor(id)) UE.getEditor(id).setContent(val); } catch (e) {}
                        }, 300 + i * 200);
                    });
                    success = true;
                }
            }
            logger('子题 ' + (subIndex + 1) + (success ? ' 答题成功' : ' 匹配失败'), success ? 'green' : 'red');
            setTimeout(function () { processSubQuestions(subIndex + 1, $subQuestions, parentQuestion, getDelay, onComplete); }, delay);
        }).catch(function () {
            setTimeout(function () { processSubQuestions(subIndex + 1, $subQuestions, parentQuestion, getDelay, onComplete); }, delay);
        });
    }

    /* =========================== 反检测 =========================== */
    var AntiDetect = {
        _started: false,
        setup: function () {
            if (!getSettingBool('antiDetect', !!CONFIG.antiDetect)) return;
            if (this._started) return;
            this._started = true;
            try {
                // 1. 废除 window.onblur
                Object.defineProperty(_w, 'onblur', { get: function () { return function () {}; }, set: function () {} });
                // 2. 覆盖 document.hasFocus
                _d.hasFocus = function () { return true; };
                // 3. 劫持 visibilityState / hidden
                try { Object.defineProperty(_d, 'visibilityState', { get: function () { return 'visible'; }, configurable: true }); } catch (e) {}
                try { Object.defineProperty(_d, 'hidden', { get: function () { return false; }, configurable: true }); } catch (e) {}
            } catch (e) { /* ignore */ }

            // 4. confirm 恒 true，拦截 alert("保存成功")
            try {
                _w.confirm = function () { return true; };
                var oldAlert = _w.alert;
                _w.alert = function (msg) { if (msg === '保存成功' || (msg && msg.indexOf('确认提交') !== -1)) return; return oldAlert(msg); };
            } catch (e) { /* ignore */ }

            // 5. 中和图片查看器弹窗（常用于反挂机）
            try {
                if (_w.jQuery && _w.jQuery.fn && _w.jQuery.fn.viewer && _w.jQuery.fn.viewer.Constructor) {
                    _w.jQuery.fn.viewer.Constructor.prototype.show = function () {};
                }
            } catch (e) { /* ignore */ }

            // 6. 拦截检测 JS（detect.chaoxing.com）
            try {
                var origAppend = Element.prototype.appendChild;
                Element.prototype.appendChild = function (node) {
                    try {
                        if (node && node.src && String(node.src).indexOf('detect.chaoxing.com') !== -1) {
                            console.log('[XiaoAi] 已拦截检测脚本:', node.src);
                            return node;
                        }
                    } catch (e) { /* ignore */ }
                    return origAppend.call(this, node);
                };
            } catch (e) { /* ignore */ }

            this.setupAntiSleep();
        },

        setupAntiSleep: function () {
            var AC = _w.AudioContext || _w.webkitAudioContext;
            if (!AC) return;
            var started = false;
            function tryStart() {
                if (started) return;
                try {
                    var ac = new AC();
                    var osc = ac.createOscillator();
                    var gain = ac.createGain();
                    gain.gain.value = 0;
                    osc.connect(gain); gain.connect(ac.destination);
                    osc.start();
                    started = true;
                    _d.addEventListener('visibilitychange', function () {
                        try { if (ac.state === 'suspended') ac.resume(); } catch (e) {}
                    });
                } catch (e) { /* ignore */ }
            }
            tryStart();
            if (!started) {
                var onGesture = function () {
                    tryStart();
                    if (started) {
                        _d.removeEventListener('click', onGesture, true);
                        _d.removeEventListener('keydown', onGesture, true);
                        _d.removeEventListener('touchstart', onGesture, true);
                    }
                };
                _d.addEventListener('click', onGesture, true);
                _d.addEventListener('keydown', onGesture, true);
                _d.addEventListener('touchstart', onGesture, true);
            }
        }
    };

    /* =========================== 字体解密 =========================== */
    var FontDecryptor = {
        _table: null,
        decrypt: function (doc) {
            if (!getSettingBool('decrypt', !!CONFIG.decrypt)) return;
            if (!Typr || !Core.md5) return;
            doc = doc || _d;
            var $tip;
            try { $tip = $(doc).find('style:contains(font-cxsecret)'); } catch (e) { return; }
            if (!$tip.length) return;
            var m = $tip.text().match(/base64,([\w\W]+?)'/);
            if (!m) return;
            var table = this._getTable();
            if (!table) return;
            var font;
            try {
                font = Typr.parse(this._base64ToUint8Array(m[1]))[0];
            } catch (e) { logger('字体解密失败', 'red'); return; }

            var match = {};
            for (var i = 19968; i < 40870; i++) {
                var glyph;
                try {
                    glyph = Typr.U.codeToGlyph(font, i);
                    if (!glyph) continue;
                    var path = Typr.U.glyphToPath(font, glyph);
                    var hash = Core.md5(JSON.stringify(path)).slice(24);
                    if (table[hash] !== undefined) match[i] = table[hash];
                } catch (e) { /* ignore */ }
            }
            if (Object.keys(match).length === 0) { logger('字体解密：无匹配字符', 'orange'); return; }

            $(doc).find('.font-cxsecret').html(function (idx, html) {
                for (var key in match) {
                    if (match.hasOwnProperty(key)) {
                        html = html.split(String.fromCharCode(key)).join(String.fromCharCode(match[key]));
                    }
                }
                return html;
            }).removeClass('font-cxsecret');
            logger('字体解密完成（' + Object.keys(match).length + ' 字符）', 'green');
        },

        _getTable: function () {
            if (this._table) return this._table;
            try {
                // 优先 @resource，其次远程
                if (typeof GM_getResourceText === 'function') {
                    var txt = GM_getResourceText('fontTable');
                    if (txt) { this._table = JSON.parse(txt); return this._table; }
                }
            } catch (e) { /* ignore */ }
            return null;
        },

        // 尝试远程加载映射表（异步）
        loadTableRemote: function () {
            var self = this;
            var urls = [
                'https://cdn.ocsjs.com/resources/font/table.json',
                'https://www.forestpolice.org/ttf/2.0/table.json',
                'https://cs.dkjdda.top/table.json'
            ];
            var idx = 0;
            function next() {
                if (idx >= urls.length || self._table) return;
                var url = urls[idx++];
                try {
                    GM_xmlhttpRequest({
                        method: 'GET', url: url, timeout: 15000,
                        onload: function (xhr) {
                            if (xhr.status === 200) {
                                try { self._table = JSON.parse(xhr.responseText); logger('字体映射表加载成功', 'green'); }
                                catch (e) { next(); }
                            } else { next(); }
                        },
                        onerror: next, ontimeout: next
                    });
                } catch (e) { next(); }
            }
            next();
        },

        _base64ToUint8Array: function (base64) {
            var data = window.atob(base64);
            var buffer = new Uint8Array(data.length);
            for (var i = 0; i < data.length; ++i) buffer[i] = data.charCodeAt(i);
            return buffer;
        }
    };

    /* =========================== 视频/音频处理器 =========================== */
    var MediaHandler = {
        // 强锁倍速
        hookRate: function (media, rate) {
            try { media.playbackRate = rate; } catch (e) {}
            try {
                Object.defineProperty(media, 'playbackRate', {
                    configurable: true,
                    get: function () { return rate; },
                    set: function () {}
                });
            } catch (e) {
                try {
                    media.addEventListener('ratechange', function () {
                        if (media.playbackRate !== rate) { try { media.playbackRate = rate; } catch (__) {} }
                    });
                } catch (__) {}
            }
        },

        isRateDisabled: function (doc) {
            try {
                return doc.querySelectorAll('.vjs-playback-rate .vjs-menu-content .vjs-menu-item').length === 0;
            } catch (e) { return false; }
        },

        getRate: function () {
            var n = parseFloat(getSetting('rate', CONFIG.rate));
            if (!isFinite(n) || n <= 0) n = 1;
            if (n > 16) n = 16;
            return n;
        },

        playMedia: function (playFn) {
            var self = this;
            return new Promise(function (resolve) {
                function tryPlay() {
                    return new Promise(function (res, rej) {
                        try {
                            var pr = playFn();
                            if (pr && pr.then) pr.then(res).catch(rej);
                            else res();
                        } catch (e) { rej(e); }
                    });
                }
                tryPlay().then(function () { resolve(true); }).catch(function (err) {
                    if (String(err).indexOf("didn't interact with the document") !== -1) {
                        var content = '播放音视频失败，请先点击一次页面任意位置以便脚本获得播放权限。';
                        if (Swal && Swal.fire) {
                            Swal.fire({ title: '提示', text: content, icon: 'warning', confirmButtonText: '确定' }).then(function () {
                                tryPlay().then(function () { resolve(true); }).catch(function () { resolve(false); });
                            });
                        } else { tryPlay().then(function () { resolve(true); }).catch(function () { resolve(false); }); }
                    } else {
                        resolve(false);
                    }
                });
            });
        },

        // 在 iframe 集合中搜索 video/audio
        searchMedia: function (iframes) {
            for (var fi = 0; fi < iframes.length; fi++) {
                var frame = iframes[fi];
                var frameDoc;
                try { frameDoc = frame.contentDocument || frame.contentWindow.document; } catch (e) { continue; }
                if (!frameDoc) continue;
                var m = frameDoc.querySelector('video') || frameDoc.querySelector('audio');
                if (m) return { media: m, doc: frameDoc };
                try {
                    var nested = frameDoc.querySelectorAll('iframe');
                    for (var ni = 0; ni < nested.length; ni++) {
                        var nDoc;
                        try { nDoc = nested[ni].contentDocument || nested[ni].contentWindow.document; } catch (e) { continue; }
                        if (!nDoc) continue;
                        m = nDoc.querySelector('video') || nDoc.querySelector('audio');
                        if (m) return { media: m, doc: nDoc };
                    }
                } catch (e) { /* ignore */ }
            }
            return null;
        },

        // 处理视频/音频任务；返回 Promise，完成时 resolve
        handle: function (dom, obj, isAudio) {
            var self = this;
            var label = isAudio ? '音频' : '视频';
            var name = (obj.property && (obj.property.name || obj.property.title)) || '未命名';
            if (obj.isPassed === true && !getSettingBool('review', !!CONFIG.review)) {
                logger(label + '已完成：' + name, 'green');
                return Promise.resolve();
            }
            var isPaused = function () { return getSettingBool('isPaused', false); };

            return new Promise(function (resolve) {
                var executed = false;
                var parseStart = Date.now();
                // 连续解析超时刷新计数（防止页面结构异常导致无限整页刷新）
                var reloadKey = 'xiaoai_reload_' + name;
                var reloadCount = parseInt(Storage.get(reloadKey, '0'), 10) || 0;
                var intervalId = setInterval(function () {
                    if (isPaused()) return;
                    if (!executed && Date.now() - parseStart > 60000) {
                        clearInterval(intervalId);
                        if (reloadCount < 3) {
                            Storage.set(reloadKey, String(reloadCount + 1));
                            logger(label + '解析超时，刷新重试(' + (reloadCount + 1) + '/3)：' + name, 'red');
                            setTimeout(function () { try { location.reload(); } catch (e) {} }, 2000);
                        } else {
                            Storage.set(reloadKey, '0');
                            logger(label + '连续刷新 3 次仍无法加载，跳过：' + name, 'red');
                            resolve(false);
                        }
                        return;
                    }
                    var result = dom && dom.length ? self.searchMedia(dom) : null;
                    if (!result) {
                        try {
                            result = self.searchMedia(_d.querySelectorAll('.ans-attach-ct iframe'));
                        } catch (e) { /* ignore */ }
                    }
                    if (result && !executed) {
                        executed = true;
                        clearInterval(intervalId);
                        self._drive(result.media, result.doc, name, label).then(resolve);
                    }
                }, 2500);
            });
        },

        _drive: function (media, doc, name, label) {
            var self = this;
            var rate = this.getRate();
            var isAudio = label === '音频';
            var rateDisabled = !isAudio && this.isRateDisabled(doc);
            var finalRate = rateDisabled ? 1 : rate;
            logger('处理' + label + '：' + name + (finalRate > 1 ? '（' + finalRate + '×）' : ''), 'purple');

            return new Promise(function (resolve) {
                var reloadInterval = setInterval(function () {
                    try {
                        var errDiv = doc.querySelector('.vjs-modal-dialog-content');
                        if (errDiv && /视频文件损坏|网络错误导致视频下载中途失败|视频因格式不支持|网络的问题无法加载/.test(errDiv.innerText || errDiv.textContent || '')) {
                            logger(label + '加载失败，跳过', 'red');
                            clearInterval(reloadInterval);
                            if (quizInterval) clearInterval(quizInterval);
                            setTimeout(resolve, 2000);
                        }
                    } catch (e) { /* ignore */ }
                }, 3000);

                // 视频弹题
                var quizInterval = !isAudio ? setInterval(function () {
                    VideoQuizHandler.handle(doc, media, name);
                }, 1500) : null;

                var resolved = false;
                var doResolve = function (reason) {
                    if (resolved) return;
                    resolved = true;
                    logger(label + (reason ? ('：' + reason) : ' 播放完成') + '：' + name, 'green');
                    try { media.removeEventListener('pause', onPause); } catch (e) {}
                    clearInterval(reloadInterval);
                    if (quizInterval) clearInterval(quizInterval);
                    clearTimeout(playTimeout);
                    resolve();
                };

                var onPause = function () {
                    if (isPausedGlobal()) return;
                    // 视频弹题处理中主动暂停时，不自动续播，避免冲突
                    if (_videoQuizActive) return;
                    try {
                        if (media.paused && !media.ended) {
                            media.muted = true;
                            self.playMedia(function () { return media.play(); }).then(function () { self.hookRate(media, finalRate); });
                        }
                    } catch (e) { /* ignore */ }
                };
                media.addEventListener('pause', onPause);

                // 临近结尾恢复 1×
                var rateRestored = finalRate <= 1;
                var onTime = function () {
                    if (!rateRestored && isFinite(media.duration) && media.duration - media.currentTime < 10) {
                        rateRestored = true;
                        try { delete media.playbackRate; } catch (e) {}
                        self.hookRate(media, 1);
                        media.removeEventListener('timeupdate', onTime);
                    }
                };
                if (!rateRestored) media.addEventListener('timeupdate', onTime);

                media.addEventListener('ended', function () { doResolve('播放完成'); });

                // 兜底超时
                var playTimeout = setTimeout(function () { doResolve('播放超时(10分钟)'); }, 10 * 60 * 1000);

                // 初始播放
                media.muted = true;
                try { media.currentTime = 0; } catch (e) {}
                setTimeout(function () {
                    self.playMedia(function () { return media.play(); }).then(function () {
                        self.hookRate(media, finalRate);
                    });
                }, 200);
            });

            function isPausedGlobal() { return getSettingBool('isPaused', false); }
        }
    };

    /* =========================== 视频弹题处理器（排除法重试） =========================== */
    var VideoQuizHandler = {
        handle: function (doc, media, taskName) {
            if (!getSettingBool('work', !!CONFIG.work)) return;
            if (getSettingBool('isPaused', false)) return;
            var container = doc.querySelector('.ans-videoquiz');
            var submitBtn = doc.querySelector('#videoquiz-submit');
            if (!container || !submitBtn) return;

            var txt = container.innerText || container.textContent || '';
            if (txt.indexOf('恭喜你，答对了！') !== -1 || txt.indexOf('继续学习') !== -1) {
                // 已答对，点继续学习并清理
                var btn = Array.prototype.slice.call(container.querySelectorAll('a,button,span,div')).find(function (el) {
                    var t = el.innerText || el.textContent || '';
                    return (t.trim() === '继续学习') || (t.indexOf('继续') !== -1);
                });
                if (btn) { try { btn.click(); } catch (e) {} }
                setTimeout(function () {
                    try { if (container.parentNode) container.parentNode.removeChild(container); } catch (e) {}
                    _videoQuizActive = false;
                    if (media && media.paused) { try { media.play(); } catch (e) {} }
                }, 800);
                return;
            }
            // AI 失败冷却：30 秒内不重复打 AI，避免 1.5s 轮询无限刷接口
            var cool = parseInt(container.getAttribute('data-xiaoai-cool') || '0', 10);
            if (Date.now() < cool) return;

            if (container.getAttribute('data-xiaoai-status') === 'processing') return;

            var optionNodes = Array.prototype.slice.call(container.querySelectorAll('.ans-videoquiz-opt label'));
            if (optionNodes.length === 0) optionNodes = Array.prototype.slice.call(container.querySelectorAll('label'));
            if (optionNodes.length === 0) return;
            container.setAttribute('data-xiaoai-status', 'processing');
            _videoQuizActive = true;
            try { media.pause(); } catch (e) {}

            var optionTexts = optionNodes.map(function (l) { return (l.innerText || l.textContent || '').trim(); });
            var inputTypes = optionNodes.map(function (l) {
                var inp = l.querySelector('input'); return inp ? String(inp.type || '').toLowerCase() : '';
            });
            var isMultiple = inputTypes.indexOf('checkbox') !== -1;
            var isJudge = !isMultiple && optionTexts.length === 2 && optionTexts.some(function (t) { return /正确|错误|对|错|是|否|true|false/i.test(t); });

            // 固化题干 key：首次检测时缓存到容器，避免失败后容器文本变化导致 key 失配
            var question = container.getAttribute('data-xiaoai-q') ||
                (VideoQuizHandler._getQuestionText(container, optionNodes) || '视频弹题');
            container.setAttribute('data-xiaoai-q', question);

            var typeName = isMultiple ? '多选题' : (isJudge ? '判断题' : '单选题');
            var type = isMultiple ? 1 : (isJudge ? 3 : 0);

            // 失败重试记录
            _w._xiaoaiFailedQuizzes = _w._xiaoaiFailedQuizzes || {};
            var rec = _w._xiaoaiFailedQuizzes[question];
            if (!rec) rec = _w._xiaoaiFailedQuizzes[question] = { tried: [], failCount: 0 };
            if (rec.lastTried) { rec.tried = rec.tried.concat(rec.lastTried).filter(function (v, i, a) { return a.indexOf(v) === i; }); rec.lastTried = []; }
            if (rec.tried.length >= optionTexts.length) rec.tried = [];

            var MAX_EXCLUSION = optionTexts.length + 2; // 排除法尝试上限，防无限循环

            // 结束处理：恢复播放并清理状态
            function finishQuiz() {
                _videoQuizActive = false;
                container.removeAttribute('data-xiaoai-status');
                if (media && media.paused) { try { media.play(); } catch (e) {} }
            }

            // 失败冷却（AI 失败/匹配失败/排除法耗尽）
            function cooldown(ms) {
                container.setAttribute('data-xiaoai-cool', String(Date.now() + ms));
                finishQuiz();
            }

            function doSubmit(indexes) {
                rec.lastTried = indexes;
                indexes.forEach(function (idx) {
                    var label = optionNodes[idx];
                    if (!label) return;
                    label.style.fontWeight = 'bold';
                    label.style.color = '#dc2626';
                    setTimeout(function () { try { label.click(); } catch (e) {} }, 100);
                });
                setTimeout(function () {
                    try { submitBtn.click(); } catch (e) {}
                    setTimeout(function () {
                        try {
                            var q = doc.querySelector('#video .ans-videoquiz, .ans-videoquiz');
                            if (q) {
                                var t2 = q.innerText || q.textContent || '';
                                if (t2.indexOf('恭喜你，答对了！') !== -1 || t2.indexOf('继续学习') !== -1) {
                                    var b2 = Array.prototype.slice.call(q.querySelectorAll('a,button,span,div')).find(function (el) {
                                        var t = el.innerText || el.textContent || '';
                                        return (t.trim() === '继续学习') || (t.indexOf('继续') !== -1);
                                    });
                                    if (b2) { try { b2.click(); } catch (e) {} }
                                    setTimeout(function () {
                                        try { if (q.parentNode) q.parentNode.removeChild(q); } catch (e) {}
                                        delete _w._xiaoaiFailedQuizzes[question]; // 答对清除记录
                                        finishQuiz();
                                    }, 800);
                                } else {
                                    // 答错了：清状态，下个周期用排除法重试
                                    q.removeAttribute('data-xiaoai-status');
                                    container.removeAttribute('data-xiaoai-status');
                                    _videoQuizActive = false;
                                    if (media && media.paused) { try { media.play(); } catch (e) {} }
                                }
                            } else {
                                finishQuiz();
                            }
                        } catch (e) { /* ignore */ }
                    }, 1500);
                }, 600);
            }

            // 单选/判断：排除法重试（有上限）；多选无法用排除法，直接走 AI
            var canExclude = !isMultiple;
            if (rec.tried.length >= MAX_EXCLUSION) {
                logger('视频弹题排除法已达上限，跳过（请手动处理）', 'red');
                cooldown(60000);
                return;
            }
            if (canExclude && rec.tried.length > 0) {
                var remaining = [];
                optionTexts.forEach(function (_, idx) { if (rec.tried.indexOf(idx) === -1) remaining.push(idx); });
                if (remaining.length > 0) {
                    logger('视频弹题排除法尝试: ' + optionTexts[remaining[0]], 'orange');
                    doSubmit([remaining[0]]);
                    return;
                }
            }

            // 走 AI
            logger('检测到视频弹题：' + question, 'purple');
            var prompt = Core.PromptBuilder.build({ type: type, typeName: typeName, question: question, options: optionTexts });
            getAnswer(type, prompt).then(function (answer) {
                var indexes = [];
                if (isJudge) {
                    var jr = Core.matchJudge(answer);
                    if (jr.isTrue !== null) {
                        optionTexts.forEach(function (t, i) {
                            if (jr.isTrue && /正确|对|是|√|true/i.test(Core.normalizeOptionText(t))) indexes.push(i);
                            if (!jr.isTrue && /错误|错|否|×|false/i.test(Core.normalizeOptionText(t))) indexes.push(i);
                        });
                    }
                }
                if (indexes.length === 0) {
                    indexes = isMultiple ? Core.matchMulti(answer, optionTexts, 0.4) : [Core.matchSingle(answer, optionTexts, 0.4).index].filter(function (x) { return x >= 0; });
                }
                if (indexes.length === 0) {
                    logger('视频弹题匹配失败，30 秒后重试', 'red');
                    cooldown(30000);
                    return;
                }
                doSubmit(indexes);
            }).catch(function () {
                logger('视频弹题 AI 请求失败，30 秒后重试', 'red');
                cooldown(30000);
            });
        },

        _getQuestionText: function (container, optionNodes) {
            var clone = container.cloneNode(true);
            try {
                Array.prototype.forEach.call(clone.querySelectorAll('.ans-videoquiz-opt,#videoquiz-submit,button,input,label'), function (n) {
                    if (n.parentNode) n.parentNode.removeChild(n);
                });
            } catch (e) { /* ignore */ }
            var text = (clone.innerText || clone.textContent || '').trim();
            optionNodes.forEach(function (l) {
                var t = (l.innerText || l.textContent || '').trim();
                if (t) text = text.replace(t, '');
            });
            return text.replace(/\s+/g, ' ').trim();
        }
    };

    /* =========================== 文档/阅读/读书/速课 任务 =========================== */
    function reportJob(apiPath, obj, defaults, label) {
        return new Promise(function (resolve) {
            var jobId = obj.property ? obj.property.jobid : null;
            var name = (obj.property && (obj.property.name || obj.property.title || obj.property.bookname)) || '未命名';
            if (obj.job === undefined) {
                logger(label + '已完成：' + name, 'green');
                return resolve(true);
            }
            if (!jobId) { logger(label + '缺少 jobid，跳过', 'red'); return resolve(false); }
            $.ajax({
                url: _l.protocol + '//' + _l.host + apiPath + 'jobid=' + jobId +
                    '&knowledgeid=' + defaults.knowledgeid + '&courseid=' + defaults.courseid +
                    '&clazzid=' + defaults.clazzId + '&jtoken=' + (obj.jtoken || '') + '&_dc=' + Date.now(),
                method: 'GET',
                success: function (res) {
                    logger(label + '：' + name + (res && res.status ? '处理成功' : '处理异常'), res && res.status ? 'green' : 'red');
                    resolve(!!(res && res.status));
                },
                error: function () { logger(label + '网络失败：' + name, 'red'); resolve(false); }
            });
        });
    }

    function handleDocument(obj, defaults) { return reportJob('/ananas/job/document?', obj, defaults, '文档'); }
    function handleRead(obj, defaults) { return reportJob('/ananas/job/readv2?', obj, defaults, '阅读'); }
    function handleBook(obj, defaults) { return reportJob('/ananas/job?', obj, defaults, '读书'); }

    // 速课
    function handleMicroCourse(obj, defaults) {
        return new Promise(function (resolve) {
            var prop = obj.property || {};
            var name = prop.title || prop.name || '未命名';
            var jobId = obj.jobid;
            var cb = 'jQuery' + Math.floor(Math.random() * 1e15) + '_' + Date.now();
            $.ajax({
                url: _l.protocol + '//' + _l.host + '/ananas/job/microCourse?jobid=' + jobId +
                    '&knowledgeid=' + defaults.knowledgeid + '&courseid=' + defaults.courseid +
                    '&clazzid=' + defaults.clazzId + '&jtoken=' + (obj.jtoken || '') +
                    '&checkMicroTopic=true&microTopicId=undefined&jsoncallback=' + cb + '&_=' + Date.now(),
                method: 'GET', dataType: 'text',
                success: function (raw) {
                    var ok = String(raw).indexOf('添加考核点成功') !== -1;
                    logger('速课：' + name + (ok ? '完成' : '响应异常'), ok ? 'green' : 'orange');
                    resolve(ok);
                },
                error: function () { logger('速课网络失败：' + name, 'red'); resolve(false); }
            });
        });
    }

    // 直播
    function handleLive(obj, defaults) {
        return new Promise(function (resolve) {
            var prop = obj.property || {};
            var name = prop.title || prop.name || '未命名';
            var liveId = prop.liveId;
            var userId = getCk('_uid') || getCk('UID');
            if (!liveId || !userId) { logger('直播缺少参数：' + name, 'red'); return resolve(false); }
            var jobId = obj.jobid;
            var rt = prop.rt ? parseFloat(prop.rt) : 0.9;
            $.ajax({
                url: _l.protocol + '//' + _l.host + '/ananas/live/liveinfo?liveid=' + liveId +
                    '&userid=' + userId + '&clazzid=' + defaults.clazzId + '&knowledgeid=' + defaults.knowledgeid +
                    '&courseid=' + defaults.courseid + '&jobid=' + jobId + '&ut=s',
                method: 'GET', dataType: 'text',
                success: function (raw) {
                    var info;
                    try { info = JSON.parse(raw); } catch (e) { info = null; }
                    if (!info || !info.temp || !info.temp.data) {
                        logger('获取直播信息失败：' + name, 'red');
                        return resolve(false);
                    }
                    var data = info.temp.data;
                    var duration = data.duration || 0;
                    var timeLongValue = (data.timeLongValue || 0) * 60;
                    if (timeLongValue >= duration) {
                        logger('直播时长已达标：' + name, 'green');
                        return resolve(true);
                    }
                    var streamName = prop.streamName, vdoid = prop.vdoid;
                    var courseId = defaults.courseid;
                    var playTime = timeLongValue, isStart = '0';
                    function reportOnce() {
                        var url = _l.protocol + '//zhibo.chaoxing.com/saveTimePc?streamName=' + streamName +
                            '&vdoid=' + vdoid + '&userId=' + userId + '&isStart=' + isStart +
                            '&t=' + Date.now() + '&courseId=' + courseId;
                        $.ajax({
                            url: url, method: 'GET', dataType: 'text', xhrFields: { withCredentials: true },
                            complete: function () {
                                isStart = '1';
                                playTime += 30;
                                if (playTime >= duration) {
                                    logger('直播回放完成：' + name, 'green');
                                    resolve(true);
                                    return;
                                }
                                setTimeout(reportOnce, 30000);
                            }
                        });
                    }
                    reportOnce();
                },
                error: function () { logger('获取直播信息网络失败：' + name, 'red'); resolve(false); }
            });
        });
    }

    // 知识图谱（点击展开）
    function handleKnowledgeGraph(obj) {
        return new Promise(function (resolve) {
            var name = (obj.property && obj.property.name) || '知识图谱';
            if (obj.job === undefined) { logger('知识图谱已完成：' + name, 'green'); return resolve(true); }
            var clicked = false;
            try {
                var iframes = _d.querySelectorAll('iframe');
                for (var i = 0; i < iframes.length; i++) {
                    try {
                        var iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                        if (!iframeDoc) continue;
                        var packBtn = iframeDoc.querySelector('#graphPackBtn');
                        if (packBtn) {
                            if (!packBtn.classList.contains('active')) { try { packBtn.click(); } catch (e) {} }
                            clicked = true;
                            break;
                        }
                    } catch (e) { /* ignore */ }
                }
            } catch (e) { /* ignore */ }
            if (!clicked) logger('知识图谱未找到展开按钮：' + name, 'orange');
            setTimeout(function () { resolve(clicked); }, 3000);
        });
    }

    /* =========================== 路由 =========================== */
    var Router = {
        _mlist: [], _defaults: null, _domList: [],

        route: function () {
            Logger.init();
            Report.init();
            UIManager.init();

            if (getSettingBool('decrypt', !!CONFIG.decrypt)) {
                FontDecryptor.decrypt();
                FontDecryptor.loadTableRemote();
            }

            // 新版导航
            try {
                $('.navshow').find('a:contains(体验新版)')[0] ? $('.navshow').find('a:contains(体验新版)')[0].click() : '';
            } catch (e) { /* ignore */ }

            var host = _l.hostname;
            var path = _l.pathname;
            Report.setRoute(host + path);
            logStep('路由', host + path + (Logger.isDebug() ? ' (调试模式已开启)' : ''), 'purple');

            if (path === '/login' && getSettingBool('autoLogin', !!CONFIG.autoLogin)) {
                Router._waitFor('#phone', function () { Router._autoLogin(); });
            } else if (path.indexOf('/mycourse/studentstudy') !== -1) {
                $('#ne-21log', window.parent.document).html('');
                AntiDetect.setup();
                Router._setupAutoRefresh();
                Router._setupNoTaskDetector();
                logStep('路由', '学生学习页，开始自动刷课', 'green');
            } else if (path.indexOf('/knowledge/cards') !== -1) {
                AntiDetect.setup();
                Router._handleKnowledgeCards();
                logStep('路由', '章节任务页，开始处理任务点', 'green');
            } else if (path.indexOf('/exam/test/reVersionTestStartNew') !== -1) {
                Router._waitFor('.mark_table .whiteDiv', function () { Router._handleExam(); });
                logStep('路由', '考试逐题页', 'green');
            } else if (path.indexOf('/mooc2/exam/preview') !== -1) {
                Router._waitFor('.mark_table .questionLi', function () { Router._handleExamPreview(); });
                logStep('路由', '考试整卷预览页', 'green');
            } else if (path.indexOf('/mooc2/work/dowork') !== -1) {
                Router._waitFor('.mark_table form', function () { Router._handleHomework(); });
                logStep('路由', '作业页', 'green');
            } else if (path.indexOf('/work/phone/doHomeWork') !== -1) {
                Router._patchPhoneAlerts();
            } else {
                logStep('路由', '未匹配到处理场景，脚本处于就绪状态', 'gray');
            }
        },

        _waitFor: function (selector, callback) {
            var interval = setInterval(function () {
                if ($(selector).length > 0) { clearInterval(interval); callback(); }
            }, 500);
        },

        _patchPhoneAlerts: function () {
            try {
                var oldAlert = _w.alert;
                _w.alert = function (msg) { if (msg === '保存成功') return; return oldAlert(msg); };
                var oldConfirm = _w.confirm;
                _w.confirm = function (msg) {
                    if (msg && (msg.indexOf('确认提交') !== -1 || msg.indexOf('未做完') !== -1)) return true;
                    return oldConfirm(msg);
                };
            } catch (e) { /* ignore */ }
        },

        _autoLogin: function () {
            var phone = getSetting('phone', '');
            var password = getSetting('password', '');
            if (!phone || !password) return;
            setTimeout(function () {
                try {
                    $('#phone').val(phone);
                    $('#pwd').val(password);
                    $('#loginBtn').click();
                } catch (e) { /* ignore */ }
            }, 3000);
        },

        /* ====== 章节任务页 ====== */
        _handleKnowledgeCards: function () {
            var params = this._getTaskParams();
            var parsed = null;
            if (params && params !== '$mArg') {
                try { parsed = $.parseJSON(params); } catch (e) {}
            }
            if (!parsed || !parsed.attachments || parsed.attachments.length === 0) {
                logger('无任务点，即将跳转', 'red');
                return Router._toNext();
            }
            this._mlist = parsed.attachments;
            this._defaults = parsed.defaults;

            this._waitFor('.wrap .ans-cc .ans-attach-ct', function () {
                try { if (top.checkJob) top.checkJob = function () { return false; }; } catch (e) {}
                // 收集 DOM iframe，按 data 属性与 attachments 匹配
                var domNodes = [];
                $.each($('.wrap .ans-cc .ans-attach-ct'), function (i, t) {
                    domNodes.push({ iframe: $(t).find('iframe'), data: $(t).find('iframe').attr('data') || '' });
                });
                Router._domList = [];
                var matched = [];
                var used = {};
                for (var ai = 0; ai < Router._mlist.length; ai++) {
                    var att = Router._mlist[ai];
                    var mid = (att.property && att.property.mid) || '';
                    var oid = (att.property && att.property.objectid) || '';
                    var ok = false;
                    for (var di = 0; di < domNodes.length; di++) {
                        if (used[di]) continue;
                        var ds = domNodes[di].data;
                        if (ds && ((mid && ds.indexOf(mid) !== -1) || (oid && ds.indexOf(oid) !== -1))) {
                            Router._domList.push(domNodes[di].iframe);
                            used[di] = true; ok = true; break;
                        }
                    }
                    matched.push(ok);
                }
                // 兜底：按索引
                if (Router._domList.length === 0 && domNodes.length > 0) {
                    Router._domList = domNodes.map(function (n) { return n.iframe; });
                } else if (Router._domList.length < Router._mlist.length) {
                    for (var i = 0; i < Router._mlist.length; i++) {
                        if (!matched[i] && Router._domList.length < domNodes.length) Router._domList.push(domNodes[Router._domList.length].iframe);
                    }
                }
                Router._missionStart();
            });
        },

        _getTaskParams: function () {
            try {
                var scripts = _d.scripts;
                for (var i = 0; i < scripts.length; i++) {
                    if (scripts[i].innerHTML.indexOf('mArg = "";') !== -1 &&
                        scripts[i].innerHTML.indexOf('==UserScript==') === -1) {
                        return getStr(scripts[i].innerHTML.replace(/\s/g, ''), 'try{mArg=', ';}catch');
                    }
                }
            } catch (e) {}
            return null;
        },

        _missionStart: function () {
            if (getSettingBool('isPaused', false)) { setTimeout(function () { Router._missionStart(); }, 3000); return; }
            if (this._mlist.length <= 0) {
                logger('任务处理完毕，准备跳转', 'green');
                return this._toNext();
            }
            var task = this._mlist[0];
            var dom = this._domList[0];
            var type = task.type || (task.property && task.property.module) || '';
            var defaults = this._defaults;
            var self = this;

            var GARBAGE = ['insertimage', 'insertanswerquestion', 'insertshare', 'insertquestion', 'insertdiscuss', 'insertsubject'];

            function next() {
                self._mlist.splice(0, 1);
                self._domList.splice(0, 1);
                setTimeout(function () { self._missionStart(); }, 3000);
            }

            if (type.indexOf('video') !== -1 || type === 'insertvideo') {
                MediaHandler.handle(dom, task, false).then(next);
            } else if (type === 'insertaudio' || type.indexOf('audio') !== -1) {
                MediaHandler.handle(dom, task, true).then(next);
            } else if (type === 'workid' || type.indexOf('work') !== -1) {
                if (!getSettingBool('work', !!CONFIG.work)) { logger('用户设置不处理测验', 'red'); return next(); }
                this._handleQuizInCard(dom, task).then(next);
            } else if (type === 'document') {
                handleDocument(task, defaults).then(next);
            } else if (type === 'read') {
                handleRead(task, defaults).then(next);
            } else if (type === 'insertbook') {
                handleBook(task, defaults).then(next);
            } else if (type === 'live') {
                handleLive(task, defaults).then(next);
            } else if (type === 'microCourse' || type === 'insertmicroCourse') {
                handleMicroCourse(task, defaults).then(next);
            } else if (type === 'knowledgeGraph') {
                handleKnowledgeGraph(task).then(next);
            } else if (GARBAGE.indexOf(type) !== -1) {
                logger('无需处理任务（' + type + '），跳过', 'red');
                next();
            } else {
                logger('暂不支持任务类型：' + type + '，跳过', 'red');
                next();
            }
        },

        _handleQuizInCard: function (dom, task) {
            return new Promise(function (resolve) {
                var phoneWeb = _l.protocol + '//' + _l.host + '/work/phone/work?workId=' +
                    task.jobid.replace('work-', '') + '&courseId=' + Router._defaults.courseid +
                    '&clazzId=' + Router._defaults.clazzId + '&knowledgeId=' + Router._defaults.knowledgeid +
                    '&jobId=' + task.jobid + '&enc=' + task.enc;
                setTimeout(function () {
                    Router._startQuizWork(0, [dom], phoneWeb, resolve);
                }, 3000);
            });
        },

        _startQuizWork: function (index, doms, phoneWeb, onDone) {
            if (index >= doms.length) {
                logger('测验全部处理完毕', 'green');
                return setTimeout(function () { onDone && onDone(); }, 3000);
            }
            Router._pollForElement(doms[index], 'iframe', 2000, 60).then(function (workIframe) {
                if (!workIframe) {
                    return setTimeout(function () { Router._startQuizWork(index + 1, doms, phoneWeb, onDone); }, 5000);
                }
                var workStatus = $(workIframe).contents().find('.newTestCon .newTestTitle .testTit_status').text().trim();
                if (!workStatus) { return setTimeout(function () { Router._startQuizWork(index + 1, doms, phoneWeb, onDone); }, 3000); }

                var isRedo = getSettingBool('redo', !!CONFIG.redo);
                var shouldProcess = workStatus.indexOf('待做') !== -1 || workStatus.indexOf('待完成') !== -1 ||
                    workStatus.indexOf('重做') !== -1 || workStatus.indexOf('未达到') !== -1;
                if (isRedo && workStatus.indexOf('已完成') !== -1) {
                    $(workIframe).attr('src', phoneWeb);
                    Router._waitForQuizFrame(doms[index], phoneWeb, function ($contents) {
                        Router._doPhoneQuiz($contents, function () { Router._startQuizWork(index + 1, doms, phoneWeb, onDone); });
                    });
                } else if (shouldProcess) {
                    $(workIframe).attr('src', phoneWeb);
                    Router._waitForQuizFrame(doms[index], phoneWeb, function ($contents) {
                        Router._doPhoneQuiz($contents, function () { Router._startQuizWork(index + 1, doms, phoneWeb, onDone); });
                    });
                } else {
                    logger('测验 ' + (index + 1) + ' 状态[' + workStatus + ']，跳过', 'red');
                    setTimeout(function () { Router._startQuizWork(index + 1, doms, phoneWeb, onDone); }, 3000);
                }
            });
        },

        _waitForQuizFrame: function (containerDom, src, callback) {
            var doc = $(containerDom).contents()[0];
            Router._pollForElement($(doc), 'iframe[src="' + src + '"]', 1000, 30).then(function (el) {
                if (el) {
                    setTimeout(function () { callback($(el).contents()); }, 3000);
                }
            });
        },

        _doPhoneQuiz: function ($contents, onDone) {
            var $form = $contents.find('.Wrappadding form');
            var $timuList = $form.find('.zquestions .Py-mian1');
            var $subBtn = $form.find('.zquestions .zsubmit .btn-ok-bottom');
            var $saveBtn = $form.find('.zquestions .zsubmit .btn-save');
            var $okBtn = $contents.find('#okBtn');

            QuizEngine.processAll($timuList, PhoneAdapter, {
                alterTitle: getSettingBool('alterTitle', !!CONFIG.alterTitle),
                delayFn: function () { return parseInt(getSetting('time', CONFIG.time), 10) + rand(0, 800); },
                onAllDone: function (answered, total) {
                    // 覆盖率阈值判定
                    var acc = parseInt(getSetting('accuracy', CONFIG.accuracy), 10);
                    var coverage = total > 0 ? Math.round(answered / total * 100) : 0;
                    logger('答题覆盖率: ' + coverage + '%（阈值 ' + acc + '%）', 'blue');
                    var wantSub = getSettingBool('sub', !!CONFIG.sub);
                    var wantForce = getSettingBool('force', !!CONFIG.force);
                    if (coverage >= acc && wantSub) {
                        logger('覆盖率达标，自动提交', 'green');
                        setTimeout(function () {
                            $subBtn.click();
                            setTimeout(function () { $okBtn.click(); }, 3000);
                        }, 3000);
                    } else if (wantForce) {
                        logger('强制提交', 'red');
                        setTimeout(function () {
                            $subBtn.click();
                            setTimeout(function () { $okBtn.click(); }, 3000);
                        }, 3000);
                    } else if (wantSub) {
                        logger('覆盖率未达阈值，自动保存', 'orange');
                        setTimeout(function () { $saveBtn.click(); }, 3000);
                    } else {
                        logger('未开启自动提交，答题完成', 'green');
                        setTimeout(function () { $saveBtn.click(); }, 3000);
                    }
                    setTimeout(onDone, 6000);
                }
            });
        },

        /* ====== 通用：逐题处理（自动识别复合大题） ====== */
        _processQuestionList: function ($timuList, adapter, opts) {
            opts = opts || {};
            var self = this;
            function processOne(i) {
                if (getSettingBool('isPaused', false)) { setTimeout(function () { processOne(i); }, 1000); return; }
                if (i >= $timuList.length) {
                    logger(opts.doneMsg || '全部题目处理完毕', 'green');
                    if (opts.onDone) opts.onDone();
                    return;
                }
                var $timu = $($timuList[i]);
                // 复合大题（阅读理解/完形填空）：材料作背景，逐小题递归
                var $subs = $timu.find('.reading_answer');
                if ($subs.length > 0) {
                    var parentQ = (adapter.getQuestionText && adapter.getQuestionText($timu)) || '';
                    logger('检测到复合大题（含 ' + $subs.length + ' 个子题）', 'blue');
                    processSubQuestions(0, $subs, parentQ, function () { return parseInt(getSetting('time', CONFIG.time), 10) + rand(0, 800); }, function () {
                        processOne(i + 1);
                    });
                    return;
                }
                QuizEngine.processOne(i, $timuList.length, $timu, adapter, {
                    alterTitle: getSettingBool('alterTitle', !!CONFIG.alterTitle)
                }).then(function () {
                    setTimeout(function () { processOne(i + 1); }, parseInt(getSetting('time', CONFIG.time), 10) + rand(0, 800));
                });
            }
            processOne(0);
        },

        /* ====== 作业 ====== */
        _handleHomework: function () {
            logger('开始处理作业', 'green');
            var $form = $('.mark_table form');
            var $timuList = $form.find('.questionLi');
            Router._processQuestionList($timuList, HomeworkAdapter, {
                doneMsg: '作业答题完成，请人工核对后提交',
                onDone: function () {}
            });
        },

        /* ====== 考试逐题 ====== */
        _handleExam: function () {
            var $table = $('.mark_table');
            var $timu = $table.find('.whiteDiv');

            function goNext() {
                if (getSettingBool('examTurn', !!CONFIG.examTurn)) {
                    var delay = getSettingBool('examTurnTime', !!CONFIG.examTurnTime) ? 2000 + rand(3000, 7000) : 2000;
                    setTimeout(function () {
                        try { $('.mark_table .whiteDiv .nextDiv a.jb_btn').click(); } catch (e) {}
                    }, delay);
                } else {
                    logger('用户设置不自动跳转下一题', 'blue');
                }
            }

            // 复合大题（阅读理解/完形填空）：材料作背景，逐小题递归
            var $subs = $timu.find('.reading_answer');
            if ($subs.length > 0) {
                var parentQ = ExamAdapter.getQuestionText($timu) || '';
                logger('检测到复合大题（含 ' + $subs.length + ' 个子题）', 'blue');
                processSubQuestions(0, $subs, parentQ, function () { return parseInt(getSetting('time', CONFIG.time), 10) + rand(0, 800); }, goNext);
                return;
            }

            QuizEngine.processOne(0, 1, $timu, ExamAdapter, {
                alterTitle: getSettingBool('alterTitle', !!CONFIG.alterTitle)
            }).then(goNext);
        },

        /* ====== 整卷预览 ====== */
        _handleExamPreview: function () {
            var $timuList = $('.mark_table .questionLi');
            if (!$timuList.length) { logger('未解析到题目', 'red'); return; }
            logger('共 ' + $timuList.length + ' 道题', 'blue');
            Router._processQuestionList($timuList, ExamPreviewAdapter, {
                doneMsg: '整卷预览答题完成，请人工核对后手动交卷'
            });
        },

        /* ====== 课程导航 ====== */
        _toNext: function () {
            var self = this;
            self._refreshCourseList().then(function (res) {
                // 检测课时内子页面
                function detectSubTabs() {
                    var selectors = ['#prev_tab > li', '.prev_ul > li', '#prevTabBox > li'];
                    for (var s = 0; s < selectors.length; s++) {
                        var nodes = top.document.querySelectorAll(selectors[s]);
                        if (!nodes || !nodes.length) continue;
                        for (var j = 0; j < nodes.length; j++) {
                            if (nodes[j].classList && nodes[j].classList.contains('active')) {
                                return { active: j, total: nodes.length, hasNext: j < nodes.length - 1 };
                            }
                        }
                    }
                    var cur = top.document.querySelector('span.currents');
                    if (cur) {
                        var sib = cur.nextElementSibling;
                        return { active: 0, total: 2, hasNext: sib && sib.tagName === 'SPAN' };
                    }
                    return null;
                }
                function clickNext() {
                    var btn = top.document.querySelector('#mainid > .prev_next.next');
                    if (btn) { try { btn.click(); } catch (e) {} return true; }
                    btn = top.document.querySelector('#prevNextFocusNext');
                    if (btn) { try { btn.click(); } catch (e) {} return true; }
                    return false;
                }

                var sub = detectSubTabs();
                if (sub && sub.hasNext) {
                    logger('课时有未完成页面，跳转', 'blue');
                    setTimeout(clickNext, 4000);
                    return;
                }
                if (getSettingBool('review', !!CONFIG.review) || !getSettingBool('work', !!CONFIG.work)) {
                    setTimeout(clickNext, 4000);
                    return;
                }
                var tasks = [];
                $.each($(res).find('li'), function (_, t) {
                    var curid = $(t).find('.posCatalog_select').attr('id');
                    var status = $(t).find('.prevHoverTips').text();
                    if (curid && curid.indexOf('cur') !== -1) tasks.push({ curid: curid, status: status });
                });
                var curChapterId = $('#coursetree', window.parent.document).find('.posCatalog_active').attr('id');
                var curIdx = -1;
                for (var k = 0; k < tasks.length; k++) if (tasks[k].curid === curChapterId) { curIdx = k; break; }
                if (curIdx < 0) { logger('章节定位失败', 'red'); return; }
                for (curIdx; curIdx < tasks.length - 1; curIdx++) {
                    var nextTask = tasks[curIdx + 1];
                    if (nextTask.status.indexOf('待完成') !== -1) {
                        setTimeout(function () { clickNext(); UIManager.init(); }, 4000);
                        return;
                    } else if (nextTask.status.indexOf('闯关') !== -1) {
                        logger('闯关模式，需手动完成', 'red');
                        return;
                    } else if (nextTask.status.indexOf('开放') !== -1) {
                        logger('章节未开放', 'red');
                        return;
                    }
                }
                logger('此课程处理完毕', 'green');
            });
        },

        _refreshCourseList: function () {
            var p = parseUrlParams();
            return new Promise(function (resolve) {
                $.ajax({
                    url: _l.protocol + '//' + _l.host + '/mycourse/studentstudycourselist?courseId=' +
                        p.courseid + '&chapterId=' + p.knowledgeid + '&clazzid=' + p.clazzid + '&mooc2=1',
                    type: 'GET', dataType: 'html',
                    success: function (res) { resolve(res); }
                });
            });
        },

        _pollForElement: function (iframeDom, selector, interval, maxAttempts) {
            interval = interval || 2000;
            maxAttempts = maxAttempts || 60;
            return new Promise(function (resolve) {
                var attempts = 0;
                function check() {
                    try {
                        var doc = $(iframeDom).contents()[0];
                        if (doc) {
                            var el = doc.querySelector(selector);
                            if (el) return resolve(el);
                        }
                    } catch (e) { /* ignore */ }
                    attempts++;
                    if (attempts >= maxAttempts) return resolve(null);
                    if (attempts % 15 === 0) {
                        logger('框架加载中，已等待' + Math.round(attempts * interval / 1000) + 's', 'orange');
                    }
                    setTimeout(check, interval);
                }
                check();
            });
        },

        _setupAutoRefresh: function () {
            if (!getSettingBool('autoRefresh', !!CONFIG.autoRefresh)) return;
            var minutes = parseInt(getSetting('autoRefreshMinutes', CONFIG.autoRefreshMinutes), 10);
            if (!isFinite(minutes) || minutes < 5) minutes = 30;
            setTimeout(function () {
                logger('自动刷新倒计时 ' + minutes + 'min', 'orange');
                setTimeout(function () { try { location.reload(); } catch (e) {} }, 3000);
            }, minutes * 60 * 1000);
        },

        // 无任务点检测（studentstudy 父页面监控 cards iframe）
        _setupNoTaskDetector: function () {
            var checks = 0;
            var lastUrl = '';
            setInterval(function () {
                if (getSettingBool('isPaused', false)) return;
                var cardsDoc = null;
                try {
                    for (var i = 0; i < window.frames.length; i++) {
                        try {
                            var f = window.frames[i];
                            var doc = f.document || f.contentDocument;
                            if (doc && doc.location && doc.location.pathname.indexOf('/knowledge/cards') !== -1) { cardsDoc = doc; break; }
                        } catch (e) { /* ignore */ }
                    }
                } catch (e) { /* ignore */ }
                if (!cardsDoc) return;
                var unfinished = cardsDoc.querySelectorAll('.ans-attach-ct:not(.ans-job-finished), .ans-job-ct:not(.ans-job-finished)');
                if (unfinished.length > 0) { checks = 0; lastUrl = ''; return; }
                var anyExists = cardsDoc.querySelectorAll('.ans-attach-ct, .ans-job-ct, .chapter-item').length;
                if (anyExists > 0) { checks = 0; lastUrl = ''; return; }
                var url = '';
                try { url = cardsDoc.location.href; } catch (e) {}
                if (url !== lastUrl) { checks = 0; lastUrl = url; }
                checks++;
                if (checks >= 2) {
                    checks = 0;
                    logger('检测到无任务点，自动跳过', 'red');
                    setTimeout(function () {
                        var btn = top.document.querySelector('#mainid > .prev_next.next');
                        if (btn) { try { btn.click(); } catch (e) {} }
                        else {
                            var fb = top.document.querySelector('#prevNextFocusNext');
                            if (fb) { try { fb.click(); } catch (e) {} }
                        }
                    }, 500);
                }
            }, 5000);
        }
    };

    /* =========================== UI 管理 =========================== */
    var UIManager = {
        init: function () {
            if (!getSettingBool('showBox', !!CONFIG.showBox)) return;
            if (top.document.querySelector('#ne-21notice')) return;
            if (!top.document.getElementById('ne-21style')) {
                var styleEl = top.document.createElement('style');
                styleEl.id = 'ne-21style';
                styleEl.textContent = UIManager._getCSS();
                top.document.head.appendChild(styleEl);
            }
            $(UIManager._getHTML()).appendTo('body');
            this._restorePosition();
            this._bindEvents();
            this._initSettings();
            this._renderNotice();
        },

        _renderNotice: function () {
            var u = uid();
            var devBtn = DEV_MODE ? '<button id="exportReportBtn" class="ne21-btn ne21-btn-secondary" title="导出诊断报告(仅开发模式)">导出报告</button>' : '';
            $('#ne-21notice').html(
                '<div class="ne21-uid">学习通账号 UID：<b>' + (u || '-') + '</b>' + (DEV_MODE ? ' <span style="color:#ea580c;">[DEV]</span>' : '') + '</div>' +
                '<div class="ne21-row">' +
                '<button id="pauseBtn" class="ne21-btn ne21-btn-primary">暂停</button>' +
                '<button id="moreSettingsBtn" class="ne21-btn ne21-btn-secondary">设置</button>' +
                '<button id="testApiBtn" class="ne21-btn ne21-btn-secondary">测API</button>' +
                devBtn +
                '</div>'
            );
            this._updatePauseUI();
        },

        _updatePauseUI: function () {
            var $pauseBtn = $('#pauseBtn');
            var $dot = $('#ne-21box .ne21-dot');
            if (_quizPaused || getSettingBool('isPaused', false)) {
                $pauseBtn.text('开始').removeClass('ne21-btn-primary').addClass('ne21-btn-secondary');
                $dot.css('background', 'radial-gradient(circle at 32% 28%, rgba(234,88,12,.95), rgba(234,88,12,.4) 60%, rgba(15,23,42,.18) 100%)');
            } else {
                $pauseBtn.text('暂停').removeClass('ne21-btn-secondary').addClass('ne21-btn-primary');
                $dot.css('background', '');
            }
        },

        _getCSS: function () {
            return '#ne-21box{position:fixed;top:5%;right:16%;width:350px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;color:rgba(15,23,42,.86);background:linear-gradient(180deg,rgba(255,255,255,.62),rgba(241,245,249,.55));backdrop-filter:blur(22px) saturate(180%);border:1px solid rgba(255,255,255,.65);border-radius:22px;box-shadow:0 0 0 1px rgba(15,23,42,.09),0 24px 48px -12px rgba(15,23,42,.45);overflow:hidden;transition:opacity .25s,transform .25s;animation:ne21-in .4s cubic-bezier(.2,.9,.3,1) both;}' +
                '@keyframes ne21-in{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}' +
                '@keyframes ne21-spin{to{transform:rotate(360deg)}}' +
                '#ne-21box .ne21-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;cursor:move;user-select:none;border-bottom:1px solid rgba(15,23,42,.07);}' +
                '#ne-21box.ne21-collapsed .ne21-body{display:none;}' +
                '#ne-21box .ne21-title{display:flex;align-items:center;gap:9px;font-weight:600;font-size:14px;margin:0;}' +
                '#ne-21box .ne21-dot{width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#fff,rgba(15,23,42,.3));flex-shrink:0;}' +
                '#ne-21box #ne-21close{margin:0;width:24px;height:24px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;border:1px solid rgba(255,255,255,.65);border-radius:50%;background:rgba(255,255,255,.55);}' +
                '#ne-21box .ne21-body{padding:14px 16px 16px;}' +
                '#ne-21box .ne21-uid{color:rgba(15,23,42,.62);font-size:12px;margin-bottom:10px;padding:8px 12px;background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.7);border-radius:12px;}' +
                '#ne-21box .ne21-row{display:flex;gap:8px;align-items:center;}' +
                '#ne-21box .ne21-btn{display:inline-flex;align-items:center;justify-content:center;padding:7px 14px;font-size:12px;border-radius:14px;cursor:pointer;border:1px solid rgba(255,255,255,.7);white-space:nowrap;}' +
                '#ne-21box .ne21-btn-primary{background:rgba(255,255,255,.72);box-shadow:0 0 0 1px rgba(15,23,42,.07);}' +
                '#ne-21box .ne21-btn-secondary{background:rgba(255,255,255,.45);color:rgba(15,23,42,.78);}' +
                '#ne-21box .ne21-input{width:100%;box-sizing:border-box;margin:4px 0;padding:6px 8px;font-size:12px;border:1px solid rgba(15,23,42,.12);border-radius:8px;background:rgba(255,255,255,.6);}' +
                '#ne-21box #userInfo{margin:10px 0 0;padding:10px 12px;background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.7);border-radius:12px;font-size:12px;color:rgba(15,23,42,.66);}' +
                '#ne-21box #moreSettings{padding:4px 14px;background:rgba(255,255,255,.42);border:1px solid rgba(255,255,255,.65);border-radius:14px;margin:10px 0 0;max-height:320px;overflow-y:auto;}' +
                '#ne-21box #moreSettings label{display:flex;flex-direction:row-reverse;align-items:center;justify-content:space-between;margin:0;padding:8px 2px;font-size:12px;color:rgba(15,23,42,.78);cursor:pointer;}' +
                '#ne-21box #moreSettings label+label{border-top:1px dashed rgba(15,23,42,.1);}' +
                '#ne-21box #moreSettings input[type=checkbox]{width:34px;height:20px;border:1px solid rgba(15,23,42,.08);border-radius:20px;cursor:pointer;position:relative;background:rgba(15,23,42,.16);margin:0 0 0 10px;flex-shrink:0;appearance:none;-webkit-appearance:none;}' +
                '#ne-21box #moreSettings input[type=checkbox]::before{content:\'\';position:absolute;top:1px;left:1px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.25);transition:transform .25s;}' +
                '#ne-21box #moreSettings input[type=checkbox]:checked{background:rgba(255,255,255,.78);}' +
                '#ne-21box #moreSettings input[type=checkbox]:checked::before{transform:translateX(14px);}' +
                '#ne-21box #moreSettings p{display:none;}' +
                '#ne-21box #ne-21log{max-height:140px;overflow-y:auto;margin:12px 0 0;padding:10px 12px;background:rgba(15,23,42,.06);border:1px solid rgba(255,255,255,.55);border-radius:14px;font-family:Consolas,Menlo,monospace;font-size:11px;line-height:1.6;color:rgba(15,23,42,.78);}' +
                '#ne-21box #ne-21log:empty{display:none;}' +
                '#ne-21box #ne-21log p{margin:0;padding:2px 0;word-break:break-all;}';
        },

        _getHTML: function () {
            return '<div id="ne-21box">' +
                '<div class="ne21-header" title="按住标题栏可拖动">' +
                '<h3 class="ne21-title"><span class="ne21-dot"></span>小哀学习通助手</h3>' +
                '<button id="ne-21close" type="button" aria-label="收起">−</button>' +
                '</div>' +
                '<div class="ne21-body">' +
                '<div id="ne-21notice"></div>' +
                '<div id="userInfo"></div>' +
                '<div id="moreSettings" style="display:none;">' +
                '<div style="font-weight:600;margin:8px 0 2px;color:#7c3aed;">◆ AI 服务配置（自有 Key）</div>' +
                '<input id="GPTJsSetting.baseURL" class="ne21-input" placeholder="Base URL，如 https://api.deepseek.com">' +
                '<input id="GPTJsSetting.apiKey" class="ne21-input" type="password" placeholder="API Key" autocomplete="new-password">' +
                '<input id="GPTJsSetting.model" class="ne21-input" placeholder="模型名，如 deepseek-v4-flash">' +
                '<label><select id="GPTJsSetting.rate" class="ne21-input" style="min-width:80px;width:auto;">' +
                '<option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option>' +
                '<option value="4">4×</option><option value="8">8×</option><option value="16">16×</option>' +
                '</select>视频/音频倍速</label>' +
                '<label><input type="number" id="GPTJsSetting.requestInterval" class="ne21-input" min="0" max="60" step="1" style="width:64px;">AI 请求间隔(秒)</label>' +
                '<label><input type="number" id="GPTJsSetting.time" class="ne21-input" min="0" max="60" step="0.5" style="width:64px;">答题间隔(秒)</label>' +
                '<label><input type="number" id="GPTJsSetting.accuracy" class="ne21-input" min="0" max="100" step="5" style="width:64px;">答题覆盖率阈值(%)</label>' +
                '<p></p>' +
                '<label><input type="checkbox" id="GPTJsSetting.jsonMode" checked>JSON 结构化输出</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.sub">测验自动提交</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.force">测验强制提交</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.examTurn">考试自动跳转</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.goodStudent">答案加粗不选择(好学生)</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.alterTitle" checked>答案插入题目后</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.redo">重做模式</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.randomDo">无答案时随机选(B/全选/错)</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.fuzzyMatch" checked>相似度匹配</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.useCache" checked>答案缓存(省API)</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.decrypt" checked>字体解密</label>' +
                '<label><input type="checkbox" id="GPTJsSetting.antiDetect" checked>防检测</label>' +
                '</div>' +
                '<div id="ne-21log"></div>' +
                '</div></div>';
        },

        _restorePosition: function () {
            var $box = $('#ne-21box');
            try {
                var pos = JSON.parse(getSetting('boxPosition', 'null'));
                if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
                    var w = $box.outerWidth() || 350;
                    $box.css({ left: Math.max(40 - w, Math.min(pos.left, window.innerWidth - 40)) + 'px', top: Math.max(0, Math.min(pos.top, window.innerHeight - 40)) + 'px', right: 'auto' });
                }
            } catch (e) { /* ignore */ }
            if (getSetting('boxCollapsed', 'false') === 'true') {
                $box.addClass('ne21-collapsed');
                $('#ne-21close').text('+');
            }
        },

        _bindEvents: function () {
            var $box = $('#ne-21box');

            $('#ne-21close').on('mousedown', function (e) { e.stopPropagation(); })
                .on('click', function (e) {
                    e.stopPropagation();
                    var collapsed = $box.toggleClass('ne21-collapsed').hasClass('ne21-collapsed');
                    $(this).text(collapsed ? '+' : '−');
                    setSetting('boxCollapsed', collapsed ? 'true' : 'false');
                });

            // 拖动
            var $header = $box.find('.ne21-header');
            var dragging = false, startX, startY, startLeft, startTop;
            $header.on('mousedown', function (e) {
                if (e.which !== 1 || $(e.target).closest('#ne-21close').length) return;
                dragging = true;
                var rect = $box[0].getBoundingClientRect();
                startX = e.clientX; startY = e.clientY;
                startLeft = rect.left; startTop = rect.top;
                $box.css({ left: startLeft + 'px', top: startTop + 'px', right: 'auto' });
                $('body').css('user-select', 'none');
                e.preventDefault();
            });
            $(document).on('mousemove.ne21drag', function (e) {
                if (!dragging) return;
                var nx = startLeft + (e.clientX - startX);
                var ny = startTop + (e.clientY - startY);
                nx = Math.max(40 - $box.outerWidth(), Math.min(nx, window.innerWidth - 40));
                ny = Math.max(0, Math.min(ny, window.innerHeight - 40));
                $box.css({ left: nx + 'px', top: ny + 'px' });
            }).on('mouseup.ne21drag', function () {
                if (!dragging) return;
                dragging = false;
                $('body').css('user-select', '');
                try {
                    var rect = $box[0].getBoundingClientRect();
                    setSetting('boxPosition', JSON.stringify({ left: rect.left, top: rect.top }));
                } catch (e) { /* ignore */ }
            });

            // 暂停/继续
            $box.on('click', '#pauseBtn', function () {
                var paused = getSettingBool('isPaused', false);
                paused = !paused;
                setSettingBool('isPaused', paused);
                _quizPaused = paused;
                UIManager._updatePauseUI();
                logger(paused ? '答题已暂停' : '答题已恢复', paused ? 'orange' : 'green');
            });

            // 设置切换
            var isSettingsVisible = false;
            $box.on('click', '#moreSettingsBtn', function () {
                $('#userInfo').toggle(!isSettingsVisible);
                $('#moreSettings').toggle(isSettingsVisible);
                $(this).text(isSettingsVisible ? '设置' : '返回');
                isSettingsVisible = !isSettingsVisible;
            });

            // 测试 API
            $box.on('click', '#testApiBtn', function () {
                logger('正在测试 API 连接...', 'purple');
                ApiClient.test().then(function (ans) {
                    logger('API 连接成功，返回: ' + (ans || '').slice(0, 40), 'green');
                    var cfg = aiConfig();
                    $('#userInfo').html('API 连接成功<br>BaseURL: ' + cfg.baseURL + '<br>模型: ' + cfg.model + '<br>返回: ' + (ans || '').slice(0, 60));
                }).catch(function (e) {
                    logger('API 连接失败: ' + (e.msg || e.c || '未知'), 'red');
                    $('#userInfo').html('API 连接失败: ' + (e.msg || ''));
                });
            });

            // 导出诊断报告（仅开发模式显示按钮）
            $box.on('click', '#exportReportBtn', function () {
                Report.export();
            });
        },

        _initSettings: function () {
            var checkboxes = ['sub', 'force', 'examTurn', 'goodStudent', 'alterTitle', 'redo', 'randomDo', 'fuzzyMatch', 'useCache', 'decrypt', 'antiDetect', 'jsonMode'];
            checkboxes.forEach(function (id) {
                var cb = document.getElementById('GPTJsSetting.' + id);
                if (!cb) return;
                cb.checked = getSettingBool(id, !!CONFIG[id]);
                cb.addEventListener('change', function () { setSettingBool(id, cb.checked); });
            });

            var inputs = ['baseURL', 'apiKey', 'model'];
            inputs.forEach(function (id) {
                var el = document.getElementById('GPTJsSetting.' + id);
                if (!el) return;
                el.value = getSetting(id, CONFIG[id]);
                el.addEventListener('change', function () { setSetting(id, el.value); });
            });

            var rateSelect = document.getElementById('GPTJsSetting.rate');
            if (rateSelect) {
                rateSelect.value = getSetting('rate', '1');
                rateSelect.addEventListener('change', function () { setSetting('rate', rateSelect.value); });
            }

            var reqInput = document.getElementById('GPTJsSetting.requestInterval');
            if (reqInput) {
                reqInput.value = getSetting('requestInterval', '0');
                reqInput.addEventListener('change', function () {
                    var v = parseInt(reqInput.value, 10);
                    if (!isFinite(v) || v < 0) v = 0; if (v > 60) v = 60;
                    reqInput.value = String(v);
                    setSetting('requestInterval', String(v));
                });
            }

            // 答题间隔（秒 → 内部毫秒）
            var timeInput = document.getElementById('GPTJsSetting.time');
            if (timeInput) {
                var savedTime = parseFloat(getSetting('time', CONFIG.time));
                timeInput.value = isFinite(savedTime) ? String(savedTime / 1000) : '2.5';
                timeInput.addEventListener('change', function () {
                    var v = parseFloat(timeInput.value);
                    if (!isFinite(v) || v < 0) v = 0; if (v > 60) v = 60;
                    timeInput.value = String(v);
                    setSetting('time', String(v * 1000));
                });
            }

            var accInput = document.getElementById('GPTJsSetting.accuracy');
            if (accInput) {
                accInput.value = getSetting('accuracy', '60');
                accInput.addEventListener('change', function () {
                    var v = parseInt(accInput.value, 10);
                    if (!isFinite(v) || v < 0) v = 0; if (v > 100) v = 100;
                    accInput.value = String(v);
                    setSetting('accuracy', String(v));
                });
            }
        }
    };

    /* =========================== Bootstrap =========================== */
    try {
        if (_l.pathname.indexOf('/work/phone/doHomeWork') !== -1 &&
            _l.pathname.indexOf('/mooc2/work/dowork') === -1) {
            Router._patchPhoneAlerts();
        } else {
            Router.route();
        }
    } catch (e) {
        console.error('[XiaoAi] bootstrap error', e);
    }

    /* =========================== 测试钩子（仅暴露内部，不影响运行） =========================== */
    try {
        if (typeof window !== 'undefined') {
            window.__XIAOAI_TEST__ = {
                Core: Core, PhoneAdapter: PhoneAdapter, HomeworkAdapter: HomeworkAdapter,
                ExamAdapter: ExamAdapter, ExamPreviewAdapter: ExamPreviewAdapter, PcQuizAdapter: PcQuizAdapter,
                QuizEngine: QuizEngine, applyAnswer: applyAnswer, ApiClient: ApiClient,
                getAnswer: getAnswer, Router: Router, UIManager: UIManager,
                ProgrammingHandler: ProgrammingHandler, EditorHelper: EditorHelper,
                MediaHandler: MediaHandler, VideoQuizHandler: VideoQuizHandler,
                AntiDetect: AntiDetect, FontDecryptor: FontDecryptor,
                getSetting: getSetting, setSetting: setSetting,
                CONFIG: CONFIG, Storage: Storage, logger: logger, Report: Report
            };
        }
    } catch (e) { /* ignore */ }
})();
