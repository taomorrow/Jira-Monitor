const {test}=require('node:test'),assert=require('node:assert/strict');
const {createKanbanCore}=require('../src/kanban-core.js'),core=createKanbanCore(require('../src/status-order.json'));
const story=(key,status,value=[])=>({key,fields:{issuetype:{name:'Story'},status:{name:status},sprint:value,epic:'CSP-100'}});
test('Kanban metrics match exact status definitions and deduplicate Story keys',()=>{
 const issues=[story('CSP-1','Open'),story('CSP-2','In Progress'),story('CSP-3','Ready For Test'),story('CSP-4','Testing'),story('CSP-5','New'),story('CSP-6','Done')];assert.deepEqual(core.buckets([...issues,issues[0]]).map(x=>x.issues.length),[1,1,2]);assert.equal(core.statuses(issues).find(x=>x.name==='Done').issues.length,1);
});
test('Kanban Sprint metadata parsing handles legacy values and excludes CLOSED names and states',()=>{
 const values=['com.atlassian.Sprint[id=7,state=ACTIVE,name=Current,startDate=2026]',{id:8,name:'CLOSED legacy',state:'active'},{id:9,name:'Old',state:'closed'},{id:10,name:'Future',state:'future'}];assert.deepEqual(core.groups([story('CSP-1','Open',values)],'sprint','sprint').map(x=>x.id).sort(),['10','7']);assert.equal(core.groups([story('CSP-1','Open',[values[0],values[0]])],'sprint','sprint')[0].issues.length,1);
});
test('Kanban Epic groups current Story membership only and handles unassigned parents',()=>{
 const a=story('CSP-1','Open'),b=story('CSP-2','Done');b.fields.epic=null;assert.deepEqual(core.groups([a,b,{key:'BUG-1',fields:{issuetype:{name:'Bug'},epic:'CSP-100'}}],'epic','epic').map(x=>[x.id,x.issues.length]),[['CSP-100',1],['none',1]]);a.fields.parent={key:'CSP-200',fields:{issuetype:{name:'Epic'}}};assert.equal(core.groups([a],'epic','parent')[0].id,'CSP-200');
});
