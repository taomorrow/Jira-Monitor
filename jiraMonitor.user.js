// ==UserScript==
// @name         Jira Monitor
// @namespace    https://github.com/taomorrow/Jira
// @version      6.4.0
// @description  超时预警与 Sprint Analysis；统一面板、按项目共用 Teams 和邮件配置
// @match        https://jira.xpaas.lenovo.com/*
// @sandbox      DOM
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_setValue
// @connect      api.powerplatform.com
// @connect      logic.azure.com
// @connect      api.powerautomate.com
// @homepageURL  https://github.com/taomorrow/Jira-Monitor
// @supportURL   https://github.com/taomorrow/Jira-Monitor/issues
// @downloadURL  https://raw.githubusercontent.com/taomorrow/Jira-Monitor/main/jiraMonitor.user.js
// @updateURL    https://raw.githubusercontent.com/taomorrow/Jira-Monitor/main/jiraMonitor.user.js
// @run-at       document-idle
// @noframes
// ==/UserScript==
(function(){
'use strict';
if(window.top!==window.self||document.getElementById('jira-monitor-hub'))return;
const host=document.createElement('div');host.id='jira-monitor-hub';document.documentElement.append(host);
const root=host.attachShadow({mode:'open'});
const style=document.createElement('style');style.textContent=`
:host{font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:#24334d}*{box-sizing:border-box}button,input,textarea,select{font:inherit}button{cursor:pointer;border:0}button:focus-visible{outline:3px solid #93b9ff;outline-offset:2px}[hidden]{display:none!important}
#launcher{position:fixed;right:24px;bottom:20px;background:#245de8;color:white;padding:10px 15px;border-radius:16px;box-shadow:0 6px 24px #245de840;border:1px solid #ffffff50;display:flex;align-items:center;gap:9px;touch-action:none;user-select:none;cursor:grab;z-index:2147483646;font-weight:600}
#shell{position:fixed;display:flex;flex-direction:column;background:#f6f8fc;border:1px solid #dbe3f0;border-radius:16px;z-index:2147483646;overflow:hidden;box-shadow:0 20px 70px #1e355b38;min-width:0}
#titlebar{height:54px;flex-shrink:0;display:flex;align-items:center;gap:10px;padding:0 18px;background:white;border-bottom:1px solid #e8edf5;cursor:move;touch-action:none;user-select:none}#brand-icon{background:#245de8;color:white;border-radius:9px;padding:3px 8px;font-weight:800}#version{font-size:11px;color:#8290a6}#window-close,#detail-close{margin-left:auto;color:#dc3545;background:#fff1f2;border-radius:8px;width:30px;height:30px;line-height:30px;padding:0;font-size:15px}#window-close:hover,#detail-close:hover{background:#ffe1e5}
#workspace{display:flex;flex:1;min-height:0}nav{width:166px;flex-shrink:0;padding:18px 10px;background:#fff;border-right:1px solid #e8edf5}nav small{display:block;color:#95a0b2;font-size:10px;letter-spacing:1.6px;margin:2px 12px 12px}nav button{display:block;width:100%;text-align:left;padding:11px 12px;margin:4px 0;background:transparent;color:#64738b;border-radius:9px;font-weight:500;white-space:nowrap}nav button:hover{background:#f4f7fc}nav button[aria-selected=true]{background:#eaf0ff;color:#245de8;font-weight:700;box-shadow:inset 3px 0 #245de8}
main{position:relative;isolation:isolate;flex:1;min-width:0;min-height:0;overflow:hidden}main>section{height:100%;overflow:auto;padding:18px}#timeout-view{padding:0}#resize-grip{z-index:5;position:absolute;bottom:0;right:0;width:22px;height:22px;cursor:nwse-resize;touch-action:none;background:repeating-linear-gradient(135deg,transparent 0 3px,#acbbd3 3px 4px,transparent 4px 6px);clip-path:polygon(100% 0,100% 100%,0 100%);opacity:.65}
#detail-popup{position:fixed;bottom:76px;right:24px;width:min(420px,calc(100vw - 32px));z-index:2147483647;background:white;border:1px solid #dae3f1;border-radius:14px;box-shadow:0 12px 42px #243c6430;overflow:hidden}#detail-header{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #edf0f6;font-weight:600}#detail-header span{font-size:11px;color:#8694aa;margin-left:8px}#detail-content{max-height:min(480px,65vh);overflow:auto}
#settings-view h2{font-size:21px;margin:0 0 6px}#settings-view p{color:#718098}#settings-view button{border:1px solid #dbe3f0;border-radius:7px;padding:7px 9px;white-space:nowrap;margin:5px 5px 5px 0;background:white;color:#425778}#settings-view [data-project-save]{background:#245de8;border-color:#245de8;color:white}#settings-view input:not([type=checkbox]),#settings-view textarea{border:1px solid #dce4f0;border-radius:6px;padding:8px;max-width:100%;background:#fbfcff}#settings-view td{padding:10px 6px;vertical-align:top;border-bottom:1px solid #edf1f7}#settings-view th{padding:10px 6px;text-align:left;font-size:11px;color:#718098;background:#f0f4fb}#settings-view table{table-layout:fixed}#settings-view th:first-child{width:90px}#settings-view th:nth-child(4){width:76px}#settings-view th:last-child{width:76px}#settings-view [data-auto-setting]{display:flex;align-items:center;gap:8px;padding:14px;background:#edf3ff;border-radius:10px;margin:16px 0;color:#245de8}
`;root.append(style);
function el(tag,text,parent=root){const n=document.createElement(tag);if(text)n.textContent=text;parent.append(n);return n;}
const launcher=el('button');launcher.id='launcher';launcher.title='点击打开 · 拖动移动位置';el('span','✦',launcher).style.cssText='font-size:19px;line-height:1';el('span','Jira Monitor',launcher);
let launcherDragged=false;const savedLauncher=GM_getValue('jira-monitor-launcher-v1',null);
function placeLauncher(point){const width=launcher.offsetWidth||132,height=launcher.offsetHeight||42;const left=Math.max(8,Math.min(point.left,innerWidth-width-8)),top=Math.max(8,Math.min(point.top,innerHeight-height-8));Object.assign(launcher.style,{left:left+'px',top:top+'px',right:'auto',bottom:'auto'});return {left,top};}
if(savedLauncher)placeLauncher(savedLauncher);
launcher.addEventListener('pointerdown',event=>{if(event.button!==0)return;const box=launcher.getBoundingClientRect(),startX=event.clientX,startY=event.clientY;launcherDragged=false;let point={left:box.left,top:box.top};launcher.setPointerCapture?.(event.pointerId);const move=e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>4)launcherDragged=true;if(launcherDragged)point=placeLauncher({left:box.left+e.clientX-startX,top:box.top+e.clientY-startY});};const end=()=>{launcher.removeEventListener('pointermove',move);launcher.removeEventListener('pointerup',end);launcher.removeEventListener('pointercancel',end);if(launcherDragged)GM_setValue('jira-monitor-launcher-v1',point);};launcher.addEventListener('pointermove',move);launcher.addEventListener('pointerup',end);launcher.addEventListener('pointercancel',end);});
addEventListener('resize',()=>{if(launcher.style.left)placeLauncher({left:parseFloat(launcher.style.left),top:parseFloat(launcher.style.top)});});
const shell=el('div');shell.id='shell';shell.hidden=true;shell.setAttribute('role','dialog');shell.setAttribute('aria-label','Jira Monitor');
const header=el('header',null,shell);header.id='titlebar';el('span','J',header).id='brand-icon';el('strong','Jira Monitor',header);el('span','v6.4.0',header).id='version';
const close=el('button','❌',header);close.id='window-close';close.setAttribute('aria-label','关闭 Jira Monitor');
const workspace=el('div',null,shell);workspace.id='workspace';const nav=el('nav',null,workspace);nav.setAttribute('aria-label','功能菜单');el('small','WORKSPACE',nav);
const timeoutTab=el('button','◷  超时预警',nav),sprintTab=el('button','▥  Sprint Analysis',nav),config=el('button','⚙  配置中心',nav);timeoutTab.id='nav-timeout';sprintTab.id='nav-sprint';config.id='nav-settings';
const content=el('main',null,workspace),timeout=el('section',null,content),sprint=el('section',null,content),settings=el('section',null,content);timeout.id='timeout-view';sprint.id='sprint-view';settings.id='settings-view';sprint.hidden=settings.hidden=true;
const grip=el('div',null,shell);grip.id='resize-grip';grip.setAttribute('aria-label','拖动调整窗口大小');
const detail=el('div');detail.id='detail-popup';detail.hidden=true;const detailHeader=el('div',null,detail);detailHeader.id='detail-header';el('strong','◷  详情分析',detailHeader);el('span','独立浮窗',detailHeader);const detailClose=el('button','❌',detailHeader);detailClose.id='detail-close';detailClose.setAttribute('aria-label','关闭详情分析');const detailContent=el('div',null,detail);detailContent.id='detail-content';
let geometry=GM_getValue('jira-monitor-window-v1',{}),activeView='timeout',dismissedDetail='';
function fit(g){const maxW=Math.max(1,innerWidth-24),maxH=Math.max(1,innerHeight-24);const width=Math.max(Math.min(620,maxW),Math.min(Number(g.width)||960,maxW)),height=Math.max(Math.min(360,maxH),Math.min(Number(g.height)||620,maxH));return {width,height,left:Math.max(12,Math.min(Number.isFinite(g.left)?g.left:(innerWidth-width)/2,innerWidth-width-12)),top:Math.max(12,Math.min(Number.isFinite(g.top)?g.top:(innerHeight-height)/2,innerHeight-height-12))};}
function layout(){geometry=fit(geometry);Object.assign(shell.style,{width:geometry.width+'px',height:geometry.height+'px',left:geometry.left+'px',top:geometry.top+'px'});}layout();
function drag(node,resizing){node.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;e.preventDefault();const start={...geometry},x=e.clientX,y=e.clientY;node.setPointerCapture?.(e.pointerId);const move=event=>{geometry=resizing?{...start,width:start.width+event.clientX-x,height:start.height+event.clientY-y}:{...start,left:start.left+event.clientX-x,top:start.top+event.clientY-y};layout();};const end=()=>{node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',end);node.removeEventListener('pointercancel',end);GM_setValue('jira-monitor-window-v1',geometry);};node.addEventListener('pointermove',move);node.addEventListener('pointerup',end);node.addEventListener('pointercancel',end);});}drag(header,false);drag(grip,true);addEventListener('resize',layout);
const hub={timeout,sprint,settings,detail:detailContent,autoDetail:GM_getValue('jira-monitor-auto-detail',false)===true,
 show(which='timeout'){if(which==='timeout'&&/^\/browse\//i.test(location.pathname)){shell.hidden=true;return;}activeView=which;shell.hidden=false;timeout.hidden=which!=='timeout';sprint.hidden=which!=='sprint';settings.hidden=which!=='settings';[[timeoutTab,'timeout'],[sprintTab,'sprint'],[config,'settings']].forEach(([b,key])=>b.setAttribute('aria-selected',String(which===key)));layout();},
 hide(){shell.hidden=true;launcher.focus();},syncRoute(){if(/^\/browse\//i.test(location.pathname)&&activeView==='timeout')shell.hidden=true;},syncDetail(){detail.hidden=!hub.autoDetail||!/^\/browse\//i.test(location.pathname)||dismissedDetail===location.pathname;},
 openDetail(){dismissedDetail='';hub.syncDetail();},setAuto(value){hub.autoDetail=value;GM_setValue('jira-monitor-auto-detail',value);if(value){dismissedDetail='';hub.startDetail?.();}else hub.stopDetail?.();hub.syncDetail();},
 refreshSettings(){hub.configure?.();}};
launcher.onclick=()=>{if(launcherDragged){launcherDragged=false;return;}hub.show();};timeoutTab.onclick=()=>hub.show();sprintTab.onclick=()=>hub.show('sprint');config.onclick=()=>hub.configure?.();close.onclick=()=>hub.hide();detailClose.onclick=()=>{dismissedDetail=location.pathname;hub.syncDetail();};
root.addEventListener('keydown',e=>{if(e.key==='Escape')hub.hide();});
if(typeof GM_registerMenuCommand==='function')GM_registerMenuCommand('Jira Monitor：打开统一面板',()=>hub.show());
  function validateTeamsUrl(value){
    let u;try{u=new URL(String(value).trim().replace(/\\&/g,'&').replace(/&amp;/g,'&'));}catch{throw new Error('请输入有效的 Teams Workflows HTTPS Webhook 地址。');}
    const allowed=['logic.azure.com','api.powerplatform.com','api.powerautomate.com'];
    if(u.protocol!=='https:'||u.username||u.password||u.hash||u.port||!allowed.some(h=>u.hostname.endsWith('.'+h))||!u.pathname.includes('/workflows/'))throw new Error('仅支持微软 Teams Workflows 的 HTTPS 地址（logic.azure.com / api.powerplatform.com / api.powerautomate.com），不支持旧版 Connector。');
    return u.href;
  }
hub.validateWebhook=validateTeamsUrl;
// Inline styles and real tables keep the report readable in Outlook and Teams email actions.
hub.escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
hub.emailCard=({title,subtitle,sections,meta,url})=>{
 const esc=hub.escapeHtml;
 const cards=sections.map(section=>`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border:1px solid #e1e7f0;border-radius:10px;background:#ffffff"><tr><td style="padding:18px 20px 10px;font-size:16px;font-weight:700;color:#24334d">${esc(section.title)}</td></tr><tr><td style="padding:0 20px 18px"><table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px;line-height:1.6"><thead><tr>${section.headers.map((h,i)=>`<th align="${i?'center':'left'}" style="padding:10px 8px;background:#f1f5fc;color:#718098;font-size:12px;border-bottom:1px solid #e3eaf4">${esc(h)}</th>`).join('')}</tr></thead><tbody>${section.rows.map((row,index)=>`<tr>${row.map((v,i)=>`<td align="${i?'center':'left'}" style="padding:11px 8px;border-bottom:1px solid #edf1f7;${section.total&&index===section.rows.length-1?'font-weight:700;background:#edf3ff;':''}color:${section.deltaColumn===i&&Number(v)>0?'#d13438':'#24334d'}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></td></tr></table>`).join('');
 return `<div style="background:#f2f5fb;padding:24px 12px;font-family:Arial,'Microsoft YaHei',sans-serif;color:#24334d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;margin:0 auto"><tr><td style="background:#245de8;padding:22px 24px;border-radius:12px 12px 0 0;color:white"><div style="font-size:11px;letter-spacing:2px;color:#dbe6ff">JIRA MONITOR</div><h1 style="font-size:23px;line-height:1.4;margin:8px 0">${esc(title)}</h1><div style="font-size:13px;line-height:1.7;color:#e1eaff">${esc(subtitle)}</div></td></tr><tr><td style="padding:22px;background:#ffffff;border:1px solid #e1e7f0;border-top:0;border-radius:0 0 12px 12px">${cards}<a href="${esc(url)}" style="display:inline-block;background:#245de8;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;padding:11px 18px;border-radius:7px">打开 Jira 查看详情 →</a><div style="font-size:11px;line-height:1.8;color:#8793a8;margin-top:18px;word-break:break-all">${esc(meta)}</div></td></tr><tr><td style="padding:14px;text-align:center;color:#97a2b5;font-size:10px">Jira Monitor · 项目运营报告</td></tr></table></div>`;
};
function initTimeout(detailOnly){
  'use strict';
  // ================= 只需修改这里的规则配置 =================
  const CONFIG = {
    fridayAdjustment: {enabled:true, firstMinute:630, secondMinute:1020, firstSubtractDays:1, subtractDays:2}, // 本地周五10:30起减1天，17:00起减2天
    // 即将超期 自动通知；收件人由此 Webhook 的个人聊天工作流决定。
    autoNotifyApproaching: false, // false：只手动发送
    notificationCooldownHours: 24, // 同一工单24小时内最多提交一次（仅自动发送；手动发送不限次数）
    mentionAssignee: true, // Jira 返回邮箱或下方映射存在时，构造真正的 @提及
    teamsMentionUsers: {}, // 'jira账号': {id:'Teams登录邮箱或Entra用户ID', name:'姓名'}
    teamsWebhookUrl: '',

    // minDays：即将超期起点（含）；maxDays：已超期起点（含）。
    // 天数<下限符合预期，下限≤天数<上限即将超期，天数≥上限已超期；1天=24小时。
    // 批量自动提醒针对即将超期/已超期；手动发送不受冷却限制。
    rules: [
      {name:'DEV', description:'In Progress-Ready For Test', minDays:4, maxDays:5, currentStatuses:['In Progress'],
       startStatus:'In Progress', forbiddenAfterStart:['Completed','Complete','SIT','Ready For UAT','UAT','Ready For Deploy','Deployed','Done','Cancelled']},
      {name:'DCT', description:'In Progress-( / Ready For Test / Testing)-Complete', minDays:13, maxDays:14, currentStatuses:['In Progress','Ready For Test','Testing'],
       startStatus:'In Progress', forbiddenAfterStart:['Completed','Complete','SIT','Ready For UAT','UAT','Ready For Deploy','Deployed','Done','Cancelled']},
    ],
    detailTimeoutSeconds: 90,
    scanScope: 'all', // all：全部筛选结果；page：当前分页
    panelHeightPx: 520,
    panelBottomPx: 68, // 为页面右下角的翻页按钮留出空间
  };
  // ================= 规则配置结束 =================
  const DEFAULT_RULES=JSON.parse(JSON.stringify(CONFIG.rules));
  if (window.top !== window.self) return;
  const isDashboard=()=>/^\/secure\/Dashboard\.jspa$/i.test(location.pathname);

  const badge=document.createElement('div');
  badge.textContent='Jira Monitor v6.4.0 已注入，正在初始化…';
  badge.style.cssText='position:fixed!important;top:8px!important;right:12px!important;z-index:2147483647!important;background:#0052cc!important;color:white!important;padding:8px!important;font:13px Arial!important;max-width:80vw!important;white-space:pre-wrap!important';
  (document.body||document.documentElement).append(badge);
  function report(error) {
    const text='Jira Monitor v6.4.0 启动失败：'+(error?.message||error);
    badge.textContent=text;badge.style.background='#ae2a19';
    (document.body||document.documentElement).append(badge);
    const box=document.createElement('div');box.textContent=text+'。请检查代码开头 CONFIG 配置。';
    box.style.cssText='position:fixed!important;right:16px!important;top:60px!important;z-index:2147483647!important;background:white!important;color:#ae2a19!important;border:2px solid #ae2a19!important;padding:18px!important;max-width:450px!important;font:14px Arial!important';
    document.documentElement.append(box);console.error('[Jira Monitor]',error);
  }
  try {

  // Public release: notification credentials stay in this user's userscript storage.
  if(window.top!==window.self)return;
  const WEBHOOK_SETTING='jira-monitor-webhook';
  const AUTO_SETTING='jira-monitor-auto-notify';
  try{
    // 优先读取油猴持久化配置；正常升级不写入或清空已有地址。
    const savedWebhook=GM_getValue(WEBHOOK_SETTING,null);
    if(savedWebhook!==null)CONFIG.teamsWebhookUrl=savedWebhook;
    else if(supportedWebhook(CONFIG.teamsWebhookUrl))GM_setValue(WEBHOOK_SETTING,CONFIG.teamsWebhookUrl); // 保存旧版手改 CONFIG 的地址，供以后升级使用。
    CONFIG.autoNotifyApproaching=GM_getValue(AUTO_SETTING,CONFIG.autoNotifyApproaching)===true;
  }catch{}
  function supportedWebhook(value){
    try{hub.validateWebhook(value);return true;}catch{return false;}
  }
  const EMAIL_SETTING='jira-monitor-email-v1';
  function parseEmailRecipients(value){
    const entries=String(value||'').split(/[\s,;，；]+/).filter(Boolean),seen=new Set(),result=[];
    for(const email of entries){
      if(!/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i.test(email))throw Error('邮箱格式无效：'+email);
      const key=email.toLowerCase();if(!seen.has(key)){seen.add(key);result.push(email);}
    }
    return result;
  }
  function emailConfig(){
    const value=GM_getValue(EMAIL_SETTING,{enabled:false,recipients:[]});
    return {enabled:value?.enabled===true,recipients:parseEmailRecipients(Array.isArray(value?.recipients)?value.recipients.join(';'):'')};
  }
  function emailPayload(current,rules,text,jiraUrl,target){
    const settings={enabled:!!target?.recipients?.length,recipients:target?.recipients||[]};
    if(!settings.enabled)return {enabled:false};
    if(!settings.recipients.length)throw Error('邮件已启用但收件人为空，请打开邮件设置');
    const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return {enabled:true,recipients:settings.recipients,to:settings.recipients.join(';'),subject:'[Jira Monitor] '+String(current.key).replace(/[\r\n]/g,'')+' · '+rules.map(r=>r.name+' '+r.sla).join(' / '),bodyText:text,bodyHtml:hub.emailCard({title:current.key+' · 超时预警',subtitle:current.summary+' · 负责人：'+(current.assignee||'未分配'),sections:[{title:'规则分析',headers:['规则','结果','时长（天）'],rows:rules.map(r=>[r.name,r.sla,r.days.toFixed(2)])}],meta:'扫描时间：'+beijingTime(current.checkedAt),url:jiraUrl})};
  }
  const PROJECT_SETTING='jira-monitor-projects-v1';
  const projectKeyOf=key=>String(key||'').trim().match(/^([A-Z][A-Z0-9_]*)-\d+$/i)?.[1]?.toUpperCase()||'';
  function projectConfigs(){if(typeof GM_getValue!=='function')return [];const data=GM_getValue(PROJECT_SETTING,[]);if(!Array.isArray(data))throw Error('项目配置格式无效，请打开配置中心');return data;}
  function projectTarget(key){const projectKey=projectKeyOf(key);const rows=projectConfigs().filter(r=>r.projectKey===projectKey);if(rows.length>1)throw Error(projectKey+' 项目配置重复');return rows[0]?{...rows[0],projectKey}:null;}
  function configureCenter(){
    hub.show('settings');hub.settings.replaceChildren();const overlay={remove:()=>hub.show('timeout')},box=hub.settings;
    const add=(tag,text,attr,parent=box)=>{const x=document.createElement(tag);if(text)x.textContent=text;if(attr)x.setAttribute(attr,'');parent.append(x);return x;};
    add('h2','配置中心');
    const autoLabel=add('label',null,'data-auto-setting'),auto=add('input',null,'data-auto-detail',autoLabel);auto.type='checkbox';auto.checked=hub.autoDetail;add('span','详情自动分析 · 在 Jira 详情页右下角独立弹出',null,autoLabel);auto.onchange=()=>hub.setAuto(auto.checked);

    add('p','项目 Key 取工单编号横杠前的值，如 CSP-3909 → CSP。未配置项目只统计、不发送；邮件通过该项目 Webhook 对应工作流发送。');
    const table=add('table',null,'data-project-table');table.style.cssText='width:100%;border-collapse:collapse';
    const head=add('tr',null,null,table);for(const label of ['项目 Key','Teams Webhook','Email 收件人（多个用分号）','批量自动通知','操作'])add('th',label,null,head);
    const rows=[];
    function row(value={}){
      const tr=add('tr',null,'data-project-row',table),key=add('input',null,'data-project-key',add('td',null,null,tr));key.value=value.projectKey||'';key.style.width='85px';
      const webhook=add('textarea',null,'data-project-hook',add('td',null,null,tr));webhook.value=value.webhook||'';webhook.rows=3;webhook.style.width='95%';
      const emails=add('textarea',null,'data-project-emails',add('td',null,null,tr));emails.value=(value.recipients||[]).join(';');emails.rows=3;emails.style.width='95%';
      const auto=add('input',null,'data-project-auto',add('td',null,null,tr));auto.type='checkbox';auto.checked=value.autoNotify===true;
      const remove=add('button','删除',null,add('td',null,null,tr)),entry={tr,key,webhook,emails,auto,deleted:false};rows.push(entry);remove.onclick=()=>{entry.deleted=true;tr.hidden=true;};return entry;
    }
    const stored=projectConfigs();if(stored.length)stored.forEach(row);else{row({projectKey:'CSP'});row({projectKey:'OSPIT'});}
    add('button','新增项目','data-project-add').onclick=()=>row();
    const legacyKey=add('input',null,'data-legacy-key');legacyKey.placeholder='要导入旧设置的项目 Key';
    const status=add('p',null,'data-project-status');
    add('button','复制旧设置到项目','data-project-import').onclick=()=>{try{
      const key=legacyKey.value.trim().toUpperCase();if(!/^[A-Z][A-Z0-9_]*$/.test(key))throw Error('请填写项目 Key');
      const target=rows.find(r=>!r.deleted&&r.key.value.trim().toUpperCase()===key)||row({projectKey:key});
      const oldMail=emailConfig();target.webhook.value=CONFIG.teamsWebhookUrl||'';target.emails.value=(oldMail.enabled?oldMail.recipients:[]).join(';');target.auto.checked=CONFIG.autoNotifyApproaching;
      status.textContent='旧设置已复制到 '+key+'，请检查后保存';
    }catch(error){status.textContent=safeError(error);}};
    add('button','保存项目配置','data-project-save').onclick=()=>{try{
      const result=[],seen=new Set();
      for(const r of rows.filter(r=>!r.deleted)){
        const key=r.key.value.trim().toUpperCase(),webhook=r.webhook.value.trim(),recipients=parseEmailRecipients(r.emails.value);
        if(!key&&!webhook&&!recipients.length&&!r.auto.checked)continue;
        if(!/^[A-Z][A-Z0-9_]*$/.test(key))throw Error('项目 Key 无效：'+key);
        if(seen.has(key))throw Error('项目 Key 重复：'+key);seen.add(key);
        if(webhook&&!supportedWebhook(webhook))throw Error(key+' Webhook 地址不支持');
        if((r.auto.checked||recipients.length)&&!webhook)throw Error(key+' 自动通知/邮件需要配置 Webhook');
        result.push({projectKey:key,webhook,recipients,autoNotify:r.auto.checked});
      }
      GM_setValue(PROJECT_SETTING,result);if(JSON.stringify(GM_getValue(PROJECT_SETTING,null))!==JSON.stringify(result))throw Error('存储回读失败');
      render();status.style.color='#00875a';status.textContent='已保存并验证 '+result.length+' 个项目，本页立即生效';
    }catch(error){status.style.color='#ae2a19';status.textContent='保存失败：'+safeError(error);}};
    add('button','连接诊断（HEAD，不推送）','data-project-diagnose').onclick=()=>{
      const key=legacyKey.value.trim().toUpperCase(),target=projectConfigs().find(r=>r.projectKey===key);
      if(!target?.webhook){status.textContent='请在左侧输入框填写已保存的项目 Key，诊断其 Webhook';return;}
      status.textContent='正在进行 HEAD 连接诊断，未发送消息…';
      GM_xmlhttpRequest({method:'HEAD',url:target.webhook,anonymous:true,redirect:'error',timeout:15000,
        onload:r=>{status.textContent='HEAD HTTP '+r.status+'；仅验证网络可达性，不代表卡片或邮件投递成功。未发送消息。';},
        onerror:()=>{status.textContent='HEAD 网络失败，请检查 VPN 和油猴域名权限。未发送消息。';},
        ontimeout:()=>{status.textContent='HEAD 诊断超时。未发送消息。';}});
    };
    add('hr');add('button','统计规则设置','data-center-rules').onclick=configureRules;
    add('button','启动诊断').onclick=()=>alert(badge.textContent+'\n页面：'+location.href);
  }
  if(!detailOnly&&typeof GM_registerMenuCommand==='function')GM_registerMenuCommand('Jira Monitor：配置中心',configureCenter);
  const RULE_SETTING='jira-monitor-rules-v1';
  const parseStatuses=value=>[...new Set(String(value||'').split(/[\n,;，；]+/).map(x=>x.trim()).filter(Boolean))];
  function configureRules(){
    const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0005;display:flex;align-items:center;justify-content:center';
    const shadow=overlay.attachShadow({mode:'open'}),box=document.createElement('div');box.style.cssText='background:white;color:#172b4d;padding:20px;border-radius:8px;width:760px;max-width:92vw;max-height:85vh;overflow:auto;font:14px Arial';shadow.append(box);
    const add=(tag,text,attr,parent=box)=>{const x=document.createElement(tag);if(text)x.textContent=text;if(attr)x.setAttribute(attr,'');parent.append(x);return x;};
    box.style.position='relative';
    const closeRule=add('button','❌','data-rule-close');closeRule.setAttribute('aria-label','关闭统计规则');closeRule.style.cssText='position:sticky;top:0;float:right;margin:0 0 10px 12px;color:#dc3545;background:#fff1f2;border:0;border-radius:8px;width:30px;height:30px;cursor:pointer;z-index:1';closeRule.onclick=()=>overlay.remove();
    add('b','统计规则设置');add('p','全项目共用；阈值单位为自然天，支持0.01天（14.4分钟）。下限≤天数＜上限：即将超期；天数≥上限：已超期。按本地周五时间：10:30前不提前，10:30起提前1天，17:00起提前2天。保存用于新扫描，已有结果及运行/暂停中的任务保留原规则。');
    const rows=[];
    function build(rule){
      const group=add('fieldset',null,'data-rule-row');group.style.marginBottom='12px';add('legend',rule.name,null,group);const fields={};
      for(const [key,label,multi] of [['name','规则名称'],['description','流程说明'],['minDays','预警下限（含）'],['maxDays','超期上限（含）'],['currentStatuses','当前状态范围（每行一个或用逗号/分号分隔）',true],['startStatus','起始状态（取首次进入的时间）'],['forbiddenAfterStart','起点后排除状态（可留空；每行一个或用逗号/分号分隔）',true]]){
        add('label',label,null,group).style.cssText='display:block;margin-top:8px';const input=add(multi?'textarea':'input',null,'data-rule-'+key,group);input.style.cssText='width:100%;box-sizing:border-box';
        if(key==='minDays'||key==='maxDays'){input.type='number';input.min='0';input.step='0.01';}
        if(multi)input.rows=3;
        input.value=Array.isArray(rule[key])?rule[key].join('\n'):String(rule[key]??'');fields[key]=input;
      }rows.push(fields);
    }
    CONFIG.rules.forEach(build);
    const status=add('p',null,'data-rule-status');
    add('button','保存规则','data-rule-save').onclick=()=>{try{
      const rules=rows.map(fields=>{
        if(!fields.minDays.value.trim()||!fields.maxDays.value.trim())throw Error('阈值不能为空');
        return {name:fields.name.value.trim(),description:fields.description.value.trim(),minDays:Number(fields.minDays.value),maxDays:Number(fields.maxDays.value),currentStatuses:parseStatuses(fields.currentStatuses.value),startStatus:fields.startStatus.value.trim(),forbiddenAfterStart:parseStatuses(fields.forbiddenAfterStart.value)};
      });validateRules(rules);
      GM_setValue(RULE_SETTING,rules);if(JSON.stringify(GM_getValue(RULE_SETTING,null))!==JSON.stringify(rules))throw Error('存储回读失败');
      CONFIG.rules=rules;render();status.style.color='#00875a';status.textContent='规则已保存并验证。请开始新扫描或重新分析；已有结果不自动重算。';
    }catch(error){status.style.color='#ae2a19';status.textContent='保存失败：'+safeError(error);}};
    add('button','填入默认规则（保存后生效）','data-rule-default').onclick=()=>{
      if(rows.length!==DEFAULT_RULES.length){status.textContent='当前规则数量与默认配置不一致，请检查';return;}
      rows.forEach((fields,i)=>{for(const key of Object.keys(fields)){const value=DEFAULT_RULES[i][key];fields[key].value=Array.isArray(value)?value.join('\n'):String(value);}});status.textContent='已填入默认值，点击保存规则后生效';
    };
    (document.body||document.documentElement).append(overlay);
  }
  const norm=s=>String(s||'').replace(/[_\s-]+/g,' ').trim().toUpperCase();
  function validateRules(rules){
    const names=new Set();
    if(!Array.isArray(rules)||!rules.length)throw new Error('至少配置一条规则');
    for(const r of rules){
      if(!r.name||names.has(r.name))throw new Error('规则名称必须唯一');names.add(r.name);
      if(!Number.isFinite(r.minDays)||!Number.isFinite(r.maxDays)||r.minDays<0||r.maxDays<=r.minDays)throw new Error(r.name+'：KPI 下限/上限无效，要求 0 ≤ 下限 < 上限');
      if(!Array.isArray(r.currentStatuses)||!r.currentStatuses.length||!r.startStatus||!Array.isArray(r.forbiddenAfterStart))throw new Error(r.name+'：状态配置无效');
    }
  }
  const dayText=n=>n===null?'':(n/86400).toFixed(2);
  function effectiveRule(rule,scanTime){
    const ms=typeof scanTime==='number'?scanTime:Date.parse(scanTime);
    const local=new Date(ms),friday=Number.isFinite(ms)&&local.getDay()===5;
    const adjustment=CONFIG.fridayAdjustment,minute=local.getHours()*60+local.getMinutes();
    const shift=adjustment?.enabled&&friday?(minute>=adjustment.secondMinute?adjustment.subtractDays:minute>=adjustment.firstMinute?adjustment.firstSubtractDays:0):0;
    return {...rule,minDays:Math.max(0,rule.minDays-shift),maxDays:Math.max(0,rule.maxDays-shift),fridayShiftDays:shift};
  }
  function resultRule(result,rule){
    if(Number.isFinite(result?.effectiveMinDays)&&Number.isFinite(result?.effectiveMaxDays))return {...rule,minDays:result.effectiveMinDays,maxDays:result.effectiveMaxDays};
    return result?.checkedAt?effectiveRule(rule,result.checkedAt):rule;
  }
  const ruleText=base=>`${base.name}｜即将超期：${base.minDays}≤天数＜${base.maxDays}；已超期：≥${base.maxDays}天；`;
  function panelDuration(result,rule){
    rule=resultRule(result,rule);
    if(!result||!Number.isFinite(result.seconds))return {level:'unknown',text:result?.status||'未读取到'};
    const days=result.seconds/86400,duration=dayText(result.seconds)+'天';
    if(days>=rule.maxDays){const excess=(days-rule.maxDays).toFixed(2);return {level:'overdue',text:duration+'（已超期 '+excess+' 天）'};}
    if(days>=rule.minDays&&days<rule.maxDays)return {level:'warning',text:duration+'（即将超期）'};
    return {level:'normal',text:duration+'（符合预期）'};
  }
  // 北京时间只用于表示同一时刻；计算使用绝对时间戳，不给 Duration 额外加8小时。
  function beijingTime(value){
    if(value===null||value===undefined||value==='')return '';
    const ms=typeof value==='number'?value:Date.parse(value);
    if(!Number.isFinite(ms))return '';
    return new Date(ms+8*3600000).toISOString().replace('T',' ').replace('Z',' +08:00');
  }
  function evaluateHistory(events,currentStatus,rules,now){
    // 按绝对时间升序，从完整历史选择首次起点；返工不重置计时。
    const sorted=[...events].sort((a,b)=>a.at-b.at||a.order-b.order);
    return rules.map(originalRule=>{
      const rule=effectiveRule(originalRule,now);
      const base={name:rule.name,seconds:null,currentStatus,checkedAt:new Date(now).toISOString(),effectiveMinDays:rule.minDays,effectiveMaxDays:rule.maxDays,fridayShiftDays:rule.fridayShiftDays};
      if(!rule.currentStatuses.map(norm).includes(norm(currentStatus)))return {...base,status:'不在统计范围',details:'当前状态：'+currentStatus};
      const index=sorted.findIndex(e=>norm(e.to)===norm(rule.startStatus));
      if(index<0)return {...base,status:'未发现起始记录',details:'History 中无进入 '+rule.startStatus+' 的记录'};
      const start=sorted[index];
      if(sorted.slice(index+1).some(e=>rule.forbiddenAfterStart.map(norm).includes(norm(e.to))))return {...base,status:'后续流程已发生',details:'首次进入 '+rule.startStatus+' 后存在配置的排除状态'};
      if(!Number.isFinite(start.at)||start.at>now)return {...base,status:'读取失败',details:'起始时间无效或晚于当前系统时间'};
      const elapsed=(now-start.at)/1000;
      return {...base,status:'已统计',seconds:elapsed,inRange:elapsed>=rule.minDays*86400&&elapsed<rule.maxDays*86400,startAt:new Date(start.at).toISOString(),details:'首次 New: '+rule.startStatus+'；当前系统时间减起始时间；来源：'+(start.source||'History REST 精确时间')};
    });
  }
  function makeXlsx(rows){
    const esc=v=>String(v??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const enc=new TextEncoder();
    const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><cols><col min="1" max="14" width="25" customWidth="1"/></cols><sheetData>'+rows.map((r,i)=>'<row r="'+(i+1)+'">'+r.values.map((v,j)=>{
      const c=String.fromCharCode(65+j)+(i+1),style=i>0&&(j===8||j===9)?({warning:5,overdue:6}[r.level]||4):({header:1,warning:2,overdue:3}[r.level]||0);
      return typeof v==='number'&&Number.isFinite(v)?`<c r="${c}" s="${style}"><v>${v}</v></c>`:`<c r="${c}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join('')+'</row>').join('')+'</sheetData><hyperlinks>'+rows.map((row,i)=>row.jiraUrl?`<hyperlink ref="A${i+1}" r:id="jira${i}"/>`:'').join('')+'</hyperlinks></worksheet>';
    const files={
      '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Jira KPI" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml':'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/></font><font><b/><color rgb="FF9C0006"/><sz val="11"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E1F2"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="4" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="2" fontId="0" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/><xf numFmtId="2" fontId="2" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
      'xl/worksheets/sheet1.xml':sheet,
      'xl/worksheets/_rels/sheet1.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rows.map((row,i)=>row.jiraUrl?`<Relationship Id="jira${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(row.jiraUrl)}" TargetMode="External"/>`:'').join('')+'</Relationships>',
    };
    const chunks=[],central=[];let offset=0;
    const header=n=>new Uint8Array(n),u16=(a,p,n)=>new DataView(a.buffer).setUint16(p,n,true),u32=(a,p,n)=>new DataView(a.buffer).setUint32(p,n>>>0,true);
    for(const [name,text] of Object.entries(files)){
      const path=enc.encode(name),data=enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+text);
      let crc=0xffffffff;for(const b of data){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
      const local=header(30);u32(local,0,0x04034b50);u16(local,4,20);u32(local,14,crc);u32(local,18,data.length);u32(local,22,data.length);u16(local,26,path.length);
      chunks.push(local,path,data);
      const c=header(46);u32(c,0,0x02014b50);u16(c,4,20);u16(c,6,20);u32(c,16,crc);u32(c,20,data.length);u32(c,24,data.length);u16(c,28,path.length);u32(c,42,offset);central.push(c,path);offset+=local.length+path.length+data.length;
    }
    const size=central.reduce((n,a)=>n+a.length,0),end=header(22);u32(end,0,0x06054b50);u16(end,8,Object.keys(files).length);u16(end,10,Object.keys(files).length);u32(end,12,size);u32(end,16,offset);
    const all=[...chunks,...central,end],out=new Uint8Array(all.reduce((n,a)=>n+a.length,0));let at=0;for(const a of all){out.set(a,at);at+=a.length;}return out;
  }
  const STORE = 'jira-monitor-batch-v5';
  const DETAIL_STORE=detailOnly?'jira-monitor-auto-detail-v1':'jira-monitor-manual-detail-v1';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const readState=key=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
  const isDetail=()=>/^\/browse\//i.test(location.pathname);
  const get=()=>{
    const batch=readState(STORE);
    if(!detailOnly&&(batch?.active||batch?.paused))return batch;
    if(detailOnly)return readState(DETAIL_STORE);
    return isDetail()?readState(DETAIL_STORE):batch;
  };
  const save=s=>sessionStorage.setItem(s.mode==='single'?DETAIL_STORE:STORE,JSON.stringify(s));
  const keyOf = href => { try { const u=new URL(href,location.href); return u.searchParams.get('selectedIssue') || u.pathname.match(/\/browse\/([A-Z][A-Z0-9_]*-\d+)/i)?.[1]; } catch { return null; } };
  function readAssignee(doc=document) {
    const clean=node=>node?.textContent?.replace(/\s+/g,' ').trim()||'';
    const value=doc.querySelector('#assignee-val, [data-field-id="assignee"] .value, [data-field="assignee"] .value');
    if(value)return clean(value.querySelector('.user-hover, [rel]')||value)||'未分配';
    const people=doc.querySelector('#peoplemodule, #people-module, .people-details')||doc;
    for(const label of people.querySelectorAll('dt, .name, label')){
      if(!/^(assignee|经办人|指派人|负责人)\s*[:：]?$/i.test(clean(label)))continue;
      const next=label.nextElementSibling;
      const field=next||label.parentElement?.querySelector('dd, .value');
      if(field)return clean(field.querySelector('.user-hover')||field)||'未分配';
    }
    return '';
  }
  const readSummary=()=>document.querySelector('#summary-val, h1[data-field="summary"], #issue-header h1')?.textContent?.trim()||'';
  function summaryLinks() {
    const root = document.querySelector('#issuetable, .issue-table, [data-testid="issue-table"]');
    if (!root) return [];
    const map = new Map();
    for (const row of root.querySelectorAll('tr, [data-issuekey]')) {
      const a = row.querySelector('td.summary a.issue-link, td.summary a, .summary a, a[data-field="summary"]') || [...row.querySelectorAll('a[href*="/browse/"]')].find(a => !/^[A-Z][A-Z0-9_]*-\d+$/i.test(a.textContent.trim()));
      const key = a && (keyOf(a.href) || row.getAttribute('data-issuekey'));
      if (key && a) map.set(key,{key,summary:a.textContent.trim(),href:a.href,anchor:a,
        currentStatus:row.querySelector('td.status .aui-lozenge, td.status .jira-issue-status-lozenge, td.status, [data-field="status"]')?.textContent?.trim()||'',
        assignee:row.querySelector('td.assignee .user-hover, td.assignee, [data-field="assignee"]')?.textContent?.replace(/\s+/g,' ').trim()||''});
    }
    return [...map.values()];
  }
  // Shadow DOM 隔离 Jira 的页面样式；挂在根节点，避免被局部页面刷新移除。
  const host=document.createElement('div');
  host.id=detailOnly?'jira-detail-panel-host':'jira-duration-panel-host';
  host.style.cssText='display:block!important;position:fixed!important;inset:auto 16px 68px auto!important;width: min(430px, 90vw)!important;z-index:2147483647!important;visibility:visible!important;opacity:1!important';
  host.style.cssText='display:block;width:100%;position:relative';
  (detailOnly?hub.detail:hub.timeout).append(host);
  const shadow=host.attachShadow({mode:'open'});
  const css=document.createElement('style');
  css.textContent=`
    *{box-sizing:border-box}
    button,select,textarea{font:12px Arial,sans-serif;color:#172b4d}
    button{height:27px;padding:3px 10px;border:1px solid #c1c7d0;border-radius:5px;background:#f7f8fa;cursor:pointer;white-space:nowrap}
    button:hover:not(:disabled){background:#e9f2ff;border-color:#85b8ff}
    button:disabled{opacity:.45;cursor:default}
    [data-start]{background:#0052cc;color:white;border-color:#0052cc}
    [data-actions]{display:flex;align-items:center;gap:7px;flex:0 0 auto;padding:8px 0}
    [data-actions] button{flex:0 0 auto}
    [data-fold]{height:23px;padding:2px 8px;font-size:11px}
    p{margin:8px 0;line-height:1.45;flex:0 0 auto}
    [data-config]{font-size:12px;color:#5e6c84;white-space:pre-line}
    select,textarea{border:1px solid #dfe1e6;border-radius:5px;padding:5px 7px;background:white}
    select{flex:0 0 auto;margin-bottom:5px}
    [data-progress]{font-size:12px;color:#5e6c84;margin:3px 0 8px}
    [data-totals]{background:#f0f5ff;color:#0747a6;border-radius:5px;padding:8px 9px;margin:0 0 6px;font-weight:600}
    a{color:#0052cc;text-decoration:none} a:hover{text-decoration:underline}
  `;
  shadow.append(css);
  const panel=document.createElement('section');
  shadow.append(panel);
  function mountPanel(){if(!host.isConnected)(detailOnly?hub.detail:hub.timeout).append(host);panel.style.display='block';host.style.visibility='visible';}

  panel.style.cssText='box-sizing:border-box;position:relative;width:100%;height:min(520px,75vh);max-height:75vh;overflow:hidden;z-index:2147483647;background:#fff;color:#172b4d;border:2px solid #0052cc;border-radius:8px;padding:14px;box-shadow:0 4px 24px #0004;font:13px Arial';
  // 使用 DOM 构建，避免站点 Trusted Types 策略拒绝 innerHTML。
  const make=(tag,text,attr,parent)=>{const x=document.createElement(tag);if(text)x.textContent=text;if(attr)x.setAttribute(attr,'');parent.append(x);return x;};
  make('b','超时预警',null,panel);
  const fold=make('button','收起','data-fold',panel);fold.style.float='right';
  const body=make('div',null,'data-body',panel);
  body.style.cssText='display:flex;flex-direction:column;height:calc(100% - 24px);min-height:0';
  panel.style.height=`min(${CONFIG.panelHeightPx}px,75vh)`;
  make('p','规则加载中…','data-config',body);
  make('p','*本地周五：10:30前不预减；10:30起减1天；17:00起减2天（KPI上下限）。','data-friday-note',body).style.cssText='color:#de350b;font-size:12px;margin:0 0 10px;flex-shrink:0';
  const scope=make('select',null,'data-scope',body);
  const allOption=make('option','全部筛选结果',null,scope);allOption.value='all';
  const pageOption=make('option','仅当前分页',null,scope);pageOption.value='page';scope.value=CONFIG.scanScope;
  const jqlBox=make('textarea',null,'data-jql',body);jqlBox.placeholder='自动读取URL中的JQL；未读取到时请粘贴Advanced里的完整JQL';jqlBox.rows=2;
  jqlBox.style.cssText='width:100%;box-sizing:border-box;flex-shrink:0';
  jqlBox.value=new URL(location.href).searchParams.get('jql')||'';
  const actions=make('div',null,'data-actions',body);
  make('button','开始统计','data-start',actions);
  make('button','暂停','data-pause',actions);
  make('button','停止','data-stop',actions);
  make('button','导出 Excel','data-excel',actions);
  make('button','发送 Teams','data-teams',actions);
  // Teams 设置保留在油猴菜单，面板仅展示发送按钮。
  make('p',null,'data-notice',body).style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:100px;overflow-y:auto';
  make('p',null,'data-teams-status',body).style.cssText='font-size:12px;color:#5e6c84';
  const errorBox=make('pre',null,'data-teams-errors',body);errorBox.hidden=true;errorBox.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;flex-shrink:0;max-height:130px;overflow-y:auto;color:#ae2a19;background:#fff1f0;padding:7px;font:12px Arial';
  make('p',null,'data-progress',body);make('p',null,'data-totals',body);const resultsBox=make('div',null,'data-results',body);
  resultsBox.style.cssText='flex:1;min-height:80px;overflow-y:auto;overscroll-behavior:contain';
  const theme=document.createElement('style');theme.textContent=`
    section{height:100%!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:20px!important;font:13px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}
    section>b{display:block;font-size:19px;margin-bottom:12px;color:#24334d} [data-fold]{display:none} [data-body]{height:calc(100% - 44px)!important;display:flex!important}
    button{height:32px;padding:5px 12px;border-radius:7px;border-color:#dbe3ef;background:white} [data-start]{background:#245de8;border-color:#245de8} [data-actions]{flex-wrap:wrap;gap:6px;padding:12px 0}
    [data-config]{background:#f3f6fc;padding:12px 14px;border-radius:9px;color:#64748b;line-height:1.8;margin:0 0 8px} [data-friday-note]{font-size:11px!important;color:#b67718!important}
    [data-totals]{background:#eaf0ff;border:1px solid #dee7ff;color:#245de8;padding:11px 13px;border-radius:8px} [data-results]>div{padding:12px 4px!important;border-bottom:1px solid #edf1f7!important;line-height:1.8}
    select{padding:8px;border-radius:7px;border-color:#dde5f0} [data-teams-status],[data-progress]{font-size:11px!important;color:#8996ab!important} [data-notice]:empty,[data-notice]:empty~[data-teams-errors][hidden]{display:none}
    :host{height:100%} [data-results]{min-height:80px!important} `;
  if(detailOnly){theme.textContent+='section{height:420px!important;padding:14px!important}section>b{display:none}[data-body]{height:100%!important}[data-friday-note]{display:none}';}
  shadow.append(theme);mountPanel();
  if(!detailOnly&&typeof GM_registerMenuCommand==='function') GM_registerMenuCommand('Jira Monitor：显示统计面板',()=>{hub.show('timeout');mountPanel();fold.textContent='收起';body.hidden=false;body.style.display='flex';panel.style.height=`min(${CONFIG.panelHeightPx}px,75vh)`;});
  const el=s=>panel.querySelector(s);
  let ruleLoadError='';
  try{const saved=typeof GM_getValue==='function'?GM_getValue(RULE_SETTING,null):null;if(saved!==null){validateRules(saved);CONFIG.rules=saved;}}catch(error){ruleLoadError='已保存规则无效，本次使用代码默认规则：'+safeError(error);}
  validateRules(CONFIG.rules);
  el('[data-config]').textContent=CONFIG.rules.map(r=>ruleText(r)).join('\n');
  let busy=false, epoch=0, shownBatch='';
  function render() {
    const s=get();
    hub.syncRoute();
    if(!detailOnly&&!isDetail()&&s?.mode==='batch'&&(s.active||s.paused)&&shownBatch!==s.id){shownBatch=s.id;hub.show('timeout');}
    if(detailOnly)hub.syncDetail();
    el('[data-teams-status]').textContent='按项目通知：已配置 '+projectConfigs().length+' 个项目'+(s?.mode==='single'?' · 详情仅手动发送':' · 自动通知遵循各项目开关');
    el('[data-config]').textContent=(s?.rules||CONFIG.rules).map(r=>ruleText(r)).join('\n');
    el('[data-start]').disabled=!!s?.active||teamsSending;
    el('[data-start]').textContent=s?.paused?'开始统计':keyOf(location.href)&&!onOverview()?'重新分析':'开始统计';
    el('[data-pause]').disabled=!s?.active;
    el('[data-stop]').disabled=!s?.active&&!s?.paused;
    el('[data-teams]').disabled=!!s?.active||teamsSending||!s?.results?.some(item=>item.rules?.some(r=>Number.isFinite(r.seconds)));
    scope.disabled=!!(s?.active||s?.paused);jqlBox.disabled=scope.disabled;
    scope.hidden=isDashboard()||!!keyOf(location.href)&&!onOverview();jqlBox.hidden=true;
    el('[data-progress]').textContent=s ? `${s.paused?'已暂停':s.active?'运行中':'已结束/停止'} · ${s.index}/${s.queue.length} · ${s.message||''}` : (keyOf(location.href)?'点击重新分析当前详情':'点击开始统计当前总览页');
    const box=el('[data-results]'),oldScroll=box.scrollTop;box.replaceChildren();
    if(!s){el('[data-totals]').textContent=CONFIG.rules.map(rule=>`${rule.name} 即将超期：0`).join('；');return;}
    const rules=s.rules||CONFIG.rules;
    const summary=el('[data-totals]');
    summary.textContent=rules.map(rule=>{
      const count=s.results.filter(item=>{
        const r=item.rules?.find(result=>result.name===rule.name);
        return panelDuration(r,rule).level==='warning';
      }).length;
      return `${rule.name} 即将超期：${count}`;
    }).join('；');
    for(const item of s.results){
      const div=document.createElement('div'),a=document.createElement('a');a.href='/browse/'+item.key;a.target='_blank';a.rel='noopener';a.textContent=item.key;
      div.append(a,document.createTextNode(' · '+(item.assignee||'未读取到经办人')));
      const target=projectTarget(item.key);div.append(document.createTextNode(' · '+(target?.webhook?'通知分组：'+target.projectKey:'未配置通知目标')));
      if(item.rules){
        for(const result of item.rules){
          const rule=rules.find(r=>r.name===result.name)||{};
          const display=panelDuration(result,rule),span=document.createElement('span');
          span.textContent=result.name+' '+display.text;
          if(display.level==='overdue')span.style.cssText='color:#d1242f;font-weight:700';
          else if(display.level==='normal')span.style.cssText='color:#16803c;font-weight:700';
          else if(display.level==='warning')span.style.cssText='color:#b58100;font-weight:700;background:#fff7bd;padding:1px 3px';
          div.append(document.createTextNode(' · '),span);
        }
      }else div.append(document.createTextNode(' · '+item.status+' · '+(item.details||'—')));
      div.style.cssText='border-top:1px solid #ddd;padding:5px 0';box.append(div);
    }
    box.scrollTop=oldScroll;
  }
  function hasTeamsAlert(item,rulesConfig=CONFIG.rules){
    return item.rules?.some(r=>{
      const rule=rulesConfig.find(x=>x.name===r.name);
      return rule&&['warning','overdue'].includes(panelDuration(r,rule).level);
    })||false;
  }
  function teamsPayload(current,rulesConfig=CONFIG.rules,automatic=true,target=projectTarget(current.key)){
    const jiraUrl=location.origin+'/browse/'+encodeURIComponent(current.key);
    const rules=(current.rules||[]).filter(r=>{
      const rule=rulesConfig.find(x=>x.name===r.name);
      return rule&&Number.isFinite(r.seconds)&&(!automatic||['warning','overdue'].includes(panelDuration(r,rule).level));
    }).map(r=>{
      const rule=rulesConfig.find(x=>x.name===r.name),d=panelDuration(r,rule);
      return {name:r.name,sla:{normal:'符合预期',warning:'即将超期',overdue:'已超期'}[d.level],days:Number(dayText(r.seconds)),startTime:beijingTime(r.startAt),level:d.level};
    });
    const assigneeEmail=current.assigneeEmail||'';
    const mapped=CONFIG.teamsMentionUsers[current.assigneeAccount];
    const mention=CONFIG.mentionAssignee&&(mapped?.id?mapped:assigneeEmail?{id:assigneeEmail,name:current.assignee}:null);
    const mentionName=mention?String(mention.name||current.assignee).replace(/[<>]/g,''):'';
    const mentionText=mention?'<at>'+mentionName+'</at>':'';
    const text=[current.key,current.summary,'负责人：'+current.assignee,...rules.map(r=>r.name+'：'+r.sla+' · '+r.days.toFixed(2)+'天'),jiraUrl,'扫描时间：'+beijingTime(current.checkedAt)].join('\n');
    return {type:'message',text,email:emailPayload(current,rules,text,jiraUrl,target),projectKey:projectKeyOf(current.key),jiraKey:current.key,jiraUrl,summary:current.summary,assignee:current.assignee,assigneeAccount:current.assigneeAccount,assigneeEmail,currentStatus:current.currentStatus,scanTime:beijingTime(current.checkedAt),rules,
      attachments:[{contentType:'application/vnd.microsoft.card.adaptive',contentUrl:null,content:{'$schema':'http://adaptivecards.io/schemas/adaptive-card.json',type:'AdaptiveCard',version:'1.2',msteams:{entities:mention?[{type:'mention',text:mentionText,mentioned:{id:mention.id,name:mentionName}}]:[]},body:[
        {type:'TextBlock',text:current.key,weight:'Bolder',size:'Medium',wrap:true},
        {type:'TextBlock',text:current.summary,wrap:true},
        {type:'TextBlock',text:'负责人：'+(mentionText||current.assignee),wrap:true},
        ...rules.map(r=>({type:'TextBlock',text:r.name+'：'+r.sla+' · '+r.days.toFixed(2)+'天',wrap:true,color:{normal:'Good',warning:'Warning',overdue:'Attention'}[r.level]})),
        {type:'TextBlock',text:'扫描时间：'+beijingTime(current.checkedAt),wrap:true,isSubtle:true}
      ],actions:[{type:'Action.OpenUrl',title:'打开 Jira',url:jiraUrl}]}}]};
  }
  function safeError(error){
    return String(error?.message||error||'未知错误').replace(/https?:\/\/[^\s<>"']+/g,'[已隐藏地址]').replace(/([?&]sig=)[^&\s]+/gi,'$1[隐藏]').slice(0,1200);
  }
  function showTeamsError(text){
    const box=el('[data-teams-errors]');box.textContent=safeError(text);box.hidden=false;
  }
  function postTeams(payload,webhook){
    return new Promise((resolve,reject)=>{
      if(!webhook){reject(new Error('未配置 Webhook：打开油猴菜单「Jira Monitor：配置中心」'));return;}
      if(!supportedWebhook(webhook)){reject(new Error('Webhook 地址不受支持，请重新配置'));return;}
      if(typeof GM_xmlhttpRequest!=='function'){reject(new Error('GM_xmlhttpRequest 不可用，请确认只启用一份 Jira Monitor 并重新保存脚本权限'));return;}
      try{GM_xmlhttpRequest({method:'POST',url:webhook,headers:{'Content-Type':'application/json'},data:JSON.stringify(payload),timeout:30000,anonymous:true,
        onload:r=>{
          if(r.status>=200&&r.status<300){resolve();return;}
          let detail='';try{const body=JSON.parse(r.responseText||'{}');detail=body.error?.message||body.message||'';}catch{detail=(r.responseText||'').slice(0,600);}
          reject(new Error('Webhook HTTP '+r.status+(detail?'：'+safeError(detail):'')));
        },
        onerror:r=>{
          const details=[r?.status?'HTTP '+r.status:'未收到 HTTP 响应',r?.statusText,r?.error].filter(Boolean).map(safeError).join('；');
          reject(new Error('Webhook 网络请求失败（'+details+'）；目标域名：'+new URL(webhook).hostname+'。请在油猴脚本设置中检查 XHR/跨域域名授权；若工作流已有本次运行记录，请勿重复发送。'));
        },
        onabort:()=>reject(new Error('Webhook 请求被中止')),
        ontimeout:()=>reject(new Error('Webhook 请求超时，发送结果未知，请先检查工作流运行记录再重试'))});}
      catch(error){reject(new Error('油猴请求未发出：'+safeError(error)));}
    });
  }

  let teamsSending=false;
  function notice(text){el('[data-notice]').textContent=text;}
  async function sendOverviewItem(item,rules,automatic){
    const run=async()=>{
      const detail=get()?.mode==='single';
      if(automatic&&detail)return 'skipped';
      const target=projectTarget(item.key);
      const payload=teamsPayload(item,rules,!detail,target);
      if(!payload.rules.length)return 'skipped';
      if(!target?.webhook){if(automatic)return 'unconfigured';throw Error(projectKeyOf(item.key)+' 未配置通知目标，请打开配置中心');}
      if(automatic&&!target.autoNotify)return 'skipped';
      if(automatic){
        if(typeof GM_getValue!=='function'||typeof GM_setValue!=='function')throw new Error('请保存新版脚本并刷新以启用通知去重权限');
        const key='jira-monitor-teams-cooldown-v2:'+target.projectKey+':'+item.key+':'+target.webhook+':'+target.recipients.map(x=>x.toLowerCase()).sort().join(';');
        if(GM_getValue(key,null)?.until>Date.now())return 'suppressed';
        const hours=Number(CONFIG.notificationCooldownHours);
        if(!Number.isFinite(hours)||hours<=0)throw new Error('notificationCooldownHours 必须大于0');
        GM_setValue(key,{until:Date.now()+hours*3600000,state:'submitted'});
      }
      await postTeams(payload,target.webhook);return 'submitted';
    };
    if(typeof navigator!=='undefined'&&navigator.locks?.request)return navigator.locks.request('jira-monitor-teams-notify',run);
    return run();
  }
  async function autoNotifyOverview(item,rules){
    try{const state=await sendOverviewItem(item,rules,true);if(state==='submitted')notice(item.key+' 自动通知已提交');else if(state==='unconfigured')notice(item.key+' 未配置通知目标，仅统计');}
    catch(error){const text=item.key+' 自动通知失败：'+safeError(error);notice(text);showTeamsError(text+'；自动冷却记录保留，请核对工作流。');}
  }
  el('[data-teams]').onclick=async()=>{
    const s=get();if(teamsSending||s?.active)return;
    const items=(s?.results||[]).filter(item=>item.rules?.some(r=>Number.isFinite(r.seconds)));
    if(!items.length){notice('没有有效计时结果，无需发送');return;}
    el('[data-teams-errors]').hidden=true;el('[data-teams-errors]').textContent='';
    teamsSending=true;render();let success=0,failed=0,skipped=0;const errors=[];
    for(const item of items){
      notice('正在发送 '+item.key+'…');
      try{const state=await sendOverviewItem(item,s.rules||CONFIG.rules,false);if(state==='submitted')success++;else skipped++;}catch(error){failed++;errors.push(item.key+'：'+safeError(error));notice(errors[errors.length-1]);showTeamsError(errors.join('\n'));}
    }
    teamsSending=false;notice('Teams 已提交 '+success+' 条，失败 '+failed+' 条，跳过 '+skipped+' 条（工作流接收不代表投递完成）'+(errors.length?'\n'+errors.join('\n'):''));render();
  };
  function update(message) {const s=get();if(s?.active){s.message=message;save(s);render();}}
  function valid(id, token) { const s=get();if(!s?.active || s.id!==id || token!==epoch)throw new Error('CANCELLED');return s; }
  function tabLink(){return [...document.querySelectorAll('a,button,[role="tab"]')].find(x=>/^history$/i.test(x.textContent.trim()));}
  async function api(path,options={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try{const res=await fetch(path,{...options,credentials:'same-origin',headers:{Accept:'application/json',...(options.headers||{})},signal:controller.signal});if(!res.ok)throw new Error('Jira HTTP '+res.status);return await res.json();}finally{clearTimeout(timer);}
  }
  async function issueHistory(key,checkpoint=()=>{}){
    checkpoint();
    const data=await api('/rest/api/2/issue/'+encodeURIComponent(key)+'?fields=assignee,status,summary,issuetype&expand=changelog');
    checkpoint();let histories=data.changelog?.histories;
    if(!Array.isArray(histories))throw new Error('接口未返回 changelog');
    const total=data.changelog.total;
    if(!Number.isInteger(total)||data.changelog.startAt>0||histories.length<total){
      histories=[];let startAt=0;
      do{
        checkpoint();const page=await api('/rest/api/2/issue/'+encodeURIComponent(key)+'/changelog?startAt='+startAt+'&maxResults=100');
        checkpoint();const batch=page.values||page.histories;
        if(!Array.isArray(batch)||!Number.isInteger(page.total)||!batch.length&&startAt<page.total)throw new Error('历史分页不完整');
        histories.push(...batch);startAt+=batch.length;
        if(startAt>=page.total)break;
      }while(startAt<100000);
    }
    const seen=new Set(),events=[];
    for(const h of histories){
      if(h.id&&seen.has(h.id))continue;if(h.id)seen.add(h.id);
      for(const item of h.items||[]){
        if(norm(item.field)!=='STATUS')continue;
        const at=Date.parse(h.created);
        if(!Number.isFinite(at))throw new Error('History 精确时间解析失败：'+h.created);
        events.push({to:item.toString,from:item.fromString,at,historyId:h.id,source:'History REST fetch 精确时间',order:events.length});
      }
    }
    const fields=data.fields||{};
    if(!fields.status?.name)throw new Error('无法读取当前状态');
    return {events,issueType:fields.issuetype?.name||'',assigneeEmail:fields.assignee?.emailAddress||'',assigneeAccount:fields.assignee?.name||fields.assignee?.key||fields.assignee?.accountId||'',status:fields.status.name,assignee:fields.assignee===null?'未分配':fields.assignee?.displayName||'',summary:fields.summary||'',source:'Jira History REST fetch 精确时间'};
  }
  async function allIssues(id,token){
    const checkpoint=valid(id,token).collection;
    let jql=checkpoint?.jql||jqlBox.value.trim()||new URL(location.href).searchParams.get('jql')||document.querySelector('#jql, textarea[name="jql"]')?.value||'';
    if(!jql){const filter=new URL(location.href).searchParams.get('filter');if(/^\d+$/.test(filter||'')){jql=(await api('/rest/api/2/filter/'+filter)).jql||'';}}
    if(!jql)throw new Error('无法确定完整筛选条件，请在面板粘贴 Advanced 的完整 JQL，再重新开始；没有退回到只扫描当前页');
    let startAt=checkpoint?.startAt||0,total=checkpoint?.total??null;
    const found=new Map((checkpoint?.issues||[]).map(x=>[x.key,x]));
    const initial=valid(id,token);initial.collection={jql,startAt,total,issues:[...found.values()]};save(initial);
    while(total===null||startAt<total){
      valid(id,token);
      const page=await api('/rest/api/2/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jql,startAt,maxResults:100,fields:['summary','status','assignee','issuetype']})});
      valid(id,token);
      if(!Array.isArray(page.issues)||!Number.isInteger(page.total))throw new Error('搜索分页返回格式异常');
      if(total!==null&&total!==page.total)throw new Error('收集时筛选数量变化，请重新扫描');total=page.total;
      if(!page.issues.length&&startAt<total)throw new Error('搜索分页提前结束，未取得全部工单');
      for(const issue of page.issues)found.set(issue.key,issue);
      startAt+=page.issues.length;
      const state=valid(id,token);state.collection={jql,startAt,total,issues:[...found.values()]};save(state);
      update(`收集全部筛选结果：${startAt}/${total}`);
    }
    if(found.size!==total)throw new Error('搜索分页存在重复或遗漏，请重试');
    const rules=valid(id,token).rules;
    const queue=[...found.values()].filter(x=>rules.some(r=>r.currentStatuses.map(norm).includes(norm(x.fields?.status?.name)))).map(x=>({key:x.key,summary:x.fields?.summary||'',currentStatus:x.fields?.status?.name||'',assignee:x.fields?.assignee===null?'未分配':x.fields?.assignee?.displayName||'',href:location.origin+'/browse/'+x.key}));
    return {queue,total,jql};
  }
  async function continueCollection(){
    const before=get();if(!before?.active||before.phase!=='collecting'||busy)return;
    const id=before.id,token=epoch;busy=true;
    try{
      const {queue,total,jql}=await allIssues(id,token);const state=valid(id,token);
      Object.assign(state,{queue,total,jql,phase:'list',message:`全部${total}条，符合状态范围${queue.length}条`});delete state.collection;save(state);
    }catch(e){if(e.message!=='CANCELLED'){const state=get();if(state?.id===id&&state.active&&token===epoch){state.active=false;state.paused=true;state.message=e.message;save(state);}}}
    finally{if(token===epoch)busy=false;render();}
    if(token===epoch)pump();
  }
  async function inspect(id,token){
    const state=valid(id,token);
    // 批量扫描保持可见的History定位；独立详情直接使用同一REST读取和计算逻辑。
    if(state.mode!=='single'){
      const end=Date.now()+CONFIG.detailTimeoutSeconds*1000;let tab;
      while(Date.now()<end){valid(id,token);tab=tabLink();if(tab)break;document.querySelector('#activitymodule')?.scrollIntoView({block:'center'});await sleep(500);}
      if(!tab)throw new Error('未找到 History 标签');
      tab.scrollIntoView({block:'center'});tab.click();update('已点击 History，读取状态变化的精确时间…');await sleep(1000);valid(id,token);
    }
    // made changes 的相对时间会舍入；读取同一 History 的 REST created 时间，避免把 Yesterday/17 minutes ago 当成精确日期。
    const data=await issueHistory(keyOf(location.href));
    const s=valid(id,token),now=Date.now();
    return {checkedAt:now,assigneeEmail:data.assigneeEmail,assigneeAccount:data.assigneeAccount,rules:evaluateHistory(data.events,data.status,s.rules,now),assignee:data.assignee||readAssignee()||s.queue[s.index]?.assignee||'',summary:data.summary,currentStatus:data.status,source:data.source};
  }
  let dashboardDiagnostics='';
  function dashboardIssues(){
    const found=new Map(),visited=new Set();let anchors=0,frames=0,blocked=0,roots=0;
    const issueKey=value=>String(value||'').trim().match(/^[A-Z][A-Z0-9_]*-\d+$/i)?.[0]?.toUpperCase();
    const walk=root=>{
      if(!root||visited.has(root))return;visited.add(root);roots++;
      for(const node of root.querySelectorAll('a, [data-issue-key], [data-issuekey]')){
        if(node.closest?.('#jira-duration-panel-host, #jira-monitor-hub, #jira-detail-panel-host'))continue;
        const raw=node.getAttribute?.('href')||node.href||'';let key='';
        if(raw&&!/^javascript:/i.test(raw)){try{
          const url=new URL(raw,location.href);if(url.origin!==location.origin)continue;
          key=keyOf(url.href)||issueKey(url.searchParams.get('issueKey'))||issueKey(url.searchParams.get('key'));
        }catch{continue;}}
        anchors++;
        key=issueKey(key)||issueKey(node.getAttribute?.('data-issue-key'))||issueKey(node.getAttribute?.('data-issuekey'))||issueKey(node.textContent);
        if(key&&!found.has(key))found.set(key,{key,href:location.origin+'/browse/'+encodeURIComponent(key),summary:node.textContent?.trim()||key});
      }
      for(const node of root.querySelectorAll('*')){if(node.shadowRoot&&!['jira-duration-panel-host','jira-monitor-hub','jira-detail-panel-host'].includes(node.id))walk(node.shadowRoot);}
      for(const frame of root.querySelectorAll('iframe, frame')){
        frames++;try{const doc=frame.contentDocument;if(doc)walk(doc);else blocked++;}catch{blocked++;}
      }
    };walk(document);
    dashboardDiagnostics='读取文档/Shadow Root '+roots+' 个，候选链接/字段 '+anchors+' 个，iframe '+frames+' 个，其中不可读取 '+blocked+' 个';
    return [...found.values()];
  }
  async function scanDashboard(previous){
    const queue=previous?.paused?previous.queue:dashboardIssues();
    if(!queue.length){notice('Dashboard 未识别到工单编号。'+dashboardDiagnostics+'。若 iframe 不可读取，请打开小组件对应的筛选列表进行扫描。');return;}
    epoch++;const token=epoch;
    const state=previous?.paused?{...previous,active:true,paused:false,jobDirect:true}:{id:'dashboard-'+Date.now(),mode:'batch',dashboardScan:true,jobDirect:true,active:true,rules:JSON.parse(JSON.stringify(CONFIG.rules)),queue,index:0,results:[],skipped:0,listUrl:location.href};
    state.phase='reading';save(state);render();
    try{
      while(state.index<state.queue.length){
        valid(state.id,token);const item=state.queue[state.index];let data;
        try{data=await issueHistory(item.key);}catch(error){valid(state.id,token);throw Error(item.key+'：'+safeError(error));}
        valid(state.id,token);
        {
          const now=Date.now();state.results.push({...item,summary:data.summary,assignee:data.assignee,assigneeEmail:data.assigneeEmail,assigneeAccount:data.assigneeAccount,currentStatus:data.status,checkedAt:now,rules:evaluateHistory(data.events,data.status,state.rules,now)});
          await autoNotifyOverview(state.results.at(-1),state.rules);valid(state.id,token);
        }
        state.index++;state.message='Dashboard：不限 Issue Type，已扫描 '+state.index+'/'+state.queue.length;save(state);render();
      }
      state.active=false;state.jobDirect=false;state.phase='done';state.message='Dashboard 已加载工单扫描完成；不限 Issue Type（不含未加载的小组件分页）';save(state);render();
    }catch(error){if(error.message!=='CANCELLED'){const s=get();if(s?.id===state.id){s.active=false;s.paused=true;s.message='Dashboard 扫描失败：'+safeError(error);save(s);render();}}}
  }
  function onOverview(){
    return /^\/issues(?:\/|$)/.test(location.pathname)&&!!document.querySelector('#issuetable, .issue-table, [data-testid="issue-table"]');
  }
  function pageStamp(){return summaryLinks().map(x=>x.key).join('|');}
  function pageBounds(){
    const match=(document.body.innerText||'').match(/Showing results\s+([\d,]+)\s*[-–]\s*([\d,]+)\s+of\s+([\d,]+)/i);
    return match?{start:Number(match[1].replace(/,/g,'')),end:Number(match[2].replace(/,/g,'')),total:Number(match[3].replace(/,/g,''))}:null;
  }
  function nextPageControl(){
    const links=[...document.querySelectorAll('.pagination a, .pagination button, .aui-nav-pagination a, .aui-nav-pagination button, a[rel="next"], a[aria-label], a[title], a[href*="startIndex="], a[href*="startAt="], a[href*="pager/start="]')];
    const enabled=x=>!x.disabled&&x.getAttribute('aria-disabled')!=='true'&&!x.closest('.disabled, .aui-nav-disabled, [aria-disabled="true"]')&&x.getClientRects().length;
    const explicit=links.find(x=>enabled(x)&&(/^(next|next page|下一页|下页|›|»|>)$/i.test(x.textContent.trim())||/next|下一页/i.test((x.getAttribute('aria-label')||'')+' '+(x.getAttribute('title')||''))||x.getAttribute('rel')==='next'));
    if(explicit)return explicit;
    const bounds=pageBounds();
    if(bounds&&bounds.end<bounds.total){
      const target=Math.floor((bounds.start-1)/(bounds.end-bounds.start+1))+2;
      const numeric=[...document.querySelectorAll('.pagination a, .aui-nav-pagination a, a[href]')].find(x=>enabled(x)&&x.textContent.trim()===String(target)&&new URL(x.href,location.href).pathname.startsWith('/issues'));
      if(numeric)return numeric;
    }
    return null;
  }
  function appendPage(state){
    const stamp=pageStamp();if(!stamp)throw new Error('当前分页列表尚未加载');
    if((state.visitedPages||[]).includes(stamp))throw new Error('翻页后出现已扫描的相同列表，暂停以防重复扫描');
    const rows=summaryLinks(),seen=new Set(state.queue.map(x=>x.key));
    const eligible=rows.filter(x=>!seen.has(x.key)&&(!x.currentStatus||state.rules.some(r=>r.currentStatuses.map(norm).includes(norm(x.currentStatus)))));
    state.queue.push(...eligible.map(({anchor,...x})=>x));
    state.visitedPages=[...(state.visitedPages||[]),stamp];state.listUrl=location.href;state.phase='list';state.pageNumber=(state.pageNumber||0)+1;
    state.total=pageBounds()?.total??state.total;state.message=`第${state.pageNumber}页，新增${eligible.length}条符合范围的工单`;save(state);
  }
  function advancePage(state){
    const next=nextPageControl(),bounds=pageBounds();
    if(!next){
      if(bounds&&bounds.end<bounds.total)throw new Error('列表还有下一页但未识别到翻页按钮，请暂停后检查右下角页码');
      state.active=false;state.phase='done';state.message=`已完成${state.pageNumber}页，已统计${state.index}条符合范围的工单`;save(state);return;
    }
    state.phase='paging';state.pagingFrom=pageStamp();state.pagingSince=Date.now();state.nextPageUrl=next.href||null;state.message='当前页完成，点击右下角下一页…';save(state);render();
    next.scrollIntoView({block:'center'});next.click();
    const id=state.id,from=state.pagingFrom;
    setTimeout(()=>{const x=get();if(x?.active&&x.id===id&&x.phase==='paging'&&x.pagingFrom===from&&pageStamp()===from&&x.nextPageUrl)location.assign(x.nextPageUrl);},2000);
  }
  function listIdentity(href){
    const u=new URL(href);for(const key of ['selectedIssue','focusedCommentId','focusedId'])u.searchParams.delete(key);u.hash='';u.searchParams.sort();return u.origin+u.pathname.replace(/\/$/,'')+'?'+u.searchParams;
  }
  function back(s) {
    // History 标签自身可能增加历史项。先浏览器返回，再确保恢复保存的总览。
    if(s.backAt&&Date.now()-s.backAt<2500)return;
    s.backAt=Date.now();save(s);update('本条已保存，返回总览后自动继续…');
    const id=s.id;history.back();
    setTimeout(()=>{
      const x=get();if(!x?.active||x.id!==id||x.phase!=='returning')return;
      if(!onOverview())location.replace(x.listUrl);else pump();
    },1800);
  }
  // Read Jira REST data in the current tab; never click issue links or navigate.
  async function scanDirect(){
    if(busy)return;
    const initial=get();if(!initial?.active||initial.mode!=='batch')return;
    const id=initial.id,token=epoch;busy=true;
    try{
      while(true){
        const state=valid(id,token);
        if(state.index>=state.queue.length){state.active=false;state.paused=false;state.phase='done';state.message=state.dashboardScan?'Dashboard 已加载工单接口扫描完成（不含未加载的小组件分页）':`接口扫描完成：${state.index}/${state.queue.length} 条（查询共 ${state.total??state.queue.length} 条）`;save(state);break;}
        const item=state.queue[state.index];update(`接口读取 ${item.key}（${state.index+1}/${state.queue.length}）…`);
        const data=await issueHistory(item.key,()=>valid(id,token));
        const current=valid(id,token),now=Date.now();
        const result={...item,summary:data.summary,assignee:data.assignee,assigneeEmail:data.assigneeEmail,assigneeAccount:data.assigneeAccount,currentStatus:data.status,checkedAt:now,source:data.source,rules:evaluateHistory(data.events,data.status,current.rules,now)};
        current.results.push(result);current.index++;current.phase='reading';current.message=`接口扫描 ${current.index}/${current.queue.length} · ${item.key}`;
        // Persist the completed item before notification, so pause/reload cannot count it twice.
        save(current);render();
        await autoNotifyOverview(result,current.rules);valid(id,token);
      }
    }catch(error){
      if(error.message!=='CANCELLED'){
        const state=get();if(state?.id===id&&token===epoch){state.active=false;state.paused=true;state.message='接口扫描暂停：'+safeError(error)+'；已保留进度，点击开始统计重试当前工单。';save(state);}
      }
    }finally{if(token===epoch)busy=false;render();}
  }
  async function startApiBatch(){
    const previous=get();if(previous?.active||teamsSending)return;
    if(previous?.paused&&previous.mode==='batch'){
      if(!previous.apiScan){notice('这是旧版逐页扫描任务。请先停止，再重新开始接口扫描；旧结果仍可导出。');return;}
      epoch++;busy=false;previous.active=true;previous.paused=false;previous.jobDirect=false;previous.message='继续接口扫描，保留已完成结果';save(previous);render();
      if(previous.phase==='collecting')await continueCollection();else await scanDirect();return;
    }
    epoch++;busy=false;
    const state={id:'api-'+Date.now()+'-'+epoch,mode:'batch',apiScan:true,active:true,paused:false,rules:JSON.parse(JSON.stringify(CONFIG.rules)),scope:scope.value,listUrl:location.href,queue:[],index:0,results:[],phase:'reading'};
    if(isDashboard()){
      state.dashboardScan=true;state.queue=dashboardIssues();state.total=state.queue.length;
      if(!state.queue.length){notice('Dashboard 未识别到工单编号。'+dashboardDiagnostics);return;}
    }else if(scope.value==='all'){
      state.phase='collecting';state.message='通过接口收集当前查询的全部分页…';save(state);render();await continueCollection();return;
    }else{
      state.queue=summaryLinks().filter(item=>!item.currentStatus||state.rules.some(rule=>rule.currentStatuses.map(norm).includes(norm(item.currentStatus)))).map(({anchor,...item})=>item);state.total=state.queue.length;
      if(!state.queue.length){notice('当前页未找到符合状态范围的工单，请等待 Jira 列表加载后重试。');return;}
    }
    save(state);render();await scanDirect();
  }

  async function pump() {
    if(busy)return;
    let s=get();if(!s?.active){render();return;}
    if(s.mode==='batch'){
      if(!s.apiScan){s.active=false;s.paused=true;s.message='旧版逐页任务已暂停，请停止后重新开始接口扫描；原结果可导出。';save(s);render();return;}
      if(s.phase==='collecting')await continueCollection();else await scanDirect();return;
    }
    if(s.jobDirect)return;
    if(s.phase==='collecting'){continueCollection();return;}
    busy=true;const token=epoch;
    try {
      if(s.domPaging&&s.phase==='paging'){
        const stamp=pageStamp();
        if(onOverview()&&stamp&&stamp!==s.pagingFrom){appendPage(s);return;}
        if(Date.now()-s.pagingSince>30000){s.active=false;s.paused=true;s.message='翻页30秒未完成；请手动翻到下一页后点击开始统计继续';save(s);}
        return;
      }
      const current=s.phase==='returning'&&onOverview()?null:keyOf(location.href);
      if(current){
        if(s.phase==='returning'){back(s);return;}
        const item=s.queue[s.index];
        if(!item || current!==item.key){s.active=false;s.message='当前打开的 Jira 与待扫描条目不符，已停止';save(s);return;}
        s.phase='reading';save(s);update(`正在读取 ${item.key} 的 History…`);
        let result;
        try{result=await inspect(s.id,token);}catch(e){if(e.message==='CANCELLED')return;result={status:'读取失败',max:null,details:e.message};}
        s=valid(s.id,token);
        s.results.push({...item,summary:readSummary()||item.summary,assignee:readAssignee()||item.assignee||'',...result});s.index++;
        save(s);await autoNotifyOverview(s.results[s.results.length-1],s.rules);s=valid(s.id,token);
        if(s.mode==='single'){
          s.active=false;s.phase='done';s.message=`${item.key} 本条统计完成`;save(s);render();return;
        }
        s.phase='returning';save(s);render();await sleep(800);valid(s.id,token);back(s);return;
      }
      if(!/^\/issues(?:\/|$)/.test(location.pathname))return;
      if(listIdentity(location.href)!==listIdentity(s.listUrl)){
        if(s.phase==='returning'){location.replace(s.listUrl);return;}
        s.active=false;s.message='总览筛选改变，已停止以防扫描错误列表';save(s);return;
      }
      if(s.phase==='reading'){s.active=false;s.message='读取中离开了详情页，已停止；可重新开始';save(s);return;}
      if(s.domPaging&&s.index>=s.queue.length){advancePage(s);return;}
      if(s.index>=s.queue.length){s.active=false;s.phase='done';s.message=s.scope==='all'?`全部筛选${s.total}条，符合范围${s.queue.length}条，已全部完成`:'当前分页范围内统计完成（未扫描其它分页）';save(s);return;}
      const item=s.queue[s.index];
      // 返回后等待 Jira 恢复表格，再重新定位 Summary，避免使用旧 DOM。
      let link;
      for(let n=0;n<(s.scope==='all'?1:40);n++){valid(s.id,token);link=summaryLinks().find(x=>x.key===item.key);if(link)break;await sleep(500);}
      if(!link&&s.scope==='all'){
        const anchor=document.createElement('a');anchor.href=item.href;anchor.textContent=item.summary||item.key;
        anchor.style.cssText='display:block;padding:4px';el('[data-progress]').append(anchor);
        link={...item,anchor};
      }
      if(!link){s=valid(s.id,token);s.active=false;s.message=`未找到 ${item.key} 的 Summary，已停止；请确认总览列表未改变`;save(s);return;}
      s=valid(s.id,token);s.phase='opening';s.backAt=0;s.message=`点击 ${item.key} 的 Summary（${s.index+1}/${s.queue.length}）`;save(s);render();
      link.anchor.scrollIntoView({block:'center'});await sleep(500);valid(s.id,token);
      // 强制同一标签打开，让 history.back() 能返回原总览。
      link.anchor.removeAttribute('target');
      // 保留真正的 Summary 点击，但阻止 Jira 的 SPA 点击拦截，使用同标签原生链接跳转。
      const nativeClick=event=>event.stopImmediatePropagation();
      link.anchor.addEventListener('click',nativeClick,{capture:true,once:true});
      link.anchor.click();
      await sleep(2000);valid(s.id,token);
      if(!keyOf(location.href))location.assign(link.href);
    }catch(e){if(e.message!=='CANCELLED'){const x=get();if(x){x.active=false;if(x.domPaging)x.paused=true;x.message=e.message;save(x);}}}
    finally{if(token===epoch)busy=false;render();}
  }
  scope.onchange=render;
  el('[data-start]').onclick=async()=>{
    const previous=get();if(previous?.active||teamsSending)return;
    if(isDashboard()){await scanDashboard(previous?.dashboardScan?previous:null);return;}
    if(previous?.paused){
      epoch++;busy=false;
      previous.active=true;previous.paused=false;previous.jobDirect=false;previous.backAt=0;previous.pagingSince=Date.now();previous.message='继续扫描，保留已完成进度';
      scope.value=previous.scope||scope.value;jqlBox.value=previous.jql||previous.collection?.jql||jqlBox.value;
      if(onOverview()&&previous.phase==='reading')previous.phase='list';
      if(previous.domPaging&&previous.phase==='paging'&&onOverview()&&pageStamp()===previous.pagingFrom)previous.phase='list';
      save(previous);render();
      if(previous.phase==='collecting'){continueCollection();return;}
      const pending=previous.queue[previous.index],current=onOverview()?null:keyOf(location.href);
      if(previous.mode==='single'&&pending&&current!==pending.key){location.assign(pending.href);return;}
      if(previous.mode==='batch'&&previous.phase!=='returning'&&current&&current!==pending?.key){previous.phase='list';save(previous);location.replace(previous.listUrl);return;}
      pump();return;
    }
    const current=onOverview()?null:keyOf(location.href);
    if(current){
      save({id:String(Date.now()),mode:'single',active:true,rules:JSON.parse(JSON.stringify(CONFIG.rules)),queue:[{key:current,summary:readSummary(),href:location.href}],index:0,results:[],phase:'reading',message:`开始统计 ${current}`});
      render();pump();return;
    }
    if(scope.value==='all'){
      const state={id:String(Date.now()),active:true,mode:'batch',scope:'all',domPaging:true,rules:JSON.parse(JSON.stringify(CONFIG.rules)),listUrl:location.href,queue:[],index:0,results:[],phase:'list',visitedPages:[],pageNumber:0};
      try{appendPage(state);}catch(error){alert(error.message);return;}render();pump();return;
    }
    const links=summaryLinks().filter(item=>!item.currentStatus||CONFIG.rules.some(r=>r.currentStatuses.map(norm).includes(norm(item.currentStatus))));
    if(!links.length){alert('未找到 Summary 链接，请切换到截图中的列表视图并等待加载完成。');return;}
    save({id:String(Date.now()),active:true,mode:'batch',scope:'page',rules:JSON.parse(JSON.stringify(CONFIG.rules)),listUrl:location.href,queue:links.map(({anchor,...item})=>item),index:0,results:[],phase:'list',message:`已记录当前页 ${links.length} 条 Jira`});render();pump();
  };
  const startSingle=el('[data-start]').onclick;
  el('[data-start]').onclick=()=>detailOnly||isDetail()?startSingle():startApiBatch();
  el('[data-pause]').onclick=()=>{
    const s=get();if(!s?.active)return;
    s.active=false;s.paused=true;s.message='已保留进度，点击开始统计继续';save(s);
    epoch++;busy=false;render();
  };
  el('[data-stop]').onclick=()=>{
    const s=get();if(s){s.active=false;s.paused=false;s.phase='stopped';s.message='本轮已结束，结果可导出；再次开始将新建扫描';save(s);}
    epoch++;busy=false;render();
  };
  el('[data-fold]').onclick=()=>{const folded=body.style.display==='none';fold.textContent=folded?'收起':'展开';body.style.display=folded?'flex':'none';panel.style.height=folded?`min(${CONFIG.panelHeightPx}px,75vh)`:'auto';};
  function exportRows(){
    const s=get(),rules=s?.rules||CONFIG.rules;
    const rows=[{values:['Jira','Summary','Assignee','当前状态','规则','KPI下限天','KPI上限天','计时结果','Duration秒','Duration天','开始时间(北京时间 UTC+08:00)','扫描时间(北京时间 UTC+08:00)','时间来源','明细/错误'],level:'header'}];
    for(const item of s?.results||[])for(const rule of rules){
      const r=item.rules?.find(x=>x.name===rule.name),d=panelDuration(r,rule),effective=resultRule(r,rule);
      rows.push({level:d.level,jiraUrl:'https://jira.xpaas.lenovo.com/browse/'+encodeURIComponent(item.key),values:[item.key,item.summary,item.assignee||'',item.currentStatus||r?.currentStatus||'',rule.name,effective.minDays,effective.maxDays,r&&Number.isFinite(r.seconds)?d.text:r?.status||item.status,Number.isFinite(r?.seconds)?Number(r.seconds.toFixed(2)):'',r&&Number.isFinite(r.seconds)?Number(dayText(r.seconds)):'',beijingTime(r?.startAt),beijingTime(r?.checkedAt),r?.startAt?'History REST fetch 精确时间':'',(r?.details||item.details||'')+(r?.fridayShiftDays?'；周五KPI上下限提前'+r.fridayShiftDays+'天':'')]});
    }return rows;
  }
  function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);}
  el('[data-excel]').onclick=()=>download(new Blob([makeXlsx(exportRows())],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'Jira Monitor.xlsx');
  let detailRoute='';
  function autoDetail(){
    if(!detailOnly)return;
    hub.syncDetail();
    if(!hub.autoDetail)return;
    const batch=readState(STORE);
    if(batch?.active||batch?.paused||teamsSending)return;
    if(!isDetail()){
      if(detailRoute){epoch++;busy=false;detailRoute='';const previous=readState(DETAIL_STORE);if(previous?.active){previous.active=false;previous.phase='stopped';previous.message='离开详情，分析已取消';save(previous);}}
      return;
    }
    const key=keyOf(location.href);if(!key||detailRoute===key)return;
    try{const latest=GM_getValue(RULE_SETTING,CONFIG.rules);validateRules(latest);CONFIG.rules=latest;}catch(error){notice(safeError(error));return;}
    epoch++;busy=false;detailRoute=key;
    save({id:String(Date.now())+'-'+epoch,mode:'single',active:true,rules:JSON.parse(JSON.stringify(CONFIG.rules)),queue:[{key,summary:readSummary(),href:location.href}],index:0,results:[],phase:'reading',message:'正在自动分析 '+key});
    hub.openDetail();render();void pump();
  }
  addEventListener('pagehide',()=>{epoch++;busy=false;});
  addEventListener('pageshow',()=>{epoch++;busy=false;autoDetail();render();setTimeout(pump,800);});
  addEventListener('popstate',()=>{autoDetail();render();});
  setInterval(()=>{autoDetail();if(!host.isConnected)mountPanel();if(!badge.isConnected)document.documentElement.append(badge);pump();},1500);
  if(!detailOnly){hub.configure=configureCenter;hub.projects=projectConfigs;hub.target=projectTarget;hub.safeError=safeError;}else{hub.startDetail=autoDetail;hub.stopDetail=()=>{epoch++;busy=false;detailRoute='';const state=get();if(state?.active){state.active=false;state.phase='stopped';save(state);}};}
  badge.remove();badge.style.display='none';
  render();if(ruleLoadError)notice(ruleLoadError);badge.textContent='Jira Monitor v6.4.0 已启动 · 点击显示面板';badge.onclick=()=>{mountPanel();fold.textContent='收起';body.hidden=false;body.style.display='flex';panel.style.height=`min(${CONFIG.panelHeightPx}px,75vh)`;};autoDetail();setTimeout(pump,800);
  } catch(error) { report(error); }
}
initTimeout();initTimeout(true);

(function () {
  'use strict';
  const NONE = '∅';
  const STATUS_NAMES=['Completed','DEPLOYED','Grooming','In Progress','New','Open','Ready For Deploy','Ready For Test','Ready For UAT','SIT','Testing','UAT'];
  const normalized=name=>String(name||'').trim().replace(/\s+/g,' ').toLowerCase();
  function comparisonPeriod(now,mode='day'){
    const day=86400000,offset=8*3600000;
    const date=t=>new Date(t+offset).toISOString().slice(0,10);
    const midnight=Date.parse(date(now)+'T00:00:00+08:00');
    if(mode==='week'){
      const weekday=new Date(midnight+offset).getUTCDay();
      const monday=midnight-((weekday+6)%7)*day;
      return {cutoff:monday,before:'上周日终',after:'本周截至当前',rate:'周环比',created:'本周创建',
        description:`By week｜上周 ${date(monday-7*day)}～${date(monday-day)}（周日结束时） → 本周 ${date(monday)}～${date(monday+6*day)}（截至当前，未满周）`};
    }
    return {cutoff:midnight,before:'昨日日终',after:'今日截至当前',rate:'日环比',created:'今日创建',
      description:`By day｜昨日 ${date(midnight-day)}（日终） → 今日 ${date(now)}（截至当前）`};
  }
  function selectStatusGroups(source,selection){
    const names=selection===null?STATUS_NAMES:STATUS_NAMES.filter(n=>selection.includes(normalized(n)));
    const allowed=new Map(names.map(n=>[normalized(n),n]));
    return source.map(g=>{
      const rows=new Map();
      for(const row of g.rows.values()){
        const key=normalized(row.name);if(!allowed.has(key))continue;
        if(!rows.has(key))rows.set(key,{id:key,name:allowed.get(key),before:[],after:[]});
        rows.get(key).before.push(...row.before);rows.get(key).after.push(...row.after);
      }
      if(selection!==null)for(const [id,name] of allowed)if(!rows.has(id))rows.set(id,{id,name,before:[],after:[]});
      return {...g,rows,issues:g.issues.filter(x=>allowed.has(normalized(x.before?.name))||allowed.has(normalized(x.after?.name)))};
    });
  }
  function sprints(value) {
    return (Array.isArray(value) ? value : value ? [value] : []).map(v => {
      if (typeof v === 'object' && v !== null) {
        if (!/^\d+$/.test(String(v.id))) throw new Error('Sprint ID 无效');
        return { id: String(v.id), name: v.name || String(v.id), state: v.state || '' };
      }
      const id = /\bid=(\d+)/.exec(v), name = /\bname=(.*?)(?=,\w+=|\]$)/.exec(v), state = /\bstate=([^,\]]+)/.exec(v);
      if (!id) throw new Error('无法识别 Sprint 字段格式，请反馈版本和字段格式。');
      return { id: id[1], name: name ? name[1] : id[1], state: state ? state[1] : '' };
    });
  }
  function statusAt(issue, cutoff, inclusive = true) {
    const created = Date.parse(issue.fields.created);
    if (!Number.isFinite(created)) throw new Error(`${issue.key}: 创建时间无效`);
    if (inclusive ? created > cutoff : created >= cutoff) return null;
    let status = { id: String(issue.fields.status.id), name: issue.fields.status.name };
    const histories = [...issue.changelog.histories].sort((a,b) => Date.parse(b.created)-Date.parse(a.created) || Number(b.id)-Number(a.id));
    for (const h of histories) {
      const time = Date.parse(h.created);
      if (!Number.isFinite(time)) throw new Error(`${issue.key}: 变更时间无效`);
      if (inclusive ? time <= cutoff : time < cutoff) continue;
      for (const item of [...h.items].reverse()) {
        if (item.field === 'status' || item.fieldId === 'status') {
          if (item.from == null || !item.fromString) throw new Error(`${issue.key}: 状态历史不完整`);
          status = { id: String(item.from), name: item.fromString };
        }
      }
    }
    return status;
  }
  function rate(a,b) { return a === 0 ? (b === 0 ? '—' : '新增') : `${((b-a)/a*100).toFixed(1)}%`; }
  function aggregate(issues, field, selected, cutoff, now) {
    const groups = new Map();
    for (const issue of issues) {
      const memberships = sprints(issue.fields[field]);
      const ids = memberships.length ? [...new Set(memberships.map(s=>s.id))] : [NONE];
      const before = statusAt(issue, cutoff, false), after = statusAt(issue, now);
      for (const id of ids.filter(id=>selected.includes(id))) {
        if (!groups.has(id)) groups.set(id, {id, name: memberships.find(s=>s.id===id)?.name || '未分配 Sprint', rows:new Map(), issues:[]});
        const g=groups.get(id);
        for (const [side,status] of [['before',before],['after',after]]) {
          if (!status) continue;
          if (!g.rows.has(status.id)) g.rows.set(status.id,{id:status.id,name:status.name,before:[],after:[]});
          g.rows.get(status.id)[side].push(issue);
        }
        g.issues.push({issue,before,after,changed:before?.id!==after?.id});
      }
    }
    return [...groups.values()];
  }
  function matchesSprint(issue,field,ids){
    const list=sprints(issue.fields[field]);
    return list.length ? list.some(x=>ids.includes(x.id)) : ids.includes(NONE);
  }
  function filterGroups(source,statusIds){
    if(statusIds===null)return source;
    const allowed=new Set(statusIds);
    return source.map(g=>({...g,rows:new Map([...g.rows].filter(([id])=>allowed.has(id))),
      issues:g.issues.filter(x=>allowed.has(x.before?.id)||allowed.has(x.after?.id))}));
  }
  function rowsWithTotal(g){
    const rows=[...g.rows.values()].sort((a,b)=>a.name.localeCompare(b.name));
    return [...rows,{name:'所选状态合计',before:rows.flatMap(r=>r.before),after:rows.flatMap(r=>r.after)}];
  }
  function csvCell(v) { let s=String(v ?? ''); if (/^[\s]*[=+\-@]/.test(s)) s="'"+s; return '"'+s.replaceAll('"','""')+'"'; }
  function pageQuery(doc, href) {
    const url = new URL(href);
    // The visible advanced search editor takes precedence over an old saved-filter ID.
    for (const selector of ['#jqltextarea', 'textarea[name="jqlQuery"]', 'input[name="jql"]']) {
      const el = doc.querySelector(selector);
      let visible=!!el;
      for(let node=el;node && visible;node=node.parentElement){
        const style=doc.defaultView?.getComputedStyle(node);
        if(node.hidden || node.getAttribute('aria-hidden')==='true' || style?.display==='none' || style?.visibility==='hidden')visible=false;
      }
      if (visible && el.value?.trim() && !el.disabled) {
        return {jql:el.value.trim(), source:'当前页面 JQL'};
      }
    }
    const jql=url.searchParams.get('jql');
    if(jql?.trim()) return {jql:jql.trim(),source:'当前页面 URL JQL'};
    const key=/\/browse\/([A-Z][A-Z0-9_]*-\d+)/i.exec(url.pathname)?.[1];
    if(key) return {jql:'key = "'+key+'"',source:'当前任务页面'};
    const filter=url.searchParams.get('filter');
    if(filter && /^\d+$/.test(filter)) return {filter,source:'当前页面查询（从页面筛选器解析）'};
    throw new Error('无法识别当前页面的查询条件。请在 Jira 问题列表点击 Search，或切换 Advanced 后重新载入。');
  }
  function validateTeamsUrl(value){
    let u;try{u=new URL(String(value).trim().replace(/\\&/g,'&').replace(/&amp;/g,'&'));}catch{throw new Error('请输入有效的 Teams Workflows HTTPS Webhook 地址。');}
    const allowed=['logic.azure.com','api.powerplatform.com','api.powerautomate.com'];
    if(u.protocol!=='https:'||u.username||u.password||u.hash||u.port||!allowed.some(h=>u.hostname.endsWith('.'+h))||!u.pathname.includes('/workflows/'))throw new Error('仅支持微软 Teams Workflows 的 HTTPS 地址（logic.azure.com / api.powerplatform.com / api.powerautomate.com），不支持旧版 Connector。');
    return u.href;
  }
  function teamsResponseInfo(response={}){
    const parts=[];
    if(Number.isFinite(response.status))parts.push('HTTP '+response.status);
    if(Number.isFinite(response.readyState))parts.push('readyState '+response.readyState);
    let code='';try{code=JSON.parse(response.responseText||'{}').error?.code||'';}catch{}
    if(/^[A-Za-z0-9_.-]{1,100}$/.test(code))parts.push(code);
    const raw=String(response.error||response.message||'');
    const network=/\b(?:net::)?ERR_[A-Z0-9_]+\b/.exec(raw)?.[0];if(network)parts.push(network);
    if(/not permitted|not allowed|refused to connect|whitelist|blocked by.*user/i.test(raw))parts.push('油猴连接授权被拒绝，请检查脚本设置中的用户域名白名单');
    // Do not include raw error strings, response bodies or URLs: they may contain the webhook signature.
    return parts.join('；')||'浏览器/扩展未提供 HTTP 响应';
  }
  function buildTeamsReport(groups,meta,period,jiraUrl){
    const block=(value,extra={})=>({type:'TextBlock',text:String(value),wrap:true,...extra});
    const columns=(values,header=false)=>({type:'ColumnSet',spacing:'Medium',separator:!header,columns:values.map((value,i)=>({
      type:'Column',width:['stretch','42px','42px','50px','64px'][i],spacing:'Small',items:[{type:'TextBlock',text:String(value),...(i?{horizontalAlignment:'Center'}:{wrap:true,horizontalAlignment:'Left'}),...(header?{weight:'Bolder'}:{})}]
    }))});
    const heading=['状态',period.before==='上周日终'?'上周末':'昨日',period.after==='本周截至当前'?'本周':'今日','增减',period.rate];
    const generated=meta.split('｜')[0].trim();
    const body=[block('Sprint Analysis',{size:'Large',weight:'Bolder',color:'Accent'}),
      block(period.description,{size:'Small'}),block(generated,{size:'Small',isSubtle:true,spacing:'Small'})];
    const sections=[];
    for(const g of groups){
      const rows=rowsWithTotal(g),total=rows.at(-1),changes=g.issues.filter(x=>x.changed).length,created=g.issues.filter(x=>!x.before&&x.after).length;
      const model={name:g.name,id:g.id,changes,created,rows:rows.map(r=>{const a=r.before.length,b=r.after.length,d=b-a;return [r.name,String(a),String(b),(d>0?'+':'')+d,rate(a,b)];})};sections.push(model);
      const metrics=[['当前数量',total.after.length],['净状态变化',changes],[period.created,created]];
      const items=[block(g.name,{size:'Medium',weight:'Bolder'}),block('Sprint #'+g.id,{size:'Small',isSubtle:true,spacing:'None'}),
        {type:'ColumnSet',columns:metrics.map(([label,value])=>({type:'Column',width:1,items:[block(value,{size:'Large',weight:'Bolder',color:'Accent',horizontalAlignment:'Center'}),block(label,{size:'Small',isSubtle:true,spacing:'None',horizontalAlignment:'Center'})]}))},
        columns(heading,true)];
      for(let i=0;i<model.rows.length;i++){
        const values=model.rows[i],isTotal=i===model.rows.length-1,row=columns(values,isTotal);row.separator=true;
        if(values[3]!=='0')row.columns[3].items[0].color=Number(values[3])>0?'Attention':'Accent';
        items.push(row);
      }
      body.push({type:'Container',separator:true,spacing:'Large',items});
    }
    body.push(block('当前成员回溯 · 仅统计所选状态 · 数量增减不代表好坏',{size:'Small',isSubtle:true,separator:true}),
      {type:'Container',id:'analysis-details',isVisible:false,items:[block(meta,{size:'Small',isSubtle:true})]});
    const payload={type:'message',attachments:[{contentType:'application/vnd.microsoft.card.adaptive',contentUrl:null,content:{$schema:'http://adaptivecards.io/schemas/adaptive-card.json',type:'AdaptiveCard',version:'1.2',msteams:{width:'Full'},body,actions:[
      {type:'Action.OpenUrl',title:'打开 Jira 查询',url:jiraUrl},{type:'Action.ToggleVisibility',title:'统计口径与查询条件',targetElements:['analysis-details']}
    ]}}]};
    return {payload,sections,heading,generated,meta,description:period.description,jiraUrl,period};
  }
  const core = {sprints,statusAt,rate,aggregate,csvCell,pageQuery,matchesSprint,filterGroups,rowsWithTotal,STATUS_NAMES,normalized,comparisonPeriod,selectStatusGroups,validateTeamsUrl,buildTeamsReport,teamsResponseInfo};
  if (typeof window === 'undefined' && typeof module === 'object' && module.exports) { module.exports = core; return; }
  // An older duplicate userscript may run first. Replace its panel rather than silently exiting.
  const existing=document.getElementById('jsa-host');
  if(existing){
    const previous=existing.dataset.jsaVersion||existing.shadowRoot?.querySelector('h1 small')?.textContent?.replace(/^v/,'')||'0.0.0';
    const parts=v=>v.split('.').map(Number),a=parts(previous),b=parts('0.1.9');
    const comparison=a.reduce((r,n,i)=>r||n-(b[i]||0),0);
    if(comparison>=0)return;
    existing.remove();
  }
  const host=document.createElement('div'); host.id='jsa-host';host.dataset.jsaVersion='0.1.9'; hub.sprint.append(host);
  const root=host.attachShadow({mode:'open'});
  root.innerHTML=`<style>
  :host{all:initial;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172b4d}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer;border:1px solid #c9d3e0;border-radius:6px;background:white;color:#172b4d;padding:7px 12px}button:hover{background:#edf3ff}.primary:hover,#launch:hover{background:#0747a6}#close{white-space:nowrap}button:disabled{opacity:.5;cursor:wait}.primary,#launch{background:#0052cc;color:white;border-color:#0052cc}#launch{position:fixed;right:24px;bottom:24px;z-index:2147483646;box-shadow:0 5px 20px #091e4240}#overlay{position:fixed;inset:0;background:#091e4260;z-index:2147483647;padding:3vh 3vw;display:none}#panel{background:#f7f9fc;border-radius:14px;max-width:1280px;margin:auto;height:94vh;overflow:auto;box-shadow:0 20px 80px #091e4255;padding:24px}header{display:flex;align-items:center;justify-content:space-between}h1{font-size:24px;margin:0}h2{font-size:17px;margin:0 0 12px}.muted{color:#5e6c84}p{margin:8px 0}.controls{display:flex;gap:16px;align-items:end;flex-wrap:wrap;margin:18px 0}label{display:flex;flex-direction:column;gap:5px}input,select{border:1px solid #b3bfd0;border-radius:5px;padding:7px;background:white;color:#172b4d}fieldset{margin:0;border:1px solid #b3bfd0;border-radius:6px;padding:8px;background:white;min-width:280px;max-width:100%}.choices{height:140px;overflow:auto;max-width:430px}.choices label{display:flex;flex-direction:row;align-items:center;gap:8px;padding:3px;cursor:pointer}.choices input{margin:0}.tools{display:flex;gap:8px;margin-bottom:5px}.tools button{padding:2px 8px}legend{padding:0 5px}.card{overflow-x:auto;background:white;border:1px solid #dfe5ed;border-radius:9px;margin:16px 0;padding:18px}.notice{padding:10px 14px;background:#eaf1ff;border-radius:6px}#message{white-space:pre-wrap}#message.error{background:#fff0ed;color:#ae2a19;padding:12px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;border-bottom:1px solid #e8ecf2;padding:9px 10px}th{background:#f4f6fa;color:#5e6c84}td button{border:0;padding:0;color:#0052cc;background:none;text-decoration:underline}.delta{font-variant-numeric:tabular-nums;font-weight:600}a{color:#0052cc}#detail{overflow:auto}small{font-size:12px}@media(max-width:650px){#panel{padding:14px}.controls{display:block}label{margin:10px 0}#sprints{min-width:0;width:100%}th,td{padding:6px}h1{font-size:20px}}
  </style><button id="launch">◷ Sprint Analysis v0.1.9</button><div id="overlay"><section id="panel" role="dialog" aria-modal="true" aria-label="Sprint Analysis"><header><div><h1>Sprint Analysis <small class="muted">v0.1.9</small></h1><p class="muted"><span id="period-description"></span> · Asia/Shanghai（UTC+08:00）</p></div><button id="close" aria-label="关闭">关闭</button></header>
  <div class="notice">口径：以本次查询匹配的成员回溯对比时点的状态；不还原历史 Sprint 成员或历史筛选条件。已关闭 Sprint 也可能保留在任务 Sprint 字段中；同一任务可出现在多个 Sprint，各 Sprint 不可直接相加。</div>
  <div class="controls"><label>对比维度<select id="period"><option value="day">By day · 昨天 / 今天</option><option value="week">By week · 上周 / 本周（周一至周日）</option></select></label><button id="load">载入当前页面（全部分页）</button><fieldset id="sprint-box"><legend>Sprint（勾选，可多选）</legend><div class="tools"><button id="sprint-all" type="button">全选</button><button id="sprint-none" type="button">清空</button></div><div id="sprints" class="choices"></div></fieldset><fieldset id="status-box"><legend>状态（默认全部，可多选）</legend><label><input type="checkbox" id="status-all" checked>全部指定状态（以下 12 个）</label><p class="muted">直接勾选下面的状态即可切换为指定状态。</p><div id="statuses" class="choices"></div></fieldset><button id="run" class="primary">开始分析</button><button id="export" disabled>导出 CSV</button><button id="report-export" disabled>导出交互报告</button><label class="report-option"><input id="attach-report" type="checkbox" checked>邮件附交互报告（含 Jira 明细）</label><fieldset id="notify-box"><legend>推送项目（可多选）</legend><div id="notify-project" role="group" aria-label="推送项目（可多选）"></div></fieldset><button id="teams-preview" disabled>预览并推送到 Teams</button></div>
  <p class="muted">统计当前页面查询的全部分页，不扩大到整个 Sprint。修改 Jira 搜索条件后请先点击 Search，再重新载入。若页面排除了已解决任务，完成数量也会受限。</p><p id="message" role="status">点击“载入当前页面”读取全部结果；本工具只读取 Jira，不修改任务。</p><div id="results"></div><div id="detail"></div></section></div>`;
  const teamsDialog=document.createElement('div');teamsDialog.id='teams-dialog';teamsDialog.setAttribute('role','dialog');teamsDialog.setAttribute('aria-modal','true');teamsDialog.style.cssText='display:none;position:fixed;inset:0;background:#091e4280;z-index:2147483647;padding:4vh 4vw;overflow:auto';
  const teamsBox=document.createElement('section');teamsBox.className='card';teamsBox.style.cssText='max-width:900px;margin:0 auto;padding:24px;max-height:90vh;overflow:auto';teamsDialog.append(teamsBox);root.append(teamsDialog);
  const $=id=>root.getElementById(id); let reportIssues=[], reportIds=[], reportStatuses=null, reportNow=0; let field, groups=[], busy=false, reportMeta='', loadedQuery='', reportJiraUrl='', activePeriod=comparisonPeriod(Date.now());
  $('period-description').textContent=activePeriod.description;
  const message=(s,error=false)=>{ $('message').textContent=s; $('message').className=error?'error':''; };
  function text(tag,content,parent){const e=document.createElement(tag); e.textContent=content; parent.append(e); return e;}
  async function api(path) {
    const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),30000);
    try {
      const res=await fetch(path,{credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});
      if (!res.ok) throw new Error(`Jira HTTP ${res.status}：${res.status===401||res.status===403?'请先登录并确认筛选器/任务访问权限。':'请求失败，请稍后重试或检查接口权限。'}`);
      if (!res.headers.get('content-type')?.includes('application/json')) throw new Error('Jira 返回了登录页或非 JSON 内容，请先登录 Jira 后重试。');
      return await res.json();
    } finally {clearTimeout(timeout);}
  }
  async function currentQuery(){
    const query=pageQuery(document,location.href);
    if(query.jql)return query.jql;
    const data=await api('/rest/api/2/filter/'+query.filter);
    if(!data.jql?.trim())throw new Error('当前页面未返回有效的 JQL，请切换 Advanced 后重新载入。');
    return data.jql.trim();
  }
  async function detectField(){
    if(field)return field;
    const fields=await api('/rest/api/2/field');
    const candidates=fields.filter(f=>f.schema?.custom==='com.pyxis.greenhopper.jira:gh-sprint');
    if(candidates.length!==1)throw new Error('无法唯一识别 Sprint 自定义字段，请向维护者反馈 /rest/api/2/field 中的 Sprint 字段定义。');
    return field=candidates[0].id;
  }
  async function search(jql){
    let start=0,total,all=[]; const seen=new Set();
    do {
      const params=new URLSearchParams({jql,fields:`summary,status,created,updated,${field}`,startAt:String(start),maxResults:'100'});
      const page=await api('/rest/api/2/search?'+params);
      if(!Array.isArray(page.issues)||!Number.isFinite(page.total))throw new Error('搜索接口响应格式不支持');
      if(total!==undefined&&total!==page.total)throw new Error('查询过程中任务数量发生变化，请重试以免分页遗漏。');
      total=page.total;
      if(!page.issues.length && start<total)throw new Error('分页提前结束，已停止统计以避免遗漏。');
      for(const issue of page.issues){if(seen.has(issue.key))throw new Error('分页出现重复任务，请重试。');seen.add(issue.key);all.push(issue);}
      start+=page.issues.length;message(`读取任务 ${start} / ${total}…`);
    }while(start<total);
    return all;
  }
  async function history(issue){
    const params=new URLSearchParams({fields:`summary,status,created,updated,${field}`,expand:'changelog'});
    const full=await api('/rest/api/2/issue/'+encodeURIComponent(issue.key)+'?'+params);
    // The issue detail is authoritative. Search-index timestamps can differ or lag.
    // Never infer an actual user edit from a raw updated-string mismatch.
    let c=full.changelog;
    if(!c||!Array.isArray(c.histories)||!Number.isFinite(c.total))throw new Error(`${issue.key} 未返回可验证完整性的变更历史。`);
    if((c.startAt||0)!==0||c.histories.length!==c.total){
      let histories=[],start=0,total;
      do {
        let p;try{p=await api('/rest/api/2/issue/'+encodeURIComponent(issue.key)+'/changelog?startAt='+start+'&maxResults=100');}catch{throw new Error(`${issue.key} 历史被截断，且服务器不支持完整历史分页；本次结果不生成。`);}
        const values=p.values||p.histories;
        if(!Array.isArray(values)||!Number.isFinite(p.total)||(total!==undefined&&p.total!==total)||(!values.length&&start<p.total))throw new Error(`${issue.key} 历史分页不完整，请重试。`);
        total=p.total;histories.push(...values);start+=values.length;
      }while(start<total);
      if(new Set(histories.map(h=>h.id)).size!==total)throw new Error(`${issue.key} 历史分页重复或缺失。`);
      c=full.changelog={histories,total};
    }
    return full;
  }
  async function guard(job){
    if(busy)return;busy=true;const controls=['load','run','sprint-box','status-box','period'];controls.forEach(id=>$(id).disabled=true);$('report-export').disabled=$('export').disabled=true;$('teams-preview').disabled=true;
    groups=[];$('results').replaceChildren();$('detail').replaceChildren();
    try{await job();}catch(e){message(e.name==='AbortError'?'请求超过 30 秒，请检查网络或 VPN 后重试。':e.message,true);}finally{busy=false;controls.forEach(id=>$(id).disabled=false);$('report-export').disabled=$('export').disabled=!groups.length;$('teams-preview').disabled=!groups.length;}
  }
  function selected(){return [...$('sprints').querySelectorAll('input:checked')].map(o=>o.value);}
  function selectedStatuses(){return $('status-all').checked?null:[...$('statuses').querySelectorAll('input:checked')].map(o=>o.value);}
  function choice(parent,id,name,checked){
    const label=document.createElement('label'), input=document.createElement('input');input.type='checkbox';input.value=id;input.checked=checked;label.append(input,document.createTextNode(name));parent.append(label);
  }
  function invalidate(){if(busy)return;groups=[];$('results').replaceChildren();$('detail').replaceChildren();$('report-export').disabled=$('export').disabled=true;$('teams-preview').disabled=true;message(`已选择 ${selected().length} 个 Sprint；状态：${$('status-all').checked?'全部':selectedStatuses().length+' 项'}。请点击“开始分析”。`);}
  $('period').onchange=()=>{$('period-description').textContent=comparisonPeriod(Date.now(),$('period').value).description;invalidate();};
  $('sprints').onchange=invalidate;
  $('statuses').onchange=()=>{$('status-all').checked=false;invalidate();};
  $('status-all').onchange=()=>{for(const x of $('statuses').querySelectorAll('input'))x.checked=false;invalidate();};
  for(const [id,checked] of [['sprint-all',true],['sprint-none',false]])$(id).onclick=()=>{for(const x of $('sprints').querySelectorAll('input'))x.checked=checked;invalidate();};
  async function load(){
    loadedQuery='';$('sprints').replaceChildren();
    await detectField();const query=await currentQuery(), issues=await search(query), map=new Map();
    for(const i of issues){const list=sprints(i.fields[field]);if(!list.length)map.set(NONE,{id:NONE,name:'未分配 Sprint',state:''});for(const s of list)map.set(s.id,s);}
    $('sprints').replaceChildren();
    const options=[...map.values()].sort((a,b)=>(/active/i.test(b.state)?1:0)-(/active/i.test(a.state)?1:0)||b.name.localeCompare(a.name));
    for(const s of options)choice($('sprints'),s.id,`${s.name}${s.state?' · '+s.state:''} [${s.id}]`,/^active$/i.test(s.state));
    if(!selected().length&&$('sprints').querySelector('input'))$('sprints').querySelector('input').checked=true;
    $('statuses').replaceChildren();$('status-all').checked=true;
    for(const name of STATUS_NAMES)choice($('statuses'),normalized(name),name,false);
    loadedQuery=query;
    message(`已读取当前页面全部 ${issues.length} 条任务、${options.length} 个 Sprint 分组。可多选后分析。\nJQL：${loadedQuery}${issues.length?'':'（当前页面没有可见任务）'}`);
  }
  function details(title,items){
    const box=$('detail');box.replaceChildren();box.className='card';text('h2',title,box);
    const table=document.createElement('table');box.append(table);const tr=document.createElement('tr');table.append(tr);['Issue','摘要',activePeriod.before+' → '+activePeriod.after].forEach(h=>text('th',h,tr));
    for(const x of items){const row=document.createElement('tr');table.append(row);const td=document.createElement('td');row.append(td);const a=text('a',x.issue.key,td);a.href='/browse/'+encodeURIComponent(x.issue.key);a.target='_blank';a.rel='noopener noreferrer';text('td',x.issue.fields.summary,row);text('td',`${x.before?.name||'尚未创建'} → ${x.after?.name||'尚未创建'}`,row);}
    if(!items.length)text('p','没有对应任务。',box);
    box.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function render(){
    const result=$('results');result.replaceChildren();text('p',reportMeta,result);
    for(const g of groups){
      const card=document.createElement('section');card.className='card';result.append(card);text('h2',g.name+' · '+g.id,card);
      const changes=g.issues.filter(x=>x.changed), created=g.issues.filter(x=>!x.before&&x.after);
      const detail=text('button',`查看变化 ${changes.length} 条（${activePeriod.created} ${created.length} 条）`,card);detail.onclick=()=>details(g.name+' · 净状态变化 / 新建任务',changes);
      const table=document.createElement('table');card.append(table);const head=document.createElement('tr');table.append(head);['状态',activePeriod.before,activePeriod.after,'增减',activePeriod.rate].forEach(h=>text('th',h,head));
      const rows=rowsWithTotal(g);
      for(const r of rows){const tr=document.createElement('tr');table.append(tr);text('td',r.name,tr);for(const side of ['before','after']){const td=document.createElement('td');tr.append(td);const b=text('button',String(r[side].length),td);b.onclick=()=>{const keys=new Set(r[side].map(i=>i.key));details(`${g.name} · ${r.name} · ${side==='before'?activePeriod.before:activePeriod.after}`,g.issues.filter(x=>keys.has(x.issue.key)));};}const delta=r.after.length-r.before.length;text('td',(delta>0?'+':'')+delta,tr).className='delta';text('td',rate(r.before.length,r.after.length),tr);}
    }
  }
  async function run(){
    const ids=selected();if(!ids.length)throw new Error('请先载入并选择 Sprint。');await detectField();
    const statusIds=selectedStatuses();if(statusIds!==null&&!statusIds.length)throw new Error('请至少选择一个状态，或勾选全部状态。');
    const jql=await currentQuery();
    if(jql!==loadedQuery)throw new Error('当前页面查询已改变，请重新“载入当前页面”后再分析。');
    const now=Date.now();activePeriod=comparisonPeriod(now,$('period').value);const cutoff=activePeriod.cutoff;
    $('period-description').textContent=activePeriod.description;
    const pageIssues=await search(jql), issues=pageIssues.filter(i=>matchesSprint(i,field,ids)), full=new Array(issues.length);let cursor=0,done=0,failed;
    await Promise.all(Array.from({length:Math.min(3,issues.length)},async()=>{while(cursor<issues.length&&!failed){const i=cursor++;try{full[i]=await history(issues[i]);message(`读取完整历史 ${++done} / ${issues.length}…`);}catch(e){failed=e;}}}));
    if(failed)throw failed;
    const scoped=full.filter(i=>matchesSprint(i,field,ids));
    const allGroups=aggregate(scoped,field,ids,cutoff,now);
    const calculated=selectStatusGroups(allGroups,statusIds);
    const stateNames=statusIds===null?'全部指定的 12 个状态':[...$('statuses').querySelectorAll('input:checked')].map(x=>x.parentElement.textContent).join('、');
    reportMeta=`查询开始 ${new Date(now).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}（上海）｜${activePeriod.description}｜当前页面全部分页｜JQL：${jql}｜所选 Sprint：${ids.join("、")}｜状态：${stateNames}｜当前成员回溯`;
    reportJiraUrl=location.origin+'/issues/?'+new URLSearchParams({jql});
    reportIssues=scoped;reportIds=ids;reportStatuses=statusIds;reportNow=now;
    groups=calculated;const picker=$('notify-project');picker.replaceChildren();for(const key of [...new Set(scoped.map(i=>i.key.split('-')[0].toUpperCase()))].sort()){const label=text('label','',picker);const input=document.createElement('input');input.type='checkbox';input.value=key;input.checked=true;label.append(input,document.createTextNode(key));}render();message(`分析完成：页面共 ${pageIssues.length} 条；所选 Sprint 匹配 ${scoped.length} 条；所选状态涉及 ${new Set(groups.flatMap(g=>g.issues.map(x=>x.issue.key))).size} 条，${groups.length} 个 Sprint 分组。合计仅包含所选状态。`);
  }
// Self-contained snapshot: no Jira API, authentication tokens, or external assets.
function buildInteractiveReport(model){
  const data=JSON.stringify(model).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jira Monitor · Sprint 报告</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f6fc;color:#24334d;font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif}header{background:white;border-bottom:1px solid #e0e7f1;padding:20px max(24px,calc((100vw - 1120px)/2))}h1{font-size:24px;margin:0}h2{font-size:18px;margin:0 0 10px}small,.muted{color:#7b899e;font-size:12px}main{max-width:1168px;padding:24px;margin:auto}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:16px 0}.card{background:white;border:1px solid #e0e7f1;border-radius:12px;padding:20px;margin:16px 0;overflow-x:auto}button,select,input,a.action{font:inherit;border:1px solid #d9e2f1;border-radius:7px;padding:7px 12px;background:white;color:#245de8;cursor:pointer}input{color:#24334d;min-width:230px}.action{text-decoration:none}table{width:100%;border-collapse:collapse}th,td{padding:11px 12px;border-bottom:1px solid #edf1f7;text-align:left;vertical-align:top}th{background:#f3f6fc;color:#738198;font-size:12px}td.number,th.number{text-align:center}td.number button{border:0;padding:0;background:none;text-decoration:underline;font-variant-numeric:tabular-nums}tr.total{background:#edf3ff;font-weight:700}.positive{color:#d13438}.changed{background:#fff9eb}a{color:#245de8}#detail{border-top:3px solid #245de8;scroll-margin-top:16px}.tag{display:inline-block;background:#eaf0ff;color:#245de8;font-size:11px;padding:3px 8px;border-radius:5px;margin-left:8px}#meta{white-space:pre-wrap;overflow-wrap:anywhere}#empty{color:#7b899e}@media(max-width:640px){main{padding:12px}.card{padding:12px}th,td{padding:8px}h1{font-size:20px}}@media print{body{background:white}.toolbar,button{display:none}.card{break-inside:avoid}}
</style></head><body><header><h1>Jira Monitor <span class="tag">Sprint Analysis</span></h1><small>独立交互报告 · 分析快照</small></header><main><p id="period"></p><div class="toolbar"><label>项目 <select id="project"></select></label><button id="all-changes">查看全部变化</button><a id="jira-query" class="action" target="_blank" rel="noopener noreferrer">打开 Jira 查询</a></div><p class="muted">点击昨日 / 今日数字，在下方查看对应工单及状态前后变化；报告保持生成时的数据，不会自动更新。</p><div id="groups"></div><section id="detail" class="card" hidden><h2 id="detail-title"></h2><div class="toolbar"><input id="search" placeholder="筛选 Jira 编号或摘要" aria-label="筛选明细"><span id="detail-count" class="muted"></span></div><table><thead><tr><th>Issue</th><th>摘要</th><th id="before-heading"></th><th id="after-heading"></th><th>变化</th></tr></thead><tbody id="detail-rows"></tbody></table><p id="empty" hidden>没有对应任务。</p></section><details class="card"><summary>统计口径与查询条件</summary><p id="meta" class="muted"></p></details></main><script id="report-data" type="application/json">${data}</script><script>
(${reportRuntime.toString()})();
</script></body></html>`;
}
function reportRuntime(){
 'use strict';
 const model=JSON.parse(document.getElementById('report-data').textContent),$=id=>document.getElementById(id);
 function el(tag,value,parent){const n=document.createElement(tag);if(value!==null)n.textContent=String(value);parent.append(n);return n;}
 function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'?u.href:'';}catch{return '';}}
 const jira=safeUrl(model.jiraUrl);$('jira-query').href=jira||'#';$('period').textContent=model.period.description;$('meta').textContent=model.meta;
 $('before-heading').textContent=model.period.before;$('after-heading').textContent=model.period.after;
 const projectOf=key=>key.split('-')[0];let selection=[],detailTitle='';
 const keys=[...new Set(model.groups.flatMap(g=>g.issues.map(i=>projectOf(i.key))))].sort();el('option','全部项目',$('project')).value='';for(const key of keys)el('option',key,$('project')).value=key;
 function filtered(issues){return issues.filter(i=>!$('project').value||projectOf(i.key)===$('project').value);}
 function renderDetails(){
   const term=$('search').value.trim().toLowerCase(),items=selection.filter(i=>(i.key+' '+i.summary).toLowerCase().includes(term));$('detail-rows').replaceChildren();$('detail-title').textContent=detailTitle;$('detail-count').textContent=items.length+' / '+selection.length+' 条';$('empty').hidden=items.length>0;
   for(const item of items){const tr=el('tr',null,$('detail-rows'));if(item.before!==item.after)tr.className='changed';const td=el('td',null,tr),link=el('a',item.key,td);if(jira){link.href=new URL('/browse/'+encodeURIComponent(item.key),jira).href;link.target='_blank';link.rel='noopener noreferrer';}el('td',item.summary,tr);el('td',item.before||'尚未创建',tr);el('td',item.after||'尚未创建',tr);el('td',!item.before?'新建':item.before!==item.after?'状态变化':'未变化',tr);}
 }
 function show(title,items){selection=items;detailTitle=title;$('search').value='';$('detail').hidden=false;renderDetails();$('detail').scrollIntoView?.({behavior:'smooth',block:'start'});}
 function render(){
  $('groups').replaceChildren();$('detail').hidden=true;
  for(const group of model.groups){const issues=filtered(group.issues);if(!issues.length&&$('project').value)continue;const byKey=new Map(issues.map(i=>[i.key,i]));const card=el('section',null,$('groups'));card.className='card';el('h2',group.name+' · '+group.id,card);const changed=issues.filter(i=>i.changed),created=issues.filter(i=>!i.before&&i.after);el('button','查看变化 '+changed.length+' 条（新建 '+created.length+' 条）',card).onclick=()=>show(group.name+' · 净状态变化 / 新建任务',changed);
   const table=el('table',null,card),head=el('tr',null,el('thead',null,table));['状态',model.period.before,model.period.after,'增减',model.period.rate].forEach((h,i)=>{const th=el('th',h,head);if(i)th.className='number';});const body=el('tbody',null,table);
   for(const row of group.rows){const tr=el('tr',null,body);if(row.total)tr.className='total';el('td',row.name,tr);const sets={};for(const side of ['before','after']){sets[side]=row[side].filter(k=>byKey.has(k));const td=el('td',null,tr);td.className='number';const button=el('button',sets[side].length,td);button.setAttribute('aria-label',group.name+' '+row.name+' '+model.period[side]+'明细');button.onclick=()=>show(group.name+' · '+row.name+' · '+model.period[side],sets[side].map(k=>byKey.get(k)));}const a=sets.before.length,b=sets.after.length,delta=b-a;el('td',(delta>0?'+':'')+delta,tr).className='number'+(delta>0?' positive':'');el('td',a===0?(b===0?'—':'新增'):((b-a)/a*100).toFixed(1)+'%',tr).className='number';}
  }
 }
 $('project').onchange=render;$('search').oninput=renderDetails;$('all-changes').onclick=()=>{const map=new Map();for(const g of model.groups)for(const i of filtered(g.issues))if(i.changed)map.set(i.key,i);show('全部 Sprint · 净状态变化 / 新建任务',[...map.values()]);};render();
}
if(typeof module==='object'&&module.exports)module.exports={buildInteractiveReport};

  function reportModel(source=groups){
    return {version:1,meta:reportMeta,jiraUrl:reportJiraUrl,period:activePeriod,generatedAt:new Date(reportNow).toISOString(),groups:source.map(group=>{const rows=rowsWithTotal(group);return {id:group.id,name:group.name,issues:group.issues.map(x=>({key:x.issue.key,summary:x.issue.fields.summary||'',before:x.before?.name||'',after:x.after?.name||'',changed:x.changed})),rows:rows.map((row,i)=>({name:row.name,total:i===rows.length-1,before:row.before.map(x=>x.key),after:row.after.map(x=>x.key)}))};})};
  }
  function reportFile(source=groups,project='all'){
    return {name:'Jira-Monitor-'+project+'-'+new Date(reportNow).toISOString().replace(/[:.]/g,'-')+'.html',html:buildInteractiveReport(reportModel(source))};
  }
  function downloadReport(file){const url=URL.createObjectURL(new Blob([file.html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
  function reportBase64(html){const bytes=new TextEncoder().encode(html);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
  $('report-export').onclick=()=>{if(!busy&&groups.length)downloadReport(reportFile());};

  let teamsSending=false,teamsFocus;
  function openTeams(title){
    teamsFocus=root.activeElement||document.activeElement;teamsBox.replaceChildren();text('h2',title,teamsBox);teamsDialog.style.display='block';teamsDialog.setAttribute('aria-label',title);
  }
  function closeTeams(){if(teamsSending)return;teamsDialog.style.display='none';teamsBox.replaceChildren();teamsFocus?.focus();}
  function teamsButton(id,label,action){const b=text('button',label,teamsBox);b.id=id;b.style.margin='8px 8px 0 0';b.onclick=action;return b;}
  function teamsConfig(){hub.configure();}
  function teamsPreview(){
    if(busy||teamsSending||!groups.length)return;
    const keys=[...$('notify-project').querySelectorAll('input:checked')].map(input=>input.value);
    if(!keys.length){message('请至少勾选一个推送项目。',true);return;}
    try{
      // Freeze each project's report and destination before displaying the confirmation.
      const deliveries=keys.map(projectKey=>{
        const configured=hub.target(projectKey+'-1');
        if(!configured?.webhook)throw Error(projectKey+' 未配置 Webhook，请先在配置中心保存。未发送任何消息。');
        const target={...configured,recipients:[...(configured.recipients||[])]},destination=validateTeamsUrl(target.webhook);
        const projectIssues=reportIssues.filter(i=>i.key.split('-')[0].toUpperCase()===projectKey);
        if(!projectIssues.length)throw Error(projectKey+' 在本次报告中没有任务，请重新分析。');
        const projectGroups=selectStatusGroups(aggregate(projectIssues,field,reportIds,activePeriod.cutoff,reportNow),reportStatuses);
        const report=buildTeamsReport(projectGroups,reportMeta+'｜仅项目 '+projectKey,activePeriod,reportJiraUrl);
        const bodyText=projectKey+' · '+report.description+'\n'+report.sections.map(section=>section.name+'\n'+[report.heading,...section.rows].map(row=>row.join(' | ')).join('\n')).join('\n\n');
        report.payload.projectKey=projectKey;report.payload.reportType='sprint-analysis';
        report.payload.email=target.recipients.length?{enabled:true,recipients:target.recipients,to:target.recipients.join(';'),subject:'[Jira Monitor] '+projectKey+' · Sprint Analysis',bodyText,bodyHtml:hub.emailCard({title:projectKey+' · Sprint Analysis',subtitle:report.description,sections:report.sections.map(section=>({title:section.name,headers:report.heading,rows:section.rows,total:true,deltaColumn:3})),meta:reportMeta,url:reportJiraUrl})}:{enabled:false};
        const file=reportFile(projectGroups,projectKey);
        if(report.payload.email.enabled&&$('attach-report').checked){report.payload.email.attachments=[{name:file.name,contentType:'text/html',contentBytes:reportBase64(file.html)}];report.payload.email.bodyHtml+='<p style="font:12px Arial;color:#718098">附交互报告：'+hub.escapeHtml(file.name)+'。请下载附件并使用浏览器打开，点击数字查看工单明细和状态变化。</p>';}
        if(new TextEncoder().encode(JSON.stringify(report.payload.attachments)).length>26*1024)throw Error(projectKey+' 卡片超过 Teams 大小限制，请减少所选 Sprint 后重试。');
        return {projectKey,target,destination,report,file,data:JSON.stringify(report.payload)};
      });
      openTeams('项目推送预览 · '+deliveries.length+' 个项目');
      text('p','每个项目分别发送到对应 Teams 和邮件收件人。勾选邮件附报告时，载荷另含该项目的 Jira 编号、摘要及状态变化，需工作流配置附件步骤；下方可先下载检查。',teamsBox);
      const preview=document.createElement('div');preview.id='teams-preview-content';teamsBox.append(preview);
      for(const item of deliveries){
        const card=text('section','',preview);card.className='card';
        text('h2',item.projectKey+' · Sprint Analysis',card);
        const download=text('button','下载该项目交互报告',card);download.onclick=()=>downloadReport(item.file);
        text('p',item.report.payload.email.attachments?.length?'邮件包含交互报告附件载荷（需要工作流映射附件字段）':'邮件未附交互报告',card).className='muted';
        text('p','邮件：'+(item.target.recipients.join(';')||'未配置'),card);
        text('p','Webhook 主机：'+new URL(item.destination).hostname+'（密钥已隐藏）',card).className='muted';
        text('p',item.report.description,card);
        for(const section of item.report.sections){
          text('h3',section.name,card);const table=document.createElement('table');card.append(table);
          const head=document.createElement('tr');table.append(head);item.report.heading.forEach(h=>text('th',h,head));
          section.rows.forEach((values,index)=>{const tr=document.createElement('tr');table.append(tr);if(index===section.rows.length-1)tr.style.cssText='font-weight:700;background:#edf3ff';values.forEach((v,i)=>{const td=text('td',v,tr);if(i===3&&Number(v)>0)td.style.color='#d13438';});});
        }
      }
      const status=text('p','尚未发送。确认后按项目分别提交；不会自动重试。',teamsBox);status.id='teams-send-status';status.setAttribute('role','status');
      const cancel=teamsButton('teams-preview-cancel','取消',closeTeams);
      const send=teamsButton('teams-send','确认推送 '+deliveries.length+' 个项目',async()=>{
        if(teamsSending||send.disabled)return;
        if(typeof GM_xmlhttpRequest!=='function'){status.textContent='缺少油猴跨域请求权限，请更新脚本。';return;}
        teamsSending=true;send.disabled=true;cancel.disabled=true;
        const outcomes=[];
        for(const item of deliveries){
          status.textContent=[...outcomes,item.projectKey+'：正在提交…'].join('\n');
          const outcome=await new Promise(resolve=>{
            let settled=false,request;
            const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
            const timer=setTimeout(()=>{finish('超时，结果未知，请检查工作流；未重试');request?.abort?.();},30000);
            try{request=GM_xmlhttpRequest({method:'POST',url:item.destination,headers:{'Content-Type':'application/json'},data:item.data,timeout:30000,anonymous:true,redirect:'error',
              onload:r=>finish(r.status>=200&&r.status<300?'已提交（HTTP '+r.status+'），最终投递请查工作流':'失败：'+teamsResponseInfo(r)),
              onerror:r=>finish('网络失败，结果可能未知：'+teamsResponseInfo(r)+'；未重试'),
              ontimeout:()=>finish('超时，结果未知，请检查工作流；未重试'),onabort:()=>finish('已中止，结果未知；未重试')});}
            catch(error){finish('请求未发出：'+teamsResponseInfo(error));}
          });
          outcomes.push(item.projectKey+'：'+outcome);
        }
        teamsSending=false;cancel.disabled=false;cancel.textContent='关闭';status.style.whiteSpace='pre-wrap';status.textContent=outcomes.join('\n');
      });send.className='primary';cancel.focus();
    }catch(error){message(error.message,true);}
  }
  $('teams-preview').onclick=teamsPreview;

  $('load').onclick=()=>guard(load);$('run').onclick=()=>guard(run);
  let lastFocus;
  const toolbar=document.createElement('div');toolbar.className='query-toolbar';const controls=root.querySelector('.controls');controls.before(toolbar);toolbar.append($('period').parentElement,$('load'));
  const compact=document.createElement('style');compact.textContent='.query-toolbar{display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin:16px 0}.query-toolbar label{width:240px;max-width:100%}.query-toolbar #load{width:auto;min-width:0;padding:8px 14px}.controls{align-items:start}#notify-box{grid-column:1/-1;padding:8px 12px}#notify-project{display:flex;gap:8px;flex-wrap:wrap;padding:4px 0}#notify-project label{display:inline-flex;flex-direction:row;align-items:center;gap:6px;background:#fff;border:1px solid #dce4f1;border-radius:7px;padding:7px 12px;cursor:pointer}#notify-project input{margin:0}.controls>#run,.controls>#export,.controls>#teams-preview{width:max-content;max-width:100%}.query-toolbar select{width:100%}';root.append(compact);
  $('launch').style.display='none';$('close').style.display='none';
  const embeddedStyle=document.createElement('style');embeddedStyle.textContent='#overlay{display:block!important;position:relative;inset:auto;padding:0;background:none;z-index:auto}#panel{height:auto;min-height:0;max-width:none;margin:0;padding:2px;background:transparent;box-shadow:none;border-radius:0}header{margin-bottom:12px}h1{font-size:21px}h1 small{display:none}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:stretch}fieldset{min-width:0;max-width:none;width:100%;background:#fff;border-color:#dce4f1;padding:12px}.choices{max-width:none;height:150px}.choices label{font-size:12px}label{font-size:12px;color:#718098}button{border-color:#dbe3f0;border-radius:7px;font-size:12px;padding:8px 10px}.primary{background:#245de8;border-color:#245de8}.notice{font-size:11px;line-height:1.7;color:#718098;background:#edf3ff;padding:10px 12px}#load{align-self:end}#message{font-size:12px}.card{border-color:#e1e7f1;padding:14px;border-radius:10px}p.muted{font-size:11px}#status-all{align-self:start}';root.append(embeddedStyle);
  $('launch').onclick=()=>{lastFocus=document.activeElement;$('overlay').style.display='block';$('close').focus();};
  const close=()=>{hub.hide();lastFocus?.focus();};$('close').onclick=close;
  root.addEventListener('keydown',e=>{if(teamsDialog.style.display!=='none'){
    if(e.key==='Escape'){e.preventDefault();closeTeams();}
    if(e.key==='Tab'){const nodes=[...teamsBox.querySelectorAll('button,input')].filter(x=>!x.disabled),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&root.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&root.activeElement===last){e.preventDefault();first?.focus();}}return;
  }if(e.key==='Escape')close();if(e.key==='Tab'&&$('overlay').style.display==='block'){const nodes=[...$('panel').querySelectorAll('button,input,select,a')].filter(x=>!x.disabled);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&root.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&root.activeElement===last){e.preventDefault();first.focus();}}});
  $('export').onclick=()=>{
    const rows=[['统计说明',reportMeta],['Sprint ID','Sprint','状态',activePeriod.before,activePeriod.after,'增减',activePeriod.rate]];
    for(const g of groups){const stats=rowsWithTotal(g);for(const r of stats)rows.push([g.id,g.name,r.name,r.before.length,r.after.length,r.after.length-r.before.length,rate(r.before.length,r.after.length)]);}
    const blob=new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='jira-sprint-analysis-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
})();

})();
