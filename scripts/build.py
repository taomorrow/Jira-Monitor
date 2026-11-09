from pathlib import Path
import hashlib
root=Path(__file__).resolve().parents[1]
t=(root/'src/timeout.user.js').read_text()
s=(root/'src/sprint.user.js').read_text()
header=t[:t.index('(function ()')].replace('5.5.4','6.12.11').replace('// @description  详情自动分析、总览手动批量扫描；统一DEV/DCT、周五阈值、Excel和Teams通知','// @description  COE、Sprint、Epic 分析及 Kanban 可视化；统一面板、按项目启用 Teams 和邮件通知')
header=header.replace('https://github.com/taomorrow/Jira/issues','https://github.com/taomorrow/Jira-Monitor/issues').replace('// @homepageURL  https://github.com/taomorrow/Jira','// @homepageURL  https://github.com/taomorrow/Jira-Monitor').replace('https://raw.githubusercontent.com/taomorrow/Jira/main/','https://raw.githubusercontent.com/taomorrow/Jira-Monitor/main/')
header=header.replace('// @connect      api.powerplatform.com','// @connect      api.powerplatform.com\n// @connect      raw.githubusercontent.com')
header=header.replace('// @connect      logic.azure.com','// @connect      logic.azure.com\n// @connect      api.powerautomate.com')
header=header.replace('// @grant        GM_setValue','// @grant        GM_openInTab\n// @grant        GM_deleteValue\n// @grant        GM_setValue')
t=t[t.index('(function ()'):].replace('5.5.4','6.12.11')
t=t.replace("  if (!/^\\/(issues|browse)(\\/|$)/.test(location.pathname)&&!isDashboard()) return;",'')
t=t.replace("function mountPanel(){document.documentElement.append(host);panel.style.display='block';host.style.visibility='visible';}","function mountPanel(){if(!host.isConnected)hub.timeout.append(host);panel.style.display='block';host.style.visibility='visible';}")
t=t.replace("  host.style.bottom=CONFIG.panelBottomPx+'px';","  host.style.cssText='display:block;width:100%;position:relative';\n  hub.timeout.append(host);")
t=t.replace('logic\\.azure\\.com$/i.test(u.hostname)', 'logic\\.azure\\.com$/i.test(u.hostname)||/(^|\\.)api\\.powerautomate\\.com$/i.test(u.hostname)')
t=t.replace("    add('hr');add('button','统计规则设置'", """    add('button','连接诊断（HEAD，不推送）','data-project-diagnose').onclick=()=>{
      const key=legacyKey.value.trim().toUpperCase(),target=projectConfigs().find(r=>r.projectKey===key||r.projectGroup===key);
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
s=s.replace('summary,status,created,updated,${field}', 'summary,status,created,updated,assignee,${field}')
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
hub += (root/'src/coe-report.js').read_text()
hub += (root/'src/mail-report.js').read_text()
hub += (root/'src/analysis-details.js').read_text()
hub += (root/'src/mac-app.js').read_text().replace('__MAC_APP_SHA256__',hashlib.sha256((root/'src/mac-app-template.base64').read_text().strip().encode()).hexdigest())
hub += (root/'src/jobs.js').read_text()
hub += (root/'src/browser-scheduler.js').read_text()

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
t=t.replace("make('b','Jira Monitor v6.12.11',null,panel)","make('b','超时预警',null,panel)")
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
# Status selection visibly mirrors its effective scope.
s=s.replace('<p class="muted">直接勾选下面的状态即可切换为指定状态。</p>', '<div class="tools"><button id="status-select-all" type="button">全选</button><button id="status-clear" type="button">清空</button></div>')
s=s.replace("for(const name of STATUS_NAMES)choice($('statuses'),normalized(name),name,false);", "for(const name of STATUS_NAMES)choice($('statuses'),normalized(name),name,true);")
s=s.replace("$('statuses').onchange=()=>{$('status-all').checked=false;invalidate();};", "$('statuses').onchange=()=>{const inputs=[...$('statuses').querySelectorAll('input')];$('status-all').checked=inputs.length>0&&inputs.every(x=>x.checked);invalidate();};")
s=s.replace("$('status-all').onchange=()=>{for(const x of $('statuses').querySelectorAll('input'))x.checked=false;invalidate();};", "$('status-all').onchange=()=>{for(const x of $('statuses').querySelectorAll('input'))x.checked=$('status-all').checked;invalidate();};\n  $('status-select-all').onclick=()=>{$('status-all').checked=true;$('status-all').onchange();};\n  $('status-clear').onclick=()=>{$('status-all').checked=false;$('status-all').onchange();};")
s=s.replace('<button id="teams-preview" disabled>', '<button id="teams-preview" class="primary" disabled>')
s=s.replace("if(bytes>26*1024)", "if(new TextEncoder().encode(JSON.stringify(report.payload.attachments)).length>26*1024)")
s=s.replace('<button id="teams-config">共享 Teams / 邮件配置</button>', '')
s=s.replace("  $('teams-config').onclick=teamsConfig;", "  ")
s=s.replace("#panel{height:auto;min-height:65vh;max-width:none;margin:0;box-shadow:none;border-radius:0}", "#panel{height:auto;min-height:0;max-width:none;margin:0;padding:2px;background:transparent;box-shadow:none;border-radius:0}header{margin-bottom:12px}h1{font-size:21px}h1 small{display:none}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:stretch}fieldset{min-width:0;max-width:none;width:100%;background:#fff;border-color:#dce4f1;padding:12px}.choices{max-width:none;height:150px}.choices label{font-size:12px}label{font-size:12px;color:#718098}button{border-color:#dbe3f0;border-radius:7px;font-size:12px;padding:8px 10px}.primary{background:#245de8;border-color:#245de8;color:#fff}.primary:not(:disabled):hover{background:#174bd0}.notice{font-size:11px;line-height:1.7;color:#718098;background:#edf3ff;padding:10px 12px}#load{align-self:end}#message{font-size:12px}.card{border-color:#e1e7f1;padding:14px;border-radius:10px}p.muted{font-size:11px}#status-all{align-self:start}")
# Focused refinements for the sidebar version.
t=t.replace("  let busy=false, epoch=0;", "  let busy=false, epoch=0, shownBatch='';")
t=t.replace("    const s=get();\n    if(detailOnly)hub.syncDetail();", "    const s=get();\n    hub.syncRoute();\n    if(!detailOnly&&!isDetail()&&s?.mode==='batch'&&(s.active||s.paused)&&shownBatch!==s.id){shownBatch=s.id;hub.show('timeout');}\n    if(detailOnly)hub.syncDetail();")
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
t=t.replace("node.closest?.('#jira-duration-panel-host')", "node.closest?.('#jira-duration-panel-host, #jira-monitor-hub, #jira-detail-panel-host, #jira-monitor-issue-details')")
t=t.replace("node.id!=='jira-duration-panel-host'", "!['jira-duration-panel-host','jira-monitor-hub','jira-detail-panel-host','jira-monitor-issue-details'].includes(node.id)")
# Batch lists use REST exclusively, including full search and history pagination.
t=t.replace("  async function pump() {", (root/'src/batch-api.js').read_text()+"\n  async function pump() {")
t=t.replace("    if(s.jobDirect)return;", """    if(s.mode==='batch'){
      if(!s.apiScan){s.active=false;s.paused=true;s.message='旧版逐页任务已暂停，请停止后重新开始接口扫描；原结果可导出。';save(s);render();return;}
      if(s.phase==='collecting')await continueCollection();else await scanDirect();return;
    }
    if(s.jobDirect)return;""")
t=t.replace("  el('[data-pause]').onclick=()=>{", """  const startSingle=el('[data-start]').onclick;
  el('[data-start]').onclick=()=>detailOnly||isDetail()?startSingle():startApiBatch();
  el('[data-pause]').onclick=()=>{""")
t=t.replace("async function issueHistory(key){", "async function issueHistory(key,checkpoint=()=>{}){\n    checkpoint();")
t=t.replace("    let histories=data.changelog?.histories;", "    checkpoint();let histories=data.changelog?.histories;")
t=t.replace("        const page=await api('/rest/api/2/issue/'", "        checkpoint();const page=await api('/rest/api/2/issue/'")
t=t.replace("        const batch=page.values||page.histories;", "        checkpoint();const batch=page.values||page.histories;")
t=t.replace("state.active=false;state.paused=false;state.message=e.message;save(state);", "state.active=false;state.paused=true;state.message=e.message;save(state);")
# Interactive standalone snapshot reports, usable without Jira or network access.
s=s.replace('<button id="export" disabled>导出 CSV</button>', '<button id="export" disabled>导出 CSV</button><button id="report-export" disabled>导出交互报告</button><label class="report-option"><input id="attach-report" type="checkbox" checked>邮件附交互报告（含 Jira 明细）</label>')
s=s.replace("$('export').disabled=", "$('report-export').disabled=$('export').disabled=")
s=s.replace("  let teamsSending=false,teamsFocus;", (root/'src/interactive-report.js').read_text()+"\n"+(root/'src/report-actions.js').read_text()+"\n  let teamsSending=false,teamsFocus;")
# Capture query counts before COE type/status filtering, including explicit zero-result projects.
t=t.replace('    return {queue,total,jql};', '''    const projectCounts={};for(const issue of found.values()){const key=projectKeyOf(issue.key);projectCounts[key]=(projectCounts[key]||0)+1;}
    for(const match of jql.matchAll(/\\bproject\\s*(?:=\\s*["']?([A-Z][A-Z0-9_]*)["']?|in\\s*\\(([^)]+)\\))/gi)){for(const raw of (match[1]||match[2]).split(',')){const key=raw.trim().replace(/["']/g,'').toUpperCase();if(/^[A-Z][A-Z0-9_]*$/.test(key)&&!(key in projectCounts))projectCounts[key]=0;}}
    return {queue,total,jql,projectCounts};''')
t=t.replace('const {queue,total,jql}=await allIssues(id,token);', 'const {queue,total,jql,projectCounts}=await allIssues(id,token);')
t=t.replace('Object.assign(state,{queue,total,jql,phase:', 'Object.assign(state,{queue,total,jql,projectCounts,phase:')
# Batch notifications are one alert list per project; detail sends remain individual.
t=t.replace("  el('[data-teams]').onclick=async()=>{", (root/'src/timeout-summary.js').read_text()+"\n  el('[data-teams]').onclick=async()=>{")
t=t.replace("    const s=get();if(teamsSending||s?.active)return;", "    const s=get();if(teamsSending||s?.active)return;\n    if(s?.mode==='batch'){await sendBatchAlerts(s,false);return;}")
t=t.replace("  make('button','发送 Teams','data-teams',actions);", "  make('button',detailOnly?'发送 Teams':'发送预警列表','data-teams',actions);")
t=t.replace("  make('button',detailOnly?'发送 Teams':'发送预警列表','data-teams',actions);", '''  make('button',detailOnly?'发送 Teams':'发送预警列表','data-teams',actions);
  if(!detailOnly){const label=make('label',null,'data-empty-summary-setting',body);const check=document.createElement('input');check.type='checkbox';check.checked=GM_getValue('jira-monitor-coe-empty-summary-v1',false)===true;check.setAttribute('data-empty-summary','');check.onchange=()=>{GM_setValue('jira-monitor-coe-empty-summary-v1',check.checked);render();};label.append(check,document.createTextNode(' 无预警工单时推送扫描摘要（时间、条目数、状态）'));}''')
t=t.replace("||!s?.results?.some(item=>item.rules?.some(r=>Number.isFinite(r.seconds)))", "||(!s?.results?.some(item=>item.rules?.some(r=>Number.isFinite(r.seconds)))&&!(s?.mode==='batch'&&s.phase==='done'&&GM_getValue('jira-monitor-coe-empty-summary-v1',false)===true))")
# COE email preview and standalone reports use the same frozen alert payload as delivery.
t=t.replace("  make('button',detailOnly?'发送 Teams':'发送预警列表','data-teams',actions);", "  make('button',detailOnly?'发送 Teams':'发送预警列表','data-teams',actions);if(!detailOnly){make('button','预览邮件 / 报告','data-mail-preview',actions);make('button','导出交互报告','data-report-export',actions);}")
t=t.replace("    el('[data-teams]').disabled=", "    if(!detailOnly)el('[data-report-export]').disabled=el('[data-mail-preview]').disabled=!s?.results?.length||!!s?.active;\n    el('[data-teams]').disabled=")
t=t.replace("  el('[data-teams]').onclick=async()=>{", "  if(!detailOnly){\n"+(root/'src/coe-report-actions.js').read_text()+"\n  }\n  el('[data-teams]').onclick=async()=>{")
# One workflow order drives filter choices and every statistical/export channel.
import json
status_names=json.loads((root/'src/status-order.json').read_text())
start=s.index('  const STATUS_NAMES=')
end=s.index('\n',start)
s=s[:start]+'  const STATUS_NAMES='+json.dumps(status_names,ensure_ascii=False)+';'+s[end:]
s=s.replace("a.name.localeCompare(b.name)", "(STATUS_NAMES.findIndex(n=>normalized(n)===normalized(a.name))+1||STATUS_NAMES.length+1)-(STATUS_NAMES.findIndex(n=>normalized(n)===normalized(b.name))+1||STATUS_NAMES.length+1)||a.name.localeCompare(b.name)")
s=s.replace('以下 12 个','以下 '+str(len(status_names))+' 个').replace('全部指定的 12 个状态','全部指定的 '+str(len(status_names))+' 个状态')
# Project notification gate applies to every module, including manual deliveries.
t=t.replace("return rows[0]?{...rows[0],projectKey}:null;", "return rows[0]&&rows[0].enabled!==false?{...rows[0],projectKey}:null;")
t=t.replace("'批量自动通知','操作'", "'启用通知','批量自动通知','操作'")
t=t.replace("      const auto=add('input'", "      const enabled=add('input',null,'data-project-enabled',add('td',null,null,tr));enabled.type='checkbox';enabled.checked=value.enabled!==false;enabled.setAttribute('aria-label','启用项目通知');\n      const auto=add('input'")
t=t.replace("{tr,key,webhook,emails,auto,deleted:false}", "{tr,key,webhook,emails,enabled,auto,deleted:false}")
t=t.replace("autoNotify:r.auto.checked}", "autoNotify:r.auto.checked,enabled:r.enabled.checked}")
t=t.replace("未配置项目只统计、不发送", "未配置或未启用的项目只统计、不发送；可同时启用多个项目")
t=t.replace("make('b','超时预警',null,panel)", "make('b','COE · 超时预警',null,panel)")
# Grouped project rows retain their / notation in settings, and expand for every notification path.
a=t.index('  function projectConfigs(){');b=t.index('  function projectTarget(',a)
t=t[:a]+(root/'src/project-config.js').read_text()+t[b:]
t=t.replace('const stored=projectConfigs();', 'const stored=rawProjectConfigs();')
t=t.replace("key.style.width='85px';", "key.style.width='100%';key.placeholder='CSP/OSPIT';")
t=t.replace("if(!/^[A-Z][A-Z0-9_]*$/.test(key))throw Error('项目 Key 无效：'+key);\n        if(seen.has(key))throw Error('项目 Key 重复：'+key);seen.add(key);", "const keys=projectKeys(key);for(const member of keys){if(seen.has(member))throw Error('项目 Key 重复：'+member);seen.add(member);}")
t=t.replace('projectKey:key,webhook,recipients,autoNotify:', "projectKey:keys.join('/'),webhook,recipients,autoNotify:")
t=t.replace('未配置或未启用的项目只统计、不发送；可同时启用多个项目', '多个项目可用 / 分隔（如 CSP/OSPIT），共用此行 Webhook、收件人和通知开关。未配置或未启用的项目只统计、不发送')
t=t.replace("'已保存并验证 '+result.length+' 个项目，本页立即生效'", "'已保存并验证 '+result.length+' 组配置，覆盖 '+result.flatMap(r=>projectKeys(r.projectKey)).length+' 个项目，本页立即生效'")
t=t.replace("render();status.style.color='#00875a';", "dispatchEvent(new Event('jira-monitor-project-config'));render();status.style.color='#00875a';")
t=t.replace("const key=legacyKey.value.trim().toUpperCase();if(!/^[A-Z][A-Z0-9_]*$/.test(key))throw Error('请填写项目 Key');", "const key=projectKeys(legacyKey.value).join('/');")
t=t.replace("r.key.value.trim().toUpperCase()===key", "r.key.value.trim()&&projectKeys(r.key.value).some(k=>projectKeys(key).includes(k))")
# Rebuild options from current report and configured Story project keys only; never keep stale choices.
a=s.index("const picker=$('notify-project');picker.replaceChildren();for(const key of ");b=s.index('render();message(',a)
s=s[:a]+'renderNotifyProjects();'+s[b:]
s=s.replace("  function selected(){", (root/'src/notify-projects.js').read_text()+"\n  function selected(){")
s=s.replace("groups=[];$('results').replaceChildren();", "groups=[];$('notify-project').replaceChildren();$('results').replaceChildren();")
s=s.replace("loadedQuery='';$('sprints').replaceChildren();", "loadedQuery='';$('notify-project').replaceChildren();$('sprints').replaceChildren();")
s=s.replace('<legend>推送项目（可多选）</legend>', '<legend>通知项目（工单所属项目，可多选）</legend>')

# Replace inline drilldown with a separate, searchable dialog for both analysis modules.
a=s.index('  function details(title,items){');b=s.index('  function render(){',a)
s=s[:a]+"  function details(title,items){hub.showIssueDetails(title,items,activePeriod); }\n"+s[b:]
# Exclude Bugs before history scanning where type metadata is available, and recheck REST results.
t=t.replace('const queue=[...found.values()].filter(x=>rules.some', 'const queue=[...found.values()].filter(x=>!bugIssueType(x.fields?.issuetype)).filter(x=>rules.some')
t=t.replace("    checkpoint();let histories=data.changelog?.histories;", "    checkpoint();if(bugIssueType(data.fields?.issuetype))return {excluded:true,issueType:data.fields.issuetype.name};\n    let histories=data.changelog?.histories;")
t=t.replace('const s=valid(id,token),now=Date.now();\n    return {checkedAt:', 'const s=valid(id,token),now=Date.now();\n    if(data.excluded)return {excluded:true};\n    return {checkedAt:')
t=t.replace('        s.results.push({...item,', "        if(result.excluded){s.index++;s.active=false;s.phase='done';s.message=item.key+' 为 Bug，已跳过，不参与 COE 统计和通知';save(s);render();return;}\n        s.results.push({...item,")
# Fetch Subtask owners as part of the same cancellable scan transaction.
t=t.replace('fields=assignee,status,summary,issuetype&expand=changelog','fields=assignee,status,summary,issuetype,subtasks&expand=changelog')
t=t.replace("    return {events,issueType:", "    const devRule=CONFIG.rules.find(r=>norm(r.name)==='DEV');const devAssignees=devRule?.currentStatuses.map(norm).includes(norm(fields.status.name))?await subtaskAssignees(fields,checkpoint):[];checkpoint();\n    return {devAssignees,events,issueType:")
t=t.replace('await issueHistory(keyOf(location.href));','await issueHistory(keyOf(location.href),()=>valid(id,token));')
t=t.replace('assigneeEmail:data.assigneeEmail,', 'devAssignees:data.devAssignees,assigneeEmail:data.assigneeEmail,')
t=t.replace("div.append(a,document.createTextNode(' · '+(item.assignee||'未读取到经办人')));", "div.append(a,document.createTextNode(' · '+scanOwnerLabel(item)));")
t=t.replace("item.summary,item.assignee||'',item.currentStatus", "item.summary,norm(rule.name)==='DEV'?devOwnerLabel(item):(item.assignee||''),item.currentStatus")
t=t.replace('  function teamsPayload(', '  function baseTeamsPayload(',1)
t=t.replace('  function safeError(error){', (root/'src/dev-assignees.js').read_text()+'\n  function safeError(error){')
# Build Epic from the same analysis engine so filters, drilldowns and notification formats stay aligned.
epic=s.replace('Sprint','Epic').replace('sprint-analysis','epic-analysis').replace('hub.sprint.append(host)','hub.epic.append(host)').replace('jsa-host','jea-host')
a=epic.index('  function sprints(value) {');b=epic.index('  function statusAt(',a)
epic=epic[:a]+(root/'src/epic-membership.js').read_text()+epic[b:]
a=epic.index('  async function detectField(){');b=epic.index('  async function search(',a)
epic=epic[:a]+(root/'src/epic-field.js').read_text()+epic[b:]
a=epic.index('  async function api(');b=epic.index('  async function currentQuery()',a)
epic=epic[:a]+(root/'src/epic-api.js').read_text()+epic[b:]
epic=epic.replace('<h1>Epic Analysis', '<h1>Epic').replace("g.name+' · '+g.id,card", "g.name,card")
a=epic.index('<div class="notice">');b=epic.index('</div>',a)
epic=epic[:a]+'<div class="notice">口径：仅统计当前查询全部分页中的 Story，按当前 Epic 归属分组；不会查询 Epic 下的其他 Story。不包含 Bug、Task、Subtask，不还原历史 Epic 归属。对比两侧均为 0 的状态行及空 Epic 自动隐藏。</div>'+epic[b+6:]
epic=epic.replace('summary,status,created,updated,assignee,${field}', 'summary,status,created,updated,assignee,issuetype,parent,${field}')

epic=epic.replace('const query=await currentQuery(), issues=await search(query), map=new Map();', 'const query=await currentQuery(), issues=(await search(query)).filter(isStory), map=new Map();')
epic=epic.replace('for(const i of issues){const list=sprints(i.fields[field]);', 'await loadEpicNames(issues);\n    for(const i of issues){const list=sprints(i.fields[field]);')
epic=epic.replace("/^active$/i.test(s.state)", 'true')
epic=epic.replace('${issues.length} 条任务', '${issues.length} 条 Story')
epic=epic.replace('const scoped=full.filter(i=>matchesEpic(i,field,ids));', 'const scoped=full.filter(i=>isStory(i)&&matchesEpic(i,field,ids));')
epic=epic.replace('const pageIssues=await search(jql), issues=pageIssues.filter(i=>matchesEpic(i,field,ids))', 'const pageIssues=await search(jql), issues=pageIssues.filter(i=>isStory(i)&&matchesEpic(i,field,ids))')
a=epic.index('  function selectStatusGroups(');b=epic.index('  function ',a+12)
selection=epic[a:b];end=selection.rfind('});');assert end>=0
epic=epic[:a]+selection[:end]+'}).filter(g=>[...g.rows.values()].some(r=>r.before.length||r.after.length));'+selection[end+3:]+epic[b:]
epic=epic.replace('const rows=[...g.rows.values()].sort(', 'const rows=[...g.rows.values()].filter(r=>r.before.length||r.after.length).sort(')
epic=epic.replace('本工具只读取 Jira，不修改任务。', '仅统计当前查询中的 Story，按 Epic 分组；按当前归属回溯状态，不还原历史归属。本工具只读取 Jira，不修改任务。')
epic=epic.replace('统计当前页面查询的全部分页，不扩大到整个 Epic。修改 Jira 搜索条件后请先点击 Search，再重新载入。若页面排除了已解决任务，完成数量也会受限。','仅统计当前查询全部分页中的 Story，按 Epic 分组，不追溯其他 Story。修改 Jira 搜索条件后请重新载入。')
# pageshow can arrive after a scheduled scan has already started at document-end.
# pagehide invalidates departed work; pageshow must not cancel a live request.
t=t.replace("addEventListener('pageshow',()=>{epoch++;busy=false;autoDetail();", "addEventListener('pageshow',()=>{autoDetail();")
# Register internal entry points; scheduled runs call functions rather than clicking analysis controls.
t=t.replace("  render();if(ruleLoadError)", (root/'src/job-coe.js').read_text()+"\n  render();if(ruleLoadError)")
t=t.replace('if(token===epoch)pump();', 'if(token===epoch)await pump();')
t=t.replace("    add('h2','配置中心');", "    add('h2','Configuration');hub.renderJobs();add('button','Kanban 配色').onclick=()=>hub.renderPalette(hub.settings);")
# Insert inside the module closure, after all function declarations are available.
s=s.replace("  $('teams-preview').onclick=teamsPreview;", (root/'src/job-analysis.js').read_text()+"\n  $('teams-preview').onclick=teamsPreview;")
epic=epic.replace("  $('teams-preview').onclick=teamsPreview;", (root/'src/job-analysis.js').read_text().replace("['sprint']", "['epic']").replace('Sprint','Epic')+"\n  $('teams-preview').onclick=teamsPreview;")
s=s.replace('<h1>Sprint Analysis', '<h1>Sprint')
# Sprint defaults and select-all share the same eligibility rule; Epic remains unchanged.
s=s.replace("/^active$/i.test(s.state)", "!hub.closedSprint(s.name+' '+s.state)&&s.id!==NONE")
s=s.replace("    if(!selected().length&&$('sprints').querySelector('input'))$('sprints').querySelector('input').checked=true;", "")
s=s.replace("x.checked=checked;invalidate();", "x.checked=checked&&!hub.closedSprint(x.parentElement.textContent)&&x.value!==NONE;invalidate();")
s=s.replace("await load();for(const x of $('sprints').querySelectorAll('input'))x.checked=true;", "await load();for(const x of $('sprints').querySelectorAll('input'))x.checked=!hub.closedSprint(x.parentElement.textContent)&&x.value!==NONE;")
s=s.replace("    let failure;", "    let failure,skipped=false;")
s=s.replace("      $('attach-report').checked=job.attach;await run();", "      if(!selected().length){skipped=true;message('没有有效 Sprint（已排除 CLOSED 和未分配项），本次跳过。');return;}$('attach-report').checked=job.attach;await run();")
s=s.replace("    if(failure)throw failure;", "    if(failure)throw failure;if(skipped)return;")


# Scoped presentation changes; workflow and counts remain unchanged.
t=t.replace("color:#d1242f;font-weight:700", "color:white;background:#fa3f21;padding:1px 3px;font-weight:700")
t=t.replace("color:#b58100;font-weight:700;background:#fff7bd", "color:#181717;font-weight:700;background:#d3ff27")
def analysis_colors(code):
    return code.replace(".className='delta';", ".style.cssText='font-weight:700;color:'+(delta>0?'#d13438':delta<0?'#0052cc':'inherit');").replace('font-weight:700;background:#eaf1ff','font-weight:700').replace("if(j===3&&Number(v)>0)td.style.color='#d13438';", "if(j===3)td.style.color=Number(v)>0?'#d13438':Number(v)<0?'#0052cc':'inherit';")
s=analysis_colors(s);epic=analysis_colors(epic)

# Kanban is standalone: reuse only the pure current-query parser and workflow order.
pristine=(root/'src/sprint.user.js').read_text()
a=pristine.index('  function pageQuery(');b=pristine.index('  function ',a+12)
kanban=(root/'src/kanban-theme.js').read_text()+'\n'+(root/'src/kanban-core.js').read_text()+'\n'+(root/'src/kanban-visuals.js').read_text()+'\n'+(root/'src/kanban-report.js').read_text()+'\n'+(root/'src/kanban-notify.js').read_text()+'\n'+(root/'src/kanban.js').read_text().replace('__KANBAN_STATUS_ORDER__',json.dumps(status_names,ensure_ascii=False)).replace('__KANBAN_QUERY_HELPER__',pristine[a:b])
(root/'jiraMonitor.user.js').write_text(header+hub+t+'\n'+s+'\n'+epic+'\n'+kanban+'\nhub.startScheduled();hub.startBrowserScheduler();\n})();\n')
