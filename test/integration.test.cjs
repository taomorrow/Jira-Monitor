const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(__dirname+'/../jiraMonitor.user.js','utf8');
function boot(path='/issues/?jql=project%3DCSP'){
 const dom=new JSDOM('<body><div id="issuetable"></div></body>',{url:'https://jira.xpaas.lenovo.com'+path,runScripts:'outside-only'}),w=dom.window;
 const store=new Map([['jira-monitor-projects-v1',[{projectKey:'CSP',webhook:'https://example.api.powerplatform.com/workflows/test',recipients:['test@example.com'],autoNotify:false}]]]),requests=[],errors=[];
 w.GM_getValue=(k,d)=>store.has(k)?store.get(k):d;w.GM_setValue=(k,v)=>store.set(k,v);w.GM_deleteValue=k=>store.delete(k);w.GM_registerMenuCommand=()=>{};w.GM_xmlhttpRequest=x=>requests.push(x);w.fetch=()=>{throw Error('Unexpected automatic request');};w.setInterval=()=>0;w.setTimeout=()=>0;w.TextEncoder=TextEncoder;w.console.error=(...x)=>errors.push(x);
 w.eval(source);return {dom,w,store,requests,errors,hub:w.document.getElementById('jira-monitor-hub').shadowRoot};
}
test('single panel on issue, dashboard, board and detail pages; starts no requests',()=>{
 for(const path of ['/issues/','/browse/CSP-1','/secure/Dashboard.jspa','/secure/RapidBoard.jspa']){
 const f=boot(path);assert.equal(f.errors.length,0,JSON.stringify(f.errors));assert.equal(f.requests.length,0);assert.equal(f.hub.querySelector('#shell').hidden,true);
 const buttons=[...f.hub.querySelector('header').querySelectorAll('button')];buttons[1].click();assert.equal(f.hub.querySelectorAll('section')[1].hidden,false);
 const sprint=f.hub.querySelector('#jsa-host').shadowRoot;assert.ok(sprint.getElementById('run'));assert.equal(sprint.getElementById('launch').style.display,'none');
 buttons[0].click();assert.equal(f.hub.querySelectorAll('section')[0].hidden,false);assert.ok(f.hub.querySelector('#jira-duration-panel-host').shadowRoot.querySelector('[data-start]'));f.dom.window.close();
 }
});
test('both modules use the same editable project configuration',()=>{
 const f=boot();const sprint=f.hub.querySelector('#jsa-host').shadowRoot;sprint.getElementById('teams-config').click();
 const config=[...f.w.document.querySelectorAll('div')].find(n=>n.shadowRoot?.querySelector('[data-project-table]'));
 assert.ok(config);const root=config.shadowRoot;assert.equal(root.querySelector('[data-project-key]').value,'CSP');root.querySelector('[data-project-emails]').value='updated@example.com';root.querySelector('[data-project-save]').click();assert.equal(f.store.get('jira-monitor-projects-v1')[0].recipients.join(';'),'updated@example.com');assert.equal(f.requests.length,0);f.dom.window.close();
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
 assert.equal(root.getElementById('notify-project').options.length,2);
 root.getElementById('notify-project').value='CSP';await click('teams-preview');assert.equal(f.requests.length,0);assert.ok(root.getElementById('teams-preview-content'),root.getElementById('message').textContent);assert.match(root.getElementById('teams-preview-content').textContent,/Shared Sprint/);
 root.getElementById('teams-send').click();assert.equal(f.requests.length,1);const request=f.requests[0],payload=JSON.parse(request.data);
 assert.equal(request.url,f.store.get('jira-monitor-projects-v1')[0].webhook);assert.equal(payload.projectKey,'CSP');assert.equal(payload.email.to,'test@example.com');assert.match(payload.email.bodyText,/In Progress \| 1 \| 1/);assert.doesNotMatch(payload.email.bodyText,/OSPIT-2/);
 request.onload({status:202});root.getElementById('teams-preview-cancel').click();root.getElementById('notify-project').value='OSPIT';await click('teams-preview');assert.equal(f.requests.length,1);assert.match(root.getElementById('message').textContent,/配置/);f.dom.window.close();
});
test('shared settings reject duplicate keys and unsafe webhook URLs; HEAD sends no report',()=>{
 const f=boot();[...f.hub.querySelector('header').querySelectorAll('button')][2].click();
 const root=[...f.w.document.querySelectorAll('div')].find(n=>n.shadowRoot?.querySelector('[data-project-table]')).shadowRoot;
 root.querySelector('[data-project-hook]').value='https://evil.example/workflows/test';root.querySelector('[data-project-save]').click();assert.match(root.querySelector('[data-project-status]').textContent,/不支持/);assert.equal(f.store.get('jira-monitor-projects-v1')[0].webhook,'https://example.api.powerplatform.com/workflows/test');
 root.querySelector('[data-legacy-key]').value='CSP';root.querySelector('[data-project-diagnose]').click();assert.equal(f.requests.length,1);assert.equal(f.requests[0].method,'HEAD');assert.equal(f.requests[0].data,undefined);f.dom.window.close();
});
