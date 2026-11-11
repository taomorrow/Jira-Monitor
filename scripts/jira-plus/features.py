from pathlib import Path

def apply_job_bundle(source,ext):
 def replace(old,new,count=1):
  nonlocal source
  assert source.count(old)==count,(old[:100],source.count(old))
  source=source.replace(old,new)
 replace('hub.jobRunners={};','hub.jobRunners={};\n'+(ext/'features/job-report.js').read_text()+'\n'+(ext/'features/job-bundle.js').read_text())
 replace(" j.period=j.period==='week'", " j.combine=j.combine===true;j.pushMenus=[...new Set(j.pushMenus||j.menus)];if(j.combine&&(!j.pushMenus.length||j.pushMenus.some(x=>!['coe','sprint','epic'].includes(x))))throw Error('请至少选择一个合并推送菜单。');if(j.combine)j.menus=[...new Set([...j.menus,...j.pushMenus])];\n j.period=j.period==='week'")
 replace("  try{for(const menu of job.menus){", "  if(job.combine)jiraPlusPending=[];\n  try{for(const menu of ['coe','sprint','epic'].filter(m=>job.menus.includes(m))){jiraPlusMenu=menu;")
 replace('await hub.jobRunners[menu](job);}', "await hub.jobRunners[menu](job.combine&&!job.pushMenus.includes(menu)?{...job,teams:false,email:false}:job);}\n   const combinedMessage=job.combine?await jiraPlusFlush(job):null;")
 replace("message:'已完成；通知提交不代表最终送达，请查看工作流。'", "message:combinedMessage||'已完成；通知提交不代表最终送达，请查看工作流。'")
 replace('finally{hub.jobDelivery=null;}', 'finally{hub.jobDelivery=null;jiraPlusPending=null;jiraPlusMenu=null;}')
 replace("attach:true,projects:'',...value}", "attach:true,projects:'',combine:true,...value}")
 replace("field('attach','邮件附交互报告','checkbox');", "field('attach','邮件附交互报告','checkbox');field('combine','一键合并推送（所选结果合并为一封邮件 / 一张 Teams 卡片）','checkbox');const push=el('div','推送菜单（可单选或多选）：',card),pushChecks=[];for(const [key,name] of [['coe','COE'],['sprint','Sprint'],['epic','EPIC']]){const label=el('label',name+' ',push),check=el('input',null,label);check.type='checkbox';check.dataset.jobPush=key;check.value=key;check.checked=(j.pushMenus||j.menus).includes(key);pushChecks.push(check);}el('small','按 COE → Sprint → EPIC 合并；Teams 超限先保留 COE + Sprint，再仅 COE；邮件及交互报告保留全部所选结果。不同项目分别投递。',card);")
 replace('menus:checks.filter(x=>x.checked).map(x=>x.value)})', 'menus:checks.filter(x=>x.checked).map(x=>x.value),pushMenus:pushChecks.filter(x=>x.checked).map(x=>x.value)})')
 replace("if(state.phase==='done'&&GM_getValue(EMPTY_COE,false)===true)", "if(state.phase==='done'&&(GM_getValue(EMPTY_COE,false)===true||hub.jobDelivery?.combine))")
 replace("if(report.payload.email.enabled&&$('attach-report').checked)","if(report.payload.email.enabled&&(hub.jobDelivery?hub.jobDelivery.attach:$('attach-report').checked))",2)
 # Buffer oversized Sprint too; enforce the merged Teams budget once after every scan succeeds.
 replace("if(oversized&&!emailOnly)throw Error", "if(oversized&&!emailOnly&&!hub.jobDelivery?.combine)throw Error",2)
 replace("const emailOnly=oversized&&report.payload.reportType==='epic-analysis';", "const emailOnly=oversized&&report.payload.reportType==='epic-analysis'&&!hub.jobDelivery?.combine;",2)
 return source
