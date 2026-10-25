const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const {DEFAULT_LIBRARY,loadCatalog,inside}=require('./library.cjs');
const {argument,dependencies,browserPath}=require('./runtime.cjs');
const esc=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
async function main(){
const root=path.resolve(argument('--library')||DEFAULT_LIBRARY);const work=path.resolve(argument('--work-dir')||path.join(process.cwd(),'work/qqspeed-library-review'));fs.mkdirSync(work,{recursive:true});const cat=loadCatalog(root),sharp=dependencies().sharp();
for(const m of cat.maps){if(!m.original)throw Error('缺少原图记录: '+m.name);const p=inside(root,m.original),meta=await sharp(p).metadata();if(meta.width<200||meta.height<100)throw Error('疑似图标或无效图片: '+m.name);m.width=meta.width;m.height=meta.height;m.thumbnail=m.name+'.jpg';await sharp(p).resize(640,360,{fit:'cover'}).jpeg({quality:93,chromaSubsampling:'4:4:4'}).toFile(inside(root,m.thumbnail));}
fs.writeFileSync(path.join(root,'catalog.json'),JSON.stringify(cat,null,2));
const image=m=>'data:image/jpeg;base64,'+fs.readFileSync(inside(root,m.thumbnail)).toString('base64');
const cards=arr=>arr.map((m,i)=>`<div class="card"><img src="${image(m)}"><div class="name">${esc(m.name)}</div></div>`).join('');
const css='*{box-sizing:border-box}body{margin:0;background:#f1f2f6;color:#23232f;font-family:"Microsoft YaHei",sans-serif}.head{font-size:44px;font-weight:800;padding:32px 36px 12px}.sub{font-size:24px;padding:0 36px 24px;color:#667}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:20px;padding:0 30px 30px}.card{background:white;border:1px solid #d7dae0;overflow:hidden}.card img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.name{font-size:27px;font-weight:700;padding:14px 8px;text-align:center;white-space:nowrap}';
const {chromium}=dependencies().playwright();const browser=await chromium.launch({headless:true,executablePath:browserPath(),args:['--disable-gpu']});
try{const page=await browser.newPage({viewport:{width:2280,height:1200},deviceScaleFactor:1});
const make=async(arr,title,filepath)=>{await page.setContent(`<!doctype html><meta charset="utf-8"><style>${css}</style><div class="head">${title}</div><div class="sub">QQ飞车手游 · 本地地图素材</div><div class="grid">${cards(arr)}</div>`);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});await page.screenshot({path:filepath,fullPage:true,type:'jpeg',quality:93});};
await make(cat.maps,`QQ飞车手游｜${cat.maps.length}张地图缩略图总览`,path.join(root,'地图缩略图总览.jpg'));
for(let i=0;i<cat.maps.length;i+=15)await make(cat.maps.slice(i,i+15),`地图核对 ${i+1}–${Math.min(i+15,cat.maps.length)}`,path.join(work,'review-'+(i/15+1)+'.jpg'));
}finally{await browser.close();}
console.log(JSON.stringify({maps:cat.maps.length,root,review:work},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
