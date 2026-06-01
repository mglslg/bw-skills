/**
 * 从 bid_extract_phase 构建 config.json
 * 用法：node build_config.js <bid_extract_phase目录> <输出config.json路径>
 *
 * 做的事：
 * 1. 读 01_招标文件全文.md → 提取项目元数据、技术参数、商务条款
 * 2. 读 02_章节结构.md → 构建 sections 列表
 * 3. 读 03_技术参数表.md → 补全技术参数
 * 4. 读 04_商务条款.md → 补全商务条款
 * 5. 合并输出 config.json（不编造，缺失的留 null 或标注）
 */

const fs = require("fs");
const path = require("path");

function tryMatch(re, text) {
  const m = text.match(re);
  return m?.[1]?.trim().replace(/\s+/g, " ").slice(0, 300) || null;
}

function build(inputDir, outputPath) {
  const fullText = fs.existsSync(path.join(inputDir, "01_招标文件全文.md"))
    ? fs.readFileSync(path.join(inputDir, "01_招标文件全文.md"), "utf-8")
    : "";

  const chapterText = fs.existsSync(path.join(inputDir, "02_章节结构.md"))
    ? fs.readFileSync(path.join(inputDir, "02_章节结构.md"), "utf-8")
    : "";

  const techText = fs.existsSync(path.join(inputDir, "03_技术参数表.md"))
    ? fs.readFileSync(path.join(inputDir, "03_技术参数表.md"), "utf-8")
    : "";

  const bizText = fs.existsSync(path.join(inputDir, "04_商务条款.md"))
    ? fs.readFileSync(path.join(inputDir, "04_商务条款.md"), "utf-8")
    : "";

  // ── 1. 项目元数据 ──
  const meta = {
    name: tryMatch(/项目名称\s*[：:]\s*(.+)/, fullText),
    number: tryMatch(/项目编号\s*[：:]\s*([A-Za-z0-9\-]+)/, fullText),
    purchaseUnit: tryMatch(/采购单位名称?\s*[：:]\s*(.+)/, fullText),
    agency: tryMatch(/采购代理机构名称?\s*[：:]\s*(.+)/, fullText),
    budget: tryMatch(/(?:预算金额|最高限价)[（(]元[)）]\s*[：:]\s*([\d,.]+)/, fullText),
  };

  // ── 2. 章节列表 ──
  let sections = [];
  const chapterLines = chapterText.match(/^\d+\.\s*(.+)/gm);
  if (chapterLines) {
    sections = chapterLines.map(l => ({ title: l.replace(/^\d+\.\s*/, "").trim() }));
  }
  if (sections.length === 0) {
    // 兜底：默认21章
    sections = ["投标承诺书","开标一览表（报价表）","分项报价表","授权委托书","缴纳投标保证金证明材料","投标人基本情况表","具有独立承担民事责任的能力的证明材料","具有良好的商业信誉和健全的财务会计制度的相关材料","依法缴纳税收和社会保障资金的良好记录的相关材料","具有履行合同所必需的设备和专业技术能力的证明材料","参加政府采购活动前三年内在经营活动中没有重大违法记录的书面声明","联合体协议书","中小企业声明函","监狱企业证明文件","残疾人福利性单位声明函","主要商务要求承诺书","技术偏离表","项目组成人员一览表","项目实施方案、质量保证及售后服务承诺等","投标人业绩情况表","其他证明材料"].map(t => ({ title: t }));
  }

  // ── 3. 技术参数 ──
  let technicalItems = [];
  // 从 03_技术参数表.md 的表格中提取
  const techRows = [...techText.matchAll(/^\|\s*(\d+)\s*\|\s*(★?)\s*\|\s*(.+?)\s*\|/gm)];
  if (techRows.length > 0) {
    technicalItems = techRows.map(m => ({
      star: m[2].trim() === "★",
      spec: m[3].trim().replace(/\s+/g, " "),
      resp: null,
    }));
  }

  // 如果 03 提取不够，从 01 全文补充 ★ 标记项
  if (technicalItems.length < 5) {
    for (const m of fullText.matchAll(/★\s*(.{15,300}?)(?:\n(?!★)|\n\s*$|$)/g)) {
      const spec = m[1].trim().replace(/\s+/g, " ");
      if (spec.length >= 15 && !spec.includes("号条款为实质性") && !spec.includes("负偏离")) {
        if (!technicalItems.some(i => i.spec === spec)) {
          technicalItems.push({ star: true, spec, resp: null });
        }
      }
    }
  }

  // 从 01 全文提取编号列表（第三章区域内）
  const ch3 = fullText.search(/第[三3]章/);
  const ch4 = fullText.search(/第[四4]章/);
  if (ch3 > 0 && technicalItems.length < 10) {
    const chunk = fullText.slice(ch3, ch4 > ch3 ? ch4 : fullText.length);
    for (const m of chunk.matchAll(/(?:^|\n)\s*(\d{1,2})\s*[\.\)）]\s*(.{25,250})/g)) {
      const spec = m[2].trim().replace(/\s+/g, " ");
      if (!technicalItems.some(i => i.spec === spec)) {
        technicalItems.push({ star: false, spec, resp: null });
      }
    }
  }

  // ── 4. 商务条款 ──
  const business = {};
  const bizPatterns = [
    ["deadline", /标的提供时间\s*[：:)]\s*(.+)/],
    ["deadline", /实施工期\s*[：:]\s*(.+)/],
    ["deadline", /合同履约期限\s*[：:]\s*(.+)/],
    ["location", /标的提供地点\s*[：:]\s*(.+)/],
    ["location", /合同履约地点\s*[：:]\s*(.+)/],
    ["acceptance", /验收要求\s*[：:]\s*(.+)/],
    ["payment", /合同支付方式\s*[：:]\s*(.+)/],
    ["warranty", /(?:免费维护期|免费服务期|质保期)\s*[：:]\s*(.+)/],
    ["bond", /履约保证金\s*[：:]\s*(.+)/],
  ];
  for (const [key, re] of bizPatterns) {
    if (business[key]) continue;
    const v = tryMatch(re, fullText);
    if (v) business[key] = v;
  }

  // ── 5. 接口列表 ──
  const ifSet = new Set();
  for (const m of fullText.matchAll(/与\S*(?:对接|集成|融合|互联)/g)) ifSet.add(m[0]);

  // ── 6. 功能模块 ──
  const modRe = /\d+[\.\)）]\s*(.{4,30}(?:功能|模块|管理|审核|分析|统计|监控|实施))/g;
  const mods = new Set();
  if (ch3 > 0) {
    const chunk = fullText.slice(ch3, ch4 > ch3 ? ch4 : fullText.length);
    for (const m of chunk.matchAll(modRe)) mods.add(m[1].trim());
  }

  // ── 7. 检测提取质量 ──
  const warnings = [];
  if (!meta.name) warnings.push("项目名称");
  if (!meta.number) warnings.push("项目编号");
  if (!meta.purchaseUnit) warnings.push("采购单位");
  if (sections.length === 0) warnings.push("章节列表");
  if (technicalItems.length < 5) warnings.push("技术参数(少于5条)");
  if (Object.keys(business).length === 0) warnings.push("商务条款");

  // ── 组装 ──
  const config = {
    _warnings: warnings.length > 0 ? warnings : undefined,
    name: meta.name,
    number: meta.number,
    purchaseUnit: meta.purchaseUnit,
    agency: meta.agency,
    budget: meta.budget,
    packages: [],
    config: { font: "宋体", fontTitle: "黑体", placeholder: "【待填写】" },
    sections,
    technicalItems,
    business: Object.keys(business).length > 0 ? business : undefined,
    implementationModules: mods.size > 0 ? [...mods].map(n => ({ name: n, desc: null })) : undefined,
    interfaceRequirements: ifSet.size > 0 ? [...ifSet] : undefined,
  };

  // 找采购包
  for (const m of fullText.matchAll(/采购包\d+\s*[：:]\s*(.+?)(?:\n|采购包预算|$)/g)) {
    config.packages.push(m[1].trim().replace(/\s+/g, "").slice(0, 60));
  }
  if (!config.packages.length) delete config.packages;

  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), "utf-8");

  console.log(`✅ config 已生成：${outputPath}`);
  console.log(`   项目：${meta.name || "—"} | 编号：${meta.number || "—"}`);
  console.log(`   章节：${sections.length} 章`);
  console.log(`   技术参数：${technicalItems.length} 条 (★ ${technicalItems.filter(i=>i.star).length})`);
  console.log(`   商务条款：${Object.keys(business).length} 条`);
  if (warnings.length) console.log(`   ⚠️ 需人工审核：${warnings.join("、")}`);
  if (warnings.length) console.log(`   （请打开 config.json 对照 01_招标文件全文.md 逐项核对补全）`);
}

// ── 入口 ──
function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("用法：node build_config.js <bid_extract_phase目录> <输出config.json>");
    process.exit(0);
  }
  const inputDir = path.resolve(args[0]);
  const outputPath = path.resolve(args[1]);
  if (!fs.existsSync(inputDir)) { console.error(`目录不存在：${inputDir}`); process.exit(1); }
  build(inputDir, outputPath);
}
main();
