const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {buildInteractiveReport}=require('../src/interactive-report.js');
function model(){const issues=[{key:'DEMO-1',summary:'New work',before:'Open',after:'In Progress',changed:true},{key:'OTHER-2',summary:'Stable',before:'In Progress',after:'In Progress',changed:false},{key:'DEMO-3',summary:'Created',before:'',after:'Open',changed:true}];return {period:{description:'昨日 → 今日',before:'昨日日终',after:'今日截至当前',rate:'日环比'},meta:'JQL: project in (DEMO,OTHER)',jiraUrl:'https://jira.example.test/issues/?jql=test',groups:[{id:'7',name:'Demo Sprint',issues,rows:[{name:'Open',before:['DEMO-1'],after:['DEMO-3']},{name:'In Progress',before:['OTHER-2'],after:['DEMO-1','OTHER-2']},{name:'所选状态合计',total:true,before:['DEMO-1','OTHER-2'],after:['DEMO-1','OTHER-2','DEMO-3']}]}]};}
test('offline report numbers show exactly corresponding snapshot issues and clickable Jira links',()=>{
 const dom=new JSDOM(buildInteractiveReport(model()),{runScripts:'dangerously'}),d=dom.window.document;
 const buttons=[...d.querySelectorAll('td.number button')];assert.deepEqual(buttons.map(x=>x.textContent),['1','1','1','2','2','3']);buttons[3].click();assert.equal(d.querySelector('#detail').hidden,false);assert.equal(d.querySelectorAll('#detail-rows tr').length,2);assert.match(d.querySelector('#detail-rows').textContent,/DEMO-1/);assert.doesNotMatch(d.querySelector('#detail-rows').textContent,/DEMO-3/);assert.equal(d.querySelector('#detail-rows a').href,'https://jira.example.test/browse/DEMO-1');
 d.querySelector('#search').value='Stable';d.querySelector('#search').dispatchEvent(new dom.window.Event('input'));assert.equal(d.querySelectorAll('#detail-rows tr').length,1);assert.match(d.querySelector('#detail-rows').textContent,/OTHER-2/);dom.window.close();
});
test('project filter recalculates totals and changes, retaining before/after details',()=>{
 const dom=new JSDOM(buildInteractiveReport(model()),{runScripts:'dangerously'}),d=dom.window.document;d.querySelector('#project').value='DEMO';d.querySelector('#project').dispatchEvent(new dom.window.Event('change'));assert.deepEqual([...d.querySelectorAll('tr.total button')].map(b=>b.textContent),['1','2']);d.querySelector('#all-changes').click();assert.equal(d.querySelectorAll('#detail-rows tr').length,2);assert.match(d.querySelector('#detail-rows').textContent,/尚未创建/);dom.window.close();
});
test('report escapes hostile issue content and ships no executable data or remote dependencies',()=>{
 const data=model();data.groups[0].issues[0].summary='</script><img src=x onerror="window.hacked=true">';const html=buildInteractiveReport(data),dom=new JSDOM(html,{runScripts:'dangerously'}),d=dom.window.document;d.querySelector('#all-changes').click();assert.equal(dom.window.hacked,undefined);assert.equal(d.querySelector('img'),null);assert.match(d.querySelector('#detail-rows').textContent,/<img/);assert.equal(d.querySelector('script[src],link[href]'),null);assert.doesNotMatch(html,/GM_getValue|contentBytes|teamsWebhookUrl/);dom.window.close();
});
