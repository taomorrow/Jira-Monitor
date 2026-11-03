const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(__dirname+'/../jiraMonitor.user.js','utf8');
function boot(path='/issues/?jql=project%3DCSP',options={}){
 const dom=new JSDOM(path.startsWith('/browse/')?'<body></body>':'<body><div id="issuetable"></div></body>',{url:'https://jira.xpaas.lenovo.com'+path,runScripts:'outside-only'}),w=dom.window;
 const store=new Map([['jira-monitor-projects-v1',[{projectKey:'CSP',webhook:'https://example.api.powerplatform.com/workflows/test',recipients:['test@example.com'],autoNotify:false}]]]),requests=[],errors=[];
 w.GM_getValue=(k,d)=>store.has(k)?store.get(k):d;w.GM_setValue=(k,v)=>store.set(k,v);w.GM_deleteValue=k=>store.delete(k);w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=x=>requests.push(x);w.fetch=()=>{throw Error('Unexpected automatic request');};w.setInterval=()=>0;w.setTimeout=()=>0;w.TextEncoder=TextEncoder;w.console.error=(...x)=>errors.push(x);
 if(options.auto)store.set('jira-monitor-auto-detail',true);if(options.setup)options.setup(w);
 w.eval(source);return {dom,w,store,requests,errors,hub:w.document.getElementById('jira-monitor-hub').shadowRoot};
}
test('single panel on issue, dashboard, board and detail pages; starts no requests',()=>{
 for(const path of ['/issues/','/browse/CSP-1','/secure/Dashboard.jspa','/secure/RapidBoard.jspa']){
 const f=boot(path);assert.equal(f.errors.length,0,JSON.stringify(f.errors));assert.equal(f.requests.length,0);assert.equal(f.hub.querySelector('#shell').hidden,true);
 const buttons=[...f.hub.querySelector('nav').querySelectorAll('button')];buttons[1].click();assert.equal(f.hub.querySelectorAll('section')[1].hidden,false);
 const sprint=f.hub.querySelector('#jsa-host').shadowRoot;assert.ok(sprint.getElementById('run'));assert.equal(sprint.getElementById('launch').style.display,'none');
 buttons[0].click();if(path.startsWith('/browse/'))assert.equal(f.hub.querySelector('#shell').hidden,true);else assert.equal(f.hub.querySelectorAll('section')[0].hidden,false);assert.ok(f.hub.querySelector('#jira-duration-panel-host').shadowRoot.querySelector('[data-start]'));f.dom.window.close();
 }
});
test('both modules use the same editable project configuration',()=>{
 const f=boot();f.hub.querySelector('#nav-settings').click();
 const root=f.hub.querySelector('#settings-view');assert.ok(root.querySelector('[data-project-table]'));assert.equal(root.querySelector('[data-project-key]').value,'CSP');root.querySelector('[data-project-emails]').value='updated@example.com';root.querySelector('[data-project-save]').click();assert.equal(f.store.get('jira-monitor-projects-v1')[0].recipients.join(';'),'updated@example.com');assert.equal(f.requests.length,0);f.dom.window.close();
});
test('mixed project Sprint reports route only selected project totals and shared recipients',async()=>{
 const f=boot('/issues/?jql=project%20in%20(CSP,OSPIT)'),w=f.w;
 const issues=['CSP-1','OSPIT-2'].map(key=>({key,fields:{summary:key,created:'2020-01-01T00:00:00Z',updated:'2026-01-01T00:00:00Z',status:{id:'1',name:'In Progress'},customfield_1:[{id:7,name:'Shared Sprint',state:'active'}]},changelog:{startAt:0,total:0,histories:[]}}));
 w.fetch=async path=>{const u=new URL(path,w.location.origin);let data;
 if(u.pathname.endsWith('/field'))data=[{id:'customfield_1',schema:{custom:'com.pyxis.greenhopper.jira:gh-sprint'}}];
 else if(u.pathname.endsWith('/search'))data={total:2,issues};
 else data=issues.find(i=>u.pathname.endsWith('/'+i.key));
 return {ok:true,headers:{get:()=> 'application/json'},json:async()=>data};};
 const root=f.hub.querySelector('#jsa-host').shadowRoot;
 async function click(id){root.getElementById(id).click();for(let i=0;i<100&&root.getElementById('run').disabled;i++)await new Promise(r=>setTimeout(r,1));}
 await click('load');await click('run');assert.match(root.getElementById('message').textContent,/分析完成/);
 root.querySelector('#results td button').click();assert.ok(w.document.getElementById('jira-monitor-issue-details'));assert.equal(root.getElementById('detail').childElementCount,0);w.document.getElementById('jira-monitor-issue-details').shadowRoot.querySelector('button').click();
 assert.equal(root.getElementById('notify-project').querySelectorAll('input').length,1);
 for(const input of root.getElementById('notify-project').querySelectorAll('input'))input.checked=input.value==='CSP';
 root.getElementById('notify-project').querySelector('input[value="CSP"]').checked=true;await click('teams-preview');assert.equal(f.requests.length,0);assert.ok(root.getElementById('teams-preview-content'),root.getElementById('message').textContent);assert.match(root.getElementById('teams-preview-content').textContent,/Shared Sprint/);
 root.getElementById('teams-send').click();assert.equal(f.requests.length,1);const request=f.requests[0],payload=JSON.parse(request.data);
 assert.equal(request.url,f.store.get('jira-monitor-projects-v1')[0].webhook);assert.equal(payload.projectKey,'CSP');assert.equal(payload.email.to,'test@example.com');const mail=new JSDOM(payload.email.bodyHtml).window.document;assert.ok(mail.querySelector('table thead th'));assert.match(mail.body.textContent,/所选状态合计/);assert.equal(mail.querySelector('pre'),null);assert.match(payload.email.bodyText,/In Progress \| 1 \| 1/);assert.doesNotMatch(payload.email.bodyText,/OSPIT-2/);
 request.onload({status:202});await new Promise(r=>setTimeout(r,1));root.getElementById('teams-preview-cancel').click();for(const input of root.getElementById('notify-project').querySelectorAll('input'))input.checked=input.value==='OSPIT';await click('teams-preview');assert.equal(f.requests.length,1);assert.match(root.getElementById('message').textContent,/勾选/);f.dom.window.close();
});
test('shared settings reject duplicate keys and unsafe webhook URLs; HEAD sends no report',()=>{
 const f=boot();f.hub.querySelector('#nav-settings').click();
 const root=f.hub.querySelector('#settings-view');
 root.querySelector('[data-project-hook]').value='https://evil.example/workflows/test';root.querySelector('[data-project-save]').click();assert.match(root.querySelector('[data-project-status]').textContent,/不支持/);assert.equal(f.store.get('jira-monitor-projects-v1')[0].webhook,'https://example.api.powerplatform.com/workflows/test');
 root.querySelector('[data-legacy-key]').value='CSP';root.querySelector('[data-project-diagnose]').click();assert.equal(f.requests.length,1);assert.equal(f.requests[0].method,'HEAD');assert.equal(f.requests[0].data,undefined);f.dom.window.close();
});
test('sidebar, close, drag and resize persist geometry; settings owns the only auto switch',()=>{
 const f=boot(),root=f.hub,w=f.w;root.querySelector('#launcher').click();assert.equal(root.querySelector('#timeout-view').hidden,false);
 assert.equal(root.querySelector('#titlebar').querySelector('input'),null);assert.equal(root.querySelector('#jsa-host').shadowRoot.getElementById('teams-config'),null);
 const shell=root.querySelector('#shell'),before=parseFloat(shell.style.width),grip=root.querySelector('#resize-grip');
 const event=(type,x,y)=>new w.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});
 grip.dispatchEvent(event('pointerdown',100,100));grip.dispatchEvent(event('pointermove',-50,50));grip.dispatchEvent(event('pointerup',-50,50));assert.ok(parseFloat(shell.style.width)<before);assert.equal(f.store.get('jira-monitor-window-v1').width,parseFloat(shell.style.width));
 const top=parseFloat(shell.style.top),bar=root.querySelector('#titlebar');bar.dispatchEvent(event('pointerdown',100,100));bar.dispatchEvent(event('pointermove',100,125));bar.dispatchEvent(event('pointerup',100,125));assert.notEqual(parseFloat(shell.style.top),top);
 root.querySelector('#nav-settings').click();assert.ok(root.querySelector('[data-auto-detail]'));root.querySelector('#window-close').click();assert.equal(shell.hidden,true);f.dom.window.close();
});
test('auto detail is an independent popup and disabling cancels pending results',async()=>{
 let resolve;
 const f=boot('/browse/CSP-9',{auto:true,setup(w){w.fetch=()=>new Promise(r=>resolve=r);}}),root=f.hub;
 assert.equal(root.querySelector('#detail-popup').hidden,false);assert.equal(root.querySelector('#shell').hidden,true);
 assert.equal(root.querySelector('#jira-duration-panel-host').shadowRoot.querySelector('[data-start]').disabled,false);
 const pending=JSON.parse(f.w.sessionStorage.getItem('jira-monitor-auto-detail-v1'));assert.equal(pending.active,true);assert.equal(f.w.sessionStorage.getItem('jira-monitor-manual-detail-v1'),null);
 root.querySelector('#detail-close').click();assert.equal(root.querySelector('#detail-popup').hidden,true);
 root.querySelector('#nav-settings').click();root.querySelector('[data-auto-detail]').click();assert.equal(f.store.get('jira-monitor-auto-detail'),false);assert.equal(root.querySelector('#detail-popup').hidden,true);
 resolve({ok:true,headers:{get:()=> 'application/json'},json:async()=>({fields:{status:{name:'In Progress'},summary:'late'},changelog:{startAt:0,total:0,histories:[]}})});await new Promise(r=>setTimeout(r,10));
 assert.equal(JSON.parse(f.w.sessionStorage.getItem('jira-monitor-auto-detail-v1')).results.length,0);f.dom.window.close();
});
test('detail popup completes analysis separately and sends Teams only without mail or report controls',async()=>{
 const f=boot('/browse/CSP-9',{auto:true,setup(w){w.fetch=async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({fields:{status:{name:'In Progress'},summary:'<script>unsafe</script>',assignee:{displayName:'Demo'}},changelog:{startAt:0,total:1,histories:[{id:'1',created:new Date(Date.now()-86400000).toISOString(),items:[{field:'status',fromString:'Open',toString:'In Progress'}]}]}})});}});
 await new Promise(r=>setTimeout(r,10));const state=JSON.parse(f.w.sessionStorage.getItem('jira-monitor-auto-detail-v1'));assert.equal(state.active,false);assert.equal(state.results.length,1);assert.equal(f.w.sessionStorage.getItem('jira-monitor-manual-detail-v1'),null);
 const popup=f.hub.querySelector('#jira-detail-panel-host').shadowRoot;assert.match(popup.querySelector('[data-progress]').textContent,/完成/);popup.querySelector('[data-teams]').click();await new Promise(r=>setTimeout(r,1));assert.equal(f.requests.length,1);const payload=JSON.parse(f.requests[0].data);assert.deepEqual(payload.email,{enabled:false});assert.ok(payload.attachments.length);assert.equal(popup.querySelector('[data-mail-preview]'),null);assert.equal(popup.querySelector('[data-report-export]'),null);assert.ok(popup.querySelector('[data-excel]'));f.requests[0].onload({status:202});await new Promise(r=>setTimeout(r,1));f.dom.window.close();
});
test('launcher drag saves position without opening; rules close is at the top',()=>{
 const f=boot(),w=f.w,root=f.hub,launcher=root.querySelector('#launcher');
 const event=(type,x,y)=>new w.MouseEvent(type,{bubbles:true,button:0,clientX:x,clientY:y});launcher.dispatchEvent(event('pointerdown',10,10));launcher.dispatchEvent(event('pointermove',180,140));launcher.dispatchEvent(event('pointerup',180,140));launcher.click();assert.equal(root.querySelector('#shell').hidden,true);assert.ok(f.store.get('jira-monitor-launcher-v1').left>0);launcher.click();assert.equal(root.querySelector('#shell').hidden,false);
 root.querySelector('#nav-settings').click();root.querySelector('[data-center-rules]').click();const modal=[...w.document.querySelectorAll('div')].find(n=>n.shadowRoot?.querySelector('[data-rule-close]'));assert.ok(modal);const close=modal.shadowRoot.querySelector('[data-rule-close]');assert.equal(close.textContent,'❌');assert.equal(close.parentElement.firstElementChild,close);assert.equal([...modal.shadowRoot.querySelectorAll('button')].filter(b=>b.textContent==='关闭').length,0);close.click();assert.equal(modal.isConnected,false);f.dom.window.close();
});
test('paused batch reopens its controls automatically on the Jira list page',()=>{
 const f=boot('/issues/',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify({id:'batch-1',mode:'batch',active:false,paused:true,rules:[],queue:[{key:'CSP-9'}],results:[],index:0,phase:'reading'}));}});
 assert.equal(f.hub.querySelector('#shell').hidden,false);assert.equal(f.hub.querySelector('#timeout-view').hidden,false);assert.equal(f.hub.querySelector('#jira-duration-panel-host').shadowRoot.querySelector('[data-stop]').disabled,false);assert.equal(f.hub.querySelector('#detail-popup').hidden,true);f.dom.window.close();
});
test('multiple projects freeze destinations and send separate reports once, retaining partial outcomes',async()=>{
 const f=boot('/issues/?jql=project%20in%20(CSP,OSPIT)'),w=f.w;
 f.store.get('jira-monitor-projects-v1').push({projectKey:'OSPIT',webhook:'https://other.logic.azure.com/workflows/osp',recipients:['osp@example.com']});
 const issues=['CSP-1','OSPIT-2'].map(key=>({key,fields:{summary:key,created:'2020-01-01T00:00:00Z',updated:'2026-01-01T00:00:00Z',status:{id:'1',name:'In Progress'},customfield_1:[{id:7,name:'Shared Sprint',state:'active'}]},changelog:{startAt:0,total:0,histories:[]}}));
 w.fetch=async path=>{const u=new URL(path,w.location.origin);const data=u.pathname.endsWith('/field')?[{id:'customfield_1',schema:{custom:'com.pyxis.greenhopper.jira:gh-sprint'}}]:u.pathname.endsWith('/search')?{total:2,issues}:issues.find(i=>u.pathname.endsWith('/'+i.key));return {ok:true,headers:{get:()=> 'application/json'},json:async()=>data};};
 const root=f.hub.querySelector('#jsa-host').shadowRoot;async function click(id){root.getElementById(id).click();for(let i=0;i<100&&root.getElementById('run').disabled;i++)await new Promise(r=>setTimeout(r,1));}
 await click('load');await click('run');await click('teams-preview');assert.equal(f.requests.length,0);assert.match(root.getElementById('teams-send').textContent,/2 个项目/);
 // Configuration changes after preview must not redirect the reviewed payload.
 f.store.get('jira-monitor-projects-v1')[1].webhook='https://changed.logic.azure.com/workflows/new';
 root.getElementById('teams-send').click();root.getElementById('teams-send').click();assert.equal(f.requests.length,1);
 f.requests[0].onload({status:500});await new Promise(r=>setTimeout(r,1));assert.equal(f.requests.length,2);assert.equal(f.requests[1].url,'https://other.logic.azure.com/workflows/osp');
 for(const [i,key,email] of [[0,'CSP','test@example.com'],[1,'OSPIT','osp@example.com']]){const payload=JSON.parse(f.requests[i].data);assert.equal(payload.projectKey,key);assert.equal(payload.email.to,email);assert.equal(payload.email.attachments.length,1);const html=Buffer.from(payload.email.attachments[0].contentBytes,'base64').toString('utf8');const doc=new JSDOM(html).window.document;const snapshot=JSON.parse(doc.querySelector('#report-data').textContent);assert.ok(snapshot.groups.every(g=>g.issues.every(issue=>issue.key.startsWith(key+'-'))));assert.doesNotMatch(html,/api.powerplatform.com|osp@example.com/);assert.match(payload.email.bodyText,/In Progress \| 1 \| 1/);}
 f.requests[1].onload({status:202});await new Promise(r=>setTimeout(r,1));assert.equal(f.requests.length,2);assert.match(root.getElementById('teams-send-status').textContent,/CSP：失败/);assert.match(root.getElementById('teams-send-status').textContent,/OSPIT：已提交/);f.dom.window.close();
});

test('detail routes never display the batch list, including active/paused jobs and SPA navigation',()=>{
 for(const paused of [false,true]){
 const f=boot('/browse/CSP-9',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify({id:'job',mode:'batch',active:!paused,paused,rules:[],queue:[{key:'CSP-9'}],results:[],index:0,phase:'reading'}));}});
 assert.equal(f.hub.querySelector('#shell').hidden,true);f.hub.querySelector('#launcher').click();assert.equal(f.hub.querySelector('#shell').hidden,true);f.dom.window.close();
 }
 const f=boot('/issues/');f.hub.querySelector('#launcher').click();assert.equal(f.hub.querySelector('#shell').hidden,false);f.w.history.pushState({},'', '/browse/CSP-9');f.w.dispatchEvent(new f.w.PopStateEvent('popstate'));assert.equal(f.hub.querySelector('#shell').hidden,true);f.dom.window.close();
});
const response=data=>({ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>data});
function apiIssue(key,status='In Progress'){return {key,fields:{summary:'Issue '+key,status:{name:status},assignee:{displayName:'Demo'},issuetype:{name:'Task'}},changelog:{startAt:0,total:1,histories:[{id:'1',created:new Date(Date.now()-86400000).toISOString(),items:[{field:'status',fromString:'Open',toString:'In Progress'}]}]}};}
const job=f=>JSON.parse(f.w.sessionStorage.getItem('jira-monitor-batch-v5'));
async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,1));}assert.ok(predicate(),'condition not reached');}
test('full batch uses paginated REST search and histories without clicking or navigating',async()=>{
 const f=boot(),calls=[],issues=[apiIssue('CSP-1'),apiIssue('CSP-2','Completed'),apiIssue('CSP-3')],url=f.w.location.href;
 f.w.HTMLElement.prototype.scrollIntoView=()=>{throw Error('Unexpected DOM navigation');};
 f.w.fetch=async(path,options={})=>{calls.push(path);if(path==='/rest/api/2/search'){const body=JSON.parse(options.body);assert.equal(body.jql,'project=CSP');return response({total:3,issues:body.startAt===0?issues.slice(0,2):issues.slice(2)});}const key=path.match(/issue\/([^/?]+)/)?.[1];return response(issues.find(i=>i.key===key));};
 const root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;root.querySelector('[data-start]').click();await until(()=>job(f)?.phase==='done');
 assert.equal(f.w.location.href,url);assert.equal(calls.filter(x=>x==='/rest/api/2/search').length,2);assert.equal(calls.filter(x=>x.includes('/issue/')).length,2);assert.equal(job(f).results.length,2);assert.equal(job(f).results[0].rules[0].seconds>=86400,true);assert.equal(f.hub.querySelector('#shell').hidden,false);f.dom.window.close();
});
test('pause discards an in-flight history page; resume counts once and never navigates',async()=>{
 const f=boot(),issue=apiIssue('CSP-1'),root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;let resolve,first=true,historyCalls=0;
 f.w.fetch=async(path)=>{if(path==='/rest/api/2/search')return response({total:1,issues:[issue]});if(path.includes('/changelog?')){historyCalls++;if(first){first=false;return new Promise(r=>resolve=r);}return response({total:2,values:issue.changelog.histories});}return response({...issue,changelog:{startAt:0,total:2,histories:[]}});};
 root.querySelector('[data-start]').click();await until(()=>resolve);root.querySelector('[data-pause]').click();resolve(response({total:2,values:issue.changelog.histories}));await new Promise(r=>setTimeout(r,3));assert.equal(job(f).index,0);assert.equal(historyCalls,1);
 root.querySelector('[data-start]').click();await until(()=>job(f)?.phase==='done');assert.equal(job(f).index,1);assert.equal(job(f).results.length,1);assert.equal(f.w.location.pathname,'/issues/');f.dom.window.close();
});
test('REST failure pauses on current issue and stop rejects late responses',async()=>{
 const f=boot(),issue=apiIssue('CSP-1'),root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;let fail=true,resolve;
 f.w.fetch=async path=>{if(path==='/rest/api/2/search')return response({total:1,issues:[issue]});if(fail)return {ok:false,status:403};return new Promise(r=>resolve=r);};
 root.querySelector('[data-start]').click();await until(()=>job(f)?.paused);assert.equal(job(f).index,0);assert.match(job(f).message,/403/);fail=false;root.querySelector('[data-start]').click();await until(()=>resolve);root.querySelector('[data-stop]').click();resolve(response(issue));await new Promise(r=>setTimeout(r,3));assert.equal(job(f).phase,'stopped');assert.equal(job(f).results.length,0);f.dom.window.close();
});
test('current page and Dashboard scan extracted Jira keys directly without search or link clicks',async()=>{
 for(const dashboard of [false,true]){
 const f=boot(dashboard?'/secure/Dashboard.jspa':'/issues/');
 f.w.document.getElementById('issuetable').innerHTML='<table><tr><td class="summary"><a href="/browse/CSP-1">Demo summary</a></td><td class="status">In Progress</td></tr></table>';
 const anchor=f.w.document.querySelector('a');anchor.addEventListener('click',()=>{throw Error('Unexpected click');});const calls=[];
 f.w.fetch=async path=>{calls.push(path);assert.ok(path.startsWith('/rest/api/2/issue/CSP-1'));return response(apiIssue('CSP-1'));};
 const root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;root.querySelector('[data-scope]').value='page';root.querySelector('[data-start]').click();await until(()=>job(f)?.phase==='done');assert.equal(job(f).results.length,1);assert.equal(calls.length,1);assert.equal(f.w.location.pathname,dashboard?'/secure/Dashboard.jspa':'/issues/');f.dom.window.close();
 }
});
function alertState(){const now=Date.now(),rules=[{name:'DEV',minDays:2,maxDays:3,currentStatuses:['In Progress'],startStatus:'In Progress',forbiddenAfterStart:[]}];const item=(key,days)=>({key,summary:'Summary '+key,assignee:'Demo',assigneeEmail:'demo@example.com',devAssignees:[{name:'Dev Demo',email:'dev@example.com',account:'dev'}],currentStatus:'In Progress',checkedAt:now,rules:[{name:'DEV',seconds:days*86400,checkedAt:now,effectiveMinDays:2,effectiveMaxDays:3}]});return {id:'summary',mode:'batch',apiScan:true,active:false,paused:false,phase:'done',rules,queue:[],index:4,results:[item('CSP-1',2.5),item('CSP-2',4),item('CSP-3',1),item('OSPIT-4',3)]};}
test('manual timeout sends one list per project, includes alerts only and keeps separate mail recipients',async()=>{
 const state=alertState(),f=boot('/issues/',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify(state));}});
 f.store.get('jira-monitor-projects-v1').push({projectKey:'OSPIT',webhook:'https://other.logic.azure.com/workflows/osp',recipients:['osp@example.com']});
 const root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;root.querySelector('[data-teams]').click();await until(()=>f.requests.length===1);
 const csp=JSON.parse(f.requests[0].data);assert.equal(csp.reportType,'timeout-summary');assert.equal(csp.items.length,2);assert.equal(csp.email.to,'test@example.com');assert.ok(csp.email.bodyHtml.includes('CSP-1')&&csp.email.bodyHtml.includes('CSP-2'));assert.doesNotMatch(csp.email.bodyHtml,/CSP-3|OSPIT-4/);assert.equal(csp.attachments[0].content.msteams.entities.length,1);f.requests[0].onload({status:202});await until(()=>f.requests.length===2);
 const osp=JSON.parse(f.requests[1].data);assert.equal(osp.items.length,1);assert.equal(osp.email.to,'osp@example.com');assert.equal(osp.projectKey,'OSPIT');f.requests[1].onload({status:202});await until(()=>!root.querySelector('[data-start]').disabled);assert.equal(f.requests.length,2);f.dom.window.close();
});
test('automatic timeout waits until scan completion then sends one project list and respects cooldown',async()=>{
 const f=boot(),root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;f.store.get('jira-monitor-projects-v1')[0].autoNotify=true;
 const issues=[apiIssue('CSP-1'),apiIssue('CSP-2')];for(const i of issues)i.changelog.histories[0].created=new Date(Date.now()-30*86400000).toISOString();
 let detailCalls=0;f.w.fetch=async path=>{if(path==='/rest/api/2/search')return response({total:2,issues});detailCalls++;assert.equal(f.requests.length,0);return response(issues.find(i=>path.includes('/'+i.key+'?')));};
 root.querySelector('[data-start]').click();await until(()=>f.requests.length===1);assert.equal(detailCalls,2);assert.equal(job(f).phase,'done');assert.equal(JSON.parse(f.requests[0].data).items.length,2);f.requests[0].onload({status:202});await until(()=>!root.querySelector('[data-start]').disabled);
 // Starting a fresh completed scan must not auto-submit the same cooling issues.
 f.w.fetch=async path=>path==='/rest/api/2/search'?response({total:2,issues}):response(issues.find(i=>path.includes('/'+i.key+'?')));root.querySelector('[data-start]').click();await until(()=>job(f)?.phase==='done'&&!root.querySelector('[data-start]').disabled);assert.equal(f.requests.length,1);f.dom.window.close();
});
test('large alert list stays within Teams card size while email retains every issue',async()=>{
 const state=alertState();state.results=Array.from({length:160},(_,i)=>({...state.results[0],key:'CSP-'+(i+100),summary:'较长的示例摘要'.repeat(35)}));const f=boot('/issues/',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify(state));}}),root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;
 root.querySelector('[data-teams]').click();await until(()=>f.requests.length===1);const payload=JSON.parse(f.requests[0].data);assert.equal(payload.items.length,160);assert.ok(Buffer.byteLength(JSON.stringify(payload.attachments))<26*1024);assert.match(JSON.stringify(payload.attachments),/卡片显示前/);const mail=new JSDOM(payload.email.bodyHtml);assert.equal(mail.window.document.querySelector('thead').parentElement.querySelectorAll(':scope > tbody > tr').length,160);mail.window.close();f.requests[0].onload({status:202});await until(()=>!root.querySelector('[data-start]').disabled);f.dom.window.close();
});
test('workflow order is shared by status filters, UI, CSV, Teams, email and interactive report',async()=>{
 const expected=['New','Grooming','Open','In Progress','Ready For Test','Testing','Completed','SIT','Ready For UAT','UAT','Ready For Deploy','DEPLOYED','Done','Cancelled'];
 const f=boot(),w=f.w,issues=[...expected].reverse().map((name,i)=>({key:'CSP-'+(i+1),fields:{summary:name,created:'2020-01-01T00:00:00Z',updated:'2026-01-01T00:00:00Z',status:{id:String(i),name:name.toLowerCase()},customfield_1:[{id:7,name:'Workflow Sprint',state:'active'}]},changelog:{startAt:0,total:0,histories:[]}}));
 w.fetch=async path=>{const u=new URL(path,w.location.origin),data=u.pathname.endsWith('/field')?[{id:'customfield_1',schema:{custom:'com.pyxis.greenhopper.jira:gh-sprint'}}]:u.pathname.endsWith('/search')?{total:issues.length,issues}:issues.find(issue=>u.pathname.endsWith('/'+issue.key));return response(data);};
 const root=f.hub.querySelector('#jsa-host').shadowRoot;async function click(id){root.getElementById(id).click();await until(()=>!root.getElementById('run').disabled);}
 await click('load');assert.deepEqual([...root.querySelectorAll('#statuses label')].map(label=>label.textContent),expected);assert.match(root.getElementById('status-box').textContent,/14 个/);await click('run');
 const ordered=[...expected,'所选状态合计'];assert.deepEqual([...root.querySelectorAll('#results td:first-child')].map(td=>td.textContent),ordered);
 let blob;w.URL.createObjectURL=b=>{blob=b;return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 await click('export');const csv=await new Promise(resolve=>{const reader=new w.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});assert.deepEqual(csv.split('\r\n').slice(2).map(row=>row.split(',')[2].replaceAll('"','')),ordered);
 await click('teams-preview');root.getElementById('teams-send').click();await until(()=>f.requests.length===1);const payload=JSON.parse(f.requests[0].data),container=payload.attachments[0].content.body.find(block=>block.type==='Container');const teamNames=container.items.filter(row=>row.type==='ColumnSet').map(row=>row.columns[0].items[0].text).filter(name=>ordered.includes(name));assert.deepEqual(teamNames,ordered);
 const mail=new JSDOM(payload.email.bodyHtml);assert.deepEqual([...mail.window.document.querySelector('thead').parentElement.querySelectorAll('tbody>tr>td:first-child')].map(td=>td.textContent),ordered);mail.window.close();
 const report=new JSDOM(Buffer.from(payload.email.attachments[0].contentBytes,'base64').toString('utf8'));assert.deepEqual(JSON.parse(report.window.document.querySelector('#report-data').textContent).groups[0].rows.map(row=>row.name),ordered);report.window.close();f.requests[0].onload({status:202});await new Promise(r=>setTimeout(r,1));root.getElementById('teams-preview-cancel').click();
 root.getElementById('status-all').checked=false;for(const input of [...root.querySelectorAll('#statuses input')].reverse())input.checked=['cancelled','new','testing'].includes(input.value);root.getElementById('statuses').dispatchEvent(new w.Event('change'));await click('run');assert.deepEqual([...root.querySelectorAll('#results td:first-child')].map(td=>td.textContent),['New','Testing','Cancelled','所选状态合计']);f.dom.window.close();
});

test('notification enabled setting persists per project and gates Sprint preview and pending confirmation',async()=>{
 const f=boot(),root=f.hub;root.querySelector('#nav-settings').click();
 const settings=root.querySelector('#settings-view');assert.equal(settings.querySelector('[data-project-enabled]').checked,true);
 settings.querySelector('[data-project-enabled]').checked=false;settings.querySelector('[data-project-save]').click();assert.equal(f.store.get('jira-monitor-projects-v1')[0].enabled,false);
 const issue={key:'CSP-1',fields:{summary:'Story',created:'2020-01-01T00:00:00Z',status:{id:'1',name:'Open'},customfield_1:[{id:1,name:'Sprint',state:'active'}]},changelog:{startAt:0,total:0,histories:[]}};
 f.w.fetch=async path=>response(path.includes('/field')?[{id:'customfield_1',schema:{custom:'com.pyxis.greenhopper.jira:gh-sprint'}}]:path.includes('/search')?{total:1,issues:[issue]}:issue);
 const s=root.querySelector('#jsa-host').shadowRoot;
 for(const id of ['load','run']){s.getElementById(id).click();await until(()=>!s.getElementById('run').disabled);}
 const picker=s.getElementById('notify-project').querySelector('input');assert.equal(picker.disabled,false);assert.equal(picker.checked,false);assert.match(picker.parentElement.textContent,/通知已停用/);picker.checked=true;s.getElementById('teams-preview').click();assert.match(s.getElementById('message').textContent,/未启用/);assert.equal(f.requests.length,0);
 f.store.get('jira-monitor-projects-v1')[0].enabled=true;s.getElementById('teams-preview').click();assert.ok(s.getElementById('teams-send'));
 f.store.get('jira-monitor-projects-v1')[0].enabled=false;s.getElementById('teams-send').click();await until(()=>s.getElementById('teams-send-status').textContent.includes('停用'));assert.equal(f.requests.length,0);f.dom.window.close();
});

test('Epic groups only Stories, drills down changes, sends separate project reports and supports parent fields',async()=>{
 for(const parent of [false,true]){
 const f=boot(),w=f.w;f.hub.querySelector('#nav-epic').click();assert.equal(f.hub.querySelector('#epic-view').hidden,false);assert.equal(f.hub.querySelector('#sprint-view').hidden,true);
 const field=parent?'parent':'customfield_9',membership=key=>parent?{key}:key;
 const make=(key,type,epic)=>({key,fields:{summary:'摘要 '+key,issuetype:{name:type,subtask:false},created:'2020-01-01T00:00:00Z',status:{id:'2',name:'In Progress'},[field]:epic?membership(epic):null},changelog:{startAt:0,total:1,histories:[{id:'1',created:new Date().toISOString(),items:[{field:'status',from:'1',fromString:'Open',to:'2',toString:'In Progress'}]}]}});
 const issues=[make('CSP-1','Story','CSP-100'),make('CSP-2','Story','CSP-200'),make('CSP-3','Bug','CSP-100'),make('CSP-4','Story',null),make('OSPIT-1','Story','CSP-100')],historyKeys=[];
 w.fetch=async path=>{const u=new URL(path,w.location.origin);
 if(u.pathname.startsWith('/rest/agile/')){const id=u.pathname.split('/').at(-2),scoped=issues.filter(i=>(parent?i.fields[field]?.key:i.fields[field])===id);return response({startAt:0,total:scoped.length,issues:scoped});}
 if(u.pathname.endsWith('/field'))return response(parent?[{id:'parent'}]:[{id:field,schema:{custom:'com.pyxis.greenhopper.jira:gh-epic-link'}}]);
 if(u.pathname.endsWith('/search'))return response(u.searchParams.get('jql').startsWith('key in')?{total:2,issues:['CSP-100','CSP-200'].map(key=>({key,fields:{summary:'Epic '+key,issuetype:{name:'Epic'}}}))}:{total:issues.length,issues});
 const key=u.pathname.split('/').pop();historyKeys.push(key);return response(issues.find(i=>i.key===key));};
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 const s=f.hub.querySelector('#jea-host').shadowRoot;
 for(const id of ['load','run']){s.getElementById(id).click();await until(()=>!s.getElementById('run').disabled);}
 assert.match(s.getElementById('message').textContent,/分析完成/);assert.equal(s.getElementById('sprints').querySelectorAll('input:checked').length,3);assert.match(s.getElementById('results').textContent,/Epic CSP-100/);assert.ok(!historyKeys.includes('CSP-3'));assert.equal(historyKeys.length,4);
 const count=[...s.getElementById('results').querySelectorAll('td button')].find(b=>b.textContent==='2');assert.ok(count);count.click();assert.equal(w.document.getElementById('jira-monitor-issue-details').shadowRoot.querySelectorAll('a').length,2);assert.equal(s.getElementById('detail').childElementCount,0);
 for(const input of s.getElementById('notify-project').querySelectorAll('input'))input.checked=input.value==='CSP';s.getElementById('teams-preview').click();assert.ok(s.getElementById('teams-send'),s.getElementById('message').textContent);s.getElementById('teams-send').click();assert.equal(f.requests.length,1);
 const payload=JSON.parse(f.requests[0].data);assert.equal(payload.reportType,'epic-analysis');assert.match(payload.email.subject,/Epic Analysis/);assert.match(payload.email.bodyText,/CSP-100/);assert.ok(payload.email.attachments.length);const report=Buffer.from(payload.email.attachments[0].contentBytes,'base64').toString();assert.match(report,/CSP-1/);assert.doesNotMatch(report,/OSPIT-1|CSP-3/);
 f.requests[0].onload({status:202});await new Promise(r=>setTimeout(r,1));assert.equal(w.location.pathname,'/issues/');assert.equal(f.errors.length,0);f.dom.window.close();
 }
});

test('disabled projects retain COE results but skip both manual and automatic notification',async()=>{
 for(const automatic of [false,true]){
 const state=alertState(),f=boot('/issues/?jql=project%3DCSP',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify(state));}}),row=f.store.get('jira-monitor-projects-v1')[0];row.enabled=false;row.autoNotify=true;
 const root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;
 if(automatic){const issues=[apiIssue('CSP-1')];issues[0].changelog.histories[0].created=new Date(Date.now()-30*86400000).toISOString();f.w.fetch=async path=>response(path==='/rest/api/2/search'?{total:1,issues}:issues[0]);root.querySelector('[data-start]').click();await until(()=>job(f)?.phase==='done'&&!root.querySelector('[data-start]').disabled);assert.equal(job(f).results.length,1);}
 else{root.querySelector('[data-teams]').click();await until(()=>!root.querySelector('[data-start]').disabled);assert.equal(job(f).results.length,4);}
 assert.equal(f.requests.length,0);f.dom.window.close();
 }
});

test('Epic uses only current-query Stories across UI, drilldown and emailed report, omitting zero rows',async()=>{
 const f=boot(),w=f.w,queries=[],epicCalls=[];
 const make=(key,name,epic)=>({key,fields:{summary:key,issuetype:{name},created:'2020-01-01T00:00:00Z',status:{id:'1',name:'Testing'},customfield_9:epic},changelog:{startAt:0,total:0,histories:[]}});
 const epics=[make('CSP-100','Epic'),make('CSP-200','Epic')],members=[make('CSP-1','Story','CSP-100'),make('CSP-2','Story','CSP-100'),make('CSP-3','Bug','CSP-100'),make('CSP-4','Sub-task','CSP-100')];members[3].fields.issuetype.subtask=true;
 const current=[members[0],members[1],members[2],members[3],epics[1]],outside=make('CSP-999','Story','CSP-100');
 w.fetch=async path=>{const u=new URL(path,w.location.origin);if(u.pathname.startsWith('/rest/agile/'))throw Error('Must not expand Epic members');if(u.pathname.endsWith('/field'))return response([{id:'customfield_9',schema:{custom:'com.pyxis.greenhopper.jira:gh-epic-link'}}]);if(u.pathname.endsWith('/search')){const q=u.searchParams.get('jql');queries.push(q);if(q.startsWith('key in'))return response({total:1,issues:[epics[0]]});assert.equal(q,'project=CSP');const start=Number(u.searchParams.get('startAt'));return response({total:current.length,issues:current.slice(start,start+2)});}const issue=members.find(i=>u.pathname.endsWith('/'+i.key));assert.ok(issue,'No out-of-query history requests');return response(issue);};
 const root=f.hub.querySelector('#jea-host').shadowRoot;
 root.getElementById('load').click();await until(()=>!root.getElementById('run').disabled);assert.equal(root.querySelectorAll('#sprints input').length,1);
 root.getElementById('status-all').checked=false;for(const input of root.querySelectorAll('#statuses input'))input.checked=['new','testing'].includes(input.value);
 root.getElementById('run').click();await until(()=>!root.getElementById('run').disabled);assert.match(root.getElementById('message').textContent,/分析完成/);
 assert.deepEqual(epicCalls,[]);assert.ok(queries.filter(q=>q==='project=CSP').length>=6);assert.ok(queries.every(q=>q==='project=CSP'||q==='key in (CSP-100)'));assert.equal(root.querySelectorAll('#results section').length,1);assert.deepEqual([...root.querySelectorAll('#results td:first-child')].map(x=>x.textContent),['Testing','所选状态合计']);
 root.querySelector('#results td button').click();const popup=w.document.getElementById('jira-monitor-issue-details').shadowRoot;assert.equal(popup.querySelectorAll('tbody tr').length,2);assert.equal(root.getElementById('detail').childElementCount,0);popup.querySelector('input').value='CSP-2';popup.querySelector('input').dispatchEvent(new w.Event('input'));assert.equal(popup.querySelectorAll('tbody tr').length,1);popup.querySelector('button').click();assert.equal(w.document.getElementById('jira-monitor-issue-details'),null);
 root.getElementById('teams-preview').click();root.getElementById('teams-send').click();await until(()=>f.requests.length===1);const payload=JSON.parse(f.requests[0].data),mail=new JSDOM(payload.email.bodyHtml);assert.deepEqual([...mail.window.document.querySelectorAll('tbody td:first-child')].map(x=>x.textContent).filter(x=>x==='New'||x==='Testing'),['Testing']);
 const html=Buffer.from(payload.email.attachments[0].contentBytes,'base64').toString(),model=JSON.parse(/<script id="report-data" type="application\/json">(.*?)<\/script>/.exec(html)[1]);assert.equal(model.groups.length,1);assert.deepEqual(model.groups[0].rows.map(x=>x.name),['Testing','所选状态合计']);assert.equal(model.groups[0].issues.length,2);assert.doesNotMatch(html,/CSP-999|CSP-3|CSP-4|CSP-200/);assert.match(model.jiraUrl||html,/project/);f.requests[0].onload({status:202});await new Promise(r=>setTimeout(r,1));f.dom.window.close();mail.window.close();
});

test('DEV reads and deduplicates Subtask owners and mentions them all, never the Story owner',async()=>{
 const f=boot(),w=f.w,root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;
 w.GM_setValue('jira-monitor-rules-v1',alertState().rules);
 // Controller loads rules when starting the next scan.
 const issue=apiIssue('CSP-1');issue.changelog.histories[0].created=new Date(Date.now()-30*86400000).toISOString();issue.fields.assignee={displayName:'Story Owner',emailAddress:'parent@example.com',name:'parent'};
 const alice={displayName:'Alice',emailAddress:'alice@example.com',name:'alice'},bob={displayName:'Bob',emailAddress:'bob@example.com',name:'bob'};
 issue.fields.subtasks=[{key:'CSP-11',fields:{assignee:alice}},{key:'CSP-12',fields:{assignee:{...alice,emailAddress:'ALICE@example.com'}}},{key:'CSP-13',fields:{}},{key:'CSP-14',fields:{assignee:null}}];
 const calls=[];w.fetch=async path=>{calls.push(path);if(path==='/rest/api/2/search')return response({total:1,issues:[issue]});if(path.includes('/CSP-13?'))return response({fields:{assignee:bob}});return response(issue);};
 root.querySelector('[data-start]').click();await until(()=>job(f)?.phase==='done'&&!root.querySelector('[data-start]').disabled);
 const result=job(f).results[0];assert.deepEqual(result.devAssignees.map(u=>u.name),['Alice','Bob']);assert.ok(calls.some(p=>p.includes('subtasks')));assert.ok(calls.some(p=>p.includes('/CSP-13?fields=assignee')));
 // Isolate the DEV alert in the snapshot to verify that DCT does not add the parent recipient.
 const state=job(f);state.rules=alertState().rules;state.results[0].rules=state.results[0].rules.filter(r=>r.name==='DEV');w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify(state));
 root.querySelector('[data-teams]').click();await until(()=>f.requests.length===1);const payload=JSON.parse(f.requests[0].data),card=payload.attachments[0].content;assert.deepEqual(card.msteams.entities.map(e=>e.mentioned.id),['alice@example.com','bob@example.com']);assert.doesNotMatch(JSON.stringify(card),/parent@example.com|Story Owner/);assert.match(payload.email.bodyHtml,/Alice、Bob/);assert.equal(payload.items[0].devAssignees.length,2);assert.equal(payload.email.to,'test@example.com');f.requests[0].onload({status:202});await until(()=>!root.querySelector('[data-start]').disabled);assert.equal(w.location.pathname,'/issues/');f.dom.window.close();
});

test('pausing during a Subtask request prevents partial owners and results from being saved',async()=>{
 const f=boot(),root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot,issue=apiIssue('CSP-1');issue.fields.subtasks=[{key:'CSP-11',fields:{}}];let resolve;
 f.w.fetch=async path=>{if(path==='/rest/api/2/search')return response({total:1,issues:[issue]});if(path.includes('/CSP-11?'))return new Promise(r=>resolve=r);return response(issue);};
 root.querySelector('[data-start]').click();await until(()=>resolve);root.querySelector('[data-pause]').click();resolve(response({fields:{assignee:{displayName:'Late Owner',emailAddress:'late@example.com'}}}));await new Promise(r=>setTimeout(r,5));assert.equal(job(f).paused,true);assert.equal(job(f).results.length,0);assert.equal(job(f).index,0);assert.equal(f.requests.length,0);f.dom.window.close();
});

test('mixed DEV and DCT alerts include Subtask owners and the parent owner without duplicates',async()=>{
 const state=alertState();state.rules.push({...state.rules[0],name:'DCT'});state.results=state.results.slice(0,1);state.results[0].rules.push({...state.results[0].rules[0],name:'DCT'});state.results[0].devAssignees=[{name:'Dev A',email:'dev-a@example.com',account:'dev-a'},{name:'Dev B',email:'dev-b@example.com',account:'dev-b'}];
 const f=boot('/issues/',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify(state));}}),root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;root.querySelector('[data-teams]').click();await until(()=>f.requests.length===1);const payload=JSON.parse(f.requests[0].data);assert.deepEqual(payload.attachments[0].content.msteams.entities.map(e=>e.mentioned.id),['dev-a@example.com','dev-b@example.com','demo@example.com']);f.requests[0].onload({status:202});await until(()=>!root.querySelector('[data-start]').disabled);f.dom.window.close();
});

test('slash-separated projects share settings, retain grouped rows and reject overlaps',()=>{
 const f=boot();f.hub.querySelector('#nav-settings').click();let settings=f.hub.querySelector('#settings-view');settings.querySelector('[data-project-key]').value=' csp / ospit ';settings.querySelector('[data-project-save]').click();
 assert.match(settings.querySelector('[data-project-status]').textContent,/已保存/);assert.equal(f.store.get('jira-monitor-projects-v1').length,1);assert.equal(f.store.get('jira-monitor-projects-v1')[0].projectKey,'CSP/OSPIT');
 f.hub.querySelector('#nav-settings').click();settings=f.hub.querySelector('#settings-view');assert.equal(settings.querySelectorAll('[data-project-row]').length,1);assert.equal(settings.querySelector('[data-project-key]').value,'CSP/OSPIT');
 settings.querySelector('[data-project-add]').click();const row=[...settings.querySelectorAll('[data-project-row]')].at(-1);row.querySelector('[data-project-key]').value='CHM/OSPIT';settings.querySelector('[data-project-save]').click();assert.match(settings.querySelector('[data-project-status]').textContent,/重复.*OSPIT/);assert.equal(f.store.get('jira-monitor-projects-v1').length,1);
 row.querySelector('[data-project-key]').value='CHM//FY26CC';settings.querySelector('[data-project-save]').click();assert.match(settings.querySelector('[data-project-status]').textContent,/无效/);assert.equal(f.requests.length,0);f.dom.window.close();
});

test('shared project row routes separate COE reports to the same webhook and mail list',async()=>{
 const state=alertState(),f=boot('/issues/',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify(state));w.GM_setValue('jira-monitor-projects-v1',[{projectKey:'CSP/OSPIT',webhook:'https://shared.logic.azure.com/workflows/report',recipients:['shared@example.com'],enabled:true}]);}}),root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;
 root.querySelector('[data-teams]').click();await until(()=>f.requests.length===1);f.requests[0].onload({status:202});await until(()=>f.requests.length===2);f.requests[1].onload({status:202});await until(()=>!root.querySelector('[data-start]').disabled);
 assert.deepEqual(f.requests.map(r=>JSON.parse(r.data).projectKey),['CSP','OSPIT']);for(const r of f.requests){assert.equal(r.url,'https://shared.logic.azure.com/workflows/report');assert.equal(JSON.parse(r.data).email.to,'shared@example.com');}f.dom.window.close();
});

test('Sprint and Epic show configured Story projects only, clear stale options and refresh shared enable changes',async()=>{
 for(const epic of [false,true]){
 const f=boot(),w=f.w;w.GM_setValue('jira-monitor-projects-v1',[{projectKey:'CSP/OSPIT',webhook:'https://shared.logic.azure.com/workflows/report',recipients:['shared@example.com'],enabled:false}]);
 const field='customfield_1',issues=['CSP-1','OSPIT-1','FY26CC-1'].map(key=>({key,fields:{summary:key,created:'2020-01-01T00:00:00Z',issuetype:{name:'Story'},status:{id:'1',name:'Open'},[field]:epic?'CSP-100':[{id:7,name:'Sprint',state:'active'}]},changelog:{startAt:0,total:0,histories:[]}}));
 w.fetch=async path=>{const u=new URL(path,w.location.origin);if(u.pathname.endsWith('/field'))return response([{id:field,schema:{custom:epic?'com.pyxis.greenhopper.jira:gh-epic-link':'com.pyxis.greenhopper.jira:gh-sprint'}}]);if(u.pathname.startsWith('/rest/agile/'))return response({total:3,startAt:0,issues});if(u.pathname.endsWith('/search'))return response(u.searchParams.get('jql').startsWith('key in')?{total:1,issues:[{key:'CSP-100',fields:{summary:'Epic',issuetype:{name:'Epic'}}}]}:{total:3,issues});return response(issues.find(i=>u.pathname.endsWith('/'+i.key)));};
 const root=f.hub.querySelector(epic?'#jea-host':'#jsa-host').shadowRoot;for(const id of ['load','run']){root.getElementById(id).click();await until(()=>!root.getElementById('run').disabled);}
 assert.deepEqual([...root.querySelectorAll('#notify-project input')].map(x=>x.value),['CSP','OSPIT']);assert.doesNotMatch(root.getElementById('notify-project').textContent,/FY26CC/);
 const csp=root.querySelector('#notify-project input[value="CSP"]');assert.equal(csp.disabled,false);csp.click();assert.equal(csp.checked,true);assert.match(root.getElementById('message').textContent,/通知已停用/);
 f.hub.querySelector('#nav-settings').click();const settings=f.hub.querySelector('#settings-view');settings.querySelector('[data-project-enabled]').checked=true;settings.querySelector('[data-project-save]').click();assert.doesNotMatch(root.getElementById('notify-project').textContent,/通知已停用/);assert.equal(root.querySelector('#notify-project input[value="CSP"]').checked,true);
 root.getElementById('teams-preview').click();assert.ok(root.getElementById('teams-send'),root.getElementById('message').textContent);root.getElementById('teams-send').click();await until(()=>f.requests.length===1);assert.equal(JSON.parse(f.requests[0].data).projectKey,'CSP');assert.equal(JSON.parse(f.requests[0].data).email.to,'shared@example.com');f.requests[0].onload({status:202});await new Promise(r=>setTimeout(r,1));root.getElementById('teams-preview-cancel').click();
 root.getElementById('sprints').dispatchEvent(new w.Event('change'));assert.equal(root.querySelectorAll('#notify-project input').length,0);assert.equal(root.getElementById('teams-preview').disabled,true);assert.equal(f.requests.length,1);f.dom.window.close();
 }
});

test('COE submits a full project-specific interactive report attachment with the alert email',async()=>{
 const state=alertState(),f=boot('/issues/',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify(state));}}),root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;
 root.querySelector('[data-teams]').click();await until(()=>f.requests.length===1);const payload=JSON.parse(f.requests[0].data);assert.equal(payload.email.enabled,true);assert.equal(payload.email.attachments.length,1);const file=payload.email.attachments[0];assert.match(file.name,/COE-CSP/);assert.equal(file.contentType,'text/html');
 const html=Buffer.from(file.contentBytes,'base64').toString(),d=new JSDOM(html,{runScripts:'dangerously'});assert.deepEqual([...d.window.document.querySelectorAll('#rows a')].map(a=>a.textContent),['CSP-1','CSP-2']);assert.doesNotMatch(html,/OSPIT-4|CSP-3|example.api.powerplatform.com|dev@example.com/);d.window.document.querySelector('button[data-filter="DEV|warning"]').click();assert.equal(d.window.document.querySelector('#rows a').textContent,'CSP-1');assert.equal(d.window.document.querySelectorAll('#rows tr').length,1);f.requests[0].onload({status:202});await until(()=>!root.querySelector('[data-start]').disabled);d.window.close();f.dom.window.close();
});

test('COE mail preview shows the actual recipient and HTML attachment without sending',()=>{
 const state=alertState(),f=boot('/issues/',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify(state));}}),root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;
 root.querySelector('[data-mail-preview]').click();const report=f.w.document.getElementById('jira-monitor-mail-reports').shadowRoot;assert.match(report.textContent,/test@example.com/);[...report.querySelectorAll('button')].find(b=>b.textContent==='预览邮件正文').click();const preview=f.w.document.getElementById('jira-monitor-email-preview').shadowRoot;assert.match(preview.textContent,/COE-CSP.*html/);assert.equal(preview.querySelector('iframe').getAttribute('sandbox'),'');assert.match(preview.querySelector('iframe').srcdoc,/CSP-1/);assert.doesNotMatch(preview.querySelector('iframe').srcdoc,/CSP-3|OSPIT-4/);assert.equal(f.requests.length,0);f.dom.window.close();
});

test('COE full report exports normal and alert results without reading notifications settings into the file',async()=>{
 const state=alertState(),f=boot('/issues/',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify(state));}}),root=f.hub.querySelector('#jira-duration-panel-host').shadowRoot;let blob;
 f.w.URL.createObjectURL=b=>{blob=b;return 'blob:report';};f.w.URL.revokeObjectURL=()=>{};f.w.HTMLAnchorElement.prototype.click=()=>{};
 root.querySelector('[data-report-export]').click();const html=await new Promise(resolve=>{const r=new f.w.FileReader();r.onload=()=>resolve(r.result);r.readAsText(blob);});const report=new JSDOM(html,{runScripts:'dangerously'});assert.equal(report.window.document.querySelectorAll('#rows tr').length,4);assert.doesNotMatch(html,/workflows\/test|test@example.com/);assert.equal(f.requests.length,0);report.window.close();f.dom.window.close();
});

test('Epic label permission failure keeps current Story grouping; failed history blocks reports',async()=>{
 for(const failHistory of [false,true]){
 const f=boot(),w=f.w,calls=[],issue={key:'CSP-1',fields:{summary:'Current Story',created:'2020-01-01T00:00:00Z',issuetype:{name:'Story'},status:{id:'1',name:'Open'},customfield_9:'CFCSC-343'},changelog:{startAt:0,total:0,histories:[]}};
 w.fetch=async path=>{const u=new URL(path,w.location.origin);calls.push(path);if(u.pathname.endsWith('/field'))return response([{id:'customfield_9',schema:{custom:'com.pyxis.greenhopper.jira:gh-epic-link'}}]);if(u.pathname.endsWith('/search')){if(u.searchParams.get('jql').startsWith('key in'))return {ok:false,status:403,json:async()=>({errorMessages:['Label denied']})};assert.equal(u.searchParams.get('jql'),'project=CSP');return response({total:1,issues:[issue]});}assert.equal(u.pathname,'/rest/api/2/issue/CSP-1');return failHistory?{ok:false,status:403,json:async()=>({errorMessages:['History denied']})}:response(issue);};
 const root=f.hub.querySelector('#jea-host').shadowRoot;for(const id of ['load','run']){root.getElementById(id).click();await until(()=>!root.getElementById('run').disabled);}
 assert.deepEqual([...root.querySelectorAll('#sprints input')].map(i=>i.value),['CFCSC-343']);assert.equal(calls.some(p=>p.includes('/rest/agile/')||p.includes('IS+NOT+EMPTY')),false);assert.equal(root.getElementById('report-export').disabled,failHistory);assert.match(root.getElementById('message').textContent,failHistory?/403.*History denied/:/分析完成/);assert.equal(f.requests.length,0);f.dom.window.close();
 }
});

test('Epic oversized Teams cards submit email only with complete report and reject missing recipients',async()=>{
 for(const hasRecipients of [true,false]){
 const f=boot(),w=f.w;f.store.get('jira-monitor-projects-v1')[0].recipients=hasRecipients?['test@example.com']:[];
 const issues=Array.from({length:90},(_,i)=>({key:'CSP-'+(i+1),fields:{summary:'Story '+i,created:'2020-01-01T00:00:00Z',issuetype:{name:'Story'},status:{id:'1',name:'Open'},customfield_9:'CSP-'+(1000+i)},changelog:{startAt:0,total:0,histories:[]}}));
 w.fetch=async path=>{const u=new URL(path,w.location.origin);if(u.pathname.endsWith('/field'))return response([{id:'customfield_9',schema:{custom:'com.pyxis.greenhopper.jira:gh-epic-link'}}]);if(u.pathname.endsWith('/search')){const q=u.searchParams.get('jql');if(q.startsWith('key in')){const keys=q.slice(8,-1).split(',');return response({total:keys.length,issues:keys.map(key=>({key,fields:{summary:'Long Epic '.repeat(35),issuetype:{name:'Epic'}}}))});}return response({total:issues.length,issues});}return response(issues.find(i=>u.pathname.endsWith('/'+i.key)));};
 const root=f.hub.querySelector('#jea-host').shadowRoot;for(const id of ['load','run']){root.getElementById(id).click();await until(()=>!root.getElementById('run').disabled);}
 root.getElementById('teams-preview').click();
 if(!hasRecipients){assert.match(root.getElementById('message').textContent,/未配置邮件收件人/);assert.equal(root.getElementById('teams-send'),null);}
 else{assert.match(root.getElementById('message').textContent,/所选数量超过 Teams 大小限制，所选数据只通过邮件发送/);root.getElementById('teams-send').click();assert.equal(f.requests.length,1);const payload=JSON.parse(f.requests[0].data);assert.equal(payload.teams.enabled,false);assert.equal(payload.deliveryMode,'email-only');assert.deepEqual(payload.attachments,[]);assert.equal(payload.email.enabled,true);assert.match(payload.email.bodyText,/CSP-1089/);const html=Buffer.from(payload.email.attachments[0].contentBytes,'base64').toString();assert.match(html,/CSP-90/);f.requests[0].onload({status:202});await new Promise(r=>setTimeout(r,1));}
 f.dom.window.close();
 }
 const f=boot(),launcher=f.hub.querySelector('#launcher');assert.equal(launcher.textContent,'');assert.ok(launcher.querySelector('svg'));assert.equal(launcher.getAttribute('aria-label'),'打开 Jira Monitor');f.dom.window.close();
});

test('Sprint and Epic visibly select all statuses by default, support clearing and synchronize individual choices',async()=>{
 for(const epic of [false,true]){
 const f=boot(),w=f.w,field='customfield_9',issue={key:'CSP-1',fields:{summary:'Story',issuetype:{name:'Story'},[field]:epic?'CSP-100':[{id:7,name:'Sprint',state:'active'}]}};
 w.fetch=async path=>{const u=new URL(path,w.location.origin);if(u.pathname.endsWith('/field'))return response([{id:field,schema:{custom:epic?'com.pyxis.greenhopper.jira:gh-epic-link':'com.pyxis.greenhopper.jira:gh-sprint'}}]);return response(u.searchParams.get('jql')?.startsWith('key in')?{total:1,issues:[{key:'CSP-100',fields:{summary:'Epic',issuetype:{name:'Epic'}}}]}:{total:1,issues:[issue]});};
 const root=f.hub.querySelector(epic?'#jea-host':'#jsa-host').shadowRoot;root.getElementById('load').click();await until(()=>!root.getElementById('run').disabled);const all=root.getElementById('status-all'),inputs=[...root.querySelectorAll('#statuses input')];assert.equal(inputs.length,14);assert.ok(all.checked&&inputs.every(x=>x.checked));assert.ok(root.getElementById('teams-preview').classList.contains('primary'));
 root.getElementById('status-clear').click();assert.ok(!all.checked&&inputs.every(x=>!x.checked));root.getElementById('status-select-all').click();assert.ok(all.checked&&inputs.every(x=>x.checked));inputs[0].checked=false;inputs[0].dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(all.checked,false);assert.equal(inputs.filter(x=>x.checked).length,13);inputs[0].checked=true;inputs[0].dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(all.checked,true);all.checked=false;all.dispatchEvent(new w.Event('change'));assert.ok(inputs.every(x=>!x.checked));f.dom.window.close();
 }
});

function scheduledJob(overrides={}){const now=new Date(),time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');return {id:'test-job',name:'Daily',url:'https://jira.xpaas.lenovo.com/issues/?filter=180929',times:[time],menus:['sprint','epic'],period:'day',days:'daily',enabled:true,teams:false,email:false,attach:true,projects:'',...overrides};}
function jobMocks(w,issues,calls=[]){w.fetch=async(path,options)=>{const u=new URL(path,w.location.origin);calls.push(path);if(u.pathname.endsWith('/field'))return response([{id:'customfield_1',schema:{custom:'com.pyxis.greenhopper.jira:gh-sprint'}},{id:'customfield_9',schema:{custom:'com.pyxis.greenhopper.jira:gh-epic-link'}}]);if(u.pathname.includes('/filter/'))return response({jql:'project=CSP'});if(u.pathname.endsWith('/search'))return response(u.searchParams.get('jql')?.startsWith('key in')?{total:1,issues:[{key:'CSP-100',fields:{summary:'Epic',issuetype:{name:'Epic'}}}]}:{total:issues.length,issues});return response(issues.find(i=>u.pathname.endsWith('/'+i.key)));};Object.defineProperty(w.navigator,'locks',{value:{request:async(name,callback)=>callback()}});}
function scheduledStory(){return {key:'CSP-1',fields:{summary:'Scheduled Story',created:'2020-01-01T00:00:00Z',issuetype:{name:'Story'},assignee:{displayName:'Demo'},status:{id:'1',name:'In Progress'},customfield_1:[{id:7,name:'Sprint',state:'closed'}],customfield_9:'CSP-100'},changelog:{startAt:0,total:1,histories:[{id:'1',created:new Date(Date.now()-30*86400000).toISOString(),items:[{field:'status',fromString:'Open',toString:'In Progress'}]}]}};}
test('scheduled Job runs multiple menus from the saved filter, selects all groups and never sends when disabled',async()=>{
 const calls=[],f=boot('/issues/?filter=180929#jm-job=test-job',{setup(w){w.GM_setValue('jira-monitor-jobs-v1',[scheduledJob()]);jobMocks(w,[scheduledStory()],calls);}});
 await until(()=>f.store.get('jira-monitor-job-runs-v1')?.['test-job']?.status==='completed');assert.equal(f.requests.length,0);for(const id of ['#jsa-host','#jea-host']){const r=f.hub.querySelector(id).shadowRoot;assert.match(r.getElementById('message').textContent,/分析完成/);assert.ok([...r.querySelectorAll('#sprints input')].every(x=>x.checked));}assert.ok(calls.some(x=>x.includes('/filter/180929')));f.dom.window.close();
});
test('scheduled Job respects channel selection and submits once without manual confirmation',async()=>{
 for(const channel of ['teams','email']){
 const requests=[],f=boot('/issues/?filter=180929#jm-job=test-job',{setup(w){w.GM_setValue('jira-monitor-jobs-v1',[scheduledJob({menus:['sprint'],[channel]:true})]);jobMocks(w,[scheduledStory()]);w.GM_xmlhttpRequest=request=>{requests.push(request);queueMicrotask(()=>request.onload({status:202}));};}});
 await until(()=>f.store.get('jira-monitor-job-runs-v1')?.['test-job']?.status==='completed');assert.equal(requests.length,1);const p=JSON.parse(requests[0].data);assert.equal(p.email.enabled,channel==='email');assert.equal(p.teams.enabled,channel==='teams');if(channel==='email'){assert.deepEqual(p.attachments,[]);assert.equal(p.deliveryMode,'email-only');assert.match(p.email.attachments[0].name,/\.html$/);}f.dom.window.close();
 }
});
test('scheduled COE skips legacy auto notification and submits one selected-channel report',async()=>{
 const requests=[],f=boot('/issues/?filter=180929#jm-job=test-job',{setup(w){w.GM_setValue('jira-monitor-jobs-v1',[scheduledJob({menus:['coe'],email:true})]);w.GM_getValue('jira-monitor-projects-v1')[0].autoNotify=true;jobMocks(w,[scheduledStory()]);w.GM_xmlhttpRequest=request=>{requests.push(request);queueMicrotask(()=>request.onload({status:202}));};}});
 await until(()=>['completed','failed'].includes(f.store.get('jira-monitor-job-runs-v1')?.['test-job']?.status));assert.equal(f.store.get('jira-monitor-job-runs-v1')['test-job'].status,'completed',JSON.stringify(f.store.get('jira-monitor-job-runs-v1')));assert.equal(requests.length,1);const p=JSON.parse(requests[0].data);assert.equal(p.reportType,'timeout-summary');assert.equal(p.email.enabled,true);assert.deepEqual(p.attachments,[]);f.dom.window.close();
});
test('duplicate, disabled and wrong-query Job starts make no network or notification requests',async()=>{
 for(const mode of ['duplicate','disabled','wrong-url']){
 const j=scheduledJob({enabled:mode!=='disabled'}),now=new Date(),slot=`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${j.times[0]}`;
 const f=boot('/issues/?filter='+(mode==='wrong-url'?'999':'180929')+'#jm-job=test-job',{setup(w){w.GM_setValue('jira-monitor-jobs-v1',[j]);if(mode==='duplicate')w.GM_setValue('jira-monitor-job-runs-v1',{'test-job':{slot,status:'completed'}});Object.defineProperty(w.navigator,'locks',{value:{request:async(name,callback)=>callback()}});}});await new Promise(r=>setTimeout(r,5));assert.equal(f.requests.length,0);if(mode!=='duplicate')assert.match(f.hub.querySelector('#settings-view').textContent,/Job 未完成/);f.dom.window.close();
 }
});
test('configuration saves multiple times and menus; exported Mac installer contains schedules and no notification secrets',async()=>{
 const f=boot();f.hub.querySelector('#nav-settings').click();const card=f.hub.querySelector('#scheduled-jobs fieldset');const input=key=>card.querySelector(`[data-job-field="${key}"]`);input('enabled').checked=true;input('times').value='09:00,21:00';input('name').value='早晚分析';const buttons=[...f.hub.querySelector('#scheduled-jobs').querySelectorAll('button')];buttons.find(b=>b.textContent==='保存 Job 配置').click();const saved=f.store.get('jira-monitor-jobs-v1');assert.deepEqual([...saved[0].times],['09:00','21:00']);assert.equal(saved[0].url,'https://jira.xpaas.lenovo.com/issues/?filter=180929');let blob;f.w.URL.createObjectURL=b=>{blob=b;return 'blob:installer';};f.w.HTMLAnchorElement.prototype.click=()=>{};Object.defineProperty(f.w.crypto,'subtle',{value:require('node:crypto').webcrypto.subtle});f.w.GM_xmlhttpRequest=request=>{assert.equal(request.method,'GET');assert.match(request.url,/raw\.githubusercontent\.com/);queueMicrotask(()=>request.onload({status:200,responseText:fs.readFileSync(__dirname+'/../src/mac-app-template.base64','utf8')}));};buttons.find(b=>b.textContent==='导出 Mac 定时启动器').click();await until(()=>!!blob);const archive=await new Promise(resolve=>{const reader=new f.w.FileReader();reader.onload=()=>resolve(Buffer.from(reader.result));reader.readAsArrayBuffer(blob);});assert.equal(blob.type,'application/zip');fs.writeFileSync('/tmp/jira-monitor-mac-installer.zip',archive);const files=new Map();let cursor=0;while(archive.readUInt32LE(cursor)===0x04034b50){const size=archive.readUInt32LE(cursor+18),length=archive.readUInt16LE(cursor+26),extra=archive.readUInt16LE(cursor+28),name=archive.subarray(cursor+30,cursor+30+length).toString(),start=cursor+30+length+extra;files.set(name,archive.subarray(start,start+size).toString());if(name.endsWith('/MacOS/JiraMonitorInstaller'))assert.equal(archive.readUInt32BE(start),0xcafebabe);cursor=start+size;}assert.equal(files.size,5);assert.match(files.get('Jira Monitor Installer.app/Contents/Info.plist'),/CFBundleExecutable/);assert.match(files.get('Jira Monitor Installer.app/Contents/Resources/install.applescript'),/display dialog/);assert.ok(files.has('Jira Monitor Installer.app/Contents/_CodeSignature/CodeResources'));const installer=files.get('Jira-Monitor-Schedule.sh');assert.match(installer,/launchctl bootstrap/);assert.doesNotMatch(installer,/test@example|powerplatform|webhook/);const encoded=/printf '%s' '([^']+)'/.exec(installer)[1],xml=Buffer.from(encoded,'base64').toString();assert.match(xml,/<integer>9<\/integer>/);assert.match(xml,/<integer>21<\/integer>/);assert.match(xml,/jm-job=/);assert.doesNotMatch(xml,/RunAtLoad/);fs.writeFileSync('/tmp/jira-monitor-job-installer.command',installer);fs.writeFileSync('/tmp/jira-monitor-job-agent.plist',xml);f.dom.window.close();
});

test('failed scheduled analysis records error, sends nothing and does not retry the same slot',async()=>{
 const f=boot('/issues/?filter=180929#jm-job=test-job',{setup(w){w.GM_setValue('jira-monitor-jobs-v1',[scheduledJob({menus:['sprint'],email:true})]);Object.defineProperty(w.navigator,'locks',{value:{request:async(name,callback)=>callback()}});w.fetch=async()=>({ok:false,status:401,json:async()=>({errorMessages:['Sign in required']})});}});
 await until(()=>f.store.get('jira-monitor-job-runs-v1')?.['test-job']?.status==='failed');assert.equal(f.requests.length,0);assert.match(f.store.get('jira-monitor-job-runs-v1')['test-job'].message,/401/);f.dom.window.close();
});
test('missed Job outside the startup window performs no analysis',async()=>{
 const now=new Date(),past=new Date(now.getTime()-30*60000),time=String(past.getHours()).padStart(2,'0')+':'+String(past.getMinutes()).padStart(2,'0');
 const f=boot('/issues/?filter=180929#jm-job=test-job',{setup(w){w.GM_setValue('jira-monitor-jobs-v1',[scheduledJob({times:[time]})]);}});await new Promise(r=>setTimeout(r,5));assert.equal(f.requests.length,0);assert.match(f.hub.querySelector('#settings-view').textContent,/10 分钟/);f.dom.window.close();
});


test('native installer data is absent at startup; export rejects bad checksums and allows retry',async()=>{
 assert.ok(Buffer.byteLength(source)<260000);assert.ok(Math.max(...source.split('\n').map(line=>line.length))<20000);
 const f=boot();let calls=0,downloads=0;f.w.URL.createObjectURL=()=>{downloads++;return 'blob:test';};f.w.HTMLAnchorElement.prototype.click=()=>{};Object.defineProperty(f.w.crypto,'subtle',{value:require('node:crypto').webcrypto.subtle});
 f.w.GM_xmlhttpRequest=request=>{calls++;assert.equal(request.method,'GET');queueMicrotask(()=>request.onload(calls===1?{status:200,responseText:'corrupted'}:{status:200,responseText:fs.readFileSync(__dirname+'/../src/mac-app-template.base64','utf8')}));};
 f.hub.querySelector('#nav-settings').click();assert.equal(calls,0);const input=f.hub.querySelector('[data-job-field="enabled"]');input.checked=true;const buttons=[...f.hub.querySelector('#scheduled-jobs').querySelectorAll('button')];buttons.find(x=>x.textContent==='保存 Job 配置').click();const button=buttons.find(x=>x.textContent==='导出 Mac 定时启动器');button.click();await until(()=>!button.disabled);assert.equal(downloads,0);assert.match(f.hub.querySelector('#scheduled-jobs').textContent,/校验失败/);button.click();await until(()=>!button.disabled);assert.equal(calls,2);assert.equal(downloads,1);assert.equal(f.requests.length,0);f.dom.window.close();
});
