  function publishKanbanComparison(){
    const issues=reportIssues,ids=[...reportIds],statuses=reportStatuses&&[...reportStatuses],sourceField=field,now=reportNow,meta=reportMeta,url=reportJiraUrl;
    hub.analysisSnapshots??={};hub.analysisSnapshots['sprint-analysis']=mode=>{const period=comparisonPeriod(now,mode),source=selectStatusGroups(aggregate(issues,sourceField,ids,period.cutoff,now),statuses);return {...reportModel(source),meta,jiraUrl:url,period,generatedAt:new Date(now).toISOString()};};
    dispatchEvent(new Event('jira-monitor-analysis-snapshot'));
  }
