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
 assert.equal(root.getElementById('notify-project').querySelectorAll('input').length,2);
 for(const input of root.getElementById('notify-project').querySelectorAll('input'))input.checked=input.value==='CSP';
 root.getElementById('notify-project').querySelector('input[value="CSP"]').checked=true;await click('teams-preview');assert.equal(f.requests.length,0);assert.ok(root.getElementById('teams-preview-content'),root.getElementById('message').textContent);assert.match(root.getElementById('teams-preview-content').textContent,/Shared Sprint/);
 root.getElementById('teams-send').click();assert.equal(f.requests.length,1);const request=f.requests[0],payload=JSON.parse(request.data);
 assert.equal(request.url,f.store.get('jira-monitor-projects-v1')[0].webhook);assert.equal(payload.projectKey,'CSP');assert.equal(payload.email.to,'test@example.com');const mail=new JSDOM(payload.email.bodyHtml).window.document;assert.ok(mail.querySelector('table thead th'));assert.match(mail.body.textContent,/所选状态合计/);assert.equal(mail.querySelector('pre'),null);assert.match(payload.email.bodyText,/In Progress \| 1 \| 1/);assert.doesNotMatch(payload.email.bodyText,/OSPIT-2/);
 request.onload({status:202});await new Promise(r=>setTimeout(r,1));root.getElementById('teams-preview-cancel').click();for(const input of root.getElementById('notify-project').querySelectorAll('input'))input.checked=input.value==='OSPIT';await click('teams-preview');assert.equal(f.requests.length,1);assert.match(root.getElementById('message').textContent,/配置/);f.dom.window.close();
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
test('detail popup completes analysis separately and emails a safe card',async()=>{
 const f=boot('/browse/CSP-9',{auto:true,setup(w){w.fetch=async()=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>({fields:{status:{name:'In Progress'},summary:'<script>unsafe</script>',assignee:{displayName:'Demo'}},changelog:{startAt:0,total:1,histories:[{id:'1',created:new Date(Date.now()-86400000).toISOString(),items:[{field:'status',fromString:'Open',toString:'In Progress'}]}]}})});}});
 await new Promise(r=>setTimeout(r,10));const state=JSON.parse(f.w.sessionStorage.getItem('jira-monitor-auto-detail-v1'));assert.equal(state.active,false);assert.equal(state.results.length,1);assert.equal(f.w.sessionStorage.getItem('jira-monitor-manual-detail-v1'),null);
 const popup=f.hub.querySelector('#jira-detail-panel-host').shadowRoot;assert.match(popup.querySelector('[data-progress]').textContent,/完成/);popup.querySelector('[data-teams]').click();await new Promise(r=>setTimeout(r,1));assert.equal(f.requests.length,1);const email=JSON.parse(f.requests[0].data).email;assert.match(email.bodyHtml,/<table/);assert.match(email.bodyHtml,/&lt;script&gt;/);assert.doesNotMatch(email.bodyHtml,/<script>/);f.requests[0].onload({status:202});await new Promise(r=>setTimeout(r,1));f.dom.window.close();
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
 for(const [i,key,email] of [[0,'CSP','test@example.com'],[1,'OSPIT','osp@example.com']]){const payload=JSON.parse(f.requests[i].data);assert.equal(payload.projectKey,key);assert.equal(payload.email.to,email);assert.match(payload.email.bodyText,/In Progress \| 1 \| 1/);}
 f.requests[1].onload({status:202});await new Promise(r=>setTimeout(r,1));assert.equal(f.requests.length,2);assert.match(root.getElementById('teams-send-status').textContent,/CSP：失败/);assert.match(root.getElementById('teams-send-status').textContent,/OSPIT：已提交/);f.dom.window.close();
});

test('detail routes never display the batch list, including active/paused jobs and SPA navigation',()=>{
 for(const paused of [false,true]){
 const f=boot('/browse/CSP-9',{setup(w){w.sessionStorage.setItem('jira-monitor-batch-v5',JSON.stringify({id:'job',mode:'batch',active:!paused,paused,rules:[],queue:[{key:'CSP-9'}],results:[],index:0,phase:'reading'}));}});
 assert.equal(f.hub.querySelector('#shell').hidden,true);f.hub.querySelector('#launcher').click();assert.equal(f.hub.querySelector('#shell').hidden,true);f.dom.window.close();
 }
 const f=boot('/issues/');f.hub.querySelector('#launcher').click();assert.equal(f.hub.querySelector('#shell').hidden,false);f.w.history.pushState({},'', '/browse/CSP-9');f.w.dispatchEvent(new f.w.PopStateEvent('popstate'));assert.equal(f.hub.querySelector('#shell').hidden,true);f.dom.window.close();
});
