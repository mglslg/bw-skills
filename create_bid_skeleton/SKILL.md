---
name: create-bid-skeleton
description: 解析招标文件及其附件模板，自动生成投标文件Word骨架。适用场景：用户提供招标文件PDF和投标附件模板（docx/pdf），需要创建结构完整的投标响应文件骨架。
---

# 投标文件骨架生成器

## 核心原则

1. **原始数据绝对只读** — `.data/` 下所有原始文件只看不写、不改、不删、不移。违者后果严重。
2. **产出目录严格分离** — 所有生成物必须写入 `_output/`，名称格式：`.data/{项目名}_output/`
3. **目录来自模板** — 优先读 `附件/目录.docx` 获取规范章节列表
4. **不编造内容** — 骨架只放结构，无内容的标 `【待填写】`
5. **技术参数原文照录** — 从招标文件提取的 spec 不可改写

## 产出目录规则（强制）

```
.data/
├── {项目名}/                    ← 原始数据，禁止写入任何文件
│   ├── 招标文件.pdf
│   └── 附件/
│       ├── 封面.docx
│       ├── 目录.docx
│       └── ...
│
└── {项目名}_output/             ← 所有产出唯一存放处
    ├── 招标文件全文.md          ← 第 2 步 PDF 提取结果
    ├── config.json              ← 第 4 步 结构化配置
    ├── 投标文件骨架.md          ← 第 5 步 MD 产出
    ├── 投标文件骨架.docx        ← 第 6 步 DOCX 产出
    └── filled/                  ← fill_templates 产出（如有）
```

**红线**：
- 禁止在 `附件/` 下写 `.json` `.js` `.py` `.md` 或任何临时文件
- 禁止在原始数据目录创建子目录
- 所有脚本的中间文件（如 Python 临时脚本）用完后立即删除
- `outputDir` 参数必须指向 `_output/`，不接受原始数据目录作为输出目标

## 流程

### 第 1 步：创建输出目录
```bash
mkdir -p .data/{项目名}_output
```

### 第 2 步：PDF → Markdown
```js
const { PDFParse } = require("pdf-parse");
const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(pdf)) });
const r = await parser.getText();
// 逐页保存为 招标文件全文.md → 输出目录
```

### 第 3 步：提取章节列表
**优先**：用 mammoth 读 `附件/目录.docx`，获取规范目录（如"投标承诺书""开标一览表"等）。
**兜底**：从招标文件第七章 grep "详见附件" 提取。

### 第 4 步：提取结构化配置
运行 `extract.js`，再用 mammoth 读各 docx 模板了解表格结构。人工审核补全后得到 `config.json`，存入输出目录。

### 第 5 步：生成 MD 骨架
```bash
node generate_md.js config.json output_dir/
```
格式：`# 第一章  投标承诺书` ... `# 第二十一章  其他证明材料`，含封面和目录。

### 第 6 步：生成 DOCX 骨架（可选）
```bash
node generate_skeleton.js config.json output_dir/
```
标题黑色、TOC 手动、不编造内容。有模板时优先用 `fill_templates.js` 往真模板填空。

### 第 7 步：验证
- [ ] 目录章节数与 `附件/目录.docx` 一致
- [ ] 每个章节以 `第X章` 开头
- [ ] 技术偏离表 spec 列是原文，resp 列全是 `【待填写】`
- [ ] 所有产出在 `_output/` 下

## 脚本

| 脚本 | 作用 |
|---|---|
| `extract.js` | 正则提取元数据/技术参数/商务条款 |
| `generate_md.js` | 生成 MD 骨架（推荐编辑用） |
| `generate_skeleton.js` | 生成 DOCX 骨架（兜底方案） |
| `fill_templates.js` | 往原始 docx 模板填空（保留样式） |

## 依赖
```bash
npm install pdf-parse mammoth docx
```

## 注意事项
- pdf-parse v2 API：`new PDFParse({ data: Uint8Array })` + `getText()`
- DOCX 标题不用 HeadingLevel（会变蓝），手动 black bold
- 不在 array literal 中声明 `const`
- 输出目录与原始数据目录严格分离
