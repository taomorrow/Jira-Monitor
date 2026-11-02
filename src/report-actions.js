  function reportModel(source=groups){
    return {version:1,analysisType:'sprint-analysis',meta:reportMeta,jiraUrl:reportJiraUrl,period:activePeriod,generatedAt:new Date(reportNow).toISOString(),groups:source.map(group=>{const rows=rowsWithTotal(group);return {id:group.id,name:group.name,issues:group.issues.map(x=>({key:x.issue.key,summary:x.issue.fields.summary||'',before:x.before?.name||'',after:x.after?.name||'',changed:x.changed})),rows:rows.map((row,i)=>({name:row.name,total:i===rows.length-1,before:row.before.map(x=>x.key),after:row.after.map(x=>x.key)}))};})};
  }
  function reportFile(source=groups,project='all'){
    return {name:'Jira-Monitor-'+project+'-'+new Date(reportNow).toISOString().replace(/[:.]/g,'-')+'.html',html:buildInteractiveReport(reportModel(source))};
  }
  function downloadReport(file){const url=URL.createObjectURL(new Blob([file.html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
  function reportBase64(html){const bytes=new TextEncoder().encode(html);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
  $('report-export').onclick=()=>{if(!busy&&groups.length)downloadReport(reportFile());};
