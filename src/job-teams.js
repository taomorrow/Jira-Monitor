// Plan every Teams page before submitting; preserve all selected menu data.
const jobTeamsLabels={coe:'COE',sprint:'Sprint',epic:'Epic',risk:'Risk'};
const jobTeamsCardBytes=card=>new TextEncoder().encode(JSON.stringify([card])).length;
function jobTeamsCard(items,project,label=''){
 items=items.map(item=>{const copy=JSON.parse(JSON.stringify(item));for(const [index,card] of (copy.payload.attachments||[]).entries()){const prefix=item.menu+'-'+index+'-';const visit=node=>{if(!node||typeof node!=='object')return;if(node.id&&/^[A-Z]/.test(node.type||''))node.id=prefix+node.id;if(node.targetElements)node.targetElements=node.targetElements.map(x=>typeof x==='string'?prefix+x:{...x,elementId:prefix+x.elementId});for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);};visit(card.content);}return copy;});
 const cards=items.flatMap(x=>x.payload.attachments||[]);return {contentType:'application/vnd.microsoft.card.adaptive',content:{type:'AdaptiveCard',version:'1.2',msteams:{width:'Full',entities:cards.flatMap(c=>c.content?.msteams?.entities||[])},body:[{type:'TextBlock',text:project+' · '+(label||items.map(x=>jobTeamsLabels[x.menu]).join(' / ')),weight:'Bolder',size:'Large',wrap:true},...items.flatMap(item=>(item.payload.attachments||[]).flatMap(c=>[{type:'TextBlock',text:jobTeamsLabels[item.menu],weight:'Bolder',separator:true,wrap:true},...(c.content?.body||[]),...(c.content?.actions?.length?[{type:'ActionSet',actions:c.content.actions}]:[])]))]}};
}
function jobTeamsParts(items,project){
 const all=items.map(x=>x.menu);if(items.some(x=>x.payload.teams?.enabled===false||!x.payload.attachments?.length))throw Error(project+' Teams 菜单报告缺失，未发送');
 const combined=jobTeamsCard(items,project);if(jobTeamsCardBytes(combined)<=26*1024)return [{attachment:combined,menus:all}];
 const result=[];for(const item of items){const label=jobTeamsLabels[item.menu],full=jobTeamsCard([item],project);if(jobTeamsCardBytes(full)<=26*1024){result.push({attachment:full,menus:[item.menu]});continue;}
  const template=JSON.parse(JSON.stringify(full));template.content.body=[];const title=full.content.body[0];
  const fit=nodes=>{const c={...template,content:{...template.content,body:[title,...nodes]}};return jobTeamsCardBytes(c)<=25*1024;};
  function divide(node){if(fit([node]))return [node];if(node.type==='Container'&&node.items?.length){const heading=node.items[0]?.type==='TextBlock'?node.items[0]:null;return node.items.flatMap((child,i)=>divide(child).map(part=>({...node,items:heading&&i?[heading,part]:[part]})));}if(node.type==='TextBlock'&&node.text?.length>1000){const chars=Array.from(node.text),parts=[];for(let i=0;i<chars.length;i+=1000)parts.push({...node,text:chars.slice(i,i+1000).join('')});return parts;}throw Error(project+' '+label+' 单条内容超限，无法安全分页；请缩小扫描范围，未发送');}
  const nodes=full.content.body.slice(1).flatMap(node=>node.type==='ActionSet'?node.actions.filter(a=>a.type==='Action.OpenUrl').map(action=>({type:'ActionSet',actions:[action]})):divide(node));let page=[];const pages=[];
  for(const node of nodes){if(!fit([node]))throw Error(project+' '+label+' 单条内容仍超限，未发送');if(page.length&&!fit([...page,node])){pages.push(page);page=[];}page.push(node);}if(page.length)pages.push(page);
  pages.forEach((body,i)=>{const card={...template,content:{...template.content,body:[{...title,text:project+' · '+label+' · '+(i+1)+'/'+pages.length},...body]}};if(jobTeamsCardBytes(card)>26*1024)throw Error('Teams 分页仍超限，未发送');result.push({attachment:card,menus:[item.menu],page:i+1,pages:pages.length});});
 }return result;
}

if(typeof module==='object'&&module.exports)module.exports={jobTeamsCardBytes,jobTeamsCard,jobTeamsParts};
