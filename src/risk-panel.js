// Independent Risk menu. Kanban state, controls and requests are never used.
(()=>{
 __RISK_QUERY_HELPER__
 const view=hub.risk,core=createRiskCore();
 const style=el('style',null,view);style.textContent='#risk-view{background:#f5f7fc;color:#24334d}#risk-view h2{margin:0;font-size:22px}#risk-view .risk-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px}#risk-view button{font:inherit;cursor:pointer;border:1px solid #dbe3f0;border-radius:7px;background:white;color:#245de8;padding:7px 10px}#risk-view button:disabled{opacity:.5;cursor:default}#risk-view #risk-load{background:#245de8;color:white}#risk-view .risk-notify{border:1px solid #dfe6f2;border-radius:12px;background:white;padding:18px;margin-top:16px}#risk-view .risk-notify label{margin-right:14px}#risk-view .risk-status{color:#718098}#risk-view #risk-send-dialog{border:1px solid #dbe3f0;border-radius:12px;width:min(900px,94vw);max-height:85vh;overflow:auto;padding:24px;color:#24334d}#risk-view #risk-send-dialog::backdrop{background:#14284666}';
 const toolbar=el('div',null,view);toolbar.className='risk-toolbar';el('h2','Risk · 交付风险',toolbar);const load=el('button','载入当前查询',toolbar);load.id='risk-load';
 const message=el('p','读取当前查询全部分页中的 Story，按 Assignee / Due 分析。',view);message.id='risk-message';message.className='risk-status';message.setAttribute('role','status');
 const results=el('div',null,view);results.id='risk-results';
 let model=null,busy=false;
 const notifications=createRiskNotifications({hub,view,el,getModel:()=>model,isBusy:()=>busy});
 async function api(path){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);try{const r=await fetch(path,{credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});if(!r.ok)throw Error('Jira HTTP '+r.status+'，请检查登录和查询权限。');if(!r.headers.get('content-type')?.includes('application/json'))throw Error('接口返回登录页或非 JSON，请重新登录 Jira。');return await r.json();}finally{clearTimeout(timer);}}
 async function scan(){
  if(busy)throw Error('Risk 正在扫描，请稍后再试。');busy=true;load.disabled=true;model=null;results.replaceChildren();notifications.refresh();
  try{
   const query=pageQuery(document,location.href),jql=query.jql||(await api('/rest/api/2/filter/'+query.filter)).jql;if(!jql?.trim())throw Error('未获取到有效 JQL，请先在 Jira 执行搜索。');
   const fields=await api('/rest/api/2/field');if(!Array.isArray(fields))throw Error('字段接口格式异常');const epicFields=fields.filter(f=>f.schema?.custom==='com.pyxis.greenhopper.jira:gh-epic-link');if(epicFields.length>1)throw Error('无法唯一识别 Epic 字段，请检查字段定义。');const epicField=epicFields[0]?.id||(fields.some(f=>f.id==='parent')?'parent':'');
   const wanted=[...new Set(['summary','status','assignee','issuetype','duedate','parent',epicField].filter(Boolean))].join(','),issues=[],seen=new Set();let start=0,total;
   do{const page=await api('/rest/api/2/search?'+new URLSearchParams({jql,fields:wanted,startAt:String(start),maxResults:'100'}));if(!Array.isArray(page.issues)||!Number.isInteger(page.total)||page.total<0)throw Error('搜索分页格式异常');if(total!==undefined&&total!==page.total)throw Error('查询条目数变化，请重新载入');total=page.total;if(!page.issues.length&&start<total)throw Error('分页提前结束，已停止以避免遗漏');for(const issue of page.issues){if(!issue.key||seen.has(issue.key))throw Error('分页出现重复或无效工单，请重新载入');if(!issue.fields?.issuetype?.name)throw Error(issue.key+' 未返回工单类型，无法确认 Story 范围');seen.add(issue.key);issues.push(issue);}start+=page.issues.length;message.textContent='读取 '+start+' / '+total+'…';}while(start<total);
   if(issues.length!==total)throw Error('分页条目数不一致');const options={epicField,url:location.origin+'/issues/?'+new URLSearchParams({jql}),epicNames:{}};
   const provisional=core.model(issues,options),epicKeys=[...new Set(provisional.rows.map(i=>i.epic).filter(key=>/^[A-Z][A-Z0-9_]*-\d+$/i.test(key)))];
   for(let start=0;start<epicKeys.length;start+=50){try{const keys=epicKeys.slice(start,start+50),page=await api('/rest/api/2/search?'+new URLSearchParams({jql:'key in ('+keys.join(',')+')',fields:'summary,issuetype',maxResults:'50'}));for(const i of page.issues||[])if(keys.includes(i.key)&&(/^(epic|史诗)$/i.test(i.fields?.issuetype?.name||'')||i.fields?.issuetype?.hierarchyLevel===1))options.epicNames[i.key]=i.key+' · '+(i.fields?.summary||'');}catch{/* Optional labels never expand the Story scope. */}}
   model=core.model(issues,{...options,now:new Date()});model.projects=[...new Set(issues.filter(i=>/^(story|用户故事|故事)$/i.test(i.fields?.issuetype?.name||'')&&!i.fields?.issuetype?.subtask).map(i=>i.key.split('-')[0].toUpperCase()))];
   hub.noteJobScope(model.projects,new URL(model.url).searchParams.get('jql'));createRiskView(results,model);message.textContent='截至 '+model.time+' · 当前查询 '+total+' 条 · 有效 Story '+model.rows.length+' 条；点击 Assignee 弹出 Due 风险窗口。';
   return model;
  }catch(error){model=null;results.replaceChildren();message.textContent=error.message;throw error;}finally{busy=false;load.disabled=false;notifications.refresh();}
 }
 load.onclick=()=>scan().catch(()=>{});
 hub.jobRunners.risk=async job=>{hub.show('risk');await scan();if(job.teams||job.email)await notifications.sendJob(job);};
})();
