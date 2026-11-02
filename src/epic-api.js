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
