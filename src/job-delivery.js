// Job scans collect explicit menu snapshots; no module submits a partial Job notification.
const JOB_MENUS=['coe','sprint','epic','risk'],JOB_LABELS={coe:'COE',sprint:'Sprint',epic:'Epic',risk:'Risk'};
hub.noteJobScope=(values,jql='')=>{
 if(!hub.jobRun)return;for(const value of values||[]){const key=String(typeof value==='object'?value.key:value).split('-')[0].toUpperCase();if(/^[A-Z][A-Z0-9_]*$/.test(key))hub.jobRun.projects.add(key);}
 for(const match of String(jql).matchAll(/\bproject\s*(?:=\s*["']?([A-Z][A-Z0-9_]*)["']?|in\s*\(([^)]+)\))/gi))for(const raw of (match[1]||match[2]).split(',')){const key=raw.trim().replace(/["']/g,'').toUpperCase();if(/^[A-Z][A-Z0-9_]*$/.test(key))hub.jobRun.projects.add(key);}
};
hub.collectJobReport=entry=>{
 const run=hub.jobRun;if(!run||!JOB_MENUS.includes(entry.menu)||run.menu!==entry.menu||!hub.jobDelivery.menus.includes(entry.menu))throw Error('Job 报告与所选菜单不一致，未发送');
 const types={coe:['timeout-summary','coe-scan-summary'],sprint:['sprint-analysis'],epic:['epic-analysis'],risk:['risk']};if(!types[entry.menu].includes(entry.payload?.reportType))throw Error('Job 报告来源不正确（禁止 Kanban），未发送');
 if(!entry.projectKey||!entry.file?.html)throw Error(JOB_LABELS[entry.menu]+' 报告快照缺失，未发送');
 if(run.entries.some(e=>e.menu===entry.menu&&e.projectKey===entry.projectKey))throw Error('Job 出现重复菜单报告，未发送');
 run.entries.push(JSON.parse(JSON.stringify(entry)));run.projects.add(entry.projectKey);
};
function jobEmptyEntry(projectKey,menu,job){
 const title=projectKey+' · '+JOB_LABELS[menu]+' · 扫描完成',text='本项目没有符合本菜单统计条件的数据。'+(menu==='sprint'?'Sprint 已排除 CLOSED 和未分配项。':'')+'扫描时间：'+new Date().toLocaleString('zh-CN',{hour12:false});
 const target=hub.target(projectKey+'-1');if(!target)throw Error(projectKey+' 通知未启用，未发送');const html=hub.emailCard({title,subtitle:'本次 Job 已完成扫描，无有效条目',sections:[{title:'扫描结果',headers:['项目','结果'],rows:[[JOB_LABELS[menu],text]]}],meta:'来源：本次 Job 的 '+JOB_LABELS[menu]+' 扫描。',url:job.url});
 return {menu,projectKey,target,file:{name:'Jira-Monitor-'+JOB_LABELS[menu]+'-'+projectKey+'.html',html:'<!doctype html><meta charset="utf-8">'+html},payload:{text:title,email:{enabled:true,recipients:target.recipients||[],bodyText:text,bodyHtml:html},attachments:[{contentType:'application/vnd.microsoft.card.adaptive',content:{type:'AdaptiveCard',version:'1.2',body:[{type:'TextBlock',text:title,weight:'Bolder',wrap:true},{type:'TextBlock',text,wrap:true}]}}]}};
}
function jobTeamsAttachment(entries,project){
 const cards=entries.flatMap(e=>e.payload.attachments||[]),entities=[...new Map(cards.flatMap(c=>c.content?.msteams?.entities||[]).map(e=>[e.mentioned?.id?.toLowerCase()||JSON.stringify(e),e])).values()];
 return {contentType:'application/vnd.microsoft.card.adaptive',content:{type:'AdaptiveCard',version:'1.2',msteams:{width:'Full',entities},body:[{type:'TextBlock',text:project+' · Job · '+entries.map(e=>JOB_LABELS[e.menu]).join(' / '),size:'Large',weight:'Bolder',wrap:true},...entries.flatMap(e=>[{type:'TextBlock',text:JOB_LABELS[e.menu],size:'Medium',weight:'Bolder',separator:true,wrap:true},...(e.payload.attachments||[]).flatMap(a=>[...(a.content?.body||[]),...(a.content?.actions?.length?[{type:'ActionSet',actions:a.content.actions}]:[])])])]}};
}
function jobPrepareDeliveries(job){
 const run=hub.jobRun;if(!run||job.menus.some(m=>!run.completed.includes(m)))throw Error('Job 扫描未全部完成，未发送');
 const projects=[...new Set([...run.entries.map(e=>e.projectKey),...[...run.projects].filter(key=>hub.jobProjectAllowed(key)&&hub.target(key+'-1'))])].sort();
 if(!projects.length)return [];
 return projects.map(key=>{
  const target=hub.target(key+'-1');if(!target)throw Error(key+' 通知未启用，未发送');const destination=hub.validateWebhook(target.webhook),recipients=[...(target.recipients||[])];if(job.email&&!recipients.length)throw Error(key+' 未配置邮件收件人，未发送');
  const entries=JOB_MENUS.filter(m=>job.menus.includes(m)).map(menu=>run.entries.find(e=>e.projectKey===key&&e.menu===menu)||jobEmptyEntry(key,menu,job));
  const recipientKey=v=>[...v].map(x=>String(x).trim().toLowerCase()).sort().join(';');for(const entry of entries)if(hub.validateWebhook(entry.target.webhook)!==destination||job.email&&recipientKey(entry.target.recipients||[])!==recipientKey(recipients))throw Error(key+' 扫描期间通知配置已变化，未发送');
  const title=key+' · Job · '+entries.map(e=>JOB_LABELS[e.menu]).join(' / '),strip=html=>String(html||'').replace(/<p data-jira-monitor-report[\s\S]*?<\/p>/g,'').replace(/<p[^>]*>附交互报告：[\s\S]*?<\/p>/g,'');
  const email=job.email?{enabled:true,to:recipients.join(';'),recipients,subject:'[Jira Monitor] '+title,bodyText:entries.map(e=>JOB_LABELS[e.menu]+'\n'+(e.payload.email?.bodyText||e.payload.text||'扫描完成')).join('\n\n'),bodyHtml:entries.map(e=>'<div style="margin-bottom:24px">'+strip(e.payload.email?.bodyHtml)+'</div>').join(''),attachments:[]}:{enabled:false};
  if(job.email&&job.attach)hub.attachEmailReport(email,jobCombinedReport(entries,key,{version:JOB_VERSION,time:new Date().toLocaleString('zh-CN',{hour12:false})}));
  const attachment=jobTeamsAttachment(entries,key),oversized=job.teams&&new TextEncoder().encode(JSON.stringify([attachment])).length>26*1024;
  if(oversized&&!job.email)throw Error(key+' 合并 Teams 卡片超过大小限制，请启用邮件；未发送。');
  return {key,target,destination,recipients,payload:{type:'message',reportType:'job-summary',version:JOB_VERSION,generatedAt:new Date().toISOString(),projectKey:key,menus:entries.map(e=>e.menu),scans:entries.map(e=>({menu:e.menu,reportType:e.payload.reportType||'empty-scan',status:'completed',scanCount:e.payload.scanCount,scanTime:e.payload.scanTime})),text:title,summary:'本次 Job 扫描结果：'+entries.map(e=>JOB_LABELS[e.menu]).join(' / '),email,teams:{enabled:job.teams&&!oversized},deliveryMode:job.teams&&!oversized?'teams-and-email':'email-only',attachments:job.teams&&!oversized?[attachment]:[]},emailOnly:oversized};
 });
}
hub.flushJobReports=async job=>{
 if(!job.teams&&!job.email)return '扫描完成；未启用通知。';const saved=jobList().find(j=>j.id===job.id);if(!saved||JSON.stringify(validJob(saved))!==JSON.stringify(job))throw Error('扫描期间 Job 配置已变化，请重新运行；未发送');const deliveries=jobPrepareDeliveries(job),recipientKey=v=>v.map(x=>String(x).trim().toLowerCase()).sort().join(';');
 const validate=d=>{const t=hub.target(d.key+'-1');if(!t||hub.validateWebhook(t.webhook)!==d.destination||job.email&&recipientKey(t.recipients||[])!==recipientKey(d.recipients))throw Error(d.key+' 通知配置已变化，未发送');};
 deliveries.forEach(validate);const outcomes=[];for(const d of deliveries){const send=async()=>{validate(d);await new Promise((resolve,reject)=>{let settled=false,request;const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve();};const timer=setTimeout(()=>{finish(Error('Job 合并通知超时，结果未知；未重试'));request?.abort?.();},30000);try{request=GM_xmlhttpRequest({method:'POST',url:d.destination,headers:{'Content-Type':'application/json'},data:JSON.stringify(d.payload),timeout:30000,anonymous:true,redirect:'error',onload:r=>finish(r.status>=200&&r.status<300?null:Error('Job 合并通知 HTTP '+r.status)),onerror:()=>finish(Error('Job 合并通知网络失败，结果未知')),ontimeout:()=>finish(Error('Job 合并通知超时，结果未知')),onabort:()=>finish(Error('Job 合并通知已中止，结果未知'))});}catch(error){finish(error);}});};await navigator.locks.request('jira-monitor-teams-notify',send);outcomes.push(d.key+' 已合并提交 '+d.payload.menus.map(m=>JOB_LABELS[m]).join(' / ')+(d.emailOnly?'（Teams 超限，仅邮件；附件保留全部菜单）':''));}
 return outcomes.join('；')||'扫描完成，没有可推送的已启用项目。';
};
