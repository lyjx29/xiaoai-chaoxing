# 小哀学习通助手（XiaoAi Chaoxing Assistant）

> 学习通 / 超星全自动助手 · 自带 API Key 直连 AI · 无需任何第三方题库 / 中转站

一个运行在 [脚本猫 ScriptCat](https://scriptcat.org) / Tampermonkey 上的 userscript。**完全自研重构**，综合了社区中多项成熟的思路与工程实践，并用**你自己的 API Key 直连大模型**作答，不依赖任何会失效的第三方题库或免费中转站。

默认模型 `deepseek-v4-flash`，对大学题目准确率与成本都合适；也兼容任意 OpenAI 兼容端点（DeepSeek / OpenAI / Kimi / Ollama / 智谱…）。

---

## ✨ 功能一览

### 📝 答题（核心）
| 题型 | 支持 | 说明 |
|---|---|---|
| 单选题 / 多选题 | ✅ | 六层匹配：数字索引 → 精确 → 去标点 → 字母("AB") → "C.文本"复合 → Levenshtein 模糊；希腊字母/音标归一化 |
| 判断题 | ✅ | 对/错/√/×/true/false/T/F 全识别；否定词优先（"不正确"→错） |
| 填空题 | ✅ | 自动识别空位数量（textarea / `.blankList2` / `[data-editorindex]` / UEditor），答案 `|`、`#` 多分隔符按序填入，UEditor 三层定位 + 隐藏 textarea 同步 |
| 简答 / 论述 / 名词解释 / 材料 | ✅ | **两段式作答**：先自由草稿，再由 AI 自定格式誊抄（分点/步骤/换行），只填 AI 用 `【答案】` 标记划出的最终答案；**拟学生化语言**避免 AI 套话 |
| 写作题 / 翻译题 | ✅ | 按题目语言写作 / 互译 |
| 编程题 | ✅ | CodeMirror / Monaco / textarea 三种编辑器自动填充 + 自动点提交（社区空白点，自研实现） |
| 阅读理解 / 完形填空（复合大题） | ✅ | 大题材料作背景注入，逐小题递归作答 |
| 视频中弹题 | ✅ | 自动作答，答错自动"排除法"重试直至答对 |
| 图片题 / 听力题 | ⚠️ | 题目中的图片/音频转成资源地址文本发给 AI 辅助判断 |

### 🎬 刷课挂机
- 视频 / 音频：倍速（最高 16×，临近结尾自动回 1×）、静音、防暂停、自动跳转任务点
- 文档 / 阅读 / 读书 / 速课 / 直播 / 知识图谱：一键完成
- 章节自动翻页、无任务点自动跳过、闯关模式识别

### 🛡️ 防检测 / 防清进度
- 后台切页伪装（`onblur`/`visibilityState`/`hasFocus` 劫持 + 静音 AudioContext 防休眠）
- 答题覆盖率阈值：答不齐就不交卷、只保存（默认 60%，可调）
- 可选"随机答错"（找不到答案时单选选 B / 多选全选 / 判断选错），避免全对
- 拦截超星 `detect.chaoxing.com` 检测脚本、中和 `viewer.show` 反挂机弹窗
- 字体反爬 `font-cxsecret` 自动解密（字形 md5 指纹查表，多源映射表自动兜底）

### 🧠 AI 能力
- **自有 API Key**，OpenAI 兼容 `chat/completions`（Anthropic 端点自动识别），URL 自动补全
- 客观题默认 **JSON 结构化输出**（`{"answer","answers"}`），模型不配合时自动降级为文本解析
- 长响应自动提取末尾答案、请求节流防封、超时自动重试
- **本地答案缓存**：答过的题按「题干+选项+题型」指纹复用，省 API 调用

---

## 📦 安装（快速版）

> 嫌简单？点这里看 [**小白超详细安装教程（含每一步截图说明 + FAQ）**](docs/安装教程-小白超详细版.md)，从零一步步手把手。

1. **下载脚本文件**：打开 https://github.com/lyjx29/xiaoai-chaoxing → **Releases** → 找到 `小哀学习通助手.user.js` → **右键 → 链接另存为**，保存到桌面
2. **安装脚本管理器**：
   - Edge 浏览器：地址栏输入 `edge://extensions` → 左下角「获取 Microsoft Edge 扩展」→ 搜索「**脚本猫**」→ 获取
   - Chrome 浏览器：打开 https://chromewebstore.google.com 搜索「脚本猫」或「Tampermonkey」→ 添加
   - 搜不到？换 Edge 浏览器，或去 https://scriptcat.org 点「安装」按钮
3. **导入脚本**：把桌面上的 `小哀学习通助手.user.js` **直接拖进浏览器窗口** → 弹窗点「安装 / Install」
4. **验证**：登录学习通，进入课程/作业页，右下角出现悬浮窗 = 成功
5. **配置 AI**：点悬浮窗「设置」→ 填 **API Key**（[platform.deepseek.com](https://platform.deepseek.com) 创建）→ 点「测 API」→ 显示"连接成功"即可用

> 💡 换服务商：Base URL 改成 `https://api.openai.com/v1`、`https://api.moonshot.cn/v1`、`http://127.0.0.1:11434/v1`（Ollama）等，模型名、Key 同步换对应平台的。

---

## ⚙️ 设置面板说明

| 设置 | 默认 | 说明 |
|---|---|---|
| Base URL / API Key / 模型名 | deepseek / — / v4-flash | AI 服务配置 |
| 视频/音频倍速 | 1× | 最高 16× |
| AI 请求间隔 | 0s | 限速防封（遇到 429 调大） |
| AI 确认次数 | 0 | 客观题额外询问次数取多数票，消除模型随机性。0=单次(最省)，1=问2次，2=问3次(最准) |
| 答题覆盖率阈值 | 60% | 答题覆盖率达到才自动交卷，否则只保存 |
| JSON 结构化输出 | 开 | 客观题输出更稳定 |
| 测验自动提交 / 强制提交 | 关 / 关 | 强制提交不管答没答完都交 |
| 考试自动跳转 | 关 | 逐题作答后自动下一题（3~7s 随机） |
| 答案加粗不选择（好学生模式） | 关 | 只把答案加粗，由你手动勾选 |
| 答案插入题目后 | 开 | 题目下方绿字显示 AI 答案 |
| 重做模式 | 关 | 已答过的题也重新作答 |
| 无答案时随机选(B/全选/错) | 关 | 模拟真人答错，防全对 |
| 相似度匹配 / 字体解密 / 防检测 | 开 | 建议保持开启 |

---

## 🧪 测试

项目自带 **65 项纯逻辑单测 + 24 项 jsdom 模拟 DOM 端到端测试**：

```bash
npm install        # 安装 jsdom / jquery
npm test           # 构建 + 全部测试
```

测试覆盖：六层匹配、判断题否定词、填空多分隔符、JSON/文本双解析、UEditor 填充、CodeMirror 编程题、视频弹题排除法等。

---

## 📁 项目结构

```
├── src/
│   ├── core.js            # 纯逻辑核心（匹配/解析/Prompt/md5）— 无 DOM，可在 Node 单测
│   ├── vendor_typr.js     # Typr 字体解析器（字体解密用）
│   └── userscript.js      # 用户脚本主体（路由/适配器/任务/UI）
├── build.js               # 合并 → dist/*.user.js
├── dist/小哀学习通助手.user.js   # 成品（导入即可用）
├── test/
│   ├── core.test.js       # 纯逻辑单测（65 项）
│   └── dom.test.js        # jsdom 端到端测试（24 项）
├── docs/
│   └── 安装教程-小白超详细版.md   # 新手安装教程（README 点击进入）
└── README.md
```

---

## 🛠️ 开发者调试（本地详细日志 / 诊断报告）

脚本内置一个**开发模式开关**，用于排查真实页面适配问题：

1. 打开 [src/userscript.js](src/userscript.js)，把顶部 `var DEV_MODE = false;` 改为 `true`
2. `npm test` 重新构建 → 安装到脚本管理器
3. 在真实学习通页面上运行，日志会记录全流程：
   - 路由匹配 → 题干全文 → 选项 → 题型识别 → 发送的 prompt → AI 原始返回 → 解析结果 → 匹配选项 / 填入每个空
   - 解析或匹配失败的题目会**保存其真实 DOM 快照**，便于对照修复选择器
4. 诊断报告三选一导出：
   - 悬浮窗新增「导出报告」按钮（仅开发模式显示）
   - 控制台执行 `__xiaoaiExportReport()`
   - 控制台执行 `__xiaoaiDumpLog()` 只看日志 / `__xiaoaiClearLog()` 清空
5. 报告包含：页面信息 + 路由 + 设置快照（**API Key 已打码**）+ DOM 选择器探针 + 题目快照 + 页面错误捕获 + 完整日志
6. 发布前把 `DEV_MODE` 改回 `false` 重新构建 → 发布版零日志负担

---

## ⚠️ 免责声明

本项目仅供个人学习与自动化研究交流使用。使用本脚本完成学习任务可能违反你所在学校/平台的相关规定，请自行评估风险。作者不对因使用本脚本产生的任何后果负责。**切勿在正式考试中作弊。**

---

## 🙏 致谢

本项目为**独立重构实现**。部分 API 交互格式与答案匹配思路参考了以下开源项目，在此致谢：

- [yxxawa/xuexitong-ai-helper](https://github.com/yxxawa/xuexitong-ai-helper) — OpenAI 兼容接口封装思路
- [Z-Fovik-RT/chaoxing-ai](https://github.com/Z-Fovik-RT/chaoxing-ai) — 多层级答案匹配思路
- 字体反爬 `font-cxsecret` 解密采用社区通用方法（字形路径 md5 指纹 + 映射表）
- Typr.js 字体解析器来自 [photopea/Typr.js](https://github.com/photopea/Typr.js)
