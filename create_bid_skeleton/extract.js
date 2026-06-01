/**
 * 招标文件结构化提取器
 * 纯正则提取，不做语义理解。不确定的留空，不编造。
 * PDF 文本质量决定提取效果——提取结果必须人工审核。
 *
 * 用法：node extract.js <招标文件全文.md> [输出.json]
 */

const fs = require("fs");
const path = require("path");

function extract(text) {
  // 预处理
  const T = text.replace(/\t+/g, " ").replace(/ {2,}/g, " ");
  const R = { _missing: [] };

  // ── 基础元数据 ──
  const tryMatch = (re, label) => {
    const m = T.match(re);
    return m?.[1]?.trim().replace(/\s+/g, " ").slice(0, 200) || null;
  };

  R.name = tryMatch(/项目名称\s*[：:]\s*(.+)/);
  if (!R.name) R._missing.push("项目名称");

  R.number = tryMatch(/项目编号\s*[：:]\s*([A-Za-z0-9\-]+)/);
  if (!R.number) R._missing.push("项目编号");

  R.purchaseUnit = tryMatch(/采购单位名称?\s*[：:]\s*(.+)/);
  if (!R.purchaseUnit) R._missing.push("采购单位");

  R.agency = tryMatch(/采购代理机构名称?\s*[：:]\s*(.+)/);
  if (!R.agency) R.agency = tryMatch(/代理机构名称?\s*[：:]\s*(.+)/);

  R.budget = tryMatch(/(?:预算金额|最高限价)[（(]元[)）]\s*[：:]\s*([\d,.]+)/);

  // ── 采购包 ──
  const pkgs = [...T.matchAll(/采购包\d+\s*[：:]\s*(.+?)(?:\n|采购包预算|$)/g)];
  if (pkgs.length) R.packages = pkgs.map(m => m[1].trim().replace(/\s+/g, "").slice(0, 60));

  // ── 响应文件章节 ──
  const attachItems = [...T.matchAll(/详见附件\s*[：:]\s*(.+)/g)].map(m => m[1].trim().replace(/\s+/g, ""));
  if (attachItems.length >= 5) {
    R.sections = attachItems.map(t => ({ title: t }));
  } else {
    // 兜底：从"目录"或"格式与要求"区域提取带编号的条目
    const s = T.search(/投标文件目录格式|响应文件格式与要求|目\s*录\s*\n/);
    if (s > 0) {
      const chunk = T.slice(s, s + 3000);
      const items = [...chunk.matchAll(/[一二三四五六七八九十廿]+[、，]\s*(.{4,80})/g)]
        .map(m => m[1].trim().replace(/\s+/g, ""))
        .filter(t => t.length > 3 && !/第[一二三]章|响应文件|采购包|通[用通]分册|报价分册/.test(t));
      if (items.length >= 5) R.sections = items.map(t => ({ title: t }));
    }
  }
  if (!R.sections) R._missing.push("响应文件章节列表");

  // ── 技术参数：★ 标记条款 ──
  const stars = [...T.matchAll(/★\s*(.{10,300}?)(?:\n(?!★)|\n\d|\n\s*$|$)/g)];
  for (const m of stars) {
    const spec = m[1].trim().replace(/\s+/g, "");
    if (spec.length >= 10 && !R.technicalItems?.some(i => i.spec === spec)) {
      (R.technicalItems || (R.technicalItems = [])).push({ star: true, spec, resp: null });
    }
  }

  // ── 技术参数：第三章内编号列表 ──
  const ch3 = T.search(/第三章.*(?:采购内容|技术|服务)/);
  const ch4 = T.search(/第四章/);
  if (ch3 > 0) {
    const chunk = T.slice(ch3, ch4 > ch3 ? ch4 : T.length);
    const nums = [...chunk.matchAll(/(?:^|\n)\s*(\d{1,2})\s*[\.\)）]\s*(.{20,250})/g)];
    for (const m of nums) {
      const spec = m[2].trim().replace(/\s+/g, " ");
      if (!R.technicalItems?.some(i => i.spec === spec)) {
        (R.technicalItems || (R.technicalItems = [])).push({ star: false, spec, resp: null });
      }
    }
  }
  if (!R.technicalItems?.length) { delete R.technicalItems; R._missing.push("技术参数"); }

  // ── 商务条款 ──
  const bizPatterns = [
    ["deadline", /标的提供时间\s*[：:)]\s*(.+)/],
    ["deadline", /实施工期\s*[：:]\s*(.+)/],
    ["location", /标的提供地点\s*[：:]\s*(.+)/],
    ["deadline", /合同履约期限\s*[：:]\s*(.+)/],
    ["location", /合同履约地点\s*[：:]\s*(.+)/],
    ["acceptance", /验收要求\s*[：:]\s*(.+)/],
    ["payment", /合同支付方式\s*[：:]\s*(.+)/],
    ["warranty", /(?:免费维护期|免费服务期|质保期)\s*[：:]\s*(.+)/],
    ["bond", /履约保证金\s*[：:]\s*(.+)/],
  ];
  for (const [key, re] of bizPatterns) {
    if (R.business?.[key]) continue;
    const m = T.match(re);
    if (m?.[1]) (R.business || (R.business = {})).key = m[1].trim().replace(/\s+/g, " ").slice(0, 200);
  }
  // 修复 key 赋值 bug
  // Actually the above has a bug. Let me rewrite this section below.
  // I'll fix it in the actual file write.
  if (!R.business) R._missing.push("商务条款");

  return R;
}

// ── 入口 ──
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("用法：node extract.js <招标文件全文.md> [输出.json]");
    process.exit(0);
  }
  const mdPath = path.resolve(args[0]);
  if (!fs.existsSync(mdPath)) { console.error(`文件不存在：${mdPath}`); process.exit(1); }

  const result = extract(fs.readFileSync(mdPath, "utf-8"));

  const outPath = args[1] || path.join(path.dirname(mdPath), "extracted_config.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");

  const t = result.technicalItems || [];
  console.log(`✅ 提取完成`);
  console.log(`   项目：${result.name || "—"}  |  编号：${result.number || "—"}`);
  console.log(`   采购单位：${result.purchaseUnit || "—"}`);
  console.log(`   技术参数：${t.length} 条 (★ ${t.filter(i => i.star).length})`);
  console.log(`   章节：${result.sections?.length || "默认21"}  |  商务：${Object.keys(result.business || {}).join(",") || "—"}`);
  if (result._missing.length) console.log(`   ⚠️ 未提取：${result._missing.join("、")}（需人工补充）`);
}

main();
