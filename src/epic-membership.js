  // Epic membership uses the current Epic Link (or parent on newer Jira instances).
  const epicNames=new Map(),validEpics=new Set();let epicDiscoveryNote='',emptyEpics=[];
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
  function discoverEpics(issue){return isEpic(issue)?[{id:issue.key,name:epicNames.get(issue.key)||issue.key,state:''}]:issue.fields?.issuetype?.subtask?[]:sprints(issue.fields[field]);}
  function epicSingleQuery(id){const selector=field==='parent'?'parent':'"'+epicClause.replace(/[\\"]/g,'\\$&')+'"';return selector+' = "'+id+'"';}
  function epicMemberQuery(ids){return ids.map(id=>'('+epicSingleQuery(id)+')').join(' OR ');}
  async function loadEpicNames(issues){
    validEpics.clear();epicNames.clear();epicDiscoveryNote='';
    const keys=[...new Set(issues.flatMap(i=>discoverEpics(i).map(x=>x.id)))];
    const record=issue=>{if(isEpic(issue)){validEpics.add(issue.key);epicNames.set(issue.key,issue.key+' · '+(issue.fields.summary||''));}};
    // An arbitrary parent key is a candidate, never proof that its issue is an Epic.
    issues.forEach(record);
    for(let offset=0;offset<keys.length;offset+=50){
      const subset=keys.slice(offset,offset+50);let start=0,total;
      do{
        const params=new URLSearchParams({jql:'key in ('+subset.join(',')+')',fields:'summary,issuetype',startAt:String(start),maxResults:'50'}),data=await api('/rest/api/2/search?'+params);
        if(!Array.isArray(data.issues)||!Number.isInteger(data.total)||data.total<0||(data.startAt!==undefined&&data.startAt!==start)||(total!==undefined&&total!==data.total)||(!data.issues.length&&start<data.total))throw Error('Epic 类型校验分页不完整，请重新载入。');
        total=data.total;data.issues.forEach(record);start+=data.issues.length;
      }while(start<total);
    }
    const skipped=keys.filter(key=>!validEpics.has(key));
    if(skipped.length)epicDiscoveryNote='；已排除 '+skipped.length+' 个非 Epic 或不可见候选：'+skipped.join('、');
  }
