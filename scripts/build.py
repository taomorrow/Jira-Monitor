from pathlib import Path
root=Path(__file__).resolve().parents[1]
t=(root/'src/timeout.user.js').read_text()
s=(root/'src/sprint.user.js').read_text()
header=t[:t.index('(function ()')].replace('5.5.4','6.0.0').replace('// @description  详情自动分析、总览手动批量扫描；统一DEV/DCT、周五阈值、Excel和Teams通知','// @description  超时预警与 Sprint Analysis；统一面板、按项目共用 Teams 和邮件配置')
header=header.replace('// @connect      logic.azure.com','// @connect      logic.azure.com\n// @connect      api.powerautomate.com')
header=header.replace('// @grant        GM_setValue','// @grant        GM_deleteValue\n// @grant        GM_setValue')
t=t[t.index('(function ()'):].replace('5.5.4','6.0.0')
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
hub=r'''
(function(){
'use strict';
if(window.top!==window.self)return;
if(document.getElementById('jira-monitor-hub'))return;
const host=document.createElement('div');host.id='jira-monitor-hub';document.documentElement.append(host);
const root=host.attachShadow({mode:'open'});
const style=document.createElement('style');style.textContent=`:host{font:14px Arial;color:#172b4d}button{font:inherit;cursor:pointer;padding:8px 12px;margin:4px;border:1px solid #c9d3e0;border-radius:6px;background:white;color:#172b4d}button[aria-selected=true]{background:#0052cc;color:white}#launcher{position:fixed;right:24px;bottom:20px;background:#0052cc;color:white;z-index:2147483646}#shell{position:fixed;inset:4vh 3vw;background:#f7f9fc;border:2px solid #0052cc;border-radius:12px;z-index:2147483646;overflow:auto;box-shadow:0 12px 60px #091e4260}header{position:sticky;top:0;background:#fff;padding:10px;z-index:1;border-bottom:1px solid #ddd;display:flex;align-items:center;flex-wrap:wrap}strong{margin-right:18px}section{padding:12px}[hidden]{display:none!important}`;root.append(style);
function el(tag,text,parent=root){const node=document.createElement(tag);if(text)node.textContent=text;parent.append(node);return node;}
const launcher=el('button','Jira Monitor');launcher.id='launcher';
const shell=el('div');shell.id='shell';shell.hidden=true;
const header=el('header',null,shell);el('strong','Jira Monitor v6.0.0',header);
const timeoutTab=el('button','超时预警',header),sprintTab=el('button','Sprint Analysis',header),config=el('button','共享 Teams / 邮件配置',header),close=el('button','关闭',header);
const timeout=el('section',null,shell),sprint=el('section',null,shell);sprint.hidden=true;
const hub={timeout,sprint,autoDetail:false,show(which='timeout'){shell.hidden=false;timeout.hidden=which!=='timeout';sprint.hidden=which!=='sprint';timeoutTab.setAttribute('aria-selected',String(which==='timeout'));sprintTab.setAttribute('aria-selected',String(which==='sprint'));},hide(){shell.hidden=true;launcher.focus();}};
launcher.onclick=()=>hub.show();timeoutTab.onclick=()=>hub.show('timeout');sprintTab.onclick=()=>hub.show('sprint');config.onclick=()=>hub.configure?.();close.onclick=()=>hub.hide();
root.addEventListener('keydown',e=>{if(e.key==='Escape')hub.hide();});
if(typeof GM_registerMenuCommand==='function')GM_registerMenuCommand('Jira Monitor：打开统一面板',()=>hub.show());
'''
# Allow original auto-detail behavior as a visible opt-in, persisted with the unified script.
hub += s[s.index('  function validateTeamsUrl(value){'):s.index('  function teamsResponseInfo')]+'hub.validateWebhook=validateTeamsUrl;\n'
hub += "const autoLabel=el('label',null,header),auto=el('input',null,autoLabel);auto.type='checkbox';auto.checked=GM_getValue('jira-monitor-auto-detail',false)===true;hub.autoDetail=auto.checked;el('span','详情自动分析',autoLabel);auto.onchange=()=>{hub.autoDetail=auto.checked;GM_setValue('jira-monitor-auto-detail',auto.checked);};\n"
(root/'jiraMonitor.user.js').write_text(header+hub+t+'\n'+s+'\n})();\n')
