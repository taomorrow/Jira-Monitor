  function projectKeys(value){
    const parts=String(value||'').split('/').map(x=>x.trim().toUpperCase());
    if(parts.some(x=>!/^[A-Z][A-Z0-9_]*$/.test(x)))throw Error('项目 Key 无效：'+value+'；多个项目请用 / 分隔，如 CSP/OSPIT');
    if(new Set(parts).size!==parts.length)throw Error('项目 Key 重复：'+value);
    return parts;
  }
  function rawProjectConfigs(){if(typeof GM_getValue!=='function')return [];const data=GM_getValue(PROJECT_SETTING,[]);if(!Array.isArray(data))throw Error('项目配置格式无效，请打开配置中心');return data;}
  function projectConfigs(){return rawProjectConfigs().flatMap(row=>projectKeys(row.projectKey).map(projectKey=>({...row,projectKey,projectGroup:row.projectKey})));}
