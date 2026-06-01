---
name: bid-create-skeleton
description: 投标文件骨架生成器。读取 bid_extract_phase 中的结构化数据，生成投标文件 DOCX 和 MD 骨架，作为标书编写流程的第二个处理节点。
---

# 投标文件骨架生成器

## 职责边界

**只做一件事**：基于 bid_extract_phase 中已提取的结构化信息，生成投标文件 Word/Markdown 骨架。

**输入**：`.data/{项目名}_output/bid_extract_phase/`  
**输出**：`.data/{项目名}_output/bid_skeleton_phase/`

## 产出目录结构

```
bid_skeleton_phase/
├── config.json                  ← 生成引擎用的结构化配置
├── 投标文件骨架.md              ← MD 格式，可编辑
└── 投标文件骨架.docx            ← Word 格式，含目录/页码/跳转
```

## 执行步骤

### Step 1: 创建产出目录

```bash
mkdir -p .data/{项目名}_output/bid_skeleton_phase
```

### Step 2: 读取上游数据

按顺序读取 bid_extract_phase 中的文件：
1. `02_章节结构.md` → 确定章节列表
2. `03_技术参数表.md` → 技术上参数数据
3. `04_商务条款.md` → 商务条款数据
4. `01_招标文件全文.md` → 项目名称/编号/采购单位
5. `06_附件模板内容.md` → 各表格列结构

### Step 3: 构建 config.json

**先跑脚本**：
```bash
node build_config.js <bid_extract_phase> <bid_skeleton_phase>/config.json
```

脚本自动从 `01~04.md` 提取元数据/章节/技术参数/商务条款并拼装。  
输出会标注未提取到的字段（`_warnings`）。

**再人工审核**：打开生成的 config.json，对照 `01_招标文件全文.md` 逐项核对：
- [ ] 技术参数 spec 是否为原文（不可改写）
- [ ] 商务条款各字段是否与招标文件一致
- [ ] 标记 ★ 的实质性条款是否正确
- [ ] 如有 `_warnings`，逐项补全

### Step 3.5: config.json schema

```json
{
  "name": "项目名称",
  "number": "项目编号",
  "purchaseUnit": "采购单位",
  "agency": "代理机构",
  "budget": "预算",
  "packages": ["采购包名"],
  "sections": [{"title":"章节标题"}],
  "technicalItems": [{"star":true,"spec":"原文","resp":null}],
  "business": {"deadline":"","location":"","payment":"","acceptance":"","warranty":""},
  "implementationModules": [{"name":"","desc":null}],
  "interfaceRequirements": [],
  "tables": {}
}
```

所有数据均来自 bid_extract_phase 中的文件，禁止编造。

### Step 4: 生成 DOCX 骨架

运行 `generate_skeleton.js`。标题使用 HeadingLevel（TOC 域代码需要），  
后处理脚本自动修正标题为黑色并补全大纲级别。

**特性**：
- 每章标题：`第X章  XXX`，居中，Heading1
- 目录：TOC 域代码，打开后 Ctrl+A F9 刷新即显示页码和跳转链接
- 页脚：自动页码 `第 X 页`
- 技术偏离表：spec 列原文照录，resp 列一律 `【待填写】`
- 所有未填内容标注 `【待填写】`

### Step 5: 生成 MD 骨架（可选）

运行 `generate_md.js`，生成相同内容的 Markdown 版本，  
含可点击的目录锚点链接 `[第一章 投标承诺书](#ch01)`。

## 依赖

```bash
npm install docx
```

（pdf-parse / mammoth 在上游节点已安装）

## 注意事项
- 标题使用 HeadingLevel，经 Python 后处理修正颜色和大纲级别
- 技术偏离表 resp 列必须为 null（生成时自动填 【待填写】）
- 所有产出写入 bid_skeleton_phase，不改动 bid_extract_phase
- 本 skill 不读取原始数据目录，只读取上游节点产出
