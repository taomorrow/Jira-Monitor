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
        if(new TextEncoder().encode(JSON.stringify(report.payload.attachments)).length>26*1024)throw Error(projectKey+' 卡片超过 Teams 大小限制，请减少所选 Sprint 后重试。');
        return {projectKey,target,destination,report,data:JSON.stringify(report.payload)};
      });
      openTeams('项目推送预览 · '+deliveries.length+' 个项目');
      text('p','每个项目使用配置中心对应的 Teams Webhook 和邮件收件人，分别发送。',teamsBox);
      const preview=document.createElement('div');preview.id='teams-preview-content';teamsBox.append(preview);
      for(const item of deliveries){
        const card=text('section','',preview);card.className='card';
        text('h2',item.projectKey+' · Sprint Analysis',card);
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
