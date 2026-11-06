// Pure snapshot grouping. No history, external state, or notification side effects.
function createKanbanCore(statusOrder){
 const norm=value=>String(value||'').trim().replace(/\s+/g,' ').toLowerCase();
 const isStory=issue=>/^(story|用户故事|故事)$/.test(norm(issue.fields?.issuetype?.name))&&issue.fields?.issuetype?.subtask!==true;
 const unique=issues=>[...new Map(issues.map(issue=>[issue.key,issue])).values()];
 const order=name=>{const i=statusOrder.findIndex(x=>norm(x)===norm(name));return i<0?statusOrder.length:i;};
 function statuses(issues){const groups=new Map(statusOrder.map(name=>[norm(name),{name,issues:[]}]));for(const issue of unique(issues)){const name=issue.fields?.status?.name||'未知状态',key=norm(name);if(!groups.has(key))groups.set(key,{name,issues:[]});groups.get(key).issues.push(issue);}return [...groups.values()].sort((a,b)=>order(a.name)-order(b.name)||a.name.localeCompare(b.name));}
 function sprints(value){return (Array.isArray(value)?value:value?[value]:[]).map(v=>{if(v&&typeof v==='object'){if(!/^\d+$/.test(String(v.id)))throw Error('Sprint ID 无效');return {id:String(v.id),name:v.name||String(v.id),state:v.state||''};}const raw=String(v),id=/\bid=(\d+)/.exec(raw),name=/\bname=(.*?)(?=,\w+=|\]$)/.exec(raw),state=/\bstate=([^,\]]+)/.exec(raw);if(!id)throw Error('无法识别 Sprint 字段格式');return {id:id[1],name:name?.[1]||id[1],state:state?.[1]||''};});}
 const validSprint=s=>!/closed/i.test(s.name+' '+s.state);
 function memberships(issue,mode,field){
  if(mode==='sprint')return sprints(issue.fields?.[field]).filter(validSprint);
  const value=issue.fields?.[field];if(value==null||value==='')return [{id:'none',name:'未分配 Epic'}];
  if(field==='parent'&&value.fields?.issuetype&&!(/^(epic|史诗)$/.test(norm(value.fields.issuetype.name))||value.fields.issuetype.hierarchyLevel===1))return [{id:'none',name:'未分配 Epic'}];
  const key=String(typeof value==='object'?value.key||'':value).trim().toUpperCase();if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(key))throw Error(issue.key+' 的 Epic 关联编号格式无效');return [{id:key,name:key}];
 }
 function groups(issues,mode,field){const map=new Map();for(const issue of unique(issues.filter(isStory))){for(const m of memberships(issue,mode,field)){if(!map.has(m.id))map.set(m.id,{...m,issues:[]});const group=map.get(m.id);if(!group.issues.some(x=>x.key===issue.key))group.issues.push(issue);}}return [...map.values()].sort((a,b)=>a.id==='none'?1:b.id==='none'?-1:a.name.localeCompare(b.name));}
 const metrics=[{id:'open',name:'Open',statuses:['open'],color:'#2f508b'},{id:'dev',name:'Dev',statuses:['in progress'],color:'#e91f27'},{id:'test',name:'Test',statuses:['ready for test','testing'],color:'#f7c820'}];
 function buckets(issues){return metrics.map(metric=>({...metric,issues:unique(issues).filter(issue=>metric.statuses.includes(norm(issue.fields?.status?.name)))}));}
 function assignees(issues){const map=new Map();for(const issue of unique(issues)){const a=issue.fields?.assignee,key=a?.accountId||a?.key||a?.name||a?.displayName||'unassigned';if(!map.has(key))map.set(key,{name:a?.displayName||'未分配',issues:[]});map.get(key).issues.push(issue);}return [...map.values()].map(g=>({...g,statuses:statuses(g.issues).filter(s=>s.issues.length),completed:g.issues.filter(i=>['completed','complete','sit','ready for uat','uat','ready for deploy','deployed','done'].includes(norm(i.fields?.status?.name)))})).sort((a,b)=>b.issues.length-a.issues.length||a.name.localeCompare(b.name));}
 return {assignees,norm,isStory,unique,statuses,sprints,validSprint,groups,buckets,metrics};
}
if(typeof module==='object'&&module.exports)module.exports={createKanbanCore};
