# bid-extract-requirement 完整流程

## 调用方式

```bash
node extract.js <原始数据目录> <输出目录>
```

## 内部步骤

### Step 1: 复制附件

```
原始: .data/{项目}/附件/*.docx, *.pdf
      ↓ fs.copyFileSync()
输出: bid_extract_phase/附件/*.docx, *.pdf   （完整副本）
```

**脚本代码**：
```js
for (const f of fs.readdirSync(attachDir)) {
  fs.copyFileSync(path.join(attachDir, f), path.join(attachOutputDir, f));
}
```

---

### Step 2: PDF → 01_招标文件全文.md

```
原始: .data/{项目}/招标文件.pdf
      ↓ pdf-parse v2 (new PDFParse + getText)
输出: bid_extract_phase/01_招标文件全文.md
```

**输出格式**：
```md
# 项目名 - 招标文件全文
> 总页数：46

## 第1页
（PDF第1页的纯文本）
---
## 第2页
...
```

**关键 API**：
```js
const { PDFParse } = require("pdf-parse");
const parser = new PDFParse({ data: new Uint8Array(buf) });
const r = await parser.getText();
// r.pages[i].text → 每页文本
```

---

### Step 3: 读目录.docx → 02_章节结构.md

```
原始: bid_extract_phase/附件/目录.docx
      ↓ mammoth.extractRawText()
纯文本 → 正则提取编号条目
      ↓
输出: bid_extract_phase/02_章节结构.md
```

**正则逻辑**：
```js
// 匹配 "一、投标承诺书" "二、开标一览表（报价表）" 等
const re = /[一二三四五六七八九十廿]+[、，]\s*(.{4,80})/g;
// 过滤掉无关行（如"第X章"、空行等）
.filter(t => t.length > 3 && !/第[一二三]章|响应文件|采购包|投标文件/.test(t));
```

**输出格式**：
```md
# 投标文件章节结构
> 来源：附件/目录.docx

1. 投标承诺书
2. 开标一览表（报价表）
...
21. 其他证明材料
```

**兜底**：如果没有目录.docx，从 PDF 第七章搜索"详见附件"提取。

---

### Step 4: 提取技术参数 → 03_技术参数表.md

```
原始: 01_招标文件全文.md（全部46页文本）
      ↓
正则1: 搜索 ★ 标记的行
正则2: 搜索第三章内编号列表 (1. 2. 3.) 的行
      ↓
输出: bid_extract_phase/03_技术参数表.md
```

**正则逻辑**：
```js
// 正则1：★ 标记
for (const m of text.matchAll(/★\s*(.{10,300}?)(?:\n|$)/g))
  items.push({ star: true, spec: m[1] });

// 正则2：编号列表（仅在第三章区域内）
const ch3 = text.search(/第[三3]章/);
const chunk = text.slice(ch3, ch4);
for (const m of chunk.matchAll(/(\d{1,2})\s*[\.\)）]\s*(.{20,250})/g))
  items.push({ star: false, spec: m[2] });
```

**输出格式**：
```md
# 技术参数表
> 来源：招标文件

| 序号 | ★ | 技术参数原文 |
|------|---|-------------|
| 1 | ★ | B/S架构部署... |
| 2 | ★ | ... |
```

> ⚠️ **这是薄弱环节**：PDF 中如果 ★ 在表格内或文本碎片化，正则几乎无效。本项目只提到 2-3 条。

---

### Step 5: 提取商务条款 → 04_商务条款.md

```
原始: 01_招标文件全文.md
      ↓
正则：搜索 9 种商务条款关键词
      ↓
输出: bid_extract_phase/04_商务条款.md
```

**匹配的关键词**：
```js
"标的提供时间"  "标的提供地点"  "合同履约期限"
"验收要求"      "付款方式"      "质保期/免费维护期"
"履约保证金"
```

**输出格式**：
```md
# 商务条款
> 来源：招标文件

| 条款 | 内容 |
|------|------|
| 标的提供时间 | 合同签订后6个月内 |
```

> ⚠️ 本项目提取到 **0 条**——PDF 文本碎片化导致正则全挂。

---

### Step 6: 提取评审要点 → 05_评审要点.md

```
原始: 01_招标文件全文.md
      ↓
定位 "第五章 评审" → "第六章"
      ↓ 截取中间文本
输出: bid_extract_phase/05_评审要点.md
```

**逻辑**：纯文本截取，不做结构化。供人工阅读参考。

---

### Step 7: 读所有附件模板 → 06_附件模板内容.md

```
原始: bid_extract_phase/附件/*.docx
      ↓ mammoth.extractRawText() 逐个读取
输出: bid_extract_phase/06_附件模板内容.md
```

**输出格式**：
```md
# 附件模板内容

## 封面.docx
（模板纯文本）

## 技术偏离表.docx
（模板纯文本，含表格结构）

## 投标人承诺函.docx
...
```

---

## 完整数据流图

```
.data/{项目}/
├── 招标文件.pdf ─────────┐
│                          │ pdf-parse v2
│                          ▼
│                  01_招标文件全文.md ──┬── ★ + 编号正则 ──→ 03_技术参数表.md
│                          │            ├── 关键词正则 ────→ 04_商务条款.md
│                          │            ├── 第五章截取 ────→ 05_评审要点.md
│                          │            └── (供下游 Claude 阅读)
│                          │
├── 附件/ ──┬──────────────┤
│           │ copyFileSync │
│           ▼              │
│    附件/（副本）          │
│           │              │
│   ├── 目录.docx ── mammoth → 正则提取 → 02_章节结构.md
│   │
│   └── *.docx ──── mammoth × N → 06_附件模板内容.md
```

## 产出汇总

| 文件 | 来源 | 方法 | 本项目质量 |
|---|---|---|---|
| 01_招标文件全文.md | PDF | pdf-parse | ✅ 46页完整 |
| 02_章节结构.md | 目录.docx | mammoth + 正则 | ✅ 21章准确 |
| 03_技术参数表.md | PDF全文 | ★ + 编号正则 | ❌ 只提到2条垃圾 |
| 04_商务条款.md | PDF全文 | 9种关键词正则 | ❌ 0条 |
| 05_评审要点.md | PDF全文 | 章节截取 | ⚠️ 原始文本，未结构化 |
| 06_附件模板内容.md | *.docx | mammoth × N | ✅ 22个模板全部可读 |
| 附件/ | 原始附件 | copyFileSync | ✅ 完整副本 |

## 建议干预点

**Step 4 (03_技术参数表.md)** 和 **Step 5 (04_商务条款.md)** 的正则提取对复杂 PDF 效果极差。

干预方案：
- **方案A**：不改进正则，接受提取质量差 → 下游 Claude 审核补全（当前状态）
- **方案B**：替换提取引擎（用 AI/LLM 做语义提取替代正则）
- **方案C**：在提取后加一个交互步骤，让用户手动标注 PDF 中的关键区域
