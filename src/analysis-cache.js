  function publishKanbanComparison(){
    const issues=reportIssues,ids=[...reportIds],statuses=reportStatuses&&[...reportStatuses],sourceField=field,now=reportNow,meta=reportMeta,url=reportJiraUrl;
    hub.analysisSnapshots??={};hub.analysisSnapshots['sprint-analysis']=mode=>{const period=comparisonPeriod(now,mode),source=selectStatusGroups(aggregate(issues,sourceField,ids,period.cutoff,now),statuses);return {...reportModel(source),meta,jiraUrl:url,period,generatedAt:new Date(now).toISOString()};};
    hub.analysisSnapshots['sprint-analysis'].file=mode=>({name:'Jira-Monitor-sprint-analysis-'+mode+'.html',html:buildInteractiveReport({...hub.analysisSnapshots['sprint-analysis'](mode),comparisonChart:true})});
    dispatchEvent(new Event('jira-monitor-analysis-snapshot'));
  }
