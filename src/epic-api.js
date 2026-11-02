  async function api(path,options={}){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const res=await fetch(path,{...options,credentials:'same-origin',headers:{Accept:'application/json',...(options.headers||{})},signal:controller.signal});
      if(!res.ok){
        let detail='';try{const data=await res.json();detail=[...(Array.isArray(data.errorMessages)?data.errorMessages:[]),...Object.values(data.errors||{})].map(String).join('；').replace(/https?:\/\/\S+/g,'[接口地址]').slice(0,500);}catch{}
        const error=new Error('Jira HTTP '+res.status+'：'+(detail||(res.status===401||res.status===403?'请先登录并确认 Epic / 工单访问权限。':'Epic 接口请求失败。')));error.status=res.status;throw error;
      }
      if(!res.headers.get('content-type')?.includes('application/json'))throw Error('Jira 返回登录页或非 JSON 内容，请先登录后重试。');
      return await res.json();
    }finally{clearTimeout(timeout);}
  }
  async function epicMembers(ids){
    const all=[],globalKeys=new Set();
    for(const id of ids){
      let start=0,total,mode='agile';const seen=new Set();
      do{
        const fields=['summary','status','created','updated','issuetype','parent',field];let page;
        const fallback=()=>api('/rest/api/2/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jql:epicSingleQuery(id),fields,startAt:start,maxResults:50})});
        try{page=mode==='agile'?await api('/rest/agile/1.0/epic/'+encodeURIComponent(id)+'/issue?'+new URLSearchParams({startAt:String(start),maxResults:'50',fields:fields.join(',')})):await fallback();}
        catch(error){
          if(mode!=='agile'||![400,404,405,501].includes(error.status))throw Error(id+'：'+error.message);
          mode='search';try{page=await fallback();}catch(failure){throw Error(id+'：Epic 成员接口不可用，兼容查询也失败。'+failure.message);}
        }
        if(!Array.isArray(page.issues)||!Number.isInteger(page.total)||page.total<0)throw Error(id+'：Epic 成员分页格式无效，未生成报告。');
        if((page.startAt!==undefined&&page.startAt!==start)||(total!==undefined&&total!==page.total)||(!page.issues.length&&start<page.total))throw Error(id+'：Epic 分页发生变化或提前结束，请重新分析。');
        total=page.total;
        for(const issue of page.issues){if(!issue.key||seen.has(issue.key)||globalKeys.has(issue.key))throw Error(id+'：Epic 成员重复或归属发生变化，请重试。');seen.add(issue.key);globalKeys.add(issue.key);all.push(issue);}
        start+=page.issues.length;message('读取 Epic '+id+'：'+start+' / '+total+' 条关联工单…');
      }while(start<total);
    }
    return all;
  }
