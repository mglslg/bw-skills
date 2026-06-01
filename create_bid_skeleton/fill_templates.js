/**
 * 模板填充器 — 保留原始 docx 样式，只替换文本
 *
 * 用法：
 *   node fill_templates.js <templates_dir> <mapping.json> <output_dir>
 *
 * mapping.json 结构：
 * {
 *   "封面.docx": { "（项目名称）": "医保智能管理系统服务", "（由供应商填写）": "NMGZC-J-F-260219" },
 *   "技术偏离表.docx": { "（由供应商填写）": "..." }
 * }
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── 核心：替换 docx XML 中的文本 ──
function fillOne(templatePath, mapping, outputPath) {
  const tmp = outputPath + ".tmp";
  fs.mkdirSync(tmp, { recursive: true });

  // 1. 解压
  // docx 本质是 zip，用 python 处理（避免额外依赖）
  const fillScript = `
import zipfile, os, sys, shutil

template = sys.argv[1]
mapping = ${JSON.stringify(mapping)}
output = sys.argv[2]
tmp = output + '.tmp'

with zipfile.ZipFile(template) as z:
    z.extractall(tmp)

# 替换 word/document.xml
doc_xml = os.path.join(tmp, 'word', 'document.xml')
if os.path.exists(doc_xml):
    with open(doc_xml, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in mapping.items():
        content = content.replace(old, new)
    with open(doc_xml, 'w', encoding='utf-8') as f:
        f.write(content)

# 重新打包
os.makedirs(os.path.dirname(output) or '.', exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zout:
    for root, dirs, files in os.walk(tmp):
        for fn in files:
            full = os.path.join(root, fn)
            arc = os.path.relpath(full, tmp).replace('\\\\', '/')
            zout.write(full, arc)

shutil.rmtree(tmp)
print('OK: ' + output)
  `.trim();

  const scriptPath = outputPath + "_fill.py";
  fs.writeFileSync(scriptPath, fillScript, "utf-8");
  execSync(`python3 "${scriptPath}" "${templatePath}" "${outputPath}"`, { stdio: "pipe" });
  fs.unlinkSync(scriptPath);
}

// ── 自动发现模板中的占位文本 ──
function discoverPlaceholders(templatePath) {
  const script = `
import zipfile, re, sys, os, json

with zipfile.ZipFile(sys.argv[1]) as z:
    doc = z.read('word/document.xml').decode('utf-8')

# 找所有 w:t 文本
texts = re.findall(r'<w:t[^>]*>(.*?)</w:t>', doc)
# 找含中文括号占位符的： （xxx）
placeholders = [t for t in texts if '（' in t and '）' in t and len(t) < 80]
# 也找 (xxx) 英文括号
placeholders += [t for t in texts if '(' in t and ')' in t and len(t) < 80 and t not in placeholders]
# 去重
placeholders = list(set(placeholders))

result = {p: None for p in placeholders}
print(json.dumps(result, ensure_ascii=False, indent=2))
  `.trim();
  const scriptPath = templatePath + "_discover.py";
  fs.writeFileSync(scriptPath, script, "utf-8");
  const out = execSync(`python3 "${scriptPath}" "${templatePath}"`, { encoding: "utf-8" });
  fs.unlinkSync(scriptPath);
  return JSON.parse(out);
}

// ── 批量填充 ──
function fillAll(templatesDir, mapping, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const results = [];

  for (const [filename, map] of Object.entries(mapping)) {
    if (!map || Object.keys(map).length === 0) continue;
    const tpl = path.join(templatesDir, filename);
    const out = path.join(outputDir, filename);
    if (!fs.existsSync(tpl)) {
      console.log(`⚠️ 跳过（模板不存在）：${filename}`);
      continue;
    }
    fillOne(tpl, map, out);
    results.push(filename);
  }
  return results;
}

// ── 入口 ──
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "discover") {
    // 发现模式：扫描模板中的占位符
    const tplDir = args[1] || ".";
    const files = fs.readdirSync(tplDir).filter(f => f.endsWith(".docx"));
    const all = {};
    for (const f of files) {
      const tpl = path.join(tplDir, f);
      try {
        const p = discoverPlaceholders(tpl);
        if (Object.keys(p).length > 0) {
          all[f] = p;
          console.log(`📄 ${f}: ${Object.keys(p).length} 个占位符`);
          for (const k of Object.keys(p)) console.log(`   → ${k}`);
        }
      } catch (e) { console.error(`❌ ${f}: ${e.message}`); }
    }
    if (Object.keys(all).length > 0) {
      const outPath = path.join(tplDir, "discovered_placeholders.json");
      fs.writeFileSync(outPath, JSON.stringify(all, null, 2), "utf-8");
      console.log(`\n✅ 已保存占位符映射：${outPath}`);
    }
    return;
  }

  // 填充模式
  const templatesDir = path.resolve(args[0]);
  const mappingPath = path.resolve(args[1]);
  const outputDir = path.resolve(args[2] || path.join(path.dirname(mappingPath), "filled"));

  if (!fs.existsSync(mappingPath)) { console.error(`映射文件不存在：${mappingPath}`); process.exit(1); }

  const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
  const results = fillAll(templatesDir, mapping, outputDir);

  console.log(`\n✅ 已完成 ${results.length} 个模板填充 → ${outputDir}`);
  for (const f of results) console.log(`   ${f}`);
}

main();
