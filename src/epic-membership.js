  // Epic membership uses the current Epic Link (or parent on newer Jira instances).
  const epicNames=new Map();
  function isEpic(issue){const type=issue.fields?.issuetype;return type?.subtask!==true&&(/^epic$|^史诗$/i.test(type?.name||'')||type?.hierarchyLevel===1);}
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
    epicNames.clear();
    const keys=[...new Set(issues.filter(isStory).flatMap(i=>sprints(i.fields[field]).map(x=>x.id)))];
    // Fetch labels only: these responses never contribute members or counts.
    for(let offset=0;offset<keys.length;offset+=50){
      try{
        const params=new URLSearchParams({jql:'key in ('+keys.slice(offset,offset+50).join(',')+')',fields:'summary,issuetype',maxResults:'50'});
        const data=await api('/rest/api/2/search?'+params);
        for(const issue of data.issues||[])if(isEpic(issue)&&keys.includes(issue.key))epicNames.set(issue.key,issue.key+' · '+(issue.fields.summary||''));
      }catch{ /* A missing label must not block grouping the current Stories by key. */ }
    }
  }
