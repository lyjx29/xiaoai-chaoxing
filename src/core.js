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

    // 去掉 HTML 标签（保留 <img> 以便后续处理）
    function stripHtml(s, keepImg) {
        if (!s) return '';
        var html = String(s);
        if (keepImg) {
            html = html.replace(/<(?!img|\/img|\/p|br)[^>]*>/g, '');
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
                    var answers = [];
                    if (Array.isArray(obj.answers)) answers = obj.answers.map(function (x) { return String(x); });
                    if (obj.answer !== undefined && answers.length === 0) answers.push(String(obj.answer));
                    return { answer: answers.length > 0 ? answers.join('|') : '', answers: answers, raw: raw, json: true };
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
