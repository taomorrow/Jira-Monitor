// The legacy API is local to this bundled content script; no page-world bridge or eval.
let cache=await chrome.storage.local.get(null);
const menuCommands=[];
let storageQueue=Promise.resolve();
const GM_getValue=(key,fallback)=>Object.hasOwn(cache,key)?cache[key]:fallback;
const GM_setValue=(key,value)=>{cache[key]=value;storageQueue=storageQueue.then(()=>chrome.storage.local.set({[key]:value})).catch(error=>console.error('Jira+ 保存失败',error));};
const GM_deleteValue=key=>{delete cache[key];storageQueue=storageQueue.then(()=>chrome.storage.local.remove(key)).catch(error=>console.error('Jira+ 删除失败',error));};
const GM_registerMenuCommand=(label,callback)=>menuCommands.push({label,callback});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local')for(const [key,change]of Object.entries(changes)){if(Object.hasOwn(change,'newValue'))cache[key]=change.newValue;else delete cache[key];}});
chrome.runtime.onMessage.addListener(message=>{if(message?.type==='jiraplus:open'){document.getElementById('jira-plus-hub')?.shadowRoot?.getElementById('launcher')?.click();}});
const GM_openInTab=async(url,options={})=>{await storageQueue;const result=await chrome.runtime.sendMessage({type:'jiraplus:tab',url:String(url),active:options.active!==false});if(!result?.ok)throw Error(result?.error||'打开标签失败');return result;};
const GM_xmlhttpRequest=options=>{
 const id=crypto.randomUUID();let settled=false;
 const finish=(callback,value)=>{if(settled)return;settled=true;callback?.(value);};
 chrome.runtime.sendMessage({type:'jiraplus:http',id,url:options.url,method:options.method||'GET',headers:options.headers||{},data:options.data,timeout:options.timeout||30000}).then(result=>{if(result?.ok)finish(options.onload,result.response);else finish(result?.timeout?options.ontimeout:options.onerror,{error:result?.error||'请求失败'});}).catch(error=>finish(options.onerror,{error:error.message}));
 return {abort(){if(settled)return;chrome.runtime.sendMessage({type:'jiraplus:abort',id}).catch(()=>{});finish(options.onabort,{});}};

};
