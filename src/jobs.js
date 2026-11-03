// Scheduled jobs contain references and preferences only; never credentials.
const JOB_STORE='jira-monitor-jobs-v1',JOB_LOG='jira-monitor-job-runs-v1';
hub.jobRunners={};
const jobDefaultUrl='https://jira.xpaas.lenovo.com/issues/?filter=180929';
function jobList(){return GM_getValue(JOB_STORE,[]);}
function validJob(value){
 const j={...value};if(!/^[a-z0-9-]{1,80}$/.test(j.id))throw Error('Job 编号无效');
 const u=new URL(j.url);if(u.origin!==location.origin||u.pathname!=='/issues/'||u.username||u.password||(!u.searchParams.get('filter')&&!u.searchParams.get('jql')))throw Error('请填写当前 Jira 的 /issues/ 查询链接（filter 或 jql）。');u.hash='';j.url=u.href;
 j.name=String(j.name||'未命名 Job').slice(0,80);j.times=[...new Set(String(Array.isArray(j.times)?j.times.join(','):j.times).split(/[,，\s]+/).filter(Boolean))].sort();
 if(!j.times.length||j.times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw Error('时间请填写 09:00,21:00，可填写多个时间。');
 j.menus=[...new Set(j.menus||[])];if(!j.menus.length||j.menus.some(x=>!['coe','sprint','epic'].includes(x)))throw Error('请至少选择一个执行菜单。');
 j.period=j.period==='week'?'week':'day';j.days=j.days==='weekdays'?'weekdays':'daily';j.projects=String(j.projects||'').trim().toUpperCase();if(j.projects&&!/^[A-Z][A-Z0-9_]*(\/[A-Z][A-Z0-9_]*)*$/.test(j.projects))throw Error('推送项目用 / 分隔，例如 CSP/OSPIT；留空使用全部已启用项目。');
 for(const key of ['enabled','teams','email','attach'])j[key]=j[key]===true;return j;
}
function jobSlot(j,now=new Date()){
 if(j.days==='weekdays'&&(now.getDay()===0||now.getDay()===6))return null;
 const minutes=now.getHours()*60+now.getMinutes();const time=[...j.times].reverse().find(t=>{const [h,m]=t.split(':').map(Number);return minutes-h*60-m>=0&&minutes-h*60-m<=10;});
 return time?`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${time}`:null;
}
function jobLog(id,patch){const logs=GM_getValue(JOB_LOG,{});logs[id]={...logs[id],...patch,updatedAt:new Date().toISOString()};GM_setValue(JOB_LOG,logs);return logs[id];}
hub.deliveryPayload=payload=>{
 const job=hub.jobDelivery;if(!job)return payload;
 if(!job.email)payload.email={enabled:false};
 if(!job.teams){payload.attachments=[];payload.teams={enabled:false};payload.deliveryMode='email-only';}
 else if(!payload.teams)payload.teams={enabled:true};
 return payload;
};
hub.jobProjectAllowed=key=>!hub.jobDelivery?.projects||hub.jobDelivery.projects.split('/').includes(key);
async function executeJob(id,manual=false){
 const job=validJob(jobList().find(j=>j.id===id)||{});if(!job.enabled)throw Error('此 Job 尚未启用，请在配置中心勾选启用并保存。');
 const target=new URL(job.url),here=new URL(location.href);here.hash='';if(here.href!==target.href)throw Error('当前页面与 Job 查询不一致，请从 Job 的“立即运行”或 Mac 启动器打开。');
 const slot=manual?'手动 '+new Date().toISOString():jobSlot(job);if(!slot)throw Error('未到此 Job 的执行时间，或已超过 10 分钟启动窗口。');
 const execute=async()=>{
  const current=jobList().find(x=>x.id===id);if(!current?.enabled)return;
  if(JSON.stringify(validJob(current))!==JSON.stringify(job))throw Error('等待期间 Job 配置已变化，请重新打开。');
  const old=GM_getValue(JOB_LOG,{})[id];if(!manual&&old?.slot===slot)return;
  if(hub.jobDelivery)throw Error('已有 Job 正在执行，请稍后再试。');
  jobLog(id,{slot,status:'running',message:'正在执行 '+job.menus.join(' → ')});hub.jobDelivery=job;
  try{for(const menu of job.menus){if(!hub.jobRunners[menu])throw Error(menu+' 模块尚未就绪');hub.show(menu==='coe'?'timeout':menu);await hub.jobRunners[menu](job);}
   jobLog(id,{status:'completed',message:'已完成；通知提交不代表最终送达，请查看工作流。'});
  }catch(error){jobLog(id,{status:'failed',message:String(error.message).slice(0,700)+'；未自动重试。'});throw error;}finally{hub.jobDelivery=null;}
 };
 if(!navigator.locks?.request)throw Error('浏览器不支持 Job 防重复锁，请使用新版 Chrome。');
 // A single origin-wide lock serializes different jobs and duplicate tabs.
 return navigator.locks.request('jira-monitor-scheduled-jobs',execute);
}
hub.executeJob=executeJob;
const jobXml=value=>String(value).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function macInstaller(jobs,browser){
 const enabled=jobs.filter(j=>j.enabled).map(validJob);if(!enabled.length)throw Error('请先保存并启用至少一个 Job。');
 const blocks=enabled.map(j=>{
  const url=new URL(j.url);url.hash=new URLSearchParams({'jm-job':j.id}).toString();
  const calendar=j.times.flatMap(t=>{const [h,m]=t.split(':').map(Number);return (j.days==='weekdays'?[1,2,3,4,5]:[null]).map(day=>'<dict><key>Hour</key><integer>'+h+'</integer><key>Minute</key><integer>'+m+'</integer>'+(day===null?'':'<key>Weekday</key><integer>'+day+'</integer>')+'</dict>');}).join('');
  const label='com.taomorrow.jira-monitor.job.'+j.id;
  const xml='<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>'+label+'</string><key>ProgramArguments</key><array><string>/usr/bin/open</string><string>-a</string><string>'+jobXml(browser)+'</string><string>'+jobXml(url.href)+'</string></array><key>StartCalendarInterval</key><array>'+calendar+'</array></dict></plist>';
  const bytes=new TextEncoder().encode(xml);let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
  return "printf '%s' '"+btoa(binary)+"' | /usr/bin/base64 -D > \"$agent_dir/"+label+".plist\"\n/usr/bin/plutil -lint \"$agent_dir/"+label+".plist\"\n/bin/launchctl bootstrap \"gui/$uid\" \"$agent_dir/"+label+".plist\"";
 });
 return '#!/bin/bash\nset -e\nagent_dir="$HOME/Library/LaunchAgents"\nuid=$(/usr/bin/id -u)\n/bin/mkdir -p "$agent_dir"\n# Replace only Jira Monitor jobs exported by this feature.\nfor old in "$agent_dir"/com.taomorrow.jira-monitor.job.*.plist; do\n [ -f "$old" ] || continue\n /bin/launchctl bootout "gui/$uid" "$old" 2>/dev/null || true\n /bin/rm "$old"\ndone\n'+blocks.join('\n')+'\necho "Jira Monitor 定时任务已安装。使用 Mac 当前系统时区；请保持电脑唤醒、Jira 登录有效。"\n';
}
hub.macInstaller=macInstaller;
hub.renderJobs=()=>{
 const panel=el('section',null,hub.settings);panel.id='scheduled-jobs';el('h2','定时 Job',panel);el('p','Mac 按本机时区打开查询页面，依次执行所选菜单。修改时间、页面或启用状态后，请重新导出并安装启动器。电脑需保持唤醒，Chrome 中已安装脚本且 Jira 登录有效。',panel);
 const entries=[],list=el('div',null,panel),status=el('p',null,panel);status.setAttribute('role','status');
 const addJob=value=>{
  const card=el('fieldset',null,list);card.style.cssText='border:1px solid #dbe3f0;border-radius:10px;margin:12px 0;padding:14px;display:grid;gap:8px';
  const j={id:crypto.randomUUID(),name:'Jira 每日分析',url:jobDefaultUrl,times:['09:00','21:00'],menus:['coe'],period:'day',days:'daily',enabled:false,teams:false,email:false,attach:true,projects:'',...value};const controls={};
  const field=(key,title,type='text')=>{const label=el('label',title+' ',card),input=el('input',null,label);input.type=type;if(type==='checkbox')input.checked=j[key];else input.value=Array.isArray(j[key])?j[key].join(','):j[key];input.dataset.jobField=key;controls[key]=input;return input;};
  field('enabled','启用 Job','checkbox');field('name','名称');field('url','Jira 查询页面').style.width='100%';field('times','每日时间（多个用逗号分隔）');
  const select=(key,title,options)=>{const label=el('label',title+' ',card),input=el('select',null,label);for(const [v,name] of options){const o=el('option',name,input);o.value=v;}input.value=j[key];controls[key]=input;};
  select('days','执行日期',[['daily','每天'],['weekdays','周一至周五']]);select('period','对比维度',[['day','昨天 / 今天'],['week','上周 / 本周']]);
  const menus=el('div','执行菜单：',card),checks=[];for(const [key,name] of [['coe','COE'],['sprint','Sprint'],['epic','Epic']]){const label=el('label',name+' ',menus),check=el('input',null,label);check.type='checkbox';check.value=key;check.checked=j.menus.includes(key);checks.push(check);}
  el('small','分析当前查询全部分页；Sprint / Epic 分组及状态全部勾选。',card);field('projects','推送项目（如 CSP/OSPIT；留空为全部已启用项目）');field('teams','完成后发送 Teams','checkbox');field('email','完成后发送邮件','checkbox');field('attach','邮件附交互报告','checkbox');
  const log=GM_getValue(JOB_LOG,{})[j.id];el('small',log?`${new Date(log.updatedAt).toLocaleString('zh-CN',{hour12:false})} · ${{running:'运行中',completed:'已完成',failed:'失败'}[log.status]||log.status} · ${log.message}`:'尚未执行',card);
  const entry={card,removed:false,read:()=>validJob({...j,...Object.fromEntries(Object.entries(controls).map(([key,n])=>[key,n.type==='checkbox'?n.checked:n.value])),menus:checks.filter(x=>x.checked).map(x=>x.value)})};entries.push(entry);
  el('button','删除 Job',card).onclick=()=>{entry.removed=true;card.remove();};el('button','立即运行（先保存并启用）',card).onclick=()=>{try{const saved=jobList().find(x=>x.id===j.id);if(!saved?.enabled)throw Error('请先保存并启用此 Job。');const u=new URL(saved.url);u.hash=new URLSearchParams({'jm-job':saved.id,'jm-manual':'1'});window.open(u.href,'_blank','noopener');}catch(e){status.textContent=e.message;}};
 };
 const stored=jobList();(stored.length?stored:[{}]).forEach(addJob);
 el('button','新增 Job',panel).onclick=()=>addJob({});
 el('button','保存 Job 配置',panel).onclick=()=>{try{const jobs=entries.filter(e=>!e.removed).map(e=>e.read());GM_setValue(JOB_STORE,jobs);status.textContent='Job 已保存。首次使用或修改时间后，请导出并安装 Mac 启动器。';}catch(e){status.textContent=e.message;}};
 const browser=el('select',null,panel);for(const name of ['Google Chrome','Microsoft Edge']){const o=el('option',name,browser);o.value=name;}
 el('button','导出 Mac 定时启动器',panel).onclick=()=>{try{hub.downloadFile({name:'Jira-Monitor-Mac-Installer.zip',type:'application/zip',html:macAppArchive(macInstaller(jobList(),browser.value))});status.textContent='已导出。双击 ZIP 解压，再双击 Jira Monitor Installer.app，点击“安装”即可。首次若被 macOS 拦截，可在系统设置 → 隐私与安全性中查看“仍要打开”。修改时间后重新导出安装。';}catch(e){status.textContent=e.message;}};
 el('p','停用全部 Mac 启动任务：先在配置中心取消启用并保存（脚本立即停止执行）。删除系统任务的方法见仓库 JOBS.md。页面重复打开时同一时间点只执行一次；失败不自动重试，可查看 Job 日志后手动运行。',panel);
};
hub.startScheduled=()=>{
 const params=new URLSearchParams(location.hash.slice(1)),id=params.get('jm-job');if(!id)return;
 executeJob(id,params.get('jm-manual')==='1').catch(error=>{hub.configure?.();const p=el('p','Job 未完成：'+error.message,hub.settings);p.setAttribute('role','alert');});
};
