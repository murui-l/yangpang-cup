const fs=require('fs'),path=require('path');
function argument(name,args=process.argv.slice(2)){const i=args.indexOf(name);return i<0?undefined:args[i+1];}
function dependencies(){const supplied=argument('--node-modules')||process.env.QQSPEED_NODE_MODULES;function load(name){try{return require(name)}catch(e){if(supplied)return require(path.join(supplied,name));throw Error('缺少 '+name+'；先调用 load_workspace_dependencies，再通过 --node-modules 传入返回的 Node.js packages 目录。');}}return {sharp:()=>load('sharp'),playwright:()=>load('playwright')};}
function browserPath(){const specified=argument('--browser');if(specified)return specified;const candidates=[path.join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe'),path.join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe')];return candidates.find(p=>fs.existsSync(p));}
module.exports={argument,dependencies,browserPath};
