// Current-query Due date and status snapshot; never expands the query or changes issues.
(()=>{
 const view=hub.due;view.style.cssText='background:#f7f9fc';
 const css=el('style',null,view);css.textContent='#due-view button{cursor:pointer;border:1px solid #dbe3f0;border-radius:7px;padding:7px 12px;background:white;color:#245de8}#due-view #due-load{background:#245de8;color:white}#due-view .due-card{background:white;border:1px solid #dbe3f0;border-radius:12px;padding:16px;margin:14px 0}#due-view table{width:100%;border-collapse:collapse}#due-view th,#due-view td{text-align:left;border-bottom:1px solid #edf1f7;padding:9px}#due-view p{color:#718098}#due-view .due-count{border:0;padding:0;text-decoration:underline;font-weight:700}';
 el('h2','Due',view);el('p','读取当前查询全部分页，按 Due 日期及当前 Status 分类；未填写日期的工单单列。点击数量查看明细。',view);
 const load=el('button','载入并分析当前页面（全部分页）',view);load.id='due-load';
 const message=el('p','点击载入开始分析。',view);message.id='due-message';message.setAttribute('role','status');
 const results=el('div',null,view);results.id='due-results';let busy=false;
 async function api(path){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);try{const r=await fetch(path,{credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});if(!r.ok)throw Error('Jira HTTP '+r.status+'，请检查登录及查询权限。');if(!r.headers.get('content-type')?.includes('application/json'))throw Error('接口返回非 JSON，请重新登录 Jira。');return await r.json();}finally{clearTimeout(timer);}}
 const norm=x=>String(x||'').trim().toLowerCase();
 function render(issues){
  const dates=new Map();for(const issue of issues){const value=issue.fields?.duedate,date=/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value:'未设置 Due';if(!dates.has(date))dates.set(date,[]);dates.get(date).push(issue);}
  const count=(parent,label,items)=>{const button=el('button',String(items.length),parent);button.className='due-count';button.setAttribute('aria-label',label+'，'+items.length+' 条');button.onclick=()=>hub.showIssueDetails('Due · '+label,items.map(issue=>({issue,after:{name:issue.fields?.status?.name||'未知状态'}})),{before:'',after:'当前状态',due:true});};
  const total=el('div',null,results);total.className='due-card';el('strong','当前查询合计：',total);count(total,'全部日期',issues);
  for(const [date,items] of [...dates].sort(([a],[b])=>a==='未设置 Due'?1:b==='未设置 Due'?-1:a.localeCompare(b))){
   const card=el('section',null,results);card.className='due-card';const title=el('h3','Due · '+date+' · ',card);count(title,date,items);
   const table=el('table',null,card),thead=el('thead',null,table),head=el('tr',null,thead);el('th','Status',head);el('th','数量',head);const body=el('tbody',null,table),statuses=new Map();
   for(const issue of items){const name=issue.fields?.status?.name||'未知状态',key=norm(name);if(!statuses.has(key))statuses.set(key,{name,items:[]});statuses.get(key).items.push(issue);}
   const rank=name=>{const n=hub.statusOrder.findIndex(x=>norm(x)===norm(name));return n<0?999:n;};
   for(const group of [...statuses.values()].sort((a,b)=>rank(a.name)-rank(b.name)||a.name.localeCompare(b.name))){const row=el('tr',null,body);el('td',group.name,row);count(el('td',null,row),date+' · '+group.name,group.items);}
  }
 }
 load.onclick=async()=>{if(busy)return;busy=true;load.disabled=true;results.replaceChildren();message.style.color='';try{
  const query=hub.pageQuery(document,location.href);const jql=query.jql||(await api('/rest/api/2/filter/'+query.filter)).jql;if(!jql?.trim())throw Error('未获取到有效查询，请先打开 Jira 列表并执行搜索。');
  let start=0,total;const issues=[],seen=new Set();do{const page=await api('/rest/api/2/search?'+new URLSearchParams({jql,fields:'summary,status,assignee,duedate',startAt:String(start),maxResults:'100'}));if(!Array.isArray(page.issues)||!Number.isInteger(page.total)||page.total<0)throw Error('搜索分页格式异常');if(total!==undefined&&total!==page.total)throw Error('查询条目数变化，请重新载入');total=page.total;if(!page.issues.length&&start<total)throw Error('分页提前结束，已停止以避免遗漏');for(const issue of page.issues){if(!issue.key||seen.has(issue.key))throw Error('分页出现重复或无效工单，请重试');seen.add(issue.key);issues.push(issue);}start+=page.issues.length;message.textContent='读取 '+start+' / '+total+'…';}while(start<total);
  if(issues.length!==total)throw Error('分页条目数不一致，请重试');render(issues);message.textContent='已分析 '+total+' 条工单 · '+new Date().toLocaleString('zh-CN',{hour12:false})+' · 仅当前查询范围';
 }catch(error){results.replaceChildren();message.style.color='#c9372c';message.textContent=error.message;}finally{busy=false;load.disabled=false;}};
})();
