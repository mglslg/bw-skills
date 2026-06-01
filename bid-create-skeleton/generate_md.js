/**
 * 投标文件 MD 骨架生成器
 * 用法：node generate_md.js <config.json> <output_dir>
 *
 * 所有产出写入 output_dir，不动原始数据目录。
 */

const fs = require("fs");
const path = require("path");

const PH = "【待填写】";

const CN = [
  "一","二","三","四","五","六","七","八","九","十",
  "十一","十二","十三","十四","十五","十六","十七","十八","十九","二十",
  "二十一","二十二","二十三","二十四","二十五","二十六","二十七","二十八","二十九","三十",
];

// ── Markdown 辅助 ──
function ch(n) { return CN[n] || String(n+1); }

function anchorId(n) { return `ch${String(n+1).padStart(2,"0")}`; }

function chapter(n, title) {
  return `\n# <a id="${anchorId(n)}"></a>第${ch(n)}章  ${title}\n`;
}

function tocLink(n, title) {
  return `[第${ch(n)}章  ${title}](#${anchorId(n)})`;
}

function mdTable(headers, rows) {
  let t = "| " + headers.join(" | ") + " |\n";
  t += "| " + headers.map(() => "---").join(" | ") + " |\n";
  for (const row of rows) t += "| " + row.map(c => c || PH).join(" | ") + " |\n";
  return t;
}

// ── 各章节 ──
function cover(pj) {
  let m = `# ${pj.name || PH}\n\n`;
  m += `## 投标文件\n\n`;
  m += `**（正本/副本）**\n\n---\n\n`;
  m += `- 项目编号：${pj.number || PH}\n- 项目名称：${pj.name || PH}\n`;
  if (pj.packages?.[0]) m += `- 采购包：${pj.packages[0]}\n`;
  m += `\n**${PH}（盖章）**\n\n${PH}\n`;
  return m;
}

function toc(secs) {
  let m = `# 目  录\n\n`;
  secs.forEach((s, i) => m += `- ${tocLink(i, s.title)}\n`);
  return m;
}

function commitment(pj, i) {
  let m = chapter(i, "投标承诺书");
  m += `致：${pj.purchaseUnit || PH}（采购单位）和${pj.agency || PH}（采购代理机构）\n\n`;
  m += `你方组织的 **${pj.name || PH}**（项目编号：${pj.number || PH}），我方自愿参与投标，郑重承诺如下：\n\n`;
  [
    "一、完全理解并接受该项目招标文件的所有要求。",
    "二、严格遵守《中华人民共和国政府采购法》《中华人民共和国民法典》及相关法律法规规定，如有违反承担相应法律责任。",
    "三、最终报价为开标一览表中的投标总报价，在投标有效期和合同有效期内固定不变。",
    "四、同意招标文件关于投标有效期的规定。",
    "五、同意提供贵方要求的与投标有关的任何数据和资料。",
    "六、按照招标文件、投标文件等要求签订并严格执行政府采购合同。",
    "七、投标报价已包含应向知识产权所有权人支付的所有相关税费，并保证采购人在中国使用我方提供的货物时，如有第三方提出侵犯其知识产权主张的，责任由我方承担。",
    "八、承诺未为本项目提供整体设计、规范编制或者项目管理、监理、检测等服务。",
    "九、投标文件内容全部真实有效，如有虚假或隐瞒，愿意承担一切法律责任。",
    "十、若中标，愿意按有关规定及招标文件要求缴纳招标代理服务费。",
  ].forEach(s => m += s + "\n\n");
  m += `---\n\n- 详细地址：${PH}\n- 邮政编码：${PH}\n- 电话：${PH}\n- 电子邮箱：${PH}\n- 开户银行：${PH}\n- 账号/行号：${PH}\n\n`;
  m += `**${PH}（盖章）**\n\n法定代表人或授权委托人（签字）：${PH}\n\n${PH}\n`;
  return m;
}

function bidOpen(pj, i) {
  let m = chapter(i, "开标一览表（报价表）");
  m += mdTable(["序号","采购项目名称/包名称","总价（元）","交货或服务期","交货或服务地点"],
    [["1", pj.name || PH, PH, pj.business?.deadline || PH, pj.business?.location || PH]]);
  m += `\n投标人名称（盖章）：${PH}\n\n日期：${PH}\n`;
  return m;
}

function pricing(pj, i) {
  const hdrs = pj.tables?.pricing?.headers || ["品目号","序号","服务名称","服务范围","服务要求","服务时间","服务标准","单价","数量","总价"];
  let m = chapter(i, "分项报价表");
  m += `货币及单位：人民币/元\n\n`;
  m += mdTable(hdrs, [hdrs.map(() => PH), hdrs.map(() => PH)]);
  m += `\n*注：表格内容需根据实际报价填写。*\n\n投标人名称（盖章）：${PH}\n\n日期：${PH}\n`;
  return m;
}

function auth(pj, i) {
  let m = chapter(i, "授权委托书");
  m += `本人 **${PH}**（姓名）系 **${PH}**（投标人名称）的法定代表人，现委托 **${PH}**（姓名）为我方代理人，参加 **${pj.name || PH}**（项目编号：${pj.number || PH}）的招标。代理人以我方名义签署、澄清确认、递交、撤回、修改投标文件、签订合同和处理有关事宜，其法律后果由我方承担。委托期限：**${PH}**\n\n`;
  m += "代理人无转委托权。\n\n";
  m += `投 标 人（盖章）：${PH}\n\n法定代表人（签字）：${PH}\n\n授权委托人（签字）：${PH}\n\n`;
  m += "*(法定代表人身份证扫描件附后)*\n\n*(授权委托人身份证扫描件附后)*\n\n";
  m += `${PH}\n`;
  return m;
}

function company(pj, i) {
  const f = pj.tables?.companyProfile || [
    ["投标人名称",PH],["注册资金",PH],["注册地",PH],["注册时间",PH],
    ["法定代表人",PH],["联系电话",PH],["技术负责人",PH],["联系电话",PH],
    ["开户银行",PH],["开户银行账号",PH],["主营范围",PH],["企业资质",PH],
  ];
  return chapter(i, "投标人基本情况表") + mdTable(["项目","内容"], f);
}

function bizCommit(pj, i) {
  const b = pj.business || {};
  let m = chapter(i, "主要商务要求承诺书");
  m += `我公司承诺完全满足 **${pj.name || PH}**（项目编号：${pj.number || PH}）招标文件所有主要商务条款要求：\n\n`;
  m += `| 商务条款 | 承诺内容 |\n|---|---|\n`;
  m += `| 标的提供时间 | ${b.deadline || PH} |\n`;
  m += `| 标的提供地点 | ${b.location || PH} |\n`;
  m += `| 付款方式 | ${b.payment || PH} |\n`;
  m += `| 验收要求 | ${b.acceptance || PH} |\n`;
  m += `| 履约保证金 | ${b.bond || PH} |\n`;
  m += `\n如有优于招标文件主要商务要求的，请在此说明。特此承诺。\n\n**${PH}（盖章）**\n\n${PH}\n`;
  return m;
}

function techTable(pj, i) {
  const items = pj.technicalItems || [];
  let m = chapter(i, "技术偏离表");
  if (!items.length) { m += `【请根据招标文件技术要求手动填写】\n${PH}\n`; return m; }

  const rows = items.map((it, idx) => [
    String(idx+1), pj.packages?.[0] || PH,
    (it.star ? "★ " : "") + (it.spec || PH),
    PH, PH, it.star ? "实质性条款" : PH,
  ]);
  m += mdTable(["序号","标的名称","招标技术要求","投标响应内容","偏离程度","备注"], rows);
  m += `\n> **说明：** 1. "招标技术要求"栏已根据招标文件原文列明。2. "投标响应内容"栏须填写明确响应内容。3. "偏离程度"栏填写满足/正偏离/负偏离。4. ★为实质性条款。5. 本表与分项报价表不一致的，以分项报价表为准。\n`;
  m += `\n投标人名称（盖章）：${PH}\n\n${PH}\n`;
  return m;
}

function team(pj, i) {
  const hdrs = pj.tables?.team?.headers || ["序号","姓名","本项目拟任职务","学历","职称或执业资格","身份证号","联系电话"];
  const rows = Array.from({length:8}, (_,idx) => [String(idx+1), ...hdrs.slice(1).map(() => PH)]);
  let m = chapter(i, "项目组成人员一览表");
  m += mdTable(hdrs, rows);
  m += `\n> **说明：** 1. "本项目拟任职务"栏包括项目负责人、项目联系人、项目服务人员或技术人员等。2. 中标后须按本表人员操作，不得随意更换。3. 在本表后附相关人员证书。\n`;
  return m;
}

function implPlan(pj, i) {
  let m = chapter(i, "项目实施方案、质量保证及售后服务承诺等");

  // 实施方案
  m += `\n## 一、项目实施方案\n`;
  if (pj.implementationModules?.length) {
    for (const mod of pj.implementationModules)
      m += `### ${mod.name}\n\n${mod.desc || PH}\n\n`;
  } else { m += `${PH}\n\n`; }

  // 接口改造
  if (pj.interfaceRequirements?.length) {
    m += `## 二、接口改造与系统集成方案\n`;
    for (const s of pj.interfaceRequirements) m += `- ${s}\n`;
    m += `\n${PH}\n\n`;
  }

  m += `## 三、质量保证措施\n${PH}\n\n`;
  m += `## 四、项目进度计划\n`;
  if (pj.business?.deadline) m += `总工期：${pj.business.deadline}\n\n`;
  m += `${PH}\n\n`;
  m += `## 五、售后服务承诺\n`;
  if (pj.business?.warranty) m += `免费维护期：${pj.business.warranty}\n\n`;
  m += `${PH}\n\n`;
  m += `## 六、培训方案\n${PH}\n`;
  return m;
}

function perf(pj, i) {
  const hdrs = pj.tables?.performance?.headers || ["序号","使用单位","业绩名称","合同总价（元）","签订时间"];
  const rows = Array.from({length:6}, (_,idx) => [String(idx+1), ...hdrs.slice(1).map(() => PH)]);
  let m = chapter(i, "投标人业绩情况表");
  m += mdTable(hdrs, rows);
  m += `\n> 投标人根据上述业绩情况后附销售或服务合同复印件。\n`;
  return m;
}

function generic(i, title, hint) {
  return chapter(i, title) + `${hint || "（按要求提供相关证明材料，格式自拟）"}\n\n${PH}\n`;
}

// ── 路由 ──
function route(pj, sec, i) {
  const t = sec.title;
  if (/承诺书|承诺函/.test(t)) return commitment(pj, i);
  if (/开标一览/.test(t)) return bidOpen(pj, i);
  if (/分项报价/.test(t)) return pricing(pj, i);
  if (/授权委托/.test(t)) return auth(pj, i);
  if (/基本情况表/.test(t)) return company(pj, i);
  if (/商务要求承诺/.test(t)) return bizCommit(pj, i);
  if (/技术偏离|技术条款/.test(t)) return techTable(pj, i);
  if (/项目组成人员|人员一览/.test(t)) return team(pj, i);
  if (/项目实施方案|实施方案|质量保证|售后服务/.test(t)) return implPlan(pj, i);
  if (/业绩情况|业绩表/.test(t)) return perf(pj, i);
  return generic(i, t, sec.content);
}

// ── 默认章节（匹配 附件/目录.docx 模板） ──
const DEFAULT_SECTIONS = [
  "投标承诺书","开标一览表（报价表）","分项报价表","授权委托书","缴纳投标保证金证明材料",
  "投标人基本情况表","具有独立承担民事责任的能力的证明材料","具有良好的商业信誉和健全的财务会计制度的相关材料",
  "依法缴纳税收和社会保障资金的良好记录的相关材料","具有履行合同所必需的设备和专业技术能力的证明材料",
  "参加政府采购活动前三年内在经营活动中没有重大违法记录的书面声明","联合体协议书",
  "中小企业声明函","监狱企业证明文件","残疾人福利性单位声明函","主要商务要求承诺书",
  "技术偏离表","项目组成人员一览表","项目实施方案、质量保证及售后服务承诺等","投标人业绩情况表","其他证明材料",
].map(t => ({ title: t }));

// ── 主函数 ──
function generate(configPath, outputDir) {
  const pj = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const secs = pj.sections || DEFAULT_SECTIONS;
  fs.mkdirSync(outputDir, { recursive: true });

  let md = `# ${pj.name || "投标文件"}（投标文件骨架）\n\n`;
  md += `> 项目编号：${pj.number || PH}  \n> 采购单位：${pj.purchaseUnit || PH}  \n`;
  md += `> 代理机构：${pj.agency || PH}  \n> 生成日期：${new Date().toISOString().slice(0,10)}\n\n`;
  md += `---\n\n`;

  // 封面
  md += cover(pj) + "\n\\newpage\n\n";

  // 目录（匹配模板格式）
  md += toc(secs) + "\n\\newpage\n\n";

  // 各章节
  for (let i = 0; i < secs.length; i++) {
    md += route(pj, { ...secs[i], title: secs[i].title }, i);
    if (i < secs.length - 1) md += "\n\\newpage\n\n";
  }

  const out = path.join(outputDir, "投标文件骨架.md");
  fs.writeFileSync(out, md, "utf-8");
  console.log(`✅ MD 骨架：${out}  (${(md.length/1024).toFixed(1)} KB, ${secs.length} 章)`);
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) { console.log("用法：node generate_md.js <config.json> <output_dir>"); process.exit(0); }
  generate(path.resolve(args[0]), path.resolve(args[1]));
}
main();
