const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const {DEFAULT_LIBRARY,loadCatalog,findMap,getImage}=require('./library.cjs');
const {argument,dependencies,browserPath}=require('./runtime.cjs');
const esc=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
function model(config,configDir,libraryRoot=DEFAULT_LIBRARY){
if(!Array.isArray(config.teams)||config.teams.length!==2||config.teams.some(t=>!Array.isArray(t.players)||t.players.length!==2))throw Error('需要两支队伍，每队两名选手');
if(!Array.isArray(config.rounds)||config.rounds.length<1||config.rounds.length>12)throw Error('版式支持1–12局；更多局请调整版式，不要删局');
const cat=loadCatalog(libraryRoot),names=new Set();
const teams=config.teams.map(t=>{
if(typeof t.name!=='string'||!t.name.trim())throw Error('队名缺失');
const players=t.players.map(p=>{if(typeof p.name!=='string'||!p.name.trim()||names.has(p.name))throw Error('显示名缺失或重复: '+p.name);names.add(p.name);if(!Array.isArray(p.scores)||p.scores.length!==config.rounds.length||p.scores.some(s=>typeof s!=='number'||!Number.isFinite(s)))throw Error('分数缺项、格式错误或局数不一致: '+p.name);const total=p.scores.reduce((a,b)=>a+b,0);if(p.total!==undefined&&p.total!==total)throw Error(p.name+' 总分不一致: 逐局计算='+total+'，表中='+p.total);return {...p,total};});
const total=players.reduce((a,p)=>a+p.total,0);if(t.total!==undefined&&t.total!==total)throw Error(t.name+' 队伍总分不一致');
if(!t.logo)throw Error(t.name+' 缺少队标文件；使用提供的队标或先根据本次要求绘制');const logo=path.resolve(configDir,t.logo);if(!fs.existsSync(logo))throw Error('队标不存在: '+logo);
return {...t,logo,players,total};});
const rounds=config.rounds.map((r,i)=>{const input=typeof r==='string'?{map:r}:r;if(!input||typeof input.map!=='string')throw Error('第'+(i+1)+'局地图缺失');const m=findMap(cat,input.map);if(m.status!=='verified')throw Error('地图尚未完成画面核对: '+m.name);return {...m,image:getImage(libraryRoot,m),background_position:input.background_position||m.background_position||'50% 50%'};});
return {title:config.title||'2v2个人竞速',subtitle:config.subtitle||rounds.length+'局战报',teams,players:teams.flatMap(t=>t.players),rounds,showStars:config.show_stars!==false};}
const datauri=p=>{const ext=path.extname(p).toLowerCase(),type=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';return 'data:'+type+';base64,'+fs.readFileSync(p).toString('base64')};
function documentFor(m){
const labels=['player-a','player-b','player-c','player-d'];
const people=m.players.map((p,i)=>`<div class="total-player ${labels[i]}"><div class="name">${esc(p.name)}</div><div class="individual">${p.total}</div></div>`).join('');
const cards=m.rounds.map((r,i)=>`<article class="round-card" data-round="${i+1}" data-map="${esc(r.name)}"><img class="map-art" src="${datauri(r.image)}" alt="${esc(r.name)}" style="object-position:${esc(r.background_position)}"><div class="shade"></div><div class="round-label">ROUND ${i+1}</div><div class="round-rule"></div>${m.players.map((p,j)=>`<div class="result result-${j}" data-player="${esc(p.name)}" data-score="${p.scores[i]}"><div class="player-name">${esc(p.name)}</div><div class="points">${p.scores[i]>=0?'+':''}${p.scores[i]}</div></div>`).join('')}<div class="map-footer"><div class="map-title ${r.name.length>6?'long':''}">${esc(r.name)}</div>${m.showStars&&r.stars?`<div class="stars">${'<span>★</span>'.repeat(r.stars)}</div>`:''}</div></article>`).join('');
const tokens={TITLE:esc(m.title),SUBTITLE:esc(m.subtitle),LEFT_LOGO:datauri(m.teams[0].logo),RIGHT_LOGO:datauri(m.teams[1].logo),LEFT_TEAM:esc(m.teams[0].name),RIGHT_TEAM:esc(m.teams[1].name),LEFT_TOTAL:m.teams[0].total,RIGHT_TOTAL:m.teams[1].total,PEOPLE:people,CARDS:cards,ROUNDS:m.rounds.length};
let template=fs.readFileSync(path.join(__dirname,'../assets/report-template.html'),'utf8');return template.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{if(!(key in tokens))throw Error('未知模板变量: '+key);return tokens[key];});}
function stem(s){return s.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,120)||'QQ飞车战报';}
async function main(){
const configPath=argument('--config'),outArg=argument('--out-dir');if(!configPath||!outArg)throw Error('用法: --config match.json --out-dir outputs --work-dir work/render --node-modules 包目录');
const conf=path.resolve(configPath),out=path.resolve(outArg),work=path.resolve(argument('--work-dir')||path.join(path.dirname(conf),'render-work'));fs.mkdirSync(out,{recursive:true});fs.mkdirSync(work,{recursive:true});
const config=JSON.parse(fs.readFileSync(conf,'utf8').replace(/^\uFEFF/,'')),m=model(config,path.dirname(conf),argument('--library')||DEFAULT_LIBRARY),html=documentFor(m);
const htmlPath=path.join(work,'report.html');fs.writeFileSync(htmlPath,html);fs.writeFileSync(path.join(work,'resolved-match.json'),JSON.stringify(m,null,2));
const base=stem(m.teams[0].name+'VS'+m.teams[1].name+'_'+m.subtitle+'_4K');let file=base,n=2;while(fs.existsSync(path.join(out,file+'.png'))||fs.existsSync(path.join(out,file+'.jpg')))file=base+'-v'+n++;
const {chromium}=dependencies().playwright(),browser=await chromium.launch({headless:true,executablePath:browserPath(),args:['--disable-gpu']});
try{const page=await browser.newPage({viewport:{width:3840,height:2160},deviceScaleFactor:1});await page.goto(pathToFileURL(htmlPath).href);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));const fit=(selector,min)=>{for(const e of document.querySelectorAll(selector)){let size=parseFloat(getComputedStyle(e).fontSize);while((e.scrollWidth>e.clientWidth||e.getBoundingClientRect().width>e.parentElement.getBoundingClientRect().width)&&size>min){size--;e.style.fontSize=size+'px';}}};fit('.map-title',24);fit('.player-name',30);fit('.total-player .name',30);fit('.team-name',30);fit('.round-label',30);});
const check=await page.evaluate(()=>({cards:[...document.querySelectorAll('.round-card')].map(c=>({map:c.dataset.map,round:Number(c.dataset.round),scores:[...c.querySelectorAll('.result')].map(e=>({name:e.dataset.player,value:Number(e.dataset.score),text:e.querySelector('.points').textContent}))})),badImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.alt),overflow:[...document.querySelectorAll('.map-title,.player-name,.total-player .name,.team-name')].filter(e=>e.scrollWidth>e.clientWidth).map(e=>e.textContent)}));
if(check.cards.length!==m.rounds.length||check.badImages.length||check.overflow.length)throw Error('布局校验失败: '+JSON.stringify(check));
for(let i=0;i<m.rounds.length;i++){const row=check.cards[i];if(row.map!==m.rounds[i].name||row.scores.length!==4)throw Error('地图或选手格数错误');for(let j=0;j<4;j++){const v=m.players[j].scores[i];if(row.scores[j].name!==m.players[j].name||row.scores[j].value!==v||row.scores[j].text!==(v>=0?'+':'')+v)throw Error('逐局分数排版错误');}}
await page.screenshot({path:path.join(out,file+'.png'),type:'png'});await page.screenshot({path:path.join(out,file+'.jpg'),type:'jpeg',quality:95});
const report={ok:true,rounds:m.rounds.length,scoreCells:m.rounds.length*4,teamTotals:m.teams.map(t=>({name:t.name,total:t.total})),validation:check,outputs:[path.join(out,file+'.png'),path.join(out,file+'.jpg')]};fs.writeFileSync(path.join(work,'validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,validation:undefined},null,2));
}finally{await browser.close()}}
module.exports={model,documentFor};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exit(1)});
