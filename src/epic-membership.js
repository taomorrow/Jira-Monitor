  // Epic membership uses the current Epic Link (or parent on newer Jira instances).
  const epicNames=new Map();
  function isStory(issue){return /^(story|用户故事|故事)$/i.test(String(issue.fields?.issuetype?.name||'').trim())&&issue.fields?.issuetype?.subtask!==true;}
  function sprints(value){
    if(value==null||value==='')return [];
    const values=Array.isArray(value)?value:[value];
    return values.map(v=>{
      const key=String(typeof v==='object'?v?.key||'':v).trim().toUpperCase();
      if(!/^[A-Z][A-Z0-9_]*-\d+$/.test(key))throw Error('无法识别 Epic 关联编号，请检查 Epic Link / parent 字段。');
      return {id:key,name:epicNames.get(key)||key,state:''};
    });
  }
  async function loadEpicNames(issues){
    const keys=[...new Set(issues.flatMap(i=>sprints(i.fields[field]).map(x=>x.id)))];
    // Restrict lookup to observed Epic keys; never broaden the user's Story query.
    for(let offset=0;offset<keys.length;offset+=100){
      const subset=keys.slice(offset,offset+100),params=new URLSearchParams({jql:'key in ('+subset.join(',')+')',fields:'summary,issuetype',maxResults:'100'});
      const data=await api('/rest/api/2/search?'+params);
      if(!Array.isArray(data.issues))throw Error('Epic 名称查询响应无效，请重试。');
      for(const issue of data.issues)epicNames.set(issue.key,issue.key+' · '+(issue.fields.summary||''));
    }
  }
