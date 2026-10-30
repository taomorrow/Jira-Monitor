  function alertSummaryPayload(items,rules,target){
    const reports=items.map(item=>({item,report:teamsPayload(item,rules,true,target)})).filter(x=>x.report.rules.length);
    const keys=reports.map(x=>x.item.key),jiraUrl=location.origin+'/issues/?'+new URLSearchParams({jql:'key in ('+keys.join(',')+')'});
    const warning=reports.filter(x=>x.report.rules.some(r=>r.level==='warning')).length,overdue=reports.filter(x=>x.report.rules.some(r=>r.level==='overdue')).length;
    const title=target.projectKey+' · 超时预警列表',subtitle=reports.length+' 条工单 · 即将超期 '+warning+' 条 · 已超期 '+overdue+' 条（同一工单可命中不同规则）';
    const rows=reports.map(({item,report})=>[item.key,item.summary,item.assignee||'未分配',report.rules.map(r=>r.name+' '+r.sla+' · '+r.days.toFixed(2)+'天').join(' / ')]);
    const text=title+'\n'+subtitle+'\n'+rows.map(row=>row.join(' | ')).join('\n');
    const body=[{type:'TextBlock',text:title,weight:'Bolder',size:'Medium',wrap:true},{type:'TextBlock',text:subtitle,wrap:true}];
    const card={type:'AdaptiveCard',version:'1.2',msteams:{width:'Full',entities:[]},body,actions:[{type:'Action.OpenUrl',title:'在 Jira 查看全部 '+reports.length+' 条',url:jiraUrl}]};
    const attachment={contentType:'application/vnd.microsoft.card.adaptive',contentUrl:null,content:card};
    let displayed=0;
    for(const {item,report} of reports){
      const mention=report.attachments[0].content.msteams.entities[0];
      const block={type:'Container',separator:true,items:[{type:'TextBlock',text:'['+item.key+']('+location.origin+'/browse/'+encodeURIComponent(item.key)+') · '+(mention?mention.text:(item.assignee||'未分配')),weight:'Bolder',wrap:true},{type:'TextBlock',text:String(item.summary||'').slice(0,180),wrap:true,spacing:'Small'},...report.rules.map(r=>({type:'TextBlock',text:r.name+' · '+r.sla+' · '+r.days.toFixed(2)+'天',color:r.level==='overdue'?'Attention':'Warning',wrap:true,spacing:'Small'}))]};
      body.push(block);
      if(new TextEncoder().encode(JSON.stringify(attachment)).length>23*1024){body.pop();break;}if(mention&&!card.msteams.entities.some(x=>x.mentioned.id===mention.mentioned.id))card.msteams.entities.push(mention);displayed++;
    }
    if(displayed<reports.length)body.push({type:'TextBlock',text:'卡片显示前 '+displayed+' 条，共 '+reports.length+' 条；完整列表见邮件或下方 Jira 按钮。',wrap:true,isSubtle:true});
    const meta='扫描时间：'+beijingTime(Math.max(...reports.map(x=>x.item.checkedAt||0)));
    const email=target.recipients?.length?{enabled:true,recipients:[...target.recipients],to:target.recipients.join(';'),subject:'[Jira Monitor] '+target.projectKey+' · 超时预警列表（'+reports.length+'条）',bodyText:text,bodyHtml:hub.emailCard({title,subtitle,sections:[{title:'即将超期 / 已超期',headers:['Jira','摘要','负责人','规则与时长'],rows}],meta,url:jiraUrl})}:{enabled:false};
    return {type:'message',reportType:'timeout-summary',projectKey:target.projectKey,jiraUrl,summary:subtitle,text,email,scanTime:meta,items:reports.map(({item,report})=>({jiraKey:item.key,summary:item.summary,assignee:item.assignee,jiraUrl:report.jiraUrl,rules:report.rules})),attachments:[attachment]};
  }
  function alertCooldownKey(item,target){return 'jira-monitor-teams-cooldown-v2:'+target.projectKey+':'+item.key+':'+target.webhook+':'+(target.recipients||[]).map(x=>x.toLowerCase()).sort().join(';');}
  async function sendBatchAlerts(source,automatic=false){
    if(teamsSending)return;
    teamsSending=true;render();
    const state=JSON.parse(JSON.stringify(source)),rules=state.rules||CONFIG.rules,groups=new Map(),outcomes=[];
    for(const item of state.results||[]){if(!hasTeamsAlert(item,rules))continue;const key=projectKeyOf(item.key);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
    try{
      if(!groups.size){notice('没有即将超期或已超期的工单，无需发送。');return;}
      for(const [key,items] of groups){
        const send=async()=>{
          const configured=projectTarget(items[0].key);if(!configured?.webhook)return key+'：未配置通知目标，跳过';
          const target={...configured,recipients:[...(configured.recipients||[])]};
          if(automatic&&!target.autoNotify)return key+'：批量自动通知未开启，跳过';
          const eligible=automatic?items.filter(item=>!(GM_getValue(alertCooldownKey(item,target),null)?.until>Date.now())):items;
          if(!eligible.length)return key+'：全部工单仍在通知冷却期，跳过';
          const payload=alertSummaryPayload(eligible,rules,target);
          if(automatic){const hours=Number(CONFIG.notificationCooldownHours);if(!Number.isFinite(hours)||hours<=0)throw Error('通知冷却时间无效');for(const item of eligible)GM_setValue(alertCooldownKey(item,target),{until:Date.now()+hours*3600000,state:'submitted'});}
          await postTeams(payload,target.webhook);return key+'：已提交 1 份预警列表（'+eligible.length+' 条工单）';
        };
        try{notice('正在提交 '+key+' 预警列表…');outcomes.push(typeof navigator!=='undefined'&&navigator.locks?.request?await navigator.locks.request('jira-monitor-teams-notify',send):await send());}
        catch(error){outcomes.push(key+'：提交失败或结果未知；'+safeError(error)+'。未自动重试。');showTeamsError(outcomes.join('\n'));}
      }
      notice(outcomes.join('\n')+'\n每个项目分别提交；Webhook 接收不代表 Teams / 邮件已投递。');
    }finally{teamsSending=false;render();}
  }
