from pathlib import Path
root=Path(__file__).resolve().parents[1]
t=(root/'src/timeout.user.js').read_text()
s=(root/'src/sprint.user.js').read_text()
header=t[:t.index('(function ()')].replace('5.5.4','6.2.0').replace('// @description  详情自动分析、总览手动批量扫描；统一DEV/DCT、周五阈值、Excel和Teams通知','// @description  超时预警与 Sprint Analysis；统一面板、按项目共用 Teams 和邮件配置')
header=header.replace('https://github.com/taomorrow/Jira/issues','https://github.com/taomorrow/Jira-Monitor/issues').replace('// @homepageURL  https://github.com/taomorrow/Jira','// @homepageURL  https://github.com/taomorrow/Jira-Monitor').replace('https://raw.githubusercontent.com/taomorrow/Jira/main/','https://raw.githubusercontent.com/taomorrow/Jira-Monitor/main/')
header=header.replace('// @connect      logic.azure.com','// @connect      logic.azure.com\n// @connect      api.powerautomate.com')
header=header.replace('// @grant        GM_setValue','// @grant        GM_deleteValue\n// @grant        GM_setValue')
t=t[t.index('(function ()'):].replace('5.5.4','6.2.0')
t=t.replace("  if (!/^\\/(issues|browse)(\\/|$)/.test(location.pathname)&&!isDashboard()) return;",'')
t=t.replace("function mountPanel(){document.documentElement.append(host);panel.style.display='block';host.style.visibility='visible';}","function mountPanel(){if(!host.isConnected)hub.timeout.append(host);panel.style.display='block';host.style.visibility='visible';}")
t=t.replace("  host.style.bottom=CONFIG.panelBottomPx+'px';","  host.style.cssText='display:block;width:100%;position:relative';\n  hub.timeout.append(host);")
t=t.replace('logic\\.azure\\.com$/i.test(u.hostname)', 'logic\\.azure\\.com$/i.test(u.hostname)||/(^|\\.)api\\.powerautomate\\.com$/i.test(u.hostname)')
t=t.replace("    add('hr');add('button','统计规则设置'", """    add('button','连接诊断（HEAD，不推送）','data-project-diagnose').onclick=()=>{
      const key=legacyKey.value.trim().toUpperCase(),target=projectConfigs().find(r=>r.projectKey===key);
      if(!target?.webhook){status.textContent='请在左侧输入框填写已保存的项目 Key，诊断其 Webhook';return;}
      status.textContent='正在进行 HEAD 连接诊断，未发送消息…';
      GM_xmlhttpRequest({method:'HEAD',url:target.webhook,anonymous:true,redirect:'error',timeout:15000,
        onload:r=>{status.textContent='HEAD HTTP '+r.status+'；仅验证网络可达性，不代表卡片或邮件投递成功。未发送消息。';},
        onerror:()=>{status.textContent='HEAD 网络失败，请检查 VPN 和油猴域名权限。未发送消息。';},
        ontimeout:()=>{status.textContent='HEAD 诊断超时。未发送消息。';}});
    };
    add('hr');add('button','统计规则设置'""")
t=t.replace("try{const u=new URL(value);return u.protocol==='https:'&&(/(^|\\.)api\\.powerplatform\\.com$/i.test(u.hostname)||/(^|\\.)logic\\.azure\\.com$/i.test(u.hostname)||/(^|\\.)api\\.powerautomate\\.com$/i.test(u.hostname));}catch{return false;}", "try{hub.validateWebhook(value);return true;}catch{return false;}")
t=t.replace("  function autoDetail(){","  function autoDetail(){\n    if(!hub.autoDetail)return;")
t=t.replace("  render();if(ruleLoadError)","  hub.configure=configureCenter;hub.projects=projectConfigs;hub.target=projectTarget;hub.safeError=safeError;\n  badge.remove();badge.style.display='none';\n  render();if(ruleLoadError)")
# A saved, explicitly started scan still resumes across Jira navigation.
t=t.replace("'Jira Monitor：显示统计面板',()=>{mountPanel();","'Jira Monitor：显示统计面板',()=>{hub.show('timeout');mountPanel();")
s=s[s.index('(function ()'):]
s=s.replace("  const host=document.createElement('div'); host.id='jsa-host';host.dataset.jsaVersion='0.1.9'; document.body.append(host);","  const host=document.createElement('div'); host.id='jsa-host';host.dataset.jsaVersion='0.1.9'; hub.sprint.append(host);")
s=s.replace('let field, groups=[]','let reportIssues=[], reportIds=[], reportStatuses=null, reportNow=0; let field, groups=[]')
s=s.replace('    groups=calculated;render();','    reportIssues=scoped;reportIds=ids;reportStatuses=statusIds;reportNow=now;\n    groups=calculated;render();')
start=s.index('  function teamsConfig(){')
end=s.index('  function teamsPreview(){',start)
s=s[:start]+"  function teamsConfig(){hub.configure();}\n"+s[end:]
s=s.replace("    const config=typeof GM_getValue==='function'?GM_getValue('teams-config',{}):{};\n    if(!config.url){teamsConfig();return;}","""    const projectKey=$('notify-project').value;
    const target=hub.target(projectKey+'-1');
    if(!target?.webhook){message('请先在共享配置中设置所选项目的 Webhook。',true);teamsConfig();return;}
    const config={url:target.webhook,name:projectKey};
    const projectIssues=reportIssues.filter(i=>i.key.split('-')[0].toUpperCase()===projectKey);
    if(!projectIssues.length){message('所选项目在本次分析中没有任务，请重新选择。',true);return;}
""")
s=s.replace('buildTeamsReport(groups,reportMeta,activePeriod,reportJiraUrl)',"buildTeamsReport(selectStatusGroups(aggregate(projectIssues,field,reportIds,activePeriod.cutoff,reportNow),reportStatuses),reportMeta+'｜仅项目 '+projectKey,activePeriod,reportJiraUrl)")
s=s.replace("      const data=JSON.stringify(report.payload),bytes=", """      const bodyText=projectKey+' · '+report.description+'\\n'+reportMeta+'\\n'+reportJiraUrl+'\\n\\n'+report.sections.map(section=>section.name+'\\n'+[report.heading,...section.rows].map(row=>row.join(' | ')).join('\\n')).join('\\n\\n');
      const escape=v=>String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
      report.payload.projectKey=projectKey;report.payload.reportType='sprint-analysis';
      report.payload.email=target.recipients?.length?{enabled:true,recipients:[...target.recipients],to:target.recipients.join(';'),subject:'[Jira Monitor] '+projectKey+' · Sprint Analysis',bodyText,bodyHtml:'<pre>'+escape(bodyText)+'</pre>'}:{enabled:false};
      const data=JSON.stringify(report.payload),bytes=""")
s=s.replace("text('p','目标：'+config.name,teamsBox);","text('p','目标项目：'+config.name+' · 邮件：'+(target.recipients?.join(';')||'未配置'),teamsBox);")
s=s.replace('Teams 配置</button>','共享 Teams / 邮件配置</button><label>推送项目<select id="notify-project"></select></label>')
s=s.replace("    groups=calculated;render();", "    groups=calculated;const picker=$('notify-project');picker.replaceChildren();for(const key of [...new Set(scoped.map(i=>i.key.split('-')[0].toUpperCase()))].sort()){const o=text('option',key,picker);o.value=key;}render();")
s=s.replace("  if(typeof GM_registerMenuCommand==='function')GM_registerMenuCommand('Teams 配置',teamsConfig);",'')
s=s.replace("  $('launch').onclick=", "  $('launch').style.display='none';$('close').style.display='none';\n  const embeddedStyle=document.createElement('style');embeddedStyle.textContent='#overlay{display:block!important;position:relative;inset:auto;padding:0;background:none;z-index:auto}#panel{height:auto;min-height:65vh;max-width:none;margin:0;box-shadow:none;border-radius:0}';root.append(embeddedStyle);\n  $('launch').onclick=")
s=s.replace("const close=()=>{$('overlay').style.display='none';lastFocus?.focus();};", "const close=()=>{hub.hide();lastFocus?.focus();};")
hub=(root/'src/hub.js').read_text()
hub += s[s.index('  function validateTeamsUrl(value){'):s.index('  function teamsResponseInfo')]+'hub.validateWebhook=validateTeamsUrl;\n'
hub += (root/'src/mail.js').read_text()

# Build isolated monitor controllers: explicit main-window work and automatic detail popup.
t=t.replace('(function () {', 'function initTimeout(detailOnly){',1)
t=t.removesuffix('\n').removesuffix('})();')+'}\ninitTimeout();initTimeout(true);\n'
t=t.replace("host.id='jira-duration-panel-host';", "host.id=detailOnly?'jira-detail-panel-host':'jira-duration-panel-host';")
t=t.replace("hub.timeout.append(host)","(detailOnly?hub.detail:hub.timeout).append(host)")
t=t.replace("const DETAIL_STORE='jira-monitor-detail-v5';", "const DETAIL_STORE=detailOnly?'jira-monitor-auto-detail-v1':'jira-monitor-manual-detail-v1';")
t=t.replace("    if(batch?.active||batch?.paused)return batch;", "    if(!detailOnly&&(batch?.active||batch?.paused))return batch;\n    if(detailOnly)return readState(DETAIL_STORE);")
t=t.replace("    if(!hub.autoDetail)return;", "    if(!detailOnly)return;\n    hub.syncDetail();\n    if(!hub.autoDetail)return;")
t=t.replace("    render();void pump();", "    hub.openDetail();render();void pump();")
t=t.replace("    const s=get();\n    el('[data-teams-status]')", "    const s=get();\n    if(detailOnly)hub.syncDetail();\n    el('[data-teams-status]')")
t=t.replace("if(typeof GM_registerMenuCommand==='function')", "if(!detailOnly&&typeof GM_registerMenuCommand==='function')")
t=t.replace("  hub.configure=configureCenter;hub.projects=projectConfigs;hub.target=projectTarget;hub.safeError=safeError;", "  if(!detailOnly){hub.configure=configureCenter;hub.projects=projectConfigs;hub.target=projectTarget;hub.safeError=safeError;}else{hub.startDetail=autoDetail;hub.stopDetail=()=>{epoch++;busy=false;detailRoute='';const state=get();if(state?.active){state.active=false;state.phase='stopped';save(state);}};}")
t=t.replace("    const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0005;display:flex;align-items:center;justify-content:center';\n    const shadow=overlay.attachShadow({mode:'open'}),box=document.createElement('div');box.style.cssText='background:white;color:#172b4d;padding:20px;border-radius:8px;width:1000px;max-width:94vw;max-height:85vh;overflow:auto;font:14px Arial';shadow.append(box);", "    hub.show('settings');hub.settings.replaceChildren();const overlay={remove:()=>hub.show('timeout')},box=hub.settings;")
t=t.replace("    add('b','Jira Monitor · 配置中心');", """    add('h2','配置中心');
    const autoLabel=add('label',null,'data-auto-setting'),auto=add('input',null,'data-auto-detail',autoLabel);auto.type='checkbox';auto.checked=hub.autoDetail;add('span','详情自动分析 · 在 Jira 详情页右下角独立弹出',null,autoLabel);auto.onchange=()=>hub.setAuto(auto.checked);
""")
t=t.replace("    (document.body||document.documentElement).append(overlay);\n  }\n  if(!detailOnly", "  }\n  if(!detailOnly")
t=t.replace("el('[data-progress]').textContent=s ?", "el('[data-progress]').textContent=s ?")
t=t.replace("'详情页正在自动分析'", "'点击重新分析当前详情'")
t=t.replace("make('b','Jira Monitor v6.2.0',null,panel)","make('b','超时预警',null,panel)")
t=t.replace("    add('button','关闭').onclick=()=>overlay.remove();\n  }\n  if(!detailOnly", "  }\n  if(!detailOnly")
t=t.replace("    epoch++;busy=false;detailRoute=key;", "    try{const latest=GM_getValue(RULE_SETTING,CONFIG.rules);validateRules(latest);CONFIG.rules=latest;}catch(error){notice(safeError(error));return;}\n    epoch++;busy=false;detailRoute=key;")
# The alert close affordance belongs to the outer window; timeout content stays expanded.
t=t.replace("  mountPanel();\n", """  const theme=document.createElement('style');theme.textContent=`
    section{height:100%!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:20px!important;font:13px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}
    section>b{display:block;font-size:19px;margin-bottom:12px;color:#24334d} [data-fold]{display:none} [data-body]{height:calc(100% - 44px)!important;display:flex!important}
    button{height:32px;padding:5px 12px;border-radius:7px;border-color:#dbe3ef;background:white} [data-start]{background:#245de8;border-color:#245de8} [data-actions]{flex-wrap:wrap;gap:6px;padding:12px 0}
    [data-config]{background:#f3f6fc;padding:12px 14px;border-radius:9px;color:#64748b;line-height:1.8;margin:0 0 8px} [data-friday-note]{font-size:11px!important;color:#b67718!important}
    [data-totals]{background:#eaf0ff;border:1px solid #dee7ff;color:#245de8;padding:11px 13px;border-radius:8px} [data-results]>div{padding:12px 4px!important;border-bottom:1px solid #edf1f7!important;line-height:1.8}
    select{padding:8px;border-radius:7px;border-color:#dde5f0} [data-teams-status],[data-progress]{font-size:11px!important;color:#8996ab!important} [data-notice]:empty,[data-notice]:empty~[data-teams-errors][hidden]{display:none}
    :host{height:100%} [data-results]{min-height:80px!important} `;
  if(detailOnly){theme.textContent+='section{height:420px!important;padding:14px!important}section>b{display:none}[data-body]{height:100%!important}[data-friday-note]{display:none}';}
  shadow.append(theme);mountPanel();
""",1)
# Match Teams card content with a real, styled email table.
old="bodyHtml:'<div style=\"font-family:Arial,sans-serif\"><h2>'+esc(current.key)+'</h2><p>'+esc(current.summary)+'</p><p>负责人：'+esc(current.assignee)+'</p>'+rules.map(r=>'<p>'+esc(r.name+'：'+r.sla+' · '+r.days.toFixed(2)+'天')+'</p>').join('')+'<p>扫描时间：'+esc(beijingTime(current.checkedAt))+'</p><p><a href=\"'+esc(jiraUrl)+'\">打开 Jira</a></p></div>'"
new="bodyHtml:hub.emailCard({title:current.key+' · 超时预警',subtitle:current.summary+' · 负责人：'+(current.assignee||'未分配'),sections:[{title:'规则分析',headers:['规则','结果','时长（天）'],rows:rules.map(r=>[r.name,r.sla,r.days.toFixed(2)])}],meta:'扫描时间：'+beijingTime(current.checkedAt),url:jiraUrl})"
assert old in t
t=t.replace(old,new)
s=s.replace("bodyHtml:'<pre>'+escape(bodyText)+'</pre>'", "bodyHtml:hub.emailCard({title:projectKey+' · Sprint Analysis',subtitle:report.description,sections:report.sections.map(section=>({title:section.name,headers:report.heading,rows:section.rows,total:true,deltaColumn:3})),meta:reportMeta,url:reportJiraUrl})")
s=s.replace("if(bytes>26*1024)", "if(new TextEncoder().encode(JSON.stringify(report.payload.attachments)).length>26*1024)")
s=s.replace('<button id="teams-config">共享 Teams / 邮件配置</button>', '')
s=s.replace("  $('teams-config').onclick=teamsConfig;", "  ")
s=s.replace("#panel{height:auto;min-height:65vh;max-width:none;margin:0;box-shadow:none;border-radius:0}", "#panel{height:auto;min-height:0;max-width:none;margin:0;padding:2px;background:transparent;box-shadow:none;border-radius:0}header{margin-bottom:12px}h1{font-size:21px}h1 small{display:none}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:stretch}fieldset{min-width:0;max-width:none;width:100%;background:#fff;border-color:#dce4f1;padding:12px}.choices{max-width:none;height:150px}.choices label{font-size:12px}label{font-size:12px;color:#718098}button{border-color:#dbe3f0;border-radius:7px;font-size:12px;padding:8px 10px}.primary{background:#245de8;border-color:#245de8}.notice{font-size:11px;line-height:1.7;color:#718098;background:#edf3ff;padding:10px 12px}#load{align-self:end}#message{font-size:12px}.card{border-color:#e1e7f1;padding:14px;border-radius:10px}p.muted{font-size:11px}#status-all{align-self:start}")
# Focused refinements for the sidebar version.
t=t.replace("  let busy=false, epoch=0;", "  let busy=false, epoch=0, shownBatch='';")
t=t.replace("    const s=get();\n    if(detailOnly)hub.syncDetail();", "    const s=get();\n    if(!detailOnly&&s?.mode==='batch'&&(s.active||s.paused)&&shownBatch!==s.id){shownBatch=s.id;hub.show('timeout');}\n    if(detailOnly)hub.syncDetail();")
t=t.replace("    add('b','统计规则设置');", """    box.style.position='relative';
    const closeRule=add('button','❌','data-rule-close');closeRule.setAttribute('aria-label','关闭统计规则');closeRule.style.cssText='position:sticky;top:0;float:right;margin:0 0 10px 12px;color:#dc3545;background:#fff1f2;border:0;border-radius:8px;width:30px;height:30px;cursor:pointer;z-index:1';closeRule.onclick=()=>overlay.remove();
    add('b','统计规则设置');""")
t=t.replace("    add('button','关闭').onclick=()=>overlay.remove();(document.body||document.documentElement).append(overlay);", "    (document.body||document.documentElement).append(overlay);")
start=s.index('  function teamsPreview(){')
end=s.index("  $('teams-preview').onclick=teamsPreview;",start)
s=s[:start]+(root/'src/sprint-notify.js').read_text()+s[end:]
s=s.replace('<select id="notify-project"></select>', '<div id="notify-project" role="group" aria-label="推送项目（可多选）"></div>')
s=s.replace('推送项目<div', '推送项目（可多选）<div')
s=s.replace('<label>推送项目（可多选）<div id="notify-project" role="group" aria-label="推送项目（可多选）"></div></label>','<fieldset id="notify-box"><legend>推送项目（可多选）</legend><div id="notify-project" role="group" aria-label="推送项目（可多选）"></div></fieldset>')
s=s.replace("const o=text('option',key,picker);o.value=key;", "const label=text('label','',picker);const input=document.createElement('input');input.type='checkbox';input.value=key;input.checked=true;label.append(input,document.createTextNode(key));")
s=s.replace("  $('launch').style.display='none';", """  const toolbar=document.createElement('div');toolbar.className='query-toolbar';const controls=root.querySelector('.controls');controls.before(toolbar);toolbar.append($('period').parentElement,$('load'));
  const compact=document.createElement('style');compact.textContent='.query-toolbar{display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin:16px 0}.query-toolbar label{width:240px;max-width:100%}.query-toolbar #load{width:auto;min-width:0;padding:8px 14px}.controls{align-items:start}#notify-box{grid-column:1/-1;padding:8px 12px}#notify-project{display:flex;gap:8px;flex-wrap:wrap;padding:4px 0}#notify-project label{display:inline-flex;flex-direction:row;align-items:center;gap:6px;background:#fff;border:1px solid #dce4f1;border-radius:7px;padding:7px 12px;cursor:pointer}#notify-project input{margin:0}.controls>#run,.controls>#export,.controls>#teams-preview{width:max-content;max-width:100%}.query-toolbar select{width:100%}';root.append(compact);
  $('launch').style.display='none';""")
(root/'jiraMonitor.user.js').write_text(header+hub+t+'\n'+s+'\n})();\n')
