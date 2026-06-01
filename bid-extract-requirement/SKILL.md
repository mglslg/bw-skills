---
name: bid-extract-requirement
description: 招标信息提取器。读取招标文件PDF及附件模板，提取全部结构化信息到 bid_extract_phase 目录，作为整个标书编写流程的第一个处理节点。
---

# 招标信息提取器

## 职责边界

**只做一件事**：把原始招标文件中的所有信息提取为可读、可检索的结构化文档。

**输入**：`.data/{项目名}/` 下的原始 PDF + 附件  
**输出**：`.data/{项目名}_output/bid_extract_phase/`

## 产出目录结构

```
bid_extract_phase/
├── 附件/                        ← 原始附件完整副本
│   ├── 封面.docx
│   ├── 目录.docx
│   └── ...（全部附件）
├── 01_招标文件全文.md           ← PDF 逐页全文提取
├── 02_章节结构.md               ← 从 目录.docx 提取的规范章节列表
├── 03_技术参数表.md             ← 从招标文件提取的技术参数表格
├── 04_商务条款.md               ← 工期/地点/付款/验收/维保等
├── 05_评审要点.md               ← 资格条件、评审标准
└── 06_附件模板内容.md           ← 各 docx 模板的文本内容及结构
```

## 执行步骤

### Step 1: 创建产出目录

```bash
mkdir -p .data/{项目名}_output/bid_extract_phase/附件
```

### Step 2: 复制附件

```bash
cp -r .data/{项目名}/附件/* .data/{项目名}_output/bid_extract_phase/附件/
```

### Step 3: PDF → 01_招标文件全文.md

用 pdf-parse v2，每页保存为一个 `## 第N页` 段落。

```js
const { PDFParse } = require("pdf-parse");
const buf = fs.readFileSync(pdfPath);
const parser = new PDFParse({ data: new Uint8Array(buf) });
const r = await parser.getText();
// r.pages[i].text → 逐页文本
```

### Step 4: 提取 02_章节结构.md

用 mammoth 读 `附件/目录.docx`，获取规范的投标文件章节列表。  
如无 目录.docx，则从 PDF 第七章 grep 提取。

### Step 5: 提取 03_技术参数表.md

从招标文件第三章（常见名称：采购内容与技术要求 / 技术规格书）提取：
- 所有带 ★ 的实质性条款
- 所有编号的技术参数（格式不限：表格/列表/段落）
- 每条标注来源页码

**输出格式**（Markdown 表格）：
```md
| 序号 | ★ | 技术参数原文 | 来源页码 |
|------|---|-------------|---------|
| 1 | ★ | B/S架构部署... | 第13页 |
```

### Step 6: 提取 04_商务条款.md

提取：标的提供时间、地点、合同履约期限、付款方式、验收要求、履约保证金、质保期、驻场服务要求等。

**输出格式**（键值对）：
```md
| 条款 | 内容 | 来源页码 |
|------|------|---------|
| 标的提供时间 | 合同签订后6个月内 | 第12页 |
```

### Step 7: 提取 05_评审要点.md

提取：资格条件、符合性审查项、评审方法、价格扣除规则等。

### Step 8: 提取 06_附件模板内容.md

用 mammoth 读所有 docx 模板，记录：
- 每个模板的表格列名
- 占位文本（如 `（由供应商填写）`）
- 固定条款文本（如承诺函的十项条款）
- 模板与章节的对应关系

## 依赖

```bash
npm install pdf-parse mammoth
```

## 注意事项
- pdf-parse 必须 v2 API
- 所有文件路径使用绝对路径
- 产物不可写入原始数据目录
- 每步产出单独文件，便于后续节点精准读取
