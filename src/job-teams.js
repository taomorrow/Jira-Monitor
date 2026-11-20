// Plan every Teams page before submitting; keep analysis groups intact.
const jobTeamsLabels={coe:'COE',sprint:'Sprint',epic:'Epic',risk:'Risk'};
const jobTeamsCardBytes=card=>new TextEncoder().encode(JSON.stringify([card])).length;
function jobTeamsCard(items,project,label=''){
 items=items.map(item=>{const copy=JSON.parse(JSON.stringify(item));for(const [index,card] of (copy.payload.attachments||[]).entries()){const prefix=item.menu+'-'+index+'-';const visit=node=>{if(!node||typeof node!=='object')return;if(node.id&&/^[A-Z]/.test(node.type||''))node.id=prefix+node.id;if(node.targetElements)node.targetElements=node.targetElements.map(x=>typeof x==='string'?prefix+x:{...x,elementId:prefix+x.elementId});for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);};visit(card.content);}return copy;});
 const cards=items.flatMap(x=>x.payload.attachments||[]);return {contentType:'application/vnd.microsoft.card.adaptive',content:{type:'AdaptiveCard',version:'1.2',msteams:{width:'Full',entities:cards.flatMap(c=>c.content?.msteams?.entities||[])},body:[{type:'TextBlock',text:project+' · '+(label||items.map(x=>jobTeamsLabels[x.menu]).join(' / ')),weight:'Bolder',size:'Large',wrap:true},...items.flatMap(item=>(item.payload.attachments||[]).flatMap(c=>[{type:'TextBlock',text:jobTeamsLabels[item.menu],weight:'Bolder',separator:true,wrap:true},...(c.content?.body||[]),...(c.content?.actions?.length?[{type:'ActionSet',actions:c.content.actions}]:[])]))]}};
}
function jobTeamsIsGroup(node){return node.type==='Container'&&(node.id?.includes('jira-group-')||node.items?.some(x=>x.type==='ColumnSet'&&x.columns?.length===5));}
function jobTeamsEpicItem(item,keys){
 const selected=new Set(keys),copy=JSON.parse(JSON.stringify(item));let kept=0;
 for(const card of copy.payload.attachments||[]){card.content.body=card.content.body.filter(node=>{if(!jobTeamsIsGroup(node))return true;let key='';try{key=decodeURIComponent((node.id||'').split('jira-group-')[1]||'');}catch{}if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(key))key=node.items?.[0]?.text?.match(/\b[A-Z][A-Z0-9_]*-\d+\b/)?.[0]||'';const keep=selected.has(key);if(keep)kept++;return keep;});card.content.body.push({type:'TextBlock',text:kept?'Epic 超限：仅推送 Configuration 中维护的 Epic；页面、邮件和交互报告保留完整扫描结果。':'Epic 超限：本项目扫描结果中没有匹配已维护 Key 的 Epic；完整扫描结果仍保留。',wrap:true,isSubtle:true,size:'Small'});}
 return copy;
}
function jobTeamsAnalysisPages(full,menu,project){
 const body=full.content.body,groups=body.filter(jobTeamsIsGroup);if(!groups.length)return null;
 const first=body.findIndex(jobTeamsIsGroup),last=body.lastIndexOf(groups.at(-1)),title=body[0],prefix=body.slice(1,first),suffix=body.slice(last+1),make=nodes=>({...full,content:{...full.content,body:[title,...prefix,...nodes,...suffix]}}),fit=nodes=>jobTeamsCardBytes(make(nodes))<=25*1024;
 function compact(group,mode){const g=JSON.parse(JSON.stringify(group));const walk=(n,inherited)=>{if(!n||typeof n!=='object')return;const row=n.type==='ColumnSet'&&n.columns?.length===5;if(row&&n.columns[0]?.selectAction)n.selectAction=n.columns[0].selectAction;if(mode===1&&row)for(const c of n.columns)delete c.selectAction;if(mode===2&&n!==g)delete n.selectAction;if(n.selectAction?.url===inherited)delete n.selectAction;const url=n.selectAction?.url||inherited;for(const child of [...(n.items||[]),...(n.columns||[])])walk(child,url);};walk(g,null);if(mode)g.items.push({type:'TextBlock',text:mode===1?'精简链接：点击状态行查询对应扫描工单集合。':'精简链接：点击表格查询此分组全部扫描工单，逐项明细见交互报告。',size:'Small',isSubtle:true,wrap:true});return g;}
 const packed=[];let page=[];for(const original of groups){let group=compact(original,0);for(let mode=1;!fit([group])&&mode<=2;mode++)group=compact(original,mode);if(!fit([group]))throw Error(project+' '+jobTeamsLabels[menu]+' 单个分组仍超限，已保留完整状态表而停止发送，请缩小扫描范围');if(page.length&&!fit([...page,group])){packed.push(page);page=[];}page.push(group);}if(page.length)packed.push(page);
 return packed.map((nodes,i)=>{const card=make(nodes);card.content.body[0]={...title,text:project+' · '+jobTeamsLabels[menu]+' · '+(i+1)+'/'+packed.length};if(jobTeamsCardBytes(card)>26*1024)throw Error('完整分组分页仍超限，未发送');return {attachment:card,menus:[menu],page:i+1,pages:packed.length};});
}
function jobTeamsParts(items,project,{epicKeys=[]}={}){
 const all=items.map(x=>x.menu);if(items.some(x=>x.payload.teams?.enabled===false||!x.payload.attachments?.length))throw Error(project+' Teams 菜单报告缺失，未发送');
 const combined=jobTeamsCard(items,project);if(jobTeamsCardBytes(combined)<=26*1024)return [{attachment:combined,menus:all}];
 const result=[];for(const original of items){let item=original;const label=jobTeamsLabels[item.menu];let full=jobTeamsCard([item],project);if(item.menu==='epic'&&jobTeamsCardBytes(full)>26*1024&&epicKeys.length){item=jobTeamsEpicItem(item,epicKeys);full=jobTeamsCard([item],project);}if(jobTeamsCardBytes(full)<=26*1024){result.push({attachment:full,menus:[item.menu]});continue;}
  if(['sprint','epic'].includes(item.menu)){const pages=jobTeamsAnalysisPages(full,item.menu,project);if(pages){result.push(...pages);continue;}}
  const template=JSON.parse(JSON.stringify(full));template.content.body=[];const title=full.content.body[0];
  const fit=nodes=>{const c={...template,content:{...template.content,body:[title,...nodes]}};return jobTeamsCardBytes(c)<=25*1024;};
  function divide(node){if(fit([node]))return [node];if(node.type==='Container'&&node.items?.length){const heading=node.items[0]?.type==='TextBlock'?node.items[0]:null;return node.items.flatMap((child,i)=>divide(child).map(part=>({...node,items:heading&&i?[heading,part]:[part]})));}if(node.type==='TextBlock'&&node.text?.length>1000){const chars=Array.from(node.text),parts=[];for(let i=0;i<chars.length;i+=1000)parts.push({...node,text:chars.slice(i,i+1000).join('')});return parts;}throw Error(project+' '+label+' 单条内容超限，无法安全分页；请缩小扫描范围，未发送');}
  const nodes=full.content.body.slice(1).flatMap(node=>node.type==='ActionSet'?node.actions.filter(a=>a.type==='Action.OpenUrl').map(action=>({type:'ActionSet',actions:[action]})):divide(node));let page=[];const pages=[];
  for(const node of nodes){if(!fit([node]))throw Error(project+' '+label+' 单条内容仍超限，未发送');if(page.length&&!fit([...page,node])){pages.push(page);page=[];}page.push(node);}if(page.length)pages.push(page);
  pages.forEach((body,i)=>{const card={...template,content:{...template.content,body:[{...title,text:project+' · '+label+' · '+(i+1)+'/'+pages.length},...body]}};if(jobTeamsCardBytes(card)>26*1024)throw Error('Teams 分页仍超限，未发送');result.push({attachment:card,menus:[item.menu],page:i+1,pages:pages.length});});
 }return result;
}

if(typeof module==='object'&&module.exports)module.exports={jobTeamsCardBytes,jobTeamsCard,jobTeamsParts,jobTeamsEpicItem,jobTeamsAnalysisPages};
