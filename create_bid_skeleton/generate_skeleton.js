/**
 * 投标文件 DOCX 骨架生成器
 * 用法：node generate_skeleton.js <config.json> <output_dir>
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel,
        AlignmentType, Table, TableRow, TableCell, Header,
        Footer, PageNumber, PageBreak, TableOfContents,
        WidthType, BorderStyle } = require("docx");
const fs = require("fs");
const path = require("path");

const D = { font: "宋体", fontTitle: "黑体", szTitle: 36, szH1: 32, szH2: 28, szBody: 24, szSmall: 20, placeholder: "【待填写】" };
const CN = ["一","二","三","四","五","六","七","八","九","十","十一","十二","十三","十四","十五","十六","十七","十八","十九","二十","二十一","二十二","二十三","二十四","二十五","二十六","二十七","二十八","二十九","三十"];
const B = { top:{style:BorderStyle.SINGLE,size:1,color:"000000"}, bottom:{style:BorderStyle.SINGLE,size:1,color:"000000"}, left:{style:BorderStyle.SINGLE,size:1,color:"000000"}, right:{style:BorderStyle.SINGLE,size:1,color:"000000"}, insideHorizontal:{style:BorderStyle.SINGLE,size:1,color:"000000"}, insideVertical:{style:BorderStyle.SINGLE,size:1,color:"000000"} };

function H(cfg) {
  const PH = cfg?.placeholder || D.placeholder, F = cfg?.font || D.font, FT = cfg?.fontTitle || D.fontTitle;
  const p = (t, o = {}) => new Paragraph({ children: typeof t==="string" ? [new TextRun({ text:t, bold:o.bold||false, size:o.size||D.szBody, font:o.font||F })] : t, alignment: o.align||AlignmentType.LEFT, spacing: o.spacing||{line:360}, indent: o.indent });
  const pc = (t, o={}) => p(t, {...o, align:AlignmentType.CENTER});
  const hd = (t, isH1=true) => new Paragraph({
    heading: isH1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    children: [new TextRun({ text:t, bold:true, size:isH1?D.szH1:D.szH2, font:FT, color:"000000" })],
    spacing: {before:300,after:200,line:360},
  });
  const el = () => new Paragraph({text:"",spacing:{line:240}});
  const pb = () => new Paragraph({children:[new PageBreak()]});
  const tc = (t, o={}) => new TableCell({ width:o.w?{size:o.w,type:WidthType.PERCENTAGE}:undefined, columnSpan:o.cs, rowSpan:o.rs, shading:o.sh?{fill:o.sh}:undefined, children:[new Paragraph({alignment:o.align||AlignmentType.CENTER,spacing:{line:300},children:[new TextRun({text:String(t||PH),bold:o.bold||false,size:D.szSmall,font:F})]})] });
  const tcl = (t,o={}) => tc(t,{...o,align:AlignmentType.LEFT});
  const tbl = (hds,rows,ws) => new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:B,rows:[new TableRow({children:hds.map((h,i)=>tc(h,{bold:true,w:ws[i],sh:"D9E2F3"}))}),...rows.map(r=>new TableRow({children:r.map((c,i)=>tcl(c||PH,{w:ws[i]}))}))]});
  return {p,pc,hd,el,pb,tc,tcl,tbl,PH,F,FT};
}

function ch(n) { return CN[n]||String(n+1); }

// ── 封面 ──
function cover(h, pj) {
  const xs=[]; for(let i=0;i<6;i++) xs.push(h.el());
  xs.push(h.pc(pj.name||h.PH,{size:D.szTitle,bold:true,font:h.FT}));
  xs.push(h.el(),h.el(),h.pc("投标文件",{size:48,bold:true,font:h.FT}),h.el(),h.pc("（正本/副本）"));
  for(let i=0;i<12;i++) xs.push(h.el());
  xs.push(h.pc(`项目编号：${pj.number||h.PH}`), h.pc(`项目名称：${pj.name||h.PH}`));
  if(pj.packages?.[0]) xs.push(h.pc(`采购包：${pj.packages[0]}`));
  for(let i=0;i<6;i++) xs.push(h.el());
  xs.push(h.pc(`${h.PH}（盖章）`,{bold:true}), h.pc(h.PH));
  return xs;
}

// ── 目录（TOC 域代码，Ctrl+A F9 刷新即显示页码 + Ctrl+点击跳转） ──
function toc(h) {
  return [
    h.pc("目  录",{bold:true,size:D.szH1,font:h.FT}),
    h.el(),
    new TableOfContents("目录", { hyperlink: true, headingStyleRange: "1-2" }),
    h.p("（打开后请按 Ctrl+A 再按 F9 刷新目录域，即可显示页码）", {size:D.szSmall}),
  ];
}

// ── 每章标题（居中） ──
function chap(h, i, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `第${ch(i)}章  ${title}`, bold:true, size:D.szH1, font:h.FT, color:"000000" })],
    spacing: {before:300,after:200,line:360},
  });
}

function generic(h, i, title, hint) { return [chap(h,i,title), h.el(), h.p(hint||"（按要求提供相关证明材料，格式自拟）"), h.p(h.PH)]; }

function commitment(h, pj, i) {
  return [chap(h,i,"投标承诺书"),h.el(),
    h.p(`致：${pj.purchaseUnit||h.PH}（采购单位）和${pj.agency||h.PH}（采购代理机构）`),h.el(),
    h.p(`你方组织的 ${pj.name||h.PH}（项目编号：${pj.number||h.PH}），我方自愿参与投标，郑重承诺如下：`),h.el(),
    ...["一、完全理解并接受该项目招标文件的所有要求。","二、严格遵守《中华人民共和国政府采购法》《中华人民共和国民法典》及相关法律法规规定。","三、最终报价为开标一览表中的投标总报价，在投标有效期和合同有效期内固定不变。","四、同意招标文件关于投标有效期的规定。","五、同意提供贵方要求的与投标有关的任何数据和资料。","六、按照招标文件、投标文件等要求签订并严格执行政府采购合同。","七、投标报价已包含知识产权相关税费。","八、承诺未为本项目提供整体设计、规范编制或者项目管理、监理、检测等服务。","九、投标文件内容全部真实有效。","十、若中标，按有关规定及招标文件要求缴纳招标代理服务费。"].map(s=>h.p(s)),
    h.el(),h.el(),
    ...[`详细地址：${h.PH}`,`邮政编码：${h.PH}  电话：${h.PH}`,`电子邮箱：${h.PH}`,`开户银行：${h.PH}`,`账号/行号：${h.PH}`].map(s=>h.p(s)),
    h.el(),h.el(),h.pc(`${h.PH}（盖章）`),h.pc(`法定代表人或授权委托人（签字）：${h.PH}`),h.pc(h.PH)];
}

function bidOpen(h, pj, i) {
  return [chap(h,i,"开标一览表（报价表）"),h.el(),h.pc("开标一览表",{bold:true,size:D.szH2}),h.el(),
    h.tbl(["序号","采购项目名称/包名称","总价（元）","交货或服务期","交货或服务地点"], [["1",pj.name||h.PH,h.PH,pj.business?.deadline||h.PH,pj.business?.location||h.PH]], ["5%","35%","20%","20%","20%"]),
    h.el(),h.p(`投标人名称（盖章）：${h.PH}`),h.p(`日期：${h.PH}`)];
}

function pricing(h, pj, i) {
  const hs=pj.tables?.pricing?.headers||["品目号","序号","服务名称","服务范围","服务要求","服务时间","服务标准","单价","数量","总价"];
  const ws=pj.tables?.pricing?.widths||["8%","5%","17%","15%","15%","10%","10%","7%","5%","8%"];
  return [chap(h,i,"分项报价表"),h.el(),h.pc("分项报价表",{bold:true,size:D.szH2}),h.el(),
    h.p("货币及单位：人民币/元"),h.el(),h.tbl(hs,[hs.map(()=>h.PH),hs.map(()=>h.PH)],ws),
    h.el(),h.p("*表格内容需根据实际报价填写。"),h.el(),h.p(`投标人名称（盖章）：${h.PH}`),h.p(`日期：${h.PH}`)];
}

function auth(h, pj, i) {
  return [chap(h,i,"授权委托书"),h.el(),
    h.p(`本人 ${h.PH}（姓名）系 ${h.PH}（投标人名称）的法定代表人，现委托 ${h.PH}（姓名）为我方代理人，参加 ${pj.name||h.PH}（项目编号：${pj.number||h.PH}）的招标。委托期限：${h.PH}`),h.el(),
    h.p("代理人无转委托权。"),h.el(),h.el(),
    h.p(`投 标 人（盖章）：${h.PH}`),h.p(`法定代表人（签字）：${h.PH}`),h.p(`授权委托人（签字）：${h.PH}`),h.el(),
    h.pc("（法定代表人身份证扫描件附后）"),h.el(),h.pc("（授权委托人身份证扫描件附后）"),h.el(),h.el(),h.pc(h.PH)];
}

function company(h, pj, i) {
  const f = pj.tables?.companyProfile||[["投标人名称",h.PH],["注册资金",h.PH],["注册地",h.PH],["注册时间",h.PH],["法定代表人",h.PH],["联系电话",h.PH],["技术负责人",h.PH],["联系电话",h.PH],["开户银行",h.PH],["开户银行账号",h.PH],["主营范围",h.PH],["企业资质",h.PH]];
  return [chap(h,i,"投标人基本情况表"),h.el(),h.tbl(["项目","内容"],f,["30%","70%"])];
}

function bizCommit(h, pj, i) {
  const b=pj.business||{};
  return [chap(h,i,"主要商务要求承诺书"),h.el(),h.pc("主要商务要求承诺书",{bold:true,size:D.szH2}),h.el(),
    h.p(`我公司承诺完全满足 ${pj.name||h.PH}（项目编号：${pj.number||h.PH}）招标文件所有主要商务条款要求：`),h.el(),
    h.p(`标的提供时间：${b.deadline||h.PH}`),h.p(`标的提供地点：${b.location||h.PH}`),
    h.p(`付款方式：${b.payment||h.PH}`),h.p(`验收要求：${b.acceptance||h.PH}`),
    h.p(`履约保证金：${b.bond||h.PH}`),h.el(),
    h.p("如有优于招标文件主要商务要求的，请在此说明。特此承诺。"),h.el(),h.el(),
    h.p(`投标人名称（盖章）：${h.PH}`),h.pc(h.PH)];
}

function techTable(h, pj, i) {
  const items=pj.technicalItems||[];
  if(!items.length) return [chap(h,i,"技术偏离表"),h.el(),h.p("【请根据招标文件技术要求手动填写】"),h.p(h.PH)];

  const th=pj.tables?.techDeviation?.headers||["序号","标的名称","招标技术要求","投标响应内容","偏离程度","备注"];
  const tw=pj.tables?.techDeviation?.widths||["4%","10%","30%","30%","13%","13%"];
  const pk=pj.packages?.[0]||h.PH;

  const rows=items.map((it,idx)=>new TableRow({children:[
    h.tc(String(idx+1),{w:tw[0]}),h.tc(pk,{w:tw[1]}),
    h.tc((it.star?"★ ":"")+(it.spec||h.PH),{w:tw[2],align:AlignmentType.LEFT}),
    h.tcl(it.resp||h.PH,{w:tw[3]}),h.tc(h.PH,{w:tw[4]}),
    h.tcl(it.star?"实质性条款":"",{w:tw[5]}),
  ]}));

  return [chap(h,i,"技术偏离表"),h.el(),h.pc("技术偏离表",{bold:true,size:D.szH2}),h.el(),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:B,rows:[
      new TableRow({children:th.map((t,j)=>h.tc(t,{bold:true,w:tw[j],sh:"D9E2F3"}))}),...rows]}),
    h.el(),
    h.p("说明：1. \"招标技术要求\"栏已根据招标文件原文列明。2. \"投标响应内容\"栏须填写明确响应内容。3. \"偏离程度\"栏填写满足/正偏离/负偏离。4. ★为实质性条款，负偏离或不满足导致响应无效。5. 本表与分项报价表不一致的，以分项报价表为准。"),
    h.el(),h.p(`投标人名称（盖章）：${h.PH}`),h.pc(h.PH)];
}

function team(h, pj, i) {
  const hs=pj.tables?.team?.headers||["序号","姓名","本项目拟任职务","学历","职称或执业资格","身份证号","联系电话"];
  const ws=pj.tables?.team?.widths||["5%","12%","18%","10%","18%","22%","15%"];
  const rows=Array.from({length:8},(_,idx)=>[String(idx+1),...hs.slice(1).map(()=>h.PH)]);
  return [chap(h,i,"项目组成人员一览表"),h.el(),h.tbl(hs,rows,ws),h.el(),
    h.p("说明：1.\"本项目拟任职务\"栏包括项目负责人、项目联系人、项目服务人员或技术人员等。2. 中标后须按本表人员操作，不得随意更换。3. 在本表后附相关人员证书。")];
}

function implPlan(h, pj, i) {
  const xs=[chap(h,i,"项目实施方案、质量保证及售后服务承诺等"),h.el()];
  xs.push(h.hd("一、项目实施方案",false),h.el());
  if(pj.implementationModules?.length) for(const m of pj.implementationModules) { xs.push(h.p(m.name,{bold:true})); xs.push(h.p(m.desc||h.PH,{indent:{left:360}})); }
  else xs.push(h.p(h.PH));
  xs.push(h.el());
  if(pj.interfaceRequirements?.length) { xs.push(h.hd("二、接口改造与系统集成方案",false)); for(const s of pj.interfaceRequirements) xs.push(h.p(`• ${s}`)); xs.push(h.p(h.PH),h.el()); }
  xs.push(h.hd("三、质量保证措施",false),h.p(h.PH),h.el());
  xs.push(h.hd("四、项目进度计划",false)); if(pj.business?.deadline) xs.push(h.p(`总工期：${pj.business.deadline}`)); xs.push(h.p(h.PH),h.el());
  xs.push(h.hd("五、售后服务承诺",false)); if(pj.business?.warranty) xs.push(h.p(`免费维护期：${pj.business.warranty}`)); xs.push(h.p(h.PH),h.el());
  xs.push(h.hd("六、培训方案",false),h.p(h.PH));
  return xs;
}

function perf(h, pj, i) {
  const hs=pj.tables?.performance?.headers||["序号","使用单位","业绩名称","合同总价（元）","签订时间"];
  const ws=pj.tables?.performance?.widths||["5%","25%","33%","17%","20%"];
  return [chap(h,i,"投标人业绩情况表"),h.el(),h.tbl(hs,Array.from({length:6},(_,idx)=>[String(idx+1),...hs.slice(1).map(()=>h.PH)]),ws),h.el(),h.p("说明：投标人根据上述业绩情况后附销售或服务合同复印件。")];
}

// ── 路由 ──
function route(h, pj, sec, i) {
  const t=sec.title;
  if(/承诺书|承诺函/.test(t)) return commitment(h,pj,i);
  if(/开标一览/.test(t)) return bidOpen(h,pj,i);
  if(/分项报价/.test(t)) return pricing(h,pj,i);
  if(/授权委托/.test(t)) return auth(h,pj,i);
  if(/基本情况表/.test(t)) return company(h,pj,i);
  if(/商务要求承诺/.test(t)) return bizCommit(h,pj,i);
  if(/技术偏离|技术条款/.test(t)) return techTable(h,pj,i);
  if(/项目组成人员|人员一览/.test(t)) return team(h,pj,i);
  if(/项目实施方案|实施方案|质量保证|售后服务/.test(t)) return implPlan(h,pj,i);
  if(/业绩情况|业绩表/.test(t)) return perf(h,pj,i);
  if(sec.headers) return [chap(h,i,t),h.el(),h.tbl(sec.headers,[sec.headers.map(()=>h.PH)],sec.widths||sec.headers.map(()=>"10%")),h.el(),h.p("【按要求填写】")];
  if(sec.type==="free") return [chap(h,i,t),h.el(),h.p("（内容和格式自拟）"),h.p(h.PH)];
  return generic(h,i,t,sec.content);
}

// ── 默认章节（匹配 附件/目录.docx） ──
const DEF = ["投标承诺书","开标一览表（报价表）","分项报价表","授权委托书","缴纳投标保证金证明材料","投标人基本情况表","具有独立承担民事责任的能力的证明材料","具有良好的商业信誉和健全的财务会计制度的相关材料","依法缴纳税收和社会保障资金的良好记录的相关材料","具有履行合同所必需的设备和专业技术能力的证明材料","参加政府采购活动前三年内在经营活动中没有重大违法记录的书面声明","联合体协议书","中小企业声明函","监狱企业证明文件","残疾人福利性单位声明函","主要商务要求承诺书","技术偏离表","项目组成人员一览表","项目实施方案、质量保证及售后服务承诺等","投标人业绩情况表","其他证明材料"].map(t=>({title:t}));

// ── XML 后处理：强制修正 styles.xml 中 Heading1/2 的颜色为黑色 ──
function fixHeadingColors(inputBuf, outputPath) {
  const { execSync } = require("child_process");
  const tmpDir = outputPath + ".tmpdir";
  const tmpDocx = outputPath + ".tmp.docx";
  fs.writeFileSync(tmpDocx, inputBuf);

  const py = `
import zipfile, os, shutil, sys, re, tempfile
tmp = tempfile.mkdtemp()
with zipfile.ZipFile(sys.argv[1]) as z: z.extractall(tmp)
sp = os.path.join(tmp, 'word', 'styles.xml')
if os.path.exists(sp):
    with open(sp, 'r', encoding='utf-8') as f: c = f.read()
    for i, hid in enumerate(['Heading1','Heading2']):
        def fix_style(m, lvl=i):
            body = m.group(0)
            # 替换所有颜色为黑色
            body = re.sub(r'<w:color[^/]*/>', '<w:color w:val="000000"/>', body)
            # 确保有大纲级别（TOC \\o 开关依赖 w:outlineLvl）
            if '<w:outlineLvl' not in body:
                # 在 <w:rPr> 之前插入 <w:pPr><w:outlineLvl .../></w:pPr>
                body = body.replace('<w:rPr>', '<w:pPr><w:outlineLvl w:val="'+str(lvl)+'"/></w:pPr><w:rPr>', 1)
            return body
        c = re.sub(
            r'<w:style\\s[^>]*w:styleId="'+hid+'"[^>]*>.*?</w:style>',
            fix_style,
            c,
            flags=re.DOTALL
        )
    with open(sp, 'w', encoding='utf-8') as f: f.write(c)
with zipfile.ZipFile(sys.argv[2], 'w', zipfile.ZIP_DEFLATED) as zo:
    for root, dirs, files in os.walk(tmp):
        for fn in files:
            full = os.path.join(root, fn)
            zo.write(full, os.path.relpath(full, tmp).replace('\\\\\\\\', '/'))
shutil.rmtree(tmp)
print('OK')
`.trim();
  fs.writeFileSync(tmpDir + ".py", py, "utf-8");
  execSync(`python3 "${tmpDir}.py" "${tmpDocx}" "${outputPath}"`, { stdio: "pipe" });
  fs.unlinkSync(tmpDir + ".py");
  fs.unlinkSync(tmpDocx);
}

// ── 主函数 ──
async function generate(configPath, outputDir) {
  const pj=JSON.parse(fs.readFileSync(configPath,"utf-8"));
  const cfg={...D,...pj.config};
  const secs=pj.sections||DEF;
  const h=H(cfg);
  fs.mkdirSync(outputDir,{recursive:true});

  const children=[];
  children.push(...toc(h), h.pb());
  for(let i=0;i<secs.length;i++) { children.push(...route(h,pj,{...secs[i],title:secs[i].title},i)); if(i<secs.length-1) children.push(h.pb()); }

  const doc=new Document({creator:h.PH,title:`${pj.name||"项目"} - 投标文件`,sections:[
    {properties:{page:{margin:{top:1440,right:1440,bottom:1440,left:1440}}},children:cover(h,pj)},
    {properties:{page:{margin:{top:1440,right:1440,bottom:1440,left:1440}}},
      headers:{default:new Header({children:[new Paragraph({children:[new TextRun({text:`${pj.name||""} - 投标文件`,size:D.szSmall,font:cfg.font||D.font})],alignment:AlignmentType.RIGHT})]})},
      footers:{default:new Footer({children:[new Paragraph({children:[new TextRun({text:"第 ",size:D.szSmall}),new TextRun({children:[PageNumber.CURRENT],size:D.szSmall}),new TextRun({text:" 页",size:D.szSmall})],alignment:AlignmentType.CENTER})]})},
      children,
    },
  ]});

  let buf = await Packer.toBuffer(doc);

  // 清理旧文件（跳过被锁的），生成新文件
  const base = path.join(outputDir, "投标文件骨架");
  let out = base + ".docx";
  let tries = 0;
  while (tries < 20) {
    try { fs.unlinkSync(out); break; } catch(e) { tries++; out = base + "_" + tries + ".docx"; }
  }

  // 后处理：强制标题颜色为黑色，修复 TOC 可用性
  fixHeadingColors(buf, out);

  const finalSize = fs.statSync(out).size;
  console.log(`✅ DOCX 骨架：${out}  (${(finalSize/1024).toFixed(1)} KB, ${secs.length} 章)`);
  console.log(`   📌 打开后 Ctrl+A → F9 刷新目录，即可显示页码并 Ctrl+点击跳转`);
}

async function main() {
  const args=process.argv.slice(2);
  if(!args.length){console.log("用法：node generate_skeleton.js <config.json> <output_dir>");process.exit(0);}
  const cp=path.resolve(args[0]); if(!fs.existsSync(cp)){console.error(`文件不存在：${cp}`);process.exit(1);}
  await generate(cp,path.resolve(args[1]));
}
main().catch(e=>{console.error("失败：",e.message);process.exit(1);});
