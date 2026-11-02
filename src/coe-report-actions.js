  el('[data-report-export]').onclick=()=>{
    const state=get();if(!state?.results?.length||state.active)return;
    const rules=state.rules||CONFIG.rules,reports=state.results.map(item=>({item,report:teamsPayload(item,rules,false,projectTarget(item.key))}));
    hub.downloadFile(hub.coeReportFile(reports,'all'));
  };
  el('[data-mail-preview]').onclick=()=>{
    const state=get();if(!state?.results?.length||state.active)return;
    const rules=state.rules||CONFIG.rules,groups=new Map();
    for(const item of state.results){if(state.mode==='batch'&&!hasTeamsAlert(item,rules))continue;const key=projectKeyOf(item.key);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
    const entries=[...groups].map(([key,items])=>{const target=projectTarget(items[0].key)||{projectKey:key,recipients:[]},reports=items.map(item=>({item,report:teamsPayload(item,rules,state.mode==='batch',target)})),file=hub.coeReportFile(reports,key);const email=state.mode==='batch'?alertSummaryPayload(items,rules,target).email:reports[0].report.email;hub.attachEmailReport(email,file);return {key,email,file};});
    if(!entries.length){notice('本次没有即将超期或已超期的工单，无需发送预警邮件；仍可导出完整交互报告。');return;}
    hub.previewMailReports(entries);
  };
