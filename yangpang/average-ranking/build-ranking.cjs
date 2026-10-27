const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require(process.env.QQSPEED_NODE_MODULES?path.join(process.env.QQSPEED_NODE_MODULES,'playwright'):'playwright');
const dir=__dirname;
const arg=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const out=path.resolve(arg('--out-dir')||path.join(dir,'../../outputs'));
fs.mkdirSync(out,{recursive:true});
const input=JSON.parse(fs.readFileSync(path.join(dir,'ranking-data.json'),'utf8').replace(/^\uFEFF/,''));
const source=input.rows,pending=input.pending||[];
if(!Array.isArray(source)||!source.length||source.length>12)throw Error('当前均分榜模板支持1–12名选手，更多行请先调整版式');
for(const p of source){if(typeof p.name!=='string'||!p.name.trim()||!Number.isFinite(p.total)||!Number.isFinite(p.games)||p.games<=0||!Number.isFinite(p.average)||!Number.isFinite(p.rate)||p.rate<0||p.rate>100)throw Error('选手数据缺项或格式错误');if(Number((p.total/p.games).toFixed(2))!==p.average)throw Error(p.name+'均分不一致');}
const overall=(source.reduce((s,p)=>s+p.total,0)/source.reduce((s,p)=>s+p.games,0)).toFixed(2);
if(input.overall!==undefined&&Number(input.overall)!==Number(overall))throw Error('总均分不一致');
const rows=source.slice().sort((a,b)=>b.average-a.average);
rows.forEach((p,i)=>p.rank=i&&p.average===rows[i-1].average?rows[i-1].rank:i+1);
const rowHeight=Math.min(118,Math.floor((pending.length?960:1140)/rows.length));
if(!fs.existsSync(path.join(dir,'background.png')))throw Error('缺少已归档的 background.png');
// Read scores from the JSON source; rendering never rewrites it.
const bg='data:image/png;base64,'+fs.readFileSync(path.join(dir,'background.png')).toString('base64');
const chineseFont='data:font/ttf;base64,'+fs.readFileSync(path.join(dir,'fonts/字魂白鸽天行体(商用需授权).ttf')).toString('base64');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
@font-face{font-family:ReportChinese;src:url('${chineseFont}') format('truetype');font-weight:400;font-style:normal}
*{box-sizing:border-box}html,body{margin:0;width:2160px;height:2880px;overflow:hidden}body{font-family:ReportChinese,"Microsoft YaHei",sans-serif;font-synthesis:none;color:#f9f3ff;background:#241645;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
.poster{position:relative;width:2160px;height:2880px;background:url('${bg}') center/100% 100% no-repeat}
.top-line{position:absolute;top:874px;left:0;width:100%;text-align:center;font-size:47px;line-height:1.4;font-weight:800;letter-spacing:7px;color:#f5e4bc;text-shadow:0 4px 6px #24143599}
h1{position:absolute;top:961px;width:100%;margin:0;text-align:center;font-size:132px;line-height:1.15;letter-spacing:2px;font-weight:400;color:#eee0c2;text-shadow:0 4px 0 #83735b,0 8px 8px #1a1028aa}
.subtitle{position:absolute;top:1118px;width:100%;text-align:center;font-size:35px;letter-spacing:5px;color:#ded2f1}
.summary{position:absolute;top:1201px;left:120px;right:120px;height:142px;display:flex;align-items:center;justify-content:center;border-top:1px solid #e8d6a567;border-bottom:1px solid #e8d6a567;background:linear-gradient(90deg,transparent,#a48bd126,transparent)}
.summary .item{display:flex;align-items:center;gap:38px}.summary .label{font-size:42px;font-weight:400;color:#e5d5f0}.summary .value{font-family:ReportChinese,sans-serif;font-size:106px;line-height:1;font-weight:400;color:#e7d2ac;text-shadow:0 3px 0 #75644f,0 5px 6px #0008}
.board{position:absolute;left:120px;right:120px;top:1403px;border:2px solid #ddc891b3;border-radius:26px;overflow:hidden;background:#241b44db;box-shadow:0 18px 60px #170c3380}
.grid{display:grid;grid-template-columns:150px 430px 350px 350px 300px 336px;align-items:center;text-align:center}
.head{height:112px;font-size:36px;letter-spacing:3px;color:#f5dfaf;background:linear-gradient(90deg,#4d3b6c,#64517f80,#4d3b6c);border-bottom:2px solid #e5ce9a88;font-weight:800}
.row{height:${rowHeight}px;border-bottom:1px solid #b9a0d329;font-size:46px;background:linear-gradient(90deg,#ffffff06,transparent)}
.row:nth-child(odd){background:#b7a0d80b}.row:last-child{border-bottom:0}.name{text-align:left;padding-left:38px;font-weight:800;font-size:${Math.min(50,rowHeight*.5)}px;letter-spacing:1px;text-shadow:0 3px 4px #000a}
.average{font-family:ReportChinese,sans-serif;color:#eee0c2;font-weight:400;font-size:${Math.min(76,rowHeight*.67)}px;text-shadow:0 3px 3px #0008}.rate,.total,.games{font-family:ReportChinese,sans-serif;font-weight:400;font-size:${Math.min(56,rowHeight*.5)}px}.games{color:#e2d5ed}.rate.zero{color:#c0afcf}
.rank{width:${Math.min(68,rowHeight-22)}px;height:${Math.min(68,rowHeight-22)}px;margin:auto;border:1px solid #bca4d36b;border-radius:15px;display:flex;align-items:center;justify-content:center;font-family:ReportChinese,sans-serif;font-size:${Math.min(46,rowHeight*.43)}px;font-weight:400;color:#e9dcf4;background:#81709925}
.rank-1 .rank{color:#432a12;background:linear-gradient(135deg,#fff4c8,#d7ae5f);border-color:#ffe1a2;box-shadow:0 3px 18px #d4b37830}.rank-2 .rank{color:#282d44;background:linear-gradient(135deg,#f7f3ff,#a8b0cb);border-color:#dddff5}.rank-3 .rank{color:#493021;background:linear-gradient(135deg,#f7d7b6,#b98360);border-color:#e1b18b}
.rank-1{background:linear-gradient(90deg,#c39b382c,#b89d5510)!important}.rank-1 .name{color:#ffebae}
.pending{position:absolute;left:120px;right:120px;top:2520px;height:158px;border:1px solid #d1bb994d;border-radius:22px;background:#2b1f47bb;display:${pending.length?'flex':'none'};align-items:center;padding:0 48px;gap:48px}
.pending-label{font-size:34px;font-weight:700;color:#e4d0ac;white-space:nowrap}.pending-names{display:flex;gap:48px;font-size:38px;color:#ece1f8}.pending-name{padding:13px 28px;background:#9683b424;border-radius:12px}
.foot{position:absolute;top:2722px;left:100px;right:100px;text-align:center;font-size:29px;letter-spacing:1px;color:#e0d1e7;line-height:1.65;text-shadow:0 2px 8px #231235}
</style></head><body><main class="poster"><div class="top-line">杨胖杯 · 2V2个人竞速</div><h1>2V2 选手均分榜</h1><div class="subtitle">按均分降序排列 · 同分并列</div>
<section class="summary"><div class="item"><span class="label">总均分</span><span class="value">${overall}</span></div></section>
<section class="board"><div class="head grid"><span>排名</span><span>选手</span><span>2v均分</span><span>冲线率</span><span>2v总分</span><span>2v场次</span></div>${rows.map(p=>`<div class="row grid rank-${p.rank}" data-name="${p.name}"><span class="rank">${p.rank}</span><span class="name">${p.name}</span><span class="average">${p.average.toFixed(2)}</span><span class="rate ${p.rate===0?'zero':''}">${p.rate.toFixed(2)}%</span><span class="total">${p.total}</span><span class="games">${p.games}</span></div>`).join('')}</section>
<section class="pending"><div class="pending-label">暂无数据 · 暂不排名</div><div class="pending-names">${pending.map(n=>`<span class="pending-name">${n}</span>`).join('')}</div></section><div class="foot">均分＝2v总分 ÷ 2v场次 · 冲线率＝第一名局数 ÷ 2v场次<br>${input.updated?'累计更新：'+input.updated:'数据按所提供表格整理'}</div></main></body></html>`;
fs.writeFileSync(path.join(dir,'ranking.html'),html);
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:require('../qqspeed-battle-report/scripts/runtime.cjs').browserPath(),args:['--disable-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:2160,height:2880},deviceScaleFactor:1});await page.goto(pathToFileURL(path.join(dir,'ranking.html')).href);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(async()=>{const b=getComputedStyle(document.querySelector('.poster')).backgroundImage;const i=new Image();i.src=b.slice(5,-2);await i.decode()});
  const check=await page.evaluate(()=>({rows:[...document.querySelectorAll('.row')].map(e=>[...e.children].map(s=>s.textContent)),overflow:[...document.querySelectorAll('.grid > span,.pending-name,.pending-label')].filter(e=>e.scrollWidth>e.clientWidth).map(e=>e.textContent),overlap:document.querySelector('.board').getBoundingClientRect().bottom>(getComputedStyle(document.querySelector('.pending')).display==='none'?document.querySelector('.foot'):document.querySelector('.pending')).getBoundingClientRect().top}));
  if(check.rows.length!==source.length||check.overflow.length||check.overlap)throw Error(JSON.stringify(check));
  rows.forEach((p,i)=>{const expected=[String(p.rank),p.name,p.average.toFixed(2),p.rate.toFixed(2)+'%',String(p.total),String(p.games)];if(JSON.stringify(check.rows[i])!==JSON.stringify(expected))throw Error('排版值不一致')});
  const revision=await page.evaluate(()=>({event:document.querySelector('.top-line').textContent,removed:!document.body.innerText.includes('参榜选手')&&!document.body.innerText.includes('每人场次'),font:document.fonts.check('800 50px ReportChinese')}));
  if(!revision.event.includes('杨胖杯')||!revision.removed||!revision.font)throw Error('改版检查失败：'+JSON.stringify(revision));
  let stem=arg('--name')||'杨胖杯_2v均分榜_白鸽天行体_重制-'+Date.now(),n=2;
  const base=stem;while(fs.existsSync(path.join(out,stem+'.png'))||fs.existsSync(path.join(out,stem+'.jpg')))stem=base+'-v'+n++;
  for(const format of ['png','jpeg'])await page.screenshot({path:path.join(out,stem+'.'+(format==='png'?'png':'jpg')),type:format,...(format==='jpeg'?{quality:95}:{})});
  fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify({ok:true,overall,rows:check.rows,overflow:check.overflow,overlap:check.overlap},null,2));console.log(JSON.stringify({ok:true,overall,outputs:[path.join(out,stem+'.png'),path.join(out,stem+'.jpg')],ranking:rows.map(p=>({rank:p.rank,name:p.name,average:p.average}))},null,2));
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exit(1)});
