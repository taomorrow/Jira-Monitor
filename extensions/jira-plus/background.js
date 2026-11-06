'use strict';
const JIRA='https://jira.xpaas.lenovo.com';
const pending=new Map();
function permitted(raw,method){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password)throw Error('仅允许已授权 HTTPS 地址');const host=u.hostname;
 if(method==='GET'&&u.href==='https://raw.githubusercontent.com/taomorrow/Jira-Monitor/main/src/mac-app-template.base64')return u.href;
 if(['POST','HEAD'].includes(method)&&['api.powerplatform.com','logic.azure.com','api.powerautomate.com'].some(d=>host===d||host.endsWith('.'+d)))return u.href;
 throw Error('请求地址或方法不在许可范围内');}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||!sender.tab||!sender.url?.startsWith(JIRA+'/'))return false;
 const owner=sender.tab.id+':'+sender.documentId+':';
 if(message?.type==='jiraplus:abort'){pending.get(owner+message.id)?.abort();reply({ok:true});return false;}
 if(message?.type==='jiraplus:tab'){(async()=>{const u=new URL(message.url);if(u.origin!==JIRA)throw Error('只能打开 Jira 页面');const tab=await chrome.tabs.create({url:u.href,active:message.active===true});return {ok:true,tabId:tab.id};})().then(reply,error=>reply({ok:false,error:error.message}));return true;}
 if(message?.type!=='jiraplus:http')return false;
 (async()=>{const method=String(message.method).toUpperCase(),url=permitted(message.url,method),controller=new AbortController(),key=owner+message.id;pending.set(key,controller);const duration=Math.min(Math.max(Number(message.timeout)||30000,1000),30000);let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort();},duration);
 try{const headers={};for(const [name,value]of Object.entries(message.headers||{}))if(['content-type','accept'].includes(name.toLowerCase()))headers[name]=String(value);
 const response=await fetch(url,{method,headers,body:method==='POST'?message.data:undefined,credentials:'omit',redirect:'error',signal:controller.signal});const responseText=await response.text();return {ok:true,response:{status:response.status,statusText:response.statusText,responseText,response:responseText,finalUrl:response.url,responseHeaders:[...response.headers].map(([k,v])=>k+': '+v).join('\r\n')}};
 }catch(error){return {ok:false,timeout:timedOut,error:error.message};}finally{clearTimeout(timer);pending.delete(key);}
 })().then(reply,error=>reply({ok:false,error:error.message}));return true;
});
chrome.action.onClicked.addListener(async tab=>{try{if(tab.url?.startsWith(JIRA+'/'))await chrome.tabs.sendMessage(tab.id,{type:'jiraplus:open'});else await chrome.tabs.create({url:JIRA+'/issues/?filter=180929'});}catch{await chrome.tabs.reload(tab.id);}});
