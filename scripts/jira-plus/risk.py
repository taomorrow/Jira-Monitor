# Port only Risk from the main script; the COE/Sprint/Epic frozen base stays untouched.
def apply_risk(source,root,ext):
 source=source.replace("['coe','sprint','epic']", "['coe','sprint','epic','risk']")
 source=source.replace("['epic','Epic']]", "['epic','Epic'],['risk','Risk']]")
 source=source.replace("['epic','EPIC']]", "['epic','EPIC'],['risk','Risk']]")
 source=source.replace('COE → Sprint → EPIC 合并','COE → Sprint → EPIC → Risk 合并')
 # Persist the current Risk checkbox and wait for chrome.storage before opening its task tab.
 source=source.replace("el('button','立即运行（先保存并启用）',card).onclick=()=>{try{const saved=jobList().find(x=>x.id===j.id);if(!saved?.enabled)throw Error('请先保存并启用此 Job。');", "el('button','保存并立即运行',card).onclick=()=>{try{const jobs=entries.filter(e=>!e.removed).map(e=>e.read()),saved=jobs.find(x=>x.id===j.id);if(!saved?.enabled)throw Error('请先勾选启用此 Job。');GM_setValue(JOB_STORE,jobs);")
 source=source.replace("window.open(u.href,'_blank','noopener');", "GM_openInTab(u.href,{active:true}).catch(error=>{status.textContent=error.message;});")
 pristine=(root/'src/sprint.user.js').read_text()
 a=pristine.index('  function pageQuery(');b=pristine.index('  function ',a+12)
 panel=(root/'src/risk-panel.js').read_text().replace('__RISK_QUERY_HELPER__',pristine[a:b])
 notify=(root/'src/risk-notify.js').read_text().replace('!hub.jobRun&&teamsBytes','!hub.jobDelivery?.combine&&teamsBytes')
 setup="""
const riskTab=el('button','◈ Risk',config.parentElement);riskTab.id='nav-risk';config.before(riskTab);
hub.risk=el('section',null,epic.parentElement);hub.risk.id='risk-view';hub.risk.hidden=true;
const riskOriginalShow=hub.show;hub.show=function(which='timeout'){riskOriginalShow.call(hub,which);hub.risk.hidden=which!=='risk';riskTab.setAttribute('aria-selected',String(which==='risk'));};riskTab.onclick=()=>hub.show('risk');
hub.noteJobScope=()=>{};
"""
 shared='\n'.join((root/'src'/f).read_text() for f in ['risk.js','kanban-visuals.js'])
 added=setup+shared+'\n'+(ext/'features/risk-report.js').read_text()+'\n'+notify+'\n'+panel
 # Risk is registered before task startup, with no requests on initial mount.
 source=source.replace('hub.startScheduled();hub.startBrowserScheduler();',added+'\nhub.startScheduled();hub.startBrowserScheduler();')
 return source
