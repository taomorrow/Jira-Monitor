  function publishKanbanComparison(){
    const issues=reportIssues,ids=[...reportIds],statuses=reportStatuses&&[...reportStatuses],sourceField=field,now=reportNow,meta=reportMeta,url=reportJiraUrl;
    hub.analysisSnapshots??={};hub.analysisSnapshots['sprint-analysis']=mode=>{const period=comparisonPeriod(now,mode),source=selectStatusGroups(aggregate(issues,sourceField,ids,period.cutoff,now),statuses);return {...reportModel(source),meta,jiraUrl:url,period,generatedAt:new Date(now).toISOString()};};
    hub.analysisSnapshots['sprint-analysis'].file=mode=>({name:'Jira-Monitor-sprint-analysis-'+mode+'.html',html:buildInteractiveReport({...hub.analysisSnapshots['sprint-analysis'](mode),comparisonChart:true})});
    hub.analysisSnapshots['sprint-analysis'].refresh=async mode=>{if(busy||teamsSending)throw Error('Sprint 正在分析或发送，请稍后重试');let failure;await guard(async()=>{try{$('period').value=mode;await run();}catch(error){failure=error;throw error;}});if(failure)throw failure;};
    dispatchEvent(new Event('jira-monitor-analysis-snapshot'));
  }
