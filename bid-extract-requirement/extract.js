/**
 * 招标信息提取器
 * 用法：node extract.js <原始数据目录> <输出目录>
 *
 * 输出目录 = .data/{项目名}_output/bid_extract_phase/
 * 所有产出严格写入输出目录，不修改原始数据。
 */

const fs = require("fs");
const path = require("path");

const PH = "【未提取到】";

// ── 辅助 ──
function mdH1(t) { return `\n# ${t}\n\n`; }
function mdH2(t) { return `\n## ${t}\n\n`; }
function mdTable(headers, rows) {
  let t = "| " + headers.join(" | ") + " |\n| " + headers.map(() => "---").join(" | ") + " |\n";
  for (const row of rows) t += "| " + row.map(c => c || "").join(" | ") + " |\n";
  return t + "\n";
}

// ── 正则提取 ──
function tryMatch(re, text) {
  const m = text.match(re);
  return m?.[1]?.trim().replace(/\s+/g, " ").slice(0, 300) || null;
}

function extractMeta(text) {
  return {
    name: tryMatch(/项目名称\s*[：:]\s*(.+)/, text),
    number: tryMatch(/项目编号\s*[：:]\s*([A-Za-z0-9\-]+)/, text),
    purchaseUnit: tryMatch(/采购单位名称?\s*[：:]\s*(.+)/, text),
    agency: tryMatch(/采购代理机构名称?\s*[：:]\s*(.+)/, text),
    budget: tryMatch(/(?:预算金额|最高限价)[（(]元[)）]\s*[：:]\s*([\d,.]+)/, text),
  };
}

function extractChapters(text, catalogText) {
  // 优先：从 目录.docx 提取
  if (catalogText) {
    const items = [...catalogText.matchAll(/[一二三四五六七八九十廿]+[、，]\s*(.{4,80})/g)]
      .map(m => m[1].trim().replace(/\s+/g, ""))
      .filter(t => t.length > 3 && !/第[一二三]章|响应文件|采购包|投标文件/.test(t));
    if (items.length >= 5) return items;
  }
  // 兜底：从 PDF 第七章提取
  const attachRe = /详见附件\s*[：:]\s*(.+)/g;
  const attachItems = [...text.matchAll(attachRe)].map(m => m[1].trim().replace(/\s+/g, ""));
  if (attachItems.length >= 5) return attachItems;
  return [];
}

function extractTechnicalItems(text) {
  const items = [];
  // ★ 标记的条款
  for (const m of text.matchAll(/★\s*(.{10,300}?)(?:\n(?!★)|\n\s*$|$)/g)) {
    const spec = m[1].trim().replace(/\s+/g, "");
    if (spec.length >= 10) items.push({ star: true, spec });
  }
  // 第三章内的编号列表
  const ch3 = text.search(/第[三3]章/);
  const ch4 = text.search(/第[四4]章/);
  if (ch3 > 0) {
    const chunk = text.slice(ch3, ch4 > ch3 ? ch4 : text.length);
    for (const m of chunk.matchAll(/(?:^|\n)\s*(\d{1,2})\s*[\.\)）]\s*(.{20,250})/g)) {
      const spec = m[2].trim().replace(/\s+/g, " ");
      if (!items.some(i => i.spec === spec)) items.push({ star: false, spec });
    }
  }
  return items;
}

function extractBusiness(text) {
  const patterns = [
    ["标的提供时间", /标的提供时间\s*[：:)]\s*(.+)/],
    ["标的提供地点", /标的提供地点\s*[：:]\s*(.+)/],
    ["合同履约期限", /合同履约期限\s*[：:]\s*(.+)/],
    ["验收要求", /验收要求\s*[：:]\s*(.+)/],
    ["付款方式", /合同支付方式\s*[：:]\s*(.+)/],
    ["质保期", /(?:免费维护期|免费服务期|质保期)\s*[：:]\s*(.+)/],
    ["履约保证金", /履约保证金\s*[：:]\s*(.+)/],
  ];
  const biz = {};
  for (const [key, re] of patterns) {
    const v = tryMatch(re, text);
    if (v) biz[key] = v;
  }
  return biz;
}

// ── 主流程 ──
async function run(dataDir, outputDir) {
  // dataDir = .data/{项目名}/, outputDir = .data/{项目名}_output/bid_extract_phase/
  fs.mkdirSync(path.join(outputDir, "附件"), { recursive: true });

  const attachDir = path.join(dataDir, "附件");
  const attachOutputDir = path.join(outputDir, "附件");

  // Step 1: 复制附件
  if (fs.existsSync(attachDir)) {
    for (const f of fs.readdirSync(attachDir)) {
      fs.copyFileSync(path.join(attachDir, f), path.join(attachOutputDir, f));
    }
    console.log("✅ 附件已复制");
  }

  // Step 2: 找 PDF 并提取全文
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".pdf"));
  if (files.length === 0) throw new Error("未找到 PDF 招标文件");
  const pdfPath = path.join(dataDir, files[0]);

  const { PDFParse } = require("pdf-parse");
  const buf = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const r = await parser.getText();

  let fullMd = `# ${path.basename(dataDir)} - 招标文件全文\n\n> 总页数：${r.pages.length}\n\n`;
  for (const [i, page] of r.pages.entries()) {
    fullMd += `## 第${i+1}页\n\n${page.text.trim()}\n\n---\n\n`;
  }
  const fullText = r.pages.map(p => p.text).join("\n");
  fs.writeFileSync(path.join(outputDir, "01_招标文件全文.md"), fullMd, "utf-8");
  console.log(`✅ 01_招标文件全文.md  (${r.pages.length} 页)`);

  // Step 3: 读目录.docx
  let catalogText = "";
  const catalogPath = path.join(attachOutputDir, "目录.docx");
  if (fs.existsSync(catalogPath)) {
    try {
      const mammoth = require("mammoth");
      const cr = await mammoth.extractRawText({ path: catalogPath });
      catalogText = cr.value;
    } catch (e) { console.log("⚠️ 目录.docx 读取失败，从 PDF 兜底"); }
  }

  // Step 4: 提取章节结构
  const chapters = extractChapters(fullText, catalogText);
  let chapterMd = mdH1("投标文件章节结构") + `> 来源：${catalogText ? "附件/目录.docx" : "PDF 第七章"}\n\n`;
  if (chapters.length > 0) {
    chapters.forEach((t, i) => chapterMd += `${i+1}. ${t}\n`);
  } else {
    chapterMd += "【未能自动提取，请根据招标文件手动补充】\n";
  }
  fs.writeFileSync(path.join(outputDir, "02_章节结构.md"), chapterMd, "utf-8");
  console.log(`✅ 02_章节结构.md  (${chapters.length} 章)`);

  // Step 5: 提取技术参数
  const techItems = extractTechnicalItems(fullText);
  let techMd = mdH1("技术参数表") + `> 来源：招标文件${techItems.length > 0 ? "" : "【未能自动提取】"}\n\n`;
  if (techItems.length > 0) {
    techMd += mdTable(["序号", "★", "技术参数原文"], techItems.map((it, i) => [String(i+1), it.star ? "★" : "", it.spec]));
  } else {
    techMd += "【未能自动提取技术参数，请手动补充】\n";
  }
  fs.writeFileSync(path.join(outputDir, "03_技术参数表.md"), techMd, "utf-8");
  console.log(`✅ 03_技术参数表.md  (${techItems.length} 条, 含 ★ ${techItems.filter(i=>i.star).length} 条)`);

  // Step 6: 提取商务条款
  const biz = extractBusiness(fullText);
  let bizMd = mdH1("商务条款") + `> 来源：招标文件\n\n`;
  const bizEntries = Object.entries(biz);
  if (bizEntries.length > 0) {
    bizMd += mdTable(["条款", "内容"], bizEntries);
  } else {
    bizMd += "【未能自动提取商务条款，请手动补充】\n";
  }
  fs.writeFileSync(path.join(outputDir, "04_商务条款.md"), bizMd, "utf-8");
  console.log(`✅ 04_商务条款.md  (${bizEntries.length} 条)`);

  // Step 7: 提取评审要点（简单 grep）
  const reviewStart = fullText.search(/第[五5]章.*评审/);
  const reviewEnd = fullText.search(/第[六6]章/);
  let reviewMd = mdH1("评审要点") + "> 来源：招标文件第五章\n\n";
  if (reviewStart > 0) {
    const reviewChunk = fullText.slice(reviewStart, reviewEnd > reviewStart ? reviewEnd : reviewStart + 3000);
    reviewMd += reviewChunk.slice(0, 5000) + "\n\n...\n";
  } else {
    reviewMd += "【未定位到评审章节】\n";
  }
  fs.writeFileSync(path.join(outputDir, "05_评审要点.md"), reviewMd, "utf-8");
  console.log("✅ 05_评审要点.md");

  // Step 8: 提取附件模板内容
  let attachMd = mdH1("附件模板内容");
  const docxFiles = fs.readdirSync(attachOutputDir).filter(f => f.endsWith(".docx"));
  if (docxFiles.length > 0) {
    const mammoth = require("mammoth");
    for (const f of docxFiles) {
      try {
        const ar = await mammoth.extractRawText({ path: path.join(attachOutputDir, f) });
        attachMd += mdH2(f) + ar.value + "\n";
      } catch (e) { attachMd += mdH2(f) + `【读取失败】\n`; }
    }
  }
  fs.writeFileSync(path.join(outputDir, "06_附件模板内容.md"), attachMd, "utf-8");
  console.log(`✅ 06_附件模板内容.md  (${docxFiles.length} 个模板)`);

  // 汇总
  console.log(`\n📦 提取完成 → ${outputDir}`);
  console.log(`   ${files.length} PDF, ${docxFiles.length} 模板`);
}

// ── 入口 ──
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("用法：node extract.js <原始数据目录> <输出目录>");
    console.log("示例：node extract.js .data/医保项目/ .data/医保项目_output/bid_extract_phase/");
    process.exit(0);
  }
  const dataDir = path.resolve(args[0]);
  const outputDir = path.resolve(args[1]);
  if (!fs.existsSync(dataDir)) { console.error(`数据目录不存在：${dataDir}`); process.exit(1); }
  await run(dataDir, outputDir);
}
main().catch(e => { console.error("提取失败：", e.message); process.exit(1); });
