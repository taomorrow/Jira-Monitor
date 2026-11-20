// Bundle only explicitly selected Job notifications; manual menu sends stay unchanged.
function jiraPlusWebhook(value){return new URL(String(value).trim().replace(/\\&/g,'&').replace(/&amp;/g,'&')).href;}
function jiraPlusRecipients(values){return [...new Set(values.map(x=>String(x).trim().toLowerCase()).filter(Boolean))].sort().join(';');}
const jiraPlusLabels={coe:'COE',sprint:'Sprint',epic:'Epic',risk:'Risk'};
const jiraPlusCardBytes=card=>new TextEncoder().encode(JSON.stringify([card])).length;
function jiraPlusTeamsCard(items,project,label=''){
 items=items.map(item=>{const copy=JSON.parse(JSON.stringify(item));for(const [index,card] of (copy.payload.attachments||[]).entries()){const prefix=item.menu+'-'+index+'-';const visit=node=>{if(!node||typeof node!=='object')return;if(node.id&&/^[A-Z]/.test(node.type||''))node.id=prefix+node.id;if(node.targetElements)node.targetElements=node.targetElements.map(x=>typeof x==='string'?prefix+x:{...x,elementId:prefix+x.elementId});for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);};visit(card.content);}return copy;});
 const cards=items.flatMap(x=>x.payload.attachments||[]);return {contentType:'application/vnd.microsoft.card.adaptive',content:{type:'AdaptiveCard',version:'1.2',msteams:{width:'Full',entities:cards.flatMap(c=>c.content?.msteams?.entities||[])},body:[{type:'TextBlock',text:project+' · '+(label||items.map(x=>jiraPlusLabels[x.menu]).join(' / ')),weight:'Bolder',size:'Large',wrap:true},...items.flatMap(item=>(item.payload.attachments||[]).flatMap(c=>[{type:'TextBlock',text:jiraPlusLabels[item.menu],weight:'Bolder',separator:true,wrap:true},...(c.content?.body||[]),...(c.content?.actions?.length?[{type:'ActionSet',actions:c.content.actions}]:[])]))]}};
}
function jiraPlusTeamsSelection(items,project){
 const all=items.map(x=>x.menu);if(items.some(x=>x.payload.teams?.enabled===false||!x.payload.attachments?.length))throw Error(project+' Teams 菜单报告缺失，未发送');
 const combined=jiraPlusTeamsCard(items,project);if(jiraPlusCardBytes(combined)<=26*1024)return [{attachment:combined,menus:all}];
 const result=[];for(const item of items){const label=jiraPlusLabels[item.menu],full=jiraPlusTeamsCard([item],project);if(jiraPlusCardBytes(full)<=26*1024){result.push({attachment:full,menus:[item.menu]});continue;}
  const template=JSON.parse(JSON.stringify(full));template.content.body=[];const title=full.content.body[0];
  const fit=nodes=>{const c={...template,content:{...template.content,body:[title,...nodes]}};return jiraPlusCardBytes(c)<=25*1024;};
  function divide(node){if(fit([node]))return [node];if(node.type==='Container'&&node.items?.length){const heading=node.items[0]?.type==='TextBlock'?node.items[0]:null;return node.items.flatMap((child,i)=>divide(child).map(part=>({...node,items:heading&&i?[heading,part]:[part]})));}if(node.type==='TextBlock'&&node.text?.length>1000){const chars=Array.from(node.text),parts=[];for(let i=0;i<chars.length;i+=1000)parts.push({...node,text:chars.slice(i,i+1000).join('')});return parts;}throw Error(project+' '+label+' 单条内容超限，无法安全分页；请缩小扫描范围，未发送');}
  const nodes=full.content.body.slice(1).flatMap(node=>node.type==='ActionSet'?node.actions.filter(a=>a.type==='Action.OpenUrl').map(action=>({type:'ActionSet',actions:[action]})):divide(node));let page=[];const pages=[];
  for(const node of nodes){if(!fit([node]))throw Error(project+' '+label+' 单条内容仍超限，未发送');if(page.length&&!fit([...page,node])){pages.push(page);page=[];}page.push(node);}if(page.length)pages.push(page);
  pages.forEach((body,i)=>{const card={...template,content:{...template.content,body:[{...title,text:project+' · '+label+' · '+(i+1)+'/'+pages.length},...body]}};if(jiraPlusCardBytes(card)>26*1024)throw Error('Teams 分页仍超限，未发送');result.push({attachment:card,menus:[item.menu],page:i+1,pages:pages.length});});
 }return result;
}
function jiraPlusMergeDeliveries(entries,job){
 const grouped=new Map(),order=['coe','sprint','epic','risk'];
 for(const entry of [...entries].sort((a,b)=>order.indexOf(a.menu)-order.indexOf(b.menu))){const p=entry.payload,key=String(p.projectKey||'');if(!key)throw Error('合并通知缺少项目 Key，未发送');const url=jiraPlusWebhook(entry.url);if(!grouped.has(key))grouped.set(key,[]);const group=grouped.get(key);if(group.length&&group[0].url!==url)throw Error(key+' 扫描期间通知地址已变化，未发送');group.push({...entry,url});}
 return [...grouped.values()].flatMap(items=>{const first=items[0],names=items.map(x=>({coe:'COE',sprint:'Sprint',epic:'Epic',risk:'Risk'})[x.menu]),title=first.payload.projectKey+' · '+names.join(' / '),emails=items.map(x=>x.payload.email).filter(e=>e?.enabled),recipients=[...new Set(emails.flatMap(e=>e.recipients||String(e.to||'').split(';')).filter(Boolean))];
 if(job.email&&!recipients.length)throw Error(title+' 未配置邮件收件人');
 const selection=job.teams?jiraPlusTeamsSelection(items,first.payload.projectKey):[],teams=job.teams&&selection.length>0;
 const email=job.email?{enabled:true,recipients,to:recipients.join(';'),subject:'[Jira+] '+title,bodyText:emails.map((e,i)=>names[i]+'\n'+(e.bodyText||'')).join('\n\n'),bodyHtml:emails.map(e=>'<div style="margin-bottom:24px">'+(e.bodyHtml||'')+'</div>').join(''),attachments:job.attach?[jiraPlusReportAttachment(items,first.payload.projectKey)]:[]}:{enabled:false};
 if(email.enabled){email.bodyHtml=email.bodyHtml.replace(/<p data-jira-plus-report[\s\S]*?<\/p>/g,'').replace(/<p[^>]*>附交互报告：[\s\S]*?<\/p>/g,'');if(email.attachments.length)email.bodyHtml+='<p style="font:13px Arial;color:#718098">已附合并交互报告：'+email.attachments[0].name+'。下载后用浏览器打开，可切换 COE / Sprint / Epic / Risk 并点击数字查看明细。</p>';}
 const base={type:'message',reportType:'job-summary',projectKey:first.payload.projectKey,text:title,summary:title,menus:items.map(x=>x.menu)};
 if(selection.length<=1)return [{url:first.url,payload:{...base,teams:{enabled:teams,menus:teams?selection[0].menus:[],omittedMenus:[]},deliveryMode:teams?'teams-and-email':'email-only',attachments:teams?[selection[0].attachment]:[],email}}];
 const deliveries=job.email?[{url:first.url,payload:{...base,email,teams:{enabled:false,menus:[],omittedMenus:[]},attachments:[],deliveryMode:'email-only'}}]:[];
 for(const [i,part] of selection.entries())deliveries.push({url:first.url,payload:{...base,menus:part.menus,text:first.payload.projectKey+' · '+part.menus.map(m=>jiraPlusLabels[m]).join(' / ')+' · '+(i+1)+'/'+selection.length,email:{enabled:false},teams:{enabled:true,menus:part.menus,omittedMenus:[],part:i+1,parts:selection.length},deliveryMode:'teams-only',attachments:[part.attachment]}});
 return deliveries;
 });
}
function jiraPlusValidateDeliveries(deliveries,job,target){for(const d of deliveries){const current=target(d.payload.projectKey+'-1');if(!current)throw Error(d.payload.projectKey+' 通知未启用，未发送');if(jiraPlusWebhook(current.webhook)!==d.url)throw Error(d.payload.projectKey+' Webhook 配置已变化，未发送');if(d.payload.email?.enabled&&jiraPlusRecipients(current.recipients||[])!==jiraPlusRecipients(d.payload.email.recipients))throw Error(d.payload.projectKey+' 邮件收件人配置已变化，未发送');}}
async function jiraPlusFlush(job){
 const entries=jiraPlusPending||[];jiraPlusPending=null;const deliveries=jiraPlusMergeDeliveries(entries,job),submitted=[];
 const validate=()=>jiraPlusValidateDeliveries(deliveries,job,key=>hub.target(key));validate();
 for(const d of deliveries){try{validate();await new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'POST',url:d.url,headers:{'Content-Type':'application/json'},data:JSON.stringify(d.payload),timeout:30000,onload:r=>r.status>=200&&r.status<300?resolve():reject(Error('HTTP '+r.status)),onerror:()=>reject(Error('网络失败，结果未知')),ontimeout:()=>reject(Error('超时，结果未知'))}));submitted.push(d);}catch(error){throw Error('已提交 '+submitted.filter(x=>x.payload.email.enabled).length+' 封邮件、'+submitted.filter(x=>x.payload.teams.enabled).length+' 张 Teams；'+d.payload.projectKey+' '+d.payload.menus.map(m=>jiraPlusLabels[m]).join(' / ')+' 发送失败：'+error.message+'；剩余未发送，未自动重试');}}
 const count=deliveries.filter(d=>d.payload.teams.enabled).length;return deliveries.length?'已提交 '+count+' 张 Teams 卡片'+(job.email?'；每项目一封合并邮件'+(job.attach?'及一个交互附件':''):'')+'；菜单 '+[...new Set(entries.map(e=>e.menu))].map(m=>jiraPlusLabels[m]).join(' / ')+'；最终投递请查看工作流':'扫描完成，没有可推送的数据';
}
